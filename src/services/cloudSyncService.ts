import {
  collection,
  doc,
  setDoc,
  deleteDoc,
  onSnapshot,
  getDocs,
  getDoc,
  getDocFromServer,
  writeBatch,
  DocumentReference,
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

let hasInitialSeedSettled = false;
let seedingInFlight: Promise<void> | null = null;

/**
 * Supprime récursivement toute propriété undefined avant écriture dans Firestore
 * (Firestore rejette les champs undefined dans setDoc et writeBatch).
 */
export function sanitizeForFirestore<T>(value: T): T {
  if (Array.isArray(value)) {
    return value.map((item) => sanitizeForFirestore(item)) as unknown as T;
  }
  if (value !== null && typeof value === 'object') {
    const cleaned: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      if (v !== undefined) {
        cleaned[k] = sanitizeForFirestore(v);
      }
    }
    return cleaned as T;
  }
  return value;
}

interface BatchWriteOp {
  ref: DocumentReference;
  data: Record<string, unknown>;
}

/**
 * Exécute les écritures par lots de 400 opérations maximum (limite Firestore : 500/lot).
 */
async function commitSetOpsInChunks(ops: BatchWriteOp[], chunkSize = 400): Promise<void> {
  for (let i = 0; i < ops.length; i += chunkSize) {
    const batch = writeBatch(db);
    const slice = ops.slice(i, i + chunkSize);
    slice.forEach((op) => {
      batch.set(op.ref, sanitizeForFirestore(op.data));
    });
    await batch.commit();
  }
}

/**
 * Formate et remonte proprement une erreur de snapshot temps réel vers l'interface.
 */
function reportSnapshotError(
  error: unknown,
  operationType: OperationType,
  path: string,
  onError?: (err: Error) => void
) {
  try {
    handleFirestoreError(error, operationType, path);
  } catch (structuredError) {
    if (onError) {
      onError(structuredError instanceof Error ? structuredError : new Error(String(structuredError)));
    }
  }
}

/**
 * Initialise les données de démonstration uniquement si Firestore est vide (verrou anti-course).
 */
export async function seedInitialDataIfEmpty(): Promise<void> {
  if (seedingInFlight) {
    return seedingInFlight;
  }

  seedingInFlight = (async () => {
    try {
      const productsSnap = await getDocs(collection(db, COLLECTIONS.PRODUCTS));
      if (productsSnap.empty) {
        console.log('Seeding initial data into Firestore...');
        const ops: BatchWriteOp[] = [];

        INITIAL_PRODUCTS.forEach((p) => {
          ops.push({ ref: doc(db, COLLECTIONS.PRODUCTS, p.id), data: p as unknown as Record<string, unknown> });
        });

        INITIAL_SELLERS.forEach((s) => {
          ops.push({ ref: doc(db, COLLECTIONS.SELLERS, s.id), data: s as unknown as Record<string, unknown> });
        });

        INITIAL_CUSTOMERS.forEach((c) => {
          ops.push({ ref: doc(db, COLLECTIONS.CUSTOMERS, c.id), data: c as unknown as Record<string, unknown> });
        });

        const initialSales = generateInitialSales();
        initialSales.forEach((sale) => {
          ops.push({ ref: doc(db, COLLECTIONS.SALES, sale.id), data: sale as unknown as Record<string, unknown> });
        });

        INITIAL_MOVEMENTS.forEach((m) => {
          ops.push({ ref: doc(db, COLLECTIONS.MOVEMENTS, m.id), data: m as unknown as Record<string, unknown> });
        });

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
          ops.push({
            ref: doc(db, COLLECTIONS.SETTINGS, 'global'),
            data: {
              ...initialSettings,
              updatedAt: initialSettings.updatedAt || new Date().toISOString(),
            },
          });
        }

        const ratesSnap = await getDoc(doc(db, COLLECTIONS.EXCHANGE_RATES, 'current'));
        if (!ratesSnap.exists()) {
          ops.push({
            ref: doc(db, COLLECTIONS.EXCHANGE_RATES, 'current'),
            data: DEFAULT_EXCHANGE_RATES as unknown as Record<string, unknown>,
          });
        }

        INITIAL_EXCHANGE_TRANSACTIONS.forEach((tx) => {
          ops.push({
            ref: doc(db, COLLECTIONS.EXCHANGE_TRANSACTIONS, tx.id),
            data: tx as unknown as Record<string, unknown>,
          });
        });

        await commitSetOpsInChunks(ops);
        console.log('Initial Firestore seeding complete.');
      }
      hasInitialSeedSettled = true;
    } catch (error) {
      console.error('Error seeding initial data:', error);
      throw error;
    } finally {
      seedingInFlight = null;
    }
  })();

  return seedingInFlight;
}

