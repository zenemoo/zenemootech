import React from 'react';

interface AvatarSkeletonProps {
  size?: number | string;
  className?: string;
}

export const AvatarSkeleton: React.FC<AvatarSkeletonProps> = ({
  size = 48,
  className = '',
}) => {
  const sizeStyle = typeof size === 'number' ? { width: `${size}px`, height: `${size}px` } : undefined;
  const sizeClass = typeof size === 'string' ? size : '';

  return (
    <div
      aria-hidden="true"
      style={sizeStyle}
      className={`skeleton-shimmer rounded-full shrink-0 ${sizeClass} ${className}`}
    />
  );
};

export const TeamCardSkeleton: React.FC<{ className?: string }> = ({ className = '' }) => {
  return (
    <div
      aria-hidden="true"
      className={`glass-panel p-6 rounded-2xl border border-white/10 flex flex-col justify-between space-y-4 animate-pulse ${className}`}
    >
      {/* Top Header: Avatar + Badge */}
      <div className="flex items-center justify-between">
        <div className="skeleton-shimmer w-16 h-16 rounded-full" />
        <div className="skeleton-shimmer w-20 h-6 rounded-full" />
      </div>

      {/* Info Lines */}
      <div className="space-y-2 mt-2">
        <div className="skeleton-shimmer h-5 w-3/4 rounded-md" />
        <div className="skeleton-shimmer h-4 w-1/2 rounded-md" />
        <div className="skeleton-shimmer h-3 w-1/3 rounded-md opacity-70" />
      </div>

      {/* Skills Chips */}
      <div className="flex flex-wrap gap-2 pt-2">
        <div className="skeleton-shimmer h-6 w-16 rounded-full" />
        <div className="skeleton-shimmer h-6 w-20 rounded-full" />
        <div className="skeleton-shimmer h-6 w-14 rounded-full" />
      </div>

      {/* Footer / Button */}
      <div className="pt-4 border-t border-white/10 flex items-center justify-between">
        <div className="skeleton-shimmer h-4 w-24 rounded-md" />
        <div className="skeleton-shimmer h-8 w-24 rounded-xl" />
      </div>
    </div>
  );
};

export const TeamDirectorySkeleton: React.FC<{ count?: number }> = ({ count = 8 }) => {
  const items = Array.from({ length: count });

  return (
    <div aria-hidden="true" className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 w-full">
      {items.map((_, i) => (
        <TeamCardSkeleton key={i} />
      ))}
    </div>
  );
};

export const ProfilePageSkeleton: React.FC = () => {
  return (
    <div aria-hidden="true" className="w-full max-w-6xl mx-auto space-y-8 p-4 md:p-8 animate-pulse">
      {/* Cover & Header Box */}
      <div className="glass-panel rounded-3xl overflow-hidden border border-white/10">
        {/* Cover image placeholder */}
        <div className="skeleton-shimmer h-48 sm:h-64 w-full" />

        {/* Profile Details Header */}
        <div className="p-6 md:p-8 relative -mt-16 flex flex-col sm:flex-row items-start sm:items-end justify-between gap-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-end gap-6">
            {/* Avatar placeholder */}
            <div className="skeleton-shimmer w-32 h-32 rounded-full border-4 border-[#0c0d12] shadow-2xl shrink-0" />
            <div className="space-y-2 mb-2">
              <div className="skeleton-shimmer h-8 w-64 rounded-lg" />
              <div className="skeleton-shimmer h-4 w-40 rounded-md" />
              <div className="skeleton-shimmer h-4 w-28 rounded-md opacity-60" />
            </div>
          </div>

          <div className="flex gap-3 w-full sm:w-auto">
            <div className="skeleton-shimmer h-10 w-28 rounded-xl flex-1 sm:flex-initial" />
            <div className="skeleton-shimmer h-10 w-28 rounded-xl flex-1 sm:flex-initial" />
          </div>
        </div>
      </div>

      {/* Navigation Tabs Placeholder */}
      <div className="flex gap-4 border-b border-white/10 pb-3">
        <div className="skeleton-shimmer h-8 w-28 rounded-lg" />
        <div className="skeleton-shimmer h-8 w-28 rounded-lg" />
        <div className="skeleton-shimmer h-8 w-28 rounded-lg" />
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Bio / Info Cards */}
        <div className="space-y-6">
          <div className="glass-panel p-6 rounded-2xl border border-white/10 space-y-4">
            <div className="skeleton-shimmer h-6 w-36 rounded-md" />
            <div className="skeleton-shimmer h-4 w-full rounded-md" />
            <div className="skeleton-shimmer h-4 w-5/6 rounded-md" />
            <div className="skeleton-shimmer h-4 w-4/6 rounded-md" />
          </div>

          <div className="glass-panel p-6 rounded-2xl border border-white/10 space-y-4">
            <div className="skeleton-shimmer h-6 w-32 rounded-md" />
            <div className="space-y-3">
              <div className="skeleton-shimmer h-4 w-full rounded-md" />
              <div className="skeleton-shimmer h-4 w-full rounded-md" />
              <div className="skeleton-shimmer h-4 w-3/4 rounded-md" />
            </div>
          </div>
        </div>

        {/* Right Details Grid */}
        <div className="lg:col-span-2 space-y-6">
          <div className="glass-panel p-6 rounded-2xl border border-white/10 space-y-6">
            <div className="skeleton-shimmer h-7 w-48 rounded-md" />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="skeleton-shimmer h-16 rounded-xl" />
              <div className="skeleton-shimmer h-16 rounded-xl" />
              <div className="skeleton-shimmer h-16 rounded-xl" />
              <div className="skeleton-shimmer h-16 rounded-xl" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
