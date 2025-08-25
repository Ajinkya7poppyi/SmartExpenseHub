import React, { useState, useMemo, useEffect } from 'react';
import { TransactionRecord, Recommendation, RecommendationType } from '../types';
import TransactionFormModal from './TransactionFormModal';
import Modal from './common/Modal'; // For displaying recommendations for a single transaction
import { PencilIcon, TrashIcon, PlusIcon, ChevronUpDownIcon, ChevronUpIcon, ChevronDownIcon, LightBulbIcon, SparklesIcon, CheckCircleIcon, XCircleIcon, InformationCircleIcon, PlusCircleIcon, TableCellsIcon, ExclamationTriangleIcon, HashtagIcon, CurrencyDollarIcon, BuildingStorefrontIcon, CalendarRangeIcon } from './common/Icons';

interface DataTableViewProps {
  transactions: TransactionRecord[];
  rawFileName: string | null;
  recommendations: Recommendation[];
  onAddTransaction: (transaction: Omit<TransactionRecord, 'id' | 'flags' | 'originalValues'>) => void;
  onUpdateTransaction: (transaction: TransactionRecord) => void;
  onDeleteTransaction: (transactionId: string) => void;
  onApplyRecommendation: (recommendationId: string) => void;
  onIgnoreRecommendation: (recommendationId: string) => void;
}

type SortableKeys = keyof Pick<TransactionRecord, 'dateOfPayment' | 'paidTo' | 'amountPaid' | 'expenseType' | 'transactionType'>;

const RecommendationTypeLabelsModal: Record<RecommendationType, string> = {
  [RecommendationType.Duplicate]: "Potential Duplicate",
  [RecommendationType.MerchantNormalization]: "Merchant Normalization",
  [RecommendationType.MissingField]: "Missing Field",
  [RecommendationType.Classification]: "Classification Suggestion",
};

const ITEMS_PER_PAGE = 50;

