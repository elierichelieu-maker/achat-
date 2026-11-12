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
  Printer,
  Receipt,
  FileText,
  Image as ImageIcon,
  Upload,
  Trash2,
  Eye,
} from 'lucide-react';
import { formatHTG } from '../../utils/formatters';
import { MobileDeploymentGuideModal } from '../mobile/MobileDeploymentGuideModal';
import { WaterBottleLogo } from '../common/WaterBottleLogo';

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

  const handleLogoFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      alert("L'image sélectionnée est trop volumineuse (max 2 Mo). Veuillez choisir une image plus légère.");
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const base64 = event.target?.result as string;
      if (base64) {
        updateField('companyLogo', base64);
      }
    };
    reader.readAsDataURL(file);
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

        {/* Company Logo for 80mm POS Thermal Receipts & Invoices */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <span className="p-2 bg-amber-50 text-amber-700 rounded-lg">
                <ImageIcon className="w-4 h-4" />
              </span>
              <div>
                <h3 className="text-sm font-semibold text-slate-900">
                  Logo de l'Entreprise sur Ticket Thermique 80mm
                </h3>
                <p className="text-xs text-slate-500">
                  En-tête officiel imprimé au sommet de chaque ticket 80mm et facture A4
                </p>
              </div>
            </div>
            {formData.companyLogo ? (
              <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1 w-fit">
                <Check className="w-3 h-3 text-emerald-600" />
                <span>Logo personnalisé configuré</span>
              </span>
            ) : (
              <span className="px-2.5 py-1 rounded-full text-[11px] font-medium bg-slate-100 text-slate-600 border border-slate-200 flex items-center gap-1 w-fit">
                <span>Logo standard par défaut</span>
              </span>
            )}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
            {/* Left 2 Cols: Upload and controls */}
            <div className="lg:col-span-2 space-y-4 text-xs">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  1. Importer votre logo depuis cet appareil
                </label>
                <div className="flex flex-wrap items-center gap-2">
                  <label className="px-3.5 py-2.5 bg-amber-600 hover:bg-amber-700 text-white font-semibold rounded-lg cursor-pointer transition-colors flex items-center gap-2 shadow-xs">
                    <Upload className="w-4 h-4" />
                    <span>Choisir une image (PNG, JPG, SVG)</span>
                    <input
                      type="file"
                      accept="image/png, image/jpeg, image/jpg, image/svg+xml, image/webp"
                      onChange={handleLogoFileUpload}
                      className="hidden"
                    />
                  </label>
                  {formData.companyLogo && (
                    <button
                      type="button"
                      onClick={() => updateField('companyLogo', '')}
                      className="px-3 py-2.5 bg-slate-100 hover:bg-rose-50 text-slate-600 hover:text-rose-600 border border-slate-200 rounded-lg transition-colors flex items-center gap-1.5 font-medium cursor-pointer"
                    >
                      <Trash2 className="w-4 h-4" />
                      <span>Supprimer le logo</span>
                    </button>
                  )}
                </div>
                <p className="text-[11px] text-slate-500 mt-1.5 leading-relaxed">
                  Conseil imprimante thermique 80mm : préférez un logo net et contrasté (idéalement sur fond blanc ou transparent).
                </p>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  2. Ou coller une URL d'image directe :
                </label>
                <input
                  type="url"
                  placeholder="https://votre-domaine.com/logo-entreprise.png"
                  value={formData.companyLogo || ''}
                  onChange={(e) => updateField('companyLogo', e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg focus:outline-none focus:border-amber-500 font-mono text-[11px]"
                />
              </div>

              {/* Toggle showLogoOnTicket */}
              <div className="p-3.5 bg-slate-50 rounded-lg border border-slate-200 flex items-center justify-between">
                <div>
                  <span className="font-semibold text-slate-900 block text-xs">
                    Activer l'impression du logo sur les tickets 80mm
                  </span>
                  <span className="text-slate-500 text-[11px]">
                    Si décoché, seul le nom de l'entreprise sera imprimé en texte brut
                  </span>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.showLogoOnTicket !== false}
                    onChange={(e) =>
                      updateField('showLogoOnTicket', e.target.checked)
                    }
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-amber-600"></div>
                </label>
              </div>
            </div>

            {/* Right: Live Preview on 80mm Ticket Paper */}
            <div className="bg-slate-100/70 border border-slate-200 rounded-xl p-4 flex flex-col items-center justify-center text-center">
              <span className="text-[10px] font-bold text-slate-600 uppercase tracking-wider mb-2 flex items-center gap-1">
                <Eye className="w-3.5 h-3.5 text-slate-500" />
                <span>Aperçu En-Tête Ticket 80mm</span>
              </span>
              <div className="w-full max-w-[210px] bg-white border-2 border-dashed border-slate-300 rounded-xl p-3.5 shadow-sm font-mono space-y-1.5 text-slate-900">
                {formData.showLogoOnTicket !== false ? (
                  formData.companyLogo ? (
                    <div className="py-1">
                      <img
                        src={formData.companyLogo}
                        alt="Logo entreprise"
                        className="max-h-12 max-w-[130px] mx-auto object-contain"
                      />
                      <span className="text-[9px] text-emerald-700 font-sans font-medium block mt-1">✓ Votre logo personnalisé</span>
                    </div>
                  ) : (
                    <div className="py-1">
                      <div className="w-10 h-10 mx-auto rounded-xl bg-amber-600 text-white flex items-center justify-center mb-1 shadow-xs">
                        <WaterBottleLogo className="w-6 h-6 text-white" />
                      </div>
                      <span className="text-[9px] text-slate-400 font-sans block">Logo bouteille par défaut</span>
                    </div>
                  )
                ) : (
                  <div className="py-2.5 text-[10px] text-slate-400 italic font-sans">
                    (Logo désactivé sur le ticket)
                  </div>
                )}
                <div className="text-[11px] font-black uppercase text-slate-900 border-t border-dashed border-slate-300 pt-1 leading-tight">
                  {formData.companyName.toUpperCase()}
                </div>
                <div className="text-[8px] bg-slate-900 text-white px-1.5 py-0.5 rounded-xs font-bold inline-block uppercase tracking-wider">
                  FACTURE D'ENCAISSEMENT 80MM
                </div>
                <div className="text-[9px] text-slate-500">
                  {formData.contactPhone}
                </div>
              </div>
              <p className="text-[10px] text-slate-400 mt-2 leading-tight">
                Rendu immédiat tel qu'imprimé sur vos bobines de papier 80mm
              </p>
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

          {/* Seuil d'Alerte Stock Faible Global */}
          <div className="p-3.5 bg-slate-50 rounded-lg border border-slate-200 text-xs space-y-2">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <span className="font-semibold text-slate-900 block">
                  Seuil d'Alerte Stock Faible (Dashboard & Inventaire)
                </span>
                <span className="text-slate-500 text-[11px]">
                  Les boissons dont le stock est inférieur ou égal à ce seuil apparaissent automatiquement dans la section « Alertes Stock Faible »
                </span>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min="1"
                  max="500"
                  value={formData.defaultStockMinAlert || 15}
                  onChange={(e) =>
                    updateField('defaultStockMinAlert', Math.max(1, parseInt(e.target.value) || 1))
                  }
                  className="w-24 px-3 py-1.5 text-xs font-mono font-bold bg-white border border-slate-300 rounded-lg text-slate-900 text-right focus:ring-2 focus:ring-amber-500"
                />
                <span className="text-xs text-slate-600 font-medium">unités</span>
              </div>
            </div>
            <div className="flex items-center gap-1.5 pt-1">
              <span className="text-[11px] text-slate-500">Préréglages rapides :</span>
              {[5, 10, 15, 20, 30].map((val) => (
                <button
                  key={val}
                  type="button"
                  onClick={() => updateField('defaultStockMinAlert', val)}
                  className={`px-2 py-0.5 rounded text-[11px] font-mono transition-colors ${
                    (formData.defaultStockMinAlert || 15) === val
                      ? 'bg-amber-500 text-slate-950 font-bold shadow-2xs'
                      : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  {val} u.
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Invoice Format Preference: 80mm POS Thermal Receipt vs A4 */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
            <span className="p-2 bg-amber-50 text-amber-700 rounded-lg">
              <Printer className="w-4 h-4" />
            </span>
            <div>
              <h3 className="text-sm font-semibold text-slate-900">
                Format d'Impression des Factures & Reçus de Caisse
              </h3>
              <p className="text-xs text-slate-500">
                Format pré-sélectionné lors de l'ouverture et de l'impression des tickets de caisse
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <button
              type="button"
              onClick={() => updateField('defaultInvoiceFormat', 'ticket')}
              className={`p-4 rounded-xl border text-left transition-all cursor-pointer flex items-start gap-3 ${
                (formData.defaultInvoiceFormat || 'ticket') === 'ticket'
                  ? 'bg-amber-50/70 border-2 border-amber-500 shadow-xs'
                  : 'bg-slate-50 border-slate-200 hover:bg-slate-100 text-slate-700'
              }`}
            >
              <div
                className={`p-2.5 rounded-lg shrink-0 ${
                  (formData.defaultInvoiceFormat || 'ticket') === 'ticket'
                    ? 'bg-amber-500 text-white shadow-xs'
                    : 'bg-white border border-slate-200 text-slate-600'
                }`}
              >
                <Receipt className="w-5 h-5" />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-slate-900">Format Ticket Thermique 80mm</span>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-200 text-amber-950">
                    Recommandé (80mm)
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">
                  Idéal pour les imprimantes de caisse thermiques (Epson, Star, Sunmi, Xprinter 80mm). Compact, rapide et économique.
                </p>
              </div>
            </button>

            <button
              type="button"
              onClick={() => updateField('defaultInvoiceFormat', 'a4')}
              className={`p-4 rounded-xl border text-left transition-all cursor-pointer flex items-start gap-3 ${
                formData.defaultInvoiceFormat === 'a4'
                  ? 'bg-amber-50/70 border-2 border-amber-500 shadow-xs'
                  : 'bg-slate-50 border-slate-200 hover:bg-slate-100 text-slate-700'
              }`}
            >
              <div
                className={`p-2.5 rounded-lg shrink-0 ${
                  formData.defaultInvoiceFormat === 'a4'
                    ? 'bg-amber-500 text-white shadow-xs'
                    : 'bg-white border border-slate-200 text-slate-600'
                }`}
              >
                <FileText className="w-5 h-5" />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-slate-900">Facture Commerciale A4</span>
                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-200 text-slate-700">
                    Bureautique
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">
                  Facture pleine page format A4 (210×297mm) pour imprimantes standard papier libre laser ou jet d'encre.
                </p>
              </div>
            </button>
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
