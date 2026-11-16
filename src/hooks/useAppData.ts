import { useState, useEffect, useCallback } from 'react';
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
  INITIAL_MOVEMENTS,
  INITIAL_CUSTOMERS,
  DEFAULT_SETTINGS,
  DEFAULT_EXCHANGE_RATES,
  INITIAL_EXCHANGE_TRANSACTIONS,
} from '../data/mockData';
import {
  productsService,
  sellersService,
  customersService,
  salesService,
  settingsService,
  cloudService,
} from '../services/dataService';
import { STORAGE_KEYS } from '../constants/navigation';

/**
 * Lit une clé JSON depuis localStorage avec repli sécurisé en cas d'erreur de parsing.
 */
function loadFromStorage<T>(key: string, fallback: T, validator?: (parsed: unknown) => boolean): T {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw);
    if (validator && !validator(parsed)) return fallback;
    return parsed as T;
  } catch {
    return fallback;
  }
}

/**
 * Hook centralisé de gestion d'état serveur et de synchronisation temps réel (Firestore + cache local).
 * Regroupe les requêtes, mutations optimistes, états de chargement et messages d'erreur métier.
 */
export function useAppData() {
  // États principaux hydratés immédiatement depuis le cache local
  const [products, setProducts] = useState<Product[]>(() =>
    loadFromStorage(
      STORAGE_KEYS.PRODUCTS,
      INITIAL_PRODUCTS,
      (p) => Array.isArray(p) && p.length > 0 && Boolean((p[0] as Product).category)
    )
  );
  const [sellers, setSellers] = useState<Seller[]>(() =>
    loadFromStorage(STORAGE_KEYS.SELLERS, INITIAL_SELLERS, (s) => Array.isArray(s) && s.length > 0)
  );
  const [sales, setSales] = useState<Sale[]>(() =>
    loadFromStorage(STORAGE_KEYS.SALES, generateInitialSales(), (s) => Array.isArray(s))
  );
  const [movements, setMovements] = useState<StockMovement[]>(() =>
    loadFromStorage(STORAGE_KEYS.MOVEMENTS, INITIAL_MOVEMENTS, (m) => Array.isArray(m))
  );
  const [customers, setCustomers] = useState<Customer[]>(() =>
    loadFromStorage(STORAGE_KEYS.CUSTOMERS, INITIAL_CUSTOMERS, (c) => Array.isArray(c))
  );
  const [settings, setSettings] = useState<AppSettings>(() =>
    loadFromStorage(
      STORAGE_KEYS.SETTINGS,
      DEFAULT_SETTINGS,
      (s) => Boolean(s && typeof s === 'object' && (s as AppSettings).companyName)
    )
  );
  const [exchangeRates, setExchangeRates] = useState<ExchangeRateConfig>(() =>
    loadFromStorage(STORAGE_KEYS.EXCHANGE_RATES, DEFAULT_EXCHANGE_RATES)
  );
  const [exchangeTransactions, setExchangeTransactions] = useState<ExchangeTransaction[]>(() =>
    loadFromStorage(STORAGE_KEYS.EXCHANGE_TRANSACTIONS, INITIAL_EXCHANGE_TRANSACTIONS)
  );

  // États de chargement, erreur et connectivité Cloud
  const [isInitialLoading, setIsInitialLoading] = useState<boolean>(true);
  const [isCloudConnected, setIsCloudConnected] = useState<boolean>(true);
  const [lastSyncTime, setLastSyncTime] = useState<string>('');
  const [syncError, setSyncError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  const clearSyncError = useCallback(() => setSyncError(null), []);
  const clearActionSuccess = useCallback(() => setActionSuccess(null), []);

  const notifySuccess = useCallback((message: string) => {
    setActionSuccess(message);
  }, []);

  // Persistance automatique dans le cache local hors-ligne
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.PRODUCTS, JSON.stringify(products));
    } catch (e) {
      console.error('Erreur sauvegarde locale produits:', e);
    }
  }, [products]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.SELLERS, JSON.stringify(sellers));
    } catch (e) {
      console.error('Erreur sauvegarde locale équipe:', e);
    }
  }, [sellers]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.SALES, JSON.stringify(sales));
    } catch (e) {
      console.error('Erreur sauvegarde locale ventes:', e);
    }
  }, [sales]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.MOVEMENTS, JSON.stringify(movements));
    } catch (e) {
      console.error('Erreur sauvegarde locale mouvements:', e);
    }
  }, [movements]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.CUSTOMERS, JSON.stringify(customers));
    } catch (e) {
      console.error('Erreur sauvegarde locale clients:', e);
    }
  }, [customers]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(settings));
    } catch (e) {
      console.error('Erreur sauvegarde locale paramètres:', e);
    }
  }, [settings]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.EXCHANGE_RATES, JSON.stringify(exchangeRates));
    } catch (e) {
      console.error('Erreur sauvegarde locale taux:', e);
    }
  }, [exchangeRates]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.EXCHANGE_TRANSACTIONS, JSON.stringify(exchangeTransactions));
    } catch (e) {
      console.error('Erreur sauvegarde locale transactions change:', e);
    }
  }, [exchangeTransactions]);

  // Abonnements temps réel via la couche services/
  useEffect(() => {
    let active = true;
    const markSynced = () => {
      if (!active) return;
      setIsInitialLoading(false);
      setIsCloudConnected(true);
      setLastSyncTime(new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }));
    };

    // Sécurité : ne bloque jamais l'interface plus de 1,5s si le réseau est lent ou hors-ligne
    const loadingFallbackTimer = window.setTimeout(() => {
      if (active) setIsInitialLoading(false);
    }, 1500);

    cloudService.seedIfEmpty().catch(() => {
      if (active) setIsInitialLoading(false);
    });

    const unsubProducts = productsService.subscribe((prods) => {
      if (!active) return;
      setProducts(prods);
      markSynced();
    });

    const unsubSellers = sellersService.subscribe((sels) => {
      if (!active) return;
      setSellers(sels);
      markSynced();
    });

    const unsubCustomers = customersService.subscribe((custs) => {
      if (!active) return;
      setCustomers(custs);
      markSynced();
    });

    const unsubSales = salesService.subscribeSales((sls) => {
      if (!active) return;
      setSales(sls);
      markSynced();
    });

    const unsubMovements = salesService.subscribeMovements((movs) => {
      if (!active) return;
      setMovements(movs);
      markSynced();
    });

    const unsubSettings = settingsService.subscribeSettings((sett) => {
      if (!active) return;
      setSettings((prev) => {
        if (prev && prev.updatedAt && sett.updatedAt) {
          const prevTime = new Date(prev.updatedAt).getTime();
          const settTime = new Date(sett.updatedAt).getTime();
          if (prevTime > settTime) {
            settingsService.saveSettings(prev).catch(() => {});
            return prev;
          }
        }
        return sett;
      });
      markSynced();
    });

    const unsubRates = settingsService.subscribeExchangeRates((rates) => {
      if (!active) return;
      setExchangeRates(rates);
      markSynced();
    });

    const unsubTxs = settingsService.subscribeExchangeTransactions((txs) => {
      if (!active) return;
      setExchangeTransactions(txs);
      markSynced();
    });

    return () => {
      active = false;
      window.clearTimeout(loadingFallbackTimer);
      unsubProducts();
      unsubSellers();
      unsubCustomers();
      unsubSales();
      unsubMovements();
      unsubSettings();
      unsubRates();
      unsubTxs();
    };
  }, []);

  // Exécuteur sécurisé des mutations Cloud avec remontée d'erreur claire
  const runMutation = useCallback(async (operation: Promise<unknown>, errorContext: string) => {
    try {
      await operation;
      setSyncError(null);
      setIsCloudConnected(true);
    } catch (error) {
      console.error(errorContext, error);
      setIsCloudConnected(false);
      setSyncError(
        `${errorContext} : les modifications sont conservées localement et seront resynchronisées dès que la connexion sera rétablie.`
      );
    }
  }, []);

  // Rafraîchissement manuel des données Cloud
  const retryCloudSync = useCallback(async () => {
    setSyncError(null);
    const result = await cloudService.ping();
    setIsCloudConnected(result.connected);
    if (!result.connected) {
      setSyncError('Impossible de joindre le serveur Cloud. Vérifiez votre connexion Internet.');
    } else {
      notifySuccess('Connexion Cloud rétablie avec succès.');
    }
  }, [notifySuccess]);

  // Enregistrer une nouvelle vente et déduire les stocks
  const handleCompleteSale = useCallback(
    (newSale: Sale) => {
      setSales((prev) => [newSale, ...prev]);
      runMutation(salesService.saveSale(newSale), 'Erreur sauvegarde vente');

      const newMovements: StockMovement[] = [];
      setProducts((prevProds) =>
        prevProds.map((prod) => {
          const itemSold = newSale.items.find((it) => it.productId === prod.id);
          if (!itemSold) return prod;

          const prevStock = prod.stock;
          const nextStock = Math.max(0, prod.stock - itemSold.quantity);
          const mov: StockMovement = {
            id: `mov-${Date.now()}-${prod.id}`,
            productId: prod.id,
            productName: prod.name,
            type: 'out',
            quantity: itemSold.quantity,
            previousStock: prevStock,
            newStock: nextStock,
            reason: `Livraison ${newSale.invoiceNumber} (${newSale.customerName})`,
            date: new Date().toISOString(),
            operator: newSale.sellerName,
          };
          newMovements.push(mov);
          runMutation(salesService.saveMovement(mov), 'Erreur mouvement stock');

          const updatedProd: Product = {
            ...prod,
            stock: nextStock,
            updatedAt: new Date().toISOString(),
          };
          runMutation(productsService.save(updatedProd), 'Erreur mise à jour stock produit');
          return updatedProd;
        })
      );

      if (newMovements.length > 0) {
        setMovements((prev) => [...newMovements, ...prev]);
      }

      setCustomers((prevCusts) =>
        prevCusts.map((c) => {
          const matchCompany =
            newSale.customerCompany &&
            c.company.toLowerCase().trim() === newSale.customerCompany.toLowerCase().trim();
          const matchName = c.name.toLowerCase().trim() === newSale.customerName.toLowerCase().trim();
          if (!matchCompany && !matchName) return c;

          const kegsCount = newSale.items.reduce((sum, it) => {
            const prod = products.find((p) => p.id === it.productId);
            return sum + (prod?.isConsigne ? it.quantity : 0);
          }, 0);

          const updatedCust: Customer = {
            ...c,
            totalSpent: c.totalSpent + newSale.totalHT,
            activeKegsConsigned: c.activeKegsConsigned + kegsCount,
          };
          runMutation(customersService.save(updatedCust), 'Erreur mise à jour client');
          return updatedCust;
        })
      );

      notifySuccess(`Vente ${newSale.invoiceNumber} enregistrée et stocks mis à jour.`);
    },
    [products, runMutation, notifySuccess]
  );

  // Réapprovisionnement d'un produit
  const handleRestock = useCallback(
    (productId: string, quantity: number, reason = 'Réapprovisionnement Brasserie/Fournisseur') => {
      let targetProdName = '';
      let prevStock = 0;
      let nextStock = 0;

      setProducts((prev) =>
        prev.map((p) => {
          if (p.id !== productId) return p;
          targetProdName = p.name;
          prevStock = p.stock;
          nextStock = p.stock + quantity;
          const updated: Product = {
            ...p,
            stock: nextStock,
            updatedAt: new Date().toISOString(),
          };
          runMutation(productsService.save(updated), 'Erreur réapprovisionnement produit');
          return updated;
        })
      );

      const mov: StockMovement = {
        id: `mov-${Date.now()}`,
        productId,
        productName: targetProdName,
        type: 'in',
        quantity,
        previousStock: prevStock,
        newStock: nextStock,
        reason,
        date: new Date().toISOString(),
        operator: 'Gestionnaire Entrepôt Boissons',
      };
      setMovements((prev) => [mov, ...prev]);
      runMutation(salesService.saveMovement(mov), 'Erreur journal mouvement stock');
      notifySuccess(`+${quantity} unités ajoutées au stock.`);
    },
    [runMutation, notifySuccess]
  );

  // Ajout d'un produit
  const handleAddProduct = useCallback(
    (newProd: Omit<Product, 'id' | 'updatedAt'>) => {
      const id = `prod-${Date.now()}`;
      const product: Product = {
        ...newProd,
        id,
        updatedAt: new Date().toISOString(),
      };
      setProducts((prev) => [product, ...prev]);
      runMutation(productsService.save(product), 'Erreur création produit');

      if (newProd.stock > 0) {
        const mov: StockMovement = {
          id: `mov-${Date.now()}`,
          productId: id,
          productName: newProd.name,
          type: 'in',
          quantity: newProd.stock,
          previousStock: 0,
          newStock: newProd.stock,
          reason: 'Réception initiale brasserie/embouteilleur',
          date: new Date().toISOString(),
          operator: 'Direction des Approvisionnements',
        };
        setMovements((prev) => [mov, ...prev]);
        runMutation(salesService.saveMovement(mov), 'Erreur mouvement stock initial');
      }
      notifySuccess(`Produit "${newProd.name}" ajouté à l'inventaire.`);
    },
    [runMutation, notifySuccess]
  );

  // Mise à jour d'un produit
  const handleUpdateProduct = useCallback(
    (updated: Product) => {
      const prev = products.find((p) => p.id === updated.id);
      if (prev && prev.stock !== updated.stock) {
        const diff = updated.stock - prev.stock;
        const mov: StockMovement = {
          id: `mov-${Date.now()}`,
          productId: updated.id,
          productName: updated.name,
          type: diff > 0 ? 'in' : 'out',
          quantity: Math.abs(diff),
          previousStock: prev.stock,
          newStock: updated.stock,
          reason: 'Ajustement manuel inventaire',
          date: new Date().toISOString(),
          operator: 'Responsable Stock',
        };
        setMovements((prevMovs) => [mov, ...prevMovs]);
        runMutation(salesService.saveMovement(mov), 'Erreur mouvement ajustement stock');
      }
      setProducts((prevList) => prevList.map((p) => (p.id === updated.id ? updated : p)));
      runMutation(productsService.save(updated), 'Erreur mise à jour produit');
      notifySuccess(`Produit "${updated.name}" mis à jour.`);
    },
    [products, runMutation, notifySuccess]
  );

  // Suppression d'un produit
  const handleDeleteProduct = useCallback(
    (productId: string) => {
      setProducts((prev) => prev.filter((p) => p.id !== productId));
      runMutation(productsService.remove(productId), 'Erreur suppression produit');
      notifySuccess("Produit supprimé de l'inventaire.");
    },
    [runMutation, notifySuccess]
  );

  // Ajout d'un client
  const handleAddCustomer = useCallback(
    (newCust: Omit<Customer, 'id' | 'createdAt' | 'totalSpent'>) => {
      const id = `cust-${Date.now()}`;
      const cust: Customer = {
        ...newCust,
        id,
        totalSpent: 0,
        createdAt: new Date().toISOString(),
      };
      setCustomers((prev) => [cust, ...prev]);
      runMutation(customersService.save(cust), 'Erreur création client');
      notifySuccess(`Client "${newCust.company}" ajouté.`);
    },
    [runMutation, notifySuccess]
  );

  // Mise à jour d'un client
  const handleUpdateCustomer = useCallback(
    (updated: Customer) => {
      setCustomers((prev) => prev.map((c) => (c.id === updated.id ? updated : c)));
      runMutation(customersService.save(updated), 'Erreur mise à jour client');
    },
    [runMutation]
  );

  // Ajout d'un membre de l'équipe
  const handleAddSeller = useCallback(
    (newSeller: Omit<Seller, 'id'>) => {
      const id = `sel-${Date.now()}`;
      const seller: Seller = {
        ...newSeller,
        id,
        status: newSeller.status || 'Actif',
        lastLogin: new Date().toISOString(),
      };
      setSellers((prev) => [...prev, seller]);
      runMutation(sellersService.save(seller), 'Erreur création utilisateur');
      notifySuccess(`Collaborateur "${newSeller.name}" ajouté.`);
    },
    [runMutation, notifySuccess]
  );

  // Mise à jour d'un membre de l'équipe
  const handleUpdateSeller = useCallback(
    (updatedSeller: Seller) => {
      setSellers((prev) => prev.map((s) => (s.id === updatedSeller.id ? updatedSeller : s)));
      runMutation(sellersService.save(updatedSeller), 'Erreur mise à jour utilisateur');
      notifySuccess(`Profil de "${updatedSeller.name}" mis à jour.`);
    },
    [runMutation, notifySuccess]
  );

  // Suppression d'un membre de l'équipe
  const handleDeleteSeller = useCallback(
    (sellerId: string) => {
      setSellers((prev) => prev.filter((s) => s.id !== sellerId));
      runMutation(sellersService.remove(sellerId), 'Erreur suppression utilisateur');
      notifySuccess("Collaborateur retiré de l'équipe.");
    },
    [runMutation, notifySuccess]
  );

  // Mise à jour des taux de change
  const handleUpdateExchangeRates = useCallback(
    (newRates: ExchangeRateConfig) => {
      setExchangeRates(newRates);
      runMutation(settingsService.saveExchangeRates(newRates), 'Erreur sauvegarde taux de change');
      notifySuccess('Taux de change mis à jour.');
    },
    [runMutation, notifySuccess]
  );

  // Ajout d'une opération de change (génère le numéro de facture client et retourne l'écriture)
  const handleAddExchangeTransaction = useCallback(
    (newTx: Omit<ExchangeTransaction, 'id'>): ExchangeTransaction => {
      const now = Date.now();
      const id = `exc-${now}`;
      const year = new Date().getFullYear();
      const suffix = String(now).slice(-4);
      const receiptNumber = newTx.receiptNumber || `CHG-${year}-${suffix}`;
      const tx: ExchangeTransaction = { ...newTx, id, receiptNumber };
      setExchangeTransactions((prev) => [tx, ...prev]);
      runMutation(settingsService.saveExchangeTransaction(tx), 'Erreur enregistrement change');
      notifySuccess(`Opération de change ${receiptNumber} enregistrée.`);
      return tx;
    },
    [runMutation, notifySuccess]
  );

  // Suppression d'une opération de change
  const handleDeleteExchangeTransaction = useCallback(
    (id: string) => {
      setExchangeTransactions((prev) => prev.filter((tx) => tx.id !== id));
      runMutation(settingsService.deleteExchangeTransaction(id), 'Erreur suppression opération change');
      notifySuccess('Opération de change supprimée.');
    },
    [runMutation, notifySuccess]
  );

  // Enregistrement des paramètres globaux
  const handleSaveSettings = useCallback(
    async (newSettings: AppSettings) => {
      const stampedSettings: AppSettings = {
        ...newSettings,
        updatedAt: new Date().toISOString(),
      };
      setSettings(stampedSettings);
      try {
        localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(stampedSettings));
      } catch (e) {
        console.error(e);
      }
      await runMutation(settingsService.saveSettings(stampedSettings), 'Erreur sauvegarde paramètres');
      notifySuccess('Paramètres enregistrés et synchronisés.');
    },
    [runMutation, notifySuccess]
  );

  // Changement de statut d'une facture / vente
  const handleUpdateSaleStatus = useCallback(
    (
      saleId: string,
      newStatus: 'completed' | 'pending' | 'cancelled',
      paymentMethod?: Sale['paymentMethod']
    ) => {
      setSales((prev) =>
        prev.map((s) => {
          if (s.id !== saleId) return s;
          const updated: Sale = {
            ...s,
            status: newStatus,
            ...(paymentMethod ? { paymentMethod } : {}),
          };
          runMutation(salesService.saveSale(updated), 'Erreur mise à jour statut facture');
          return updated;
        })
      );
      const label =
        newStatus === 'completed'
          ? 'Facture marquée comme payée.'
          : newStatus === 'cancelled'
          ? 'Facture annulée.'
          : 'Facture replacée en attente.';
      notifySuccess(label);
    },
    [runMutation, notifySuccess]
  );

  // Réinitialisation complète aux données par défaut
  const handleResetAllData = useCallback(() => {
    Object.values(STORAGE_KEYS).forEach((key) => {
      if (key !== STORAGE_KEYS.CURRENT_USER) {
        localStorage.removeItem(key);
      }
    });
    setProducts(INITIAL_PRODUCTS);
    setSellers(INITIAL_SELLERS);
    setSales(generateInitialSales());
    setMovements(INITIAL_MOVEMENTS);
    setCustomers(INITIAL_CUSTOMERS);
    setSettings(DEFAULT_SETTINGS);
    setExchangeRates(DEFAULT_EXCHANGE_RATES);
    setExchangeTransactions(INITIAL_EXCHANGE_TRANSACTIONS);
    runMutation(cloudService.resetAllToDefault(), 'Erreur réinitialisation Cloud');
    notifySuccess('Toutes les données ont été réinitialisées.');
  }, [runMutation, notifySuccess]);

  return {
    // Données métier
    products,
    sellers,
    sales,
    movements,
    customers,
    settings,
    exchangeRates,
    exchangeTransactions,
    setSellers,
    // États de synchronisation & chargement
    isInitialLoading,
    isCloudConnected,
    lastSyncTime,
    syncError,
    clearSyncError,
    actionSuccess,
    clearActionSuccess,
    retryCloudSync,
    // Mutations
    handleCompleteSale,
    handleRestock,
    handleAddProduct,
    handleUpdateProduct,
    handleDeleteProduct,
    handleAddCustomer,
    handleUpdateCustomer,
    handleAddSeller,
    handleUpdateSeller,
    handleDeleteSeller,
    handleUpdateExchangeRates,
    handleAddExchangeTransaction,
    handleDeleteExchangeTransaction,
    handleSaveSettings,
    handleUpdateSaleStatus,
    handleResetAllData,
  };
}
