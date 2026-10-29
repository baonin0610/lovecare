import React from 'react';

/**
 * Reusable Atomic Shimmer Box
 */
export const SkeletonBox = ({ className = '' }) => (
  <div className={`shimmer rounded-xl ${className}`} />
);

export const SkeletonDarkBox = ({ className = '' }) => (
  <div className={`shimmer-dark rounded-xl ${className}`} />
);

/**
 * Caretaker Top Overview Card Skeleton (Dark Theme)
 */
export const CaretakerOverviewSkeleton = () => (
  <div className="rounded-3xl bg-gradient-to-br from-gray-900 via-slate-900 to-gray-950 p-5 sm:p-6 shadow-xl mb-5 border border-white/10 relative overflow-hidden">
    <div className="flex items-start justify-between gap-3 mb-4">
      <div className="flex items-start gap-3.5">
        {/* Cat Avatar Placeholder */}
        <SkeletonDarkBox className="w-14 h-14 rounded-2xl shrink-0" />
        <div className="space-y-2 pt-1">
          {/* Badge */}
          <SkeletonDarkBox className="w-28 h-5 rounded-full" />
          {/* Title */}
          <SkeletonDarkBox className="w-48 h-5 rounded-lg" />
          {/* Subtitle */}
          <SkeletonDarkBox className="w-36 h-3 rounded" />
        </div>
      </div>
      {/* Quick Action Button */}
      <SkeletonDarkBox className="w-24 h-8 rounded-full shrink-0" />
    </div>

    {/* Metrics Grid (3 columns) */}
    <div className="grid grid-cols-3 gap-2.5 mt-4">
      {[1, 2, 3].map((i) => (
        <div key={i} className="bg-white/5 rounded-2xl p-3 border border-white/10 space-y-2">
          <SkeletonDarkBox className="w-16 h-3 rounded" />
          <SkeletonDarkBox className="w-20 h-6 rounded-lg" />
          <SkeletonDarkBox className="w-full h-1.5 rounded-full" />
        </div>
      ))}
    </div>

    {/* Footer Bar */}
    <div className="mt-4 pt-3 border-t border-white/10 flex items-center justify-between">
      <SkeletonDarkBox className="w-32 h-4 rounded" />
      <SkeletonDarkBox className="w-20 h-4 rounded-full" />
    </div>
  </div>
);

/**
 * Lover Top Greeting & Water Card Skeleton
 */
export const LoverOverviewSkeleton = () => (
  <div className="space-y-4 mb-5">
    {/* Greeting Card with Animated Character Placeholder */}
    <div className="bg-gradient-to-br from-rose-50 via-white to-pink-50 rounded-3xl p-5 border border-rose-100 shadow-sm">
      <div className="flex items-center gap-3.5">
        <SkeletonBox className="w-14 h-14 rounded-2xl shrink-0 !bg-rose-100/60" />
        <div className="space-y-2 flex-1">
          <SkeletonBox className="w-28 h-5 rounded-full !bg-rose-100/70" />
          <SkeletonBox className="w-44 h-5 rounded-lg !bg-rose-100/60" />
          <SkeletonBox className="w-56 h-3 rounded !bg-rose-100/50" />
        </div>
      </div>
    </div>

    {/* Water Card with Ring Placeholder */}
    <div className="bg-white rounded-3xl p-5 border border-sky-100 shadow-sm">
      <div className="flex items-center justify-between">
        <div className="space-y-2.5">
          <SkeletonBox className="w-24 h-4 rounded-full !bg-sky-100/60" />
          <SkeletonBox className="w-36 h-7 rounded-xl !bg-sky-100/70" />
          <SkeletonBox className="w-48 h-3 rounded !bg-sky-100/40" />
        </div>
        <SkeletonBox className="w-20 h-20 rounded-full shrink-0 !bg-sky-100/60" />
      </div>
    </div>
  </div>
);

/**
 * Segmented Navigation Tabs Skeleton
 */
export const TabsSkeleton = () => (
  <div className="flex gap-1 p-1 bg-slate-100/90 rounded-2xl mb-5 border border-slate-200/60 shadow-2xs">
    <SkeletonBox className="flex-1 h-9 rounded-xl !bg-white/80" />
    <SkeletonBox className="flex-1 h-9 rounded-xl !bg-slate-200/50" />
    <SkeletonBox className="flex-1 h-9 rounded-xl !bg-slate-200/50" />
  </div>
);

/**
 * Realtime Tracker Bar Skeleton
 */
export const LiveTrackerBarSkeleton = () => (
  <div className="flex items-center justify-between px-3.5 py-2.5 rounded-2xl bg-white border border-gray-200/70 mb-3 shadow-xs">
    <div className="flex items-center gap-2">
      <SkeletonBox className="w-2.5 h-2.5 rounded-full shrink-0" />
      <SkeletonBox className="w-36 h-4 rounded" />
      <SkeletonBox className="w-14 h-5 rounded-md" />
    </div>
    <SkeletonBox className="w-20 h-5 rounded-full" />
  </div>
);

