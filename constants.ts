
import { ExpectedHeader, ExpectedIncomeHeader, ExpectedInvestmentTransferHeader } from './types';

export const REQUIRED_HEADERS: ExpectedHeader[] = [
  ExpectedHeader.DateOfPayment,
  ExpectedHeader.PaidTo,
  ExpectedHeader.AmountPaid,
  ExpectedHeader.ExpenseType,
  ExpectedHeader.ExpenseSubtype,
  ExpectedHeader.Description,
  ExpectedHeader.TransactionType,
];

export const REQUIRED_INCOME_HEADERS: ExpectedIncomeHeader[] = [
  ExpectedIncomeHeader.DateOfReceipt,
  ExpectedIncomeHeader.ReceivedFrom,
  ExpectedIncomeHeader.AmountReceived,
  ExpectedIncomeHeader.IncomeType,
  ExpectedIncomeHeader.IncomeSubtype,
  ExpectedIncomeHeader.Description,
];

export const REQUIRED_INVESTMENT_TRANSFER_HEADERS: ExpectedInvestmentTransferHeader[] = [
  ExpectedInvestmentTransferHeader.DateOfTransfer,
  ExpectedInvestmentTransferHeader.TransferToPlatform,
  ExpectedInvestmentTransferHeader.TransferFromAccount,
  ExpectedInvestmentTransferHeader.AmountTransferred,
  ExpectedInvestmentTransferHeader.Currency,
  ExpectedInvestmentTransferHeader.TransferType,
  ExpectedInvestmentTransferHeader.PurposeInvestmentName,
  ExpectedInvestmentTransferHeader.Description,
  // ConfirmationReference is optional, so not in REQUIRED_
];


export const APP_TITLE = "Smart Expense Hub";

export const DEFAULT_DATE_FORMAT = 'yyyy-MM-dd';

// Example keywords for classification (simplified) - for expenses
export const KEYWORD_RULES: { keywords: string[]; type: string; subtype: string }[] = [
  { keywords: ['uber', 'lyft', 'taxi'], type: 'Travel', subtype: 'Ride Sharing' },
  { keywords: ['flight', 'airline', 'aa.com'], type: 'Travel', subtype: 'Flights' },
  { keywords: ['coffee', 'starbucks', 'cafe'], type: 'Food', subtype: 'Coffee Shops' },
  { keywords: ['zomato', 'doordash', 'grubhub', 'uber eats'], type: 'Food', subtype: 'Delivery' },
  { keywords: ['amazon', 'walmart', 'target'], type: 'Shopping', subtype: 'General Merchandise' },
  { keywords: ['groceries', 'supermarket'], type: 'Food', subtype: 'Groceries' },
];

// Potential future keywords for income classification
// export const INCOME_KEYWORD_RULES: { keywords: string[]; type: string; subtype: string }[] = [
//   { keywords: ['salary', 'payroll'], type: 'Employment', subtype: 'Salary' },
//   { keywords: ['freelance', 'contract'], type: 'Business', subtype: 'Freelance Income' },
// ];

// Potential future keywords for investment/transfer classification
// export const INVESTMENT_TRANSFER_KEYWORD_RULES: { keywords: string[]; type: string; purpose?: string }[] = [
//   { keywords: ['vanguard', 'schwab', 'fidelity', 'etf'], type: 'Investment' },
//   { keywords: ['icici', 'hdfc', 'axis bank india'], type: 'Transfer to India' },
// ];

export const INVESTMENT_TRANSFER_TYPES = [
  "Investment",
  "Transfer to India",
  "Loan Payment",
  "Savings",
  "Other"
];