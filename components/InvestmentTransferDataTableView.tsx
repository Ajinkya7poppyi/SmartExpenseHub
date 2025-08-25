
import React, { useState, useMemo, useEffect } from 'react';
import { InvestmentTransferRecord } from '../types';
import InvestmentTransferFormModal from './InvestmentTransferFormModal';
import Modal from './common/Modal'; 
import { PencilIcon, TrashIcon, PlusIcon, ChevronUpDownIcon, ChevronUpIcon, ChevronDownIcon, PlusCircleIcon, ExclamationTriangleIcon, HashtagIcon, CurrencyDollarIcon, BuildingStorefrontIcon, CalendarDaysIcon, BanknotesIcon as PageIcon } from './common/Icons';

interface InvestmentTransferDataTableViewProps {
  investmentTransferRecords: InvestmentTransferRecord[];
  rawFileName: string | null;
  onAddInvestmentTransferRecord: (record: Omit<InvestmentTransferRecord, 'id' | 'flags' | 'originalValues'>) => void;
  onUpdateInvestmentTransferRecord: (record: InvestmentTransferRecord) => void;
  onDeleteInvestmentTransferRecord: (recordId: string) => void;
  allInvestmentTransferRecords: InvestmentTransferRecord[];
}

type SortableKeys = keyof Pick<InvestmentTransferRecord, 'dateOfTransfer' | 'transferToPlatform' | 'transferFromAccount' | 'amountTransferred' | 'currency' | 'transferType'>;

const ITEMS_PER_PAGE = 50;

