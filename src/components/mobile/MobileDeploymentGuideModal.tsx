import React, { useState } from 'react';
import {
  Smartphone,
  CheckCircle2,
  Copy,
  Check,
  ExternalLink,
  ShieldAlert,
  Terminal,
  FileText,
  AlertTriangle,
  X,
  Layers,
  ChevronRight,
  Info,
  Download,
  Key,
  Zap,
  Globe,
  Share2,
} from 'lucide-react';

interface MobileDeploymentGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type GuideTab = 'instant' | 'overview' | 'capacitor' | 'googleplay' | 'appstore' | 'checklist';

export const MobileDeploymentGuideModal: React.FC<MobileDeploymentGuideModalProps> = ({
  isOpen,
  onClose,
}) => {
  const [activeTab, setActiveTab] = useState<GuideTab>('instant');
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const [copiedUrl, setCopiedUrl] = useState(false);

  if (!isOpen) return null;

  const copyToClipboard = (text: string, index: number) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  const capacitorCommands = [
    {
      title: '1. Installer Capacitor CLI et les cœurs natifs',
      command: 'npm install @capacitor/core @capacitor/cli @capacitor/android @capacitor/ios',
      desc: 'Installe le runtime mobile Capacitor et les modules pour Android Studio et Apple Xcode.',
    },
    {
      title: '2. Compiler votre application Web React en mode production',
      command: 'npm run build',
      desc: 'Génère les fichiers optimisés dans le dossier dist/.',
    },
    {
      title: '3. Ajouter les plateformes natives Android et iOS',
      command: 'npx cap add android\nnpx cap add ios',
      desc: 'Crée les dossiers /android (projet Gradle) et /ios (projet Xcode natif).',
    },
    {
      title: '4. Synchroniser le code web avec les projets natifs',
      command: 'npx cap sync',
      desc: 'Copie dist/ dans les conteneurs mobiles natifs à chaque mise à jour de votre code.',
    },
    {
      title: '5. Ouvrir dans Android Studio ou Xcode',
      command: '# Pour Android (Google Play) :\nnpx cap open android\n\n# Pour iOS (App Store - nécessite un Mac) :\nnpx cap open ios',
      desc: 'Lance directement les environnements officiels de développement mobile pour compiler et signer.',
    },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 sm:p-6 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-950 text-white p-5 sm:p-6 flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-blue-500/20 border border-blue-400/30 rounded-xl text-blue-400">
              <Smartphone className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-blue-500/30 text-blue-300 border border-blue-400/30">
                  Guide Officiel de Publication
                </span>
                <span className="text-xs text-slate-400">Android & iOS</span>
              </div>
              <h2 className="text-lg sm:text-xl font-bold text-white mt-1">
                Lancer OptiVente Pro sur Google Play & App Store
              </h2>
              <p className="text-xs text-slate-300 mt-0.5">
                Feuille de route complète pour convertir cette application React/Vite en application mobile native certifiée.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="flex border-b border-slate-200 bg-slate-50 px-4 sm:px-6 overflow-x-auto gap-2">
          <button
            onClick={() => setActiveTab('instant')}
            className={`py-3 px-3 text-xs font-bold border-b-2 flex items-center gap-1.5 whitespace-nowrap transition-colors ${
              activeTab === 'instant'
                ? 'border-amber-500 text-amber-700 bg-amber-50/70 rounded-t-lg'
                : 'border-transparent text-slate-700 hover:text-slate-900'
            }`}
          >
            <Zap className="w-4 h-4 text-amber-500 fill-amber-500" />
            ⚡ Lancer Immédiatement
          </button>

          <button
            onClick={() => setActiveTab('overview')}
            className={`py-3 px-3 text-xs font-semibold border-b-2 flex items-center gap-1.5 whitespace-nowrap transition-colors ${
              activeTab === 'overview'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <Layers className="w-4 h-4" />
            Vue d'ensemble
          </button>

          <button
            onClick={() => setActiveTab('capacitor')}
            className={`py-3 px-3 text-xs font-semibold border-b-2 flex items-center gap-1.5 whitespace-nowrap transition-colors ${
              activeTab === 'capacitor'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <Terminal className="w-4 h-4" />
            1. Capacitor (Configuration)
          </button>

          <button
            onClick={() => setActiveTab('googleplay')}
            className={`py-3 px-3 text-xs font-semibold border-b-2 flex items-center gap-1.5 whitespace-nowrap transition-colors ${
              activeTab === 'googleplay'
                ? 'border-emerald-600 text-emerald-600'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
            2. Google Play Store (Android)
          </button>

          <button
            onClick={() => setActiveTab('appstore')}
            className={`py-3 px-3 text-xs font-semibold border-b-2 flex items-center gap-1.5 whitespace-nowrap transition-colors ${
              activeTab === 'appstore'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-indigo-500"></span>
            3. Apple App Store (iOS)
          </button>

          <button
            onClick={() => setActiveTab('checklist')}
            className={`py-3 px-3 text-xs font-semibold border-b-2 flex items-center gap-1.5 whitespace-nowrap transition-colors ${
              activeTab === 'checklist'
                ? 'border-purple-600 text-purple-600'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <CheckCircle2 className="w-4 h-4" />
            Requis & Checklist
          </button>
        </div>

        {/* Modal Body Content */}
        <div className="p-6 overflow-y-auto space-y-6 text-slate-800 text-xs sm:text-sm">
          {/* TAB: INSTANT LAUNCH */}
          {activeTab === 'instant' && (
            <div className="space-y-6">
              {/* Option 1: Launch right now via link/PWA */}
              <div className="p-5 bg-gradient-to-br from-amber-500/10 via-amber-50/50 to-orange-500/10 border-2 border-amber-300 rounded-2xl space-y-4 shadow-xs">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <span className="p-2.5 bg-amber-500 text-white rounded-xl shadow-xs">
                      <Zap className="w-5 h-5 fill-white" />
                    </span>
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-amber-700 bg-amber-100 px-2 py-0.5 rounded-full border border-amber-200">
                        Disponibilité Immédiate (0 seconde)
                      </span>
                      <h3 className="font-bold text-base text-slate-900 mt-0.5">
                        1. Ouvrir & Installer sur votre smartphone dès maintenant
                      </h3>
                    </div>
                  </div>
                </div>

                <p className="text-xs text-slate-700 leading-relaxed">
                  Votre application est <strong>déjà déployée en ligne</strong>. Vous et vos commerciaux pouvez l'utiliser directement sur n'importe quel iPhone ou smartphone Android, sans attendre les délais de validation d'Apple ou de Google !
                </p>

                {/* Share Link box */}
                <div className="p-3 bg-white border border-amber-200 rounded-xl space-y-2">
                  <span className="text-[11px] font-bold text-slate-600 block">Lien officiel unique de l'application :</span>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      readOnly
                      value="https://gestion-de-ventanakayit.netlify.app/"
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs font-mono text-slate-700 select-all focus:outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        navigator.clipboard.writeText('https://gestion-de-ventanakayit.netlify.app/');
                        setCopiedUrl(true);
                        setTimeout(() => setCopiedUrl(false), 2000);
                      }}
                      className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-semibold whitespace-nowrap flex items-center gap-1.5 transition-colors shadow-xs shrink-0 cursor-pointer"
                    >
                      {copiedUrl ? (
                        <>
                          <Check className="w-4 h-4" />
                          <span>Copié !</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-4 h-4" />
                          <span>Copier</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>

                {/* How to add to home screen */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                  <div className="p-3 bg-white/90 border border-slate-200 rounded-xl space-y-1.5">
                    <div className="flex items-center gap-1.5 font-bold text-xs text-slate-900">
                      <span>🍏 Sur iPhone (Safari)</span>
                    </div>
                    <ol className="list-decimal pl-4 space-y-1 text-[11px] text-slate-600">
                      <li>Ouvrez le lien ci-dessus dans <strong>Safari</strong>.</li>
                      <li>Appuyez sur le bouton <strong>Partager</strong> (icône avec la flèche vers le haut).</li>
                      <li>Faites défiler vers le bas et touchez <strong>« Sur l'écran d'accueil »</strong>.</li>
                      <li>L'icône OptiVente Pro s'affiche et s'ouvre comme une vraie application sans barre d'adresse !</li>
                    </ol>
                  </div>

                  <div className="p-3 bg-white/90 border border-slate-200 rounded-xl space-y-1.5">
                    <div className="flex items-center gap-1.5 font-bold text-xs text-slate-900">
                      <span>🤖 Sur Android (Chrome)</span>
                    </div>
                    <ol className="list-decimal pl-4 space-y-1 text-[11px] text-slate-600">
                      <li>Ouvrez le lien ci-dessus dans <strong>Google Chrome</strong>.</li>
                      <li>Appuyez sur les <strong>3 petits points verticaux</strong> en haut à droite.</li>
                      <li>Appuyez sur <strong>« Installer l'application »</strong> ou « Ajouter à l'écran d'accueil ».</li>
                      <li>L'application s'installe directement parmi vos applications natives.</li>
                    </ol>
                  </div>
                </div>
              </div>

              {/* Option 2: Deploy to Play Store & App Store */}
              <div className="p-5 bg-white border border-slate-200 rounded-2xl space-y-4 shadow-xs">
                <div className="flex items-center gap-2.5">
                  <span className="p-2.5 bg-blue-600 text-white rounded-xl shadow-xs">
                    <Smartphone className="w-5 h-5" />
                  </span>
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-blue-700 bg-blue-100 px-2 py-0.5 rounded-full border border-blue-200">
                      Processus Stores Officiels
                    </span>
                    <h3 className="font-bold text-base text-slate-900 mt-0.5">
                      2. Les 3 étapes pour lancer la publication Stores
                    </h3>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-1.5">
                    <span className="w-5 h-5 rounded-full bg-blue-600 text-white font-bold text-xs flex items-center justify-center">1</span>
                    <h4 className="font-bold text-xs text-slate-900">Télécharger le code</h4>
                    <p className="text-[11px] text-slate-600">
                      Récupérez les fichiers sources de votre application sur votre ordinateur (via Git ou export de l'espace AI Studio).
                    </p>
                  </div>

                  <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-1.5">
                    <span className="w-5 h-5 rounded-full bg-blue-600 text-white font-bold text-xs flex items-center justify-center">2</span>
                    <h4 className="font-bold text-xs text-slate-900">Exécuter Capacitor</h4>
                    <p className="text-[11px] text-slate-600">
                      Dans votre terminal, lancez <code className="bg-slate-200 px-1 py-0.5 rounded text-[10px]">npx cap add android</code> ou <code className="bg-slate-200 px-1 py-0.5 rounded text-[10px]">npx cap add ios</code> (onglet 1 ci-dessus).
                    </p>
                  </div>

                  <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-1.5">
                    <span className="w-5 h-5 rounded-full bg-blue-600 text-white font-bold text-xs flex items-center justify-center">3</span>
                    <h4 className="font-bold text-xs text-slate-900">Créer vos comptes</h4>
                    <p className="text-[11px] text-slate-600">
                      Ouvrez votre compte sur <a href="https://play.google.com/console" target="_blank" rel="noreferrer" className="text-blue-600 underline font-semibold">Google Play Console</a> (25$) et <a href="https://developer.apple.com" target="_blank" rel="noreferrer" className="text-blue-600 underline font-semibold">Apple Developer</a> (99$).
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB: OVERVIEW */}
          {activeTab === 'overview' && (
            <div className="space-y-6">
              <div className="p-4 bg-blue-50 border border-blue-200 rounded-xl text-blue-900 flex items-start gap-3">
                <Info className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-bold text-sm text-blue-950">
                    Comment transformer ce projet React en application mobile ?
                  </h4>
                  <p className="text-xs text-blue-800 mt-1 leading-relaxed">
                    Votre application OptiVente Pro est codée en <strong>React, Vite et Tailwind CSS</strong>. 
                    Pour la distribuer sur l'<strong>App Store</strong> (iPhone/iPad) et le <strong>Google Play Store</strong> (smartphones et tablettes Android), le standard moderne de l'industrie consiste à utiliser <strong>Capacitor (par Ionic)</strong>.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
                  <div className="flex items-center gap-2">
                    <span className="p-2 bg-emerald-100 text-emerald-800 rounded-lg font-bold text-xs">
                      🤖 Android
                    </span>
                    <h4 className="font-bold text-slate-900">Google Play Store</h4>
                  </div>
                  <ul className="space-y-2 text-xs text-slate-600">
                    <li className="flex items-start gap-2">
                      <ChevronRight className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                      <span><strong>Format de fichier :</strong> Android App Bundle (<code>.aab</code>)</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <ChevronRight className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                      <span><strong>Frais de compte :</strong> 25 $ (paiement unique à vie)</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <ChevronRight className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                      <span><strong>Outil requis :</strong> Android Studio (gratuit sur Windows, Mac ou Linux)</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <ChevronRight className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                      <span><strong>Test obligatoire :</strong> 14 testeurs pendant 14 jours (pour les nouveaux comptes individuels)</span>
                    </li>
                  </ul>
                </div>

                <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
                  <div className="flex items-center gap-2">
                    <span className="p-2 bg-indigo-100 text-indigo-800 rounded-lg font-bold text-xs">
                      🍏 iOS
                    </span>
                    <h4 className="font-bold text-slate-900">Apple App Store</h4>
                  </div>
                  <ul className="space-y-2 text-xs text-slate-600">
                    <li className="flex items-start gap-2">
                      <ChevronRight className="w-3.5 h-3.5 text-indigo-600 shrink-0 mt-0.5" />
                      <span><strong>Format de fichier :</strong> Archive Xcode (<code>.ipa</code>)</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <ChevronRight className="w-3.5 h-3.5 text-indigo-600 shrink-0 mt-0.5" />
                      <span><strong>Frais de compte :</strong> 99 $ / an (Apple Developer Program)</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <ChevronRight className="w-3.5 h-3.5 text-indigo-600 shrink-0 mt-0.5" />
                      <span><strong>Matériel obligatoire :</strong> Un ordinateur Mac avec <strong>Xcode</strong></span>
                    </li>
                    <li className="flex items-start gap-2">
                      <ChevronRight className="w-3.5 h-3.5 text-indigo-600 shrink-0 mt-0.5" />
                      <span><strong>Test beta :</strong> TestFlight (immédiat pour vos équipes de commerciaux et livreurs)</span>
                    </li>
                  </ul>
                </div>
              </div>

              <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl text-amber-900 flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                <div className="text-xs space-y-1">
                  <h5 className="font-bold">Particularité du secteur Boissons & Alcool :</h5>
                  <p>
                    Comme OptiVente Pro gère la distribution de bières, vins et spiritueux, lors du questionnaire de classification du contenu (PEGI / IARC) sur Google Play et l'App Store, précisez bien qu'il s'agit d'une <strong>application professionnelle de gestion de stocks B2B (CHR, grossistes, cavistes)</strong> et non d'une incitation à la consommation pour mineurs. Cela garantit une validation fluide sans blocage.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* TAB: CAPACITOR COMMANDS */}
          {activeTab === 'capacitor' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                <p className="text-xs text-slate-600">
                  Exécutez ces commandes dans le terminal de votre projet pour générer vos projets natifs :
                </p>
                <span className="text-[11px] font-mono bg-slate-100 px-2 py-0.5 rounded text-slate-700">
                  Fichier prêt : capacitor.config.ts
                </span>
              </div>

              <div className="space-y-3">
                {capacitorCommands.map((item, index) => (
                  <div key={index} className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                    <div className="flex items-center justify-between">
                      <h5 className="font-bold text-xs text-slate-900">{item.title}</h5>
                      <button
                        onClick={() => copyToClipboard(item.command, index)}
                        className="px-2.5 py-1 text-[11px] bg-white border border-slate-300 hover:bg-slate-100 rounded-md flex items-center gap-1 transition-colors text-slate-700"
                      >
                        {copiedIndex === index ? (
                          <>
                            <Check className="w-3.5 h-3.5 text-emerald-600" />
                            <span className="text-emerald-700 font-semibold">Copié !</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3.5 h-3.5 text-slate-500" />
                            <span>Copier</span>
                          </>
                        )}
                      </button>
                    </div>
                    <pre className="p-2.5 bg-slate-900 text-slate-100 rounded-lg font-mono text-[11px] overflow-x-auto">
                      <code>{item.command}</code>
                    </pre>
                    <p className="text-[11px] text-slate-500">{item.desc}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB: GOOGLE PLAY */}
          {activeTab === 'googleplay' && (
            <div className="space-y-4">
              <h4 className="font-bold text-sm text-slate-900">
                Guide pas-à-pas : Publication sur le Google Play Store
              </h4>

              <div className="space-y-3 text-xs">
                <div className="p-4 bg-white border border-slate-200 rounded-xl shadow-xs space-y-2">
                  <div className="flex items-center gap-2 font-bold text-emerald-800">
                    <span className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center text-xs">1</span>
                    Créer un compte Google Play Console
                  </div>
                  <p className="text-slate-600">
                    Rendez-vous sur <a href="https://play.google.com/console" target="_blank" rel="noreferrer" className="text-blue-600 underline font-semibold">play.google.com/console</a>. 
                    Réglez les frais d'inscription uniques de 25 $ et complétez les informations de votre entreprise de distribution.
                  </p>
                </div>

                <div className="p-4 bg-white border border-slate-200 rounded-xl shadow-xs space-y-2">
                  <div className="flex items-center gap-2 font-bold text-emerald-800">
                    <span className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center text-xs">2</span>
                    Générer la clé de signature (Release Keystore)
                  </div>
                  <p className="text-slate-600">
                    Dans votre terminal, générez la clé cryptographique pour signer vos mises à jour :
                  </p>
                  <pre className="p-2 bg-slate-900 text-slate-100 rounded text-[11px] font-mono overflow-x-auto">
                    <code>keytool -genkey -v -keystore optivente-release-key.jks -keyalg RSA -keysize 2048 -validity 10000 -alias optivente</code>
                  </pre>
                  <p className="text-[11px] text-amber-700 font-medium">
                    ⚠️ Conservez précieusement ce fichier <code>.jks</code> et son mot de passe.
                  </p>
                </div>

                <div className="p-4 bg-white border border-slate-200 rounded-xl shadow-xs space-y-2">
                  <div className="flex items-center gap-2 font-bold text-emerald-800">
                    <span className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center text-xs">3</span>
                    Compiler l'Android App Bundle (.aab)
                  </div>
                  <p className="text-slate-600">
                    Ouvrez le dossier <code>/android</code> dans <strong>Android Studio</strong> :<br />
                    Allez dans le menu <strong>Build &gt; Generate Signed Bundle / APK &gt; Android App Bundle</strong>, sélectionnez votre fichier keystore et validez. Le fichier <code>app-release.aab</code> est produit.
                  </p>
                </div>

                <div className="p-4 bg-white border border-slate-200 rounded-xl shadow-xs space-y-2">
                  <div className="flex items-center gap-2 font-bold text-emerald-800">
                    <span className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center text-xs">4</span>
                    Compléter la fiche du Play Store
                  </div>
                  <ul className="list-disc pl-5 space-y-1 text-slate-600">
                    <li><strong>Titre :</strong> OptiVente Pro - Ventes & Boissons</li>
                    <li><strong>Description courte & longue :</strong> Détaillez la gestion des commandes CHR, fûts consignés, caisses de bouteilles et stocks.</li>
                    <li><strong>Icône :</strong> 512×512 px au format PNG transparent ou opaque.</li>
                    <li><strong>Bannière graphique :</strong> 1024×500 px.</li>
                    <li><strong>Captures d'écran :</strong> Minimum 2 captures d'écran téléphone et 2 pour tablette (mode portrait/paysage).</li>
                    <li><strong>URL de Politique de Confidentialité :</strong> Obligatoire pour la collecte de données.</li>
                  </ul>
                </div>

                <div className="p-4 bg-white border border-slate-200 rounded-xl shadow-xs space-y-2">
                  <div className="flex items-center gap-2 font-bold text-emerald-800">
                    <span className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center text-xs">5</span>
                    Test fermé & Déploiement en Production
                  </div>
                  <p className="text-slate-600">
                    Téléversez le fichier <code>.aab</code> dans l'onglet <strong>Test fermé (Closed Testing)</strong>. Invitez vos commerciaux ou collègues. Une fois validé, cliquez sur <strong>Promouvoir en Production</strong> pour rendre l'application disponible publiquement sur le Play Store !
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* TAB: APPLE APP STORE */}
          {activeTab === 'appstore' && (
            <div className="space-y-4">
              <h4 className="font-bold text-sm text-slate-900">
                Guide pas-à-pas : Publication sur l'Apple App Store
              </h4>

              <div className="space-y-3 text-xs">
                <div className="p-4 bg-white border border-slate-200 rounded-xl shadow-xs space-y-2">
                  <div className="flex items-center gap-2 font-bold text-indigo-800">
                    <span className="w-5 h-5 rounded-full bg-indigo-100 text-indigo-800 flex items-center justify-center text-xs">1</span>
                    Adhérer à l'Apple Developer Program
                  </div>
                  <p className="text-slate-600">
                    Inscrivez votre entreprise ou vous-même sur <a href="https://developer.apple.com" target="_blank" rel="noreferrer" className="text-blue-600 underline font-semibold">developer.apple.com</a> (abonnement annuel de 99 $). Pour une société, munissez-vous de votre numéro DUNS.
                  </p>
                </div>

                <div className="p-4 bg-white border border-slate-200 rounded-xl shadow-xs space-y-2">
                  <div className="flex items-center gap-2 font-bold text-indigo-800">
                    <span className="w-5 h-5 rounded-full bg-indigo-100 text-indigo-800 flex items-center justify-center text-xs">2</span>
                    Ouvrir et configurer dans Xcode sur Mac
                  </div>
                  <p className="text-slate-600">
                    Lancez la commande <code>npx cap open ios</code> sur votre Mac. Dans Xcode :
                  </p>
                  <ul className="list-disc pl-5 space-y-1 text-slate-600">
                    <li>Allez dans l'onglet <strong>Signing & Capabilities</strong>.</li>
                    <li>Cochez <strong>Automatically manage signing</strong> et sélectionnez votre compte Apple Developer Team.</li>
                    <li>Vérifiez le Bundle Identifier : <code>com.optivente.pro</code>.</li>
                  </ul>
                </div>

                <div className="p-4 bg-white border border-slate-200 rounded-xl shadow-xs space-y-2">
                  <div className="flex items-center gap-2 font-bold text-indigo-800">
                    <span className="w-5 h-5 rounded-full bg-indigo-100 text-indigo-800 flex items-center justify-center text-xs">3</span>
                    Créer l'application sur App Store Connect
                  </div>
                  <p className="text-slate-600">
                    Sur <a href="https://appstoreconnect.apple.com" target="_blank" rel="noreferrer" className="text-blue-600 underline font-semibold">appstoreconnect.apple.com</a>, cliquez sur <strong>+ Nouvelle app</strong> :
                  </p>
                  <ul className="list-disc pl-5 space-y-1 text-slate-600">
                    <li>Sélectionnez <strong>iOS</strong>, renseignez le nom "OptiVente Pro" et votre ID de lot.</li>
                    <li>Catégories : <strong>Productivité</strong> / <strong>Commerce</strong>.</li>
                    <li>Fournissez l'URL de votre politique de confidentialité.</li>
                  </ul>
                </div>

                <div className="p-4 bg-white border border-slate-200 rounded-xl shadow-xs space-y-2">
                  <div className="flex items-center gap-2 font-bold text-indigo-800">
                    <span className="w-5 h-5 rounded-full bg-indigo-100 text-indigo-800 flex items-center justify-center text-xs">4</span>
                    Compiler et archiver vers TestFlight
                  </div>
                  <p className="text-slate-600">
                    Dans Xcode, sélectionnez le périphérique <strong>Any iOS Device (arm64)</strong>, puis allez dans le menu supérieur : <strong>Product &gt; Archive</strong>.<br />
                    Une fois l'archive terminée, cliquez sur <strong>Distribute App &gt; App Store Connect &gt; Upload</strong>. Votre version arrive automatiquement sur TestFlight pour vos tests internes et externes.
                  </p>
                </div>

                <div className="p-4 bg-white border border-slate-200 rounded-xl shadow-xs space-y-2">
                  <div className="flex items-center gap-2 font-bold text-indigo-800">
                    <span className="w-5 h-5 rounded-full bg-indigo-100 text-indigo-800 flex items-center justify-center text-xs">5</span>
                    Validation par l'équipe Apple (App Review)
                  </div>
                  <p className="text-slate-600">
                    Dans App Store Connect, associez le build uploadé, téléversez les captures d'écran iPhone (6.7" et 6.5") et fournissez un identifiant de test dans les notes de révision. Cliquez sur <strong>Soumettre pour vérification</strong>. Le délai d'examen est généralement de 24 à 48 heures.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* TAB: CHECKLIST */}
          {activeTab === 'checklist' && (
            <div className="space-y-4">
              <h4 className="font-bold text-sm text-slate-900">
                Checklist des éléments indispensables avant soumission
              </h4>

              <div className="space-y-2.5">
                {[
                  {
                    title: 'Politique de confidentialité (Privacy Policy) en ligne',
                    desc: 'Obligatoire par Apple et Google. Elle doit préciser le stockage local des données de ventes, factures et clients.',
                    status: 'Requis',
                  },
                  {
                    title: 'Icône d\'application haute résolution',
                    desc: 'Format 1024×1024 px PNG (sans transparence pour Apple App Store, 512×512 pour Google Play).',
                    status: 'Requis',
                  },
                  {
                    title: 'Captures d\'écran des écrans clés',
                    desc: 'Tableau de bord, gestion du stock de fûts/bouteilles, prise de commande CHR et historique des factures.',
                    status: 'Requis',
                  },
                  {
                    title: 'Identifiant de démonstration pour les réviseurs Apple/Google',
                    desc: 'Prévoyez un accès direct sans blocage d\'authentification pour que les testeurs puissent vérifier toutes les fonctions.',
                    status: 'Recommandé',
                  },
                  {
                    title: 'Test hors-ligne (Offline Capability)',
                    desc: 'L\'application doit continuer de fonctionner et afficher les données même en cas de coupure réseau dans un entrepôt ou un bar en sous-sol.',
                    status: 'Déjà géré (localStorage)',
                  },
                ].map((item, i) => (
                  <div key={i} className="p-3 bg-white border border-slate-200 rounded-xl flex items-start justify-between gap-3 shadow-xs">
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                        <span className="font-semibold text-xs text-slate-900">{item.title}</span>
                      </div>
                      <p className="text-[11px] text-slate-500 pl-6">{item.desc}</p>
                    </div>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 whitespace-nowrap">
                      {item.status}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="bg-slate-50 border-t border-slate-200 p-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <Key className="w-4 h-4 text-slate-400" />
            <span>ID d'application configuré : <strong className="font-mono text-slate-700">com.optivente.pro</strong></span>
          </div>
          <button
            onClick={onClose}
            className="w-full sm:w-auto px-5 py-2 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-xl shadow-xs transition-colors"
          >
            Fermer le guide
          </button>
        </div>
      </div>
    </div>
  );
};
