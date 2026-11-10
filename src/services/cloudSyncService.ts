import {
  collection,
  doc,
  setDoc,
  deleteDoc,
  onSnapshot,
  getDocs,
  getDoc,
  writeBatch,
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase';
import {
  Product,
  Seller,
  Sale,
  StockMovement,
  Customer,
  AppSettings,
  ExchangeRateConfig,
  ExchangeTransaction,
} from '../types';
import {
  INITIAL_PRODUCTS,
  INITIAL_SELLERS,
  generateInitialSales,
  INITIAL_CUSTOMERS,
  INITIAL_MOVEMENTS,
  DEFAULT_SETTINGS,
  DEFAULT_EXCHANGE_RATES,
  INITIAL_EXCHANGE_TRANSACTIONS,
} from '../data/mockData';

// Firestore collections
export const COLLECTIONS = {
  PRODUCTS: 'products',
  SELLERS: 'sellers',
  SALES: 'sales',
  CUSTOMERS: 'customers',
  MOVEMENTS: 'movements',
  SETTINGS: 'settings',
  EXCHANGE_RATES: 'exchange_rates',
  EXCHANGE_TRANSACTIONS: 'exchange_transactions',
};

// Seed initial data if Firestore is empty (runs only once per device)
// Seed initial data if Firestore is empty
export async function seedInitialDataIfEmpty() {
  try {
    const productsSnap = await getDocs(collection(db, COLLECTIONS.PRODUCTS));
    if (productsSnap.empty) {
      console.log('Seeding initial data into Firestore...');
      const batch = writeBatch(db);

      // Seed Products
      INITIAL_PRODUCTS.forEach((p) => {
        batch.set(doc(db, COLLECTIONS.PRODUCTS, p.id), p);
      });

      // Seed Sellers
      INITIAL_SELLERS.forEach((s) => {
        batch.set(doc(db, COLLECTIONS.SELLERS, s.id), s);
      });

      // Seed Customers
      INITIAL_CUSTOMERS.forEach((c) => {
        batch.set(doc(db, COLLECTIONS.CUSTOMERS, c.id), c);
      });

      // Seed Sales
      const initialSales = generateInitialSales();
      initialSales.forEach((sale) => {
        batch.set(doc(db, COLLECTIONS.SALES, sale.id), sale);
      });

      // Seed Movements
      INITIAL_MOVEMENTS.forEach((m) => {
        batch.set(doc(db, COLLECTIONS.MOVEMENTS, m.id), m);
      });

      // Protect Settings: Never overwrite existing user settings if document exists in Firestore
      const settingsSnap = await getDoc(doc(db, COLLECTIONS.SETTINGS, 'global'));
      if (!settingsSnap.exists()) {
        let initialSettings = DEFAULT_SETTINGS;
        try {
          const stored = localStorage.getItem('optiboissons_settings_v2');
          if (stored) {
            const parsed = JSON.parse(stored);
            if (parsed && typeof parsed === 'object' && parsed.companyName) {
              initialSettings = parsed;
            }
          }
        } catch {
          // ignore
        }
        batch.set(doc(db, COLLECTIONS.SETTINGS, 'global'), {
          ...initialSettings,
          updatedAt: initialSettings.updatedAt || new Date().toISOString(),
        });
      }

      // Protect Exchange Rates: Only seed if current rate doc does not exist
      const ratesSnap = await getDoc(doc(db, COLLECTIONS.EXCHANGE_RATES, 'current'));
      if (!ratesSnap.exists()) {
        batch.set(doc(db, COLLECTIONS.EXCHANGE_RATES, 'current'), DEFAULT_EXCHANGE_RATES);
      }

      // Seed Exchange Transactions
      INITIAL_EXCHANGE_TRANSACTIONS.forEach((tx) => {
        batch.set(doc(db, COLLECTIONS.EXCHANGE_TRANSACTIONS, tx.id), tx);
      });

      await batch.commit();
      console.log('Initial Firestore seeding complete.');
    }
  } catch (error) {
    console.error('Error seeding initial data:', error);
  }
}

// Subscriptions - Real-time sync across AI Studio, GitHub and Netlify
export function subscribeToProducts(callback: (products: Product[]) => void) {
  const path = COLLECTIONS.PRODUCTS;
  return onSnapshot(
    collection(db, path),
    (snapshot) => {
      const items: Product[] = [];
      snapshot.forEach((docSnap) => {
        items.push(docSnap.data() as Product);
      });
      // Always propagate live snapshot array (or trigger seed if initially empty)
      if (items.length > 0) {
        callback(items);
      } else {
        // If empty on remote Firestore, seed initial dataset so all pages populate
        seedInitialDataIfEmpty();
      }
    },
    (error) => handleFirestoreError(error, OperationType.LIST, path)
  );
}

export function subscribeToSellers(callback: (sellers: Seller[]) => void) {
  const path = COLLECTIONS.SELLERS;
  return onSnapshot(
    collection(db, path),
    (snapshot) => {
      const items: Seller[] = [];
      snapshot.forEach((docSnap) => {
        items.push(docSnap.data() as Seller);
      });
      if (items.length > 0) {
        callback(items);
      }
    },
    (error) => handleFirestoreError(error, OperationType.LIST, path)
  );
}

export function subscribeToCustomers(callback: (customers: Customer[]) => void) {
  const path = COLLECTIONS.CUSTOMERS;
  return onSnapshot(
    collection(db, path),
    (snapshot) => {
      const items: Customer[] = [];
      snapshot.forEach((docSnap) => {
        items.push(docSnap.data() as Customer);
      });
      if (items.length > 0) {
        callback(items);
      }
    },
    (error) => handleFirestoreError(error, OperationType.LIST, path)
  );
}

export function subscribeToSales(callback: (sales: Sale[]) => void) {
  const path = COLLECTIONS.SALES;
  return onSnapshot(
    collection(db, path),
    (snapshot) => {
      const items: Sale[] = [];
      snapshot.forEach((docSnap) => {
        items.push(docSnap.data() as Sale);
      });
      if (items.length > 0) {
        // Sort by date descending
        items.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        callback(items);
      }
    },
    (error) => handleFirestoreError(error, OperationType.LIST, path)
  );
}

export function subscribeToMovements(callback: (movements: StockMovement[]) => void) {
  const path = COLLECTIONS.MOVEMENTS;
  return onSnapshot(
    collection(db, path),
    (snapshot) => {
      const items: StockMovement[] = [];
      snapshot.forEach((docSnap) => {
        items.push(docSnap.data() as StockMovement);
      });
      if (items.length > 0) {
        items.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        callback(items);
      }
    },
    (error) => handleFirestoreError(error, OperationType.LIST, path)
  );
}

export function subscribeToSettings(callback: (settings: AppSettings) => void) {
  const path = COLLECTIONS.SETTINGS;
  return onSnapshot(
    doc(db, path, 'global'),
    (docSnap) => {
      if (docSnap.exists()) {
        callback(docSnap.data() as AppSettings);
      } else {
        // Only seed if completely missing in Firestore, preserving any local customized settings
        let fallback = DEFAULT_SETTINGS;
        try {
          const stored = localStorage.getItem('optiboissons_settings_v2');
          if (stored) {
            const parsed = JSON.parse(stored);
            if (parsed && typeof parsed === 'object' && parsed.companyName) {
              fallback = parsed;
            }
          }
        } catch {}
        const stamped: AppSettings = {
          ...fallback,
          updatedAt: fallback.updatedAt || new Date().toISOString(),
        };
        setDoc(doc(db, COLLECTIONS.SETTINGS, 'global'), stamped, { merge: true }).catch(() => {});
        callback(stamped);
      }
    },
    (error) => handleFirestoreError(error, OperationType.GET, path)
  );
}

export function subscribeToExchangeRates(callback: (rates: ExchangeRateConfig) => void) {
  const path = COLLECTIONS.EXCHANGE_RATES;
  return onSnapshot(
    doc(db, path, 'current'),
    (docSnap) => {
      if (docSnap.exists()) {
        callback(docSnap.data() as ExchangeRateConfig);
      } else {
        setDoc(doc(db, COLLECTIONS.EXCHANGE_RATES, 'current'), DEFAULT_EXCHANGE_RATES).catch(() => {});
      }
    },
    (error) => handleFirestoreError(error, OperationType.GET, path)
  );
}

export function subscribeToExchangeTransactions(callback: (txs: ExchangeTransaction[]) => void) {
  const path = COLLECTIONS.EXCHANGE_TRANSACTIONS;
  return onSnapshot(
    collection(db, path),
    (snapshot) => {
      const items: ExchangeTransaction[] = [];
      snapshot.forEach((docSnap) => {
        items.push(docSnap.data() as ExchangeTransaction);
      });
      if (items.length > 0) {
        items.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        callback(items);
      }
    },
    (error) => handleFirestoreError(error, OperationType.LIST, path)
  );
}

export interface FullAppDataPayload {
  products: Product[];
  sellers: Seller[];
  customers: Customer[];
  sales: Sale[];
  movements: StockMovement[];
  settings: AppSettings;
  exchangeRates: ExchangeRateConfig;
  exchangeTransactions: ExchangeTransaction[];
}

/**
 * Force a synchronized push of all application data from all pages into Firebase Firestore.
 * This guarantees that Netlify, GitHub, and this workspace share 100% identical data.
 */
export async function forceFullCloudSync(data: FullAppDataPayload): Promise<{ success: boolean; totalItems: number }> {
  try {
    const batch = writeBatch(db);
    let totalItems = 0;

    data.products.forEach((p) => {
      batch.set(doc(db, COLLECTIONS.PRODUCTS, p.id), p);
      totalItems++;
    });

    data.sellers.forEach((s) => {
      batch.set(doc(db, COLLECTIONS.SELLERS, s.id), s);
      totalItems++;
    });

    data.customers.forEach((c) => {
      batch.set(doc(db, COLLECTIONS.CUSTOMERS, c.id), c);
      totalItems++;
    });

    data.sales.forEach((s) => {
      batch.set(doc(db, COLLECTIONS.SALES, s.id), s);
      totalItems++;
    });

    data.movements.forEach((m) => {
      batch.set(doc(db, COLLECTIONS.MOVEMENTS, m.id), m);
      totalItems++;
    });

    const stampedSettings: AppSettings = {
      ...data.settings,
      updatedAt: data.settings.updatedAt || new Date().toISOString(),
    };
    batch.set(doc(db, COLLECTIONS.SETTINGS, 'global'), stampedSettings);
    totalItems++;

    batch.set(doc(db, COLLECTIONS.EXCHANGE_RATES, 'current'), data.exchangeRates);
    totalItems++;

    data.exchangeTransactions.forEach((tx) => {
      batch.set(doc(db, COLLECTIONS.EXCHANGE_TRANSACTIONS, tx.id), tx);
      totalItems++;
    });

    await batch.commit();
    return { success: true, totalItems };
  } catch (error) {
    console.error('Error in forceFullCloudSync:', error);
    throw error;
  }
}

/**
 * Ping Firebase Firestore to verify live latency and connection status
 */
export async function pingCloudConnection(): Promise<{ connected: boolean; latencyMs: number }> {
  const start = performance.now();
  try {
    await setDoc(doc(db, 'test', 'ping'), {
      timestamp: new Date().toISOString(),
      clientTime: Date.now(),
    });
    const latencyMs = Math.round(performance.now() - start);
    return { connected: true, latencyMs };
  } catch (error) {
    console.warn('Ping cloud connection failed:', error);
    return { connected: false, latencyMs: 0 };
  }
}

/**
 * Fetch document counts from Firestore across all collections to verify multi-device sync
 */
export async function fetchCloudStats() {
  try {
    const [pSnap, selSnap, cSnap, sSnap, mSnap, txSnap] = await Promise.all([
      getDocs(collection(db, COLLECTIONS.PRODUCTS)),
      getDocs(collection(db, COLLECTIONS.SELLERS)),
      getDocs(collection(db, COLLECTIONS.CUSTOMERS)),
      getDocs(collection(db, COLLECTIONS.SALES)),
      getDocs(collection(db, COLLECTIONS.MOVEMENTS)),
      getDocs(collection(db, COLLECTIONS.EXCHANGE_TRANSACTIONS)),
    ]);
    return {
      productsCount: pSnap.size,
      sellersCount: selSnap.size,
      customersCount: cSnap.size,
      salesCount: sSnap.size,
      movementsCount: mSnap.size,
      exchangeTransactionsCount: txSnap.size,
      isConnected: true,
      lastChecked: new Date().toLocaleTimeString('fr-FR'),
    };
  } catch (error) {
    console.error('Error fetching cloud stats:', error);
    return {
      productsCount: 0,
      sellersCount: 0,
      customersCount: 0,
      salesCount: 0,
      movementsCount: 0,
      exchangeTransactionsCount: 0,
      isConnected: false,
      lastChecked: new Date().toLocaleTimeString('fr-FR'),
    };
  }
}

// Write helpers
export async function syncSaveProduct(product: Product) {
  const path = `${COLLECTIONS.PRODUCTS}/${product.id}`;
  try {
    await setDoc(doc(db, COLLECTIONS.PRODUCTS, product.id), product);
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, path);
  }
}

