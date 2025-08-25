
import { TransactionRecord, Recommendation, RecommendationType } from '../../types';

// Simplified fuzzy matching - count common words or use Levenshtein-like logic for short strings
// A proper fuzzy library would be much better. This is a placeholder.
function areStringsSimilar(s1: string, s2: string, threshold = 0.7): boolean {
  const normalize = (str: string) => str.toLowerCase().replace(/[^a-z0-9\s]/g, '').replace(/\s+/g, ' ').trim();
  const normS1 = normalize(s1);
  const normS2 = normalize(s2);

  if (normS1 === normS2) return true;
  // REMOVED: The following line was too aggressive and caused incorrect grouping.
  // if (normS1.includes(normS2) || normS2.includes(normS1)) return true; // Simple containment

  // Basic Levenshtein distance for short strings (simplified)
  const M = normS1.length;
  const N = normS2.length;
  if (Math.abs(M - N) > 5 && Math.min(M,N)/Math.max(M,N) < 0.5) return false; // Also consider relative length if absolute diff is large

  const dp = Array(M + 1).fill(null).map(() => Array(N + 1).fill(0));
  for (let i = 0; i <= M; i++) dp[i][0] = i;
  for (let j = 0; j <= N; j++) dp[0][j] = j;

  for (let i = 1; i <= M; i++) {
    for (let j = 1; j <= N; j++) {
      const cost = normS1[i - 1] === normS2[j - 1] ? 0 : 1;
      dp[i][j] = Math.min(dp[i - 1][j] + 1, dp[i][j - 1] + 1, dp[i - 1][j - 1] + cost);
    }
  }
  const distance = dp[M][N];
  const maxLength = Math.max(M, N);
  if (maxLength === 0) return true; // Both empty strings are similar
  return (1 - distance / maxLength) >= threshold;
}

export function normalizeMerchantRecommendations(transactions: TransactionRecord[]): Recommendation[] {
  const recommendations: Recommendation[] = [];
  const merchantCounts: Record<string, number> = {};
  const uniqueMerchants = new Set<string>();

  transactions.forEach(t => {
    if (t.flags.isDeleted) return;
    const paidTo = t.paidTo.trim();
    if (paidTo) {
      merchantCounts[paidTo] = (merchantCounts[paidTo] || 0) + 1;
      uniqueMerchants.add(paidTo);
    }
  });

  const sortedMerchants = Array.from(uniqueMerchants).sort((a, b) => merchantCounts[b] - merchantCounts[a]);
  const canonicalMap: Record<string, string> = {}; // Maps variant to canonical

  // Attempt to group similar merchants
  // This is a naive approach. A real solution needs better clustering or a predefined list.
  for (const merchant of sortedMerchants) {
    if (canonicalMap[merchant]) continue; // Already mapped

    let foundCanonical = false;
    // Check against existing canonicals first (those that are already values in canonicalMap)
    // This prioritizes merging into more established/frequent canonicals.
    const existingCanonicals = Array.from(new Set(Object.values(canonicalMap)));
    for (const canonicalKey of existingCanonicals) {
        if (areStringsSimilar(merchant, canonicalKey, 0.8)) {
            canonicalMap[merchant] = canonicalKey;
            foundCanonical = true;
            break;
        }
    }

    if (!foundCanonical) {
        // If not similar to any existing canonical, it becomes a new canonical for its group
        canonicalMap[merchant] = merchant; // Initially, it's its own canonical
        // Then try to map other unmapped merchants (that appear later in sortedMerchants) to it
        for (const otherMerchant of sortedMerchants) {
            // Only consider merchants not yet mapped, and different from the current merchant
            if (!canonicalMap[otherMerchant] && merchant !== otherMerchant) { 
                if (areStringsSimilar(merchant, otherMerchant, 0.8)) {
                    canonicalMap[otherMerchant] = merchant; // Map similar to this new canonical
                }
            }
        }
    }
  }
  
  transactions.forEach(t => {
    if (t.flags.isDeleted) return;
    const originalPaidTo = t.paidTo.trim();
    if (!originalPaidTo) return;

    const suggestedCanonical = canonicalMap[originalPaidTo];
    
    if (suggestedCanonical && suggestedCanonical !== originalPaidTo) {
      // Calculate confidence based on Levenshtein similarity to the chosen canonical
      // (The areStringsSimilar function returns boolean, so we re-calculate similarity score for confidence)
      const normalize = (str: string) => str.toLowerCase().replace(/[^a-z0-9\s]/g, '').replace(/\s+/g, ' ').trim();
      const normOriginal = normalize(originalPaidTo);
      const normSuggested = normalize(suggestedCanonical);
      const M = normOriginal.length;
      const N = normSuggested.length;
      const dp = Array(M + 1).fill(null).map(() => Array(N + 1).fill(0));
      for (let i = 0; i <= M; i++) dp[i][0] = i;
      for (let j = 0; j <= N; j++) dp[0][j] = j;
      for (let i = 1; i <= M; i++) {
        for (let j = 1; j <= N; j++) {
          const cost = normOriginal[i - 1] === normSuggested[j - 1] ? 0 : 1;
          dp[i][j] = Math.min(dp[i - 1][j] + 1, dp[i][j - 1] + 1, dp[i - 1][j - 1] + cost);
        }
      }
      const distance = dp[M][N];
      const maxLength = Math.max(M, N);
      let similarityScore = 0;
      if (maxLength > 0) {
        similarityScore = (1 - distance / maxLength);
      } else if (M ===0 && N === 0) {
        similarityScore = 1;
      }

      const confidence = 0.6 + (similarityScore * 0.35); // Base confidence + similarity bonus

      recommendations.push({
        id: self.crypto.randomUUID(),
        type: RecommendationType.MerchantNormalization,
        transactionIds: [t.id],
        affectedField: 'paidTo',
        originalValue: originalPaidTo,
        suggestedValue: suggestedCanonical,
        description: `Normalize merchant name from "${originalPaidTo}" to "${suggestedCanonical}" for consistency.`,
        confidence: Math.min(0.95, Math.max(0.5, confidence)), // Cap and floor confidence
        status: 'pending',
      });
    }
  });

  return recommendations;
}
