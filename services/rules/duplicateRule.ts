
import { TransactionRecord, Recommendation, RecommendationType } from '../../types';
// Note: For a local app without external libraries, a simple string similarity can be implemented.
// For robust fuzzy matching, a library like 'fuse.js' would be ideal, but is avoided per prompt constraints on "no external AI/models".
// This implementation will use basic exact matches and simple string comparisons.

// Basic string similarity (Levenshtein distance could be implemented if more complexity is allowed)
function simpleSimilarity(s1: string, s2: string): number {
  const longer = s1.length > s2.length ? s1 : s2;
  const shorter = s1.length > s2.length ? s2 : s1;
  if (longer.length === 0) return 1.0;
  const longerLower = longer.toLowerCase();
  const shorterLower = shorter.toLowerCase();
  
  // Direct containment or very close length might indicate similarity
  if (longerLower.includes(shorterLower) && (longer.length - shorter.length < 5)) return 0.8;

  let matchingChars = 0;
  for (let i = 0; i < shorterLower.length; i++) {
    if (longerLower.includes(shorterLower[i])) {
      matchingChars++;
    }
  }
  return matchingChars / longer.length;
}


export function findDuplicateRecommendations(transactions: TransactionRecord[]): Recommendation[] {
  const recommendations: Recommendation[] = [];
  const potentialDuplicates = new Map<string, TransactionRecord[]>();

  // Group transactions by Date and Amount (exact match fields)
  transactions.forEach(t => {
    if (t.flags.isDeleted) return; // Skip already deleted transactions
    const key = `${t.dateOfPayment}_${t.amountPaid.toFixed(2)}`;
    if (!potentialDuplicates.has(key)) {
      potentialDuplicates.set(key, []);
    }
    potentialDuplicates.get(key)!.push(t);
  });

  const processedPairs = new Set<string>(); // To avoid duplicate A-B and B-A pairs

  potentialDuplicates.forEach(group => {
    if (group.length > 1) {
      for (let i = 0; i < group.length; i++) {
        for (let j = i + 1; j < group.length; j++) {
          const t1 = group[i];
          const t2 = group[j];

          // Ensure pair is not already processed
          const pairKey = [t1.id, t2.id].sort().join('-');
          if (processedPairs.has(pairKey)) continue;

          // Check PaidTo and Description similarity
          const paidToSimilarity = simpleSimilarity(t1.paidTo, t2.paidTo);
          const descriptionSimilarity = simpleSimilarity(t1.description, t2.description);
          
          // Define thresholds for considering a duplicate
          // Exact match on Date, Amount. High similarity on PaidTo OR Description.
          // Or very high on both.
          const isPaidToSimilar = paidToSimilarity > 0.8;
          const isDescriptionSimilar = descriptionSimilarity > 0.7;

          let confidence = 0;
          if (isPaidToSimilar && isDescriptionSimilar) confidence = 0.9;
          else if (isPaidToSimilar && t1.description === t2.description) confidence = 0.95; // Exact desc, similar paidTo
          else if (t1.paidTo === t2.paidTo && isDescriptionSimilar) confidence = 0.95; // Exact paidTo, similar desc
          else if (isPaidToSimilar || isDescriptionSimilar) confidence = 0.75; // One of them is similar
          else if (t1.paidTo === t2.paidTo && t1.description === t2.description) confidence = 1.0; // Exact match on all

          if (confidence >= 0.75) { // Threshold for suggesting duplication
            recommendations.push({
              id: self.crypto.randomUUID(),
              type: RecommendationType.Duplicate,
              transactionIds: [t1.id, t2.id].sort(), // Store IDs consistently
              description: `Potential duplicate transactions found. Row ${t1.rowNum || 'N/A'} and Row ${t2.rowNum || 'N/A'} have the same date and amount, with similar 'Paid To' and/or 'Description'.`,
              originalValue: { t1_paidTo: t1.paidTo, t1_desc: t1.description, t2_paidTo: t2.paidTo, t2_desc: t2.description },
              suggestedValue: 'Mark one for deletion or review.', // Or suggest deleting the later one by ID if rowNum isn't reliable
              confidence: confidence,
              status: 'pending',
            });
            processedPairs.add(pairKey);
          }
        }
      }
    }
  });

  return recommendations;
}
