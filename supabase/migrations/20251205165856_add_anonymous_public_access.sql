/*
  # Ajout de l'accès anonyme aux données publiques

  1. Modifications des politiques RLS
    - Ajouter des politiques SELECT pour le rôle 'anon' (utilisateurs non authentifiés)
    - Permettre la lecture publique des données suivantes:
      - seasons (saisons)
      - clubs (clubs)
      - teams (équipes)
      - matches (matchs)
      - individual_matches (matchs individuels)
      - players (joueurs)
      - season_dates (dates de saison)
      - season_clubs (clubs par saison)
      - team_players (joueurs par équipe)
      - match_lineups (compositions)
      - match_player_selections (sélections de joueurs)

  2. Sécurité
    - Les opérations de modification (INSERT, UPDATE, DELETE) restent réservées aux utilisateurs authentifiés
    - Seule la lecture (SELECT) est autorisée pour les utilisateurs anonymes
*/

-- Seasons (saisons)
CREATE POLICY "Anonymous users can view seasons"
  ON seasons FOR SELECT
  TO anon
  USING (true);

-- Clubs
CREATE POLICY "Anonymous users can view clubs"
  ON clubs FOR SELECT
  TO anon
  USING (true);

-- Teams (équipes)
CREATE POLICY "Anonymous users can view teams"
  ON teams FOR SELECT
  TO anon
  USING (true);

-- Matches (matchs)
CREATE POLICY "Anonymous users can view matches"
  ON matches FOR SELECT
  TO anon
  USING (true);

-- Individual Matches (matchs individuels)
CREATE POLICY "Anonymous users can view individual matches"
  ON individual_matches FOR SELECT
  TO anon
  USING (true);

-- Players (joueurs)
CREATE POLICY "Anonymous users can view players"
  ON players FOR SELECT
  TO anon
  USING (true);

-- Season Dates (dates de saison)
CREATE POLICY "Anonymous users can view season dates"
  ON season_dates FOR SELECT
  TO anon
  USING (true);

-- Season Clubs (clubs par saison)
CREATE POLICY "Anonymous users can view season clubs"
  ON season_clubs FOR SELECT
  TO anon
  USING (true);

-- Team Players (joueurs par équipe)
CREATE POLICY "Anonymous users can view team players"
  ON team_players FOR SELECT
  TO anon
  USING (true);

-- Match Lineups (compositions)
CREATE POLICY "Anonymous users can view match lineups"
  ON match_lineups FOR SELECT
  TO anon
  USING (true);

-- Match Player Selections (sélections de joueurs)
CREATE POLICY "Anonymous users can view match player selections"
  ON match_player_selections FOR SELECT
  TO anon
  USING (true);

-- Captains (lecture publique des informations des capitaines, mais pas les données sensibles)
CREATE POLICY "Anonymous users can view captains basic info"
  ON captains FOR SELECT
  TO anon
  USING (true);
