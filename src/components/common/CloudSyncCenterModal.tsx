import React, { useState, useEffect } from 'react';
import {
  Cloud,
  CheckCircle2,
  RefreshCw,
  Globe,
  Database,
  ShieldCheck,
  Package,
  Users,
  ShoppingBag,
  FileSpreadsheet,
  ArrowLeftRight,
  Settings,
  Copy,
  Check,
  AlertCircle,
  ExternalLink,
  Wifi,
  X,
  Ban,
  AlertTriangle,
} from 'lucide-react';
import { firebaseConfig, hasNetlifyEnvOverride } from '../../firebase';
import {
  fetchCloudStats,
  pingCloudConnection,
  forceFullCloudSync,
  FullAppDataPayload,
  CloudStatsResult,
  PingResult,
} from '../../services/cloudSyncService';

interface CloudSyncCenterModalProps {
  isOpen: boolean;
  onClose: () => void;
  fullData: FullAppDataPayload;
  lastSyncTime?: string;
  isCloudConnected: boolean;
}

export function CloudSyncCenterModal({
  isOpen,
  onClose,
  fullData,
  lastSyncTime,
  isCloudConnected,
}: CloudSyncCenterModalProps) {
  const [activeTab, setActiveTab] = useState<'status' | 'deployment' | 'env'>('status');
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncSuccessMessage, setSyncSuccessMessage] = useState<string | null>(null);
  const [syncErrorMessage, setSyncErrorMessage] = useState<string | null>(null);

  const [stats, setStats] = useState<CloudStatsResult | null>(null);
  const [pingResult, setPingResult] = useState<PingResult | null>(null);
  const [isPinging, setIsPinging] = useState(false);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const loadStats = async () => {
    const res = await fetchCloudStats();
    setStats(res);
  };

  const handlePing = async () => {
    setIsPinging(true);
    const res = await pingCloudConnection();
    setPingResult(res);
    setIsPinging(false);
  };

  useEffect(() => {
    if (isOpen) {
      loadStats();
      handlePing();
    }
  }, [isOpen]);

  const handleForceSync = async () => {
    setIsSyncing(true);
    setSyncSuccessMessage(null);
    setSyncErrorMessage(null);
    try {
      const res = await forceFullCloudSync(fullData);
      setSyncSuccessMessage(
        `Synchronisation réussie ! ${res.totalItems} éléments ont été consolidés dans le Cloud Firestore.`
      );
      await loadStats();
      await handlePing();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Erreur de synchronisation';
      setSyncErrorMessage(`Échec de synchronisation : ${message}`);
    } finally {
      setIsSyncing(false);
    }
  };

  const copyToClipboard = (text: string, keyName: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(keyName);
    setTimeout(() => setCopiedKey(null), 2500);
  };

  const netlifyEnvVars = [
    { key: 'VITE_FIREBASE_PROJECT_ID', val: firebaseConfig.projectId, critical: false },
    { key: 'VITE_FIREBASE_DATABASE_ID', val: firebaseConfig.firestoreDatabaseId, critical: true },
    { key: 'VITE_FIREBASE_API_KEY', val: firebaseConfig.apiKey, critical: false },
    { key: 'VITE_FIREBASE_AUTH_DOMAIN', val: firebaseConfig.authDomain, critical: false },
    { key: 'VITE_FIREBASE_APP_ID', val: firebaseConfig.appId, critical: false },
    { key: 'VITE_FIREBASE_STORAGE_BUCKET', val: firebaseConfig.storageBucket, critical: false },
    { key: 'VITE_FIREBASE_MESSAGING_SENDER_ID', val: firebaseConfig.messagingSenderId, critical: false },
  ];

  const copyAllEnvBlock = () => {
    const block = netlifyEnvVars.map((item) => `${item.key}=${item.val}`).join('\n');
    copyToClipboard(block, 'ALL_ENV');
  };

  if (!isOpen) return null;

  const effectiveConnected =
    pingResult !== null
      ? pingResult.connected && (stats ? stats.isConnected : true)
      : stats !== null
      ? stats.isConnected
      : isCloudConnected;

  const diagnosticError =
    (pingResult && !pingResult.connected && (pingResult.errorMessage || pingResult.errorCode)) ||
    (stats && !stats.isConnected && (stats.errorMessage || stats.errorCode)) ||
    null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
      <div className="relative w-full max-w-3xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden my-auto">
        {/* Modal Header */}
        <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-amber-950 text-white p-5 sm:p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-400/30 flex items-center justify-center">
                <Cloud className="w-5 h-5 text-amber-400" />
              </div>
              <div>
                <h3 className="text-lg font-bold tracking-tight flex items-center gap-2 flex-wrap">
                  <span>Centre de Synchronisation Globale</span>
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border ${
                      effectiveConnected
                        ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                        : 'bg-rose-500/20 text-rose-200 border-rose-500/40'
                    }`}
                  >
                    {effectiveConnected ? 'Netlify & Cloud Unifié' : 'Action Requise'}
                  </span>
                </h3>
                <p className="text-xs text-slate-300">
                  Toutes les pages (Stocks, Ventes, Factures, Clients, Change) utilisent la même base Cloud Firestore.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-700/60 transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Navigation Sub-Tabs */}
          <div className="flex items-center gap-2 mt-5 border-t border-slate-700/60 pt-3 text-xs flex-wrap">
            <button
              type="button"
              onClick={() => setActiveTab('status')}
              className={`px-3 py-1.5 rounded-lg font-semibold transition cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'status'
                  ? 'bg-amber-500 text-slate-950 shadow-xs'
                  : 'text-slate-300 hover:bg-slate-800'
              }`}
            >
              <Database className="w-3.5 h-3.5" />
              <span>État Temps Réel &amp; Données</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('deployment')}
              className={`px-3 py-1.5 rounded-lg font-semibold transition cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'deployment'
                  ? 'bg-amber-500 text-slate-950 shadow-xs'
                  : 'text-slate-300 hover:bg-slate-800'
              }`}
            >
              <Globe className="w-3.5 h-3.5" />
              <span>Liaison Netlify &amp; GitHub</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('env')}
              className={`px-3 py-1.5 rounded-lg font-semibold transition cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'env'
                  ? 'bg-amber-500 text-slate-950 shadow-xs'
                  : 'text-slate-300 hover:bg-slate-800'
              }`}
            >
              <Settings className="w-3.5 h-3.5" />
              <span>Variables Netlify (.env)</span>
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-5 sm:p-6 space-y-6 max-h-[75vh] overflow-y-auto">
          {/* TAB 1: Real-time Status */}
          {activeTab === 'status' && (
            <div className="space-y-5">
              {/* Status Banner */}
              <div
                className={`p-4 rounded-xl border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 ${
                  effectiveConnected ? 'bg-slate-50 border-slate-200' : 'bg-rose-50 border-rose-200'
                }`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div
                    className={`w-3.5 h-3.5 rounded-full shrink-0 ${
                      effectiveConnected ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'
                    }`}
                  />
                  <div className="min-w-0">
                    <div className="text-sm font-bold text-slate-900 flex items-center gap-2 flex-wrap">
                      <span>
                        {effectiveConnected
                          ? 'Base Firestore : Connectée & Opérationnelle'
                          : 'Base Firestore : Erreur de Connexion / Permissions'}
                      </span>
                      {effectiveConnected && pingResult && (
                        <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-emerald-100 text-emerald-800">
                          {pingResult.latencyMs} ms
                        </span>
                      )}
                      {lastSyncTime && effectiveConnected && (
                        <span className="text-[11px] font-normal text-slate-500">
                          · Sync {lastSyncTime}
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-slate-500 font-mono mt-0.5 truncate">
                      Base active : <span className="text-slate-700 font-semibold">{firebaseConfig.firestoreDatabaseId}</span>
                    </div>
                    <div className="text-[11px] text-slate-500 mt-0.5">
                      Source config :{' '}
                      <span className="font-semibold text-slate-700">
                        {hasNetlifyEnvOverride ? 'Variables VITE_FIREBASE_* (Netlify)' : 'firebase-applet-config.json'}
                      </span>
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    loadStats();
                    handlePing();
                  }}
                  disabled={isPinging}
                  className="px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-100 border border-slate-300 rounded-lg flex items-center gap-1.5 transition cursor-pointer shrink-0"
                >
                  <Wifi className={`w-3.5 h-3.5 text-blue-600 ${isPinging ? 'animate-spin' : ''}`} />
                  <span>Tester la connexion</span>
                </button>
              </div>

              {/* Diagnostic error details if any */}
              {diagnosticError && (
                <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl space-y-2 text-xs text-rose-900">
                  <div className="font-bold flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                    <span>Diagnostic de l'erreur Cloud :</span>
                  </div>
                  <p className="font-mono text-[11px] bg-white/80 p-2 rounded border border-rose-200 text-rose-800 break-all">
                    {diagnosticError}
                  </p>
                  <p className="text-[11px] text-rose-800">
                    Si cette erreur apparaît sur <strong>Netlify</strong>, vérifiez l&apos;onglet{' '}
                    <button
                      type="button"
                      onClick={() => setActiveTab('env')}
                      className="underline font-bold cursor-pointer"
                    >
                      Variables Netlify (.env)
                    </button>{' '}
                    et assurez-vous que <code className="font-mono">VITE_FIREBASE_DATABASE_ID</code> correspond exactement à{' '}
                    <code className="font-mono">{firebaseConfig.firestoreDatabaseId}</code>, puis relancez un déploiement Netlify (« Clear cache and deploy site »).
                  </p>
                </div>
              )}

              {/* Messages Feedback */}
              {syncSuccessMessage && (
                <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center gap-2.5 text-xs text-emerald-800">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>{syncSuccessMessage}</span>
                </div>
              )}
              {syncErrorMessage && (
                <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl flex items-center gap-2.5 text-xs text-rose-800">
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                  <span>{syncErrorMessage}</span>
                </div>
              )}

              {/* Collections Grid */}
              <div>
                <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-3">
                  État des Pages &amp; Collections Synchronisées
                </h4>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  <div className="p-3 rounded-xl bg-white border border-slate-200 shadow-2xs">
                    <div className="flex items-center justify-between text-slate-500 mb-1">
                      <span className="text-xs font-medium">Produits Boissons</span>
                      <Package className="w-4 h-4 text-amber-500" />
                    </div>
                    <div className="text-lg font-bold text-slate-900 tabular-nums">
                      {stats && stats.isConnected ? stats.productsCount : fullData.products.length}
                    </div>
                    <div className={`text-[10px] font-semibold flex items-center gap-1 mt-1 ${effectiveConnected ? 'text-emerald-600' : 'text-amber-600'}`}>
                      <Check className="w-3 h-3" /> {effectiveConnected ? 'Synchronisé en direct' : 'Cache local'}
                    </div>
                  </div>

                  <div className="p-3 rounded-xl bg-white border border-slate-200 shadow-2xs">
                    <div className="flex items-center justify-between text-slate-500 mb-1">
                      <span className="text-xs font-medium">Clients CHR</span>
                      <Users className="w-4 h-4 text-blue-500" />
                    </div>
                    <div className="text-lg font-bold text-slate-900 tabular-nums">
                      {stats && stats.isConnected ? stats.customersCount : fullData.customers.length}
                    </div>
                    <div className={`text-[10px] font-semibold flex items-center gap-1 mt-1 ${effectiveConnected ? 'text-emerald-600' : 'text-amber-600'}`}>
                      <Check className="w-3 h-3" /> {effectiveConnected ? 'Synchronisé en direct' : 'Cache local'}
                    </div>
                  </div>

                  <div className="p-3 rounded-xl bg-white border border-slate-200 shadow-2xs">
                    <div className="flex items-center justify-between text-slate-500 mb-1">
                      <span className="text-xs font-medium">Ventes &amp; Factures</span>
                      <ShoppingBag className="w-4 h-4 text-emerald-500" />
                    </div>
                    <div className="text-lg font-bold text-slate-900 tabular-nums">
                      {stats && stats.isConnected ? stats.salesCount : fullData.sales.length}
                    </div>
                    <div className={`text-[10px] font-semibold flex items-center gap-1 mt-1 ${effectiveConnected ? 'text-emerald-600' : 'text-amber-600'}`}>
                      <Check className="w-3 h-3" /> {effectiveConnected ? 'Synchronisé en direct' : 'Cache local'}
                    </div>
                  </div>

                  <div className="p-3 rounded-xl bg-white border border-slate-200 shadow-2xs">
                    <div className="flex items-center justify-between text-slate-500 mb-1">
                      <span className="text-xs font-medium">Mouvements Stocks</span>
                      <FileSpreadsheet className="w-4 h-4 text-purple-500" />
                    </div>
                    <div className="text-lg font-bold text-slate-900 tabular-nums">
                      {stats && stats.isConnected ? stats.movementsCount : fullData.movements.length}
                    </div>
                    <div className={`text-[10px] font-semibold flex items-center gap-1 mt-1 ${effectiveConnected ? 'text-emerald-600' : 'text-amber-600'}`}>
                      <Check className="w-3 h-3" /> {effectiveConnected ? 'Synchronisé en direct' : 'Cache local'}
                    </div>
                  </div>

                  <div className="p-3 rounded-xl bg-white border border-slate-200 shadow-2xs">
                    <div className="flex items-center justify-between text-slate-500 mb-1">
                      <span className="text-xs font-medium">Utilisateurs &amp; Vendeurs</span>
                      <Users className="w-4 h-4 text-indigo-500" />
                    </div>
                    <div className="text-lg font-bold text-slate-900 tabular-nums">
                      {stats && stats.isConnected ? stats.sellersCount : fullData.sellers.length}
                    </div>
                    <div className={`text-[10px] font-semibold flex items-center gap-1 mt-1 ${effectiveConnected ? 'text-emerald-600' : 'text-amber-600'}`}>
                      <Check className="w-3 h-3" /> {effectiveConnected ? 'Synchronisé en direct' : 'Cache local'}
                    </div>
                  </div>

                  <div className="p-3 rounded-xl bg-white border border-slate-200 shadow-2xs">
                    <div className="flex items-center justify-between text-slate-500 mb-1">
                      <span className="text-xs font-medium">Bureau de Change</span>
                      <ArrowLeftRight className="w-4 h-4 text-teal-500" />
                    </div>
                    <div className="text-lg font-bold text-slate-900 tabular-nums">
                      {stats && stats.isConnected ? stats.exchangeTransactionsCount : fullData.exchangeTransactions.length}
                    </div>
                    <div className={`text-[10px] font-semibold flex items-center gap-1 mt-1 ${effectiveConnected ? 'text-emerald-600' : 'text-amber-600'}`}>
                      <Check className="w-3 h-3" /> Taux USD/DOP à jour
                    </div>
                  </div>
                </div>
              </div>

              {/* Action Banner */}
              <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 flex flex-col sm:flex-row items-center justify-between gap-4">
                <div>
                  <h5 className="text-sm font-bold text-amber-950">
                    Forcer la Consolidation vers Netlify &amp; GitHub
                  </h5>
                  <p className="text-xs text-amber-800 mt-0.5">
                    Publie l&apos;ensemble des données locales vers la base Cloud partagée ({firebaseConfig.firestoreDatabaseId}).
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleForceSync}
                  disabled={isSyncing}
                  className="px-4 py-2.5 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded-xl flex items-center gap-2 shadow-xs transition cursor-pointer whitespace-nowrap shrink-0 disabled:opacity-50"
                >
                  <RefreshCw className={`w-4 h-4 ${isSyncing ? 'animate-spin' : ''}`} />
                  <span>{isSyncing ? 'Synchronisation en cours...' : 'Synchroniser tout vers le Cloud'}</span>
                </button>
              </div>
            </div>
          )}

          {/* TAB 2: Netlify & GitHub Deployment */}
          {activeTab === 'deployment' && (
            <div className="space-y-5 text-xs text-slate-600">
              <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-950 space-y-2">
                <div className="font-bold text-sm flex items-center gap-2 text-amber-900">
                  <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                  <span>Pourquoi Netlify peut sembler désynchronisé ?</span>
                </div>
                <p className="leading-relaxed">
                  Pour que le site Netlify et votre espace de travail partagent exactement les mêmes données en direct,
                  Netlify doit impérativement utiliser le <strong>même identifiant de base Firestore</strong> :
                </p>
                <div className="font-mono text-[11px] bg-white px-3 py-2 rounded-lg border border-amber-300 text-slate-900 flex items-center justify-between gap-2">
                  <span className="truncate">{firebaseConfig.firestoreDatabaseId}</span>
                  <button
                    type="button"
                    onClick={() => copyToClipboard(firebaseConfig.firestoreDatabaseId, 'DB_ID')}
                    className="px-2 py-1 text-[10px] font-sans font-bold bg-amber-100 hover:bg-amber-200 text-amber-950 rounded cursor-pointer shrink-0"
                  >
                    {copiedKey === 'DB_ID' ? 'Copié !' : 'Copier'}
                  </button>
                </div>
                <ol className="list-decimal list-inside space-y-1 text-amber-900 pt-1">
                  <li>
                    Mettez à jour votre dépôt GitHub (ou ajoutez les variables dans l&apos;onglet{' '}
                    <button
                      type="button"
                      onClick={() => setActiveTab('env')}
                      className="underline font-bold cursor-pointer"
                    >
                      Variables Netlify (.env)
                    </button>
                    ).
                  </li>
                  <li>
                    Dans Netlify : <strong>Deploys &gt; Trigger deploy &gt; Clear cache and deploy site</strong>.
                  </li>
                </ol>
              </div>

              {/* Official Unique Link Highlight */}
              <div className="p-4 rounded-xl bg-emerald-50 border-2 border-emerald-500 text-emerald-950 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="font-bold text-sm flex items-center gap-2 text-emerald-900">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                    <span>Lien Officiel Unique :</span>
                  </div>
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-600 text-white uppercase">
                    Site Production
                  </span>
                </div>
                <div className="font-mono text-xs font-bold text-emerald-800 bg-white p-2.5 rounded-lg border border-emerald-300 flex items-center justify-between">
                  <span className="truncate">https://gestion-de-ventanakayit.netlify.app/</span>
                  <a
                    href="https://gestion-de-ventanakayit.netlify.app/"
                    target="_blank"
                    rel="noreferrer"
                    className="text-blue-700 hover:underline flex items-center gap-1 font-sans text-xs ml-2 shrink-0"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    <span>Visiter</span>
                  </a>
                </div>
                <div className="text-[11px] text-emerald-800 flex items-center gap-1.5 pt-1">
                  <Ban className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                  <span>Une fois redéployé avec le même ID de base, toutes les saisies sont instantanées.</span>
                </div>
              </div>

              <div className="space-y-3">
                <h4 className="font-bold text-slate-800 uppercase text-xs tracking-wider">
                  Fichiers Déjà Configurés pour Netlify &amp; GitHub
                </h4>

                <div className="space-y-2">
                  <div className="p-3 rounded-lg border border-slate-200 bg-white flex items-start justify-between">
                    <div>
                      <div className="font-mono font-bold text-slate-800">netlify.toml</div>
                      <div className="text-[11px] text-slate-500 mt-0.5">
                        Configure la commande de build (<code>npm run build</code>), le dossier (<code>dist</code>) et les redirections SPA.
                      </div>
                    </div>
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800 shrink-0">
                      Configuré
                    </span>
                  </div>

                  <div className="p-3 rounded-lg border border-slate-200 bg-white flex items-start justify-between">
                    <div>
                      <div className="font-mono font-bold text-slate-800">public/_redirects</div>
                      <div className="text-[11px] text-slate-500 mt-0.5">
                        Assure la gestion fluide des URLs et du rafraîchissement des pages sur Netlify sans erreur 404.
                      </div>
                    </div>
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800 shrink-0">
                      Configuré
                    </span>
                  </div>

                  <div className="p-3 rounded-lg border border-slate-200 bg-white flex items-start justify-between">
                    <div>
                      <div className="font-mono font-bold text-slate-800">firebase-applet-config.json</div>
                      <div className="text-[11px] text-slate-500 mt-0.5">
                        Contient la configuration Cloud actuelle pour que le build Netlify se connecte à la même base Firestore.
                      </div>
                    </div>
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800 shrink-0">
                      Synchronisé
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: Environment Variables */}
          {activeTab === 'env' && (
            <div className="space-y-4 text-xs">
              <div className="p-3.5 rounded-xl bg-blue-50 border border-blue-200 text-blue-950 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <div className="font-bold">Importer en 1 clic dans Netlify</div>
                  <p className="text-[11px] text-blue-800 mt-0.5">
                    Dans Netlify : <strong>Site configuration &gt; Environment variables &gt; Add a variable &gt; Import from a .env file</strong>, puis relancez un déploiement.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={copyAllEnvBlock}
                  className="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold flex items-center gap-1.5 shrink-0 cursor-pointer transition"
                >
                  {copiedKey === 'ALL_ENV' ? (
                    <>
                      <Check className="w-3.5 h-3.5" />
                      <span>Bloc .env copié !</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>Copier tout (.env)</span>
                    </>
                  )}
                </button>
              </div>

              <div className="space-y-2">
                {netlifyEnvVars.map(({ key, val, critical }) => (
                  <div
                    key={key}
                    className={`p-2.5 rounded-lg border flex items-center justify-between font-mono ${
                      critical ? 'border-amber-300 bg-amber-50/60' : 'border-slate-200 bg-slate-50'
                    }`}
                  >
                    <div className="min-w-0 pr-3">
                      <div className="flex items-center gap-2">
                        <span className="text-amber-800 font-bold">{key}</span>
                        {critical && (
                          <span className="font-sans text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-200 text-amber-950">
                            Essentiel
                          </span>
                        )}
                      </div>
                      <span className="text-slate-600 text-[11px] truncate block">{val}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => copyToClipboard(val, key)}
                      className="px-2.5 py-1 text-[11px] bg-white border border-slate-200 hover:border-slate-300 rounded font-sans flex items-center gap-1 text-slate-700 cursor-pointer shrink-0"
                    >
                      {copiedKey === key ? (
                        <>
                          <Check className="w-3 h-3 text-emerald-600" />
                          <span className="text-emerald-700">Copié</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3 h-3 text-slate-400" />
                          <span>Copier</span>
                        </>
                      )}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
          <div className="text-[11px] text-slate-500 flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span>Firestore multi-appareils &amp; Netlify</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-xl transition cursor-pointer"
          >
            Fermer
          </button>
        </div>
      </div>
    </div>
  );
}