const DataTableView: React.FC<DataTableViewProps> = ({ 
  transactions, 
  rawFileName,
  recommendations, 
  onAddTransaction, 
  onUpdateTransaction, 
  onDeleteTransaction,
  onApplyRecommendation,
  onIgnoreRecommendation 
}) => {
  const [isTransactionModalOpen, setIsTransactionModalOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<TransactionRecord | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortConfig, setSortConfig] = useState<{ key: SortableKeys; direction: 'ascending' | 'descending' } | null>(null);
  const [selectedTransactionForRecs, setSelectedTransactionForRecs] = useState<TransactionRecord | null>(null);
  const [showDeleteConfirmModal, setShowDeleteConfirmModal] = useState(false);
  const [transactionToDeleteId, setTransactionToDeleteId] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);

  const filteredAndSortedTransactions = useMemo(() => {
    let sortedTransactions = [...transactions]; // transactions are already globally filtered from App.tsx
    if (sortConfig !== null) {
      sortedTransactions.sort((a, b) => {
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
    if (!searchTerm) return sortedTransactions;
    return sortedTransactions.filter(transaction =>
      Object.values(transaction).some(value =>
        String(value).toLowerCase().includes(searchTerm.toLowerCase())
      )
    );
  }, [transactions, searchTerm, sortConfig]);

  const summaryStats = useMemo(() => {
    const totalCount = filteredAndSortedTransactions.length;
    const totalAmount = filteredAndSortedTransactions.reduce((sum, t) => sum + t.amountPaid, 0);
    const uniqueMerchants = new Set(filteredAndSortedTransactions.map(t => t.paidTo.trim()).filter(Boolean)).size;
    
    let minDate = '';
    let maxDate = '';
    if (totalCount > 0) {
        const dates = filteredAndSortedTransactions.map(t => t.dateOfPayment).sort();
        minDate = dates[0];
        maxDate = dates[dates.length - 1];
    }
    return {
        totalCount,
        totalAmount,
        uniqueMerchants,
        dateRange: totalCount > 0 ? `${minDate} to ${maxDate}` : 'N/A',
    };
  }, [filteredAndSortedTransactions]);

  const paginatedTransactions = useMemo(() => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredAndSortedTransactions.slice(startIndex, startIndex + ITEMS_PER_PAGE);
  }, [filteredAndSortedTransactions, currentPage]);

  const totalPages = Math.ceil(filteredAndSortedTransactions.length / ITEMS_PER_PAGE);

  useEffect(() => {
    // Reset to page 1 if filters change and current page becomes invalid
    if (currentPage > totalPages && totalPages > 0) {
        setCurrentPage(1);
    } else if (totalPages === 0 && currentPage !== 1) {
        setCurrentPage(1); // Reset if no pages
    }
  }, [currentPage, totalPages]);


  const handleAddClick = () => {
    setEditingTransaction(null);
    setIsTransactionModalOpen(true);
  };

  const handleEditClick = (transaction: TransactionRecord) => {
    setEditingTransaction(transaction);
    setIsTransactionModalOpen(true);
  };

  const handleDeleteClick = (transactionId: string) => {
    setTransactionToDeleteId(transactionId);
    setShowDeleteConfirmModal(true);
  };

  const confirmDeleteTransaction = () => {
    if (transactionToDeleteId) {
      onDeleteTransaction(transactionToDeleteId);
    }
    setShowDeleteConfirmModal(false);
    setTransactionToDeleteId(null);
  };

  const cancelDeleteTransaction = () => {
    setShowDeleteConfirmModal(false);
    setTransactionToDeleteId(null);
  };


  const handleSaveTransaction = (transactionData: TransactionRecord | Omit<TransactionRecord, 'id' | 'flags' | 'originalValues'>) => {
    if ('id' in transactionData) {
      onUpdateTransaction(transactionData as TransactionRecord);
    } else {
      onAddTransaction(transactionData);
    }
    setIsTransactionModalOpen(false);
    setEditingTransaction(null);
  };
  
  const requestSort = (key: SortableKeys) => {
    let direction: 'ascending' | 'descending' = 'ascending';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'ascending') {
      direction = 'descending';
    }
    setSortConfig({ key, direction });
    setCurrentPage(1); // Reset to first page on sort
  };

  const handleOpenRecsModal = (transaction: TransactionRecord) => {
    setSelectedTransactionForRecs(transaction);
  };

  const handleCloseRecsModal = () => {
    setSelectedTransactionForRecs(null);
  };

  const handleApplyRecInModal = (recId: string) => {
    onApplyRecommendation(recId);
    const transactionId = selectedTransactionForRecs?.id;
    if (!transactionId) {
        handleCloseRecsModal();
        return;
    }
    const recBeingApplied = recommendations.find(r => r.id === recId);
    if (!recBeingApplied) {
        handleCloseRecsModal();
        return;
    }
    const otherPendingRecsForTx = recommendations.filter(r => 
        r.id !== recId &&
        r.transactionIds.includes(transactionId) && 
        r.status === 'pending'
    );
    if (otherPendingRecsForTx.length === 0) {
        handleCloseRecsModal();
    }
  };

  const handleIgnoreRecInModal = (recId: string) => {
    onIgnoreRecommendation(recId);
    const transactionId = selectedTransactionForRecs?.id;
     if (!transactionId) {
        handleCloseRecsModal();
        return;
    }
    const otherPendingRecsForTx = recommendations.filter(r => 
        r.id !== recId &&
        r.transactionIds.includes(transactionId) && 
        r.status === 'pending'
    );
    if (otherPendingRecsForTx.length === 0) {
        handleCloseRecsModal();
    }
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

  const renderRecValue = (value: any) => {
    if (value === undefined || value === null || value === "") return <em className="text-gray-400">N/A</em>;
    if (typeof value === 'object') return JSON.stringify(value);
    return String(value);
  };

  const pendingRecsForSelectedTransaction = selectedTransactionForRecs
    ? recommendations.filter(rec => rec.status === 'pending' && rec.transactionIds.includes(selectedTransactionForRecs.id))
    : [];

  const StatCard: React.FC<{title: string, value: string | number, icon: React.ReactNode}> = ({ title, value, icon}) => (
    <div className="bg-white p-3 rounded-lg shadow flex items-center space-x-3">
        <div className="p-2 bg-blue-100 rounded-full">
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

  if (transactions.length === 0) { // Initial transactions prop from App.tsx
    if (rawFileName) { 
      mainContent = (
        <div className="text-center py-10">
          <TableCellsIcon className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-700 mb-2">No Data Found in File</h2>
          <p className="text-gray-500">The uploaded file <span className="font-medium">{rawFileName}</span> appears to be empty or does not contain recognizable transaction data.</p>
          <p className="text-gray-500 mt-2 mb-4">Please try uploading another file or add transactions manually below.</p>
          <button
            onClick={handleAddClick}
            className="bg-green-500 hover:bg-green-600 text-white font-semibold py-2 px-4 rounded-lg shadow-md transition duration-150 ease-in-out inline-flex items-center"
            aria-label="Add transaction manually after empty file upload"
          >
            <PlusIcon className="w-5 h-5 mr-2" />
            Add Transaction Manually
          </button>
        </div>
      );
    } else { 
      mainContent = (
        <div className="text-center py-10">
          <PlusCircleIcon className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-700 mb-2">Welcome to the Expense Manager</h2>
          <p className="text-gray-500 mb-4">Get started by uploading an Excel file or adding a transaction manually.</p>
          <button
            onClick={handleAddClick}
            className="bg-green-500 hover:bg-green-600 text-white font-semibold py-2 px-4 rounded-lg shadow-md transition duration-150 ease-in-out inline-flex items-center"
            aria-label="Add new transaction"
          >
            <PlusIcon className="w-5 h-5 mr-2" />
            Add Transaction
          </button>
        </div>
      );
    }
  } else {
    mainContent = (
      <>
        {/* Summary Statistics */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <StatCard title="Total Transactions" value={summaryStats.totalCount} icon={<HashtagIcon className="w-5 h-5 text-blue-500"/>} />
            <StatCard title="Total Amount" value={summaryStats.totalAmount} icon={<CurrencyDollarIcon className="w-5 h-5 text-green-500"/>} />
            <StatCard title="Unique Merchants" value={summaryStats.uniqueMerchants} icon={<BuildingStorefrontIcon className="w-5 h-5 text-purple-500"/>} />
            <StatCard title="Date Range" value={summaryStats.dateRange} icon={<CalendarRangeIcon className="w-5 h-5 text-orange-500"/>} />
        </div>

        <div className="mb-4 flex justify-between items-center">
          <input
            type="text"
            placeholder="Search current view..."
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500 w-full md:w-1/3 shadow-sm"
            value={searchTerm}
            onChange={e => { setSearchTerm(e.target.value); setCurrentPage(1);}}
            aria-label="Search transactions"
          />
          <button
            onClick={handleAddClick}
            className="bg-blue-500 hover:bg-blue-600 text-white font-semibold py-2 px-4 rounded-lg shadow-md transition duration-150 ease-in-out inline-flex items-center"
            aria-label="Add new transaction"
          >
            <PlusIcon className="w-5 h-5 mr-2" />
            Add Transaction
          </button>
        </div>
        <div className="overflow-x-auto shadow border border-gray-200 sm:rounded-lg">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-2 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-10" title="Pending Recommendations">
                  <SparklesIcon className="w-4 h-4 mx-auto text-gray-400" />
                </th>
                <SortableHeader label="Date" sortKey="dateOfPayment" />
                <SortableHeader label="Paid To" sortKey="paidTo" />
                <SortableHeader label="Amount ($)" sortKey="amountPaid" />
                <SortableHeader label="Expense Type" sortKey="expenseType" />
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Subtype</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Description</th>
                <SortableHeader label="Transaction Type" sortKey="transactionType" />
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {paginatedTransactions.map(transaction => {
                const hasPendingRecs = recommendations.some(
                  rec => rec.status === 'pending' && rec.transactionIds.includes(transaction.id)
                );
                return (
                  <tr key={transaction.id} className={`hover:bg-gray-50 transition-colors duration-150 ${transaction.flags.isDuplicateCandidate ? 'bg-yellow-50' : ''} ${transaction.flags.isDeleted ? 'opacity-50 line-through' : ''}`}>
                    <td className="px-2 py-3 whitespace-nowrap text-sm text-center">
                      {hasPendingRecs && (
                        <button 
                          onClick={() => handleOpenRecsModal(transaction)} 
                          className="text-yellow-500 hover:text-yellow-600 transition-colors duration-150"
                          title="View pending recommendations for this transaction"
                          aria-label="View pending recommendations for this transaction"
                        >
                          <LightBulbIcon 
                            className="w-5 h-5 inline-block" 
                          />
                        </button>
                      )}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-700">{transaction.dateOfPayment}</td>
                    <td className="px-4 py-3 text-sm text-gray-700 truncate max-w-xs hover:whitespace-normal" title={transaction.paidTo}>{transaction.paidTo}</td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-700 text-right">{transaction.amountPaid.toFixed(2)}</td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-700">{transaction.expenseType}</td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-700">{transaction.expenseSubtype}</td>
                    <td className="px-4 py-3 text-sm text-gray-700 truncate max-w-xs hover:whitespace-normal" title={transaction.description}>{transaction.description}</td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-700">{transaction.transactionType}</td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm font-medium space-x-2">
                      <button onClick={() => handleEditClick(transaction)} className="text-blue-600 hover:text-blue-800 transition duration-150" title="Edit transaction" aria-label={`Edit transaction for ${transaction.paidTo} on ${transaction.dateOfPayment}`}>
                        <PencilIcon className="w-5 h-5" />
                      </button>
                      <button onClick={() => handleDeleteClick(transaction.id)} className="text-red-600 hover:text-red-800 transition duration-150" title="Delete transaction" aria-label={`Delete transaction for ${transaction.paidTo} on ${transaction.dateOfPayment}`}>
                        <TrashIcon className="w-5 h-5" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        
        {filteredAndSortedTransactions.length > ITEMS_PER_PAGE && (
          <div className="mt-6 flex justify-between items-center">
            <button
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Previous
            </button>
            <span className="text-sm text-gray-700">
              Page {currentPage} of {totalPages} (Total: {filteredAndSortedTransactions.length} transactions)
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
        
        {filteredAndSortedTransactions.length === 0 && searchTerm && (
          <p className="text-center text-gray-500 py-4">No transactions match your search term "{searchTerm}".</p>
        )}
        {filteredAndSortedTransactions.length === 0 && !searchTerm && transactions.length > 0 && ( // transactions comes from App.tsx (globally filtered)
          <p className="text-center text-gray-500 py-4">All transactions are currently filtered out by global filters.</p>
        )}
      </>
    );
  }

  return (
    <div className="space-y-4">
      {mainContent}

      {isTransactionModalOpen && (
        <TransactionFormModal
          isOpen={isTransactionModalOpen}
          onClose={() => {
            setIsTransactionModalOpen(false);
            setEditingTransaction(null);
          }}
          onSave={handleSaveTransaction}
          existingTransaction={editingTransaction}
          allTransactions={transactions} // Pass allTransactions for form suggestions
        />
      )}
      {selectedTransactionForRecs && (
        <Modal
          isOpen={!!selectedTransactionForRecs}
          onClose={handleCloseRecsModal}
          title={`Recommendations for ${selectedTransactionForRecs.dateOfPayment} - ${selectedTransactionForRecs.paidTo.substring(0,20)}${selectedTransactionForRecs.paidTo.length > 20 ? '...' : ''}`}
          size="lg"
        >
          {pendingRecsForSelectedTransaction.length > 0 ? (
            <div className="space-y-4 max-h-[60vh] overflow-y-auto p-1">
              {pendingRecsForSelectedTransaction.map(rec => (
                <div key={rec.id} className="bg-gray-50 p-4 rounded-lg shadow border-l-4 border-blue-400">
                  <h4 className="text-md font-semibold text-gray-700 mb-1">{RecommendationTypeLabelsModal[rec.type]}</h4>
                  <p className="text-sm text-gray-600 mb-2 flex items-start">
                    <InformationCircleIcon className="w-4 h-4 mr-1.5 text-blue-500 flex-shrink-0 mt-0.5" />
                    <span>{rec.description}</span>
                  </p>
                  {rec.affectedField && (
                    <p className="text-xs text-gray-500 mb-1">Field: <strong className="text-gray-600">{rec.affectedField}</strong></p>
                  )}
                  {rec.originalValue !== undefined && rec.type !== RecommendationType.Duplicate && (
                    <p className="text-xs text-gray-500 mb-1">
                      Original: <span className="font-mono bg-gray-200 px-1 rounded text-gray-700">{renderRecValue(rec.originalValue)}</span>
                    </p>
                  )}
                  {rec.type !== RecommendationType.Duplicate && (
                    <p className="text-xs text-green-700 mb-2">
                      Suggested: <strong className="font-mono bg-green-100 px-1 rounded">{renderRecValue(rec.suggestedValue)}</strong>
                    </p>
                  )}
                  {rec.type === RecommendationType.Duplicate && (
                    <p className="text-xs text-orange-700 mb-2">
                      Action: <strong className="font-mono bg-orange-100 px-1 rounded">{renderRecValue(rec.suggestedValue)}</strong>
                    </p>
                  )}
                   {rec.confidence && (
                    <p className="text-xs text-gray-500 mb-2">Confidence: {(rec.confidence * 100).toFixed(0)}%</p>
                  )}
                  <div className="flex justify-end space-x-2 mt-2">
                    <button
                      onClick={() => handleIgnoreRecInModal(rec.id)}
                      className="px-3 py-1.5 text-xs font-medium text-red-700 bg-red-100 hover:bg-red-200 rounded-md transition duration-150 ease-in-out flex items-center"
                      aria-label={`Ignore recommendation: ${rec.description}`}
                    >
                      <XCircleIcon className="w-4 h-4 mr-1" /> Ignore
                    </button>
                    <button
                      onClick={() => handleApplyRecInModal(rec.id)}
                      className="px-3 py-1.5 text-xs font-medium text-white bg-green-500 hover:bg-green-600 rounded-md transition duration-150 ease-in-out flex items-center"
                      aria-label={`Apply recommendation: ${rec.description}`}
                    >
                      <CheckCircleIcon className="w-4 h-4 mr-1" /> Apply
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-600 text-center py-4">No more pending recommendations for this transaction.</p>
          )}
        </Modal>
      )}

      {showDeleteConfirmModal && (
        <Modal
          isOpen={showDeleteConfirmModal}
          onClose={cancelDeleteTransaction}
          title="Confirm Deletion"
          size="sm"
        >
          <div className="text-center">
            <ExclamationTriangleIcon className="w-12 h-12 text-red-500 mx-auto mb-4" />
            <p className="text-sm text-gray-600 mb-4">
              Are you sure you want to delete this transaction? This action cannot be undone.
            </p>
            <div className="flex justify-center space-x-3">
              <button
                onClick={cancelDeleteTransaction}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                Cancel
              </button>
              <button
                onClick={confirmDeleteTransaction}
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

export default DataTableView;