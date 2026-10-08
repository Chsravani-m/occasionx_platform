import React from 'react';
import { motion } from 'framer-motion';

export default function CategoryCard({ category, onClick, disabled }) {
  return (
    <motion.div
      whileHover={{ scale: 1.04, boxShadow: '0 4px 24px rgba(33, 150, 243, 0.08)' }}
      className={`bg-[#161B22] border border-[#222] rounded-xl p-5 flex flex-col items-center gap-3 cursor-pointer transition-all relative min-h-[200px] ${disabled ? 'opacity-60 pointer-events-none' : ''}`}
      onClick={() => !disabled && onClick(category)}
      tabIndex={0}
      aria-label={category.name}
    >
      {/* Badges - move above card, use flex-row */}
      <div className="flex flex-row gap-2 mb-2 justify-center">
        {category.popular && <span className="bg-blue-600 text-xs px-2 py-1 rounded text-white">Popular</span>}
        {category.new && <span className="bg-yellow-400 text-xs px-2 py-1 rounded text-black">New</span>}
        {category.offers && <span className="bg-green-600 text-xs px-2 py-1 rounded text-white">Offers</span>}
        {category.premium && <span className="bg-purple-600 text-xs px-2 py-1 rounded text-white">Premium</span>}
      </div>
      {/* Icon - remove extra margin, center */}
      <img
        src={category.icon}
        alt={category.name + ' icon'}
        loading="lazy"
        className="w-14 h-14 mb-2 mx-auto"
        style={{ objectFit: 'contain' }}
      />
      <h3 className="text-lg font-semibold text-white text-center">{category.name}</h3>
      <p className="text-sm text-gray-400 text-center">{category.description}</p>
      <button
        className="mt-2 px-4 py-2 rounded bg-gradient-to-r from-blue-600 to-yellow-400 text-white font-bold shadow hover:scale-105 transition disabled:opacity-50"
        disabled={disabled}
      >
        View Services
      </button>
    </motion.div>
  );
}
