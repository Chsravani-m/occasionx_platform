import React from 'react';

export default function CategorySkeleton() {
  return (
    <div className="animate-pulse bg-[#161B22] border border-[#222] rounded-xl p-4 flex flex-col items-center gap-3 min-h-[180px]">
      <div className="w-12 h-12 bg-[#222] rounded-full mb-2" />
      <div className="h-4 w-2/3 bg-[#222] rounded" />
      <div className="h-3 w-1/2 bg-[#222] rounded" />
      <div className="h-8 w-24 bg-[#222] rounded mt-2" />
    </div>
  );
}