export async function syncDeleteProduct(productId: string) {
  const path = `${COLLECTIONS.PRODUCTS}/${productId}`;
  try {
    await deleteDoc(doc(db, COLLECTIONS.PRODUCTS, productId));
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, path);
  }
}

export async function syncSaveSeller(seller: Seller) {
  const path = `${COLLECTIONS.SELLERS}/${seller.id}`;
  try {
    await setDoc(doc(db, COLLECTIONS.SELLERS, seller.id), seller);
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, path);
  }
}

export async function syncDeleteSeller(sellerId: string) {
  const path = `${COLLECTIONS.SELLERS}/${sellerId}`;
  try {
    await deleteDoc(doc(db, COLLECTIONS.SELLERS, sellerId));
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, path);
  }
}

export async function syncSaveCustomer(customer: Customer) {
  const path = `${COLLECTIONS.CUSTOMERS}/${customer.id}`;
  try {
    await setDoc(doc(db, COLLECTIONS.CUSTOMERS, customer.id), customer);
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, path);
  }
}

export async function syncDeleteCustomer(customerId: string) {
  const path = `${COLLECTIONS.CUSTOMERS}/${customerId}`;
  try {
    await deleteDoc(doc(db, COLLECTIONS.CUSTOMERS, customerId));
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, path);
  }
}

