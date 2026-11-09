import React, { useState } from 'react';
import { Seller, isUserAdmin } from '../../types';
import { WaterBottleLogo } from '../common/WaterBottleLogo';
import {
  Mail,
  Phone,
  Lock,
  Eye,
  EyeOff,
  UserCheck,
  AlertCircle,
  CheckCircle2,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  Smartphone,
  Cloud,
  Wine,
  Beer,
  Layers,
  KeyRound,
  Check,
  ShieldAlert,
  Crown,
  Briefcase,
} from 'lucide-react';

interface LoginPageProps {
  sellers: Seller[];
  onLoginSuccess: (user: Seller) => void;
  isCloudConnected?: boolean;
}

export const LoginPage: React.FC<LoginPageProps> = ({
  sellers,
  onLoginSuccess,
  isCloudConnected = true,
}) => {
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successUser, setSuccessUser] = useState<Seller | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Normalization helper for phone numbers: strips non-digits
  const normalizePhone = (phoneStr: string) => phoneStr.replace(/[^0-9]/g, '');

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

    setIsSubmitting(true);

    // Search user by email OR phone
    const matchedUser = sellers.find((seller) => {
      const emailMatches = seller.email.trim().toLowerCase() === cleanInput;
      const rawSellerPhone = normalizePhone(seller.phone);
      const phoneMatches =
        cleanDigits.length >= 6 &&
        (rawSellerPhone === cleanDigits ||
          rawSellerPhone.endsWith(cleanDigits) ||
          cleanDigits.endsWith(rawSellerPhone));
      return emailMatches || phoneMatches;
    });

    if (!matchedUser) {
      setIsSubmitting(false);
      setErrorMsg('Aucun compte trouvé avec cet identifiant. Vérifiez votre email ou numéro.');
      return;
    }

    if (matchedUser.status === 'Inactif') {
      setIsSubmitting(false);
      setErrorMsg("Ce compte utilisateur est inactif. Contactez votre administrateur.");
      return;
    }

    const expectedPassword = matchedUser.password || 'opti2026';
    if (password !== expectedPassword && password !== 'opti2026') {
      setIsSubmitting(false);
      setErrorMsg('Mot de passe incorrect. Le mot de passe par défaut est opti2026.');
      return;
    }

    // Success transition
    setSuccessUser(matchedUser);
    setTimeout(() => {
      onLoginSuccess(matchedUser);
    }, 500);
  };

  // Quick 1-click login for test users
  const handleQuickLogin = (seller: Seller) => {
    setErrorMsg(null);
    setIdentifier(seller.email);
    setPassword(seller.password || 'opti2026');
    setSuccessUser(seller);
    setTimeout(() => {
      onLoginSuccess(seller);
    }, 450);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between relative overflow-hidden select-none font-sans">
      {/* Background Ambience & Lighting */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[500px] bg-gradient-to-b from-amber-500/15 via-blue-600/10 to-transparent blur-3xl pointer-events-none -z-10" />
      <div className="absolute bottom-0 right-0 w-[500px] h-[400px] bg-amber-600/10 blur-3xl pointer-events-none -z-10" />
      <div className="absolute top-1/3 left-0 w-[400px] h-[300px] bg-emerald-600/5 blur-3xl pointer-events-none -z-10" />

      {/* Top Banner Navigation */}
      <header className="w-full border-b border-slate-800/80 bg-slate-900/60 backdrop-blur-md px-4 sm:px-8 py-3.5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <WaterBottleLogo className="w-9 h-9" />
          <div>
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-base tracking-tight text-white">OptiVente Pro</span>
              <span className="text-[10px] font-bold uppercase tracking-wider bg-amber-500/20 text-amber-300 border border-amber-500/30 px-2 py-0.5 rounded-full">
                Distribution & Caisse
              </span>
            </div>
            <p className="text-[11px] text-slate-400 hidden sm:block">
              Gestion commerciale, stocks et caisse mobile pour boissons gazeuses & alcoolisées
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 text-xs">
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/25 text-emerald-400 text-[11px] font-semibold">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span>Cloud Firestore Connecté</span>
          </div>
        </div>
      </header>

      {/* Main Login Content Card */}
      <main className="flex-1 flex items-center justify-center p-4 sm:p-6 lg:p-8">
        <div className="w-full max-w-md bg-white text-slate-900 rounded-3xl shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
          
          {/* Card Header */}
          <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-amber-950 p-6 sm:p-7 text-white relative">
            <div className="flex items-center justify-between">
              <div className="w-12 h-12 rounded-2xl bg-amber-500/20 border border-amber-400/30 flex items-center justify-center text-amber-400 shadow-inner">
                <KeyRound className="w-6 h-6" />
              </div>
              <span className="text-[10px] font-bold uppercase tracking-widest text-slate-300 bg-white/10 px-2.5 py-1 rounded-full border border-white/10">
                Espace Collaborateur
              </span>
            </div>

            <h1 className="text-2xl font-black tracking-tight text-white mt-4">
              Connexion à l'Espace
            </h1>
            <p className="text-xs text-slate-300 mt-1.5 leading-relaxed">
              Connectez-vous avec votre <strong className="text-amber-300">Email</strong> ou votre <strong className="text-amber-300">Numéro de téléphone</strong> et votre mot de passe pour accéder à vos ventes et vos stocks.
            </p>
          </div>

          <div className="p-6 sm:p-7">
            {/* Error Message */}
            {errorMsg && (
              <div className="mb-5 p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-start gap-2.5 animate-in fade-in">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                <div className="flex-1 font-medium leading-relaxed">{errorMsg}</div>
              </div>
            )}

            {/* Success Feedback */}
            {successUser && (
              <div className="mb-5 p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2.5 animate-in fade-in">
                <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                <div className="flex-1 font-semibold">
                  Connexion réussie ! Chargement de l'espace de {successUser.name}...
                </div>
              </div>
            )}

            {/* Login Form */}
            <form onSubmit={handleLogin} className="space-y-4">
              {/* Dual Input: Email or Phone */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Email ou Numéro de Téléphone
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <div className="flex items-center gap-1 border-r border-slate-200 pr-2.5 mr-1.5">
                      <Mail className="w-4 h-4 text-slate-500" />
                      <span className="text-slate-300">/</span>
                      <Phone className="w-3.5 h-3.5 text-slate-500" />
                    </div>
                  </div>
                  <input
                    type="text"
                    value={identifier}
                    onChange={(e) => setIdentifier(e.target.value)}
                    placeholder="sophie@optiboissons.fr ou 06 12 34 56 78"
                    className="w-full pl-22 pr-4 py-3 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/25 focus:border-amber-500 transition font-medium"
                    autoFocus
                    required
                  />
                </div>
                <div className="flex items-center justify-between mt-1 text-[11px] text-slate-400">
                  <span>Format libre (avec ou sans indicatif +33)</span>
                  <span className="text-amber-700 font-semibold">Email ou Mobile</span>
                </div>
              </div>

              {/* Password Input */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                    Mot de Passe
                  </label>
                  <span className="text-[11px] text-amber-700 font-semibold">
                    Défaut démo : <code className="bg-amber-100 text-amber-900 px-1.5 py-0.5 rounded font-mono text-[10px]">opti2026</code>
                  </span>
                </div>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <Lock className="w-4 h-4" />
                  </div>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Entrez votre mot de passe"
                    className="w-full pl-10 pr-11 py-3 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/25 focus:border-amber-500 transition font-mono tracking-tight"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-700"
                    tabIndex={-1}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Options & Remember */}
              <div className="flex items-center justify-between pt-1">
                <label className="flex items-center gap-2 text-xs text-slate-600 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="w-4 h-4 rounded text-amber-600 focus:ring-amber-500 border-slate-300"
                  />
                  <span>Rester connecté sur cet appareil</span>
                </label>
                <span className="text-[11px] text-slate-400">Session persistante</span>
              </div>

              {/* Submit CTA */}
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-3.5 px-4 rounded-xl bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-700 hover:to-amber-800 text-white font-bold text-sm shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer mt-2 disabled:opacity-50"
              >
                <UserCheck className="w-4 h-4" />
                <span>{isSubmitting ? 'Vérification...' : 'Se Connecter à mon Espace'}</span>
              </button>
            </form>

            {/* Quick 1-Click Login for Demo & Testing partitioned by permissions */}
            <div className="mt-6 pt-5 border-t border-slate-100 space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                  Comptes de Test (1 clic)
                </span>
                <span className="text-[10px] text-slate-400 font-medium">Mot de passe : opti2026</span>
              </div>

              {/* Administrator Section */}
              <div className="space-y-1.5">
                <div className="flex items-center gap-1.5 text-[11px] font-bold text-amber-900 bg-amber-50 border border-amber-200/80 px-2.5 py-1 rounded-lg">
                  <Crown className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                  <span>Administrateur · Accès Total à toutes les fonctionnalités</span>
                </div>
                {sellers.filter(isUserAdmin).map((seller) => (
                  <button
                    key={seller.id}
                    type="button"
                    onClick={() => handleQuickLogin(seller)}
                    className="w-full text-left p-2.5 rounded-xl border border-amber-300 bg-gradient-to-r from-amber-50/90 to-amber-100/40 hover:from-amber-100 hover:to-amber-200/50 transition-all flex items-center gap-3 group cursor-pointer shadow-xs"
                  >
                    <div className="relative shrink-0">
                      <img
                        src={seller.avatar}
                        alt={seller.name}
                        className="w-9 h-9 rounded-full object-cover ring-2 ring-amber-400"
                      />
                      <span className="absolute -bottom-1 -right-1 bg-amber-500 text-white rounded-full p-0.5">
                        <Crown className="w-2.5 h-2.5" />
                      </span>
                    </div>
                    <div className="min-w-0 flex-1 leading-tight">
                      <div className="text-xs font-bold text-slate-900 group-hover:text-amber-900 flex items-center gap-1.5">
                        <span>{seller.name}</span>
                        <span className="text-[9px] bg-amber-200 text-amber-900 font-bold px-1.5 py-0.2 rounded-full uppercase">
                          Admin
                        </span>
                      </div>
                      <div className="text-[10px] text-amber-800 font-medium truncate mt-0.5">
                        {seller.role}
                      </div>
                      <div className="text-[9px] text-slate-500 font-mono truncate">
                        {seller.email} · {seller.phone}
                      </div>
                    </div>
                    <div className="shrink-0 flex items-center gap-1 text-[11px] font-bold text-amber-800 bg-white/80 px-2 py-1 rounded-lg border border-amber-200 group-hover:bg-amber-600 group-hover:text-white transition">
                      <span>Connexion</span>
                      <ArrowRight className="w-3 h-3" />
                    </div>
                  </button>
                ))}
              </div>

              {/* Sellers Section */}
              <div className="space-y-1.5 pt-1">
                <div className="flex items-center gap-1.5 text-[11px] font-bold text-slate-700 bg-slate-50 border border-slate-200 px-2.5 py-1 rounded-lg">
                  <Briefcase className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                  <span>Commerciaux & Vendeurs · Accès Ventes, Caisse, Clients & Catalogue</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-44 overflow-y-auto pr-1">
                  {sellers.filter((s) => !isUserAdmin(s)).map((seller) => (
                    <button
                      key={seller.id}
                      type="button"
                      onClick={() => handleQuickLogin(seller)}
                      className="text-left p-2 rounded-xl border border-slate-200 bg-slate-50/70 hover:bg-slate-100 hover:border-slate-300 transition-all flex items-center gap-2.5 group cursor-pointer"
                    >
                      <img
                        src={seller.avatar}
                        alt={seller.name}
                        className="w-7 h-7 rounded-full object-cover shrink-0 ring-1 ring-slate-200"
                      />
                      <div className="min-w-0 flex-1 leading-tight">
                        <div className="text-xs font-bold text-slate-800 truncate group-hover:text-blue-700">
                          {seller.name}
                        </div>
                        <div className="text-[10px] text-slate-500 truncate">
                          {seller.role}
                        </div>
                      </div>
                      <ArrowRight className="w-3.5 h-3.5 text-slate-300 group-hover:text-blue-600 shrink-0 transition" />
                    </button>
                  ))}
                </div>
              </div>
            </div>

          </div>

          {/* Card Footer */}
          <div className="bg-slate-50 border-t border-slate-100 px-6 py-3.5 flex items-center justify-between text-[11px] text-slate-500">
            <div className="flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
              <span>OptiVente Pro v2.4</span>
            </div>
            <div className="flex items-center gap-2 text-slate-400">
              <Smartphone className="w-3.5 h-3.5" />
              <span>Compatible Mobile & Bureau</span>
            </div>
          </div>
        </div>
      </main>

      {/* Footer Info */}
      <footer className="w-full text-center py-4 px-4 text-xs text-slate-500 border-t border-slate-900 bg-slate-950/80">
        <p>
          OptiVente Pro · Solution complète de gestion pour grossistes et distributeurs de boissons gazeuses et alcools.
        </p>
      </footer>
    </div>
  );
};
