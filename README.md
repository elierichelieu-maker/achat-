# OptiVente Pro - Distribution de Boissons & Caisse POS

Application complète de gestion commerciale, encaissement de caisse (POS), gestion de stocks multi-boissons, facturation conforme (HTG / USD / DOP) et suivi des vendeurs.

## 🚀 Fonctionnalités Clés

- **Caisse POS & Vente au Comptoir** : Interface rapide avec panier tactile, recherche par code ou nom, gestion des consignes (fûts inox & casiers verre).
- **Facturation & Reçus (A4 & 80mm)** :
  - Génération de factures commerciales A4 conformes (NIF, coordonnées, tableau HT/TVA/TTC).
  - Tickets de caisse 80 mm pour imprimantes thermiques.
  - Export direct en PDF natif (`jsPDF`), impression directe et partage WhatsApp en 1 clic.
  - Configuration de la TVA modulable (0% par défaut, 10%, 20% au choix par facture).
- **Gestion des Stocks & Consignes** :
  - Alertes automatiques de réapprovisionnement et stocks critiques.
  - Traçabilité des mouvements d'entrée/sortie et inventaire fûts consignés.
- **Gestion Multi-Devises (Haïti & Caraïbes)** :
  - Gourdes Haïtiennes (HTG), Dollars US (USD), Pesos Dominicains (DOP).
  - Taux de change BRH configurables et registre des opérations de change.
- **Suivi des Commerciaux & Commissions** :
  - Performance par vendeur, objectifs mensuels, commissions calculées automatiquement.
- **Synchronisation Cloud Firestore en Temps Réel** :
  - Synchronisation instantanée entre téléphones portables et ordinateurs.

---

## 🛠️ Installation & Démarrage Local

```bash
# 1. Cloner le dépôt GitHub
git clone https://github.com/<VOTRE-COMPTE>/optivente-pro.git
cd optivente-pro

# 2. Installer les dépendances
npm install

# 3. Lancer le serveur de développement local
npm run dev

# 4. Ouvrir l'application dans votre navigateur
http://localhost:3000
```

---

## 📦 Commandes de Build & Production

```bash
# Compiler l'application pour la production
npm run build

# Démarrer le serveur de production
npm start

# Vérifier les types TypeScript
npm run lint
```

---

## 🌐 Déploiement Gratuit en 1 Clic (Accessible pour tous)

Pour rendre l'application accessible à tous vos utilisateurs sans restriction :

### Option A : Déploiement sur Vercel (Recommandé)
1. Créez un compte gratuit sur [vercel.com](https://vercel.com).
2. Cliquez sur **"Add New..." > "Project"**.
3. Sélectionnez votre dépôt GitHub **optivente-pro**.
4. Cliquez sur **Deploy**.
5. Vous obtenez immédiatement une URL publique permanente (ex: `https://optivente-pro.vercel.app`) accessible sur tous les téléphones et ordinateurs.

### Option B : Déploiement sur Netlify
1. Connectez-vous sur [netlify.com](https://netlify.com).
2. Cliquez sur **"Add new site" > "Import an existing project"**.
3. Liez votre GitHub et déployez la branche `main`.

---

## 📱 Utilisation Mobile (PWA)
Sur smartphone, ouvrez l'URL dans Safari ou Chrome :
- **iPhone** : Bouton Partager > *« Sur l'écran d'accueil »*.
- **Android** : Menu 3 points > *« Installer l'application »*.