// Subscriptions - Real-time sync across AI Studio, GitHub and Netlify
export function subscribeToProducts(
  callback: (products: Product[], fromServer: boolean) => void,
  onError?: (err: Error) => void
) {
  const path = COLLECTIONS.PRODUCTS;
  return onSnapshot(
    collection(db, path),
    (snapshot) => {
      const items: Product[] = [];
      snapshot.forEach((docSnap) => {
        items.push(docSnap.data() as Product);
      });
      const fromServer = !snapshot.metadata.fromCache;
      if (items.length > 0) {
        hasInitialSeedSettled = true;
        callback(items, fromServer);
      } else if (hasInitialSeedSettled && fromServer) {
        callback([], true);
      } else {
        seedInitialDataIfEmpty().catch((err) => {
          onError?.(err instanceof Error ? err : new Error(String(err)));
        });
      }
    },
    (error) => reportSnapshotError(error, OperationType.LIST, path, onError)
  );
}

export function subscribeToSellers(
  callback: (sellers: Seller[], fromServer: boolean) => void,
  onError?: (err: Error) => void
) {
  const path = COLLECTIONS.SELLERS;
  return onSnapshot(
    collection(db, path),
    (snapshot) => {
      const items: Seller[] = [];
      snapshot.forEach((docSnap) => {
        items.push(docSnap.data() as Seller);
      });
      const fromServer = !snapshot.metadata.fromCache;
      if (items.length > 0 || (hasInitialSeedSettled && fromServer)) {
        callback(items, fromServer);
      }
    },
    (error) => reportSnapshotError(error, OperationType.LIST, path, onError)
  );
}

export function subscribeToCustomers(
  callback: (customers: Customer[], fromServer: boolean) => void,
  onError?: (err: Error) => void
) {
  const path = COLLECTIONS.CUSTOMERS;
  return onSnapshot(
    collection(db, path),
    (snapshot) => {
      const items: Customer[] = [];
      snapshot.forEach((docSnap) => {
        items.push(docSnap.data() as Customer);
      });
      const fromServer = !snapshot.metadata.fromCache;
      if (items.length > 0 || (hasInitialSeedSettled && fromServer)) {
        callback(items, fromServer);
      }
    },
    (error) => reportSnapshotError(error, OperationType.LIST, path, onError)
  );
}

export function subscribeToSales(
  callback: (sales: Sale[], fromServer: boolean) => void,
  onError?: (err: Error) => void
) {
  const path = COLLECTIONS.SALES;
  return onSnapshot(
    collection(db, path),
    (snapshot) => {
      const items: Sale[] = [];
      snapshot.forEach((docSnap) => {
        items.push(docSnap.data() as Sale);
      });
      const fromServer = !snapshot.metadata.fromCache;
      if (items.length > 0 || (hasInitialSeedSettled && fromServer)) {
        items.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        callback(items, fromServer);
      }
    },
    (error) => reportSnapshotError(error, OperationType.LIST, path, onError)
  );
}

export function subscribeToMovements(
  callback: (movements: StockMovement[], fromServer: boolean) => void,
  onError?: (err: Error) => void
) {
  const path = COLLECTIONS.MOVEMENTS;
  return onSnapshot(
    collection(db, path),
    (snapshot) => {
      const items: StockMovement[] = [];
      snapshot.forEach((docSnap) => {
        items.push(docSnap.data() as StockMovement);
      });
      const fromServer = !snapshot.metadata.fromCache;
      if (items.length > 0 || (hasInitialSeedSettled && fromServer)) {
        items.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        callback(items, fromServer);
      }
    },
    (error) => reportSnapshotError(error, OperationType.LIST, path, onError)
  );
}

export function subscribeToSettings(
  callback: (settings: AppSettings, fromServer: boolean) => void,
  onError?: (err: Error) => void
) {
  const path = COLLECTIONS.SETTINGS;
  return onSnapshot(
    doc(db, path, 'global'),
    (docSnap) => {
      const fromServer = !docSnap.metadata.fromCache;
      if (docSnap.exists()) {
        callback(docSnap.data() as AppSettings, fromServer);
      } else {
        let fallback = DEFAULT_SETTINGS;
        try {
          const stored = localStorage.getItem('optiboissons_settings_v2');
          if (stored) {
            const parsed = JSON.parse(stored);
            if (parsed && typeof parsed === 'object' && parsed.companyName) {
              fallback = parsed;
            }
          }
        } catch {
          // ignore
        }
        const stamped: AppSettings = {
          ...fallback,
          updatedAt: fallback.updatedAt || new Date().toISOString(),
        };
        setDoc(doc(db, COLLECTIONS.SETTINGS, 'global'), sanitizeForFirestore(stamped), { merge: true }).catch(() => {});
        callback(stamped, fromServer);
      }
    },
    (error) => reportSnapshotError(error, OperationType.GET, path, onError)
  );
}

