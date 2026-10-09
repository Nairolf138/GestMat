# Rôles, décisions et notifications

Les autorisations sont calculées avec le compte enregistré actuellement en base, à chaque requête. Un JWT ancien ne conserve ni l’ancien rôle ni l’ancienne structure. Un compte supprimé ne peut plus utiliser sa session.

| Rôle | Domaines de matériel autorisés |
| --- | --- |
| Administrateur | Tous, toutes structures |
| Régisseur général | Tous, dans sa structure actuelle |
| Régisseur son | Son, Vidéo, Autre |
| Régisseur lumière | Lumière, Vidéo, Autre |
| Régisseur plateau | Plateau, Vidéo, Autre |
| Autre | Autre, y compris le libellé historique « Autres » |

Pour le matériel, ces domaines gouvernent la création des demandes, la visibilité des lignes, les décisions, les notifications et la gestion de l’inventaire de sa structure. Le catalogue reste consultable par tous ; une consultation ne donne aucun droit de demande ou de modification hors domaine. Le domaine d’une ligne nouvelle est conservé avec cette ligne ; une reclassification ultérieure du matériel ne réécrit pas les droits sur son historique.

Les demandes appartiennent aux structures. Tous leurs membres autorisés par domaine suivent les lignes concernées, quel que soit l’auteur. Un changement de poste donne accès aux anciennes demandes du nouveau poste et retire les droits de l’ancien poste. L’auteur d’une demande de matériel n’a pas de privilège historique supplémentaire.

## Décision par ligne

Chaque ligne a un identifiant stable et une décision indépendante. Une acceptation ou un refus porte sur toute la quantité : accepter les 4 MacAura et refuser les 2 Parfect est possible ; accepter seulement 2 des 4 MacAura dans cette même ligne ne l’est pas. Le propriétaire autorisé décide sur ses domaines. L’administrateur peut intervenir sur tous les domaines. Les demandes mélangées n’obligent pas un spécialiste à traiter les autres domaines.

L’API accepte `PUT /loans/:id` avec `decisions: [{ lineId, status, note?, expectedStatus?, expectedVersion? }]`. Les seules décisions sont `accepted`, `refused` et `cancelled`. L’interface envoie `expectedVersion` pour refuser une décision si la quantité ou les dates ont changé depuis l’affichage. Les boutons proposent l’acceptation ou le refus par ligne. Le statut de synthèse `partial` indique une demande contenant au moins une ligne acceptée et d’autres états ; `hasPendingItems` signale explicitement les décisions restantes.

Les dates, quantités et notes d’une demande restent modifiables avant le début, tant que les lignes sont en attente et que le compte peut modifier toute la demande. Une suppression est un archivage avec annulation et conservation de l’historique. Une ligne retirée conserve une trace annulée et libère sa disponibilité. Les demandes en attente réservent le stock de matériel comme auparavant ; seules les lignes refusées ou annulées libèrent ce stock.

Le nom, le prénom, l’identité de compte, la date, le commentaire et le matériel concerné sont conservés dans l’historique des nouvelles actions. Les réponses ne renvoient pas le mot de passe, les préférences ou le document utilisateur complet. Les anciennes décisions restent lisibles ; aucune date historique manquante n’est inventée.

## Véhicules

Tous les utilisateurs consultent le catalogue et la disponibilité et peuvent demander un véhicule de n’importe quelle structure, y compris la leur. Une demande reste en attente jusqu’à la décision d’un gestionnaire. L’auteur conserve le suivi et les notifications de ses réservations après un changement de rôle ou de structure.

Un véhicule appartient à une structure et possède un ou plusieurs `managerIds`. Les gestionnaires peuvent appartenir à plusieurs structures. Eux seuls modifient le véhicule et valident ou refusent ses demandes, avec intervention possible de l’administrateur. L’administrateur et le régisseur général de la structure propriétaire désignent les gestionnaires. Un général qui n’est pas gestionnaire peut changer l’affectation des gestionnaires, mais pas les autres caractéristiques du véhicule.

Une réservation acceptée occupe la disponibilité. Plusieurs demandes en attente peuvent se chevaucher ; la validation vérifie la disponibilité dans une transaction. Une suppression de véhicule avec des demandes actives est bloquée. Un compte gestionnaire ne peut être supprimé avant le retrait de ses affectations. Un changement de poste conserve ses affectations manuelles ; celles issues de la migration sont signalées pour révision.

## Courriels

Chaque utilisateur gère ses propres préférences : demandes, changements d’état, rappels de retour, alertes système et rappels véhicules. Une préférence désactivée reste désactivée, y compris pour les anciennes préférences `structureUpdates`. Chaque destinataire de matériel reçoit seulement ses lignes pertinentes, dans sa structure actuelle. Une décision Lumière ne déclenche pas de mail Son. Les demandes véhicules ciblent l’auteur et les gestionnaires nommés ; elles ne sont pas diffusées à toute la structure. Les rappels réglementaires ciblent les gestionnaires qui ont activé les rappels véhicules.

L’expéditeur par défaut est `notifications@nairolfconcept.fr`, personnalisable avec `NOTIFY_EMAIL`. `LOAN_ARCHIVE_EMAIL` reçoit une copie complète de chaque événement de demande dans une enveloppe distincte **en CCI**, une fois par événement, même si tous les utilisateurs ont désactivé leurs mails. Par défaut, cette adresse reprend `NOTIFY_EMAIL`, puis `notifications@nairolfconcept.fr`. Une valeur vide désactive cette archive, à utiliser sur les environnements de test. Aucun fichier `.env` ne doit être commité.

## Migration des gestionnaires

Dans `backend`, `npm run migrate-vehicle-managers` produit un rapport sans écrire. `npm run migrate-vehicle-managers -- --apply` applique les affectations dans une transaction après vérification de tous les véhicules. Les véhicules sans gestionnaire reçoivent tous les généraux actuels de leur structure. Une affectation manuelle est préservée. Un véhicule sans structure valide ou sans général disponible bloque l’application entière : désigner ses responsables explicitement avant de relancer. La migration est idempotente. Elle s’exécute après sauvegarde vérifiée, avec les écritures de production suspendues.

Voir [la procédure de mise en service et de retour arrière](DEPLOYMENT_ROLLBACK.md).
