# Documentation

## Architecture

GestMat S&C repose sur deux applications distinctes :

- **Backend** – API REST Express (TypeScript) et MongoDB. Elle gère l’authentification JWT, les rôles, les prêts, l’inventaire, les notifications et les tâches planifiées (rappels, archivage, rapports annuels).
- **Frontend** – Application React/Vite qui consomme l’API et propose une interface pour gérer les équipements et les demandes.

Les deux services communiquent en HTTP ; par défaut l’API écoute sur le port `5000` et le frontend sur `3000`.

## Règles fonctionnelles

Voir [Rôles, décisions et notifications](ROLES_NOTIFICATIONS.md) pour les domaines autorisés, les décisions par ligne, les préférences, le suivi selon le poste actuel et les gestionnaires de véhicules.

Voir [Mise en service et retour arrière](DEPLOYMENT_ROLLBACK.md) avant de déployer sur Docker Compose avec MongoDB Atlas Free.

## Configurations essentielles

- **Environnements** : Node.js 22 minimum pour le frontend et l’API.
- **Backend** : voir la liste détaillée des variables dans [`backend/.env.example`](../backend/.env.example). `JWT_SECRET` est obligatoire. `SMTP_URL` et `NOTIFY_EMAIL` activent les notifications.
- **Frontend** : ajuster `VITE_API_URL` dans [`frontend/.env.example`](../frontend/.env.example) pour pointer vers l’API souhaitée.
- **Seed initial** : des scripts `npm run create-admin`, `npm run create-structures` et `npm run create-roles` (dans `backend`) facilitent la création du premier compte administrateur, des structures et des rôles prédéfinis.

## Maintenance et qualité

- Tests backend : `cd backend && npm test`
- Tests frontend (Vitest) : `cd frontend && npm test`
- Lint global : `npm run lint` à la racine du dépôt.
- Surveiller les métriques exposées par l’API sur `/metrics` et intégrer à Prometheus/Grafana.

## Références complémentaires

- Guide de style CSS : [`STYLE_GUIDE.md`](STYLE_GUIDE.md)
- Planning d’évolution : [`ROADMAP.md`](ROADMAP.md)
