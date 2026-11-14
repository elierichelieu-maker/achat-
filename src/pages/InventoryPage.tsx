import React from 'react';
import { StockManagementView } from '../components/stocks/StockManagementView';

/**
 * Page Inventaire : gestion des stocks boissons, seuils personnalisés, péremptions et consignes.
 */
export type InventoryPageProps = React.ComponentProps<typeof StockManagementView>;

export const InventoryPage: React.FC<InventoryPageProps> = (props) => {
  return <StockManagementView {...props} />;
};
