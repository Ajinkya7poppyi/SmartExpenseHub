
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { InvestmentTransferRecord } from '../types';
import Modal from './common/Modal'; 
import { INVESTMENT_TRANSFER_TYPES } from '../constants'; 
import { CalendarDaysIcon, BuildingStorefrontIcon, CurrencyDollarIcon, TagIcon, PencilSquareIcon, ClipboardDocumentCheckIcon, ArrowsUpDownIcon } from './common/Icons';

interface InvestmentTransferFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (recordData: InvestmentTransferRecord | Omit<InvestmentTransferRecord, 'id' | 'flags' | 'originalValues'>) => void;
  existingRecord?: InvestmentTransferRecord | null;
  allRecords: InvestmentTransferRecord[]; 
}

const defaultCurrencies = ["USD", "INR", "EUR", "GBP"]; // Common currencies

const InvestmentTransferFormModal: React.FC<InvestmentTransferFormModalProps> = ({
  isOpen,
  onClose,
  onSave,
  existingRecord,
  allRecords
}) => {
  const initialFormState: Omit<InvestmentTransferRecord, 'id' | 'flags' | 'originalValues'> = {
    dateOfTransfer: new Date().toISOString().split('T')[0], 
    transferToPlatform: '',
    transferFromAccount: '',
    amountTransferred: 0,
    currency: 'USD',
    transferType: '',
    purposeInvestmentName: '',
    description: '',
    confirmationReference: '',
  };

  const [formData, setFormData] = useState(existingRecord ? { ...existingRecord } : initialFormState);
  const [errors, setErrors] = useState<Partial<Record<keyof typeof initialFormState, string>>>({});
  
  // Suggestions for 'Transfer To/Platform'
  const [toPlatformSuggestions, setToPlatformSuggestions] = useState<string[]>([]);
  const [showToPlatformSuggestions, setShowToPlatformSuggestions] = useState(false);
  
  // Suggestions for 'Transfer From Account/Source'
  const [fromAccountSuggestions, setFromAccountSuggestions] = useState<string[]>([]);
  const [showFromAccountSuggestions, setShowFromAccountSuggestions] = useState(false);


  useEffect(() => {
    if (existingRecord) {
      const formattedDate = existingRecord.dateOfTransfer.split('T')[0];
      setFormData({ ...existingRecord, dateOfTransfer: formattedDate });
    } else {
      setFormData(initialFormState);
    }
    setErrors({});
    setToPlatformSuggestions([]);
    setShowToPlatformSuggestions(false);
    setFromAccountSuggestions([]);
    setShowFromAccountSuggestions(false);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [existingRecord, isOpen]);

  const autoFillBasedOnHistory = useCallback((field: 'transferToPlatform' | 'transferFromAccount', value: string) => {
    if (!value) return;
    
    const relevantRecords = allRecords.filter(r => {
        if (field === 'transferToPlatform') return r.transferToPlatform.toLowerCase() === value.toLowerCase();
        if (field === 'transferFromAccount') return r.transferFromAccount.toLowerCase() === value.toLowerCase();
        return false;
    }).filter(r => !r.flags.isDeleted);

    if (relevantRecords.length === 0) return;

    const getMostFrequent = (targetField: keyof InvestmentTransferRecord) => {
      const counts: Record<string, number> = {};
      relevantRecords.forEach(r => {
        const fieldValue = String(r[targetField]).trim();
        if (fieldValue) counts[fieldValue] = (counts[fieldValue] || 0) + 1;
      });
      return Object.keys(counts).length > 0 ? Object.entries(counts).sort((a,b) => b[1]-a[1])[0][0] : null;
    };

    setFormData(prev => {
        const newValues: Partial<InvestmentTransferRecord> = {};
        let changed = false;

        if (field === 'transferToPlatform' && !prev.transferFromAccount) {
            const suggestedFrom = getMostFrequent('transferFromAccount');
            if (suggestedFrom) { newValues.transferFromAccount = suggestedFrom; changed = true; }
        }
        if (field === 'transferFromAccount' && !prev.transferToPlatform) {
            const suggestedTo = getMostFrequent('transferToPlatform');
            if (suggestedTo) { newValues.transferToPlatform = suggestedTo; changed = true; }
        }

        if(!prev.transferType){
            const suggestedType = getMostFrequent('transferType');
            if(suggestedType) { newValues.transferType = suggestedType; changed = true; }
        }
        if(!prev.purposeInvestmentName){
            const suggestedPurpose = getMostFrequent('purposeInvestmentName');
            if(suggestedPurpose) { newValues.purposeInvestmentName = suggestedPurpose; changed = true; }
        }
        if(!prev.currency && prev.currency !== "USD"){ // Check default as well
            const suggestedCurrency = getMostFrequent('currency');
            if(suggestedCurrency) { newValues.currency = suggestedCurrency; changed = true; }
        }
        return changed ? {...prev, ...newValues} : prev;
    });

  }, [allRecords]);


  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    
    setFormData(prev => ({
      ...prev,
      [name]: name === 'amountTransferred' ? parseFloat(value) || 0 : value,
    }));

    if (name === 'transferToPlatform') {
      if (value.length >= 2) {
        const uniqueValues = Array.from(new Set(allRecords.map(r => r.transferToPlatform.trim()).filter(Boolean)));
        const suggestions = uniqueValues.filter(v => v.toLowerCase().includes(value.toLowerCase())).slice(0, 5);
        setToPlatformSuggestions(suggestions);
        setShowToPlatformSuggestions(suggestions.length > 0);
      } else {
        setToPlatformSuggestions([]);
        setShowToPlatformSuggestions(false);
      }
    }

    if (name === 'transferFromAccount') {
      if (value.length >= 2) {
        const uniqueValues = Array.from(new Set(allRecords.map(r => r.transferFromAccount.trim()).filter(Boolean)));
        const suggestions = uniqueValues.filter(v => v.toLowerCase().includes(value.toLowerCase())).slice(0, 5);
        setFromAccountSuggestions(suggestions);
        setShowFromAccountSuggestions(suggestions.length > 0);
      } else {
        setFromAccountSuggestions([]);
        setShowFromAccountSuggestions(false);
      }
    }

    if (errors[name as keyof typeof errors]) {
      setErrors(prev => ({ ...prev, [name]: undefined }));
    }
  };
  
  const handleSuggestionClick = (field: 'transferToPlatform' | 'transferFromAccount', suggestion: string) => {
    setFormData(prev => ({ ...prev, [field]: suggestion }));
    if (field === 'transferToPlatform') {
        setToPlatformSuggestions([]);
        setShowToPlatformSuggestions(false);
    } else {
        setFromAccountSuggestions([]);
        setShowFromAccountSuggestions(false);
    }
    autoFillBasedOnHistory(field, suggestion);
  };
  
  const handleBlur = (field: 'transferToPlatform' | 'transferFromAccount') => {
    setTimeout(() => {
      if (field === 'transferToPlatform') setShowToPlatformSuggestions(false);
      else setShowFromAccountSuggestions(false);
      
      const currentValue = formData[field];
      const currentSuggestions = field === 'transferToPlatform' ? toPlatformSuggestions : fromAccountSuggestions;
      if (currentValue && !currentSuggestions.includes(currentValue)) {
        autoFillBasedOnHistory(field, currentValue);
      }
    }, 150); // Delay to allow click on suggestion
  };


  const validate = (): boolean => {
    const newErrors: Partial<Record<keyof typeof initialFormState, string>> = {};
    if (!formData.dateOfTransfer) newErrors.dateOfTransfer = 'Date is required.';
    if (!formData.transferToPlatform.trim()) newErrors.transferToPlatform = 'Transfer To/Platform is required.';
    if (!formData.transferFromAccount.trim()) newErrors.transferFromAccount = 'Transfer From Account/Source is required.';
    if (formData.amountTransferred <= 0) newErrors.amountTransferred = 'Amount must be greater than zero.';
    if (!formData.currency.trim()) newErrors.currency = 'Currency is required.';
    if (!formData.transferType.trim()) newErrors.transferType = 'Transfer Type is required.';
    if (!formData.purposeInvestmentName.trim()) newErrors.purposeInvestmentName = 'Purpose/Investment Name is required.';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (validate()) {
      onSave(formData);
    }
  };
  
  const uniqueCurrencies = useMemo(() => {
    const currencies = new Set(defaultCurrencies);
    allRecords.forEach(r => {
      if(r.currency) currencies.add(r.currency);
    });
    return Array.from(currencies).sort();
  }, [allRecords]);
  
  const uniqueTransferTypes = useMemo(() => {
    const types = new Set(INVESTMENT_TRANSFER_TYPES); // Start with predefined
    allRecords.forEach(r => {
      if(r.transferType) types.add(r.transferType);
    });
    return Array.from(types).sort();
  }, [allRecords]);


  const getInputIcon = (fieldName: keyof typeof initialFormState) => {
    const baseIconClass = "h-5 w-5";
    switch (fieldName) {
      case 'dateOfTransfer': return <CalendarDaysIcon className={`${baseIconClass} text-blue-500`} />;
      case 'transferToPlatform': return <BuildingStorefrontIcon className={`${baseIconClass} text-indigo-500`} />;
      case 'transferFromAccount': return <BuildingStorefrontIcon className={`${baseIconClass} text-teal-500`} />;
      case 'amountTransferred': return <CurrencyDollarIcon className={`${baseIconClass} text-green-500`} />;
      case 'currency': return <TagIcon className={`${baseIconClass} text-yellow-500`} />;
      case 'transferType': return <ArrowsUpDownIcon className={`${baseIconClass} text-purple-500`} />;
      case 'purposeInvestmentName': return <TagIcon className={`${baseIconClass} text-pink-500`} />;
      case 'description': return <PencilSquareIcon className={`${baseIconClass} text-gray-500`} />;
      case 'confirmationReference': return <ClipboardDocumentCheckIcon className={`${baseIconClass} text-cyan-500`} />;
      default: return null;
    }
  };

  const renderInput = (
    name: keyof typeof initialFormState, 
    label: string, 
    type: string = 'text', 
    options?: string[],
  ) => {
    const baseInputClass = `block w-full pr-3 py-2 border ${errors[name] ? 'border-red-500' : 'border-gray-300'} rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm`;
    const inputClassWithIcon = `${baseInputClass} pl-10`;
    const inputClassPlain = `${baseInputClass} px-3`;

    let inputElement: JSX.Element;

    if (name === 'transferToPlatform' || name === 'transferFromAccount') {
      const suggestions = name === 'transferToPlatform' ? toPlatformSuggestions : fromAccountSuggestions;
      const showSuggestions = name === 'transferToPlatform' ? showToPlatformSuggestions : showFromAccountSuggestions;
      inputElement = (
        <div className="relative mt-1">
          <div className="pointer-events-none absolute inset-y-0 left-0 pl-3 flex items-center">{getInputIcon(name)}</div>
          <input
            type="text" id={name} name={name} value={String(formData[name])}
            onChange={handleChange} onBlur={() => handleBlur(name)}
            onFocus={() => { if (String(formData[name]).length >= 2 && suggestions.length > 0) name === 'transferToPlatform' ? setShowToPlatformSuggestions(true) : setShowFromAccountSuggestions(true) ; }}
            autoComplete="off" className={inputClassWithIcon}
          />
          {showSuggestions && suggestions.length > 0 && (
            <ul className="absolute z-10 w-full bg-white border border-gray-300 rounded-md mt-1 max-h-40 overflow-y-auto shadow-lg">
              {suggestions.map(suggestion => (
                <li key={suggestion} onClick={() => handleSuggestionClick(name, suggestion)} className="px-3 py-2 cursor-pointer hover:bg-gray-100">
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
          <div className="relative mt-1">
            <div className="pointer-events-none absolute inset-y-0 left-0 pl-3 flex items-center">{getInputIcon(name)}</div>
            <select id={name} name={name} value={String(formData[name]) || ''} onChange={handleChange} className={inputClassWithIcon}>
              <option value="">Select or type...</option>
              {options.map(opt => <option key={opt} value={opt}>{opt}</option>)}
            </select>
          </div>
          <input
            type="text"
            placeholder={`Or type new ${label.toLowerCase()}`}
            aria-label={`Or type new ${label.toLowerCase()}`}
            value={String(formData[name]) || ''} 
            onChange={handleChange}
            className={`mt-1 ${inputClassPlain}`}
          />
        </>
      );
    } else if (type === 'textarea') {
      inputElement = (
        <div className="relative mt-1">
          <div className="pointer-events-none absolute inset-y-0 left-0 top-0 pt-2.5 pl-3 flex items-start">{getInputIcon(name)}</div>
          <textarea id={name} name={name} value={String(formData[name])} onChange={handleChange} rows={3} className={inputClassWithIcon}/>
        </div>
      );
    } else { 
      inputElement = (
        <div className="relative mt-1">
          <div className="pointer-events-none absolute inset-y-0 left-0 pl-3 flex items-center">{getInputIcon(name)}</div>
          <input type={type} id={name} name={name} value={String(formData[name])} onChange={handleChange} className={inputClassWithIcon} step={type === 'number' ? '0.01' : undefined}/>
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
    <Modal isOpen={isOpen} onClose={onClose} title={existingRecord ? 'Edit Investment/Transfer Record' : 'Add New Record'} size="lg">
      <form onSubmit={handleSubmit} className="space-y-1 max-h-[70vh] overflow-y-auto p-1">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4">
            {renderInput('dateOfTransfer', 'Date of Transfer', 'date')}
            {renderInput('amountTransferred', 'Amount Transferred', 'number')}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4">
            {renderInput('currency', 'Currency', 'select', uniqueCurrencies)}
            {renderInput('transferType', 'Transfer Type', 'select', uniqueTransferTypes)}
        </div>
        {renderInput('transferToPlatform', 'Transfer To/Platform')}
        {renderInput('transferFromAccount', 'Transfer From Account/Source')}
        {renderInput('purposeInvestmentName', 'Purpose / Investment Name')}
        {renderInput('description', 'Description', 'textarea')}
        {renderInput('confirmationReference', 'Confirmation/Reference #')}
        
        <div className="flex justify-end space-x-3 pt-4 sticky bottom-0 bg-white pb-2">
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
            {existingRecord ? 'Save Changes' : 'Add Record'}
          </button>
        </div>
      </form>
    </Modal>
  );
};

export default InvestmentTransferFormModal;
