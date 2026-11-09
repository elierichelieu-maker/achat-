import React from 'react';
import { Seller } from '../../types';
import { Lock, ShieldAlert, ArrowLeft, KeyRound, Crown, CheckCircle2 } from 'lucide-react';

interface AccessDeniedViewProps {
  onBackToDashboard?: () => void;
  onBackToSafety?: () => void;
  onOpenLoginModal?: () => void;
  currentUser?: Seller | null;
  featureName?: string;
}

export const AccessDeniedView: React.FC<AccessDeniedViewProps> = ({
  onBackToDashboard,
  onBackToSafety,
  onOpenLoginModal,
  currentUser,
  featureName = 'cette fonctionnalité',
}) => {
  const handleBack = onBackToSafety || onBackToDashboard || (() => {});
  return (
    <div className="min-h-[460px] flex items-center justify-center py-10 px-4 animate-in fade-in zoom-in-95 duration-200">
      <div className="max-w-lg w-full bg-white rounded-3xl border border-amber-200 shadow-xl overflow-hidden text-center">
        {/* Top Header */}
        <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-amber-950 p-6 text-white relative">
          <div className="w-16 h-16 rounded-2xl bg-amber-500/20 border border-amber-400/30 text-amber-400 flex items-center justify-center mx-auto shadow-inner">
            <Lock className="w-8 h-8" />
          </div>

          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider bg-amber-500/20 text-amber-300 border border-amber-500/30 mt-3">
            <Crown className="w-3.5 h-3.5" />
            <span>Accès Réservé à l'Administrateur</span>
          </span>

          <h2 className="text-xl font-bold tracking-tight text-white mt-2">
            Fonctionnalité Protégée
          </h2>
          <p className="text-xs text-slate-300 mt-1 max-w-sm mx-auto leading-relaxed">
            Seul l'administrateur de l'entreprise a accès à l'ensemble des fonctionnalités (finances, marges globales, gestion des utilisateurs et configuration).
          </p>
        </div>

        {/* Content */}
        <div className="p-6 sm:p-7 space-y-4">
          <div className="p-4 rounded-2xl bg-amber-50/70 border border-amber-200 text-left text-xs text-amber-950 space-y-2">
            <div className="flex items-center gap-2 font-bold text-amber-900">
              <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0" />
              <span>Droits d'accès de votre profil</span>
            </div>
            <p className="text-slate-600 leading-relaxed text-[11px]">
              Vous êtes actuellement connecté en tant que <strong>{currentUser?.name || 'Vendeur / Commercial'}</strong> ({currentUser?.role || 'Commercial CHR'}).
            </p>
            <p className="text-slate-600 leading-relaxed text-[11px]">
              Les vendeurs et commerciaux ont accès à l'encaissement, aux ventes, aux factures, aux clients et au catalogue des boissons. Les rapports comptables, la gestion de l'équipe et les paramètres système sont réservés à la Direction.
            </p>
          </div>

          {/* Action CTAs */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-2.5 pt-2">
            <button
              type="button"
              onClick={handleBack}
              className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Retour au Tableau de Bord</span>
            </button>

            {onOpenLoginModal && (
              <button
                type="button"
                onClick={onOpenLoginModal}
                className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <KeyRound className="w-4 h-4" />
                <span>Se connecter en Administrateur</span>
              </button>
            )}
          </div>
        </div>

        {/* Footer info */}
        <div className="bg-slate-50 border-t border-slate-100 px-6 py-3 text-[11px] text-slate-400">
          Pour obtenir des droits d'administrateur, contactez le responsable de votre établissement.
        </div>
      </div>
    </div>
  );
};