export function subscribeToExchangeRates(
  callback: (rates: ExchangeRateConfig, fromServer: boolean) => void,
  onError?: (err: Error) => void
) {
  const path = COLLECTIONS.EXCHANGE_RATES;
  return onSnapshot(
    doc(db, path, 'current'),
    (docSnap) => {
      const fromServer = !docSnap.metadata.fromCache;
      if (docSnap.exists()) {
        callback(docSnap.data() as ExchangeRateConfig, fromServer);
      } else {
        setDoc(doc(db, COLLECTIONS.EXCHANGE_RATES, 'current'), sanitizeForFirestore(DEFAULT_EXCHANGE_RATES)).catch(
          () => {}
        );
      }
    },
    (error) => reportSnapshotError(error, OperationType.GET, path, onError)
  );
}

export function subscribeToExchangeTransactions(
  callback: (txs: ExchangeTransaction[], fromServer: boolean) => void,
  onError?: (err: Error) => void
) {
  const path = COLLECTIONS.EXCHANGE_TRANSACTIONS;
  return onSnapshot(
    collection(db, path),
    (snapshot) => {
      const items: ExchangeTransaction[] = [];
      snapshot.forEach((docSnap) => {
        items.push(docSnap.data() as ExchangeTransaction);
      });
      const fromServer = !snapshot.metadata.fromCache;
      if (items.length > 0 || (hasInitialSeedSettled && fromServer)) {
        items.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        callback(items, fromServer);
      }
    },
    (error) => reportSnapshotError(error, OperationType.LIST, path, onError)
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
 * Force une consolidation complète et découpée par lots vers Cloud Firestore.
 * Garantit que Netlify, GitHub et cet espace partagent 100% des mêmes données.
 */
export async function forceFullCloudSync(
  data: FullAppDataPayload
): Promise<{ success: boolean; totalItems: number }> {
  try {
    const ops: BatchWriteOp[] = [];

    data.products.forEach((p) => {
      ops.push({ ref: doc(db, COLLECTIONS.PRODUCTS, p.id), data: p as unknown as Record<string, unknown> });
    });

    data.sellers.forEach((s) => {
      ops.push({ ref: doc(db, COLLECTIONS.SELLERS, s.id), data: s as unknown as Record<string, unknown> });
    });

    data.customers.forEach((c) => {
      ops.push({ ref: doc(db, COLLECTIONS.CUSTOMERS, c.id), data: c as unknown as Record<string, unknown> });
    });

    data.sales.forEach((s) => {
      ops.push({ ref: doc(db, COLLECTIONS.SALES, s.id), data: s as unknown as Record<string, unknown> });
    });

    data.movements.forEach((m) => {
      ops.push({ ref: doc(db, COLLECTIONS.MOVEMENTS, m.id), data: m as unknown as Record<string, unknown> });
    });

    const stampedSettings: AppSettings = {
      ...data.settings,
      updatedAt: data.settings.updatedAt || new Date().toISOString(),
    };
    ops.push({
      ref: doc(db, COLLECTIONS.SETTINGS, 'global'),
      data: stampedSettings as unknown as Record<string, unknown>,
    });

    ops.push({
      ref: doc(db, COLLECTIONS.EXCHANGE_RATES, 'current'),
      data: data.exchangeRates as unknown as Record<string, unknown>,
    });

    data.exchangeTransactions.forEach((tx) => {
      ops.push({
        ref: doc(db, COLLECTIONS.EXCHANGE_TRANSACTIONS, tx.id),
        data: tx as unknown as Record<string, unknown>,
      });
    });

    await commitSetOpsInChunks(ops);
    return { success: true, totalItems: ops.length };
  } catch (error) {
    console.error('Error in forceFullCloudSync:', error);
    throw error;
  }
}

export interface PingResult {
  connected: boolean;
  latencyMs: number;
  errorCode?: string;
  errorMessage?: string;
}

/**
 * Vérifie en direct la latence et les droits d'écriture/lecture serveur sur Firestore.
 */
export async function pingCloudConnection(): Promise<PingResult> {
  const start = performance.now();
  try {
    await setDoc(doc(db, 'test', 'ping'), {
      timestamp: new Date().toISOString(),
    });
    await getDocFromServer(doc(db, 'test', 'ping'));
    const latencyMs = Math.round(performance.now() - start);
    return { connected: true, latencyMs };
  } catch (error: unknown) {
    console.warn('Ping cloud connection failed:', error);
    const errObj = error as { code?: string; message?: string };
    return {
      connected: false,
      latencyMs: 0,
      errorCode: errObj?.code || 'unknown',
      errorMessage: errObj?.message || (error instanceof Error ? error.message : String(error)),
    };
  }
}

export interface CloudStatsResult {
  productsCount: number;
  sellersCount: number;
  customersCount: number;
  salesCount: number;
  movementsCount: number;
  exchangeTransactionsCount: number;
  isConnected: boolean;
  lastChecked: string;
  errorCode?: string;
  errorMessage?: string;
}

/**
 * Récupère les compteurs de documents Firestore pour vérifier la synchro multi-appareils.
 */
export async function fetchCloudStats(): Promise<CloudStatsResult> {
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
  } catch (error: unknown) {
    console.error('Error fetching cloud stats:', error);
    const errObj = error as { code?: string; message?: string };
    return {
      productsCount: 0,
      sellersCount: 0,
      customersCount: 0,
      salesCount: 0,
      movementsCount: 0,
      exchangeTransactionsCount: 0,
      isConnected: false,
      lastChecked: new Date().toLocaleTimeString('fr-FR'),
      errorCode: errObj?.code || 'unknown',
      errorMessage: errObj?.message || (error instanceof Error ? error.message : String(error)),
    };
  }
}

// Write helpers (tous nettoyés avec sanitizeForFirestore)
export async function syncSaveProduct(product: Product) {
  const path = `${COLLECTIONS.PRODUCTS}/${product.id}`;
  try {
    await setDoc(doc(db, COLLECTIONS.PRODUCTS, product.id), sanitizeForFirestore(product));
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
    await setDoc(doc(db, COLLECTIONS.SELLERS, seller.id), sanitizeForFirestore(seller));
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
    await setDoc(doc(db, COLLECTIONS.CUSTOMERS, customer.id), sanitizeForFirestore(customer));
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
    await setDoc(doc(db, COLLECTIONS.SALES, sale.id), sanitizeForFirestore(sale));
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, path);
  }
}

