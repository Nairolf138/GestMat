# GestMat

GestMat est une solution de partage et de gestion de matériel de scène destinée aux structures culturelles. Elle centralise l’inventaire, les demandes de prêt et les notifications afin de fluidifier la circulation du matériel entre théâtres.

## Fonctionnalités clés

- Catalogue d’équipements avec recherche par nom, type et localisation.
- Gestion des prêts (création, modification, annulation, acceptation/refus) avec ajustement automatique des quantités disponibles.
- Notifications e‑mail optionnelles si `SMTP_URL` est configuré ; `NOTIFY_EMAIL` permet de définir l’expéditeur et le destinataire par défaut.
- Statistiques agrégées (état des prêts, tendances mensuelles, matériels les plus sollicités) exposées via l’API.
- Interface bilingue (français/anglais) alimentée par `react-i18next` et extensible via `frontend/src/locales`.

## Architecture

- `backend` – API Express/MongoDB (TypeScript) avec authentification JWT, rôles et tâches planifiées (rappels, archivage, rapports annuels).
- `frontend` – Application React/Vite consommant l’API et proposant une interface de saisie et de suivi.

La documentation détaillée est disponible dans [`docs/README.md`](docs/README.md) et les évolutions prévues dans [`docs/ROADMAP.md`](docs/ROADMAP.md).

## Prérequis

- **Node.js 22** ou plus récent (backend et frontend s’appuient sur des fonctionnalités modernes).
- Une instance MongoDB locale ou distante (voir section Atlas ci‑dessous).

## Mise en route rapide

1. **Configurer les variables d’environnement** :
   - Copier `backend/.env.example` vers `backend/.env` et renseigner au minimum `JWT_SECRET`.
   - Copier `frontend/.env.example` vers `frontend/.env` et ajuster `VITE_API_URL` si besoin.
   - Pour les notifications e‑mail, définir `SMTP_URL` et éventuellement `NOTIFY_EMAIL`.
2. **Installer et lancer le backend** :
   ```bash
   cd backend
   npm install
   npm start
   ```
3. **Installer et lancer le frontend** (dans un autre terminal) :
   ```bash
   cd frontend
   npm install
   npm run dev
   ```
4. Accéder à l’interface sur [http://localhost:3000](http://localhost:3000) ; l’API écoute par défaut sur le port `5000`.

### Construction des livrables

- API : `cd backend && npm run build`
- Frontend : `cd frontend && npm run build`

### Utilisation de MongoDB Atlas

1. Créer un cluster et un utilisateur, puis autoriser votre IP dans **Network Access**.
2. Copier l’URI fournie en ajoutant le nom de base souhaité (ex. `gestmat`).
3. Renseigner l’URI dans `backend/.env` :
   ```bash
   MONGODB_URI=mongodb+srv://<user>:<password>@cluster0.example.mongodb.net/gestmat
   ```
4. Tester la connexion avec `mongosh` avant de démarrer l’application.

## Tests et qualité

- Tests backend :
  ```bash
  cd backend
  npm test
  ```
- Tests frontend (Vitest) :
  ```bash
  cd frontend
  npm test
  ```
- Lint global (racine) :
  ```bash
  npm run lint
  ```

## Documentation complémentaire

- Rôles, processus de prêt et organisation : [`docs/README.md`](docs/README.md)
- Planning des évolutions : [`docs/ROADMAP.md`](docs/ROADMAP.md)
- Guide de style CSS : [`docs/STYLE_GUIDE.md`](docs/STYLE_GUIDE.md)

## Monitoring

Le backend expose des métriques Prometheus sur `/metrics` (activées via `prom-client`) pour intégration dans Prometheus/Grafana.

## Internationalisation

Le frontend utilise `react-i18next` avec les ressources situées dans `frontend/src/locales`. Ajoutez vos traductions en suivant la structure existante pour prendre en charge de nouvelles langues.
