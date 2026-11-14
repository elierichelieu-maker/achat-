/**
 * Fonctions utilitaires de formatage des montants (HTG, USD, DOP) et des dates en français.
 */

/**
 * Formate un montant en Gourdes Haïtiennes (ex : 12 500,00 HTG).
 * Par défaut, affiche toujours deux décimales (showCents = true) avec séparateur de milliers.
 */
export function formatHTG(
  amount: number | undefined | null,
  options?: { showCents?: boolean; compact?: boolean }
): string {
  if (amount === undefined || amount === null || Number.isNaN(amount)) {
    return '0,00 HTG';
  }

  const { showCents = true, compact = false } = options || {};

  if (compact && Math.abs(amount) >= 1_000_000) {
    return `${(amount / 1_000_000).toFixed(1).replace('.', ',')}M HTG`;
  }
  if (compact && Math.abs(amount) >= 100_000) {
    return `${(amount / 1_000).toFixed(0)}k HTG`;
  }

  const formatted = amount
    .toLocaleString('fr-FR', {
      minimumFractionDigits: showCents ? 2 : 0,
      maximumFractionDigits: showCents ? 2 : 0,
    })
    .replace(/\u202f|\u00a0/g, ' ');

  return `${formatted} HTG`;
}

/**
 * Formate un montant en Dollars Américains (USD).
 */
export function formatUSD(amount: number | undefined | null): string {
  if (amount === undefined || amount === null || Number.isNaN(amount)) {
    return '$0.00';
  }
  return amount.toLocaleString('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

/**
 * Formate un montant en Pesos Dominicains (DOP).
 */
export function formatDOP(amount: number | undefined | null): string {
  if (amount === undefined || amount === null || Number.isNaN(amount)) {
    return 'RD$ 0,00';
  }
  const formatted = amount
    .toLocaleString('fr-FR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })
    .replace(/\u202f|\u00a0/g, ' ');
  return `RD$ ${formatted}`;
}

/**
 * Formate une date ISO ou YYYY-MM-DD au format français (ex : 14/11/2026 ou 14 nov. 2026).
 */
export function formatDateFR(
  dateInput: string | Date | undefined | null,
  options?: Intl.DateTimeFormatOptions
): string {
  if (!dateInput) return '—';
  const normalized =
    typeof dateInput === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(dateInput)
      ? `${dateInput}T00:00:00`
      : dateInput;
  const date = normalized instanceof Date ? normalized : new Date(normalized);
  if (Number.isNaN(date.getTime())) return '—';

  return date.toLocaleDateString(
    'fr-FR',
    options || { day: '2-digit', month: '2-digit', year: 'numeric' }
  );
}

/**
 * Formate une date et heure au format français (ex : 14 nov. 2026 à 14:30).
 */
export function formatDateTimeFR(dateInput: string | Date | undefined | null): string {
  if (!dateInput) return '—';
  const date = dateInput instanceof Date ? dateInput : new Date(dateInput);
  if (Number.isNaN(date.getTime())) return '—';

  return date.toLocaleString('fr-FR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export const formatCurrency = formatHTG;
