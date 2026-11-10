import React, { useState, useEffect } from 'react';
import { AppSettings, Seller } from '../../types';
import {
  Settings,
  Building,
  Save,
  RotateCcw,
  ShieldCheck,
  Check,
  Percent,
  Package,
  Users,
  Download,
  AlertTriangle,
  CreditCard,
  Smartphone,
  Cloud,
  Lock,
} from 'lucide-react';
import { formatHTG } from '../../utils/formatters';
import { MobileDeploymentGuideModal } from '../mobile/MobileDeploymentGuideModal';

interface SettingsManagementViewProps {
  settings: AppSettings;
  sellers: Seller[];
  onSaveSettings: (settings: AppSettings) => void;
  onResetAllData: () => void;
  onOpenMobileGuide?: () => void;
  onOpenCloudSync?: () => void;
}

export const SettingsManagementView: React.FC<SettingsManagementViewProps> = ({
  settings,
  sellers,
  onSaveSettings,
  onResetAllData,
  onOpenMobileGuide,
  onOpenCloudSync,
}) => {
  const [formData, setFormData] = useState<AppSettings>(settings);
  const [isDirty, setIsDirty] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [showMobileModal, setShowMobileModal] = useState(false);

  // Sync formData when settings prop updates from Cloud, only if user isn't currently editing
  useEffect(() => {
    if (!isDirty) {
      setFormData(settings);
    }
  }, [settings, isDirty]);

  const updateField = <K extends keyof AppSettings>(key: K, value: AppSettings[K]) => {
    setIsDirty(true);
    setFormData((prev) => ({ ...prev, [key]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const stampedSettings: AppSettings = {
      ...formData,
      updatedAt: new Date().toISOString(),
    };
    onSaveSettings(stampedSettings);
    setFormData(stampedSettings);
    setIsDirty(false);
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 3500);
  };

  const handleExportJSON = () => {
    const backup = {
      timestamp: new Date().toISOString(),
      settings: formData,
    };
    const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `backup_parametres_distriboissons_${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-xl border border-slate-200 shadow-2xs">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold text-slate-900 tracking-tight">
              Paramètres Généraux & Règles Métier
            </h2>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200 flex items-center gap-1">
              <ShieldCheck className="w-3 h-3 text-emerald-600" />
              <span>Protégé contre écrasement</span>
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Informations de l'établissement distributeur, barèmes des consignes de fûts, taux de TVA et gestion des commerciaux. Vos modifications sont enregistrées définitivement dans le Cloud.
          </p>
          {settings.updatedAt && (
            <p className="text-[11px] text-slate-400 font-mono mt-1">
              Dernière synchronisation réussie : {new Date(settings.updatedAt).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
            </p>
          )}
        </div>

        <div className="flex items-center gap-2">
          {isDirty && (
            <div className="p-2 bg-amber-50 border border-amber-300 text-amber-900 rounded-lg text-xs flex items-center gap-1.5 animate-pulse">
              <AlertTriangle className="w-4 h-4 text-amber-600" />
              <span className="font-semibold">Modifications non enregistrées</span>
            </div>
          )}

          {saveSuccess && (
            <div className="p-2 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-lg text-xs flex items-center gap-1.5 animate-in fade-in duration-200">
              <Check className="w-4 h-4 text-emerald-600" />
              <span className="font-semibold">Paramètres enregistrés & verrouillés dans le Cloud</span>
            </div>
          )}
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Company Profile Card */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
            <span className="p-2 bg-blue-50 text-blue-700 rounded-lg">
              <Building className="w-4 h-4" />
            </span>
            <div>
              <h3 className="text-sm font-semibold text-slate-900">
                Identité de l'Entreprise Distributrice
              </h3>
              <p className="text-xs text-slate-500">
                Coordonnées imprimées sur les factures et bons de livraison CHR
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Raison Sociale / Enseigne
              </label>
              <input
                type="text"
                required
                value={formData.companyName}
                onChange={(e) => updateField('companyName', e.target.value)}
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg focus:outline-none focus:border-blue-500 font-medium"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Numéro SIRET
              </label>
              <input
                type="text"
                value={formData.companySiret}
                onChange={(e) => updateField('companySiret', e.target.value)}
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg focus:outline-none font-mono"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Adresse de l'Entrepôt & Siège
              </label>
              <input
                type="text"
                value={formData.companyAddress}
                onChange={(e) => updateField('companyAddress', e.target.value)}
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Email de Facturation
              </label>
              <input
                type="email"
                value={formData.contactEmail}
                onChange={(e) => updateField('contactEmail', e.target.value)}
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Standard Téléphonique
              </label>
              <input
                type="text"
                value={formData.contactPhone}
                onChange={(e) => updateField('contactPhone', e.target.value)}
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg focus:outline-none font-mono"
              />
            </div>
          </div>
        </div>

        {/* Consignments & Fiscal Rules */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
            <span className="p-2 bg-amber-50 text-amber-700 rounded-lg">
              <Package className="w-4 h-4" />
            </span>
            <div>
              <h3 className="text-sm font-semibold text-slate-900">
                Tarifs des Consignes & Paramètres Fiscaux
              </h3>
              <p className="text-xs text-slate-500">
                Montants légaux des garanties pour fûts inox, caisses de bouteilles et TVA
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
            <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Consigne Fût Inox 30L/20L (HTG)
              </label>
              <input
                type="number"
                min="0"
                step="50"
                value={formData.kegConsignmentDepositPrice}
                onChange={(e) =>
                  updateField('kegConsignmentDepositPrice', parseFloat(e.target.value) || 0)
                }
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg font-mono font-bold text-slate-900 focus:outline-none"
              />
              <span className="text-[10px] text-slate-500 mt-1 block">
                Facturé par défaut à la livraison de fûts
              </span>
            </div>

            <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Consigne Caisse de Verre (HTG)
              </label>
              <input
                type="number"
                min="0"
                step="10"
                value={formData.crateConsignmentDepositPrice}
                onChange={(e) =>
                  updateField('crateConsignmentDepositPrice', parseFloat(e.target.value) || 0)
                }
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg font-mono font-bold text-slate-900 focus:outline-none"
              />
              <span className="text-[10px] text-slate-500 mt-1 block">
                Casiers 12×1L ou 12×75cl consignés
              </span>
            </div>

            <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-medium text-slate-700">
                  Taux de TVA par Défaut (%)
                </label>
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800">
                  {Math.round(formData.defaultTaxRate * 100)}%
                </span>
              </div>
              <input
                type="number"
                min="0"
                max="100"
                step="0.5"
                value={Math.round(formData.defaultTaxRate * 100 * 10) / 10}
                onChange={(e) => {
                  const val = parseFloat(e.target.value);
                  updateField('defaultTaxRate', isNaN(val) ? 0 : Math.max(0, val) / 100);
                }}
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg font-mono font-bold text-slate-900 focus:outline-none"
              />
              <div className="flex items-center gap-1.5 mt-2">
                <button
                  type="button"
                  onClick={() => updateField('defaultTaxRate', 0)}
                  className={`px-2 py-0.5 rounded text-[10px] font-bold transition-colors ${
                    formData.defaultTaxRate === 0
                      ? 'bg-amber-500 text-slate-950 ring-1 ring-amber-600'
                      : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  0% (Défaut)
                </button>
                <button
                  type="button"
                  onClick={() => updateField('defaultTaxRate', 0.1)}
                  className={`px-2 py-0.5 rounded text-[10px] font-medium transition-colors ${
                    Math.round(formData.defaultTaxRate * 100) === 10
                      ? 'bg-amber-500 text-slate-950 font-bold'
                      : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  10%
                </button>
                <button
                  type="button"
                  onClick={() => updateField('defaultTaxRate', 0.2)}
                  className={`px-2 py-0.5 rounded text-[10px] font-medium transition-colors ${
                    Math.round(formData.defaultTaxRate * 100) === 20
                      ? 'bg-amber-500 text-slate-950 font-bold'
                      : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  20%
                </button>
              </div>
              <span className="text-[10px] text-slate-500 mt-1.5 block">
                Taux par défaut (0% configuré). Ajustable manuellement lors de chaque vente si un client le demande.
              </span>
            </div>
          </div>

          <div className="p-3.5 bg-slate-50 rounded-lg border border-slate-200 flex items-center justify-between text-xs">
            <div>
              <span className="font-semibold text-slate-900 block">
                Décrémentation Automatique des Stocks
              </span>
              <span className="text-slate-500 text-[11px]">
                Déduit immédiatement les fûts et packs lors de la validation d'un bon de vente
              </span>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={formData.autoDeductStockOnSale}
                onChange={(e) =>
                  updateField('autoDeductStockOnSale', e.target.checked)
                }
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
            </label>
          </div>
        </div>

        {/* Commercial Team Quick View */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
            <span className="p-2 bg-indigo-50 text-indigo-700 rounded-lg">
              <Users className="w-4 h-4" />
            </span>
            <div>
              <h3 className="text-sm font-semibold text-slate-900">
                Équipe Commerciale & Barèmes de Commission
              </h3>
              <p className="text-xs text-slate-500">
                {sellers.length} commerciaux actifs avec objectifs et commissionnement sur ventes CHR
              </p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 font-medium border-b border-slate-200">
                <tr>
                  <th className="py-2.5 px-3">Commercial</th>
                  <th className="py-2.5 px-3">Rôle / Réseau</th>
                  <th className="py-2.5 px-3 text-right">Commission (%)</th>
                  <th className="py-2.5 px-3 text-right">Objectif Mensuel</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {sellers.map((s) => (
                  <tr key={s.id}>
                    <td className="py-2.5 px-3 font-semibold text-slate-900">{s.name}</td>
                    <td className="py-2.5 px-3 text-slate-600">{s.role}</td>
                    <td className="py-2.5 px-3 text-right font-mono font-bold text-indigo-700">
                      {Math.round(s.commissionRate * 100)}%
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono text-slate-900 tabular-nums">
                      {formatHTG(s.targetMonthlyRevenue)} HT
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Submit Actions Button */}
        <div className="flex items-center justify-between p-4 bg-white rounded-xl border border-slate-200 shadow-xs">
          <button
            type="button"
            onClick={handleExportJSON}
            className="px-3.5 py-2 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors flex items-center gap-1.5"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Sauvegarder Configuration (JSON)</span>
          </button>

          <button
            type="submit"
            className="px-5 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors flex items-center gap-1.5 shadow-xs"
          >
            <Save className="w-4 h-4" />
            <span>Enregistrer les Modifications</span>
          </button>
        </div>
      </form>

      {/* Mobile Apps Store Deployment Section */}
      <div className="p-5 rounded-xl border border-blue-200 bg-gradient-to-br from-blue-50/70 via-indigo-50/40 to-white space-y-3 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-start gap-3">
            <span className="p-2.5 bg-blue-600 text-white rounded-xl shadow-xs">
              <Smartphone className="w-5 h-5" />
            </span>
            <div>
              <div className="flex items-center gap-2">
                <h4 className="text-sm font-bold text-slate-900">
                  Déploiement Mobile : Google Play Store & Apple App Store
                </h4>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-100 text-blue-700">
                  Capacitor Ready
                </span>
              </div>
              <p className="text-xs text-slate-600 mt-1 max-w-2xl leading-relaxed">
                Transformez OptiVente Pro en application native certifiée pour vos commerciaux itinérants, livreurs et gestionnaires de dépôts de boissons. Accédez aux guides pas-à-pas, commandes de build et checklist de soumission aux stores.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => {
              if (onOpenMobileGuide) onOpenMobileGuide();
              else setShowMobileModal(true);
            }}
            className="px-4 py-2.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition-all shadow-xs flex items-center justify-center gap-2 shrink-0 cursor-pointer"
          >
            <Smartphone className="w-4 h-4" />
            <span>Ouvrir le Guide des Stores</span>
          </button>
        </div>
      </div>

      {/* Cloud Multi-Platform Synchronization Section (Netlify & GitHub) */}
      <div className="p-5 rounded-xl border border-emerald-200 bg-gradient-to-br from-emerald-50/80 via-teal-50/40 to-white space-y-3 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-start gap-3">
            <span className="p-2.5 bg-emerald-600 text-white rounded-xl shadow-xs">
              <Cloud className="w-5 h-5" />
            </span>
            <div>
              <div className="flex items-center gap-2">
                <h4 className="text-sm font-bold text-slate-900">
                  Synchronisation Multi-Plateformes (Netlify & GitHub)
                </h4>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  Temps Réel Actif
                </span>
              </div>
              <p className="text-xs text-slate-600 mt-1 max-w-2xl leading-relaxed">
                Toutes les pages (catalogue boissons et vins, clients CHR, factures et encaissements, mouvements de stocks et change) sont automatiquement unifiées avec votre déploiement Netlify et votre dépôt GitHub.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onOpenCloudSync}
            className="px-4 py-2.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl transition-all shadow-xs flex items-center justify-center gap-2 shrink-0 cursor-pointer"
          >
            <Cloud className="w-4 h-4" />
            <span>Gérer la Synchro Cloud</span>
          </button>
        </div>
      </div>

      {/* Reset & Maintenance Section */}
      <div className="p-5 rounded-xl border border-red-200 bg-red-50/40 space-y-3">
        <div className="flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-red-600" />
          <h4 className="text-sm font-bold text-red-950">Zone de Réinitialisation des Données</h4>
        </div>
        <p className="text-xs text-red-800">
          Réinitialise l'ensemble des stocks de boissons, clients CHR, factures et mouvements aux valeurs d'origine du catalogue.
        </p>

        <div>
          <button
            type="button"
            onClick={() => setShowResetConfirm(true)}
            className="px-3.5 py-1.5 text-xs font-semibold text-red-700 bg-white border border-red-300 hover:bg-red-50 rounded-lg transition-colors shadow-xs"
          >
            Réinitialiser les données de démonstration
          </button>
        </div>
      </div>

      {/* Modal Confirmation Reset */}
      {showResetConfirm && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-2xl border border-slate-200 max-w-md w-full p-6 animate-in fade-in duration-150">
            <h3 className="text-base font-bold text-slate-900">
              Confirmer la réinitialisation ?
            </h3>
            <p className="text-xs text-slate-600 mt-2">
              Cette action va restaurer les données d'origine (17 références de boissons gazeuses et alcools, clients CHR et 30 jours de ventes).
            </p>

            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowResetConfirm(false)}
                className="px-4 py-2 text-xs font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowResetConfirm(false);
                  onResetAllData();
                }}
                className="px-4 py-2 text-xs font-semibold text-white bg-red-600 hover:bg-red-700 rounded-lg shadow-xs"
              >
                Oui, Réinitialiser
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Mobile Deployment Guide Modal */}
      <MobileDeploymentGuideModal
        isOpen={showMobileModal}
        onClose={() => setShowMobileModal(false)}
      />
    </div>
  );
};
