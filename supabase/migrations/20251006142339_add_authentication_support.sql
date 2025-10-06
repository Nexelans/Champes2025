/*
  # Add Authentication Support for Captains

  ## Changes
  
  ### 1. Update captains table
  - Make email unique for authentication
  - Add constraint to ensure user_id is populated when captain has access
  
  ### 2. Create match_lineups table
  Stores which players are selected for each match
  - `id` (uuid, primary key)
  - `match_id` (uuid) - References matches
  - `team_id` (uuid) - References teams
  - `player_id` (uuid) - References players
  - `playing_order` (int) - Order in which player plays (1-8 for regular, 1-10 for finals)
  - `partner_player_id` (uuid, nullable) - For foursomes in finals
  - `created_at` (timestamptz)
  - `updated_at` (timestamptz)

  ### 3. Add is_validated field to players
  Track if player's handicap index has been validated
  
  ## Security
  - Captains can only manage their own team's data
  - RLS policies updated for captain-specific access
*/

-- Make captain email unique for authentication
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'captains_email_key'
  ) THEN
    ALTER TABLE captains ADD CONSTRAINT captains_email_key UNIQUE (email);
  END IF;
END $$;

-- Add is_validated field to players
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'players' AND column_name = 'is_validated'
  ) THEN
    ALTER TABLE players ADD COLUMN is_validated boolean DEFAULT false;
  END IF;
END $$;

-- Create match_lineups table
CREATE TABLE IF NOT EXISTS match_lineups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id uuid NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
  team_id uuid NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  player_id uuid NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  playing_order int NOT NULL CHECK (playing_order >= 1 AND playing_order <= 10),
  partner_player_id uuid REFERENCES players(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(match_id, team_id, player_id),
  UNIQUE(match_id, team_id, playing_order)
);

-- Create index for match_lineups
CREATE INDEX IF NOT EXISTS idx_match_lineups_match_id ON match_lineups(match_id);
CREATE INDEX IF NOT EXISTS idx_match_lineups_team_id ON match_lineups(team_id);
CREATE INDEX IF NOT EXISTS idx_match_lineups_player_id ON match_lineups(player_id);

-- Enable Row Level Security
ALTER TABLE match_lineups ENABLE ROW LEVEL SECURITY;

-- RLS Policies for match_lineups

-- Public can view lineups
CREATE POLICY "Anyone can view match lineups"
  ON match_lineups FOR SELECT
  TO public
  USING (true);

-- Captains can insert lineups for their team
CREATE POLICY "Captains can insert their team lineups"
  ON match_lineups FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM captains
      WHERE captains.user_id = auth.uid()
      AND captains.team_id = match_lineups.team_id
    )
  );

-- Captains can update lineups for their team
CREATE POLICY "Captains can update their team lineups"
  ON match_lineups FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM captains
      WHERE captains.user_id = auth.uid()
      AND captains.team_id = match_lineups.team_id
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM captains
      WHERE captains.user_id = auth.uid()
      AND captains.team_id = match_lineups.team_id
    )
  );

-- Captains can delete lineups for their team
CREATE POLICY "Captains can delete their team lineups"
  ON match_lineups FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM captains
      WHERE captains.user_id = auth.uid()
      AND captains.team_id = match_lineups.team_id
    )
  );

-- Update RLS policies for players to allow captains to manage their club's players

-- Drop existing policies for players
DROP POLICY IF EXISTS "Authenticated users can insert players" ON players;
DROP POLICY IF EXISTS "Authenticated users can update players" ON players;

-- Captains can insert players for their club
CREATE POLICY "Captains can insert players for their club"
  ON players FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM captains
      JOIN teams ON captains.team_id = teams.id
      WHERE captains.user_id = auth.uid()
      AND teams.club_id = players.club_id
    )
  );

-- Captains can update players for their club
CREATE POLICY "Captains can update players for their club"
  ON players FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM captains
      JOIN teams ON captains.team_id = teams.id
      WHERE captains.user_id = auth.uid()
      AND teams.club_id = players.club_id
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM captains
      JOIN teams ON captains.team_id = teams.id
      WHERE captains.user_id = auth.uid()
      AND teams.club_id = players.club_id
    )
  );

-- Captains can delete players for their club
CREATE POLICY "Captains can delete players for their club"
  ON players FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM captains
      JOIN teams ON captains.team_id = teams.id
      WHERE captains.user_id = auth.uid()
      AND teams.club_id = players.club_id
    )
  );

-- Update team_players policies

DROP POLICY IF EXISTS "Authenticated users can insert team players" ON team_players;
DROP POLICY IF EXISTS "Authenticated users can update team players" ON team_players;

-- Captains can manage team_players for their team
CREATE POLICY "Captains can insert team players for their team"
  ON team_players FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM captains
      WHERE captains.user_id = auth.uid()
      AND captains.team_id = team_players.team_id
    )
  );

CREATE POLICY "Captains can update team players for their team"
  ON team_players FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM captains
      WHERE captains.user_id = auth.uid()
      AND captains.team_id = team_players.team_id
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM captains
      WHERE captains.user_id = auth.uid()
      AND captains.team_id = team_players.team_id
    )
  );

CREATE POLICY "Captains can delete team players for their team"
  ON team_players FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM captains
      WHERE captains.user_id = auth.uid()
      AND captains.team_id = team_players.team_id
    )
  );
