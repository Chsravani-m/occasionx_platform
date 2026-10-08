import React from 'react';

export default function SubCategoryItem({ subcategory, onViewProviders, loading }) {
  return (
    <div className="flex items-center gap-4 p-3 rounded-lg border border-[#222] bg-[#161B22] mb-2 shadow-sm">
      <div className="flex-1">
        <div className="font-semibold text-white text-md">{subcategory.name}</div>
        {subcategory.description && <div className="text-xs text-gray-400">{subcategory.description}</div>}
      </div>
      <button
        className="px-3 py-1 rounded bg-gradient-to-r from-yellow-400 to-blue-600 text-black font-bold shadow hover:scale-105 transition disabled:opacity-50"
        onClick={() => onViewProviders(subcategory)}
        disabled={loading}
      >
        View Providers
      </button>
    </div>
  );
}
