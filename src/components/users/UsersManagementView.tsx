import React, { useState, useMemo } from 'react';
import { Seller, Sale, isUserAdmin } from '../../types';
import {
  Users,
  UserPlus,
  Search,
  Download,
  Edit,
  Trash2,
  Mail,
  Phone,
  Target,
  Award,
  Shield,
  CheckCircle2,
  AlertTriangle,
  X,
  Plus,
  ShoppingCart,
  Percent,
  Check,
  Lock,
  KeyRound,
  Eye,
  EyeOff,
  UserCheck,
  Sparkles,
  Crown,
} from 'lucide-react';
import { formatHTG } from '../../utils/formatters';

interface UsersManagementViewProps {
  sellers: Seller[];
  sales: Sale[];
  onAddSeller: (seller: Omit<Seller, 'id'>) => void;
  onUpdateSeller: (seller: Seller) => void;
  onDeleteSeller: (sellerId: string) => void;
  onOpenNewSaleForSeller?: (sellerId: string) => void;
  currentUser?: Seller | null;
  onSelectCurrentUser?: (user: Seller) => void;
  onOpenLoginModal?: () => void;
  isAdmin?: boolean;
}

export const UsersManagementView: React.FC<UsersManagementViewProps> = ({
  sellers,
  sales,
  onAddSeller,
  onUpdateSeller,
  onDeleteSeller,
  onOpenNewSaleForSeller,
  currentUser,
  onSelectCurrentUser,
  onOpenLoginModal,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'Actif' | 'Inactif'>('all');
  const [activeTab, setActiveTab] = useState<'users' | 'roles'>('users');

  // Password visibility toggles
  const [showAddPassword, setShowAddPassword] = useState(false);
  const [showEditPassword, setShowEditPassword] = useState(false);

  // Modals
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<Seller | null>(null);
  const [userToDelete, setUserToDelete] = useState<Seller | null>(null);
  const [notification, setNotification] = useState<{ message: string; type: 'success' | 'info' | 'error' } | null>(null);

  // New User Form State
  const [newUserData, setNewUserData] = useState<Omit<Seller, 'id'>>({
    name: '',
    role: 'Commercial Terrain CHR',
    email: '',
    phone: '',
    avatar: '/src/assets/images/avatar_seller_thomas_1792700276837.jpg',
    targetMonthlyRevenue: 35000,
    commissionRate: 0.05,
    status: 'Actif',
    password: 'opti2026',
  });

  const showToast = (message: string, type: 'success' | 'info' | 'error' = 'success') => {
    setNotification({ message, type });
    setTimeout(() => {
      setNotification((curr) => (curr?.message === message ? null : curr));
    }, 3500);
  };

  // Performance metrics computed for each user
  const usersWithStats = useMemo(() => {
    return sellers.map((seller) => {
      const sellerSales = sales.filter((s) => s.sellerId === seller.id && s.status === 'completed');
      const totalRevenue = sellerSales.reduce((acc, s) => acc + s.totalHT, 0);
      const totalProfit = sellerSales.reduce((acc, s) => acc + s.netProfit, 0);
      const salesCount = sellerSales.length;
      const targetPct = seller.targetMonthlyRevenue > 0
        ? Math.round((totalRevenue / seller.targetMonthlyRevenue) * 100)
        : 0;
      const commissionEarned = Math.round(totalRevenue * (seller.commissionRate || 0));

      return {
        ...seller,
        status: seller.status || 'Actif',
        totalRevenue,
        totalProfit,
        salesCount,
        targetPct,
        commissionEarned,
      };
    });
  }, [sellers, sales]);

  // Roles set
  const rolesList = useMemo(() => {
    const set = new Set(sellers.map((s) => s.role));
    return ['all', ...Array.from(set)];
  }, [sellers]);

  // Overall metrics
  const totalStats = useMemo(() => {
    const totalUsers = sellers.length;
    const activeCount = usersWithStats.filter((u) => u.status === 'Actif').length;
    const totalTarget = sellers.reduce((sum, s) => sum + s.targetMonthlyRevenue, 0);
    const totalGenerated = usersWithStats.reduce((sum, u) => sum + u.totalRevenue, 0);
    const overallAchievement = totalTarget > 0 ? Math.round((totalGenerated / totalTarget) * 100) : 0;

    return {
      totalUsers,
      activeCount,
      totalTarget,
      totalGenerated,
      overallAchievement,
    };
  }, [sellers, usersWithStats]);

  // Filtered users
  const filteredUsers = useMemo(() => {
    return usersWithStats.filter((u) => {
      const matchSearch =
        u.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        u.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
        u.role.toLowerCase().includes(searchQuery.toLowerCase()) ||
        u.phone.toLowerCase().includes(searchQuery.toLowerCase());

      const matchRole = roleFilter === 'all' || u.role === roleFilter;
      const matchStatus = statusFilter === 'all' || u.status === statusFilter;

      return matchSearch && matchRole && matchStatus;
    });
  }, [usersWithStats, searchQuery, roleFilter, statusFilter]);

  // Submit Add User
  const handleAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUserData.name.trim() || !newUserData.email.trim()) return;

    onAddSeller(newUserData);
    setIsAddModalOpen(false);
    showToast(`Utilisateur "${newUserData.name}" créé avec succès.`);
    setNewUserData({
      name: '',
      role: 'Commercial Terrain CHR',
      email: '',
      phone: '',
      avatar: '/src/assets/images/avatar_seller_thomas_1792700276837.jpg',
      targetMonthlyRevenue: 35000,
      commissionRate: 0.05,
      status: 'Actif',
      password: 'opti2026',
    });
  };

  // Submit Edit User
  const handleEditSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;

    onUpdateSeller(editingUser);
    showToast(`Utilisateur "${editingUser.name}" mis à jour.`);
    setEditingUser(null);
  };

  // Confirm Delete
  const handleConfirmDelete = () => {
    if (!userToDelete) return;
    const name = userToDelete.name;
    onDeleteSeller(userToDelete.id);
    setUserToDelete(null);
    showToast(`Utilisateur "${name}" supprimé.`, 'info');
  };

  // Export CSV
  const handleExportCSV = () => {
    const headers = [
      'Nom',
      'Role',
      'Email',
      'Telephone',
      'Statut',
      'Objectif Mensuel (HTG)',
      'Taux Commission (%)',
      'CA Realise (HTG)',
      'Ventes Effectuees',
    ];

    const rows = usersWithStats.map((u) => [
      `"${u.name.replace(/"/g, '""')}"`,
      `"${u.role.replace(/"/g, '""')}"`,
      u.email,
      u.phone,
      u.status,
      u.targetMonthlyRevenue,
      `${Math.round(u.commissionRate * 100)}%`,
      u.totalRevenue,
      u.salesCount,
    ]);

    const csvContent =
      '\uFEFF' + [headers.join(';'), ...rows.map((r) => r.join(';'))].join('\r\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `utilisateurs_optivente_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {notification && (
        <div
          className={`p-3 rounded-xl border text-xs flex items-center justify-between transition-all ${
            notification.type === 'error'
              ? 'bg-red-50 border-red-200 text-red-800'
              : notification.type === 'info'
              ? 'bg-blue-50 border-blue-200 text-blue-800'
              : 'bg-emerald-50 border-emerald-200 text-emerald-800'
          }`}
        >
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span className="font-semibold">{notification.message}</span>
          </div>
          <button
            type="button"
            onClick={() => setNotification(null)}
            className="p-1 hover:bg-black/5 rounded text-slate-500 hover:text-slate-800"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Header and Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-xl border border-slate-200 shadow-2xs">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-amber-50 text-amber-700 border border-amber-200">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-900 tracking-tight">
              Gestion des Utilisateurs & Équipe
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Gestion des profils collaborateurs, rôles d'accès, commissions et suivi des quotas
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto flex-wrap">
          {/* Tabs: Users vs Roles */}
          <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg text-xs">
            <button
              type="button"
              onClick={() => setActiveTab('users')}
              className={`px-3 py-1.5 rounded-md font-medium transition-all ${
                activeTab === 'users'
                  ? 'bg-white text-slate-900 font-semibold shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Comptes ({sellers.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('roles')}
              className={`px-3 py-1.5 rounded-md font-medium transition-all flex items-center gap-1 ${
                activeTab === 'roles'
                  ? 'bg-white text-slate-900 font-semibold shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Shield className="w-3.5 h-3.5 text-indigo-600" />
              <span>Rôles & Permissions</span>
            </button>
          </div>

          <button
            type="button"
            onClick={handleExportCSV}
            className="px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 rounded-lg transition-colors flex items-center gap-1.5 shadow-xs"
          >
            <Download className="w-3.5 h-3.5" />
            <span>CSV</span>
          </button>

          {onOpenLoginModal && (
            <button
              type="button"
              onClick={onOpenLoginModal}
              className="px-3.5 py-1.5 text-xs font-bold text-amber-950 bg-amber-400 hover:bg-amber-500 rounded-lg transition-colors flex items-center gap-1.5 shadow-xs cursor-pointer"
              title="Se connecter avec email ou téléphone et mot de passe"
            >
              <KeyRound className="w-3.5 h-3.5" />
              <span>Connexion Espace</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => setIsAddModalOpen(true)}
            className="px-3.5 py-1.5 text-xs font-bold text-white bg-slate-900 hover:bg-slate-800 rounded-lg transition-colors flex items-center gap-1.5 shadow-xs"
          >
            <UserPlus className="w-3.5 h-3.5" />
            <span>Nouvel Utilisateur</span>
          </button>
        </div>
      </div>

      {/* User Space Connection Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-amber-950 text-white rounded-2xl p-4 sm:p-5 shadow-sm border border-slate-700/50 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="p-3 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30 shrink-0">
            <KeyRound className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-bold text-sm text-white">Espace Utilisateur & Connexion Sécurisée</span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                Email ou Numéro de téléphone + Mot de passe
              </span>
            </div>
            <p className="text-xs text-slate-300 mt-1 max-w-2xl leading-relaxed">
              Chaque commercial ou membre de l'équipe peut se connecter indifféremment avec son <strong>adresse email</strong> ou son <strong>numéro de téléphone mobile</strong> avec son mot de passe pour suivre ses ventes, quotas et commissions.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0 w-full md:w-auto justify-end">
          {currentUser && (
            <div className="flex items-center gap-2 bg-white/10 px-3 py-1.5 rounded-xl border border-white/10 text-xs">
              <img
                src={currentUser.avatar}
                alt={currentUser.name}
                className="w-5 h-5 rounded-full object-cover ring-1 ring-amber-400"
              />
              <span className="text-slate-300">Connecté :</span>
              <strong className="text-amber-300 font-semibold">{currentUser.name}</strong>
            </div>
          )}

          {onOpenLoginModal && (
            <button
              type="button"
              onClick={onOpenLoginModal}
              className="px-3.5 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs flex items-center gap-1.5 transition shadow-xs cursor-pointer whitespace-nowrap"
            >
              <UserCheck className="w-3.5 h-3.5" />
              <span>{currentUser ? "Changer d'utilisateur" : "Se connecter"}</span>
            </button>
          )}
        </div>
      </div>

      {/* KPI Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <span className="text-xs text-slate-500 block">Total Utilisateurs</span>
          <span className="text-2xl font-bold font-mono text-slate-900 tabular-nums mt-1 block">
            {totalStats.totalUsers}
          </span>
          <span className="text-[11px] text-emerald-600 font-medium mt-1 block flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3" />
            <span>{totalStats.activeCount} comptes actifs</span>
          </span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <span className="text-xs text-slate-500 block">Objectif Mensuel Équipe</span>
          <span className="text-2xl font-bold font-mono text-indigo-700 tabular-nums mt-1 block">
            {formatHTG(totalStats.totalTarget)}
          </span>
          <span className="text-[11px] text-slate-400 mt-1 block">
            Quota commercial cumulé
          </span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <span className="text-xs text-slate-500 block">CA Réalisé Équipe</span>
          <span className="text-2xl font-bold font-mono text-slate-900 tabular-nums mt-1 block">
            {formatHTG(totalStats.totalGenerated)}
          </span>
          <span className="text-[11px] text-slate-400 mt-1 block">
            Taux de réalisation : <strong>{totalStats.overallAchievement}%</strong>
          </span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <span className="text-xs text-slate-500 block">Taux d'Atteinte Global</span>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-2xl font-bold font-mono text-emerald-700 tabular-nums">
              {totalStats.overallAchievement}%
            </span>
            <div className="flex-1 bg-slate-100 rounded-full h-2 overflow-hidden">
              <div
                className="bg-emerald-600 h-full rounded-full transition-all"
                style={{ width: `${Math.min(100, totalStats.overallAchievement)}%` }}
              />
            </div>
          </div>
          <span className="text-[11px] text-slate-400 mt-1 block">
            Sur l'ensemble des ventes
          </span>
        </div>
      </div>

      {/* ========================================================
          TAB 1: LISTE DES COMPTES UTILISATEURS
          ======================================================== */}
      {activeTab === 'users' && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
          {/* Filter Bar */}
          <div className="p-4 border-b border-slate-200 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-slate-50/50">
            <div className="flex flex-wrap items-center gap-3 flex-1">
              <div className="relative min-w-[220px] flex-1 max-w-sm">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Rechercher par nom, email, rôle..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-3 py-1.5 text-xs bg-white border border-slate-200 rounded-lg text-slate-900 placeholder-slate-400 focus:outline-none focus:border-slate-400"
                />
              </div>

              <select
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value)}
                className="py-1.5 px-3 text-xs bg-white border border-slate-200 rounded-lg text-slate-700 focus:outline-none focus:border-slate-400"
              >
                <option value="all">Tous les rôles</option>
                {rolesList
                  .filter((r) => r !== 'all')
                  .map((r) => (
                    <option key={r} value={r}>
                      {r}
                    </option>
                  ))}
              </select>

              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as any)}
                className="py-1.5 px-3 text-xs bg-white border border-slate-200 rounded-lg text-slate-700 focus:outline-none focus:border-slate-400"
              >
                <option value="all">Tous les statuts</option>
                <option value="Actif">Actif</option>
                <option value="Inactif">Inactif</option>
              </select>
            </div>

            <span className="text-xs text-slate-400 font-mono self-start sm:self-auto">
              {filteredUsers.length} utilisateur{filteredUsers.length > 1 ? 's' : ''} affiché{filteredUsers.length > 1 ? 's' : ''}
            </span>
          </div>

          {/* Users Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-medium">
                <tr>
                  <th className="py-3 px-4">Utilisateur & Contact</th>
                  <th className="py-3 px-4">Rôle & Fonction</th>
                  <th className="py-3 px-4 text-center">Statut</th>
                  <th className="py-3 px-4 text-right">Objectif Mensuel</th>
                  <th className="py-3 px-4 text-right">CA Réalisé</th>
                  <th className="py-3 px-4 text-right">Commission</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredUsers.map((u) => {
                  return (
                    <tr key={u.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-3">
                          <img
                            src={u.avatar}
                            alt={u.name}
                            className="w-9 h-9 rounded-full object-cover border border-slate-200 shrink-0"
                            onError={(e) => {
                              (e.target as HTMLElement).style.display = 'none';
                            }}
                          />
                          <div>
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="font-bold text-slate-900 block text-xs">{u.name}</span>
                              {currentUser?.id === u.id && (
                                <span className="px-1.5 py-0.2 rounded bg-amber-100 text-amber-900 border border-amber-300 text-[9px] font-bold">
                                  Session active
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-2 text-[11px] text-slate-500 mt-0.5">
                              <span className="flex items-center gap-1" title="Identifiant Email">
                                <Mail className="w-3 h-3 text-slate-400" />
                                <span>{u.email}</span>
                              </span>
                              {u.phone && (
                                <>
                                  <span>·</span>
                                  <span className="flex items-center gap-1 font-mono" title="Identifiant Numéro de Téléphone">
                                    <Phone className="w-3 h-3 text-slate-400" />
                                    <span>{u.phone}</span>
                                  </span>
                                </>
                              )}
                            </div>
                          </div>
                        </div>
                      </td>

                      <td className="py-3 px-4">
                        {isUserAdmin(u) ? (
                          <div className="flex flex-col items-start gap-1">
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 font-bold text-[11px] border border-amber-300 shadow-2xs">
                              <Crown className="w-3 h-3 text-amber-600" />
                              <span>Administrateur</span>
                            </span>
                            <span className="text-[10px] text-slate-500 font-medium">
                              {u.role}
                            </span>
                          </div>
                        ) : (
                          <span className="inline-block px-2 py-0.5 rounded bg-slate-100 text-slate-800 font-medium text-[11px] border border-slate-200">
                            {u.role}
                          </span>
                        )}
                      </td>

                      <td className="py-3 px-4 text-center">
                        <span
                          className={`inline-block px-2 py-0.5 rounded text-[11px] font-semibold border ${
                            u.status === 'Actif'
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                              : 'bg-slate-100 text-slate-600 border-slate-200'
                          }`}
                        >
                          {u.status}
                        </span>
                      </td>

                      <td className="py-3 px-4 text-right font-mono tabular-nums text-slate-800">
                        {formatHTG(u.targetMonthlyRevenue)}
                      </td>

                      <td className="py-3 px-4 text-right">
                        <span className="font-mono font-bold text-slate-900 tabular-nums block">
                          {formatHTG(u.totalRevenue)}
                        </span>
                        <div className="flex items-center justify-end gap-1.5 text-[10px] text-slate-400 mt-0.5">
                          <span>{u.targetPct}% atteint</span>
                          <div className="w-12 bg-slate-200 rounded-full h-1.5 overflow-hidden">
                            <div
                              className="bg-emerald-600 h-full rounded-full"
                              style={{ width: `${Math.min(100, u.targetPct)}%` }}
                            />
                          </div>
                        </div>
                      </td>

                      <td className="py-3 px-4 text-right font-mono tabular-nums">
                        <span className="font-semibold text-emerald-700 block">
                          +{formatHTG(u.commissionEarned)}
                        </span>
                        <span className="text-[10px] text-slate-400">
                          ({Math.round((u.commissionRate || 0.05) * 100)}%)
                        </span>
                      </td>

                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {onSelectCurrentUser && (
                            <button
                              type="button"
                              onClick={() => {
                                onSelectCurrentUser(u);
                                showToast(`Connecté à l'espace de ${u.name}`);
                              }}
                              title="Se connecter avec ce compte (Email ou Téléphone)"
                              className={`px-2 py-1 text-[11px] font-medium rounded border transition-colors whitespace-nowrap flex items-center gap-1 shadow-2xs cursor-pointer ${
                                currentUser?.id === u.id
                                  ? 'bg-amber-100 text-amber-900 border-amber-300 font-bold'
                                  : 'text-slate-700 bg-white hover:bg-amber-50 hover:border-amber-300 border-slate-200'
                              }`}
                            >
                              <UserCheck className="w-3 h-3 text-amber-600" />
                              <span>{currentUser?.id === u.id ? 'Connecté' : 'Connexion'}</span>
                            </button>
                          )}

                          {onOpenNewSaleForSeller && (
                            <button
                              type="button"
                              onClick={() => onOpenNewSaleForSeller(u.id)}
                              title="Attribuer une nouvelle vente"
                              className="px-2 py-1 text-[11px] font-medium text-blue-700 bg-blue-50 hover:bg-blue-100 rounded border border-blue-200 transition-colors whitespace-nowrap flex items-center gap-1 shadow-2xs"
                            >
                              <ShoppingCart className="w-3 h-3" />
                              <span>Vente</span>
                            </button>
                          )}

                          <button
                            type="button"
                            onClick={() => setEditingUser(u)}
                            title="Modifier ce compte"
                            className="px-2 py-1 text-[11px] font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded border border-slate-200 transition-colors whitespace-nowrap flex items-center gap-1 shadow-2xs"
                          >
                            <Edit className="w-3 h-3 text-slate-600" />
                            <span>Modifier</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => setUserToDelete(u)}
                            title="Supprimer ce compte"
                            className="px-2 py-1 text-[11px] font-medium text-red-700 bg-red-50 hover:bg-red-100 rounded border border-red-200 transition-colors whitespace-nowrap flex items-center gap-1 shadow-2xs"
                          >
                            <Trash2 className="w-3 h-3 text-red-600" />
                            <span>Supprimer</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}

                {filteredUsers.length === 0 && (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-slate-400">
                      Aucun utilisateur ne correspond à vos filtres.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ========================================================
          TAB 2: ROLES & PERMISSIONS MATRIX
          ======================================================== */}
      {activeTab === 'roles' && (
        <div className="space-y-4">
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs">
            <h3 className="text-sm font-bold text-slate-900 mb-1">
              Matrice des Droits d'Accès & Sécurité
            </h3>
            <p className="text-xs text-slate-500 mb-4">
              Niveaux de permissions configurés par profil utilisateur pour la distribution de boissons
            </p>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/70 space-y-3 text-xs">
                <div className="flex items-center gap-2 text-indigo-700 font-bold">
                  <Shield className="w-4 h-4" />
                  <span>Direction & Administrateurs</span>
                </div>
                <p className="text-slate-600 text-[11px]">
                  Accès intégral : encaissement, inventaire complet, suppression d'articles, rapports financiers, paramètres généraux.
                </p>
                <div className="space-y-1 font-mono text-[11px] text-slate-700">
                  <div className="flex items-center gap-1.5 text-emerald-700">
                    <Check className="w-3.5 h-3.5" />
                    <span>Gestion des ventes & caisse</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-emerald-700">
                    <Check className="w-3.5 h-3.5" />
                    <span>Gestion inventaire & suppression</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-emerald-700">
                    <Check className="w-3.5 h-3.5" />
                    <span>Rapports financiers & marges</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-emerald-700">
                    <Check className="w-3.5 h-3.5" />
                    <span>Configuration & Utilisateurs</span>
                  </div>
                </div>
              </div>

              <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/70 space-y-3 text-xs">
                <div className="flex items-center gap-2 text-blue-700 font-bold">
                  <Award className="w-4 h-4" />
                  <span>Commerciaux & Délégués CHR</span>
                </div>
                <p className="text-slate-600 text-[11px]">
                  Prise de commande, création de factures, consultation du catalogue et suivi des commissions personnelles.
                </p>
                <div className="space-y-1 font-mono text-[11px] text-slate-700">
                  <div className="flex items-center gap-1.5 text-emerald-700">
                    <Check className="w-3.5 h-3.5" />
                    <span>Point de Vente & Caisse</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-emerald-700">
                    <Check className="w-3.5 h-3.5" />
                    <span>Fiches Clients & Commandes</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-slate-400">
                    <X className="w-3.5 h-3.5" />
                    <span>Modification des prix d'achat</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-slate-400">
                    <X className="w-3.5 h-3.5" />
                    <span>Suppression de références</span>
                  </div>
                </div>
              </div>

              <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/70 space-y-3 text-xs">
                <div className="flex items-center gap-2 text-amber-700 font-bold">
                  <Users className="w-4 h-4" />
                  <span>Responsables Stock & Entrepôt</span>
                </div>
                <p className="text-slate-600 text-[11px]">
                  Réceptions de livraisons brasserie, réapprovisionnements, consignes de fûts et inventaires physiques.
                </p>
                <div className="space-y-1 font-mono text-[11px] text-slate-700">
                  <div className="flex items-center gap-1.5 text-emerald-700">
                    <Check className="w-3.5 h-3.5" />
                    <span>Réapprovisionnements & Entrées</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-emerald-700">
                    <Check className="w-3.5 h-3.5" />
                    <span>Suivi fûts inox consignés</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-emerald-700">
                    <Check className="w-3.5 h-3.5" />
                    <span>Journal des mouvements</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-slate-400">
                    <X className="w-3.5 h-3.5" />
                    <span>Bilan fiscal & comptable</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================
          MODAL: AJOUTER UN UTILISATEUR
          ======================================================== */}
      {isAddModalOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 max-w-lg w-full p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-indigo-100 text-indigo-700 rounded-lg">
                  <UserPlus className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    Créer un Nouvel Utilisateur
                  </h3>
                  <p className="text-xs text-slate-500">
                    Ajoutez un collaborateur à l'équipe avec son rôle et ses quotas
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsAddModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-700 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAddSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Nom Complet
                </label>
                <input
                  type="text"
                  value={newUserData.name}
                  onChange={(e) => setNewUserData({ ...newUserData, name: e.target.value })}
                  placeholder="ex: Alexandre Vaneck"
                  className="w-full px-3 py-1.5 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:border-slate-500"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Rôle / Fonction
                  </label>
                  <select
                    value={newUserData.role}
                    onChange={(e) => setNewUserData({ ...newUserData, role: e.target.value })}
                    className="w-full px-3 py-1.5 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:border-slate-500"
                  >
                    <option value="Commercial Terrain CHR">Commercial Terrain CHR</option>
                    <option value="Délégué Commercial Bars & Brasseries">Délégué Commercial Bars & Brasseries</option>
                    <option value="Responsable Grands Comptes CHR">Responsable Grands Comptes CHR</option>
                    <option value="Conseiller Cavistes & Événementiel">Conseiller Cavistes & Événementiel</option>
                    <option value="Responsable Stock & Logistique">Responsable Stock & Logistique</option>
                    <option value="Caissier / Vendeur Comptoir">Caissier / Vendeur Comptoir</option>
                    <option value="Administrateur">Administrateur</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Statut du Compte
                  </label>
                  <select
                    value={newUserData.status || 'Actif'}
                    onChange={(e) => setNewUserData({ ...newUserData, status: e.target.value as any })}
                    className="w-full px-3 py-1.5 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:border-slate-500"
                  >
                    <option value="Actif">Actif</option>
                    <option value="Inactif">Inactif</option>
                  </select>
                </div>
              </div>

              {/* Administrator Rights Toggle */}
              <label className="flex items-center gap-2.5 p-3 rounded-xl border border-amber-300 bg-amber-50/80 text-xs font-semibold text-amber-950 cursor-pointer">
                <input
                  type="checkbox"
                  checked={newUserData.isAdmin || newUserData.role === 'Administrateur'}
                  onChange={(e) => {
                    const checked = e.target.checked;
                    setNewUserData({
                      ...newUserData,
                      isAdmin: checked,
                      role: checked && newUserData.role !== 'Administrateur' ? 'Administrateur' : newUserData.role,
                    });
                  }}
                  className="w-4 h-4 rounded text-amber-600 focus:ring-amber-500 border-amber-300"
                />
                <Crown className="w-4 h-4 text-amber-600 shrink-0" />
                <div className="flex-1">
                  <span>Accès Administrateur Complet</span>
                  <p className="text-[10px] text-amber-800 font-normal">
                    Donne accès à toutes les fonctionnalités : finances, marges, utilisateurs, paramètres, stocks complets.
                  </p>
                </div>
              </label>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Email Professionnel
                  </label>
                  <input
                    type="email"
                    value={newUserData.email}
                    onChange={(e) => setNewUserData({ ...newUserData, email: e.target.value })}
                    placeholder="alexandre@distriboissons.fr"
                    className="w-full px-3 py-1.5 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:border-slate-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Numéro de Téléphone
                  </label>
                  <input
                    type="text"
                    value={newUserData.phone}
                    onChange={(e) => setNewUserData({ ...newUserData, phone: e.target.value })}
                    placeholder="+33 6 12 34 56 78"
                    className="w-full px-3 py-1.5 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:border-slate-500"
                  />
                </div>
              </div>

              {/* Password for user login */}
              <div className="bg-amber-50/70 border border-amber-200/80 rounded-xl p-3">
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-bold text-amber-950 flex items-center gap-1.5">
                    <Lock className="w-3.5 h-3.5 text-amber-700" />
                    <span>Mot de passe de connexion</span>
                  </label>
                  <span className="text-[10px] text-amber-700">Pour connexion Email ou Téléphone</span>
                </div>
                <div className="relative">
                  <input
                    type={showAddPassword ? 'text' : 'password'}
                    value={newUserData.password || ''}
                    onChange={(e) => setNewUserData({ ...newUserData, password: e.target.value })}
                    placeholder="opti2026 (par défaut)"
                    className="w-full pl-3 pr-24 py-1.5 text-xs bg-white border border-amber-300 rounded-lg font-mono focus:outline-none focus:ring-1 focus:ring-amber-500"
                  />
                  <div className="absolute right-1 top-1 flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() =>
                        setNewUserData({
                          ...newUserData,
                          password: `opti${Math.floor(1000 + Math.random() * 9000)}`,
                        })
                      }
                      className="px-2 py-0.5 text-[10px] font-semibold bg-amber-100 hover:bg-amber-200 rounded text-amber-900 cursor-pointer"
                    >
                      Générer
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowAddPassword(!showAddPassword)}
                      className="p-1 text-slate-400 hover:text-slate-700"
                      tabIndex={-1}
                    >
                      {showAddPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>
                <p className="text-[10px] text-slate-500 mt-1">
                  Ce mot de passe permettra à l'utilisateur de se connecter à son espace avec son email OU son numéro de téléphone.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Objectif Mensuel CA (HTG)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="1000"
                    value={newUserData.targetMonthlyRevenue}
                    onChange={(e) => setNewUserData({ ...newUserData, targetMonthlyRevenue: parseInt(e.target.value) || 0 })}
                    className="w-full px-3 py-1.5 text-xs bg-white border border-slate-300 rounded-lg font-mono focus:outline-none focus:border-slate-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Taux de Commission (%)
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="50"
                    step="0.5"
                    value={Math.round((newUserData.commissionRate || 0.05) * 100)}
                    onChange={(e) => setNewUserData({ ...newUserData, commissionRate: (parseFloat(e.target.value) || 0) / 100 })}
                    className="w-full px-3 py-1.5 text-xs bg-white border border-slate-300 rounded-lg font-mono focus:outline-none focus:border-slate-500"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-3.5 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 text-xs font-bold text-white bg-slate-900 hover:bg-slate-800 rounded-lg transition-colors flex items-center gap-1.5"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Enregistrer l'utilisateur</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================
          MODAL: MODIFIER UN UTILISATEUR
          ======================================================== */}
      {editingUser && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 max-w-lg w-full p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-blue-100 text-blue-700 rounded-lg">
                  <Edit className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    Modifier l'Utilisateur
                  </h3>
                  <p className="text-xs text-slate-500">
                    {editingUser.name} ({editingUser.role})
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setEditingUser(null)}
                className="p-1 text-slate-400 hover:text-slate-700 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleEditSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Nom Complet
                </label>
                <input
                  type="text"
                  value={editingUser.name}
                  onChange={(e) => setEditingUser({ ...editingUser, name: e.target.value })}
                  className="w-full px-3 py-1.5 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:border-slate-500"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Rôle / Fonction
                  </label>
                  <select
                    value={editingUser.role}
                    onChange={(e) => setEditingUser({ ...editingUser, role: e.target.value })}
                    className="w-full px-3 py-1.5 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:border-slate-500"
                  >
                    <option value="Commercial Terrain CHR">Commercial Terrain CHR</option>
                    <option value="Délégué Commercial Bars & Brasseries">Délégué Commercial Bars & Brasseries</option>
                    <option value="Responsable Grands Comptes CHR">Responsable Grands Comptes CHR</option>
                    <option value="Conseiller Cavistes & Événementiel">Conseiller Cavistes & Événementiel</option>
                    <option value="Responsable Stock & Logistique">Responsable Stock & Logistique</option>
                    <option value="Caissier / Vendeur Comptoir">Caissier / Vendeur Comptoir</option>
                    <option value="Administrateur">Administrateur</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Statut du Compte
                  </label>
                  <select
                    value={editingUser.status || 'Actif'}
                    onChange={(e) => setEditingUser({ ...editingUser, status: e.target.value as any })}
                    className="w-full px-3 py-1.5 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:border-slate-500"
                  >
                    <option value="Actif">Actif</option>
                    <option value="Inactif">Inactif</option>
                  </select>
                </div>
              </div>

              {/* Administrator Rights Toggle */}
              <label className="flex items-center gap-2.5 p-3 rounded-xl border border-amber-300 bg-amber-50/80 text-xs font-semibold text-amber-950 cursor-pointer">
                <input
                  type="checkbox"
                  checked={isUserAdmin(editingUser)}
                  onChange={(e) => {
                    const checked = e.target.checked;
                    setEditingUser({
                      ...editingUser,
                      isAdmin: checked,
                      role: checked && editingUser.role !== 'Administrateur' ? 'Administrateur' : editingUser.role,
                    });
                  }}
                  className="w-4 h-4 rounded text-amber-600 focus:ring-amber-500 border-amber-300"
                />
                <Crown className="w-4 h-4 text-amber-600 shrink-0" />
                <div className="flex-1">
                  <span>Droits d'Administrateur Débloqués</span>
                  <p className="text-[10px] text-amber-800 font-normal">
                    Donne accès complet à toutes les fonctionnalités (finances, marges, utilisateurs, paramètres, stocks complets).
                  </p>
                </div>
              </label>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Email Professionnel
                  </label>
                  <input
                    type="email"
                    value={editingUser.email}
                    onChange={(e) => setEditingUser({ ...editingUser, email: e.target.value })}
                    className="w-full px-3 py-1.5 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:border-slate-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Numéro de Téléphone
                  </label>
                  <input
                    type="text"
                    value={editingUser.phone}
                    onChange={(e) => setEditingUser({ ...editingUser, phone: e.target.value })}
                    className="w-full px-3 py-1.5 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:border-slate-500"
                  />
                </div>
              </div>

              {/* Password for user login */}
              <div className="bg-amber-50/70 border border-amber-200/80 rounded-xl p-3">
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-bold text-amber-950 flex items-center gap-1.5">
                    <Lock className="w-3.5 h-3.5 text-amber-700" />
                    <span>Mot de passe de connexion</span>
                  </label>
                  <span className="text-[10px] text-amber-700">Email ou Numéro de téléphone</span>
                </div>
                <div className="relative">
                  <input
                    type={showEditPassword ? 'text' : 'password'}
                    value={editingUser.password || ''}
                    onChange={(e) => setEditingUser({ ...editingUser, password: e.target.value })}
                    placeholder="Entrez un mot de passe (défaut: opti2026)"
                    className="w-full pl-3 pr-24 py-1.5 text-xs bg-white border border-amber-300 rounded-lg font-mono focus:outline-none focus:ring-1 focus:ring-amber-500"
                  />
                  <div className="absolute right-1 top-1 flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() =>
                        setEditingUser({
                          ...editingUser,
                          password: `opti${Math.floor(1000 + Math.random() * 9000)}`,
                        })
                      }
                      className="px-2 py-0.5 text-[10px] font-semibold bg-amber-100 hover:bg-amber-200 rounded text-amber-900 cursor-pointer"
                    >
                      Générer
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowEditPassword(!showEditPassword)}
                      className="p-1 text-slate-400 hover:text-slate-700"
                      tabIndex={-1}
                    >
                      {showEditPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>
                <p className="text-[10px] text-slate-500 mt-1">
                  Ce mot de passe permet à ce collaborateur de se connecter avec son email ou son numéro de téléphone.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Objectif Mensuel CA (HTG)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="1000"
                    value={editingUser.targetMonthlyRevenue}
                    onChange={(e) => setEditingUser({ ...editingUser, targetMonthlyRevenue: parseInt(e.target.value) || 0 })}
                    className="w-full px-3 py-1.5 text-xs bg-white border border-slate-300 rounded-lg font-mono focus:outline-none focus:border-slate-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Taux de Commission (%)
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="50"
                    step="0.5"
                    value={Math.round((editingUser.commissionRate || 0.05) * 100)}
                    onChange={(e) => setEditingUser({ ...editingUser, commissionRate: (parseFloat(e.target.value) || 0) / 100 })}
                    className="w-full px-3 py-1.5 text-xs bg-white border border-slate-300 rounded-lg font-mono focus:outline-none focus:border-slate-500"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEditingUser(null)}
                  className="px-3.5 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 text-xs font-bold text-white bg-slate-900 hover:bg-slate-800 rounded-lg transition-colors flex items-center gap-1.5"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Enregistrer les modifications</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================
          MODAL: SUPPRIMER UN UTILISATEUR
          ======================================================== */}
      {userToDelete && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 max-w-md w-full p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2.5 rounded-full bg-red-100 text-red-600 shrink-0">
                <Trash2 className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  Supprimer cet utilisateur ?
                </h3>
                <p className="text-xs text-slate-500">
                  Cette action retirera le profil de l'équipe
                </p>
              </div>
            </div>

            <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg mb-4 text-xs space-y-1.5">
              <div className="flex justify-between">
                <span className="text-slate-500">Nom :</span>
                <span className="font-semibold text-slate-900">{userToDelete.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Rôle :</span>
                <span className="text-slate-800">{userToDelete.role}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Email :</span>
                <span className="text-slate-800 font-mono">{userToDelete.email}</span>
              </div>
            </div>

            <p className="text-xs text-slate-500 mb-5">
              Êtes-vous sûr de vouloir supprimer définitivement l'utilisateur <strong>{userToDelete.name}</strong> ?
            </p>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setUserToDelete(null)}
                className="px-3.5 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                className="px-4 py-1.5 text-xs font-bold text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors flex items-center gap-1.5 shadow-xs"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Confirmer la suppression</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