/**
 * Schedule Items Skeleton
 */
export const ScheduleSkeleton = ({ count = 3 }) => (
  <div className="space-y-3">
    <LiveTrackerBarSkeleton />

    {/* Group section header */}
    <div className="space-y-2.5">
      <SkeletonBox className="w-full h-11 rounded-2xl !bg-amber-50/80 border border-amber-100" />

      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="p-3.5 rounded-2xl bg-white border border-gray-100 shadow-xs flex items-center justify-between gap-3"
        >
          <div className="flex items-center gap-3 flex-1 min-w-0">
            {/* Icon box */}
            <SkeletonBox className="w-10 h-10 rounded-xl shrink-0" />
            <div className="space-y-2 flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <SkeletonBox className="w-16 h-4 rounded" />
                <SkeletonBox className="w-32 h-4 rounded" />
              </div>
              <SkeletonBox className="w-40 h-3 rounded" />
            </div>
          </div>
          {/* Action button */}
          <SkeletonBox className="w-20 h-8 rounded-full shrink-0" />
        </div>
      ))}
    </div>
  </div>
);

/**
 * Moments Feed (Album) Skeleton
 */
export const MomentsFeedSkeleton = ({ count = 4 }) => (
  <div className="space-y-3">
    <div className="flex items-center justify-between px-1 mb-2">
      <SkeletonBox className="w-48 h-5 rounded-lg" />
      <SkeletonBox className="w-24 h-4 rounded-full" />
    </div>
    <div className="grid grid-cols-2 gap-3">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="bg-white rounded-2xl p-2 border border-gray-100 shadow-xs space-y-2">
          <SkeletonBox className="w-full aspect-square rounded-xl" />
          <div className="px-1 space-y-1.5">
            <SkeletonBox className="w-24 h-3.5 rounded" />
            <SkeletonBox className="w-16 h-3 rounded" />
          </div>
        </div>
      ))}
    </div>
  </div>
);

/**
 * Locket Chat Messages Skeleton
 */
export const ChatMessagesSkeleton = ({ count = 4 }) => (
  <div className="py-4 space-y-3.5 px-1">
    {Array.from({ length: count }).map((_, i) => {
      const isRight = i % 2 !== 0;
      return (
        <div
          key={i}
          className={`flex items-end gap-2 ${isRight ? 'justify-end' : 'justify-start'}`}
        >
          {!isRight && <SkeletonBox className="w-7 h-7 rounded-full shrink-0" />}
          <div
            className={`space-y-1.5 ${
              isRight ? 'items-end' : 'items-start'
            } flex flex-col`}
          >
            <SkeletonBox
              className={`h-9 rounded-2xl ${
                isRight
                  ? 'w-44 !bg-gradient-to-r !from-rose-200/70 !to-pink-200/70 rounded-br-xs'
                  : 'w-48 !bg-gray-200/80 rounded-bl-xs'
              }`}
            />
            <SkeletonBox className="w-12 h-2.5 rounded" />
          </div>
          {isRight && <SkeletonBox className="w-7 h-7 rounded-full shrink-0" />}
        </div>
      );
    })}
  </div>
);

/**
 * Daily Setlog Skeleton
 */
export const DailySetlogSkeleton = () => (
  <div className="space-y-4">
    {/* Date strip */}
    <div className="flex gap-2 overflow-x-hidden py-1">
      {Array.from({ length: 6 }).map((_, i) => (
        <div
          key={i}
          className="flex flex-col items-center justify-center min-w-[54px] py-2.5 px-1.5 rounded-2xl bg-white border border-gray-100 shrink-0 space-y-2"
        >
          <SkeletonBox className="w-6 h-3 rounded" />
          <SkeletonBox className="w-7 h-5 rounded-md" />
          <SkeletonBox className="w-2 h-2 rounded-full" />
        </div>
      ))}
    </div>

    {/* Summary Card */}
    <div className="bg-white rounded-3xl p-4.5 border border-pink-100 shadow-xs space-y-3">
      <div className="flex items-center justify-between">
        <SkeletonBox className="w-28 h-5 rounded" />
        <SkeletonBox className="w-20 h-6 rounded-full" />
      </div>
      <div className="grid grid-cols-2 gap-3 pt-1">
        <SkeletonBox className="h-16 rounded-2xl !bg-sky-50/70" />
        <SkeletonBox className="h-16 rounded-2xl !bg-amber-50/70" />
      </div>
    </div>
  </div>
);

/**
 * Full Caretaker Dashboard Skeleton View
 */
export const CaretakerDashboardSkeleton = () => (
  <div className="pb-24 animate-in fade-in duration-200">
    <CaretakerOverviewSkeleton />
    <TabsSkeleton />
    <ScheduleSkeleton count={3} />
  </div>
);

/**
 * Full Lover Dashboard Skeleton View
 */
export const LoverDashboardSkeleton = () => (
  <div className="pb-24 animate-in fade-in duration-200">
    <LoverOverviewSkeleton />
    <TabsSkeleton />
    <ScheduleSkeleton count={3} />
  </div>
);
