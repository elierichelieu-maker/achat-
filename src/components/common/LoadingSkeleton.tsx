import React from 'react';

/**
 * Squelette d'attente pour le chargement paresseux d'une page.
 */
export const ViewLoadingFallback: React.FC<{ label?: string }> = ({
  label = 'Chargement de la section...',
}) => (
  <div className="flex flex-col items-center justify-center min-h-[280px] py-12 text-center bg-white border border-slate-200 rounded-2xl">
    <div className="w-8 h-8 border-3 border-amber-500 border-t-transparent rounded-full animate-spin mb-3" />
    <span className="text-xs text-slate-500 font-medium">{label}</span>
  </div>
);

/**
 * Squelette de chargement pour les tableaux de gestion.
 */
export const TableSkeleton: React.FC<{ rows?: number }> = ({ rows = 6 }) => (
  <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden animate-pulse">
    <div className="p-4 border-b border-slate-100 flex flex-wrap gap-3 justify-between">
      <div className="h-9 bg-slate-200 rounded-xl w-64" />
      <div className="h-9 bg-slate-200 rounded-xl w-40" />
    </div>
    <div className="divide-y divide-slate-100">
      {Array.from({ length: rows }).map((_, idx) => (
        <div key={idx} className="px-4 py-3.5 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 flex-1">
            <div className="w-9 h-9 rounded-xl bg-slate-200 shrink-0" />
            <div className="space-y-2 flex-1 max-w-xs">
              <div className="h-3.5 bg-slate-200 rounded w-3/4" />
              <div className="h-2.5 bg-slate-100 rounded w-1/2" />
            </div>
          </div>
          <div className="h-4 bg-slate-200 rounded w-20 hidden sm:block" />
          <div className="h-4 bg-slate-200 rounded w-24" />
        </div>
      ))}
    </div>
  </div>
);

/**
 * Squelette de chargement initial pour le tableau de bord principal.
 */
export const DashboardSkeleton: React.FC = () => (
  <div className="space-y-6 animate-pulse">
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {Array.from({ length: 4 }).map((_, idx) => (
        <div key={idx} className="bg-white border border-slate-200 rounded-2xl p-5 space-y-3">
          <div className="h-3 bg-slate-200 rounded w-1/2" />
          <div className="h-7 bg-slate-200 rounded w-3/4" />
          <div className="h-2.5 bg-slate-100 rounded w-2/3" />
        </div>
      ))}
    </div>
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <div className="bg-white border border-slate-200 rounded-2xl p-5 h-72" />
      <div className="bg-white border border-slate-200 rounded-2xl p-5 h-72" />
    </div>
  </div>
);
