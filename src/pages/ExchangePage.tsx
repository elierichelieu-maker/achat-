import React from 'react';
import { CurrencyExchangeView } from '../components/currency/CurrencyExchangeView';

/**
 * Page Change USD / DOP : conversion multi-devises en HTG, calcul de rendu monnaie et registre des opérations.
 */
export type ExchangePageProps = React.ComponentProps<typeof CurrencyExchangeView>;

export const ExchangePage: React.FC<ExchangePageProps> = (props) => {
  return <CurrencyExchangeView {...props} />;
};
