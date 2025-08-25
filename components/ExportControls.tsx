
import React, { useState, useEffect } from 'react';
import { FilterCriteria, TransactionRecord, IncomeRecord, InvestmentTransferRecord } from '../types';

interface ExportControlsProps {
  onExport: (format: 'xlsx' | 'csv', filters?: FilterCriteria, includeFlags?: Record<string, boolean>) => void;
  transactions: TransactionRecord[]; 
  incomeRecords: IncomeRecord[];
  investmentTransferRecords: InvestmentTransferRecord[];
  globalFilters: FilterCriteria; 
}

const ExportControls: React.FC<ExportControlsProps> = ({ 
    onExport, 
    transactions, 
    incomeRecords, 
    investmentTransferRecords, 
    globalFilters 
}) => {
  const [format, setFormat] = useState<'xlsx' | 'csv'>('xlsx');
  
  const [includeFlags, setIncludeFlags] = useState({
    isDuplicate: false,
    suggestedCategory: false,
    normalizedMerchant: false,
    originalValues: false,
  });

  const handleFlagChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, checked } = e.target;
    setIncludeFlags(prev => ({ ...prev, [name]: checked }));
  };

  const handleExportClick = () => {
    onExport(format, undefined, includeFlags);
  };
  
  const getActiveGlobalFilterCount = () => {
    let count = 0;
    if (globalFilters.dateRange?.start || globalFilters.dateRange?.end) count++;
    if (globalFilters.category) count++;
    if (globalFilters.subCategory) count++;
    if (globalFilters.transactionType) count++;
    return count;
  }
  
  const hasDataToExport = transactions.length > 0 || incomeRecords.length > 0 || investmentTransferRecords.length > 0;


  return (
    <div className="space-y-6 p-6 bg-white rounded-lg shadow">
      <h2 className="text-2xl font-semibold text-gray-800">Export Data</h2>

      {getActiveGlobalFilterCount() > 0 && (
        <div className="p-3 bg-blue-50 border border-blue-200 rounded-md text-sm text-blue-700">
          <p className="font-medium">Note: {getActiveGlobalFilterCount()} global filter(s) are currently applied to the data being exported.</p>
          <p className="text-xs">You can change these using the Global Filter bar.</p>
        </div>
      )}

      {!hasDataToExport && (
         <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-md text-sm text-yellow-700">
          <p className="font-medium">No data currently available for export.</p>
          <p className="text-xs">Please upload a file or adjust filters.</p>
        </div>
      )}


      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Export Format</label>
          <select
            value={format}
            onChange={e => setFormat(e.target.value as 'xlsx' | 'csv')}
            className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
            disabled={!hasDataToExport}
          >
            <option value="xlsx">Excel (.xlsx)</option>
            <option value="csv">CSV (.csv) - Expenses Only</option>
          </select>
           {format === 'csv' && <p className="text-xs text-gray-500 mt-1">Note: CSV export currently only supports expense data.</p>}
        </div>

        <div className={`space-y-3 p-4 border border-gray-200 rounded-md ${!hasDataToExport ? 'opacity-50' : ''}`}>
            <h3 className="text-lg font-medium text-gray-700">Include Additional Expense Information</h3>
            {[
                { key: 'isDuplicate', label: 'Is Duplicate Candidate?' },
                { key: 'suggestedCategory', label: 'Was Category Suggested?' },
                { key: 'normalizedMerchant', label: 'Was Merchant Normalized?' },
                { key: 'originalValues', label: 'Include Original Values (if changed)?' },
            ].map(flagInfo => (
                <label key={flagInfo.key} className="flex items-center space-x-2">
                    <input
                        type="checkbox"
                        name={flagInfo.key}
                        checked={includeFlags[flagInfo.key as keyof typeof includeFlags]}
                        onChange={handleFlagChange}
                        className="form-checkbox h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                        disabled={!hasDataToExport}
                    />
                    <span className="text-sm text-gray-700">{flagInfo.label}</span>
                </label>
            ))}
        </div>
      </div>

      <div className="mt-8 text-right">
        <button
          onClick={handleExportClick}
          className="bg-green-500 hover:bg-green-600 text-white font-semibold py-2 px-6 rounded-lg shadow-md transition duration-150 ease-in-out disabled:opacity-50 disabled:cursor-not-allowed"
          disabled={!hasDataToExport}
        >
          Export Data
        </button>
      </div>
       <p className="mt-4 text-xs text-gray-500">
        Note: Export reflects currently applied global filters. Transactions marked for deletion (via duplicate recommendations) are excluded.
      </p>
    </div>
  );
};

export default ExportControls;
