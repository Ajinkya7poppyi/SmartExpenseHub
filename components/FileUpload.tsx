
import React, { useCallback, useState, useRef } from 'react';
import * as XLSX from 'xlsx';
import { 
  RawTransactionRecord, ExpectedHeader, 
  RawIncomeRecord, ExpectedIncomeHeader,
  RawInvestmentTransferRecord, ExpectedInvestmentTransferHeader
} from '../types';
import { 
  REQUIRED_HEADERS, 
  REQUIRED_INCOME_HEADERS,
  REQUIRED_INVESTMENT_TRANSFER_HEADERS
} from '../constants';
import { ArrowUpTrayIcon } from './common/Icons';

interface CombinedUploadResult {
  expenses?: RawTransactionRecord[];
  income?: RawIncomeRecord[];
  investmentsTransfers?: RawInvestmentTransferRecord[];
  fileName: string;
}

interface FileUploadProps {
  onFileUpload: (data: CombinedUploadResult) => void;
  setIsLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  buttonText?: string;
}

const FileUpload: React.FC<FileUploadProps> = ({ 
  onFileUpload, 
  setIsLoading, 
  setError, 
  buttonText = "Upload Excel File" 
}) => {
  const [currentFileName, setCurrentFileName] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const processSheet = (
    workbook: XLSX.WorkBook, 
    sheetName: string, 
    expectedHeaders: ExpectedHeader[] | ExpectedIncomeHeader[] | ExpectedInvestmentTransferHeader[],
    sheetType: 'Expenses' | 'Income' | 'InvestmentsTransfers'
  ): { data: any[] | null, error?: string } => {
    
    const worksheet = workbook.Sheets[sheetName];
    if (!worksheet) {
      return { data: null }; 
    }

    const jsonData = XLSX.utils.sheet_to_json<any>(worksheet, { raw: false, defval: "" });

    if (jsonData.length === 0) {
      return { data: null, error: `${sheetType} sheet is empty.` };
    }

    const fileHeaders = Object.keys(jsonData[0]);
    const lowerCaseFileHeaders = fileHeaders.map(h => h.toLowerCase());
    const headerMapping = new Map<ExpectedHeader | ExpectedIncomeHeader | ExpectedInvestmentTransferHeader, string>();
    const missingCanonicalHeaders: (ExpectedHeader | ExpectedIncomeHeader | ExpectedInvestmentTransferHeader)[] = [];

    for (const canonicalHeader of expectedHeaders) {
      const lowerCanonical = canonicalHeader.toLowerCase();
      const normalizedLowerCanonical = lowerCanonical.replace(/\s+/g, '');
      let foundIndex = -1;
      let actualFileHeaderFound = '';

      for (let i = 0; i < lowerCaseFileHeaders.length; i++) {
        const currentFileHeader = lowerCaseFileHeaders[i];
        const normalizedFileHeader = currentFileHeader.replace(/\s+/g, '');
        if (normalizedFileHeader === normalizedLowerCanonical) {
          foundIndex = i;
          actualFileHeaderFound = fileHeaders[i];
          break;
        }
      }
      
      if (foundIndex !== -1) {
        headerMapping.set(canonicalHeader, actualFileHeaderFound);
      } else {
        // For optional headers like ConfirmationReference, don't mark as missing if not found
        if (sheetType === 'InvestmentsTransfers' && canonicalHeader === ExpectedInvestmentTransferHeader.ConfirmationReference) {
           // It's okay if this optional header is missing
        } else {
          missingCanonicalHeaders.push(canonicalHeader);
        }
      }
    }

    if (missingCanonicalHeaders.length > 0) {
      return { 
        data: null, 
        error: `${sheetType} sheet: Missing required headers: ${missingCanonicalHeaders.join(', ')}. The check is case-insensitive, and column order doesn't matter.` 
      };
    }

    const normalizedJsonData = jsonData.map((row, rowIndex) => {
      const newRow: Partial<RawTransactionRecord | RawIncomeRecord | RawInvestmentTransferRecord> & { __rowNum__?: number } = { };
      newRow.__rowNum__ = row.__rowNum__ !== undefined ? row.__rowNum__ : rowIndex + 2;

      for (const canonicalHeader of expectedHeaders) {
        const actualFileHeader = headerMapping.get(canonicalHeader);
        if (actualFileHeader) {
          (newRow as any)[canonicalHeader] = row[actualFileHeader];
        } else if (canonicalHeader === ExpectedInvestmentTransferHeader.ConfirmationReference) {
           (newRow as any)[canonicalHeader] = ""; // Set to empty if optional and not found
        } else {
          // This case should ideally not be hit if missingCanonicalHeaders check is robust
          (newRow as any)[canonicalHeader] = "";
        }
      }
      // For optional ConfirmationReference, ensure it exists on the object if not found in file
      if (sheetType === 'InvestmentsTransfers' && !headerMapping.has(ExpectedInvestmentTransferHeader.ConfirmationReference)) {
        (newRow as RawInvestmentTransferRecord)[ExpectedInvestmentTransferHeader.ConfirmationReference] = "";
      }
      return newRow as any;
    });
    return { data: normalizedJsonData };
  };


  const handleFileChange = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setCurrentFileName(file.name);
    setIsLoading(true);
    setError(null);

    if (!file.name.endsWith('.xlsx') && !file.name.endsWith('.xls')) {
      setError("Invalid file type. Please upload an .xlsx or .xls file.");
      setIsLoading(false);
      setCurrentFileName(null);
      if(fileInputRef.current) fileInputRef.current.value = ""; 
      return;
    }

    try {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const data = e.target?.result;
          if (!data) throw new Error("File data is empty.");
          const workbook = XLSX.read(data, { type: 'array', cellDates: true });

          const sheetErrors: string[] = [];
          let expenseData: RawTransactionRecord[] | null = null;
          let incomeData: RawIncomeRecord[] | null = null;
          let investmentTransferData: RawInvestmentTransferRecord[] | null = null;
          
          if (workbook.SheetNames.includes('Expenses')) {
            const expenseResult = processSheet(workbook, 'Expenses', REQUIRED_HEADERS, 'Expenses');
            if (expenseResult.error) sheetErrors.push(expenseResult.error);
            expenseData = expenseResult.data as RawTransactionRecord[] | null;
          }

          if (workbook.SheetNames.includes('Income')) {
            const incomeResult = processSheet(workbook, 'Income', REQUIRED_INCOME_HEADERS, 'Income');
            if (incomeResult.error) sheetErrors.push(incomeResult.error);
            incomeData = incomeResult.data as RawIncomeRecord[] | null;
          }
          
          if (workbook.SheetNames.includes('InvestmentsTransfers')) {
            const investmentTransferResult = processSheet(workbook, 'InvestmentsTransfers', REQUIRED_INVESTMENT_TRANSFER_HEADERS, 'InvestmentsTransfers');
            if (investmentTransferResult.error) sheetErrors.push(investmentTransferResult.error);
            investmentTransferData = investmentTransferResult.data as RawInvestmentTransferRecord[] | null;
          }

          if (!expenseData && !incomeData && !investmentTransferData) {
            if (sheetErrors.length > 0) {
              setError(`Error(s) reading file: ${sheetErrors.join(' | ')}`);
            } else {
              setError("No valid 'Expenses', 'Income', or 'InvestmentsTransfers' sheets found with data in the uploaded file, or they were empty.");
            }
            if(fileInputRef.current) fileInputRef.current.value = "";
            setCurrentFileName(null);
          } else { 
            if (sheetErrors.length > 0) {
              setError(`Partial success with issues: ${sheetErrors.join(' | ')}`);
            }
            onFileUpload({ 
              expenses: expenseData || undefined, 
              income: incomeData || undefined, 
              investmentsTransfers: investmentTransferData || undefined,
              fileName: file.name 
            });
          }

        } catch (err) {
          console.error(`Error processing Excel file:`, err);
          setError(err instanceof Error ? err.message : `Failed to process Excel file.`);
          setCurrentFileName(null);
          if(fileInputRef.current) fileInputRef.current.value = "";
        } finally {
          setIsLoading(false);
        }
      };
      reader.onerror = () => {
        setError("Failed to read the file.");
        setIsLoading(false);
        setCurrentFileName(null);
        if(fileInputRef.current) fileInputRef.current.value = "";
      };
      reader.readAsArrayBuffer(file);
    } catch (err) {
      console.error(`File upload error:`, err);
      setError(err instanceof Error ? err.message : `An unexpected error occurred during file upload.`);
      setIsLoading(false);
      setCurrentFileName(null);
      if(fileInputRef.current) fileInputRef.current.value = "";
    }
  }, [onFileUpload, setIsLoading, setError]);

  const handleButtonClick = () => {
    if (fileInputRef.current) {
        fileInputRef.current.value = "";
    }
    fileInputRef.current?.click();
  };

  return (
    <div className="flex items-center space-x-2">
      <input
        type="file"
        ref={fileInputRef}
        className="hidden"
        accept=".xlsx, .xls"
        onChange={handleFileChange}
      />
      <button
        onClick={handleButtonClick}
        className="flex items-center bg-blue-500 hover:bg-blue-600 text-white font-semibold py-2 px-4 rounded-lg shadow-md transition duration-150 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-opacity-75"
      >
        <ArrowUpTrayIcon className="w-5 h-5 mr-2" />
        {buttonText}
      </button>
      {currentFileName && <span className="text-sm text-gray-600 truncate max-w-xs" title={currentFileName}>{currentFileName}</span>}
    </div>
  );
};

export default FileUpload;
