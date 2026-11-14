import React from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';

export interface CollapsibleSectionProps {
  id: string;
  title: string;
  description?: string;
  summaryText?: string;
  icon: React.ComponentType<{ className?: string }>;
  isMinimized: boolean;
  onToggleMinimize: () => void;
  isActive?: boolean;
  children: React.ReactNode;
}

/**
 * Conteneur de section repliable pour la page unique continue :
 * permet de minimiser ou déplier chaque module métier sans perdre sa place dans la page.
 */
export const CollapsibleSection: React.FC<CollapsibleSectionProps> = ({
  id,
  title,
  description,
  summaryText,
  icon: Icon,
  isMinimized,
  onToggleMinimize,
  isActive = false,
  children,
}) => {
  return (
    <section
      id={id}
      data-section-id={id.replace('section-', '')}
      className={`scroll-mt-16 md:scroll-mt-6 rounded-2xl border transition-colors duration-200 ${
        isActive
          ? 'border-amber-300/80 bg-white'
          : 'border-slate-200 bg-white'
      }`}
    >
      {/* En-tête de la section avec bouton Minimiser / Déplier */}
      <div
        className={`px-4 sm:px-6 py-3.5 flex items-center justify-between gap-3 ${
          isMinimized ? '' : 'border-b border-slate-100'
        }`}
      >
        <div className="flex items-center gap-3 min-w-0">
          <span
            className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 transition-colors ${
              isActive
                ? 'bg-amber-600 text-white'
                : 'bg-slate-100 text-amber-700'
            }`}
          >
            <Icon className="w-4 h-4" />
          </span>

          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-sm sm:text-base font-bold text-slate-900 truncate">
                {title}
              </h2>
              {summaryText && (
                <>
                  <span className="text-slate-300 text-xs hidden sm:inline" aria-hidden="true">
                    ·
                  </span>
                  <span className="text-xs text-slate-500 font-medium tabular-nums hidden sm:inline">
                    {summaryText}
                  </span>
                </>
              )}
            </div>
            {description && (
              <p className="text-xs text-slate-500 truncate">
                {description}
                {summaryText ? (
                  <span className="sm:hidden"> · {summaryText}</span>
                ) : null}
              </p>
            )}
          </div>
        </div>

        <button
          type="button"
          onClick={onToggleMinimize}
          aria-expanded={!isMinimized}
          aria-controls={`${id}-body`}
          className="min-h-[40px] px-3 py-1.5 rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs font-semibold flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500"
          title={isMinimized ? `Déplier ${title}` : `Minimiser ${title}`}
        >
          {isMinimized ? (
            <>
              <ChevronDown className="w-4 h-4 text-amber-600" />
              <span>Déplier</span>
            </>
          ) : (
            <>
              <ChevronUp className="w-4 h-4 text-slate-500" />
              <span className="hidden sm:inline">Minimiser</span>
            </>
          )}
        </button>
      </div>

      {/* Contenu de la section (masqué proprement lorsqu'elle est minimisée) */}
      {!isMinimized && (
        <div id={`${id}-body`} className="p-3 sm:p-5 lg:p-6">
          {children}
        </div>
      )}
    </section>
  );
};
