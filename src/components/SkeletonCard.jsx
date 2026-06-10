import React from 'react';

export const SkeletonCard = () => (
  <div className="bg-white rounded-3xl p-4 border border-gray-100 shadow-sm animate-pulse">
    <div className="flex gap-3 items-start">
      <div className="skeleton w-14 h-14 rounded-2xl flex-shrink-0" style={{background:'#f0f0f0'}} />
      <div className="flex-1 space-y-2">
        <div className="skeleton h-4 w-3/4 rounded-lg" style={{background:'#f0f0f0'}} />
        <div className="skeleton h-3 w-1/2 rounded-lg" style={{background:'#e8e8e8'}} />
        <div className="skeleton h-3 w-2/3 rounded-lg" style={{background:'#e8e8e8'}} />
      </div>
      <div className="skeleton h-6 w-16 rounded-lg" style={{background:'#f0f0f0'}} />
    </div>
    <div className="skeleton h-11 w-full rounded-2xl mt-4" style={{background:'#f0f0f0'}} />
  </div>
);

export const SkeletonList = ({ count = 3 }) => (
  <div className="space-y-3">
    {Array.from({length: count}).map((_, i) => <SkeletonCard key={i} />)}
  </div>
);
