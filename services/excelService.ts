
import * as XLSX from 'xlsx';
import { 
  TransactionRecord, ExpectedHeader, 
  IncomeRecord, ExpectedIncomeHeader,
  InvestmentTransferRecord, ExpectedInvestmentTransferHeader
} from '../types';

// Define the order of headers for expense export explicitly
const EXPORT_EXPENSE_HEADERS_ORDER: (keyof TransactionRecord | string)[] = [
  ExpectedHeader.DateOfPayment,
  ExpectedHeader.PaidTo,
  ExpectedHeader.AmountPaid, 
  ExpectedHeader.ExpenseType,
  ExpectedHeader.ExpenseSubtype,
  ExpectedHeader.Description,
  ExpectedHeader.TransactionType,
];

// Define the order of headers for income export explicitly
const EXPORT_INCOME_HEADERS_ORDER: (keyof IncomeRecord | string)[] = [
  ExpectedIncomeHeader.DateOfReceipt,
  ExpectedIncomeHeader.ReceivedFrom,
  ExpectedIncomeHeader.AmountReceived, 
  ExpectedIncomeHeader.IncomeType,
  ExpectedIncomeHeader.IncomeSubtype,
  ExpectedIncomeHeader.Description,
];

// Define the order of headers for investment/transfer export
const EXPORT_INVESTMENT_TRANSFER_HEADERS_ORDER: (keyof InvestmentTransferRecord | string)[] = [
  ExpectedInvestmentTransferHeader.DateOfTransfer,
  ExpectedInvestmentTransferHeader.TransferToPlatform,
  ExpectedInvestmentTransferHeader.TransferFromAccount,
  ExpectedInvestmentTransferHeader.AmountTransferred,
  ExpectedInvestmentTransferHeader.Currency,
  ExpectedInvestmentTransferHeader.TransferType,
  ExpectedInvestmentTransferHeader.PurposeInvestmentName,
  ExpectedInvestmentTransferHeader.Description,
  ExpectedInvestmentTransferHeader.ConfirmationReference,
];


function formatTransactionForExport(transaction: TransactionRecord, includeFlags?: Record<string, boolean>): Record<string, any> {
  const record: Record<string, any> = {
    [ExpectedHeader.DateOfPayment]: transaction.dateOfPayment,
    [ExpectedHeader.PaidTo]: transaction.paidTo,
    [ExpectedHeader.AmountPaid]: transaction.amountPaid, 
    [ExpectedHeader.ExpenseType]: transaction.expenseType,
    [ExpectedHeader.ExpenseSubtype]: transaction.expenseSubtype,
    [ExpectedHeader.Description]: transaction.description,
    [ExpectedHeader.TransactionType]: transaction.transactionType,
  };

  if (includeFlags?.isDuplicate) {
    record['Is Duplicate Candidate?'] = transaction.flags.isDuplicateCandidate ? 'Yes' : 'No';
  }
  if (includeFlags?.suggestedCategory) {
    record['Category Suggested?'] = transaction.flags.categorySuggested ? 'Yes' : 'No';
  }
  if (includeFlags?.normalizedMerchant) {
    record['Merchant Normalized?'] = transaction.flags.merchantNormalized ? 'Yes' : 'No';
  }
  if (includeFlags?.originalValues && transaction.originalValues) {
    for (const key in transaction.originalValues) {
      if (Object.prototype.hasOwnProperty.call(transaction.originalValues, key)) {
        const originalKeyHeader = `Original ${key.charAt(0).toUpperCase() + key.slice(1)}`;
        record[originalKeyHeader] = (transaction.originalValues as any)[key];
      }
    }
  }
  return record;
}

function formatIncomeForExport(income: IncomeRecord): Record<string, any> {
  const record: Record<string, any> = {
    [ExpectedIncomeHeader.DateOfReceipt]: income.dateOfReceipt,
    [ExpectedIncomeHeader.ReceivedFrom]: income.receivedFrom,
    [ExpectedIncomeHeader.AmountReceived]: income.amountReceived,
    [ExpectedIncomeHeader.IncomeType]: income.incomeType,
    [ExpectedIncomeHeader.IncomeSubtype]: income.incomeSubtype,
    [ExpectedIncomeHeader.Description]: income.description,
  };
  return record;
}

function formatInvestmentTransferForExport(it: InvestmentTransferRecord): Record<string, any> {
  const record: Record<string, any> = {
    [ExpectedInvestmentTransferHeader.DateOfTransfer]: it.dateOfTransfer,
    [ExpectedInvestmentTransferHeader.TransferToPlatform]: it.transferToPlatform,
    [ExpectedInvestmentTransferHeader.TransferFromAccount]: it.transferFromAccount,
    [ExpectedInvestmentTransferHeader.AmountTransferred]: it.amountTransferred,
    [ExpectedInvestmentTransferHeader.Currency]: it.currency,
    [ExpectedInvestmentTransferHeader.TransferType]: it.transferType,
    [ExpectedInvestmentTransferHeader.PurposeInvestmentName]: it.purposeInvestmentName,
    [ExpectedInvestmentTransferHeader.Description]: it.description,
    [ExpectedInvestmentTransferHeader.ConfirmationReference]: it.confirmationReference || '',
  };
  return record;
}

