import React, { useState, useMemo } from 'react';
import { Customer } from '../../types';
import {
  Users,
  Search,
  Plus,
  Building2,
  Phone,
  Mail,
  MapPin,
  Package,
  CreditCard,
  X,
  Check,
  Calendar,
  FileText,
  DollarSign,
  ChevronRight,
  ShoppingBag,
} from 'lucide-react';
import { formatHTG } from '../../utils/formatters';

interface CustomersManagementViewProps {
  customers: Customer[];
  onAddCustomer: (customer: Omit<Customer, 'id' | 'createdAt' | 'totalSpent'>) => void;
  onUpdateCustomer: (customer: Customer) => void;
  onStartSaleForCustomer?: (customer: Customer) => void;
}

export const CustomersManagementView: React.FC<CustomersManagementViewProps> = ({
  customers,
  onAddCustomer,
  onUpdateCustomer,
  onStartSaleForCustomer,
}) => {
  const [search, setSearch] = useState('');
  const [selectedType, setSelectedType] = useState<string>('all');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);

  // New Customer Form State
  const [newCust, setNewCust] = useState<Omit<Customer, 'id' | 'createdAt' | 'totalSpent'>>({
    name: '',
    company: '',
    type: 'Brasserie',
    email: '',
    phone: '',
    address: '',
    city: 'Paris',
    postalCode: '75001',
    activeKegsConsigned: 0,
    creditLimit: 5000,
    paymentTerms: '30 jours fin de mois',
    notes: '',
  });

  // Filtered customers
  const filteredCustomers = useMemo(() => {
    return customers.filter((c) => {
      const matchSearch =
        c.name.toLowerCase().includes(search.toLowerCase()) ||
        c.company.toLowerCase().includes(search.toLowerCase()) ||
        c.city.toLowerCase().includes(search.toLowerCase()) ||
        c.phone.includes(search);

      const matchType = selectedType === 'all' || c.type === selectedType;
      return matchSearch && matchType;
    });
  }, [customers, search, selectedType]);

  // High-level aggregates
  const customerStats = useMemo(() => {
    const totalCount = customers.length;
    const totalKegs = customers.reduce((sum, c) => sum + (c.activeKegsConsigned || 0), 0);
    const totalRevenue = customers.reduce((sum, c) => sum + (c.totalSpent || 0), 0);
    const avgSpent = totalCount > 0 ? Math.round(totalRevenue / totalCount) : 0;
    return { totalCount, totalKegs, totalRevenue, avgSpent };
  }, [customers]);

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCust.name || !newCust.company) return;
    onAddCustomer(newCust);
    setIsAddModalOpen(false);
    setNewCust({
      name: '',
      company: '',
      type: 'Brasserie',
      email: '',
      phone: '',
      address: '',
      city: 'Paris',
      postalCode: '75001',
      activeKegsConsigned: 0,
      creditLimit: 5000,
      paymentTerms: '30 jours fin de mois',
      notes: '',
    });
  };

  return (
    <div className="space-y-6">
      {/* Top Banner & Summary Cards */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-xl border border-slate-200">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">
            Répertoire des Clients CHR & Établissements
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Comptes professionnels, encours autorisés, fûts inox consignés en circulation et coordonnées directes
          </p>
        </div>

        <button
          type="button"
          onClick={() => setIsAddModalOpen(true)}
          className="px-3.5 py-1.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors flex items-center gap-1.5 whitespace-nowrap shadow-xs self-start sm:self-auto"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Nouveau Compte Client</span>
        </button>
      </div>

      {/* 4 Summary Strips */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200">
          <span className="text-xs text-slate-500 block">Comptes Clients Actifs</span>
          <span className="text-2xl font-bold font-mono text-slate-900 tabular-nums mt-1 block">
            {customerStats.totalCount}
          </span>
          <span className="text-[11px] text-slate-500 mt-1 block">Bars, brasseries, hôtels & festivals</span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200">
          <span className="text-xs text-slate-500 block">Fûts Inox Consignés en Clientèle</span>
          <span className="text-2xl font-bold font-mono text-amber-700 tabular-nums mt-1 block">
            {customerStats.totalKegs} fûts
          </span>
          <span className="text-[11px] text-amber-800 mt-1 block">
            {formatHTG(customerStats.totalKegs * 3000)} de consignes en rotation
          </span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200">
          <span className="text-xs text-slate-500 block">Volume Total Commandé</span>
          <span className="text-2xl font-bold font-mono text-slate-900 tabular-nums mt-1 block">
            {formatHTG(customerStats.totalRevenue)} HT
          </span>
          <span className="text-[11px] text-slate-500 mt-1 block">Facturation cumulée historique</span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200">
          <span className="text-xs text-slate-500 block">Panier Moyen par Établissement</span>
          <span className="text-2xl font-bold font-mono text-emerald-700 tabular-nums mt-1 block">
            {formatHTG(customerStats.avgSpent)}
          </span>
          <span className="text-[11px] text-slate-500 mt-1 block">CA moyen par compte actif</span>
        </div>
      </div>

      {/* Search & Filter Toolbar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 text-xs">
        {/* Type selector */}
        <div className="flex items-center gap-1 overflow-x-auto pb-1 sm:pb-0 scroll-smooth">
          {['all', 'Brasserie', 'Bar / Pub', 'Restaurant', 'Hôtel', 'Caviste', 'Événementiel'].map((type) => (
            <button
              key={type}
              type="button"
              onClick={() => setSelectedType(type)}
              className={`px-3 py-1.5 rounded-lg font-medium whitespace-nowrap transition-colors ${
                selectedType === type
                  ? 'bg-slate-900 text-white font-semibold shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:text-slate-900'
              }`}
            >
              {type === 'all' ? 'Tous les types' : type}
            </button>
          ))}
        </div>

        {/* Search input */}
        <div className="relative min-w-[220px]">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Rechercher établissement, contact, ville..."
            className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-slate-400"
          />
        </div>
      </div>

      {/* Customer Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredCustomers.map((cust) => {
          return (
            <div
              key={cust.id}
              className="bg-white rounded-xl border border-slate-200 p-5 hover:border-slate-300 transition-all flex flex-col justify-between shadow-xs"
            >
              <div>
                {/* Header line with badge */}
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="p-2 bg-blue-50 text-blue-700 rounded-lg shrink-0">
                      <Building2 className="w-4 h-4" />
                    </span>
                    <div>
                      <h3 className="text-sm font-bold text-slate-900 leading-snug">
                        {cust.company}
                      </h3>
                      <span className="text-xs text-slate-600 font-medium block">
                        Contact : {cust.name}
                      </span>
                    </div>
                  </div>

                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200 shrink-0">
                    {cust.type}
                  </span>
                </div>

                {/* Contact info list */}
                <div className="mt-3.5 space-y-1.5 text-xs text-slate-600 pt-3 border-t border-slate-100">
                  <div className="flex items-center gap-2">
                    <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span className="truncate">{cust.address}, {cust.postalCode} {cust.city}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <a href={`tel:${cust.phone}`} className="hover:text-blue-600 font-mono text-[11px]">
                      {cust.phone}
                    </a>
                  </div>
                  <div className="flex items-center gap-2">
                    <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <a href={`mailto:${cust.email}`} className="hover:text-blue-600 truncate text-[11px]">
                      {cust.email}
                    </a>
                  </div>
                </div>

                {/* Account details */}
                <div className="mt-3.5 grid grid-cols-2 gap-2 text-xs pt-3 border-t border-slate-100">
                  <div className="p-2 bg-slate-50 rounded-lg border border-slate-200/80">
                    <span className="text-[10px] text-slate-500 block">Fûts Consignés</span>
                    <span className="font-mono font-bold text-amber-800 text-xs mt-0.5 block">
                      {cust.activeKegsConsigned} fûts en dépôt
                    </span>
                  </div>

                  <div className="p-2 bg-slate-50 rounded-lg border border-slate-200/80">
                    <span className="text-[10px] text-slate-500 block">Paiement Accordé</span>
                    <span className="font-medium text-slate-800 text-[11px] mt-0.5 block truncate">
                      {cust.paymentTerms}
                    </span>
                  </div>

                  <div className="p-2 bg-slate-50 rounded-lg border border-slate-200/80">
                    <span className="text-[10px] text-slate-500 block">CA Historique</span>
                    <span className="font-mono font-bold text-slate-900 text-xs mt-0.5 block tabular-nums">
                      {formatHTG(cust.totalSpent)} HT
                    </span>
                  </div>

                  <div className="p-2 bg-slate-50 rounded-lg border border-slate-200/80">
                    <span className="text-[10px] text-slate-500 block">Plafond Encours</span>
                    <span className="font-mono font-medium text-slate-700 text-xs mt-0.5 block tabular-nums">
                      {formatHTG(cust.creditLimit)}
                    </span>
                  </div>
                </div>

                {cust.notes && (
                  <p className="mt-2.5 text-[11px] text-slate-500 italic bg-amber-50/50 p-2 rounded border border-amber-200/50">
                    "{cust.notes}"
                  </p>
                )}
              </div>

              {/* Bottom Actions */}
              <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedCustomer(cust)}
                  className="text-xs text-slate-600 hover:text-slate-900 font-medium"
                >
                  Fiche complète
                </button>

                {onStartSaleForCustomer && (
                  <button
                    type="button"
                    onClick={() => onStartSaleForCustomer(cust)}
                    className="px-2.5 py-1 text-xs font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors flex items-center gap-1"
                  >
                    <ShoppingBag className="w-3.5 h-3.5" />
                    <span>Nouvelle Commande</span>
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {filteredCustomers.length === 0 && (
        <div className="p-12 text-center text-slate-400 bg-white rounded-xl border border-slate-200 text-xs">
          Aucun établissement trouvé pour cette recherche.
        </div>
      )}

      {/* Modal: New Customer */}
      {isAddModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-2xl border border-slate-200 max-w-lg w-full p-6 max-h-[90vh] overflow-y-auto animate-in fade-in duration-150">
            <div className="flex items-start justify-between pb-3 border-b border-slate-200">
              <div>
                <span className="text-xs font-semibold uppercase tracking-wider text-blue-700">
                  Réseau Distribution CHR
                </span>
                <h3 className="text-base font-bold text-slate-900 mt-0.5">
                  Créer un Nouveau Compte Client
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsAddModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-700 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateSubmit} className="mt-4 space-y-3.5 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2 sm:col-span-1">
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Nom de l'Établissement <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="ex: Brasserie de l'Hôtel de Ville"
                    value={newCust.company}
                    onChange={(e) => setNewCust({ ...newCust, company: e.target.value })}
                    className="w-full px-3 py-1.5 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div className="col-span-2 sm:col-span-1">
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Contact Principal / Gérant <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="ex: Laurent Vasseur"
                    value={newCust.name}
                    onChange={(e) => setNewCust({ ...newCust, name: e.target.value })}
                    className="w-full px-3 py-1.5 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Type d'Établissement
                  </label>
                  <select
                    value={newCust.type}
                    onChange={(e) => setNewCust({ ...newCust, type: e.target.value as any })}
                    className="w-full px-3 py-1.5 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none"
                  >
                    <option value="Brasserie">Brasserie</option>
                    <option value="Bar / Pub">Bar / Pub</option>
                    <option value="Restaurant">Restaurant</option>
                    <option value="Hôtel">Hôtel</option>
                    <option value="Caviste">Caviste</option>
                    <option value="Événementiel">Événementiel</option>
                    <option value="Autre">Autre</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Conditions de Paiement
                  </label>
                  <select
                    value={newCust.paymentTerms}
                    onChange={(e) => setNewCust({ ...newCust, paymentTerms: e.target.value as any })}
                    className="w-full px-3 py-1.5 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none"
                  >
                    <option value="30 jours fin de mois">30 jours fin de mois</option>
                    <option value="45 jours">45 jours</option>
                    <option value="Comptant à la livraison">Comptant à la livraison</option>
                    <option value="Immédiat">Immédiat</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Téléphone Direct
                  </label>
                  <input
                    type="text"
                    placeholder="ex: +33 1 42 00 00 00"
                    value={newCust.phone}
                    onChange={(e) => setNewCust({ ...newCust, phone: e.target.value })}
                    className="w-full px-3 py-1.5 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Email de Facturation
                  </label>
                  <input
                    type="email"
                    placeholder="compta@brasserie.fr"
                    value={newCust.email}
                    onChange={(e) => setNewCust({ ...newCust, email: e.target.value })}
                    className="w-full px-3 py-1.5 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Adresse de Livraison
                </label>
                <input
                  type="text"
                  placeholder="ex: 15 Rue des Fleurs"
                  value={newCust.address}
                  onChange={(e) => setNewCust({ ...newCust, address: e.target.value })}
                  className="w-full px-3 py-1.5 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Code Postal
                  </label>
                  <input
                    type="text"
                    placeholder="75001"
                    value={newCust.postalCode}
                    onChange={(e) => setNewCust({ ...newCust, postalCode: e.target.value })}
                    className="w-full px-3 py-1.5 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Ville
                  </label>
                  <input
                    type="text"
                    placeholder="Paris"
                    value={newCust.city}
                    onChange={(e) => setNewCust({ ...newCust, city: e.target.value })}
                    className="w-full px-3 py-1.5 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Plafond Crédit (HTG)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="500"
                    value={newCust.creditLimit}
                    onChange={(e) => setNewCust({ ...newCust, creditLimit: parseInt(e.target.value) || 0 })}
                    className="w-full px-3 py-1.5 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Notes Particulières & Consignes de Livraison
                </label>
                <textarea
                  rows={2}
                  placeholder="Horaires de livraison, accès tireuse, contact en cave..."
                  value={newCust.notes}
                  onChange={(e) => setNewCust({ ...newCust, notes: e.target.value })}
                  className="w-full px-3 py-1.5 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 text-xs font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-xs flex items-center gap-1.5"
                >
                  <Check className="w-4 h-4" />
                  <span>Enregistrer le Client</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Customer Details */}
      {selectedCustomer && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-2xl border border-slate-200 max-w-lg w-full p-6 animate-in fade-in duration-150">
            <div className="flex items-start justify-between pb-3 border-b border-slate-200">
              <div>
                <span className="text-[10px] font-semibold uppercase tracking-wider text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                  {selectedCustomer.type}
                </span>
                <h3 className="text-lg font-bold text-slate-900 mt-1">
                  {selectedCustomer.company}
                </h3>
                <span className="text-xs text-slate-500">Contact gérant : {selectedCustomer.name}</span>
              </div>
              <button
                type="button"
                onClick={() => setSelectedCustomer(null)}
                className="p-1 text-slate-400 hover:text-slate-700 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="mt-4 space-y-3 text-xs">
              <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 space-y-2">
                <div className="flex justify-between">
                  <span className="text-slate-500">Adresse de livraison :</span>
                  <span className="font-medium text-slate-900 text-right">{selectedCustomer.address}, {selectedCustomer.postalCode} {selectedCustomer.city}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Téléphone :</span>
                  <span className="font-mono text-slate-900">{selectedCustomer.phone}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Email :</span>
                  <span className="text-slate-900">{selectedCustomer.email}</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="p-3 bg-amber-50/70 border border-amber-200 rounded-lg">
                  <span className="text-[11px] text-amber-900 block font-medium">Fûts Inox Consignés</span>
                  <span className="text-lg font-bold font-mono text-amber-900 block mt-0.5">
                    {selectedCustomer.activeKegsConsigned} fûts
                  </span>
                  <span className="text-[10px] text-amber-800">Garantie consigne active</span>
                </div>

                <div className="p-3 bg-emerald-50/70 border border-emerald-200 rounded-lg">
                  <span className="text-[11px] text-emerald-900 block font-medium">Chiffre d'Affaires</span>
                  <span className="text-lg font-bold font-mono text-emerald-900 block mt-0.5">
                    {formatHTG(selectedCustomer.totalSpent)} HT
                  </span>
                  <span className="text-[10px] text-emerald-800">Total commandes livrées</span>
                </div>
              </div>

              {selectedCustomer.notes && (
                <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                  <span className="text-slate-500 block mb-0.5 font-medium">Notes & Accès :</span>
                  <p className="text-slate-700 italic">"{selectedCustomer.notes}"</p>
                </div>
              )}
            </div>

            <div className="mt-5 flex justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setSelectedCustomer(null)}
                className="px-4 py-2 text-xs font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg"
              >
                Fermer
              </button>
              {onStartSaleForCustomer && (
                <button
                  type="button"
                  onClick={() => {
                    const c = selectedCustomer;
                    setSelectedCustomer(null);
                    onStartSaleForCustomer(c);
                  }}
                  className="px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-xs flex items-center gap-1.5"
                >
                  <ShoppingBag className="w-3.5 h-3.5" />
                  <span>Créer une Commande</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
