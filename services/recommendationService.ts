import { TransactionRecord, Recommendation, RecommendationType } from '../types';
import { findDuplicateRecommendations } from './rules/duplicateRule';
import { normalizeMerchantRecommendations } from './rules/merchantRule';
import { suggestMissingFieldRecommendations } from './rules/missingFieldRule';
import { suggestClassificationRecommendations } from './rules/classificationRule';

// Helper to define the "identity" of a recommendation condition for matching purposes.
interface RecommendationIdentity {
  type: RecommendationType;
  transactionIdsString: string; // JSON.stringify of sorted transaction IDs
  affectedField?: string;
  originalValue?: any;
}

function getRecommendationIdentity(
    rec: Pick<Recommendation, 'type' | 'transactionIds' | 'affectedField' | 'originalValue'>
): RecommendationIdentity {
  let originalValueForIdentity: any;
  if (
    rec.type === RecommendationType.MerchantNormalization ||
    rec.type === RecommendationType.MissingField ||
    rec.type === RecommendationType.Classification
  ) {
    originalValueForIdentity = rec.originalValue;
  }
  // For duplicates, the identity is primarily the set of transactions involved.
  // The originalValue (specific fields) might vary slightly if rules update, but the core pair is key.
  // If we need stricter matching for duplicates based on original values, this could be expanded.

  return {
    type: rec.type,
    transactionIdsString: JSON.stringify([...rec.transactionIds].sort()),
    affectedField: rec.affectedField as string | undefined,
    originalValue: originalValueForIdentity,
  };
}

export function generateRecommendations(
  transactionsFromState: TransactionRecord[], // Current, up-to-date transactions
  currentRecommendations: Recommendation[]    // Previous state of recommendations
): Recommendation[] {
  const outputRecommendations: Recommendation[] = [];
  const processedIdentities = new Set<string>(); // Tracks identities of recs already added to outputRecommendations

  const existingTransactionIds = new Set(transactionsFromState.map(t => t.id));

  // 1. Preserve 'applied' and 'ignored' recommendations.
  // Update their target transaction IDs to only include those that still exist.
  currentRecommendations.forEach(rec => {
    if (rec.status === 'applied' || rec.status === 'ignored') {
      const validTargetIds = rec.transactionIds.filter(txId => existingTransactionIds.has(txId));
      const identityKey = JSON.stringify(getRecommendationIdentity(rec)); // Use original identity for matching

      if (rec.transactionIds.length > 0 && validTargetIds.length === 0) {
        // All original targets were hard-deleted. Keep the rec to show past action.
        outputRecommendations.push({ 
          ...rec, 
          transactionIds: [], // Targets are gone
          description: rec.description + " (Original targets deleted)", // Optional: Update description
        });
      } else if (validTargetIds.length > 0 || rec.transactionIds.length === 0) {
        // Some/all targets exist, or it never had specific targets (less common).
        outputRecommendations.push({ ...rec, transactionIds: validTargetIds });
      }
      // If rec.transactionIds.length === 0 && validTargetIds.length === 0, it was likely an applied/ignored global-ish rec.
      // If it's pushed, its identity is marked.
      if (outputRecommendations.find(r => r.id === rec.id)) { // Check if it was added
          processedIdentities.add(identityKey);
      }
    }
  });

  // 2. Generate new candidates based on the current state of transactions.
  const activeTransactionsForRules = transactionsFromState.filter(t => !t.flags.isDeleted);
  let candidateRecsFromRules: Recommendation[] = [];
  candidateRecsFromRules.push(...findDuplicateRecommendations(activeTransactionsForRules));
  candidateRecsFromRules.push(...normalizeMerchantRecommendations(activeTransactionsForRules));
  candidateRecsFromRules.push(...suggestMissingFieldRecommendations(activeTransactionsForRules, transactionsFromState));
  candidateRecsFromRules.push(...suggestClassificationRecommendations(activeTransactionsForRules, transactionsFromState));

  // 3. Merge new candidates, respecting existing 'applied'/'ignored' and 'pending' states.
  const existingPendingRecsMap = new Map<string, Recommendation>(); // Key: identity, Value: original pending rec (for ID)
  currentRecommendations.forEach(rec => {
    if (rec.status === 'pending') {
      const identityKey = JSON.stringify(getRecommendationIdentity(rec));
      existingPendingRecsMap.set(identityKey, rec);
    }
  });

  candidateRecsFromRules.forEach(candidateRec => {
    const candidateIdentityKey = JSON.stringify(getRecommendationIdentity(candidateRec));

    if (processedIdentities.has(candidateIdentityKey)) {
      // This condition was already handled (found as 'applied' or 'ignored').
      return;
    }

    const existingPendingRec = existingPendingRecsMap.get(candidateIdentityKey);
    if (existingPendingRec) {
      // Matches an old 'pending' recommendation. Use its ID, update content.
      outputRecommendations.push({
        ...candidateRec,
        id: existingPendingRec.id,
        status: 'pending',
      });
    } else {
      // Truly new 'pending' recommendation.
      outputRecommendations.push(candidateRec);
    }
    processedIdentities.add(candidateIdentityKey); // Mark this identity as handled for this pass
  });
  
  // 4. Final cleanup pass for 'pending' recommendations based on soft-deletes.
  const trulyFinalRecommendations: Recommendation[] = [];
  const softDeletedTransactionIds = new Set<string>();
  transactionsFromState.forEach(tx => {
    if (tx.flags.isDeleted) softDeletedTransactionIds.add(tx.id);
  });

  // Re-build processedIdentities for the deduplication pass to ensure only unique recs make it.
  const finalUniqueRecsById = new Map<string, Recommendation>();

  for (const rec of outputRecommendations) {
    let currentRec = {...rec}; // Make a copy to modify

    // Ensure target IDs are valid (mostly for pending recs whose targets might have been partially hard-deleted)
    currentRec.transactionIds = currentRec.transactionIds.filter(txId => existingTransactionIds.has(txId));

    if (currentRec.status === 'pending') {
      if (currentRec.transactionIds.length === 0 && rec.transactionIds.length > 0) { 
          // A pending rec whose all original targets were hard-deleted.
          continue;
      }
      
      const allTargetsSoftDeleted = currentRec.transactionIds.length > 0 && 
                                    currentRec.transactionIds.every(txId => softDeletedTransactionIds.has(txId));
      
      if (currentRec.type !== RecommendationType.Duplicate && allTargetsSoftDeleted) {
        // Pending non-duplicate rec where all its existing targets are now soft-deleted. It's moot.
        continue;
      }
    }
    // Add to map, ensuring applied/ignored or latest pending version of a rec ID is kept.
    // If an 'applied'/'ignored' rec (from step 1) and a 'pending' rec (from step 3) share an ID 
    // (because pending was updated from an old ID that somehow matched an applied one - should be rare with UUIDs),
    // prioritize the 'applied'/'ignored' status.
    const existingInMap = finalUniqueRecsById.get(currentRec.id);
    if (existingInMap) {
        if (existingInMap.status === 'applied' || existingInMap.status === 'ignored') {
            // Keep the applied/ignored one
        } else {
            finalUniqueRecsById.set(currentRec.id, currentRec); // Update if current is pending
        }
    } else {
        finalUniqueRecsById.set(currentRec.id, currentRec);
    }
  }
  
  return Array.from(finalUniqueRecsById.values());
}
