# Documentation

## Architecture

GestMat S&C est composé de deux applications distinctes :

- **Backend** – API REST construite avec [Express](https://expressjs.com/) et une base de données MongoDB. Elle gère l’authentification, les rôles des utilisateurs, les prêts et l’inventaire.
- **Frontend** – Application [React](https://react.dev/) construite avec [Vite](https://vitejs.dev/). Elle consomme l’API et propose une interface de gestion des équipements et des demandes de prêt.

Les deux services communiquent via HTTP ; par défaut l’API écoute sur le port `5000` et le frontend sur `3000`.

## Rôles

Tous les rôles peuvent consulter l'ensemble du catalogue. En revanche, l'ajout ou la modification d'équipements est limitée selon le rôle :

| Rôle | Types d’équipement modifiables |
| --- | --- |
| Administrateur | tous |
| Régisseur(se) Général(e) | tous |
| Régisseur(se) Son | Son, Vidéo, Autre |
| Régisseur(se) Lumière | Lumière, Vidéo, Autre |
| Régisseur(se) Plateau | Plateau, Vidéo, Autre |
| Autre | tous |

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
