# [Todo](readme.md)

## Description

Application de gestion de dépenses. L'idée c'est de pouvoir noter les dépenses quotidiennes sur l'application ou via web avec la possibilité d'avoir une sauvegarde locale et de synchroniser les données sur un serveur en ligne.  
L'un des utilisateur doit pouvoir définir un solde de départ qui fera office de budget mensuel.

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
  - categorie_id
  - user_id
  - quantite
  - montant
  - Date
- depenses_personnelles
  - categorie_id
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
  - rembousé
  - date_remboursement
- Categories
  - nom
  - description

## Design

- [] améliorer l'interface
- [x] créer un logo
- [x] splash screen

## Rôles et journal

- [x] Rôles : admin, membre, lecteur (droits sur les données communes)
- [x] Gestion des rôles par l'administrateur
- [x] Journal d'activité consultable par l'administrateur

## Fonctionalités

- [x] PWA
- [x] Ajouter une table budget
  - [x] il pourra etre crédité au fur et à mesure par un utilisateur
  - [x] il sera visible par tous les utilisateurs
  - [x] le solde de chaque mois sera reporté sur le budget du mois suivant
- [x] Ajouter le mode de paiement aux depenes, revenus, emprunts,
  - orange money
  - wave
  - espèce
  - transfert bancaire
  - chèque
- [x] Formulaire de recherche pour :
  - les fournisseurs
  - les marques
  - les articles
- [x] Synchronisation automtique toutes les 8h
- [x] Pouvoir ajouter un nouvel article à partir de la page d'ajout d'une nouvelle dépense
- [x] bouton pour dupliquer un article

## Prets

- [x] gérer le rembousement de pret

## Importation

- [x] Gérer l'importation 
  - des marques
  - des articles
  - des fournisseurs

## API

Faire des APIs pour télécharger :

- des marques
- des articles
- des fournisseurs