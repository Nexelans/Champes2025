/*
  # Champe Golf Competition Database Schema

  Ce script initialise la base de données pour la gestion de la compétition Champe 2024-2025.

  ## Tables créées

  1. **clubs** - Les 6 golfs participants
  2. **teams** - Les 12 équipes (2 par club)
  3. **players** - Les joueurs avec leurs index et éligibilités
  4. **captains** - Les capitaines d'équipes
  5. **matches** - Les rencontres entre équipes
  6. **match_players** - Composition des équipes pour chaque rencontre
  7. **individual_results** - Résultats individuels de chaque match

  ## Utilisation

  Exécutez ce script dans votre console SQL Supabase pour créer toutes les tables nécessaires.
*/

-- Créer les tables principales
CREATE TABLE IF NOT EXISTS clubs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  website text,
  phone text,
  email text,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS teams (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id uuid NOT NULL REFERENCES clubs(id) ON DELETE CASCADE,
  division text NOT NULL CHECK (division IN ('champe1', 'champe2')),
  season text NOT NULL DEFAULT '2024-2025',
  created_at timestamptz DEFAULT now(),
  UNIQUE(club_id, division, season)
);

CREATE TABLE IF NOT EXISTS players (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id uuid NOT NULL REFERENCES clubs(id) ON DELETE CASCADE,
  first_name text NOT NULL,
  last_name text NOT NULL,
  index_value decimal(4,1) NOT NULL CHECK (index_value >= 0 AND index_value <= 54),
  license_number text,
  email text,
  phone text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS captains (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  team_id uuid NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  first_name text NOT NULL,
  last_name text NOT NULL,
  email text NOT NULL,
  phone text NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE(team_id)
);

CREATE TABLE IF NOT EXISTS matches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  season text NOT NULL DEFAULT '2024-2025',
  division text NOT NULL CHECK (division IN ('champe1', 'champe2')),
  round_number integer NOT NULL CHECK (round_number >= 1 AND round_number <= 6),
  match_date date NOT NULL,
  host_club_id uuid NOT NULL REFERENCES clubs(id),
  team1_id uuid NOT NULL REFERENCES teams(id),
  team2_id uuid NOT NULL REFERENCES teams(id),
  team1_points integer DEFAULT 0 CHECK (team1_points >= 0),
  team2_points integer DEFAULT 0 CHECK (team2_points >= 0),
  is_final boolean DEFAULT false,
  status text DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'in_progress', 'completed')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CHECK (team1_id != team2_id)
);

CREATE TABLE IF NOT EXISTS match_players (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id uuid NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
  team_id uuid NOT NULL REFERENCES teams(id),
  player_id uuid NOT NULL REFERENCES players(id),
  position integer NOT NULL CHECK (position >= 1 AND position <= 10),
  partner_id uuid REFERENCES match_players(id),
  created_at timestamptz DEFAULT now(),
  UNIQUE(match_id, team_id, position)
);

CREATE TABLE IF NOT EXISTS individual_results (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id uuid NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
  position integer NOT NULL CHECK (position >= 1 AND position <= 30),
  player1_id uuid NOT NULL REFERENCES match_players(id),
  player2_id uuid NOT NULL REFERENCES match_players(id),
  result text CHECK (result IN ('player1_win', 'player2_win', 'draw')),
  player1_points integer DEFAULT 0 CHECK (player1_points IN (0, 1, 2)),
  player2_points integer DEFAULT 0 CHECK (player2_points IN (0, 1, 2)),
  created_at timestamptz DEFAULT now(),
  UNIQUE(match_id, position),
  CHECK (player1_id != player2_id),
  CHECK (player1_points + player2_points = 2)
);

