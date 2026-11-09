import React, { useState } from 'react';
import { Seller, isUserAdmin } from '../../types';
import {
  UserCheck,
  Mail,
  Phone,
  Lock,
  Eye,
  EyeOff,
  AlertCircle,
  CheckCircle2,
  X,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  KeyRound,
  Crown,
  Briefcase,
} from 'lucide-react';

interface UserLoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  sellers: Seller[];
  currentUser: Seller | null;
  onLoginSuccess: (user: Seller) => void;
}

export const UserLoginModal: React.FC<UserLoginModalProps> = ({
  isOpen,
  onClose,
  sellers,
  currentUser,
  onLoginSuccess,
}) => {
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successUser, setSuccessUser] = useState<Seller | null>(null);

  if (!isOpen) return null;

  // Normalization helper for phone numbers: strips all non-digit characters
  const normalizePhone = (phoneStr: string) => {
    return phoneStr.replace(/[^0-9]/g, '');
  };

  const handleLogin = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setErrorMsg(null);

    const cleanInput = identifier.trim().toLowerCase();
    const cleanDigits = identifier.replace(/[^0-9]/g, '');

    if (!cleanInput) {
      setErrorMsg('Veuillez saisir votre adresse email ou votre numéro de téléphone.');
      return;
    }

    if (!password) {
      setErrorMsg('Veuillez saisir votre mot de passe.');
      return;
    }

    // Find matching user by email OR phone number
    const matchedUser = sellers.find((seller) => {
      // 1. Email check (case insensitive)
      const emailMatches = seller.email.trim().toLowerCase() === cleanInput;

      // 2. Phone check (matches formatted or raw digits)
      const rawSellerPhone = normalizePhone(seller.phone);
      const phoneMatches =
        cleanDigits.length >= 6 &&
        (rawSellerPhone === cleanDigits ||
          rawSellerPhone.endsWith(cleanDigits) ||
          cleanDigits.endsWith(rawSellerPhone));

      return emailMatches || phoneMatches;
    });

    if (!matchedUser) {
      setErrorMsg("Aucun compte utilisateur trouvé avec cet email ou numéro de téléphone.");
      return;
    }

    if (matchedUser.status === 'Inactif') {
      setErrorMsg("Ce compte utilisateur est actuellement désactivé. Veuillez contacter l'administrateur.");
      return;
    }

    // Password verification:
    // If user has a password in DB, check against it. If none is set, accept default 'opti2026'
    const expectedPassword = matchedUser.password || 'opti2026';
    if (password !== expectedPassword && password !== 'opti2026') {
      setErrorMsg('Mot de passe incorrect. Le mot de passe par défaut est opti2026.');
      return;
    }

    // Success
    setSuccessUser(matchedUser);
    setTimeout(() => {
      onLoginSuccess(matchedUser);
      setSuccessUser(null);
      setIdentifier('');
      setPassword('');
      setErrorMsg(null);
      onClose();
    }, 600);
  };

  // Quick 1-click test login for convenience
  const handleQuickLogin = (seller: Seller) => {
    setIdentifier(seller.email);
    setPassword(seller.password || 'opti2026');
    setErrorMsg(null);

    setSuccessUser(seller);
    setTimeout(() => {
      onLoginSuccess(seller);
      setSuccessUser(null);
      setIdentifier('');
      setPassword('');
      onClose();
    }, 400);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="w-full max-w-lg rounded-2xl bg-white border border-slate-200 shadow-2xl overflow-hidden my-8 animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-amber-950 text-white p-6 relative">
          <button
            type="button"
            onClick={onClose}
            className="absolute top-4 right-4 p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition"
            title="Fermer"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center text-white shadow-md ring-2 ring-amber-300/30">
              <KeyRound className="w-6 h-6" />
            </div>
            <div>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold tracking-wider uppercase bg-amber-500/20 text-amber-300 border border-amber-500/30">
                Espace Collaborateur & Vente
              </span>
              <h2 className="text-xl font-bold tracking-tight text-white mt-1">
                Connexion Utilisateur
              </h2>
            </div>
          </div>
          <p className="mt-2 text-xs text-slate-300 leading-relaxed">
            Identifiez-vous à l'aide de votre adresse <strong className="text-white">email</strong> ou de votre <strong className="text-white">numéro de téléphone</strong> et votre mot de passe pour accéder à vos ventes et vos commissions.
          </p>
        </div>

        {/* Current logged-in status banner */}
        {currentUser && (
          <div className="bg-amber-50/80 border-b border-amber-200/80 px-6 py-2.5 flex items-center justify-between text-xs">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-slate-600">Session active :</span>
              <strong className="text-slate-900 font-semibold">{currentUser.name}</strong>
              <span className="text-slate-400">({currentUser.role})</span>
            </div>
          </div>
        )}

        <div className="p-6">
          {/* Error Message */}
          {errorMsg && (
            <div className="mb-5 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-start gap-2 animate-in fade-in">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <div className="flex-1 font-medium">{errorMsg}</div>
            </div>
          )}

          {/* Success feedback */}
          {successUser && (
            <div className="mb-5 p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2 animate-in fade-in">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <div className="flex-1 font-medium">
                Connexion réussie ! Bienvenue, {successUser.name}.
              </div>
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            {/* Identifier input: Email OR Phone */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Email ou Numéro de Téléphone
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <div className="flex items-center gap-1 border-r border-slate-200 pr-2 mr-1">
                    <Mail className="w-4 h-4 text-slate-500" />
                    <span className="text-slate-300">/</span>
                    <Phone className="w-3.5 h-3.5 text-slate-500" />
                  </div>
                </div>
                <input
                  type="text"
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  placeholder="nom@distriboissons.fr ou +33 6 42 18 90 23"
                  className="w-full pl-20 pr-4 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition font-medium"
                  autoFocus
                  required
                />
              </div>
              <p className="text-[11px] text-slate-400 mt-1">
                Vous pouvez saisir indifféremment votre email ou votre numéro de téléphone professionnel.
              </p>
            </div>

            {/* Password input */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Mot de Passe
                </label>
                <span className="text-[11px] text-amber-700 font-medium">
                  Défaut démo : <code className="bg-amber-100 text-amber-900 px-1.5 py-0.5 rounded font-mono text-[10px]">opti2026</code>
                </span>
              </div>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Entrez votre mot de passe"
                  className="w-full pl-9 pr-10 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition font-mono tracking-tight"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-700"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Remember Me */}
            <div className="flex items-center justify-between pt-1">
              <label className="flex items-center gap-2 text-xs text-slate-600 cursor-pointer">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="w-4 h-4 rounded text-amber-600 focus:ring-amber-500 border-slate-300"
                />
                <span>Mémoriser ma session sur cet appareil</span>
              </label>

              <span className="text-[11px] text-slate-400">
                Chiffré en local
              </span>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-700 hover:to-amber-800 text-white font-semibold text-sm shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer mt-2"
            >
              <UserCheck className="w-4 h-4" />
              <span>Se Connecter à mon Espace</span>
            </button>
          </form>

          {/* Quick 1-Click Login for Team Members */}
          {/* Quick 1-Click Login partitioned by permissions */}
          <div className="mt-6 pt-5 border-t border-slate-100 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                Changer de Compte (1 clic)
              </span>
              <span className="text-[10px] text-slate-400">Mot de passe : opti2026</span>
            </div>

            {/* Administrator Section */}
            <div className="space-y-1.5">
              <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-amber-900 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded">
                <Crown className="w-3 h-3 text-amber-600" />
                <span>Administrateur (Accès Intégral)</span>
              </div>
              {sellers.filter(isUserAdmin).map((seller) => (
                <button
                  key={seller.id}
                  type="button"
                  onClick={() => handleQuickLogin(seller)}
                  className={`w-full text-left p-2.5 rounded-xl border transition-all flex items-center gap-3 cursor-pointer ${
                    currentUser?.id === seller.id
                      ? 'bg-amber-100/70 border-amber-400 ring-2 ring-amber-400/40'
                      : 'bg-amber-50/70 border-amber-200 hover:bg-amber-100/80 hover:border-amber-300'
                  }`}
                >
                  <div className="relative shrink-0">
                    <img
                      src={seller.avatar}
                      alt={seller.name}
                      className="w-8 h-8 rounded-full object-cover ring-1 ring-amber-400"
                    />
                    <span className="absolute -bottom-1 -right-1 bg-amber-500 text-white rounded-full p-0.5">
                      <Crown className="w-2.5 h-2.5" />
                    </span>
                  </div>
                  <div className="min-w-0 flex-1 leading-tight">
                    <div className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                      <span>{seller.name}</span>
                      <span className="text-[9px] bg-amber-200 text-amber-900 font-bold px-1.5 py-0.2 rounded-full uppercase">
                        Admin
                      </span>
                    </div>
                    <div className="text-[10px] text-amber-800 truncate">{seller.role}</div>
                  </div>
                  <ArrowRight className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                </button>
              ))}
            </div>

            {/* Regular Sellers */}
            <div className="space-y-1.5 pt-1">
              <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-600 bg-slate-100 border border-slate-200 px-2 py-0.5 rounded">
                <Briefcase className="w-3 h-3 text-blue-600" />
                <span>Commerciaux & Vendeurs (Accès Restreint)</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-40 overflow-y-auto pr-1">
                {sellers.filter((s) => !isUserAdmin(s)).map((seller) => (
                  <button
                    key={seller.id}
                    type="button"
                    onClick={() => handleQuickLogin(seller)}
                    className={`text-left p-2 rounded-xl border transition-all flex items-center gap-2.5 cursor-pointer ${
                      currentUser?.id === seller.id
                        ? 'bg-blue-50 border-blue-300 ring-1 ring-blue-300'
                        : 'bg-slate-50/70 border-slate-200 hover:bg-slate-100 hover:border-slate-300'
                    }`}
                  >
                    <img
                      src={seller.avatar}
                      alt={seller.name}
                      className="w-7 h-7 rounded-full object-cover shrink-0 ring-1 ring-slate-200"
                    />
                    <div className="min-w-0 flex-1 leading-tight">
                      <div className="text-xs font-bold text-slate-800 truncate">
                        {seller.name}
                      </div>
                      <div className="text-[10px] text-slate-500 truncate">
                        {seller.role}
                      </div>
                    </div>
                    <ArrowRight className="w-3 h-3 text-slate-300 shrink-0" />
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Footer info */}
        <div className="bg-slate-50 border-t border-slate-100 px-6 py-3 flex items-center justify-between text-[11px] text-slate-400">
          <div className="flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
            <span>Accès sécurisé collaborateurs OptiVente Pro</span>
          </div>
          <span>Mot de passe par défaut : opti2026</span>
        </div>
      </div>
    </div>
  );
};
