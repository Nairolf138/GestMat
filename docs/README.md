# Documentation

## Architecture

GestMat S&C repose sur deux applications distinctes :

- **Backend** – API REST Express (TypeScript) et MongoDB. Elle gère l’authentification JWT, les rôles, les prêts, l’inventaire, les notifications et les tâches planifiées (rappels, archivage, rapports annuels).
- **Frontend** – Application React/Vite qui consomme l’API et propose une interface pour gérer les équipements et les demandes.

Les deux services communiquent en HTTP ; par défaut l’API écoute sur le port `5000` et le frontend sur `3000`.

## Flux fonctionnels

1. Une structure ajoute ou met à jour son matériel (nom, type, localisation, quantités totale et disponible).
2. Un·e régisseur·se sélectionne des équipements et crée une demande de prêt vers une autre structure.
3. Tant que la date de début n’est pas passée, l’emprunteur peut modifier ou annuler sa demande. Les demandes en attente ou programmées restent supprimables par l’emprunteur.
4. La structure propriétaire (ou un administrateur) accepte ou refuse la demande.
5. En cas d’acceptation, les quantités disponibles sont ajustées ; un refus rétablit les stocks initiaux.
6. Des notifications e‑mail peuvent être envoyées si `SMTP_URL` est configuré. Si `NOTIFY_EMAIL` est renseigné, il devient l’expéditeur et le destinataire par défaut ; sinon le système utilise `no-reply@<hôte SMTP>`.

## Rôles

Tous les rôles peuvent consulter le catalogue des autres structures. Le rôle *Autre* peut accepter ou refuser les demandes adressées à sa structure, mais il ne peut créer, modifier ou annuler que ses propres demandes. L'ajout ou la modification d'équipements est limitée selon le rôle :

| Rôle | Types d’équipement modifiables |
| --- | --- |
| Administrateur | tous |
| Régisseur(se) Général(e) | tous |
| Régisseur(se) Son | Son, Vidéo, Autre |
| Régisseur(se) Lumière | Lumière, Vidéo, Autre |
| Régisseur(se) Plateau | Plateau, Vidéo, Autre |
| Autre | aucun |

### Permissions de prêt

| Rôle | Prêts sortants | Prêts entrants |
| --- | --- | --- |
| Administrateur | créer, modifier et annuler toutes les demandes | accepter ou refuser toutes les demandes |
| Régisseur(se) Général(e) | gérer toutes les demandes pour sa structure | accepter ou refuser les demandes pour sa structure |
| Régisseur(se) Son | créer et annuler des demandes pour les équipements Son, Vidéo et Autre | accepter ou refuser des demandes concernant ces équipements |
| Régisseur(se) Lumière | créer et annuler des demandes pour les équipements Lumière, Vidéo et Autre | accepter ou refuser des demandes concernant ces équipements |
| Régisseur(se) Plateau | créer et annuler des demandes pour les équipements Plateau, Vidéo et Autre | accepter ou refuser des demandes concernant ces équipements |
| Autre | créer, modifier et annuler ses propres demandes | accepter ou refuser les demandes pour sa structure |

### Permissions véhicules

Les véhicules sont soumis à des autorisations plus fines :

- **Création** : Administrateur et régisseurs (général, son, lumière, plateau) peuvent créer des véhicules, quel que soit le type d’usage (transport **technique** ou **logistique**).
- **Mise à jour** : mêmes rôles, mais l’opération est limitée aux véhicules rattachés à leur structure lorsque le champ `structure` est renseigné.
- **Affectation** (réservation/attribution) : Administrateur et Régisseur·se Général·e peuvent affecter un véhicule, uniquement si son usage correspond à ceux autorisés (technique/logistique) et si la structure ciblée correspond à leur propre structure.
- **Archivage** : Administrateur et Régisseur·se Général·e peuvent archiver/supprimer un véhicule de leur structure.

Les middlewares d’accès contrôlent désormais le rôle **et** le contexte (structure cible ou type d’usage) lorsqu’ils sont fournis dans la requête (`structure`, `usage` ou `type`).

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