export async function syncSaveSale(sale: Sale) {
  const path = `${COLLECTIONS.SALES}/${sale.id}`;
  try {
    await setDoc(doc(db, COLLECTIONS.SALES, sale.id), sale);
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, path);
  }
}

export async function syncSaveMovement(movement: StockMovement) {
  const path = `${COLLECTIONS.MOVEMENTS}/${movement.id}`;
  try {
    await setDoc(doc(db, COLLECTIONS.MOVEMENTS, movement.id), movement);
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, path);
  }
}

export async function syncSaveSettings(settings: AppSettings): Promise<boolean> {
  const path = `${COLLECTIONS.SETTINGS}/global`;
  const stamped: AppSettings = {
    ...settings,
    updatedAt: settings.updatedAt || new Date().toISOString(),
  };
  try {
    await setDoc(doc(db, COLLECTIONS.SETTINGS, 'global'), stamped, { merge: true });
    try {
      localStorage.setItem('optiboissons_settings_v2', JSON.stringify(stamped));
    } catch (e) {
      console.error(e);
    }
    return true;
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, path);
    return false;
  }
}

export async function syncSaveExchangeRates(rates: ExchangeRateConfig) {
  const path = `${COLLECTIONS.EXCHANGE_RATES}/current`;
  try {
    await setDoc(doc(db, COLLECTIONS.EXCHANGE_RATES, 'current'), rates);
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, path);
  }
}

