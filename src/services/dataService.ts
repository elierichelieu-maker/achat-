/**
 * Couche de services centralisée pour toutes les opérations de persistance et synchronisation Cloud (Firestore + cache local).
 * Aucun composant UI ne doit appeler directement le SDK base de données : tout transite par ce module.
 */

import {
  seedInitialDataIfEmpty,
  subscribeToProducts,
  subscribeToSellers,
  subscribeToCustomers,
  subscribeToSales,
  subscribeToMovements,
  subscribeToSettings,
  subscribeToExchangeRates,
  subscribeToExchangeTransactions,
  syncSaveProduct,
  syncDeleteProduct,
  syncSaveSeller,
  syncDeleteSeller,
  syncSaveCustomer,
  syncDeleteCustomer,
  syncSaveSale,
  syncSaveMovement,
  syncSaveSettings,
  syncSaveExchangeRates,
  syncSaveExchangeTransaction,
  syncDeleteExchangeTransaction,
  syncResetAllDataToDefault,
  pingCloudConnection,
  fetchCloudStats,
  forceFullCloudSync,
} from './cloudSyncService';

// Service Produits & Stocks
export const productsService = {
  subscribe: subscribeToProducts,
  save: syncSaveProduct,
  remove: syncDeleteProduct,
};

// Service Équipe & Utilisateurs
export const sellersService = {
  subscribe: subscribeToSellers,
  save: syncSaveSeller,
  remove: syncDeleteSeller,
};

// Service Clients & Consignes CHR
export const customersService = {
  subscribe: subscribeToCustomers,
  save: syncSaveCustomer,
  remove: syncDeleteCustomer,
};

// Service Ventes & Mouvements de stock
export const salesService = {
  subscribeSales: subscribeToSales,
  subscribeMovements: subscribeToMovements,
  saveSale: syncSaveSale,
  saveMovement: syncSaveMovement,
};

// Service Paramètres & Change de devises
export const settingsService = {
  subscribeSettings: subscribeToSettings,
  saveSettings: syncSaveSettings,
  subscribeExchangeRates: subscribeToExchangeRates,
  saveExchangeRates: syncSaveExchangeRates,
  subscribeExchangeTransactions: subscribeToExchangeTransactions,
  saveExchangeTransaction: syncSaveExchangeTransaction,
  deleteExchangeTransaction: syncDeleteExchangeTransaction,
};

// Service Global de Synchronisation & Diagnostic
export const cloudService = {
  seedIfEmpty: seedInitialDataIfEmpty,
  ping: pingCloudConnection,
  getStats: fetchCloudStats,
  forceFullSync: forceFullCloudSync,
  resetAllToDefault: syncResetAllDataToDefault,
};
