
export enum ExpectedHeader {
  DateOfPayment = 'Date of Payment',
  PaidTo = 'Paid To',
  AmountPaid = 'Amount Paid ($)',
  ExpenseType = 'Expense Type',
  ExpenseSubtype = 'Expense Subtype',
  Description = 'Description',
  TransactionType = 'Transaction Type',
}

export interface RawTransactionRecord {
  [ExpectedHeader.DateOfPayment]: string | number;
  [ExpectedHeader.PaidTo]: string;
  [ExpectedHeader.AmountPaid]: string | number; // Excel might read as string or number
  [ExpectedHeader.ExpenseType]: string;
  [ExpectedHeader.ExpenseSubtype]: string;
  [ExpectedHeader.Description]: string;
  [ExpectedHeader.TransactionType]: string;
  __rowNum__?: number; // Original row number from Excel
}

export interface TransactionRecord {
  id: string;
  dateOfPayment: string; // YYYY-MM-DD
  paidTo: string;
  amountPaid: number;
  expenseType: string;
  expenseSubtype: string;
  description: string;
  transactionType: string;
  
  // Tracking changes and original values
  originalValues?: Partial<Omit<TransactionRecord, 'id' | 'originalValues' | 'flags'>>;
  flags: {
    isDuplicateCandidate?: boolean; // If identified as a potential duplicate
    isDeleted?: boolean; // If user marked for deletion (e.g., confirmed duplicate)
    merchantNormalized?: boolean;
    categorySuggested?: boolean;
    fieldsFilled?: boolean; 
  };
  rowNum?: number; // To link back to original Excel row if needed
}

export enum RecommendationType {
  Duplicate = 'DUPLICATE_TRANSACTION',
  MerchantNormalization = 'MERCHANT_NORMALIZATION',
  MissingField = 'MISSING_FIELD',
  Classification = 'CLASSIFICATION_SUGGESTION',
}

export interface Recommendation {
  id: string;
  type: RecommendationType;
  transactionIds: string[]; // IDs of transactions this recommendation applies to
  affectedField?: keyof Omit<TransactionRecord, 'id' | 'originalValues' | 'flags' | 'rowNum'>;
  originalValue?: any;
  suggestedValue: any;
  confidence?: number; // 0-1
  description: string; // Explanation of the recommendation
  status: 'pending' | 'applied' | 'ignored';
}

export interface FilterCriteria {
  dateRange?: { start?: string; end?: string };
  category?: string;
  subCategory?: string;
  transactionType?: string;
}

export enum AppTab {
  DataView = "Expense View",
  IncomeView = "Income View", 
  InvestmentTransferView = "Investments & Transfers",
  Recommendations = "Recommendations",
  Dashboard = "Dashboard",
  Settings = "Settings" 
}

// --- Income Related Types ---
export enum ExpectedIncomeHeader {
  DateOfReceipt = 'Date of Receipt',
  ReceivedFrom = 'Received From',
  AmountReceived = 'Amount Received ($)',
  IncomeType = 'Income Type',
  IncomeSubtype = 'Income Subtype',
  Description = 'Description',
}

export interface RawIncomeRecord {
  [ExpectedIncomeHeader.DateOfReceipt]: string | number;
  [ExpectedIncomeHeader.ReceivedFrom]: string;
  [ExpectedIncomeHeader.AmountReceived]: string | number;
  [ExpectedIncomeHeader.IncomeType]: string;
  [ExpectedIncomeHeader.IncomeSubtype]: string;
  [ExpectedIncomeHeader.Description]: string;
  __rowNum__?: number;
}

export interface IncomeRecord {
  id: string;
  dateOfReceipt: string; // YYYY-MM-DD
  receivedFrom: string;
  amountReceived: number;
  incomeType: string;
  incomeSubtype: string;
  description: string;
  
  originalValues?: Partial<Omit<IncomeRecord, 'id' | 'originalValues' | 'flags'>>;
  flags: {
    isDeleted?: boolean; 
  };
  rowNum?: number;
}

// --- Investment & Transfer Related Types ---
export enum ExpectedInvestmentTransferHeader {
  DateOfTransfer = 'Date of Transfer',
  TransferToPlatform = 'Transfer To/Platform',
  TransferFromAccount = 'Transfer From Account/Source',
  AmountTransferred = 'Amount Transferred',
  Currency = 'Currency',
  TransferType = 'Transfer Type', // e.g., Investment, Transfer to India, Loan Repayment
  PurposeInvestmentName = 'Purpose/Investment Name',
  Description = 'Description',
  ConfirmationReference = 'Confirmation/Reference #',
}

export interface RawInvestmentTransferRecord {
  [ExpectedInvestmentTransferHeader.DateOfTransfer]: string | number;
  [ExpectedInvestmentTransferHeader.TransferToPlatform]: string;
  [ExpectedInvestmentTransferHeader.TransferFromAccount]: string;
  [ExpectedInvestmentTransferHeader.AmountTransferred]: string | number;
  [ExpectedInvestmentTransferHeader.Currency]: string;
  [ExpectedInvestmentTransferHeader.TransferType]: string;
  [ExpectedInvestmentTransferHeader.PurposeInvestmentName]: string;
  [ExpectedInvestmentTransferHeader.Description]: string;
  [ExpectedInvestmentTransferHeader.ConfirmationReference]?: string; // Optional
  __rowNum__?: number;
}

export interface InvestmentTransferRecord {
  id: string;
  dateOfTransfer: string; // YYYY-MM-DD
  transferToPlatform: string;
  transferFromAccount: string;
  amountTransferred: number;
  currency: string;
  transferType: string;
  purposeInvestmentName: string;
  description: string;
  confirmationReference?: string; // Optional
  
  originalValues?: Partial<Omit<InvestmentTransferRecord, 'id' | 'originalValues' | 'flags'>>;
  flags: {
    isDeleted?: boolean;
  };
  rowNum?: number;
}
