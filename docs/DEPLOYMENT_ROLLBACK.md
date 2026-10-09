# Mise en service et retour arrière — Docker Compose + Atlas Free

Cette procédure n’a pas été exécutée sur le VPS. Le dépôt ne contient pas le fichier Compose de production. Ses chemins, noms de services, volumes, images et commit déployé doivent être relevés sur le serveur avant toute mise en service. Les exemples ci-dessous utilisent des variables explicites à renseigner ; ils ne doivent pas être collés sans adaptation.

## Ce qu’il faut conserver

1. Le SHA du code réellement déployé (`git rev-parse HEAD`) et toute modification locale (`git status --short`), les versions des outils et les paramètres de construction frontend.
2. Les images réellement exécutées, conservées sous des tags immuables et exportées avec `docker image save`. `git checkout` ne reconstitue pas nécessairement une ancienne image à l’identique.
3. Les fichiers Compose, `.env`, configuration du proxy et fichiers/volumes persistants éventuels, avec permissions restrictives. `docker export` seul ne sauvegarde ni Atlas ni les volumes ni la configuration de Compose.
4. Un dump de la base Atlas complète de GestMat, documents et index, et une copie chiffrée hors VPS. Vérifier sa somme SHA-256 et sa restauration sur une base isolée.

Atlas Free ne fournit pas de Cloud Backup et ne permet pas `mongodump --oplog` ni `mongorestore --oplogReplay`. Les commits GitHub protègent le code ; ils ne protègent pas les utilisateurs, matériels, demandes ou réservations. Sources : [Atlas Free](https://www.mongodb.com/docs/atlas/backup/cloud-backup/overview/), [restrictions des commandes](https://www.mongodb.com/docs/atlas/unsupported-commands/), [mongodump](https://www.mongodb.com/docs/database-tools/mongodump/), [docker image save](https://docs.docker.com/reference/cli/docker/image/save/).

## Avant la bascule

- Restaurer une sauvegarde sur un cluster/base distinct de production, compatible avec la version MongoDB source. Ne jamais diriger une recette vers l’URI de production.
- Configurer un serveur SMTP de capture sans relai externe et `LOAN_ARCHIVE_EMAIL=`. Désactiver les planificateurs ou utiliser `NODE_ENV=test` pour une recette technique ; ce dernier est réservé au test, pas au déploiement réel. Contrôler aussi les rapports/notifications aux adresses administratives.
- Exécuter la migration **sans** `--apply` sur la copie, examiner chaque véhicule bloqué, appliquer sur cette copie et vérifier les affectations et les réservations existantes.
- Tester les rôles Son, Lumière, Plateau, Autre et Général, les demandes mélangées, les comptes déplacés, les véhicules avec responsables d’autres structures, les mails capturés, l’inventaire, les calendriers et une demande ancienne. Le formulaire doit garder les noms des acteurs.
- Construire et conserver l’image candidate et une image de secours avant le créneau de maintenance. Vérifier la compilation frontend, backend, les tests et le contrôle CSP.

## Sauvegarde cohérente sur Free

Planifier un créneau court annoncé aux équipes. Suspendre les écritures de **toutes** les instances GestMat et arrêter les tâches de rappel, archivage et rapports qui écrivent dans cette base. L’arrêt du seul frontend ne suffit pas. Attendre la fin des requêtes en cours avant l’arrêt du backend. Contrôler l’absence d’autre client qui écrit dans Atlas pendant le dump. Sans oplog, un dump pendant les écritures n’est pas une photographie cohérente garantie.

Créer un dossier de sauvegarde protégé (`umask 077`). Installer les MongoDB Database Tools compatibles. Utiliser un fichier YAML protégé contenant `uri: "..."` et `mongodump --config=/chemin/protege/dump.yml --db=BASE_GESTMAT --archive=/chemin/protege/gestmat.archive.gz --gzip`. Le fichier de configuration évite de placer le secret dans les arguments du processus ou l’historique du shell. Ne pas transmettre ni commiter ce fichier. Ne pas utiliser `--oplog` sur Free.

Le script `backend/scripts/backupAtlas.js` automatise ce dump à partir d’un fichier `.env` local, sans afficher l’URI. Il exige un nom de base et une confirmation explicite de suspension des écritures :

```sh
node backend/scripts/backupAtlas.js --env /chemin/protege/.env --database BASE_GESTMAT --output /chemin/protege/gestmat.archive.gz --writes-paused
```

Ce drapeau confirme la procédure humaine ; le script ne coupe pas les services. Il ne restaure jamais une base. Vérifier le fichier produit, la somme `.sha256`, copier les sauvegardes hors VPS et vérifier une restauration avec `mongorestore` sur un cluster/base isolé, en utilisant un fichier de configuration de destination distinct. Une somme correcte ne remplace pas l’essai de restauration. Comparer collections, nombres de documents, index et quelques demandes/réservations représentatives.

## Déploiement

1. Conserver l’image stable, la configuration et le dump vérifié hors VPS. Noter le SHA stable et le SHA candidat. Résoudre le rapport de migration bloqué avant la bascule.
2. Préparer la page de maintenance et arrêter toutes les instances backend/planificateurs. Effectuer le dernier dump cohérent et vérifier sa réussite.
3. Choisir le SHA candidat explicite, plutôt qu’un `git pull` non vérifié. Ne pas effacer les modifications locales ni les volumes. Construire depuis les lockfiles ou utiliser l’image candidate déjà construite et identifiée.
4. Exécuter un conteneur **ponctuel** de migration, avec la configuration de production : d’abord le rapport, puis `--apply` si aucun véhicule n’est bloqué. Ne pas démarrer le serveur applicatif pour cette étape. Le démarrage normal ne migre pas implicitement les comptes ou les décisions historiques.
5. Relancer uniquement les services requis, vérifier l’état HTTP, la connexion Atlas, les journaux d’erreur, les calendriers et une demande de contrôle avec des comptes de recette. Vérifier le mail d’archive et les destinataires spécialisés avant la réouverture aux équipes.
6. Retirer la maintenance et surveiller les erreurs et les notifications. Ne pas réinitialiser ni supprimer les volumes (`down -v`). Garder les sauvegardes et images pendant la période de surveillance.

## Choisir le bon retour arrière

**Avant toute décision par ligne nouvelle**, revenir à l’image stable et à sa configuration est possible si aucune donnée incompatible n’a été créée/modifiée. Il faut le vérifier sur la base ; une migration de gestionnaires est additive mais l’ancien code ne connaît pas leurs restrictions.

**Après une donnée `schemaVersion: 2`**, l’ancien commit non adapté n’est pas un retour sûr : il peut traiter tout le panier comme un seul état, oublier les responsables des véhicules et envoyer des mails hors domaine. La variable `GESTMAT_READ_ONLY=true` active un mode de consultation temporaire (serveur à redémarrer, planificateurs désactivés) : catalogue, disponibilité et historique, écritures de prêt et d’inventaire bloquées. Il permet de diagnostiquer sans réinterpréter ou écraser les décisions. Une bannière informe les utilisateurs, et l’API refuse les mutations avec HTTP 503 ; connexion, rafraîchissement de session et déconnexion restent disponibles. Tester et conserver cette image avant la bascule ; ne pas improviser ce retour après un incident.

Une restauration du dump précédent annule aussi les demandes et décisions saisies après cette sauvegarde. Si elle devient nécessaire, suspendre les écritures, sauvegarder d’abord l’état courant, déterminer les opérations à réconcilier et restaurer **dans une nouvelle base**, puis faire pointer la configuration vers cette base après contrôle. Ne pas utiliser aveuglément `mongorestore --drop` sur la production. L’image, la configuration et la base doivent correspondre.

La sauvegarde prépare une récupération ; elle ne garantit pas l’absence de panne. La recette sur une copie, un créneau de maintenance et un retour éprouvé sont nécessaires pour protéger le travail des équipes.
