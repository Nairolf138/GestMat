# Documentation

## Architecture

GestMat S&C est composé de deux applications distinctes :

- **Backend** – API REST construite avec [Express](https://expressjs.com/) et une base de données MongoDB. Elle gère l’authentification, les rôles des utilisateurs, les prêts et l’inventaire.
- **Frontend** – Application [React](https://react.dev/) construite avec [Vite](https://vitejs.dev/). Elle consomme l’API et propose une interface de gestion des équipements et des demandes de prêt.

Les deux services communiquent via HTTP ; par défaut l’API écoute sur le port `5000` et le frontend sur `3000`.

## Rôles

Tous les rôles, sauf *Autre*, peuvent consulter l'ensemble du catalogue. Le rôle *Autre* ne peut consulter que l'inventaire de sa propre structure. L'ajout ou la modification d'équipements est limitée selon le rôle :

| Rôle | Types d’équipement modifiables |
| --- | --- |
| Administrateur | tous |
| Regisseur General | tous |
| Regisseur Son | Son, Vidéo, Autre |
| Regisseur Lumiere | Lumière, Vidéo, Autre |
| Regisseur Plateau | Plateau, Vidéo, Autre |
| Autre | aucun |

### Permissions de prêt

| Rôle | Prêts sortants | Prêts entrants |
| --- | --- | --- |
| Administrateur | créer, modifier et annuler toutes les demandes | accepter ou refuser toutes les demandes |
| Regisseur General | gérer toutes les demandes pour sa structure | accepter ou refuser les demandes pour sa structure |
| Regisseur Son | créer et annuler des demandes pour les équipements Son, Vidéo et Autre | accepter ou refuser des demandes concernant ces équipements |
| Regisseur Lumiere | créer et annuler des demandes pour les équipements Lumière, Vidéo et Autre | accepter ou refuser des demandes concernant ces équipements |
| Regisseur Plateau | créer et annuler des demandes pour les équipements Plateau, Vidéo et Autre | accepter ou refuser des demandes concernant ces équipements |
| Autre | créer et annuler ses propres demandes | accepter ou refuser les demandes pour sa structure |

## Processus de prêt

1. Un·e régisseur·se sélectionne des équipements et soumet une demande de prêt à une autre structure.
2. L’emprunteur peut modifier ou annuler sa demande tant que la date de début n’est pas passée. Les demandes en attente ou programmées peuvent également être supprimées par l’emprunteur.
3. La structure propriétaire (ou un administrateur) accepte ou refuse la demande.
4. Lorsqu’une demande est acceptée, les quantités disponibles sont ajustées. Un refus rétablit les quantités initiales.
5. Des notifications e‑mail peuvent être envoyées si `SMTP_URL` et `NOTIFY_EMAIL` sont configurés.

## Installation et lancement

Assurez-vous d’utiliser Node.js 22 ou plus récent pour exécuter le backend et le frontend.

Les instructions détaillées se trouvent dans les fichiers README de chaque sous-projet :

- [backend/README.md](../backend/README.md)
- [frontend/README.md](../frontend/README.md)
- [STYLE_GUIDE.md](STYLE_GUIDE.md)
