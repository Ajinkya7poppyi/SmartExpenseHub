
import React, { useState, useCallback, useEffect, useMemo } from 'react';
import { Routes, Route, Link, useLocation, Navigate } from 'react-router-dom';
import { 
    TransactionRecord, RawTransactionRecord, Recommendation, AppTab, FilterCriteria, RecommendationType,
    IncomeRecord, RawIncomeRecord,
    InvestmentTransferRecord, RawInvestmentTransferRecord
} from './types';
import FileUpload from './components/FileUpload';
import DataTableView from './components/DataTableView';
import RecommendationsView from './components/RecommendationsView';
import DashboardView from './components/DashboardView';
import ExportControls from './components/ExportControls';
import GlobalFilterBar from './components/GlobalFilterBar';
import IncomeDataTableView from './components/IncomeDataTableView';
import InvestmentTransferDataTableView from './components/InvestmentTransferDataTableView';
import { processUploadedData, processUploadedIncomeData, processUploadedInvestmentTransferData } from './services/dataProcessingService';
import { generateRecommendations } from './services/recommendationService';
import { exportToExcel, exportToCsv } from './services/excelService';
import { APP_TITLE } from './constants';
import { TableCellsIcon, SparklesIcon, ChartBarIcon, ArrowDownTrayIcon, InboxArrowDownIcon, BanknotesIcon, Cog6ToothIcon, ExclamationTriangleIcon } from './components/common/Icons'; // Removed ArrowPathIcon
import Modal from './components/common/Modal';


interface CombinedUploadResult {
  expenses?: RawTransactionRecord[];
  income?: RawIncomeRecord[];
  investmentsTransfers?: RawInvestmentTransferRecord[];
  fileName: string;
}

