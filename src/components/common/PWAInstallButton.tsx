import React, { useState } from 'react';
import { usePWAInstall } from '../../hooks/usePWAInstall';
import { Download, Smartphone, X, CheckCircle2, Zap } from 'lucide-react';

export const PWAInstallButton: React.FC = () => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showIOSGuide, setShowIOSGuide] = useState(false);

  // If already running as an installed PWA on the phone, don't show the install banner
  if (isInstalled) {
    return null;
  }

  // Android / Chrome / Edge flow
  if (isInstallable) {
    return (
      <button
        onClick={install}
        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm transition active:scale-95 animate-pulse"
        title="Installer l'application sur votre téléphone pour un chargement instantané sans attente"
      >
        <Zap className="w-3.5 h-3.5 text-amber-300" />
        <span>Installer sur Téléphone</span>
      </button>
    );
  }

  // iOS Safari flow
  if (isIOS) {
    return (
      <>
        <button
          onClick={() => setShowIOSGuide(true)}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-600/90 hover:bg-emerald-700 text-white shadow-sm transition active:scale-95"
          title="Installer sur iPhone pour un rechargement ultra rapide"
        >
          <Smartphone className="w-3.5 h-3.5 text-emerald-200" />
          <span>Installer sur iPhone</span>
        </button>

        {showIOSGuide && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-150">
            <div className="w-full max-w-sm rounded-2xl bg-slate-900 border border-slate-700 p-6 text-white shadow-2xl">
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-lg bg-emerald-500/20 text-emerald-400">
                    <Smartphone className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-white">Installer sur iPhone / iPad</h3>
                    <p className="text-xs text-slate-400">Chargement 10x plus rapide</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowIOSGuide(false)}
                  className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="mt-4 space-y-3 text-sm text-slate-300">
                <div className="flex items-start gap-3 p-2.5 rounded-xl bg-slate-800/60 border border-slate-700/50">
                  <div className="w-6 h-6 rounded-full bg-blue-600/30 text-blue-400 flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">
                    1
                  </div>
                  <p className="text-xs">
                    Dans Safari, appuyez sur le bouton <strong className="text-white">Partager</strong> (icône avec un carré et une flèche vers le haut <span className="inline-block px-1.5 py-0.5 bg-slate-700 rounded text-[11px]">↑</span>).
                  </p>
                </div>

                <div className="flex items-start gap-3 p-2.5 rounded-xl bg-slate-800/60 border border-slate-700/50">
                  <div className="w-6 h-6 rounded-full bg-blue-600/30 text-blue-400 flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">
                    2
                  </div>
                  <p className="text-xs">
                    Faites défiler vers le bas et touchez <strong className="text-white">Sur l'écran d'accueil</strong>.
                  </p>
                </div>

                <div className="flex items-start gap-3 p-2.5 rounded-xl bg-slate-800/60 border border-slate-700/50">
                  <div className="w-6 h-6 rounded-full bg-emerald-600/30 text-emerald-400 flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">
                    3
                  </div>
                  <p className="text-xs">
                    Touchez <strong className="text-white">Ajouter</strong> en haut à droite. L'application s'ouvrira directement sans aucun temps de chargement web.
                  </p>
                </div>
              </div>

              <div className="mt-5">
                <button
                  onClick={() => setShowIOSGuide(false)}
                  className="w-full py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-sm font-medium text-white transition"
                >
                  J'ai compris
                </button>
              </div>
            </div>
          </div>
        )}
      </>
    );
  }

  return null;
};
