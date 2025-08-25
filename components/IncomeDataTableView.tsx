
import React, { useState, useMemo, useEffect } from 'react';
import { IncomeRecord } from '../types';
import IncomeFormModal from './IncomeFormModal';
import Modal from './common/Modal'; 
import { PencilIcon, TrashIcon, PlusIcon, ChevronUpDownIcon, ChevronUpIcon, ChevronDownIcon, PlusCircleIcon, ExclamationTriangleIcon, HashtagIcon, CurrencyDollarIcon, BuildingStorefrontIcon, CalendarRangeIcon, InboxArrowDownIcon } from './common/Icons';

interface IncomeDataTableViewProps {
  incomeRecords: IncomeRecord[];
  rawFileName: string | null;
  onAddIncomeRecord: (income: Omit<IncomeRecord, 'id' | 'flags' | 'originalValues'>) => void;
  onUpdateIncomeRecord: (income: IncomeRecord) => void;
  onDeleteIncomeRecord: (incomeId: string) => void;
  allIncomeRecords: IncomeRecord[]; // Pass all for form suggestions
}

type SortableKeys = keyof Pick<IncomeRecord, 'dateOfReceipt' | 'receivedFrom' | 'amountReceived' | 'incomeType'>;

const ITEMS_PER_PAGE = 50;

