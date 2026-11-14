import React from 'react';
import { ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';
import { SortDirection } from '../../hooks/useTableControls';

interface SortableHeaderProps<F extends string> {
  label: string;
  field: F;
  activeField?: F;
  direction?: SortDirection;
  onSort: (field: F) => void;
  align?: 'left' | 'right' | 'center';
  className?: string;
}

/**
 * En-tête de colonne cliquable affichant l'indicateur visuel de tri croissant / décroissant.
 */
export function SortableHeader<F extends string>({
  label,
  field,
  activeField,
  direction = 'desc',
  onSort,
  align = 'left',
  className = '',
}: SortableHeaderProps<F>) {
  const isActive = activeField === field;
  const justifyClass =
    align === 'right' ? 'justify-end' : align === 'center' ? 'justify-center' : 'justify-start';

  return (
    <th
      className={`px-4 py-3.5 text-${align} ${className}`}
      aria-sort={isActive ? (direction === 'asc' ? 'ascending' : 'descending') : 'none'}
    >
      <button
        type="button"
        onClick={() => onSort(field)}
        className={`inline-flex items-center gap-1.5 font-semibold uppercase tracking-wider text-xs transition-colors cursor-pointer group ${justifyClass} ${
          isActive ? 'text-amber-700' : 'text-slate-500 hover:text-slate-900'
        }`}
      >
        <span>{label}</span>
        {isActive ? (
          direction === 'asc' ? (
            <ArrowUp className="w-3.5 h-3.5 text-amber-600 shrink-0" />
          ) : (
            <ArrowDown className="w-3.5 h-3.5 text-amber-600 shrink-0" />
          )
        ) : (
          <ArrowUpDown className="w-3.5 h-3.5 text-slate-400 opacity-60 group-hover:opacity-100 shrink-0" />
        )}
      </button>
    </th>
  );
}
