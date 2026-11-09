/**
 * Utility functions for currency and numeric formatting
 * Configured for Haitian Gourdes (HTG / G)
 */

export function formatHTG(
  amount: number | undefined | null,
  options?: { showCents?: boolean; compact?: boolean }
): string {
  if (amount === undefined || amount === null || isNaN(amount)) {
    return '0 HTG';
  }

  const { showCents = false, compact = false } = options || {};

  if (compact && Math.abs(amount) >= 1_000_000) {
    return `${(amount / 1_000_000).toFixed(1).replace('.', ',')}M HTG`;
  }
  if (compact && Math.abs(amount) >= 100_000) {
    return `${(amount / 1_000).toFixed(0)}k HTG`;
  }

  const formatted = amount.toLocaleString('fr-FR', {
    minimumFractionDigits: showCents ? 2 : 0,
    maximumFractionDigits: 2,
  });

  return `${formatted} HTG`;
}

export function formatUSD(amount: number | undefined | null): string {
  if (amount === undefined || amount === null || isNaN(amount)) {
    return '$0.00';
  }
  return amount.toLocaleString('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export function formatDOP(amount: number | undefined | null): string {
  if (amount === undefined || amount === null || isNaN(amount)) {
    return 'RD$ 0.00';
  }
  return `RD$ ${amount.toLocaleString('fr-FR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

export const formatCurrency = formatHTG;
