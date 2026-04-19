/**
 * Skeleton loading placeholder matching ExpenseItem layout
 */

import React from 'react';

interface ExpenseItemSkeletonProps {
  count?: number;
}

const SkeletonRow: React.FC = () => (
  <div className="flex items-center justify-between p-3 border border-gray-100 rounded-lg bg-white animate-pulse">
    <div className="flex-grow min-w-0 space-y-2">
      <div className="h-3 w-24 bg-gray-200 rounded" />
      <div className="h-4 w-40 bg-gray-200 rounded" />
      <div className="flex items-center space-x-2">
        <div className="h-5 w-16 bg-gray-200 rounded-full" />
        <div className="h-3 w-10 bg-gray-200 rounded" />
      </div>
    </div>
    <div className="flex items-center space-x-3 ml-4">
      <div className="h-6 w-20 bg-gray-200 rounded" />
      <div className="h-5 w-5 bg-gray-200 rounded-full" />
      <div className="h-5 w-5 bg-gray-200 rounded-full" />
    </div>
  </div>
);

export const ExpenseItemSkeleton: React.FC<ExpenseItemSkeletonProps> = ({ count = 5 }) => (
  <div className="space-y-3">
    {Array.from({ length: count }, (_, i) => (
      <SkeletonRow key={i} />
    ))}
  </div>
);
