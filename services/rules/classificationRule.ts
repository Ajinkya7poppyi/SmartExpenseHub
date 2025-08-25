
import { TransactionRecord, Recommendation, RecommendationType } from '../../types';
import { KEYWORD_RULES } from '../../constants';

export function suggestClassificationRecommendations(
  transactionsToProcess: TransactionRecord[],
  allTransactions: TransactionRecord[] // For historical context
): Recommendation[] {
  const recommendations: Recommendation[] = [];

  // Build frequency maps for more confident suggestions based on historical data
  const paidToCategoryMap: Record<string, { type: string, subtype: string, count: number }[]> = {};
  allTransactions.forEach(t => {
    if (t.flags.isDeleted || !t.paidTo || !t.expenseType || !t.expenseSubtype) return;
    const paidToKey = t.paidTo.toLowerCase();
    paidToCategoryMap[paidToKey] = paidToCategoryMap[paidToKey] || [];
    
    const existingEntry = paidToCategoryMap[paidToKey].find(e => e.type === t.expenseType && e.subtype === t.expenseSubtype);
    if (existingEntry) {
      existingEntry.count++;
    } else {
      paidToCategoryMap[paidToKey].push({ type: t.expenseType, subtype: t.expenseSubtype, count: 1 });
    }
  });

  for (const paidToKey in paidToCategoryMap) {
    paidToCategoryMap[paidToKey].sort((a,b) => b.count - a.count); // Sort by frequency
  }

  transactionsToProcess.forEach(t => {
    if (t.flags.isDeleted) return;
    // We only suggest if BOTH type and subtype are missing, or if they seem inconsistent with keywords.
    // For this simplified version, let's focus on cases where type OR subtype is missing,
    // and missingFieldRule might not have caught it or user ignored it.
    // This rule is more about suggesting *better* classifications if current ones are weak or missing.

    const paidToKey = t.paidTo.toLowerCase();
    const descriptionLower = t.description.toLowerCase();
    let keywordSuggestion: { type: string; subtype: string; keyword: string } | null = null;

    for (const ruleDef of KEYWORD_RULES) {
      const matchedKeyword = ruleDef.keywords.find(kw => paidToKey.includes(kw) || descriptionLower.includes(kw));
      if (matchedKeyword) {
        keywordSuggestion = { type: ruleDef.type, subtype: ruleDef.subtype, keyword: matchedKeyword };
        break;
      }
    }

    // Scenario 1: Suggest based on strong keyword match if current classification is different or empty
    if (keywordSuggestion) {
      if (t.expenseType !== keywordSuggestion.type || t.expenseSubtype !== keywordSuggestion.subtype) {
        if (!t.expenseType) { // If type is missing, suggest both
             recommendations.push({
                id: self.crypto.randomUUID(),
                type: RecommendationType.Classification,
                transactionIds: [t.id],
                affectedField: 'expenseType',
                originalValue: t.expenseType,
                suggestedValue: keywordSuggestion.type,
                description: `Suggest classifying as Type: "${keywordSuggestion.type}" based on keyword "${keywordSuggestion.keyword}" for transaction at row ${t.rowNum || 'N/A'}.`,
                confidence: 0.85,
                status: 'pending',
            });
             recommendations.push({ // Separate rec for subtype
                id: self.crypto.randomUUID(),
                type: RecommendationType.Classification,
                transactionIds: [t.id],
                affectedField: 'expenseSubtype',
                originalValue: t.expenseSubtype,
                suggestedValue: keywordSuggestion.subtype,
                description: `Suggest classifying as Subtype: "${keywordSuggestion.subtype}" (Type: ${keywordSuggestion.type}) based on keyword "${keywordSuggestion.keyword}" for transaction at row ${t.rowNum || 'N/A'}.`,
                confidence: 0.80, // Slightly lower for subtype if type is also new
                status: 'pending',
            });
        } else if (t.expenseType === keywordSuggestion.type && t.expenseSubtype !== keywordSuggestion.subtype && !t.expenseSubtype) { // Type matches, subtype different or missing
             recommendations.push({
                id: self.crypto.randomUUID(),
                type: RecommendationType.Classification,
                transactionIds: [t.id],
                affectedField: 'expenseSubtype',
                originalValue: t.expenseSubtype,
                suggestedValue: keywordSuggestion.subtype,
                description: `Suggest Subtype: "${keywordSuggestion.subtype}" for Type "${t.expenseType}" based on keyword "${keywordSuggestion.keyword}" for transaction at row ${t.rowNum || 'N/A'}.`,
                confidence: 0.75,
                status: 'pending',
            });
        }
        // Could add more logic for when type is different but present.
      }
    }
    
    // Scenario 2: Suggest based on most frequent past mapping for this merchant, if current is empty or different.
    // This might overlap with MissingFieldRule, but can act as a stronger suggestion or alternative.
    if (paidToKey && paidToCategoryMap[paidToKey] && paidToCategoryMap[paidToKey].length > 0) {
        const topHistorical = paidToCategoryMap[paidToKey][0];
        if (!t.expenseType && !t.expenseSubtype) { // Both missing
            recommendations.push({
                id: self.crypto.randomUUID(),
                type: RecommendationType.Classification,
                transactionIds: [t.id],
                affectedField: 'expenseType',
                originalValue: t.expenseType,
                suggestedValue: topHistorical.type,
                description: `Suggest Type "${topHistorical.type}" based on frequent past classifications for "${t.paidTo}" (row ${t.rowNum || 'N/A'}).`,
                confidence: 0.7,
                status: 'pending',
            });
             recommendations.push({
                id: self.crypto.randomUUID(),
                type: RecommendationType.Classification,
                transactionIds: [t.id],
                affectedField: 'expenseSubtype',
                originalValue: t.expenseSubtype,
                suggestedValue: topHistorical.subtype,
                description: `Suggest Subtype "${topHistorical.subtype}" based on frequent past classifications for "${t.paidTo}" (row ${t.rowNum || 'N/A'}).`,
                confidence: 0.65,
                status: 'pending',
            });
        } else if (t.expenseType && !t.expenseSubtype && topHistorical.type === t.expenseType) { // Type matches, subtype missing
             recommendations.push({
                id: self.crypto.randomUUID(),
                type: RecommendationType.Classification,
                transactionIds: [t.id],
                affectedField: 'expenseSubtype',
                originalValue: t.expenseSubtype,
                suggestedValue: topHistorical.subtype,
                description: `Suggest Subtype "${topHistorical.subtype}" for Type "${t.expenseType}" based on frequent past classifications for "${t.paidTo}" (row ${t.rowNum || 'N/A'}).`,
                confidence: 0.65,
                status: 'pending',
            });
        }
    }
  });
  // Filter out redundant recommendations if one field was already suggested by MissingField
  // This needs more sophisticated logic to avoid conflicting suggestions or to merge them.
  // For now, it will list them, user can pick.
  return recommendations;
}
