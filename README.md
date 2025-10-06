# Application de Gestion Champe 2024-2025

Application web pour gérer la compétition annuelle de golf Champe (Championnat Hivernal Amical Match Play par Équipe).

## Fonctionnalités

- **Tableau de bord** : Vue d'ensemble de la compétition avec les statistiques principales
- **Calendrier** : Visualisation de toutes les rencontres pour Champe 1 et Champe 2
- **Classements** : Tableaux de classement en temps réel avec calcul automatique des points
- **Saisie des résultats** : Interface intuitive pour entrer les résultats match par match
- **Gestion des joueurs** : Base de données des joueurs avec règles d'éligibilité automatiques

## Règles de la compétition

### Divisions
- **Champe 1** : Index de 0 à 17.0 (ramené à 17.0 si jusqu'à 18.0)
- **Champe 2** : Index de 17.1 à 30.0 (ramené à 30.0 si jusqu'à 36.0)

### Éligibilité des joueurs
- Index **0 - 16.9** : Champe 1 uniquement
- Index **17.0 - 18.0** : Champe 1 et exceptionnellement Champe 2 (toujours dans le même club)
- Index **17.1 - 30+** : Champe 2 uniquement

### Système de points
- Match gagné : **2 points**
- Match nul : **1 point**
- Match perdu : **0 point**

En cas d'égalité, le nombre de victoires à l'extérieur départage les équipes.

## Installation

### Prérequis
- Node.js (version 18 ou supérieure)
- Un compte Supabase

### Étapes d'installation

1. **Installer les dépendances**
   ```bash
   npm install
   ```

2. **Initialiser la base de données**
   - Connectez-vous à votre projet Supabase
   - Ouvrez l'éditeur SQL
   - Copiez et exécutez le contenu du fichier `database-init.sql`
   - Cela créera toutes les tables nécessaires et insérera les données de base

3. **Configurer les variables d'environnement**
   Le fichier `.env` contient déjà les variables Supabase. Vérifiez qu'elles sont correctes :
   ```
   VITE_SUPABASE_URL=votre_url_supabase
   VITE_SUPABASE_ANON_KEY=votre_cle_anonyme
   ```

4. **Lancer l'application en développement**
   ```bash
   npm run dev
   ```

5. **Construire pour la production**
   ```bash
   npm run build
   ```

## Structure de la base de données

### Tables principales

- **clubs** : Les 6 golfs participants
- **teams** : Les 12 équipes (2 par club)
- **players** : Les joueurs avec leurs index et informations
- **matches** : Les rencontres entre équipes
- **individual_results** : Résultats détaillés de chaque match

### Clubs participants

1. Le Clou
2. Mionnay
3. La Sorelle
4. Bourg en Bresse
5. Chassieu
6. 3 Vallons

## Utilisation

### Ajouter des joueurs

1. Aller dans l'onglet "Joueurs"
2. Cliquer sur "Ajouter un joueur"
3. Remplir le formulaire avec les informations du joueur
4. L'éligibilité est calculée automatiquement en fonction de l'index

### Saisir des résultats

1. Aller dans l'onglet "Saisir résultats"
2. Sélectionner la division (Champe 1 ou 2)
3. Choisir la journée
4. Sélectionner la rencontre
5. Renseigner le résultat de chaque match individuel (24 matchs par rencontre)
6. Enregistrer les résultats

Le système calcule automatiquement :
- Les points de chaque équipe pour la rencontre
- Le classement général
- Les statistiques de victoires à l'extérieur

### Consulter les classements

Les classements sont mis à jour en temps réel et affichent :
- Position
- Nombre de matchs joués
- Victoires, nuls, défaites
- Total de points
- Victoires à l'extérieur

## Technologies utilisées

- **React** : Framework frontend
- **TypeScript** : Typage statique
- **Tailwind CSS** : Styles
- **Supabase** : Base de données et authentification
- **Vite** : Build tool
- **Lucide React** : Icônes

## Prochaines étapes

Pour améliorer l'application, vous pouvez :

1. **Ajouter l'authentification** pour les capitaines d'équipes
2. **Connecter la base de données** pour persister les données réelles
3. **Ajouter des notifications** par email lors de la saisie des résultats
4. **Exporter les résultats** en PDF ou Excel
5. **Ajouter des statistiques** avancées par joueur et par équipe

## Support

Pour toute question ou problème, contactez votre administrateur système.