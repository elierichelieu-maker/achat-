import React, { useState } from 'react';
import {
  X,
  Share2,
  Copy,
  Check,
  ExternalLink,
  Smartphone,
  Globe,
  Send,
  Lock,
  ShieldCheck,
  AlertTriangle,
  Ban,
  CheckCircle2,
  ArrowRight,
} from 'lucide-react';

interface ShareAppModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const OFFICIAL_APP_URL = 'https://gestion-de-ventanakayit.netlify.app';

export const ShareAppModal: React.FC<ShareAppModalProps> = ({
  isOpen,
  onClose,
}) => {
  const [copiedOfficial, setCopiedOfficial] = useState(false);
  const [sharedNative, setSharedNative] = useState(false);

  if (!isOpen) return null;

  const handleCopy = (url: string) => {
    navigator.clipboard.writeText(url);
    setCopiedOfficial(true);
    setTimeout(() => setCopiedOfficial(false), 2500);
  };

  const handleNativeShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'DistriBoissons & Vins - Accès Unique',
          text: 'Accédez directement à votre espace de gestion DistriBoissons Pro (Distribution Boissons & Caisse) :',
          url: OFFICIAL_APP_URL,
        });
        setSharedNative(true);
        setTimeout(() => setSharedNative(false), 2500);
      } catch (e) {
        // user cancelled or failed, ignore
      }
    } else {
      handleCopy(OFFICIAL_APP_URL);
    }
  };

  const handleWhatsApp = (url: string) => {
    const text = `Voici le SEUL et UNIQUE lien officiel d'accès à l'application DistriBoissons Pro (Distribution Boissons & Vins) :\n${url}\n\n⚠️ Tous les anciens liens sont inactifs. Utilisez uniquement ce lien officiel pour travailler sur la base de données synchronisée.`;
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 z-50 animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-lg w-full overflow-hidden text-slate-900 max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="p-4 bg-gradient-to-r from-slate-900 via-slate-800 to-amber-950 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-amber-500/20 text-amber-400 rounded-lg border border-amber-500/30">
              <Globe className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-white">Lien Officiel Unique</h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                  Netlify Actif
                </span>
              </div>
              <p className="text-[11px] text-slate-300">Un seul lien valide pour toute l'équipe et tous les appareils</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 overflow-y-auto space-y-5 text-xs sm:text-sm">
          {/* Active Unique Production Link Card */}
          <div className="p-4 bg-emerald-50/70 border-2 border-emerald-500 rounded-xl space-y-3 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="font-bold text-emerald-950 flex items-center gap-1.5 text-sm">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
                <span>Lien Unique Officiel (Netlify)</span>
              </span>
              <span className="text-[10px] font-bold uppercase bg-emerald-600 text-white px-2.5 py-0.5 rounded-full shadow-2xs">
                Seul Lien Actif
              </span>
            </div>

            <p className="text-xs text-slate-700 leading-relaxed">
              Pour assurer un <strong>travail unique et centralisé</strong>, tous les collaborateurs, vendeurs et administrateurs doivent utiliser exclusivement cette adresse :
            </p>

            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  readOnly
                  value={OFFICIAL_APP_URL}
                  className="w-full bg-white border border-emerald-300 rounded-lg px-3 py-2 text-xs font-mono font-bold text-slate-900 select-all focus:outline-none"
                />
                <button
                  type="button"
                  onClick={() => handleCopy(OFFICIAL_APP_URL)}
                  className={`px-3.5 py-2 text-xs font-bold rounded-lg transition-all flex items-center gap-1 shrink-0 cursor-pointer ${
                    copiedOfficial
                      ? 'bg-emerald-700 text-white'
                      : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-2xs'
                  }`}
                >
                  {copiedOfficial ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedOfficial ? 'Copié !' : 'Copier'}</span>
                </button>
              </div>
            </div>

            {/* Quick Share Buttons */}
            <div className="flex items-center gap-2 pt-2 flex-wrap border-t border-emerald-200">
              <button
                type="button"
                onClick={handleNativeShare}
                className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-900 bg-emerald-200/80 hover:bg-emerald-200 px-3 py-1.5 rounded-lg cursor-pointer transition"
              >
                <Share2 className="w-3.5 h-3.5" />
                <span>{sharedNative ? 'Partagé !' : 'Partager sur mobile'}</span>
              </button>
              <button
                type="button"
                onClick={() => handleWhatsApp(OFFICIAL_APP_URL)}
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 px-3 py-1.5 rounded-lg cursor-pointer transition shadow-2xs"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Envoyer sur WhatsApp</span>
              </button>
              <a
                href={OFFICIAL_APP_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-xs font-semibold text-blue-700 hover:text-blue-800 hover:underline px-2 py-1"
              >
                <ExternalLink className="w-3 h-3" />
                <span>Ouvrir l'application</span>
              </a>
            </div>
          </div>

          {/* Inactive Links Notice */}
          <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
            <div className="flex items-center gap-2 text-slate-700 font-bold text-xs uppercase tracking-wider">
              <Ban className="w-4 h-4 text-rose-500" />
              <span>Statut des Autres Liens : INACTIFS</span>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              Pour éviter les doublons ou la perte de données, <strong>toutes les autres adresses sont désactivées</strong> :
            </p>

            <div className="space-y-1.5 text-xs font-mono">
              <div className="p-2 bg-white rounded-lg border border-slate-200 flex items-center justify-between text-slate-400">
                <span className="line-through truncate pr-2">https://ais-dev-...run.app</span>
                <span className="text-[10px] font-bold text-rose-600 bg-rose-50 border border-rose-200 px-2 py-0.5 rounded shrink-0">
                  INACTIF
                </span>
              </div>
              <div className="p-2 bg-white rounded-lg border border-slate-200 flex items-center justify-between text-slate-400">
                <span className="line-through truncate pr-2">https://ais-pre-...run.app</span>
                <span className="text-[10px] font-bold text-rose-600 bg-rose-50 border border-rose-200 px-2 py-0.5 rounded shrink-0">
                  INACTIF
                </span>
              </div>
            </div>

            <div className="flex items-start gap-2 text-[11px] text-amber-800 bg-amber-50 p-2.5 rounded-lg border border-amber-200">
              <ShieldCheck className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <span>
                Seul <strong>gestion-de-ventanakayit.netlify.app</strong> est connecté à votre base de données Cloud Firestore de production.
              </span>
            </div>
          </div>

          {/* Quick Instructions for Team */}
          <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1.5 text-xs text-slate-600">
            <div className="flex items-center gap-1.5 font-bold text-slate-800">
              <Smartphone className="w-4 h-4 text-slate-700" />
              <span>Conseil pour vos vendeurs :</span>
            </div>
            <p className="text-[11px] leading-relaxed">
              Demandez à vos vendeurs d'ajouter <strong>https://gestion-de-ventanakayit.netlify.app</strong> sur l'écran d'accueil de leur téléphone pour avoir l'icône de l'application prête à l'emploi.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="p-3.5 bg-slate-50 border-t border-slate-200 flex items-center justify-between shrink-0">
          <div className="text-[11px] text-slate-500 font-mono truncate max-w-[280px]">
            {OFFICIAL_APP_URL}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-100 border border-slate-300 rounded-lg transition-colors cursor-pointer"
          >
            Fermer
          </button>
        </div>
      </div>
    </div>
  );
};
