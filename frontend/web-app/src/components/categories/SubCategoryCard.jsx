import React from 'react';
import { motion } from 'framer-motion';

export default function SubCategoryCard({ subcategory, onBrowse, disabled }) {
  return (
    <motion.div
      whileHover={{ scale: 1.03, boxShadow: '0 2px 16px rgba(255, 215, 0, 0.08)' }}
      className={`bg-[#161B22] border border-[#222] rounded-xl p-4 flex flex-col gap-2 min-h-[140px] relative ${disabled ? 'opacity-60 pointer-events-none' : ''}`}
    >
      <h4 className="text-md font-semibold text-white">{subcategory.name}</h4>
      <div className="text-xs text-gray-400">{subcategory.exampleServices.join(', ')}</div>
      {subcategory.startingPrice && (
        <div className="text-xs text-gold-400">Starting at ₹{subcategory.startingPrice}</div>
      )}
      <button
        className="mt-2 px-3 py-1 rounded bg-gradient-to-r from-yellow-400 to-blue-600 text-black font-bold shadow hover:scale-105 transition disabled:opacity-50"
        onClick={() => !disabled && onBrowse(subcategory)}
        disabled={disabled}
      >
        Browse Providers
      </button>
      {/* Badges */}
      <div className="absolute top-2 right-2 flex gap-1">
        {subcategory.popular && <span className="bg-blue-600 text-xs px-2 py-1 rounded text-white">Popular</span>}
      </div>
    </motion.div>
  );
}
