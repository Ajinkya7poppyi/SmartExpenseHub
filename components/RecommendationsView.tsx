
import React, { useState, useMemo } from 'react';
import { Recommendation, RecommendationType } from '../types';
import RecommendationCard from './RecommendationCard';
import { LightBulbIcon, CheckCircleIcon, XCircleIcon } from './common/Icons';

interface RecommendationsViewProps {
  recommendations: Recommendation[];
  onApply: (recommendationId: string) => void;
  onIgnore: (recommendationId: string) => void;
  onApplyMultiple: (recommendationIds: string[]) => void;
  onIgnoreMultiple: (recommendationIds: string[]) => void;
}

const RecommendationTypeLabels: Record<RecommendationType, string> = {
  [RecommendationType.Duplicate]: "Duplicate Transactions",
  [RecommendationType.MerchantNormalization]: "Merchant Name Normalization",
  [RecommendationType.MissingField]: "Missing Field Suggestions",
  [RecommendationType.Classification]: "Classification Suggestions",
};

interface GroupedMerchantNormalization {
  canonicalName: string;
  originalValues: Set<string>;
  recommendationIds: string[];
  totalAffectedTransactions: number;
}

const RecommendationsView: React.FC<RecommendationsViewProps> = ({ 
  recommendations, 
  onApply, 
  onIgnore,
  onApplyMultiple,
  onIgnoreMultiple 
}) => {
  const [filterType, setFilterType] = useState<RecommendationType | 'all'>('all');
  const [filterStatus, setFilterStatus] = useState<'all' | 'pending' | 'applied' | 'ignored'>('pending');
  
  const pendingRecommendations = useMemo(() => recommendations.filter(r => r.status === 'pending'), [recommendations]);

  const { groupedMerchantNormalizations, individualRecommendations } = useMemo(() => {
    const grouped: Record<string, GroupedMerchantNormalization> = {};
    const individuals: Recommendation[] = [];

    const currentlyVisibleRecs = recommendations.filter(rec => {
      const typeMatch = filterType === 'all' || rec.type === filterType;
      const statusMatch = filterStatus === 'all' || rec.status === filterStatus;
      return typeMatch && statusMatch;
    });

    currentlyVisibleRecs.forEach(rec => {
      if (rec.type === RecommendationType.MerchantNormalization && rec.status === 'pending') {
        const canonical = String(rec.suggestedValue); // Ensure string key
        if (!grouped[canonical]) {
          grouped[canonical] = {
            canonicalName: canonical,
            originalValues: new Set(),
            recommendationIds: [],
            totalAffectedTransactions: 0,
          };
        }
        if(rec.originalValue) grouped[canonical].originalValues.add(String(rec.originalValue));
        grouped[canonical].recommendationIds.push(rec.id);
        grouped[canonical].totalAffectedTransactions += rec.transactionIds.length; // Sum up, or count unique tx if needed
      } else {
        individuals.push(rec);
      }
    });
    
    // Filter out groups with only one original value unless we want to show them grouped too
    const finalGroupedArray: GroupedMerchantNormalization[] = [];
    Object.values(grouped).forEach(group => {
        // A group is meaningful if it normalizes multiple *distinct* original names to one canonical name,
        // or if one original name appears in multiple recommendations that can be bulk-applied.
        // For simplicity, we'll group if there's more than one recommendation ID involved for a canonical name.
        if (group.recommendationIds.length > 1 || (group.recommendationIds.length === 1 && group.originalValues.size > 0)) {
            finalGroupedArray.push(group);
        } else if (group.recommendationIds.length === 1) {
            // If only one rec for this canonical, treat it as individual
            const rec = recommendations.find(r => r.id === group.recommendationIds[0]);
            if (rec) individuals.push(rec);
        }
    });


    return { groupedMerchantNormalizations: finalGroupedArray, individualRecommendations: individuals };
  }, [recommendations, filterType, filterStatus]);


  if (recommendations.length === 0) {
    return (
      <div className="text-center py-10">
        <LightBulbIcon className="w-16 h-16 text-gray-400 mx-auto mb-4" />
        <h2 className="text-xl font-semibold text-gray-700 mb-2">No Recommendations</h2>
        <p className="text-gray-500">All data looks good, or no data has been uploaded yet.</p>
      </div>
    );
  }
  
  if (pendingRecommendations.length === 0 && filterStatus === 'pending') {
     return (
      <div className="text-center py-10">
        <LightBulbIcon className="w-16 h-16 text-green-400 mx-auto mb-4" />
        <h2 className="text-xl font-semibold text-gray-700 mb-2">All Recommendations Addressed!</h2>
        <p className="text-gray-500">You've reviewed all pending suggestions. Great job!</p>
         <div className="mt-4">
            <button 
              onClick={() => setFilterStatus('all')} 
              className="bg-blue-500 hover:bg-blue-600 text-white font-semibold py-2 px-4 rounded-lg shadow-md transition duration-150 ease-in-out"
            >
              View All Recommendations
            </button>
          </div>
      </div>
    );
  }
  
  const noMatchingFilters = groupedMerchantNormalizations.length === 0 && individualRecommendations.length === 0;

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-semibold text-gray-800">Recommendations Center</h2>
      
      <div className="flex flex-wrap gap-4 p-4 bg-gray-50 rounded-lg shadow">
        <div>
          <label htmlFor="filterType" className="block text-sm font-medium text-gray-700">Filter by Type:</label>
          <select 
            id="filterType"
            value={filterType} 
            onChange={e => setFilterType(e.target.value as RecommendationType | 'all')}
            className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
          >
            <option value="all">All Types</option>
            {Object.entries(RecommendationTypeLabels).map(([type, label]) => (
              <option key={type} value={type}>{label}</option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="filterStatus" className="block text-sm font-medium text-gray-700">Filter by Status:</label>
          <select 
            id="filterStatus"
            value={filterStatus}
            onChange={e => setFilterStatus(e.target.value as 'all' | 'pending' | 'applied' | 'ignored')}
            className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
          >
            <option value="all">All Statuses</option>
            <option value="pending">Pending</option>
            <option value="applied">Applied</option>
            <option value="ignored">Ignored</option>
          </select>
        </div>
      </div>

      {noMatchingFilters ? (
        <p className="text-gray-600 text-center py-6">No recommendations match the current filter criteria.</p>
      ) : (
        <>
          {/* Grouped Merchant Normalizations */}
          {filterStatus === 'pending' && (filterType === 'all' || filterType === RecommendationType.MerchantNormalization) && groupedMerchantNormalizations.length > 0 && (
            <div className="space-y-6 mb-8">
              <h3 className="text-xl font-medium text-gray-700 border-b pb-2">Bulk Merchant Normalization</h3>
              {groupedMerchantNormalizations.map(group => (
                <div key={group.canonicalName} className="bg-blue-50 p-5 rounded-lg shadow border-l-4 border-blue-500">
                  <h4 className="text-lg font-semibold text-gray-800 mb-2">
                    Normalize to: <span className="font-bold text-blue-700">{group.canonicalName}</span>
                  </h4>
                  <p className="text-sm text-gray-600 mb-1">
                    This will change the following merchant name(s):
                  </p>
                  <ul className="list-disc list-inside text-sm text-gray-500 mb-2 pl-4">
                    {Array.from(group.originalValues).map(orig => <li key={orig} className="font-mono bg-gray-200 px-1 rounded inline-block mr-1 mb-1">{orig}</li>)}
                  </ul>
                  <p className="text-sm text-gray-600 mb-3">
                    Across <span className="font-semibold">{group.totalAffectedTransactions}</span> transaction(s).
                  </p>
                  <div className="flex justify-end space-x-3 mt-4">
                    <button
                      onClick={() => onIgnoreMultiple(group.recommendationIds)}
                      className="px-4 py-2 text-sm font-medium text-red-700 bg-red-100 hover:bg-red-200 rounded-lg transition duration-150 ease-in-out flex items-center"
                      aria-label={`Ignore all normalizations to ${group.canonicalName}`}
                    >
                      <XCircleIcon className="w-5 h-5 mr-1" /> Ignore Group
                    </button>
                    <button
                      onClick={() => onApplyMultiple(group.recommendationIds)}
                      className="px-4 py-2 text-sm font-medium text-white bg-green-500 hover:bg-green-600 rounded-lg transition duration-150 ease-in-out flex items-center"
                       aria-label={`Apply all normalizations to ${group.canonicalName}`}
                    >
                      <CheckCircleIcon className="w-5 h-5 mr-1" /> Apply Group
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Individual Recommendations */}
          {individualRecommendations.length > 0 && (
            <div className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 ${
                (filterStatus === 'pending' && (filterType === 'all' || filterType === RecommendationType.MerchantNormalization) && groupedMerchantNormalizations.length > 0) ? 'pt-6 border-t mt-6' : ''
            }`}>
              {individualRecommendations.map(rec => (
                <RecommendationCard
                  key={rec.id}
                  recommendation={rec}
                  onApply={onApply}
                  onIgnore={onIgnore}
                />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default RecommendationsView;
