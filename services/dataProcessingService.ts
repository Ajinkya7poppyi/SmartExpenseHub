
import { 
    RawTransactionRecord, TransactionRecord, ExpectedHeader, 
    RawIncomeRecord, IncomeRecord, ExpectedIncomeHeader,
    RawInvestmentTransferRecord, InvestmentTransferRecord, ExpectedInvestmentTransferHeader
} from '../types';
import { format, isValid } from 'date-fns';
import { parse } from 'date-fns/parse'; // Corrected import for parse
import { DEFAULT_DATE_FORMAT } from '../constants';

// Supported date formats for parsing attempt
const DATE_INPUT_FORMATS = [
  'MM/dd/yyyy',
  'dd-MM-yyyy',
  'yyyy/MM/dd',
  'yyyy-MM-dd',
  'MM-dd-yy', // For explicitly 2-digit years with '-'
  'MM/dd/yy', // For explicitly 2-digit years with '/'
  'dd.MM.yyyy',
  // Add more formats if commonly encountered
];

export function standardizeDate(dateInput: string | number | Date): string {
  if (dateInput instanceof Date) {
    if (isValid(dateInput)) {
      return format(dateInput, DEFAULT_DATE_FORMAT);
    }
  } else if (typeof dateInput === 'string') {
    for (const fmt of DATE_INPUT_FORMATS) {
      const parsedDate = parse(dateInput, fmt, new Date());
      if (isValid(parsedDate)) {
        let year = parsedDate.getFullYear();
        
        if (fmt.toLowerCase().includes('yyyy') && year >= 0 && year < 100) {
          const currentFullYear = new Date().getFullYear();
          const currentShortYear = currentFullYear % 100;
          if (year <= (currentShortYear + 10)) { 
            parsedDate.setFullYear(year + 2000);
          } else {
            parsedDate.setFullYear(year + 1900);
          }
        }
        return format(parsedDate, DEFAULT_DATE_FORMAT);
      }
    }
    const isoParsedDate = new Date(dateInput);
    if (isValid(isoParsedDate)) {
        let year = isoParsedDate.getFullYear();
        if (year >= 0 && year < 100) { 
            const currentFullYear = new Date().getFullYear();
            const currentShortYear = currentFullYear % 100;
            if (year <= (currentShortYear + 10)) {
                isoParsedDate.setFullYear(year + 2000);
            } else {
                isoParsedDate.setFullYear(year + 1900);
            }
        }
        return format(isoParsedDate, DEFAULT_DATE_FORMAT);
    }

  } else if (typeof dateInput === 'number') {
    const excelEpoch = new Date(1899, 11, 30); 
    let jsDate = new Date(excelEpoch.getTime() + dateInput * 24 * 60 * 60 * 1000);
    
    if (jsDate.getFullYear() < 1950 && dateInput > 20000) { 
        const macEpoch = new Date(1904, 0, 1);
        const macJsDate = new Date(macEpoch.getTime() + (dateInput - 1462) * 24 * 60 * 60 * 1000);
        if (isValid(macJsDate) && macJsDate.getFullYear() >= 1950) {
             jsDate = macJsDate;
        }
    }
    if (isValid(jsDate)) {
      return format(jsDate, DEFAULT_DATE_FORMAT);
    }
  }
  console.warn(`Could not parse date: ${dateInput}. Returning as is or a default.`);
  return typeof dateInput === 'string' ? dateInput : new Date().toISOString().split('T')[0];
}