const App: React.FC = () => {
  // Expense State
  const [transactions, setTransactions] = useState<TransactionRecord[]>([]);
  const [rawExpenseFileName, setRawExpenseFileName] = useState<string | null>(null);
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  
  // Income State
  const [incomeRecords, setIncomeRecords] = useState<IncomeRecord[]>([]);
  const [rawIncomeFileName, setRawIncomeFileName] = useState<string | null>(null);

  // Investment & Transfer State
  const [investmentTransferRecords, setInvestmentTransferRecords] = useState<InvestmentTransferRecord[]>([]);
  const [rawInvestmentTransferFileName, setRawInvestmentTransferFileName] = useState<string | null>(null);


  // General State
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [globalFilters, setGlobalFilters] = useState<FilterCriteria>({});
  // Removed showClearConfirmModal state
  
  const location = useLocation();

  const resetAllData = useCallback(() => {
    setTransactions([]);
    setRawExpenseFileName(null);
    setRecommendations([]);
    setIncomeRecords([]);
    setRawIncomeFileName(null);
    setInvestmentTransferRecords([]);
    setRawInvestmentTransferFileName(null);
    setGlobalFilters({});
    setError(null);
    setIsLoading(false);
  }, []);

  const handleCombinedFileUpload = useCallback(async (uploadResult: CombinedUploadResult) => {
    setIsLoading(true);
    setError(null);

    // Reset previous data before processing new file
    resetAllData();

    let processedExpenseData: TransactionRecord[] | null = null;
    let processedIncomeData: IncomeRecord[] | null = null;
    let processedInvestmentTransferData: InvestmentTransferRecord[] | null = null;
    let expenseProcessingError: string | null = null;
    let incomeProcessingError: string | null = null;
    let investmentTransferProcessingError: string | null = null;
    
    if (uploadResult.expenses && uploadResult.expenses.length > 0) {
      try {
        processedExpenseData = processUploadedData(uploadResult.expenses);
        setTransactions(processedExpenseData);
        setRawExpenseFileName(uploadResult.fileName);
      } catch (e) {
        console.error("Error processing expense data:", e);
        expenseProcessingError = e instanceof Error ? `Expense sheet processing failed: ${e.message}` : "Unknown expense processing error.";
      }
    }

    if (uploadResult.income && uploadResult.income.length > 0) {
      try {
        processedIncomeData = processUploadedIncomeData(uploadResult.income);
        setIncomeRecords(processedIncomeData);
        setRawIncomeFileName(uploadResult.fileName);
      } catch (e)
 {
        console.error("Error processing income data:", e);
        incomeProcessingError = e instanceof Error ? `Income sheet processing failed: ${e.message}` : "Unknown income processing error.";
      }
    }

    if (uploadResult.investmentsTransfers && uploadResult.investmentsTransfers.length > 0) {
        try {
            processedInvestmentTransferData = processUploadedInvestmentTransferData(uploadResult.investmentsTransfers);
            setInvestmentTransferRecords(processedInvestmentTransferData);
            setRawInvestmentTransferFileName(uploadResult.fileName);
        } catch (e) {
            console.error("Error processing investment/transfer data:", e);
            investmentTransferProcessingError = e instanceof Error ? `Investment/Transfer sheet processing failed: ${e.message}` : "Unknown investment/transfer processing error.";
        }
    }
    
    const appProcessingErrors: string[] = [];
    if (expenseProcessingError) appProcessingErrors.push(expenseProcessingError);
    if (incomeProcessingError) appProcessingErrors.push(incomeProcessingError);
    if (investmentTransferProcessingError) appProcessingErrors.push(investmentTransferProcessingError);


    if (appProcessingErrors.length > 0) {
        setError(prevError => prevError ? `${prevError} | ${appProcessingErrors.join(' | ')}` : appProcessingErrors.join(' | '));
    } else if (!uploadResult.expenses && !uploadResult.income && !uploadResult.investmentsTransfers && !error) { 
        setError("The uploaded file did not contain processable 'Expenses', 'Income', or 'InvestmentsTransfers' sheets, or they were empty/had header issues.");
    }
    
    // Ensure that if processing failed for a type, its data is cleared
    if (expenseProcessingError || !uploadResult.expenses || uploadResult.expenses.length === 0) {
        setTransactions([]);
        setRecommendations([]);
    }
    if (incomeProcessingError || !uploadResult.income || uploadResult.income.length === 0) {
        setIncomeRecords([]);
    }
    if (investmentTransferProcessingError || !uploadResult.investmentsTransfers || uploadResult.investmentsTransfers.length === 0) {
        setInvestmentTransferRecords([]);
    }

    setIsLoading(false);
  }, [error, resetAllData]); 

  // Removed handlers for clear confirm modal

  const applyRecommendation = useCallback((recommendationId: string) => {
    const recommendation = recommendations.find(rec => rec.id === recommendationId);
    if (!recommendation) return;

    setTransactions(prevTransactions => {
      return prevTransactions.map(t => {
        if (recommendation.transactionIds.includes(t.id)) {
          const updatedTransaction = { ...t, originalValues: { ...(t.originalValues || {}) }, flags: {...t.flags} };
          
          if (!updatedTransaction.originalValues) {
            updatedTransaction.originalValues = {};
          }
          
          if (recommendation.type === RecommendationType.MerchantNormalization && recommendation.affectedField === 'paidTo') {
            if (updatedTransaction.originalValues.paidTo === undefined) updatedTransaction.originalValues.paidTo = t.paidTo;
            updatedTransaction.paidTo = recommendation.suggestedValue;
            updatedTransaction.flags.merchantNormalized = true;
          } else if (recommendation.type === RecommendationType.Classification && recommendation.affectedField) {
            if (recommendation.affectedField === 'expenseType') {
              if (updatedTransaction.originalValues.expenseType === undefined) updatedTransaction.originalValues.expenseType = t.expenseType;
              updatedTransaction.expenseType = recommendation.suggestedValue;
            } else if (recommendation.affectedField === 'expenseSubtype') {
              if (updatedTransaction.originalValues.expenseSubtype === undefined) updatedTransaction.originalValues.expenseSubtype = t.expenseSubtype;
              updatedTransaction.expenseSubtype = recommendation.suggestedValue;
            }
            updatedTransaction.flags.categorySuggested = true;
          } else if (recommendation.type === RecommendationType.MissingField && recommendation.affectedField) {
             if (recommendation.affectedField === 'expenseType') {
              if (updatedTransaction.originalValues.expenseType === undefined) updatedTransaction.originalValues.expenseType = t.expenseType;
              updatedTransaction.expenseType = recommendation.suggestedValue;
            } else if (recommendation.affectedField === 'expenseSubtype') {
              if (updatedTransaction.originalValues.expenseSubtype === undefined) updatedTransaction.originalValues.expenseSubtype = t.expenseSubtype;
              updatedTransaction.expenseSubtype = recommendation.suggestedValue;
            } else if (recommendation.affectedField === 'transactionType') {
              if (updatedTransaction.originalValues.transactionType === undefined) updatedTransaction.originalValues.transactionType = t.transactionType;
              updatedTransaction.transactionType = recommendation.suggestedValue;
            }
            updatedTransaction.flags.fieldsFilled = true;
          } else if (recommendation.type === RecommendationType.Duplicate) {
            updatedTransaction.flags.isDuplicateCandidate = true; 
            if (recommendation.suggestedValue === 'delete' || (typeof recommendation.suggestedValue === 'string' && recommendation.suggestedValue.includes(t.id))) {
                 updatedTransaction.flags.isDeleted = true;
            }
          }
          return updatedTransaction;
        }
        return t;
      });
    });
    setRecommendations(prevRecs => prevRecs.map(rec => rec.id === recommendationId ? { ...rec, status: 'applied' } : rec));
  }, [recommendations]);

  const ignoreRecommendation = useCallback((recommendationId: string) => {
    setRecommendations(prev => prev.map(rec => rec.id === recommendationId ? { ...rec, status: 'ignored' } : rec));
  }, []);

  const applyMultipleRecommendations = useCallback((recommendationIds: string[]) => {
    setTransactions(prevTransactions => {
      let tempTransactions = [...prevTransactions];
      const recsToApply = recommendations.filter(rec => recommendationIds.includes(rec.id) && rec.status === 'pending');

      for (const recommendation of recsToApply) {
        tempTransactions = tempTransactions.map(t => {
          if (recommendation.transactionIds.includes(t.id)) {
            const updatedTransaction = { ...t, originalValues: { ...(t.originalValues || {}) }, flags: { ...t.flags } };
            if (!updatedTransaction.originalValues) updatedTransaction.originalValues = {};

            if (recommendation.type === RecommendationType.MerchantNormalization && recommendation.affectedField === 'paidTo') {
              if (updatedTransaction.originalValues.paidTo === undefined) updatedTransaction.originalValues.paidTo = t.paidTo;
              updatedTransaction.paidTo = recommendation.suggestedValue;
              updatedTransaction.flags.merchantNormalized = true;
            } else if (recommendation.type === RecommendationType.Classification && recommendation.affectedField) {
                if (recommendation.affectedField === 'expenseType') {
                    if (updatedTransaction.originalValues.expenseType === undefined) updatedTransaction.originalValues.expenseType = t.expenseType;
                    updatedTransaction.expenseType = recommendation.suggestedValue;
                } else if (recommendation.affectedField === 'expenseSubtype') {
                    if (updatedTransaction.originalValues.expenseSubtype === undefined) updatedTransaction.originalValues.expenseSubtype = t.expenseSubtype;
                    updatedTransaction.expenseSubtype = recommendation.suggestedValue;
                }
                updatedTransaction.flags.categorySuggested = true;
            } else if (recommendation.type === RecommendationType.MissingField && recommendation.affectedField) {
                if (recommendation.affectedField === 'expenseType') {
                    if (updatedTransaction.originalValues.expenseType === undefined) updatedTransaction.originalValues.expenseType = t.expenseType;
                    updatedTransaction.expenseType = recommendation.suggestedValue;
                } else if (recommendation.affectedField === 'expenseSubtype') {
                    if (updatedTransaction.originalValues.expenseSubtype === undefined) updatedTransaction.originalValues.expenseSubtype = t.expenseSubtype;
                    updatedTransaction.expenseSubtype = recommendation.suggestedValue;
                } else if (recommendation.affectedField === 'transactionType') {
                    if (updatedTransaction.originalValues.transactionType === undefined) updatedTransaction.originalValues.transactionType = t.transactionType;
                    updatedTransaction.transactionType = recommendation.suggestedValue;
                }
                updatedTransaction.flags.fieldsFilled = true;
            } else if (recommendation.type === RecommendationType.Duplicate) {
                 updatedTransaction.flags.isDuplicateCandidate = true;
                 if (recommendation.suggestedValue === 'delete' || (typeof recommendation.suggestedValue === 'string' && recommendation.suggestedValue.includes(t.id))) {
                    updatedTransaction.flags.isDeleted = true;
                 }
            }
            return updatedTransaction;
          }
          return t;
        });
      }
      return tempTransactions;
    });
    setRecommendations(prevRecs => prevRecs.map(rec => recommendationIds.includes(rec.id) ? { ...rec, status: 'applied' } : rec));
  }, [recommendations]);

  const ignoreMultipleRecommendations = useCallback((recommendationIds: string[]) => {
    setRecommendations(prevRecs => prevRecs.map(rec => recommendationIds.includes(rec.id) ? { ...rec, status: 'ignored' } : rec));
  }, []);

  const addTransaction = useCallback((newTransaction: Omit<TransactionRecord, 'id' | 'flags' | 'originalValues'>) => {
    setTransactions(prev => {
      const fullNewTransaction: TransactionRecord = {
        ...newTransaction,
        id: self.crypto.randomUUID(),
        flags: {},
      };
      return [...prev, fullNewTransaction];
    });
  }, []);

  const updateTransaction = useCallback((updatedTransaction: TransactionRecord) => {
    setTransactions(prev => prev.map(t => t.id === updatedTransaction.id ? updatedTransaction : t));
  }, []);
  
  const deleteTransaction = useCallback((transactionId: string) => {
    setTransactions(prev => prev.filter(t => t.id !== transactionId));
  }, []);

  const globallyFilteredTransactions = useMemo(() => {
    let dataToFilter = transactions.filter(t => !t.flags.isDeleted);
    if (globalFilters.dateRange?.start) dataToFilter = dataToFilter.filter(t => t.dateOfPayment >= globalFilters.dateRange!.start!);
    if (globalFilters.dateRange?.end) dataToFilter = dataToFilter.filter(t => t.dateOfPayment <= globalFilters.dateRange!.end!);
    if (globalFilters.category) dataToFilter = dataToFilter.filter(t => t.expenseType === globalFilters.category);
    if (globalFilters.subCategory) dataToFilter = dataToFilter.filter(t => t.expenseSubtype === globalFilters.subCategory);
    if (globalFilters.transactionType) dataToFilter = dataToFilter.filter(t => t.transactionType === globalFilters.transactionType);
    return dataToFilter;
  }, [transactions, globalFilters]);

  // --- Income Handlers ---
  const addIncomeRecord = useCallback((newIncome: Omit<IncomeRecord, 'id' | 'flags' | 'originalValues'>) => {
    setIncomeRecords(prev => {
      const fullNewIncome: IncomeRecord = {
        ...newIncome,
        id: self.crypto.randomUUID(),
        flags: {},
      };
      return [...prev, fullNewIncome];
    });
  }, []);

  const updateIncomeRecord = useCallback((updatedIncome: IncomeRecord) => {
    setIncomeRecords(prev => prev.map(i => i.id === updatedIncome.id ? updatedIncome : i));
  }, []);

  const deleteIncomeRecord = useCallback((incomeId: string) => {
    setIncomeRecords(prev => prev.filter(i => i.id !== incomeId));
  }, []);

  const globallyFilteredIncomeRecords = useMemo(() => {
    let dataToFilter = incomeRecords.filter(i => !i.flags.isDeleted);
    if (globalFilters.dateRange?.start) dataToFilter = dataToFilter.filter(i => i.dateOfReceipt >= globalFilters.dateRange!.start!);
    if (globalFilters.dateRange?.end) dataToFilter = dataToFilter.filter(i => i.dateOfReceipt <= globalFilters.dateRange!.end!);
    return dataToFilter;
  }, [incomeRecords, globalFilters]);

  // --- Investment & Transfer Handlers ---
  const addInvestmentTransferRecord = useCallback((newRecord: Omit<InvestmentTransferRecord, 'id' | 'flags' | 'originalValues'>) => {
    setInvestmentTransferRecords(prev => {
      const fullNewRecord: InvestmentTransferRecord = {
        ...newRecord,
        id: self.crypto.randomUUID(),
        flags: {},
      };
      return [...prev, fullNewRecord];
    });
  }, []);

  const updateInvestmentTransferRecord = useCallback((updatedRecord: InvestmentTransferRecord) => {
    setInvestmentTransferRecords(prev => prev.map(r => r.id === updatedRecord.id ? updatedRecord : r));
  }, []);

  const deleteInvestmentTransferRecord = useCallback((recordId: string) => {
    setInvestmentTransferRecords(prev => prev.filter(r => r.id !== recordId));
  }, []);

  const globallyFilteredInvestmentTransferRecords = useMemo(() => {
    let dataToFilter = investmentTransferRecords.filter(r => !r.flags.isDeleted);
    if (globalFilters.dateRange?.start) dataToFilter = dataToFilter.filter(r => r.dateOfTransfer >= globalFilters.dateRange!.start!);
    if (globalFilters.dateRange?.end) dataToFilter = dataToFilter.filter(r => r.dateOfTransfer <= globalFilters.dateRange!.end!);
    return dataToFilter;
  }, [investmentTransferRecords, globalFilters]);


  const handleExport = useCallback((format: 'xlsx' | 'csv', _exportFilters?: FilterCriteria, includeFlags?: Record<string, boolean>) => {
    let baseName = 'exported_data';
    const expenseFileBase = rawExpenseFileName ? rawExpenseFileName.split('.')[0] : null;
    const incomeFileBase = rawIncomeFileName ? rawIncomeFileName.split('.')[0] : null;
    const itFileBase = rawInvestmentTransferFileName ? rawInvestmentTransferFileName.split('.')[0] : null;

    if (expenseFileBase && expenseFileBase === incomeFileBase && expenseFileBase === itFileBase) {
        baseName = `processed_data_${expenseFileBase}`;
    } else {
        let parts: string[] = [];
        if(expenseFileBase) parts.push(`exp_${expenseFileBase}`);
        if(incomeFileBase && incomeFileBase !== expenseFileBase) parts.push(`inc_${incomeFileBase}`);
        if(itFileBase && itFileBase !== expenseFileBase && itFileBase !== incomeFileBase) parts.push(`it_${itFileBase}`);
        
        if (parts.length > 0) baseName = `processed_data_${parts.join('_')}`;
        else if (expenseFileBase) baseName = `processed_expenses_${expenseFileBase}`;
        else if (incomeFileBase) baseName = `processed_income_${incomeFileBase}`;
        else if (itFileBase) baseName = `processed_invest_transfers_${itFileBase}`;
    }
    const exportFileName = baseName;

    if (format === 'xlsx') {
      exportToExcel(
        globallyFilteredTransactions, 
        globallyFilteredIncomeRecords, 
        globallyFilteredInvestmentTransferRecords, 
        exportFileName, 
        includeFlags
      );
    } else { 
      if (globallyFilteredTransactions.length > 0) {
        exportToCsv(globallyFilteredTransactions, `${exportFileName}_expenses`, includeFlags);
      } else {
        alert("No expense data to export to CSV. XLSX export can handle other data types.");
      }
    }
  }, [
      globallyFilteredTransactions, 
      globallyFilteredIncomeRecords, 
      globallyFilteredInvestmentTransferRecords, 
      rawExpenseFileName, 
      rawIncomeFileName, 
      rawInvestmentTransferFileName
    ]);
  
 useEffect(() => {
    if (transactions.length > 0 || (transactions.length === 0 && rawExpenseFileName !== null)) {
        const activeTransactionsExist = transactions.some(t => !t.flags.isDeleted);
        if (transactions.length > 0 && !activeTransactionsExist && recommendations.length === 0) {
          // All transactions are soft-deleted, no recommendations exist, no need to regenerate
        } else {
            setIsLoading(true); 
            const newRecommendations = generateRecommendations(transactions, recommendations);
            setRecommendations(newRecommendations);
            setIsLoading(false); 
        }
    } else if (transactions.length === 0 && rawExpenseFileName === null) {
        setRecommendations([]); 
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [transactions, rawExpenseFileName]); // recommendations removed to avoid loop with setRecommendations


  const NavLink: React.FC<{ to: string; children: React.ReactNode; icon: React.ReactNode }> = ({ to, children, icon }) => {
    const isActive = location.pathname === to || 
                     (location.pathname === '/' && to === `/${AppTab.DataView.toLowerCase().replace(/\s+/g, '-')}`) || // Default to DataView path
                     (location.pathname.startsWith(to) && to !== '/'); 
    return (
      <Link
        to={to}
        className={`flex items-center px-4 py-3 text-sm font-medium rounded-md transition-colors duration-150 ease-in-out hover:bg-gray-200 hover:text-gray-900
                    ${isActive ? 'bg-blue-600 text-white shadow-lg' : 'text-gray-700'}`}
      >
        {icon}
        <span className="truncate ml-3">{children}</span>
      </Link>
    );
  };

  const getPageTitle = () => {
    const path = location.pathname;
    if (path.startsWith(`/${AppTab.DataView.toLowerCase().replace(/\s+/g, '-')}`) || path ==='/') return AppTab.DataView;
    if (path.startsWith(`/${AppTab.IncomeView.toLowerCase().replace(/\s+/g, '-')}`)) return AppTab.IncomeView;
    if (path.startsWith(`/${AppTab.InvestmentTransferView.toLowerCase().replace(/\s+/g, '-')}`)) return AppTab.InvestmentTransferView;
    if (path.startsWith(`/${AppTab.Recommendations.toLowerCase().replace(/\s+/g, '-')}`)) return AppTab.Recommendations;
    if (path.startsWith(`/${AppTab.Dashboard.toLowerCase().replace(/\s+/g, '-')}`)) return AppTab.Dashboard;
    if (path.startsWith(`/${AppTab.Settings.toLowerCase().replace(/\s+/g, '-')}`)) return AppTab.Settings; // "Settings" maps to Export view
    return APP_TITLE;
  };


  return (
    <div className="flex h-screen bg-gray-200 font-sans">
      {/* Sidebar */}
      <nav className="w-64 bg-white shadow-xl p-5 space-y-3 flex flex-col">
        <div className="text-3xl font-bold text-blue-600 mb-8 px-2 flex items-center">
         <Cog6ToothIcon className="w-8 h-8 mr-2 animate-spin-slow"/> {APP_TITLE}
        </div>
        <NavLink to={`/${AppTab.DataView.toLowerCase().replace(/\s+/g, '-')}`} icon={<TableCellsIcon className="w-6 h-6" />}>{AppTab.DataView}</NavLink>
        <NavLink to={`/${AppTab.IncomeView.toLowerCase().replace(/\s+/g, '-')}`} icon={<InboxArrowDownIcon className="w-6 h-6" />}>{AppTab.IncomeView}</NavLink>
        <NavLink to={`/${AppTab.InvestmentTransferView.toLowerCase().replace(/\s+/g, '-')}`} icon={<BanknotesIcon className="w-6 h-6" />}>{AppTab.InvestmentTransferView}</NavLink>
        <NavLink to={`/${AppTab.Recommendations.toLowerCase().replace(/\s+/g, '-')}`} icon={<SparklesIcon className="w-6 h-6" />}>{AppTab.Recommendations}</NavLink>
        <NavLink to={`/${AppTab.Dashboard.toLowerCase().replace(/\s+/g, '-')}`} icon={<ChartBarIcon className="w-6 h-6" />}>{AppTab.Dashboard}</NavLink>
        <NavLink to={`/${AppTab.Settings.toLowerCase().replace(/\s+/g, '-')}`} icon={<ArrowDownTrayIcon className="w-6 h-6" />}>{AppTab.Settings}</NavLink> {/* Export mapped to Settings */}
        <div className="mt-auto pt-4 border-t border-gray-200">
            <p className="text-xs text-gray-400 text-center">&copy; {new Date().getFullYear()} {APP_TITLE}.</p>
            <p className="text-xs text-gray-400 text-center">All rights reserved.</p>
        </div>
      </nav>

      {/* Main content */}
      <main className="flex-1 p-8 overflow-y-auto">
        <header className="flex flex-col md:flex-row justify-between items-center mb-8 pb-4 border-b border-gray-300">
            <h1 className="text-3xl font-bold text-gray-800 mb-4 md:mb-0">
                {getPageTitle()}
            </h1>
            <div className="flex items-center space-x-4">
                 {/* Removed Start Fresh button */}
                <FileUpload 
                    onFileUpload={handleCombinedFileUpload} 
                    setIsLoading={setIsLoading}
                    setError={setError}
                />
            </div>
        </header>
        
        {error && <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 mb-6 rounded-md shadow" role="alert"><p className="font-bold">Error Occurred</p><p>{error}</p></div>}
        
        {isLoading && (
            <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50" aria-label="Loading content">
                <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-blue-500"></div>
                <p className="ml-3 text-white text-lg">Processing...</p>
            </div>
        )}

        { (transactions.length > 0 || incomeRecords.length > 0 || investmentTransferRecords.length > 0) && (
             <GlobalFilterBar
                allTransactions={transactions}
                allIncomeRecords={incomeRecords}
                allInvestmentTransferRecords={investmentTransferRecords}
                filters={globalFilters}
                onFilterChange={setGlobalFilters}
            />
        )}

        <div className="bg-white p-6 rounded-lg shadow-lg min-h-[calc(100vh-250px)]"> {/* Ensure content area fills viewport appropriately */}
            <Routes>
            <Route path="/" element={<Navigate replace to={`/${AppTab.DataView.toLowerCase().replace(/\s+/g, '-')}`} />} />
            <Route path={`/${AppTab.DataView.toLowerCase().replace(/\s+/g, '-')}`} element={<DataTableView transactions={globallyFilteredTransactions} rawFileName={rawExpenseFileName} recommendations={recommendations.filter(r => r.transactionIds.every(txId => transactions.find(t => t.id === txId && !t.flags.isDeleted)))} onAddTransaction={addTransaction} onUpdateTransaction={updateTransaction} onDeleteTransaction={deleteTransaction} onApplyRecommendation={applyRecommendation} onIgnoreRecommendation={ignoreRecommendation} />} />
            <Route path={`/${AppTab.IncomeView.toLowerCase().replace(/\s+/g, '-')}`} element={<IncomeDataTableView incomeRecords={globallyFilteredIncomeRecords} rawFileName={rawIncomeFileName} onAddIncomeRecord={addIncomeRecord} onUpdateIncomeRecord={updateIncomeRecord} onDeleteIncomeRecord={deleteIncomeRecord} allIncomeRecords={incomeRecords} />} />
            <Route path={`/${AppTab.InvestmentTransferView.toLowerCase().replace(/\s+/g, '-')}`} element={<InvestmentTransferDataTableView investmentTransferRecords={globallyFilteredInvestmentTransferRecords} rawFileName={rawInvestmentTransferFileName} onAddInvestmentTransferRecord={addInvestmentTransferRecord} onUpdateInvestmentTransferRecord={updateInvestmentTransferRecord} onDeleteInvestmentTransferRecord={deleteInvestmentTransferRecord} allInvestmentTransferRecords={investmentTransferRecords} />} />
            <Route path={`/${AppTab.Recommendations.toLowerCase().replace(/\s+/g, '-')}`} element={<RecommendationsView recommendations={recommendations.filter(r => r.transactionIds.every(txId => transactions.find(t => t.id === txId && !t.flags.isDeleted)))} onApply={applyRecommendation} onIgnore={ignoreRecommendation} onApplyMultiple={applyMultipleRecommendations} onIgnoreMultiple={ignoreMultipleRecommendations} />} />
            <Route path={`/${AppTab.Dashboard.toLowerCase().replace(/\s+/g, '-')}`} element={<DashboardView transactions={globallyFilteredTransactions} incomeRecords={globallyFilteredIncomeRecords} investmentTransferRecords={globallyFilteredInvestmentTransferRecords} />} />
            <Route path={`/${AppTab.Settings.toLowerCase().replace(/\s+/g, '-')}`} element={<ExportControls onExport={handleExport} transactions={globallyFilteredTransactions} incomeRecords={globallyFilteredIncomeRecords} investmentTransferRecords={globallyFilteredInvestmentTransferRecords} globalFilters={globalFilters} />} />
            </Routes>
        </div>
      </main>

      {/* Removed Start Fresh confirmation modal */}
    </div>
  );
};

export default App;