const InvestmentTransferDataTableView: React.FC<InvestmentTransferDataTableViewProps> = ({ 
  investmentTransferRecords, 
  rawFileName,
  onAddInvestmentTransferRecord, 
  onUpdateInvestmentTransferRecord, 
  onDeleteInvestmentTransferRecord,
  allInvestmentTransferRecords
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState<InvestmentTransferRecord | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortConfig, setSortConfig] = useState<{ key: SortableKeys; direction: 'ascending' | 'descending' } | null>(null);
  const [showDeleteConfirmModal, setShowDeleteConfirmModal] = useState(false);
  const [recordToDeleteId, setRecordToDeleteId] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);

  const filteredAndSortedRecords = useMemo(() => {
    let sortedRecords = [...investmentTransferRecords]; 
    if (sortConfig !== null) {
      sortedRecords.sort((a, b) => {
        const valA = a[sortConfig.key] ?? '';
        const valB = b[sortConfig.key] ?? '';
        
        if (typeof valA === 'number' && typeof valB === 'number') {
             return sortConfig.direction === 'ascending' ? valA - valB : valB - valA;
        }
        if (String(valA).toLowerCase() < String(valB).toLowerCase()) {
          return sortConfig.direction === 'ascending' ? -1 : 1;
        }
        if (String(valA).toLowerCase() > String(valB).toLowerCase()) {
          return sortConfig.direction === 'ascending' ? 1 : -1;
        }
        return 0;
      });
    }
    if (!searchTerm) return sortedRecords;
    return sortedRecords.filter(record =>
      Object.values(record).some(value =>
        String(value).toLowerCase().includes(searchTerm.toLowerCase())
      )
    );
  }, [investmentTransferRecords, searchTerm, sortConfig]);

  const summaryStats = useMemo(() => {
    const totalCount = filteredAndSortedRecords.length;
    const totalAmountByCurrency: Record<string, number> = {};
    filteredAndSortedRecords.forEach(r => {
        totalAmountByCurrency[r.currency] = (totalAmountByCurrency[r.currency] || 0) + r.amountTransferred;
    });
    const uniqueToPlatforms = new Set(filteredAndSortedRecords.map(r => r.transferToPlatform.trim()).filter(Boolean)).size;
    
    let minDate = '';
    let maxDate = '';
    if (totalCount > 0) {
        const dates = filteredAndSortedRecords.map(r => r.dateOfTransfer).sort();
        minDate = dates[0];
        maxDate = dates[dates.length - 1];
    }
    return {
        totalCount,
        totalAmountByCurrency,
        uniqueToPlatforms,
        dateRange: totalCount > 0 ? `${minDate} to ${maxDate}` : 'N/A',
    };
  }, [filteredAndSortedRecords]);

  const paginatedRecords = useMemo(() => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredAndSortedRecords.slice(startIndex, startIndex + ITEMS_PER_PAGE);
  }, [filteredAndSortedRecords, currentPage]);

  const totalPages = Math.ceil(filteredAndSortedRecords.length / ITEMS_PER_PAGE);

  useEffect(() => {
    if (currentPage > totalPages && totalPages > 0) {
        setCurrentPage(1);
    } else if (totalPages === 0 && currentPage !== 1) {
        setCurrentPage(1);
    }
  }, [currentPage, totalPages]);

  const handleAddClick = () => {
    setEditingRecord(null);
    setIsModalOpen(true);
  };

  const handleEditClick = (record: InvestmentTransferRecord) => {
    setEditingRecord(record);
    setIsModalOpen(true);
  };

  const handleDeleteClick = (recordId: string) => {
    setRecordToDeleteId(recordId);
    setShowDeleteConfirmModal(true);
  };

  const confirmDelete = () => {
    if (recordToDeleteId) {
      onDeleteInvestmentTransferRecord(recordToDeleteId);
    }
    setShowDeleteConfirmModal(false);
    setRecordToDeleteId(null);
  };

  const cancelDelete = () => {
    setShowDeleteConfirmModal(false);
    setRecordToDeleteId(null);
  };

  const handleSaveRecord = (recordData: InvestmentTransferRecord | Omit<InvestmentTransferRecord, 'id' | 'flags' | 'originalValues'>) => {
    if ('id' in recordData) {
      onUpdateInvestmentTransferRecord(recordData as InvestmentTransferRecord);
    } else {
      onAddInvestmentTransferRecord(recordData);
    }
    setIsModalOpen(false);
    setEditingRecord(null);
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
  
  const StatCard: React.FC<{title: string, value: string | number | React.ReactNode, icon: React.ReactNode, cardColor?: string}> = ({ title, value, icon, cardColor = 'bg-indigo-100'}) => (
    <div className="bg-white p-3 rounded-lg shadow flex items-center space-x-3">
        <div className={`p-2 ${cardColor} rounded-full`}>
            {icon}
        </div>
        <div>
            <p className="text-xs text-gray-500">{title}</p>
            {typeof value === 'string' || typeof value === 'number' ? (
                <p className="text-lg font-bold text-gray-800">
                    {typeof value === 'number' && title.toLowerCase().includes('amount') ? `$${value.toFixed(2)}` : value}
                </p>
            ) : (
                 <div className="text-lg font-bold text-gray-800">{value}</div>
            )}
        </div>
    </div>
  );

  let mainContent;

  if (investmentTransferRecords.length === 0) { 
    if (rawFileName) { 
      mainContent = (
        <div className="text-center py-10">
          <PageIcon className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-700 mb-2">No Investment/Transfer Data Found</h2>
          <p className="text-gray-500">The sheet "InvestmentsTransfers" in <span className="font-medium">{rawFileName}</span> appears empty or lacks data.</p>
          <p className="text-gray-500 mt-2 mb-4">Upload another file or add records manually.</p>
          <button
            onClick={handleAddClick}
            className="bg-green-500 hover:bg-green-600 text-white font-semibold py-2 px-4 rounded-lg shadow-md transition duration-150 ease-in-out inline-flex items-center"
            aria-label="Add investment/transfer record manually"
          >
            <PlusIcon className="w-5 h-5 mr-2" />
            Add Record Manually
          </button>
        </div>
      );
    } else { 
      mainContent = (
        <div className="text-center py-10">
          <PlusCircleIcon className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-700 mb-2">Investment & Transfers View</h2>
          <p className="text-gray-500 mb-4">Upload an Excel file with an "InvestmentsTransfers" sheet or add a record manually.</p>
          <button
            onClick={handleAddClick}
            className="bg-green-500 hover:bg-green-600 text-white font-semibold py-2 px-4 rounded-lg shadow-md transition duration-150 ease-in-out inline-flex items-center"
            aria-label="Add new investment/transfer record"
          >
            <PlusIcon className="w-5 h-5 mr-2" />
            Add Record
          </button>
        </div>
      );
    }
  } else {
    mainContent = (
      <>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <StatCard title="Total Records" value={summaryStats.totalCount} icon={<HashtagIcon className="w-5 h-5 text-blue-500"/>} cardColor="bg-blue-100" />
            <StatCard 
                title="Total Amount Transferred" 
                value={
                    Object.entries(summaryStats.totalAmountByCurrency).map(([curr, amt]) => (
                        <span key={curr} className="mr-2">{new Intl.NumberFormat('en-US', { style: 'currency', currency: curr }).format(amt)}</span>
                    ))
                } 
                icon={<CurrencyDollarIcon className="w-5 h-5 text-green-500"/>} 
                cardColor="bg-green-100"
            />
            <StatCard title="Unique Destinations/Platforms" value={summaryStats.uniqueToPlatforms} icon={<BuildingStorefrontIcon className="w-5 h-5 text-purple-500"/>} cardColor="bg-purple-100" />
            <StatCard title="Date Range" value={summaryStats.dateRange} icon={<CalendarDaysIcon className="w-5 h-5 text-orange-500"/>} cardColor="bg-orange-100" />
        </div>

        <div className="mb-4 flex justify-between items-center">
          <input
            type="text"
            placeholder="Search records..."
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500 w-full md:w-1/3 shadow-sm"
            value={searchTerm}
            onChange={e => { setSearchTerm(e.target.value); setCurrentPage(1);}}
            aria-label="Search investment and transfer records"
          />
          <button
            onClick={handleAddClick}
            className="bg-blue-500 hover:bg-blue-600 text-white font-semibold py-2 px-4 rounded-lg shadow-md transition duration-150 ease-in-out inline-flex items-center"
            aria-label="Add new investment/transfer record"
          >
            <PlusIcon className="w-5 h-5 mr-2" />
            Add Record
          </button>
        </div>
        <div className="overflow-x-auto shadow border border-gray-200 sm:rounded-lg">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <SortableHeader label="Date" sortKey="dateOfTransfer" />
                <SortableHeader label="To/Platform" sortKey="transferToPlatform" />
                <SortableHeader label="From Account" sortKey="transferFromAccount" />
                <SortableHeader label="Amount" sortKey="amountTransferred" />
                <SortableHeader label="Currency" sortKey="currency" />
                <SortableHeader label="Type" sortKey="transferType" />
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Purpose/Name</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Description</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {paginatedRecords.map(record => (
                  <tr key={record.id} className={`hover:bg-gray-50 transition-colors duration-150 ${record.flags.isDeleted ? 'opacity-50 line-through' : ''}`}>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-700">{record.dateOfTransfer}</td>
                    <td className="px-4 py-3 text-sm text-gray-700 truncate max-w-xs hover:whitespace-normal" title={record.transferToPlatform}>{record.transferToPlatform}</td>
                    <td className="px-4 py-3 text-sm text-gray-700 truncate max-w-xs hover:whitespace-normal" title={record.transferFromAccount}>{record.transferFromAccount}</td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-700 text-right">{record.amountTransferred.toFixed(2)}</td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-700">{record.currency}</td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-700">{record.transferType}</td>
                    <td className="px-4 py-3 text-sm text-gray-700 truncate max-w-xs hover:whitespace-normal" title={record.purposeInvestmentName}>{record.purposeInvestmentName}</td>
                    <td className="px-4 py-3 text-sm text-gray-700 truncate max-w-xs hover:whitespace-normal" title={record.description}>{record.description}</td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm font-medium space-x-2">
                      <button onClick={() => handleEditClick(record)} className="text-blue-600 hover:text-blue-800 transition duration-150" title="Edit record" aria-label={`Edit record for ${record.transferToPlatform} on ${record.dateOfTransfer}`}>
                        <PencilIcon className="w-5 h-5" />
                      </button>
                      <button onClick={() => handleDeleteClick(record.id)} className="text-red-600 hover:text-red-800 transition duration-150" title="Delete record" aria-label={`Delete record for ${record.transferToPlatform} on ${record.dateOfTransfer}`}>
                        <TrashIcon className="w-5 h-5" />
                      </button>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
        
        {filteredAndSortedRecords.length > ITEMS_PER_PAGE && (
          <div className="mt-6 flex justify-between items-center">
            <button
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Previous
            </button>
            <span className="text-sm text-gray-700">
              Page {currentPage} of {totalPages} (Total: {filteredAndSortedRecords.length} records)
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
        
        {filteredAndSortedRecords.length === 0 && searchTerm && (
          <p className="text-center text-gray-500 py-4">No records match your search term "{searchTerm}".</p>
        )}
      </>
    );
  }

  return (
    <div className="space-y-4">
      {mainContent}

      {isModalOpen && (
        <InvestmentTransferFormModal
          isOpen={isModalOpen}
          onClose={() => {
            setIsModalOpen(false);
            setEditingRecord(null);
          }}
          onSave={handleSaveRecord}
          existingRecord={editingRecord}
          allRecords={allInvestmentTransferRecords} 
        />
      )}

      {showDeleteConfirmModal && (
        <Modal
          isOpen={showDeleteConfirmModal}
          onClose={cancelDelete}
          title="Confirm Deletion"
          size="sm"
        >
          <div className="text-center">
            <ExclamationTriangleIcon className="w-12 h-12 text-red-500 mx-auto mb-4" />
            <p className="text-sm text-gray-600 mb-4">
              Are you sure you want to delete this record? This action cannot be undone.
            </p>
            <div className="flex justify-center space-x-3">
              <button
                onClick={cancelDelete}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                Cancel
              </button>
              <button
                onClick={confirmDelete}
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

export default InvestmentTransferDataTableView;
