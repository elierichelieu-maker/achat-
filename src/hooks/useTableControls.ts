import { useState, useMemo, useEffect } from 'react';

export type SortDirection = 'asc' | 'desc';

export interface UseTableControlsOptions<T, F extends string = string> {
  items: T[];
  defaultSortField?: F;
  defaultSortDirection?: SortDirection;
  defaultPageSize?: number;
  /** Fonction personnalisée pour extraire la valeur triable d'un champ */
  getSortValue?: (item: T, field: F) => string | number | Date | undefined | null;
}

/**
 * Hook réutilisable pour gérer le tri multi-colonnes et la pagination d'un tableau.
 * Réinitialise automatiquement la page courante à 1 si la liste filtrée rétrécit.
 */
export function useTableControls<T, F extends string = string>({
  items,
  defaultSortField,
  defaultSortDirection = 'desc',
  defaultPageSize = 10,
  getSortValue,
}: UseTableControlsOptions<T, F>) {
  const [sortField, setSortField] = useState<F | undefined>(defaultSortField);
  const [sortDirection, setSortDirection] = useState<SortDirection>(defaultSortDirection);
  const [page, setPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(defaultPageSize);

  // Bascule le tri sur une colonne : inverse la direction si déjà active, sinon trie par défaut
  const toggleSort = (field: F) => {
    if (sortField === field) {
      setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
    setPage(1);
  };

  // Liste triée selon le champ et la direction sélectionnés
  const sortedItems = useMemo(() => {
    if (!sortField) return items;

    const copy = [...items];
    copy.sort((a, b) => {
      const valA = getSortValue
        ? getSortValue(a, sortField)
        : (a as Record<string, unknown>)[sortField];
      const valB = getSortValue
        ? getSortValue(b, sortField)
        : (b as Record<string, unknown>)[sortField];

      if (valA === valB) return 0;
      if (valA === null || valA === undefined) return 1;
      if (valB === null || valB === undefined) return -1;

      let comparison = 0;
      if (valA instanceof Date && valB instanceof Date) {
        comparison = valA.getTime() - valB.getTime();
      } else if (typeof valA === 'number' && typeof valB === 'number') {
        comparison = valA - valB;
      } else {
        comparison = String(valA).localeCompare(String(valB), 'fr', {
          numeric: true,
          sensitivity: 'base',
        });
      }

      return sortDirection === 'asc' ? comparison : -comparison;
    });

    return copy;
  }, [items, sortField, sortDirection, getSortValue]);

  const totalItems = sortedItems.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));

  // Recadre automatiquement la page courante si les filtres réduisent le nombre total de résultats
  useEffect(() => {
    if (page > totalPages) {
      setPage(totalPages);
    }
  }, [page, totalPages]);

  const paginatedItems = useMemo(() => {
    const safePage = Math.min(Math.max(1, page), totalPages);
    const startIndex = (safePage - 1) * pageSize;
    return sortedItems.slice(startIndex, startIndex + pageSize);
  }, [sortedItems, page, pageSize, totalPages]);

  const handlePageSizeChange = (newSize: number) => {
    setPageSize(newSize);
    setPage(1);
  };

  return {
    sortField,
    sortDirection,
    setSortField,
    setSortDirection,
    toggleSort,
    page: Math.min(page, totalPages),
    pageSize,
    totalPages,
    totalItems,
    sortedItems,
    paginatedItems,
    setPage,
    setPageSize: handlePageSizeChange,
  };
}