export async function syncSaveMovement(movement: StockMovement) {
  const path = `${COLLECTIONS.MOVEMENTS}/${movement.id}`;
  try {
    await setDoc(doc(db, COLLECTIONS.MOVEMENTS, movement.id), sanitizeForFirestore(movement));
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
    await setDoc(doc(db, COLLECTIONS.SETTINGS, 'global'), sanitizeForFirestore(stamped), { merge: true });
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
    await setDoc(doc(db, COLLECTIONS.EXCHANGE_RATES, 'current'), sanitizeForFirestore(rates));
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, path);
  }
}

export async function syncSaveExchangeTransaction(tx: ExchangeTransaction) {
  const path = `${COLLECTIONS.EXCHANGE_TRANSACTIONS}/${tx.id}`;
  try {
    await setDoc(doc(db, COLLECTIONS.EXCHANGE_TRANSACTIONS, tx.id), sanitizeForFirestore(tx));
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
    const ops: BatchWriteOp[] = [];

    INITIAL_PRODUCTS.forEach((p) => {
      ops.push({ ref: doc(db, COLLECTIONS.PRODUCTS, p.id), data: p as unknown as Record<string, unknown> });
    });
    INITIAL_SELLERS.forEach((s) => {
      ops.push({ ref: doc(db, COLLECTIONS.SELLERS, s.id), data: s as unknown as Record<string, unknown> });
    });
    INITIAL_CUSTOMERS.forEach((c) => {
      ops.push({ ref: doc(db, COLLECTIONS.CUSTOMERS, c.id), data: c as unknown as Record<string, unknown> });
    });
    const initialSales = generateInitialSales();
    initialSales.forEach((sale) => {
      ops.push({ ref: doc(db, COLLECTIONS.SALES, sale.id), data: sale as unknown as Record<string, unknown> });
    });
    INITIAL_MOVEMENTS.forEach((m) => {
      ops.push({ ref: doc(db, COLLECTIONS.MOVEMENTS, m.id), data: m as unknown as Record<string, unknown> });
    });
    ops.push({
      ref: doc(db, COLLECTIONS.SETTINGS, 'global'),
      data: DEFAULT_SETTINGS as unknown as Record<string, unknown>,
    });
    ops.push({
      ref: doc(db, COLLECTIONS.EXCHANGE_RATES, 'current'),
      data: DEFAULT_EXCHANGE_RATES as unknown as Record<string, unknown>,
    });

    await commitSetOpsInChunks(ops);
  } catch (err) {
    console.error('Error resetting database to default:', err);
  }
}
