
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { TransactionRecord } from '../types';
import Modal from './common/Modal'; 
import { KEYWORD_RULES } from '../constants'; 
import { CalendarDaysIcon, BuildingStorefrontIcon, CurrencyDollarIcon, TagIcon, ArrowsRightLeftIcon, PencilSquareIcon } from './common/Icons';

interface TransactionFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (transactionData: TransactionRecord | Omit<TransactionRecord, 'id' | 'flags' | 'originalValues'>) => void;
  existingTransaction?: TransactionRecord | null;
  allTransactions: TransactionRecord[]; 
}

const TransactionFormModal: React.FC<TransactionFormModalProps> = ({
  isOpen,
  onClose,
  onSave,
  existingTransaction,
  allTransactions
}) => {
  const initialFormState: Omit<TransactionRecord, 'id' | 'flags' | 'originalValues'> = {
    dateOfPayment: new Date().toISOString().split('T')[0], 
    paidTo: '',
    amountPaid: 0,
    expenseType: '',
    expenseSubtype: '',
    description: '',
    transactionType: '',
  };

  const [formData, setFormData] = useState(existingTransaction ? { ...existingTransaction } : initialFormState);
  const [errors, setErrors] = useState<Partial<Record<keyof typeof initialFormState, string>>>({});
  const [paidToSuggestions, setPaidToSuggestions] = useState<string[]>([]);
  const [showPaidToSuggestions, setShowPaidToSuggestions] = useState(false);

  useEffect(() => {
    if (existingTransaction) {
      const formattedDate = existingTransaction.dateOfPayment.split('T')[0];
      setFormData({ ...existingTransaction, dateOfPayment: formattedDate });
    } else {
      setFormData(initialFormState);
    }
    setErrors({});
    setPaidToSuggestions([]);
    setShowPaidToSuggestions(false);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [existingTransaction, isOpen]);

  const autoFillFieldsFromPaidToHistory = useCallback((merchantName: string) => {
    if (!merchantName) return;

    const relevantTransactions = allTransactions.filter(
      t => t.paidTo.toLowerCase() === merchantName.toLowerCase() && !t.flags.isDeleted
    );

    if (relevantTransactions.length === 0) return;

    const getMostFrequent = (field: keyof TransactionRecord, filterFn?: (t: TransactionRecord) => boolean) => {
      const counts: Record<string, number> = {};
      const source = filterFn ? relevantTransactions.filter(filterFn) : relevantTransactions;
      source.forEach(t => {
        const value = String(t[field]).trim();
        if (value) {
          counts[value] = (counts[value] || 0) + 1;
        }
      });
      if (Object.keys(counts).length === 0) return null;
      return Object.entries(counts).sort((a, b) => b[1] - a[1])[0][0];
    };
    
    setFormData(prev => {
      const newValues: Partial<TransactionRecord> = {};
      let changed = false;

      if (!prev.expenseType) {
        const suggestedType = getMostFrequent('expenseType');
        if (suggestedType) {
          newValues.expenseType = suggestedType;
          changed = true;
        }
      }
      
      const currentTypeForSubtype = newValues.expenseType || prev.expenseType;
      if (currentTypeForSubtype && !prev.expenseSubtype) {
        const suggestedSubtype = getMostFrequent('expenseSubtype', t => t.expenseType === currentTypeForSubtype);
        if (suggestedSubtype) {
          newValues.expenseSubtype = suggestedSubtype;
          changed = true;
        }
      }

      if (!prev.transactionType) {
        const suggestedTransactionType = getMostFrequent('transactionType');
        if (suggestedTransactionType) {
          newValues.transactionType = suggestedTransactionType;
          changed = true;
        }
      }
      
      if (!prev.description) {
        const suggestedDescription = getMostFrequent('description');
        if (suggestedDescription) {
          newValues.description = suggestedDescription;
          changed = true;
        }
      }
      return changed ? { ...prev, ...newValues } : prev;
    });
  }, [allTransactions]);

  // Effect for keyword-based auto-filling (runs as user types PaidTo/Description)
  useEffect(() => {
    if (formData.expenseType === '' && (formData.paidTo.trim() || formData.description.trim())) {
      const paidToLc = formData.paidTo.toLowerCase();
      const descriptionLc = formData.description.toLowerCase();
      let matchedRule = null;

      for (const rule of KEYWORD_RULES) {
        if (rule.keywords.some(kw => paidToLc.includes(kw) || descriptionLc.includes(kw))) {
          matchedRule = rule;
          break;
        }
      }

      if (matchedRule) {
        setFormData(prev => {
          const shouldUpdateType = prev.expenseType === '' || prev.expenseType !== matchedRule.type;
          const shouldUpdateSubtype = prev.expenseSubtype === '' || prev.expenseSubtype !== matchedRule.subtype;

          if ((shouldUpdateType || shouldUpdateSubtype) && 
              (prev.expenseType !== matchedRule.type || prev.expenseSubtype !== matchedRule.subtype)) {
            return {
              ...prev,
              expenseType: prev.expenseType === '' ? matchedRule.type : prev.expenseType,
              expenseSubtype: prev.expenseSubtype === '' && (prev.expenseType === '' || prev.expenseType === matchedRule.type) ? matchedRule.subtype : prev.expenseSubtype,
            };
          }
          return prev;
        });
      }
    }
  }, [formData.paidTo, formData.description, formData.expenseType]);


  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    
    let newFormData = {
      ...formData,
      [name]: name === 'amountPaid' ? parseFloat(value) || 0 : value,
    };

    if (name === 'paidTo') {
      if (value.length >= 2) {
        const uniqueMerchants = Array.from(new Set(allTransactions.map(t => t.paidTo.trim()).filter(Boolean)));
        const suggestions = uniqueMerchants.filter(m => 
          m.toLowerCase().includes(value.toLowerCase())
        ).slice(0, 5);
        setPaidToSuggestions(suggestions);
        setShowPaidToSuggestions(suggestions.length > 0);
      } else {
        setPaidToSuggestions([]);
        setShowPaidToSuggestions(false);
      }
    }
    
    if (name === 'expenseType') {
      const validSubtypesForNewType = categoryData.expenseTypeToSubtypesMap[value] || new Set();
      if (!validSubtypesForNewType.has(newFormData.expenseSubtype) ) {
        newFormData.expenseSubtype = ''; 
      }
    }
    
    setFormData(newFormData);

    if (errors[name as keyof typeof errors]) {
      setErrors(prev => ({ ...prev, [name]: undefined }));
    }
  };

  const handlePaidToSuggestionClick = (suggestion: string) => {
    setFormData(prev => ({ ...prev, paidTo: suggestion }));
    setPaidToSuggestions([]);
    setShowPaidToSuggestions(false);
    autoFillFieldsFromPaidToHistory(suggestion); 
  };
  
  const handlePaidToBlur = () => {
    setTimeout(() => {
      setShowPaidToSuggestions(false);
      if (formData.paidTo && !paidToSuggestions.includes(formData.paidTo)) {
          autoFillFieldsFromPaidToHistory(formData.paidTo);
      }
    }, 150);
  };

  const validate = (): boolean => {
    const newErrors: Partial<Record<keyof typeof initialFormState, string>> = {};
    if (!formData.dateOfPayment) newErrors.dateOfPayment = 'Date is required.';
    if (!formData.paidTo.trim()) newErrors.paidTo = 'Paid To is required.';
    if (formData.amountPaid <= 0) newErrors.amountPaid = 'Amount must be greater than zero.';
    if (!formData.expenseType.trim()) newErrors.expenseType = 'Expense Type is required.';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (validate()) {
      onSave(formData);
    }
  };
  
  const categoryData = useMemo(() => {
    const expenseTypes = new Set<string>();
    const transactionTypes = new Set<string>();
    const expenseTypeToSubtypesMap: Record<string, Set<string>> = {};

    allTransactions.forEach(t => {
      if(t.expenseType) {
        expenseTypes.add(t.expenseType);
        if (!expenseTypeToSubtypesMap[t.expenseType]) {
          expenseTypeToSubtypesMap[t.expenseType] = new Set();
        }
        if (t.expenseSubtype) {
          expenseTypeToSubtypesMap[t.expenseType].add(t.expenseSubtype);
        }
      }
      if(t.transactionType) transactionTypes.add(t.transactionType);
    });
    return {
      uniqueExpenseTypes: Array.from(expenseTypes).sort(),
      uniqueTransactionTypes: Array.from(transactionTypes).sort(),
      expenseTypeToSubtypesMap
    };
  }, [allTransactions]);

  const currentSubtypeOptions = useMemo(() => {
    if (formData.expenseType && categoryData.expenseTypeToSubtypesMap[formData.expenseType]) {
      return Array.from(categoryData.expenseTypeToSubtypesMap[formData.expenseType]).sort();
    }
    return [];
  }, [formData.expenseType, categoryData.expenseTypeToSubtypesMap]);

  const getInputIcon = (fieldName: keyof typeof initialFormState) => {
    const baseIconClass = "h-5 w-5";
    switch (fieldName) {
      case 'dateOfPayment': return <CalendarDaysIcon className={`${baseIconClass} text-blue-500`} />;
      case 'paidTo': return <BuildingStorefrontIcon className={`${baseIconClass} text-orange-500`} />;
      case 'amountPaid': return <CurrencyDollarIcon className={`${baseIconClass} text-green-500`} />;
      case 'expenseType':
      case 'expenseSubtype': return <TagIcon className={`${baseIconClass} text-purple-500`} />;
      case 'transactionType': return <ArrowsRightLeftIcon className={`${baseIconClass} text-indigo-500`} />;
      case 'description': return <PencilSquareIcon className={`${baseIconClass} text-gray-500`} />;
      default: return null;
    }
  };

  const renderInput = (
    name: keyof typeof initialFormState, 
    label: string, 
    type: string = 'text', 
    options?: string[],
    isSubtypeField: boolean = false
  ) => {
    const baseInputClass = `block w-full pr-3 py-2 border ${errors[name] ? 'border-red-500' : 'border-gray-300'} rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm`;
    const inputClassWithIcon = `${baseInputClass} pl-10`; // Padding for icon
    const inputClassPlain = `${baseInputClass} px-3`; // Standard padding for inputs without icon directly inside or for secondary inputs

    const primaryDisabledClass = (isSubtypeField && !formData.expenseType && options?.length === 0) 
                                 ? 'bg-gray-100 cursor-not-allowed' 
                                 : '';
    const typeNewDisabledClass = (isSubtypeField && !formData.expenseType) 
                                 ? 'bg-gray-100 cursor-not-allowed' 
                                 : '';

    let inputElement: JSX.Element;

    if (name === 'paidTo') {
      inputElement = (
        <div className="relative mt-1">
          <div className="pointer-events-none absolute inset-y-0 left-0 pl-3 flex items-center">{getInputIcon(name)}</div>
          <input
            type="text" id={name} name={name} value={String(formData[name])}
            onChange={handleChange} onBlur={handlePaidToBlur}
            onFocus={() => { if (formData.paidTo.length >= 2 && paidToSuggestions.length > 0) setShowPaidToSuggestions(true); }}
            autoComplete="off" className={`${inputClassWithIcon} ${primaryDisabledClass}`}
          />
          {showPaidToSuggestions && paidToSuggestions.length > 0 && (
            <ul className="absolute z-10 w-full bg-white border border-gray-300 rounded-md mt-1 max-h-40 overflow-y-auto shadow-lg">
              {paidToSuggestions.map(suggestion => (
                <li key={suggestion} onClick={() => handlePaidToSuggestionClick(suggestion)} className="px-3 py-2 cursor-pointer hover:bg-gray-100">
                  {suggestion}
                </li>
              ))}
            </ul>
          )}
        </div>
      );
    } else if (type === 'select' && options) {
      inputElement = (
        <>
          <div className="relative mt-1"> {/* Wrapper for select and its icon */}
            <div className="pointer-events-none absolute inset-y-0 left-0 pl-3 flex items-center">{getInputIcon(name)}</div>
            <select
              id={name} name={name} value={String(formData[name]) || ''} onChange={handleChange}
              disabled={isSubtypeField && !formData.expenseType && options.length === 0}
              className={`${inputClassWithIcon} ${primaryDisabledClass}`}
            >
              <option value="">Select or type...</option>
              {options.map(opt => <option key={opt} value={opt}>{opt}</option>)}
            </select>
          </div>
          {/* Secondary input: "Or type new..." - no icon directly inside this one */}
          <input
            type="text"
            placeholder={`Or type new ${label.toLowerCase()}`}
            aria-label={`Or type new ${label.toLowerCase()}`}
            value={String(formData[name]) || ''} 
            onChange={(e) => { 
                const { value: inputValue } = e.target;
                setFormData(prev => {
                    let updated = {...prev, [name]: inputValue};
                    if (name === 'expenseType') { 
                        const validSubtypesForNewType = categoryData.expenseTypeToSubtypesMap[inputValue] || new Set();
                        if (!validSubtypesForNewType.has(String(formData.expenseSubtype))) {
                            updated.expenseSubtype = '';
                        }
                    }
                    return updated;
                });
                if (errors[name as keyof typeof errors]) {
                    setErrors(prev => ({ ...prev, [name]: undefined }));
                }
            }}
            disabled={isSubtypeField && !formData.expenseType} 
            className={`mt-1 ${inputClassPlain} ${typeNewDisabledClass}`}
          />
        </>
      );
    } else if (type === 'textarea') {
      inputElement = (
        <div className="relative mt-1">
          <div className="pointer-events-none absolute inset-y-0 left-0 top-0 pt-2.5 pl-3 flex items-start">{getInputIcon(name)}</div>
          <textarea
            id={name} name={name} value={String(formData[name])} onChange={handleChange}
            rows={3} className={`${inputClassWithIcon} ${primaryDisabledClass}`}
          />
        </div>
      );
    } else { // Default input (text, number, date)
      inputElement = (
        <div className="relative mt-1">
          <div className="pointer-events-none absolute inset-y-0 left-0 pl-3 flex items-center">{getInputIcon(name)}</div>
          <input
            type={type} id={name} name={name} value={String(formData[name])} onChange={handleChange}
            className={`${inputClassWithIcon} ${primaryDisabledClass}`}
            step={type === 'number' ? '0.01' : undefined}
          />
        </div>
      );
    }

    return (
      <div className="mb-4">
        <label htmlFor={name} className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
        {inputElement}
        {errors[name] && <p className="mt-1 text-xs text-red-600">{errors[name]}</p>}
      </div>
    );
  };


  return (
    <Modal isOpen={isOpen} onClose={onClose} title={existingTransaction ? 'Edit Transaction' : 'Add New Transaction'}>
      <form onSubmit={handleSubmit} className="space-y-1">
        {renderInput('dateOfPayment', 'Date of Payment', 'date')}
        {renderInput('paidTo', 'Paid To')}
        {renderInput('amountPaid', 'Amount Paid ($)', 'number')}
        {renderInput('expenseType', 'Expense Type', 'select', categoryData.uniqueExpenseTypes)}
        {renderInput('expenseSubtype', 'Expense Subtype', 'select', currentSubtypeOptions, true)}
        {renderInput('transactionType', 'Transaction Type', 'select', categoryData.uniqueTransactionTypes)}
        {renderInput('description', 'Description', 'textarea')}
        
        <div className="flex justify-end space-x-3 pt-4">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            Cancel
          </button>
          <button
            type="submit"
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 border border-transparent rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            {existingTransaction ? 'Save Changes' : 'Add Transaction'}
          </button>
        </div>
      </form>
    </Modal>
  );
};

export default TransactionFormModal;
