# GestMat S&C Frontend

Application React propulsée par Vite.

## Configuration

1. Copier `.env.example` vers `.env` et ajuster `VITE_API_URL` si nécessaire.
2. Installer les dépendances :
   ```bash
   npm install
   ```
3. Lancer le serveur de développement :
   ```bash
   npm run dev
   ```
4. Construire l’application pour la production :
   ```bash
   npm run build
   ```
5. Exécuter les tests :
   ```bash
   npm test
   ```

Node.js 20 ou plus récent est requis.

## Compatibilité

Les scripts `npm run dev` et `npm run build` chargent `scripts/crypto-hash-polyfill.js` via `NODE_OPTIONS` afin d'ajouter `crypto.hash` lorsque cette fonction n'est pas disponible.
