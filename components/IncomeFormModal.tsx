
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { IncomeRecord } from '../types';
import Modal from './common/Modal'; 
// import { INCOME_KEYWORD_RULES } from '../constants'; // If income keywords are added
import { CalendarDaysIcon, BuildingStorefrontIcon, CurrencyDollarIcon, TagIcon, PencilSquareIcon } from './common/Icons';

interface IncomeFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (incomeData: IncomeRecord | Omit<IncomeRecord, 'id' | 'flags' | 'originalValues'>) => void;
  existingIncomeRecord?: IncomeRecord | null;
  allIncomeRecords: IncomeRecord[]; 
}

const IncomeFormModal: React.FC<IncomeFormModalProps> = ({
  isOpen,
  onClose,
  onSave,
  existingIncomeRecord,
  allIncomeRecords
}) => {
  const initialFormState: Omit<IncomeRecord, 'id' | 'flags' | 'originalValues'> = {
    dateOfReceipt: new Date().toISOString().split('T')[0], 
    receivedFrom: '',
    amountReceived: 0,
    incomeType: '',
    incomeSubtype: '',
    description: '',
  };

  const [formData, setFormData] = useState(existingIncomeRecord ? { ...existingIncomeRecord } : initialFormState);
  const [errors, setErrors] = useState<Partial<Record<keyof typeof initialFormState, string>>>({});
  const [receivedFromSuggestions, setReceivedFromSuggestions] = useState<string[]>([]);
  const [showReceivedFromSuggestions, setShowReceivedFromSuggestions] = useState(false);

  useEffect(() => {
    if (existingIncomeRecord) {
      const formattedDate = existingIncomeRecord.dateOfReceipt.split('T')[0];
      setFormData({ ...existingIncomeRecord, dateOfReceipt: formattedDate });
    } else {
      setFormData(initialFormState);
    }
    setErrors({});
    setReceivedFromSuggestions([]);
    setShowReceivedFromSuggestions(false);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [existingIncomeRecord, isOpen]);

  const autoFillFieldsFromHistory = useCallback((sourceName: string) => {
    if (!sourceName) return;

    const relevantIncome = allIncomeRecords.filter(
      i => i.receivedFrom.toLowerCase() === sourceName.toLowerCase() && !i.flags.isDeleted
    );

    if (relevantIncome.length === 0) return;

    const getMostFrequent = (field: keyof IncomeRecord, filterFn?: (i: IncomeRecord) => boolean) => {
      const counts: Record<string, number> = {};
      const source = filterFn ? relevantIncome.filter(filterFn) : relevantIncome;
      source.forEach(i => {
        const value = String(i[field]).trim();
        if (value) {
          counts[value] = (counts[value] || 0) + 1;
        }
      });
      if (Object.keys(counts).length === 0) return null;
      return Object.entries(counts).sort((a, b) => b[1] - a[1])[0][0];
    };
    
    setFormData(prev => {
      const newValues: Partial<IncomeRecord> = {};
      let changed = false;

      if (!prev.incomeType) {
        const suggestedType = getMostFrequent('incomeType');
        if (suggestedType) {
          newValues.incomeType = suggestedType;
          changed = true;
        }
      }
      
      const currentTypeForSubtype = newValues.incomeType || prev.incomeType;
      if (currentTypeForSubtype && !prev.incomeSubtype) {
        const suggestedSubtype = getMostFrequent('incomeSubtype', i => i.incomeType === currentTypeForSubtype);
        if (suggestedSubtype) {
          newValues.incomeSubtype = suggestedSubtype;
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
  }, [allIncomeRecords]);

  // Keyword-based auto-filling (can be added if INCOME_KEYWORD_RULES are defined)
  // useEffect(() => {
  //   if (formData.incomeType === '' && (formData.receivedFrom.trim() || formData.description.trim())) {
  //     // ... logic using INCOME_KEYWORD_RULES
  //   }
  // }, [formData.receivedFrom, formData.description, formData.incomeType]);


  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    
    let newFormData = {
      ...formData,
      [name]: name === 'amountReceived' ? parseFloat(value) || 0 : value,
    };

    if (name === 'receivedFrom') {
      if (value.length >= 2) {
        const uniqueSources = Array.from(new Set(allIncomeRecords.map(i => i.receivedFrom.trim()).filter(Boolean)));
        const suggestions = uniqueSources.filter(s => 
          s.toLowerCase().includes(value.toLowerCase())
        ).slice(0, 5);
        setReceivedFromSuggestions(suggestions);
        setShowReceivedFromSuggestions(suggestions.length > 0);
      } else {
        setReceivedFromSuggestions([]);
        setShowReceivedFromSuggestions(false);
      }
    }
    
    if (name === 'incomeType') {
      const validSubtypesForNewType = categoryData.incomeTypeToSubtypesMap[value] || new Set();
      if (!validSubtypesForNewType.has(newFormData.incomeSubtype) ) {
        newFormData.incomeSubtype = ''; 
      }
    }
    
    setFormData(newFormData);

    if (errors[name as keyof typeof errors]) {
      setErrors(prev => ({ ...prev, [name]: undefined }));
    }
  };

  const handleReceivedFromSuggestionClick = (suggestion: string) => {
    setFormData(prev => ({ ...prev, receivedFrom: suggestion }));
    setReceivedFromSuggestions([]);
    setShowReceivedFromSuggestions(false);
    autoFillFieldsFromHistory(suggestion); 
  };
  
  const handleReceivedFromBlur = () => {
    setTimeout(() => {
      setShowReceivedFromSuggestions(false);
      if (formData.receivedFrom && !receivedFromSuggestions.includes(formData.receivedFrom)) {
          autoFillFieldsFromHistory(formData.receivedFrom);
      }
    }, 150);
  };

  const validate = (): boolean => {
    const newErrors: Partial<Record<keyof typeof initialFormState, string>> = {};
    if (!formData.dateOfReceipt) newErrors.dateOfReceipt = 'Date is required.';
    if (!formData.receivedFrom.trim()) newErrors.receivedFrom = 'Received From is required.';
    if (formData.amountReceived <= 0) newErrors.amountReceived = 'Amount must be greater than zero.';
    if (!formData.incomeType.trim()) newErrors.incomeType = 'Income Type is required.';
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
    const incomeTypes = new Set<string>();
    const incomeTypeToSubtypesMap: Record<string, Set<string>> = {};

    allIncomeRecords.forEach(i => {
      if(i.incomeType) {
        incomeTypes.add(i.incomeType);
        if (!incomeTypeToSubtypesMap[i.incomeType]) {
          incomeTypeToSubtypesMap[i.incomeType] = new Set();
        }
        if (i.incomeSubtype) {
          incomeTypeToSubtypesMap[i.incomeType].add(i.incomeSubtype);
        }
      }
    });
    return {
      uniqueIncomeTypes: Array.from(incomeTypes).sort(),
      incomeTypeToSubtypesMap
    };
  }, [allIncomeRecords]);

  const currentSubtypeOptions = useMemo(() => {
    if (formData.incomeType && categoryData.incomeTypeToSubtypesMap[formData.incomeType]) {
      return Array.from(categoryData.incomeTypeToSubtypesMap[formData.incomeType]).sort();
    }
    return [];
  }, [formData.incomeType, categoryData.incomeTypeToSubtypesMap]);

  const getInputIcon = (fieldName: keyof typeof initialFormState) => {
    const baseIconClass = "h-5 w-5";
    switch (fieldName) {
      case 'dateOfReceipt': return <CalendarDaysIcon className={`${baseIconClass} text-blue-500`} />;
      case 'receivedFrom': return <BuildingStorefrontIcon className={`${baseIconClass} text-orange-500`} />;
      case 'amountReceived': return <CurrencyDollarIcon className={`${baseIconClass} text-green-500`} />;
      case 'incomeType':
      case 'incomeSubtype': return <TagIcon className={`${baseIconClass} text-purple-500`} />;
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
    const inputClassWithIcon = `${baseInputClass} pl-10`;
    const inputClassPlain = `${baseInputClass} px-3`;

    const primaryDisabledClass = (isSubtypeField && !formData.incomeType && options?.length === 0) 
                                 ? 'bg-gray-100 cursor-not-allowed' 
                                 : '';
    const typeNewDisabledClass = (isSubtypeField && !formData.incomeType) 
                                 ? 'bg-gray-100 cursor-not-allowed' 
                                 : '';
    let inputElement: JSX.Element;

    if (name === 'receivedFrom') {
      inputElement = (
        <div className="relative mt-1">
          <div className="pointer-events-none absolute inset-y-0 left-0 pl-3 flex items-center">{getInputIcon(name)}</div>
          <input
            type="text" id={name} name={name} value={String(formData[name])}
            onChange={handleChange} onBlur={handleReceivedFromBlur}
            onFocus={() => { if (formData.receivedFrom.length >= 2 && receivedFromSuggestions.length > 0) setShowReceivedFromSuggestions(true); }}
            autoComplete="off" className={`${inputClassWithIcon} ${primaryDisabledClass}`}
          />
          {showReceivedFromSuggestions && receivedFromSuggestions.length > 0 && (
            <ul className="absolute z-10 w-full bg-white border border-gray-300 rounded-md mt-1 max-h-40 overflow-y-auto shadow-lg">
              {receivedFromSuggestions.map(suggestion => (
                <li key={suggestion} onClick={() => handleReceivedFromSuggestionClick(suggestion)} className="px-3 py-2 cursor-pointer hover:bg-gray-100">
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
            <select
              id={name} name={name} value={String(formData[name]) || ''} onChange={handleChange}
              disabled={isSubtypeField && !formData.incomeType && options.length === 0}
              className={`${inputClassWithIcon} ${primaryDisabledClass}`}
            >
              <option value="">Select or type...</option>
              {options.map(opt => <option key={opt} value={opt}>{opt}</option>)}
            </select>
          </div>
          <input
            type="text"
            placeholder={`Or type new ${label.toLowerCase()}`}
            aria-label={`Or type new ${label.toLowerCase()}`}
            value={String(formData[name]) || ''} 
            onChange={(e) => { 
                const { value: inputValue } = e.target;
                setFormData(prev => {
                    let updated = {...prev, [name]: inputValue};
                    if (name === 'incomeType') { 
                        const validSubtypesForNewType = categoryData.incomeTypeToSubtypesMap[inputValue] || new Set();
                        if (!validSubtypesForNewType.has(String(formData.incomeSubtype))) {
                            updated.incomeSubtype = '';
                        }
                    }
                    return updated;
                });
                if (errors[name as keyof typeof errors]) {
                    setErrors(prev => ({ ...prev, [name]: undefined }));
                }
            }}
            disabled={isSubtypeField && !formData.incomeType} 
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
    } else { 
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
    <Modal isOpen={isOpen} onClose={onClose} title={existingIncomeRecord ? 'Edit Income Record' : 'Add New Income Record'}>
      <form onSubmit={handleSubmit} className="space-y-1">
        {renderInput('dateOfReceipt', 'Date of Receipt', 'date')}
        {renderInput('receivedFrom', 'Received From')}
        {renderInput('amountReceived', 'Amount Received ($)', 'number')}
        {renderInput('incomeType', 'Income Type', 'select', categoryData.uniqueIncomeTypes)}
        {renderInput('incomeSubtype', 'Income Subtype', 'select', currentSubtypeOptions, true)}
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
            {existingIncomeRecord ? 'Save Changes' : 'Add Income Record'}
          </button>
        </div>
      </form>
    </Modal>
  );
};

export default IncomeFormModal;
