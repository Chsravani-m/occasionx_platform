import React from 'react';

export default function CategoryItem({ category, selected, onClick }) {
  return (
    <div
      className={`flex items-center gap-4 p-4 rounded-lg border transition cursor-pointer bg-[#161B22] border-[#222] mb-2 shadow-sm hover:scale-[1.02] ${selected ? 'border-yellow-400 bg-[#222]' : ''}`}
      onClick={() => onClick(category)}
      tabIndex={0}
      aria-label={category.name}
    >
      <img
        src={category.icon}
        alt={category.name + ' icon'}
        className="w-10 h-10 object-contain rounded"
        loading="lazy"
      />
      <div className="flex-1">
        <div className="font-semibold text-white text-lg">{category.name}</div>
        <div className="text-sm text-gray-400">{category.description}</div>
      </div>
    </div>
  );
}