export async function syncSaveExchangeTransaction(tx: ExchangeTransaction) {
  const path = `${COLLECTIONS.EXCHANGE_TRANSACTIONS}/${tx.id}`;
  try {
    await setDoc(doc(db, COLLECTIONS.EXCHANGE_TRANSACTIONS, tx.id), tx);
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, path);
  }
}

export async function syncDeleteExchangeTransaction(txId: string) {
  const path = `${COLLECTIONS.EXCHANGE_TRANSACTIONS}/${txId}`;
  try {
    await deleteDoc(doc(db, COLLECTIONS.EXCHANGE_TRANSACTIONS, txId));
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, path);
  }
}

export async function syncResetAllDataToDefault() {
  try {
    const batch = writeBatch(db);

    INITIAL_PRODUCTS.forEach((p) => {
      batch.set(doc(db, COLLECTIONS.PRODUCTS, p.id), p);
    });
    INITIAL_SELLERS.forEach((s) => {
      batch.set(doc(db, COLLECTIONS.SELLERS, s.id), s);
    });
    INITIAL_CUSTOMERS.forEach((c) => {
      batch.set(doc(db, COLLECTIONS.CUSTOMERS, c.id), c);
    });
    const initialSales = generateInitialSales();
    initialSales.forEach((sale) => {
      batch.set(doc(db, COLLECTIONS.SALES, sale.id), sale);
    });
    INITIAL_MOVEMENTS.forEach((m) => {
      batch.set(doc(db, COLLECTIONS.MOVEMENTS, m.id), m);
    });
    batch.set(doc(db, COLLECTIONS.SETTINGS, 'global'), DEFAULT_SETTINGS);
    batch.set(doc(db, COLLECTIONS.EXCHANGE_RATES, 'current'), DEFAULT_EXCHANGE_RATES);

    await batch.commit();
  } catch (err) {
    console.error('Error resetting database to default:', err);
  }
}
