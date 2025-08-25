
import React from 'react';
import { Recommendation, RecommendationType } from '../types';
import { CheckCircleIcon, XCircleIcon, InformationCircleIcon } from './common/Icons';

interface RecommendationCardProps {
  recommendation: Recommendation;
  onApply: (recommendationId: string) => void;
  onIgnore: (recommendationId: string) => void;
}

const RecommendationTypeLabels: Record<RecommendationType, string> = {
  [RecommendationType.Duplicate]: "Potential Duplicate",
  [RecommendationType.MerchantNormalization]: "Merchant Normalization",
  [RecommendationType.MissingField]: "Missing Field",
  [RecommendationType.Classification]: "Classification Suggestion",
};

const RecommendationCard: React.FC<RecommendationCardProps> = ({ recommendation, onApply, onIgnore }) => {
  const { id, type, description, originalValue, suggestedValue, confidence, status, affectedField } = recommendation;

  const renderValue = (value: any) => {
    if (value === undefined || value === null || value === "") return <em className="text-gray-400">N/A (empty)</em>;
    if (typeof value === 'object') return JSON.stringify(value);
    return String(value);
  };

  return (
    <div className={`bg-white shadow-lg rounded-lg p-5 border-l-4 ${
      status === 'applied' ? 'border-green-500 opacity-70' : 
      status === 'ignored' ? 'border-red-500 opacity-60' : 
      'border-blue-500'
    }`}>
      <div className="flex justify-between items-start mb-2">
        <h3 className="text-lg font-semibold text-gray-800">{RecommendationTypeLabels[type]}</h3>
        {confidence && (
          <span className="text-xs bg-gray-200 text-gray-700 px-2 py-1 rounded-full">
            Confidence: {(confidence * 100).toFixed(0)}%
          </span>
        )}
      </div>
      
      <p className="text-sm text-gray-600 mb-3 flex items-start">
        <InformationCircleIcon className="w-5 h-5 mr-2 text-blue-500 flex-shrink-0 mt-0.5" />
        <span>{description}</span>
      </p>

      {affectedField && (
        <p className="text-sm text-gray-500 mb-1">Field: <strong className="text-gray-700">{affectedField}</strong></p>
      )}
      
      {originalValue !== undefined && type !== RecommendationType.Duplicate && (
        <p className="text-sm text-gray-500 mb-1">
          Original: <span className="font-mono bg-gray-100 px-1 rounded">{renderValue(originalValue)}</span>
        </p>
      )}
      
      {type !== RecommendationType.Duplicate && (
        <p className="text-sm text-green-700 mb-3">
          Suggested: <strong className="font-mono bg-green-100 px-1 rounded">{renderValue(suggestedValue)}</strong>
        </p>
      )}
       {type === RecommendationType.Duplicate && (
        <p className="text-sm text-orange-700 mb-3">
          Action: <strong className="font-mono bg-orange-100 px-1 rounded">{renderValue(suggestedValue)}</strong>
        </p>
      )}


      {status === 'pending' && (
        <div className="flex justify-end space-x-3 mt-4">
          <button
            onClick={() => onIgnore(id)}
            className="px-4 py-2 text-sm font-medium text-red-700 bg-red-100 hover:bg-red-200 rounded-lg transition duration-150 ease-in-out flex items-center"
          >
            <XCircleIcon className="w-5 h-5 mr-1" /> Ignore
          </button>
          <button
            onClick={() => onApply(id)}
            className="px-4 py-2 text-sm font-medium text-white bg-green-500 hover:bg-green-600 rounded-lg transition duration-150 ease-in-out flex items-center"
          >
            <CheckCircleIcon className="w-5 h-5 mr-1" /> Apply
          </button>
        </div>
      )}
      {status === 'applied' && (
        <p className="text-sm text-green-600 font-medium mt-4 flex items-center">
          <CheckCircleIcon className="w-5 h-5 mr-1" /> Applied
        </p>
      )}
      {status === 'ignored' && (
        <p className="text-sm text-red-600 font-medium mt-4 flex items-center">
          <XCircleIcon className="w-5 h-5 mr-1" /> Ignored
        </p>
      )}
    </div>
  );
};

export default RecommendationCard;
