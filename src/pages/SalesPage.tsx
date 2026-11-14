import React from 'react';
import { SalesHistoryView } from '../components/sales/SalesHistoryView';

/**
 * Page Ventes & Commandes : terminal POS de prise de commande et historique détaillé des ventes.
 */
export type SalesPageProps = React.ComponentProps<typeof SalesHistoryView>;

export const SalesPage: React.FC<SalesPageProps> = (props) => {
  return <SalesHistoryView {...props} />;
};