-- Activer Row Level Security
ALTER TABLE clubs ENABLE ROW LEVEL SECURITY;
ALTER TABLE teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE players ENABLE ROW LEVEL SECURITY;
ALTER TABLE captains ENABLE ROW LEVEL SECURITY;
ALTER TABLE matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE match_players ENABLE ROW LEVEL SECURITY;
ALTER TABLE individual_results ENABLE ROW LEVEL SECURITY;

-- Politiques RLS pour accès public en lecture
CREATE POLICY "Anyone can view clubs" ON clubs FOR SELECT TO public USING (true);
CREATE POLICY "Anyone can view teams" ON teams FOR SELECT TO public USING (true);
CREATE POLICY "Anyone can view players" ON players FOR SELECT TO public USING (true);
CREATE POLICY "Anyone can view captains" ON captains FOR SELECT TO public USING (true);
CREATE POLICY "Anyone can view matches" ON matches FOR SELECT TO public USING (true);
CREATE POLICY "Anyone can view match players" ON match_players FOR SELECT TO public USING (true);
CREATE POLICY "Anyone can view individual results" ON individual_results FOR SELECT TO public USING (true);

-- Politiques RLS pour les utilisateurs authentifiés
CREATE POLICY "Authenticated users can insert clubs" ON clubs FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can insert teams" ON teams FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can manage players" ON players FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Captains can update their own info" ON captains FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Authenticated users can insert captains" ON captains FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can manage matches" ON matches FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated users can manage match players" ON match_players FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated users can manage results" ON individual_results FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Créer les index pour améliorer les performances
CREATE INDEX IF NOT EXISTS idx_teams_club_id ON teams(club_id);
CREATE INDEX IF NOT EXISTS idx_teams_division ON teams(division);
CREATE INDEX IF NOT EXISTS idx_players_club_id ON players(club_id);
CREATE INDEX IF NOT EXISTS idx_players_index ON players(index_value);
CREATE INDEX IF NOT EXISTS idx_matches_division ON matches(division);
CREATE INDEX IF NOT EXISTS idx_matches_date ON matches(match_date);
CREATE INDEX IF NOT EXISTS idx_matches_season ON matches(season);
CREATE INDEX IF NOT EXISTS idx_match_players_match_id ON match_players(match_id);
CREATE INDEX IF NOT EXISTS idx_individual_results_match_id ON individual_results(match_id);

-- Fonction pour mettre à jour le champ updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers pour updated_at
CREATE TRIGGER update_players_updated_at BEFORE UPDATE ON players
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_matches_updated_at BEFORE UPDATE ON matches
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Insérer les données initiales (clubs)
INSERT INTO clubs (name, website, phone, email) VALUES
  ('Le Clou', 'http://www.golfduclou.fr', '04 74 98 19 65', 'golf@golfduclou.fr'),
  ('Mionnay', 'http://jouer.golf/mionnay/', '04 78 91 84 84', 'sportif@gardengolf-mionnay.fr'),
  ('La Sorelle', 'http://www.golf-lasorelle.com', '04 74 35 47 27', 'secretariat@golf-lasorelle.com'),
  ('Bourg en Bresse', 'http://www.golfdebourgenbresse.com', '04 74 24 65 17', 'licence.bourg@wanadoo.fr'),
  ('Chassieu', 'https://golfsbluegreen.com/golfs/golf-bluegreen-grand-lyon-chassieu/', NULL, NULL),
  ('3 Vallons', 'https://jouer.golf/golf/ugolf-les-trois-vallons/', '04 74 93 20 32', 'asgolf3vallons@gmail.com')
ON CONFLICT (name) DO NOTHING;

-- Créer les équipes pour chaque club
INSERT INTO teams (club_id, division, season)
SELECT
  c.id,
  'champe1',
  '2024-2025'
FROM clubs c
ON CONFLICT (club_id, division, season) DO NOTHING;

INSERT INTO teams (club_id, division, season)
SELECT
  c.id,
  'champe2',
  '2024-2025'
FROM clubs c
ON CONFLICT (club_id, division, season) DO NOTHING;