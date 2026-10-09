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

Node.js 22 ou plus récent est requis.

## API utilitaire

La fonction `api` disponible dans `src/api.js` accepte une option `timeout` (en millisecondes, 10 000 par défaut) pour annuler automatiquement les requêtes trop longues.

## Rôles et permissions

Tous les rôles peuvent consulter le catalogue des autres structures. Le comportement de l'application dépend du rôle de l'utilisateur :

| Rôle                     | Permissions principales                                                                                                            |
| ------------------------ | ---------------------------------------------------------------------------------------------------------------------------------- |
| Administrateur           | accès complet aux équipements et aux prêts                                                                                         |
| Régisseur(se) Général(e) | gère tous les équipements et prêts de sa structure                                                                                 |
| Régisseur(se) Son        | gère les équipements et prêts de Son ainsi que Vidéo et Autre                                                                      |
| Régisseur(se) Lumière    | gère les équipements et prêts de Lumière ainsi que Vidéo et Autre                                                                  |
| Régisseur(se) Plateau    | gère les équipements et prêts de Plateau ainsi que Vidéo et Autre                                                                  |
| Autre                    | consulte le catalogue, accepte ou refuse les demandes entrantes et peut uniquement créer, modifier ou annuler ses propres demandes |

Les prêts peuvent être sortants (emprunter) ou entrants (prêter). Chaque rôle peut créer ses propres demandes et valider celles adressées à sa structure selon son périmètre.