export function exportToExcel(
  transactions: TransactionRecord[],
  incomeRecords: IncomeRecord[],
  investmentTransferRecords: InvestmentTransferRecord[], // Added
  fileName: string = 'exported_data',
  includeExpenseFlags?: Record<string, boolean> // Flags specific to expenses for now
): void {
  const workbook = XLSX.utils.book_new();

  // Prepare Expense Sheet
  if (transactions.length > 0) {
    const expenseDataForExport = transactions.map(t => formatTransactionForExport(t, includeExpenseFlags));
    let expenseHeaders = [...EXPORT_EXPENSE_HEADERS_ORDER];
    if (expenseDataForExport.length > 0) {
        const sampleRecord = expenseDataForExport[0];
        Object.keys(sampleRecord).forEach(key => {
            if (!expenseHeaders.includes(key as keyof TransactionRecord) && !expenseHeaders.includes(key)) {
                expenseHeaders.push(key);
            }
        });
    }
    const expenseWorksheet = XLSX.utils.json_to_sheet(expenseDataForExport, { 
      header: expenseHeaders.map(h => h === ExpectedHeader.AmountPaid ? 'Amount Paid ($)' : h.toString()) 
    });
    const expenseColWidths = expenseHeaders.map(header => {
        if (header === ExpectedHeader.Description || header === ExpectedHeader.PaidTo || header.toString().startsWith('Original Description') || header.toString().startsWith('Original Paid To')) return { wch: 30 };
        if (header === ExpectedHeader.DateOfPayment || header === ExpectedHeader.AmountPaid) return { wch: 15 };
        return { wch: 20 };
    });
    expenseWorksheet['!cols'] = expenseColWidths;
    XLSX.utils.book_append_sheet(workbook, expenseWorksheet, 'Expenses');
  }

  // Prepare Income Sheet
  if (incomeRecords.length > 0) {
    const incomeDataForExport = incomeRecords.map(i => formatIncomeForExport(i));
    let incomeHeaders = [...EXPORT_INCOME_HEADERS_ORDER];
    // Add dynamic headers if any (though income currently doesn't have extra flags for export)
    // Similar logic to expenses if income flags are added later for export
    
    const incomeWorksheet = XLSX.utils.json_to_sheet(incomeDataForExport, { 
      header: incomeHeaders.map(h => h === ExpectedIncomeHeader.AmountReceived ? 'Amount Received ($)' : h.toString())
    });
    const incomeColWidths = incomeHeaders.map(header => {
        if (header === ExpectedIncomeHeader.Description || header === ExpectedIncomeHeader.ReceivedFrom) return { wch: 30 };
        if (header === ExpectedIncomeHeader.DateOfReceipt || header === ExpectedIncomeHeader.AmountReceived) return { wch: 15 };
        return { wch: 20 };
    });
    incomeWorksheet['!cols'] = incomeColWidths;
    XLSX.utils.book_append_sheet(workbook, incomeWorksheet, 'Income');
  }

  // Prepare Investment & Transfer Sheet
  if (investmentTransferRecords.length > 0) {
    const itDataForExport = investmentTransferRecords.map(it => formatInvestmentTransferForExport(it));
    const itHeaders = [...EXPORT_INVESTMENT_TRANSFER_HEADERS_ORDER];
    // Add dynamic headers if any (though IT currently doesn't have extra flags for export)
    
    const itWorksheet = XLSX.utils.json_to_sheet(itDataForExport, { 
      header: itHeaders.map(h => h.toString()) // No special formatting like ($) for Amount Transferred in enum
    });
    const itColWidths = itHeaders.map(header => {
        if (header === ExpectedInvestmentTransferHeader.Description || 
            header === ExpectedInvestmentTransferHeader.TransferToPlatform ||
            header === ExpectedInvestmentTransferHeader.TransferFromAccount ||
            header === ExpectedInvestmentTransferHeader.PurposeInvestmentName
        ) return { wch: 30 };
        if (header === ExpectedInvestmentTransferHeader.DateOfTransfer || 
            header === ExpectedInvestmentTransferHeader.AmountTransferred ||
            header === ExpectedInvestmentTransferHeader.Currency
        ) return { wch: 15 };
        return { wch: 20 };
    });
    itWorksheet['!cols'] = itColWidths;
    XLSX.utils.book_append_sheet(workbook, itWorksheet, 'InvestmentsTransfers');
  }

  if (workbook.SheetNames.length > 0) {
    XLSX.writeFile(workbook, `${fileName}.xlsx`);
  } else {
    // Handle case where no data was available for any sheet (e.g., show an alert to the user)
    console.warn("No data to export.");
    alert("No data available to export for any category (Expenses, Income, Investments/Transfers).");
  }
}

export function exportToCsv(
  transactions: TransactionRecord[], // CSV export remains focused on expenses for now
  fileName: string = 'exported_expenses',
  includeFlags?: Record<string, boolean>
): void {
  if (transactions.length === 0) {
    alert("No expense data available to export to CSV.");
    return;
  }
  const dataForExport = transactions.map(t => formatTransactionForExport(t, includeFlags));

  let csvHeaders = [...EXPORT_EXPENSE_HEADERS_ORDER];
   if(dataForExport.length > 0) {
      const sampleRecord = dataForExport[0];
      Object.keys(sampleRecord).forEach(key => {
          if(!csvHeaders.includes(key as keyof TransactionRecord) && !csvHeaders.includes(key)){
              csvHeaders.push(key);
          }
      });
  }
  const amountPaidCsvIdx = csvHeaders.indexOf(ExpectedHeader.AmountPaid);
  if (amountPaidCsvIdx !== -1) {
    csvHeaders[amountPaidCsvIdx] = 'Amount Paid ($)';
  }

  const worksheet = XLSX.utils.json_to_sheet(dataForExport, { header: csvHeaders });
  const csvString = XLSX.utils.sheet_to_csv(worksheet);

  const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  if (link.download !== undefined) {
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `${fileName}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
}
