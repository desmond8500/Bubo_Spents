# [Todo](readme.md)

## Description

Application de gestion de dépenses. L'idée c'est de pouvoir noter les dépenses quotidiennes sur l'application ou via web avec la possibilité d'avoir une sauvegarde locale et de synchroniser les données sur un serveur en ligne.

## Technologies

- Ionic 8
- Vue 3
- Laravel 13

## Données

- Marques
  - nom
  - nom
  - logo
- Fournisseurs
  - description
  - logo
  - description
- Articles
  - images
  - nom
  - prix
  - description
- depenses
  - article_id
  - user_id
  - quantite
  - montant
  - Date
- depenses_personelles
  - user_id
  - designation
  - quantite
  - montant
  - Date
- Revenus
  - user_id
  - description
  - montant
  - date
- Emprunts
  - user_id
  - description
  - montant
  - date

## Taches

- [x] Se connecter aux répos bubo_spents et bubo_server
- [x] créer les projets ionic et laravel dans les projets respectifs
- [x] Connecter l'application au serveur
- [ ] developper et pusher l'application pas à pas

## Pages

- [x] Paramètre
- [x] Résumé mensuel
- [x] authentification

## Design

- [] améliorer l'interface
- [] créer un logo
- [] splash screen

## user

- [] Chaque utilisateur ne doit voir que ses emprunts
- [] Chaque utilisateur ne doit voir que ses revenus