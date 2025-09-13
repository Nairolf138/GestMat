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

Le comportement de l'application dépend du rôle de l'utilisateur :

| Rôle | Permissions principales |
| --- | --- |
| Administrateur | accès complet aux équipements et aux prêts |
| Regisseur General | gère tous les équipements et prêts de sa structure |
| Regisseur Son / Lumiere / Plateau | gère les équipements et prêts de son domaine (Son, Lumière ou Plateau) ainsi que Vidéo et Autre |
| Autre | consultation uniquement de l'inventaire local |

Les prêts peuvent être sortants (emprunter) ou entrants (prêter). Seuls les rôles listés ci‑dessus, à l'exception de `Autre`, peuvent créer ou valider des demandes.
