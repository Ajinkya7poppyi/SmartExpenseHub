
import React, { useMemo } from 'react';
import { FilterCriteria, TransactionRecord, IncomeRecord, InvestmentTransferRecord } from '../types';
import { FunnelIcon, XMarkIcon as ClearIcon } from './common/Icons';

interface GlobalFilterBarProps {
  allTransactions: TransactionRecord[];
  allIncomeRecords: IncomeRecord[]; 
  allInvestmentTransferRecords: InvestmentTransferRecord[]; // Added for date consistency
  filters: FilterCriteria;
  onFilterChange: (filters: FilterCriteria) => void;
}

const GlobalFilterBar: React.FC<GlobalFilterBarProps> = ({ 
    allTransactions, 
    allIncomeRecords, 
    allInvestmentTransferRecords,
    filters, 
    onFilterChange 
}) => {
  const uniqueValues = useMemo(() => {
    const categories = new Set<string>();
    const subCategories = new Set<string>();
    const transactionTypes = new Set<string>();
    
    // For expense-specific filters
    allTransactions.forEach(t => {
      if (t.expenseType && !t.flags.isDeleted) categories.add(t.expenseType);
      if (t.expenseSubtype && !t.flags.isDeleted) subCategories.add(t.expenseSubtype);
      if (t.transactionType && !t.flags.isDeleted) transactionTypes.add(t.transactionType);
    });

    // Date range options could be derived from all three data types for min/max if needed.
    // For now, the inputs are free-form.
    // const allDates = [
    //   ...allTransactions.map(t => t.dateOfPayment),
    //   ...allIncomeRecords.map(i => i.dateOfReceipt),
    //   ...allInvestmentTransferRecords.map(it => it.dateOfTransfer)
    // ].filter(Boolean).sort();
    // const minDate = allDates[0];
    // const maxDate = allDates[allDates.length -1];

    return {
      categories: Array.from(categories).sort(),
      subCategories: Array.from(subCategories).sort(),
      transactionTypes: Array.from(transactionTypes).sort(),
    };
  }, [allTransactions, allIncomeRecords, allInvestmentTransferRecords]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    let newFilters = { ...filters };

    if (name.startsWith('dateRange.')) {
      const field = name.split('.')[1] as 'start' | 'end';
      newFilters.dateRange = { ...newFilters.dateRange, [field]: value || undefined };
      if (!newFilters.dateRange.start && !newFilters.dateRange.end) {
        delete newFilters.dateRange;
      }
    } else {
      if (value === "all" || value === "") {
        delete (newFilters as any)[name];
      } else {
        (newFilters as any)[name] = value;
      }
    }
    onFilterChange(newFilters);
  };
  
  const clearFilters = () => {
    onFilterChange({});
  };

  const hasActiveFilters = Object.keys(filters).length > 0 && 
                         (filters.dateRange?.start || filters.dateRange?.end || filters.category || filters.subCategory || filters.transactionType);


  return (
    <div className="p-4 bg-gray-100 rounded-lg shadow-md my-4 space-y-4 md:space-y-0 md:flex md:flex-wrap md:items-end md:gap-4">
      <div className="flex items-center text-lg font-semibold text-gray-700 mb-2 md:mb-0 md:mr-4">
        <FunnelIcon className="w-5 h-5 mr-2 text-blue-600"/>
        Global Filters
      </div>
      
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 flex-grow">
        <div>
          <label htmlFor="globalStartDate" className="block text-xs font-medium text-gray-600">Start Date</label>
          <input
            type="date"
            id="globalStartDate"
            name="dateRange.start"
            value={filters.dateRange?.start || ''}
            onChange={handleInputChange}
            className="mt-1 block w-full form-input py-1.5 px-2 text-sm rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
          />
        </div>
        <div>
          <label htmlFor="globalEndDate" className="block text-xs font-medium text-gray-600">End Date</label>
          <input
            type="date"
            id="globalEndDate"
            name="dateRange.end"
            value={filters.dateRange?.end || ''}
            onChange={handleInputChange}
            className="mt-1 block w-full form-input py-1.5 px-2 text-sm rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
          />
        </div>
        <div>
          <label htmlFor="globalCategory" className="block text-xs font-medium text-gray-600">Expense Category</label>
          <select
            id="globalCategory"
            name="category"
            value={filters.category || 'all'}
            onChange={handleInputChange}
            className="mt-1 block w-full form-select py-1.5 pl-2 pr-8 text-sm rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
          >
            <option value="all">All Categories</option>
            {uniqueValues.categories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
          </select>
        </div>
        <div>
          <label htmlFor="globalSubCategory" className="block text-xs font-medium text-gray-600">Expense Subcategory</label>
          <select
            id="globalSubCategory"
            name="subCategory"
            value={filters.subCategory || 'all'}
            onChange={handleInputChange}
            disabled={!filters.category} 
            className="mt-1 block w-full form-select py-1.5 pl-2 pr-8 text-sm rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 disabled:bg-gray-200"
          >
            <option value="all">All Subcategories</option>
            {uniqueValues.subCategories
              .filter(sub => !filters.category || allTransactions.some(t => t.expenseType === filters.category && t.expenseSubtype === sub))
              .map(sub => <option key={sub} value={sub}>{sub}</option>)}
          </select>
        </div>
        <div>
          <label htmlFor="globalTransactionType" className="block text-xs font-medium text-gray-600">Expense Transaction Type</label>
          <select
            id="globalTransactionType"
            name="transactionType"
            value={filters.transactionType || 'all'}
            onChange={handleInputChange}
            className="mt-1 block w-full form-select py-1.5 pl-2 pr-8 text-sm rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
          >
            <option value="all">All Types</option>
            {uniqueValues.transactionTypes.map(type => <option key={type} value={type}>{type}</option>)}
          </select>
        </div>
      </div>
      {hasActiveFilters && (
         <button
            onClick={clearFilters}
            className="ml-auto mt-2 md:mt-0 px-3 py-1.5 text-xs font-medium text-red-700 bg-red-100 hover:bg-red-200 rounded-md transition duration-150 ease-in-out flex items-center self-end"
            title="Clear all filters"
        >
            <ClearIcon className="w-4 h-4 mr-1" /> Clear Filters
        </button>
      )}
    </div>
  );
};

export default GlobalFilterBar;