const IncomeDataTableView: React.FC<IncomeDataTableViewProps> = ({ 
  incomeRecords, 
  rawFileName,
  onAddIncomeRecord, 
  onUpdateIncomeRecord, 
  onDeleteIncomeRecord,
  allIncomeRecords
}) => {
  const [isIncomeModalOpen, setIsIncomeModalOpen] = useState(false);
  const [editingIncomeRecord, setEditingIncomeRecord] = useState<IncomeRecord | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortConfig, setSortConfig] = useState<{ key: SortableKeys; direction: 'ascending' | 'descending' } | null>(null);
  const [showDeleteConfirmModal, setShowDeleteConfirmModal] = useState(false);
  const [incomeToDeleteId, setIncomeToDeleteId] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);

  const filteredAndSortedIncome = useMemo(() => {
    let sortedIncome = [...incomeRecords]; 
    if (sortConfig !== null) {
      sortedIncome.sort((a, b) => {
        const valA = a[sortConfig.key] ?? '';
        const valB = b[sortConfig.key] ?? '';
        
        if (typeof valA === 'number' && typeof valB === 'number') {
             return sortConfig.direction === 'ascending' ? valA - valB : valB - valA;
        }
        if (valA < valB) {
          return sortConfig.direction === 'ascending' ? -1 : 1;
        }
        if (valA > valB) {
          return sortConfig.direction === 'ascending' ? 1 : -1;
        }
        return 0;
      });
    }
    if (!searchTerm) return sortedIncome;
    return sortedIncome.filter(income =>
      Object.values(income).some(value =>
        String(value).toLowerCase().includes(searchTerm.toLowerCase())
      )
    );
  }, [incomeRecords, searchTerm, sortConfig]);

  const summaryStats = useMemo(() => {
    const totalCount = filteredAndSortedIncome.length;
    const totalAmount = filteredAndSortedIncome.reduce((sum, i) => sum + i.amountReceived, 0);
    const uniqueSources = new Set(filteredAndSortedIncome.map(i => i.receivedFrom.trim()).filter(Boolean)).size;
    
    let minDate = '';
    let maxDate = '';
    if (totalCount > 0) {
        const dates = filteredAndSortedIncome.map(i => i.dateOfReceipt).sort();
        minDate = dates[0];
        maxDate = dates[dates.length - 1];
    }
    return {
        totalCount,
        totalAmount,
        uniqueSources,
        dateRange: totalCount > 0 ? `${minDate} to ${maxDate}` : 'N/A',
    };
  }, [filteredAndSortedIncome]);

  const paginatedIncome = useMemo(() => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredAndSortedIncome.slice(startIndex, startIndex + ITEMS_PER_PAGE);
  }, [filteredAndSortedIncome, currentPage]);

  const totalPages = Math.ceil(filteredAndSortedIncome.length / ITEMS_PER_PAGE);

  useEffect(() => {
    if (currentPage > totalPages && totalPages > 0) {
        setCurrentPage(1);
    } else if (totalPages === 0 && currentPage !== 1) {
        setCurrentPage(1);
    }
  }, [currentPage, totalPages]);

  const handleAddClick = () => {
    setEditingIncomeRecord(null);
    setIsIncomeModalOpen(true);
  };

  const handleEditClick = (income: IncomeRecord) => {
    setEditingIncomeRecord(income);
    setIsIncomeModalOpen(true);
  };

  const handleDeleteClick = (incomeId: string) => {
    setIncomeToDeleteId(incomeId);
    setShowDeleteConfirmModal(true);
  };

  const confirmDeleteIncome = () => {
    if (incomeToDeleteId) {
      onDeleteIncomeRecord(incomeToDeleteId);
    }
    setShowDeleteConfirmModal(false);
    setIncomeToDeleteId(null);
  };

  const cancelDeleteIncome = () => {
    setShowDeleteConfirmModal(false);
    setIncomeToDeleteId(null);
  };

  const handleSaveIncome = (incomeData: IncomeRecord | Omit<IncomeRecord, 'id' | 'flags' | 'originalValues'>) => {
    if ('id' in incomeData) {
      onUpdateIncomeRecord(incomeData as IncomeRecord);
    } else {
      onAddIncomeRecord(incomeData);
    }
    setIsIncomeModalOpen(false);
    setEditingIncomeRecord(null);
  };
  
  const requestSort = (key: SortableKeys) => {
    let direction: 'ascending' | 'descending' = 'ascending';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'ascending') {
      direction = 'descending';
    }
    setSortConfig({ key, direction });
    setCurrentPage(1);
  };

  const SortableHeader: React.FC<{ label: string; sortKey: SortableKeys }> = ({ label, sortKey }) => {
    const isSorted = sortConfig?.key === sortKey;
    const Icon = isSorted ? (sortConfig?.direction === 'ascending' ? ChevronUpIcon : ChevronDownIcon) : ChevronUpDownIcon;
    return (
      <th 
        className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors duration-150"
        onClick={() => requestSort(sortKey)}
      >
        <div className="flex items-center">
          {label}
          <Icon className="w-4 h-4 ml-1.5 text-gray-400" />
        </div>
      </th>
    );
  };
  
  const StatCard: React.FC<{title: string, value: string | number, icon: React.ReactNode}> = ({ title, value, icon}) => (
    <div className="bg-white p-3 rounded-lg shadow flex items-center space-x-3">
        <div className="p-2 bg-green-100 rounded-full">
            {icon}
        </div>
        <div>
            <p className="text-xs text-gray-500">{title}</p>
            <p className="text-lg font-bold text-gray-800">
                {typeof value === 'number' && title.toLowerCase().includes('amount') ? `$${value.toFixed(2)}` : value}
            </p>
        </div>
    </div>
  );

  let mainContent;

  if (incomeRecords.length === 0) { 
    if (rawFileName) { 
      mainContent = (
        <div className="text-center py-10">
          <InboxArrowDownIcon className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-700 mb-2">No Income Data Found in File</h2>
          <p className="text-gray-500">The uploaded income file <span className="font-medium">{rawFileName}</span> appears to be empty or does not contain recognizable income data.</p>
          <p className="text-gray-500 mt-2 mb-4">Please try uploading another file or add income records manually below.</p>
          <button
            onClick={handleAddClick}
            className="bg-green-500 hover:bg-green-600 text-white font-semibold py-2 px-4 rounded-lg shadow-md transition duration-150 ease-in-out inline-flex items-center"
            aria-label="Add income record manually after empty file upload"
          >
            <PlusIcon className="w-5 h-5 mr-2" />
            Add Income Record Manually
          </button>
        </div>
      );
    } else { 
      mainContent = (
        <div className="text-center py-10">
          <PlusCircleIcon className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-700 mb-2">Welcome to the Income View</h2>
          <p className="text-gray-500 mb-4">Get started by uploading an Income Excel file or adding an income record manually.</p>
          <button
            onClick={handleAddClick}
            className="bg-green-500 hover:bg-green-600 text-white font-semibold py-2 px-4 rounded-lg shadow-md transition duration-150 ease-in-out inline-flex items-center"
            aria-label="Add new income record"
          >
            <PlusIcon className="w-5 h-5 mr-2" />
            Add Income Record
          </button>
        </div>
      );
    }
  } else {
    mainContent = (
      <>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <StatCard title="Total Income Records" value={summaryStats.totalCount} icon={<HashtagIcon className="w-5 h-5 text-blue-500"/>} />
            <StatCard title="Total Amount Received" value={summaryStats.totalAmount} icon={<CurrencyDollarIcon className="w-5 h-5 text-green-500"/>} />
            <StatCard title="Unique Sources" value={summaryStats.uniqueSources} icon={<BuildingStorefrontIcon className="w-5 h-5 text-purple-500"/>} />
            <StatCard title="Date Range" value={summaryStats.dateRange} icon={<CalendarRangeIcon className="w-5 h-5 text-orange-500"/>} />
        </div>

        <div className="mb-4 flex justify-between items-center">
          <input
            type="text"
            placeholder="Search income records..."
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500 w-full md:w-1/3 shadow-sm"
            value={searchTerm}
            onChange={e => { setSearchTerm(e.target.value); setCurrentPage(1);}}
            aria-label="Search income records"
          />
          <button
            onClick={handleAddClick}
            className="bg-blue-500 hover:bg-blue-600 text-white font-semibold py-2 px-4 rounded-lg shadow-md transition duration-150 ease-in-out inline-flex items-center"
            aria-label="Add new income record"
          >
            <PlusIcon className="w-5 h-5 mr-2" />
            Add Income Record
          </button>
        </div>
        <div className="overflow-x-auto shadow border border-gray-200 sm:rounded-lg">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <SortableHeader label="Date of Receipt" sortKey="dateOfReceipt" />
                <SortableHeader label="Received From" sortKey="receivedFrom" />
                <SortableHeader label="Amount Received ($)" sortKey="amountReceived" />
                <SortableHeader label="Income Type" sortKey="incomeType" />
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Subtype</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Description</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {paginatedIncome.map(income => (
                  <tr key={income.id} className={`hover:bg-gray-50 transition-colors duration-150 ${income.flags.isDeleted ? 'opacity-50 line-through' : ''}`}>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-700">{income.dateOfReceipt}</td>
                    <td className="px-4 py-3 text-sm text-gray-700 truncate max-w-xs hover:whitespace-normal" title={income.receivedFrom}>{income.receivedFrom}</td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-700 text-right">{income.amountReceived.toFixed(2)}</td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-700">{income.incomeType}</td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-700">{income.incomeSubtype}</td>
                    <td className="px-4 py-3 text-sm text-gray-700 truncate max-w-xs hover:whitespace-normal" title={income.description}>{income.description}</td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm font-medium space-x-2">
                      <button onClick={() => handleEditClick(income)} className="text-blue-600 hover:text-blue-800 transition duration-150" title="Edit income record" aria-label={`Edit income from ${income.receivedFrom} on ${income.dateOfReceipt}`}>
                        <PencilIcon className="w-5 h-5" />
                      </button>
                      <button onClick={() => handleDeleteClick(income.id)} className="text-red-600 hover:text-red-800 transition duration-150" title="Delete income record" aria-label={`Delete income from ${income.receivedFrom} on ${income.dateOfReceipt}`}>
                        <TrashIcon className="w-5 h-5" />
                      </button>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
        
        {filteredAndSortedIncome.length > ITEMS_PER_PAGE && (
          <div className="mt-6 flex justify-between items-center">
            <button
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Previous
            </button>
            <span className="text-sm text-gray-700">
              Page {currentPage} of {totalPages} (Total: {filteredAndSortedIncome.length} income records)
            </span>
            <button
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages || totalPages === 0}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Next
            </button>
          </div>
        )}
        
        {filteredAndSortedIncome.length === 0 && searchTerm && (
          <p className="text-center text-gray-500 py-4">No income records match your search term "{searchTerm}".</p>
        )}
      </>
    );
  }

  return (
    <div className="space-y-4">
      {mainContent}

      {isIncomeModalOpen && (
        <IncomeFormModal
          isOpen={isIncomeModalOpen}
          onClose={() => {
            setIsIncomeModalOpen(false);
            setEditingIncomeRecord(null);
          }}
          onSave={handleSaveIncome}
          existingIncomeRecord={editingIncomeRecord}
          allIncomeRecords={allIncomeRecords} 
        />
      )}

      {showDeleteConfirmModal && (
        <Modal
          isOpen={showDeleteConfirmModal}
          onClose={cancelDeleteIncome}
          title="Confirm Deletion"
          size="sm"
        >
          <div className="text-center">
            <ExclamationTriangleIcon className="w-12 h-12 text-red-500 mx-auto mb-4" />
            <p className="text-sm text-gray-600 mb-4">
              Are you sure you want to delete this income record? This action cannot be undone.
            </p>
            <div className="flex justify-center space-x-3">
              <button
                onClick={cancelDeleteIncome}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                Cancel
              </button>
              <button
                onClick={confirmDeleteIncome}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 border border-transparent rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
              >
                Delete
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};

export default IncomeDataTableView;
