
import { TransactionRecord, Recommendation, RecommendationType } from '../../types';
import { KEYWORD_RULES } from '../../constants';

export function suggestMissingFieldRecommendations(
  transactionsToProcess: TransactionRecord[],
  allTransactions: TransactionRecord[] // For historical context
): Recommendation[] {
  const recommendations: Recommendation[] = [];

  // Build frequency maps from all transactions (historical data)
  const typeFrequency: Record<string, Record<string, number>> = {}; // paidTo -> {expenseType: count}
  const subtypeFrequency: Record<string, Record<string, Record<string, number>>> = {}; // paidTo -> {expenseType: {expenseSubtype: count}}
  const transactionTypeFrequency: Record<string, Record<string, number>> = {}; // paidTo -> {transactionType: count}

  allTransactions.forEach(t => {
    if (t.flags.isDeleted) return;
    const paidToKey = t.paidTo.toLowerCase();
    if (!paidToKey) return;

    // Expense Type
    if (t.expenseType) {
      typeFrequency[paidToKey] = typeFrequency[paidToKey] || {};
      typeFrequency[paidToKey][t.expenseType] = (typeFrequency[paidToKey][t.expenseType] || 0) + 1;
    }
    // Expense Subtype (linked to type)
    if (t.expenseType && t.expenseSubtype) {
      subtypeFrequency[paidToKey] = subtypeFrequency[paidToKey] || {};
      subtypeFrequency[paidToKey][t.expenseType] = subtypeFrequency[paidToKey][t.expenseType] || {};
      subtypeFrequency[paidToKey][t.expenseType][t.expenseSubtype] = (subtypeFrequency[paidToKey][t.expenseType][t.expenseSubtype] || 0) + 1;
    }
    // Transaction Type
    if (t.transactionType) {
        transactionTypeFrequency[paidToKey] = transactionTypeFrequency[paidToKey] || {};
        transactionTypeFrequency[paidToKey][t.transactionType] = (transactionTypeFrequency[paidToKey][t.transactionType] || 0) + 1;
    }
  });

  const getMostFrequent = (freqMap: Record<string, number> | undefined): string | null => {
    if (!freqMap || Object.keys(freqMap).length === 0) return null;
    return Object.entries(freqMap).sort((a, b) => b[1] - a[1])[0][0];
  };

  transactionsToProcess.forEach(t => {
    if (t.flags.isDeleted) return;
    const paidToKey = t.paidTo.toLowerCase();
    const descriptionLower = t.description.toLowerCase();

    // Suggest Expense Type if missing
    if (!t.expenseType) {
      let suggestion: string | null = null;
      let rule = "based on historical data";
      // Try historical first
      if (paidToKey && typeFrequency[paidToKey]) {
        suggestion = getMostFrequent(typeFrequency[paidToKey]);
      }
      // Try keyword heuristics if no historical or for better confidence
      if (!suggestion) {
        for (const ruleDef of KEYWORD_RULES) {
          if (ruleDef.keywords.some(kw => paidToKey.includes(kw) || descriptionLower.includes(kw))) {
            suggestion = ruleDef.type;
            rule = `based on keyword match ('${ruleDef.keywords.find(kw => paidToKey.includes(kw) || descriptionLower.includes(kw))}')`;
            break;
          }
        }
      }

      if (suggestion) {
        recommendations.push({
          id: self.crypto.randomUUID(),
          type: RecommendationType.MissingField,
          transactionIds: [t.id],
          affectedField: 'expenseType',
          originalValue: t.expenseType,
          suggestedValue: suggestion,
          description: `Suggest filling missing Expense Type with "${suggestion}" ${rule} for transaction at row ${t.rowNum || 'N/A'}.`,
          confidence: suggestion && rule.includes("keyword") ? 0.8 : 0.65,
          status: 'pending',
        });
      }
    }

    // Suggest Expense Subtype if missing AND Expense Type is present
    if (t.expenseType && !t.expenseSubtype) {
      let suggestion: string | null = null;
      let rule = "based on historical data";
      // Try historical first (for this paidTo and expenseType)
      if (paidToKey && subtypeFrequency[paidToKey] && subtypeFrequency[paidToKey][t.expenseType]) {
        suggestion = getMostFrequent(subtypeFrequency[paidToKey][t.expenseType]);
      }
      // Try keyword heuristics if no historical
       if (!suggestion) {
        for (const ruleDef of KEYWORD_RULES) {
          if (ruleDef.type === t.expenseType && ruleDef.keywords.some(kw => paidToKey.includes(kw) || descriptionLower.includes(kw))) {
            suggestion = ruleDef.subtype;
            rule = `based on keyword match ('${ruleDef.keywords.find(kw => paidToKey.includes(kw) || descriptionLower.includes(kw))}') for type ${t.expenseType}`;
            break;
          }
        }
      }

      if (suggestion) {
        recommendations.push({
          id: self.crypto.randomUUID(),
          type: RecommendationType.MissingField,
          transactionIds: [t.id],
          affectedField: 'expenseSubtype',
          originalValue: t.expenseSubtype,
          suggestedValue: suggestion,
          description: `Suggest filling missing Expense Subtype with "${suggestion}" ${rule} for transaction at row ${t.rowNum || 'N/A'}.`,
          confidence: suggestion && rule.includes("keyword") ? 0.75 : 0.6,
          status: 'pending',
        });
      }
    }
    
    // Suggest Transaction Type if missing
    if(!t.transactionType) {
        let suggestion: string | null = null;
        if(paidToKey && transactionTypeFrequency[paidToKey]) {
            suggestion = getMostFrequent(transactionTypeFrequency[paidToKey]);
        }
        // Could add more heuristics for Transaction Type if needed e.g. "ATM Withdrawal" -> "Cash"
        if(suggestion) {
            recommendations.push({
              id: self.crypto.randomUUID(),
              type: RecommendationType.MissingField,
              transactionIds: [t.id],
              affectedField: 'transactionType',
              originalValue: t.transactionType,
              suggestedValue: suggestion,
              description: `Suggest filling missing Transaction Type with "${suggestion}" based on historical data for "${t.paidTo}" at row ${t.rowNum || 'N/A'}.`,
              confidence: 0.6,
              status: 'pending',
            });
        }
    }
  });

  return recommendations;
}