export function processUploadedData(rawRecords: RawTransactionRecord[]): TransactionRecord[] {
  return rawRecords.map((rawRecord, index) => {
    let amountPaid: number;
    const rawAmount = rawRecord[ExpectedHeader.AmountPaid];
    if (typeof rawAmount === 'string') {
      amountPaid = parseFloat(rawAmount.replace(/[^0-9.-]+/g, "")) || 0;
    } else if (typeof rawAmount === 'number') {
      amountPaid = rawAmount;
    } else {
      amountPaid = 0; 
    }

    const standardizedDateString = standardizeDate(rawRecord[ExpectedHeader.DateOfPayment]);

    return {
      id: self.crypto.randomUUID(), 
      dateOfPayment: standardizedDateString,
      paidTo: String(rawRecord[ExpectedHeader.PaidTo] || '').trim(),
      amountPaid: amountPaid,
      expenseType: String(rawRecord[ExpectedHeader.ExpenseType] || '').trim(),
      expenseSubtype: String(rawRecord[ExpectedHeader.ExpenseSubtype] || '').trim(),
      description: String(rawRecord[ExpectedHeader.Description] || '').trim(),
      transactionType: String(rawRecord[ExpectedHeader.TransactionType] || '').trim(),
      flags: {}, 
      rowNum: rawRecord.__rowNum__ || index + 2, 
    };
  });
}

export function processUploadedIncomeData(rawIncomeRecords: RawIncomeRecord[]): IncomeRecord[] {
  return rawIncomeRecords.map((rawRecord, index) => {
    let amountReceived: number;
    const rawAmount = rawRecord[ExpectedIncomeHeader.AmountReceived];
    if (typeof rawAmount === 'string') {
      amountReceived = parseFloat(rawAmount.replace(/[^0-9.-]+/g, "")) || 0;
    } else if (typeof rawAmount === 'number') {
      amountReceived = rawAmount;
    } else {
      amountReceived = 0;
    }

    const standardizedDateString = standardizeDate(rawRecord[ExpectedIncomeHeader.DateOfReceipt]);

    return {
      id: self.crypto.randomUUID(),
      dateOfReceipt: standardizedDateString,
      receivedFrom: String(rawRecord[ExpectedIncomeHeader.ReceivedFrom] || '').trim(),
      amountReceived: amountReceived,
      incomeType: String(rawRecord[ExpectedIncomeHeader.IncomeType] || '').trim(),
      incomeSubtype: String(rawRecord[ExpectedIncomeHeader.IncomeSubtype] || '').trim(),
      description: String(rawRecord[ExpectedIncomeHeader.Description] || '').trim(),
      flags: {},
      rowNum: rawRecord.__rowNum__ || index + 2,
    };
  });
}

export function processUploadedInvestmentTransferData(rawInvestmentTransferRecords: RawInvestmentTransferRecord[]): InvestmentTransferRecord[] {
  return rawInvestmentTransferRecords.map((rawRecord, index) => {
    let amountTransferred: number;
    const rawAmount = rawRecord[ExpectedInvestmentTransferHeader.AmountTransferred];
    if (typeof rawAmount === 'string') {
      amountTransferred = parseFloat(rawAmount.replace(/[^0-9.-]+/g, "")) || 0;
    } else if (typeof rawAmount === 'number') {
      amountTransferred = rawAmount;
    } else {
      amountTransferred = 0;
    }

    const standardizedDateString = standardizeDate(rawRecord[ExpectedInvestmentTransferHeader.DateOfTransfer]);

    return {
      id: self.crypto.randomUUID(),
      dateOfTransfer: standardizedDateString,
      transferToPlatform: String(rawRecord[ExpectedInvestmentTransferHeader.TransferToPlatform] || '').trim(),
      transferFromAccount: String(rawRecord[ExpectedInvestmentTransferHeader.TransferFromAccount] || '').trim(),
      amountTransferred: amountTransferred,
      currency: String(rawRecord[ExpectedInvestmentTransferHeader.Currency] || 'USD').trim(),
      transferType: String(rawRecord[ExpectedInvestmentTransferHeader.TransferType] || '').trim(),
      purposeInvestmentName: String(rawRecord[ExpectedInvestmentTransferHeader.PurposeInvestmentName] || '').trim(),
      description: String(rawRecord[ExpectedInvestmentTransferHeader.Description] || '').trim(),
      confirmationReference: String(rawRecord[ExpectedInvestmentTransferHeader.ConfirmationReference] || '').trim(),
      flags: {},
      rowNum: rawRecord.__rowNum__ || index + 2,
    };
  });
}
