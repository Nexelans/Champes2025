/*
  # Add player selections for matches

  1. New Tables
    - `match_player_selections`
      - `id` (uuid, primary key)
      - `match_id` (uuid, foreign key to matches)
      - `team_id` (uuid, foreign key to teams)
      - `player_id` (uuid, foreign key to players)
      - `selection_order` (integer) - Order of selection (1-8 or 1-10)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)
      - Unique constraint on (match_id, team_id, player_id) - a player can only be selected once per match per team
      - Unique constraint on (match_id, team_id, selection_order) - ensures no duplicate order numbers

  2. Security
    - Enable RLS on `match_player_selections` table
    - Add policy for captains to manage their team's selections
    - Add policy for authenticated users to view selections

  3. Notes
    - Captains can select 8 players for regular season matches
    - Captains can select 10 players for finals matches
    - Selection deadline is the match date (cannot select after match date)
*/

CREATE TABLE IF NOT EXISTS match_player_selections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id uuid NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
  team_id uuid NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  player_id uuid NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  selection_order integer NOT NULL CHECK (selection_order >= 1 AND selection_order <= 10),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(match_id, team_id, player_id),
  UNIQUE(match_id, team_id, selection_order)
);

ALTER TABLE match_player_selections ENABLE ROW LEVEL SECURITY;

-- Captains can manage their own team's selections
CREATE POLICY "Captains can manage team selections"
  ON match_player_selections
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM captains
      WHERE captains.team_id = match_player_selections.team_id
      AND captains.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM captains
      WHERE captains.team_id = match_player_selections.team_id
      AND captains.user_id = auth.uid()
    )
  );

-- Anyone can view selections
CREATE POLICY "Anyone can view selections"
  ON match_player_selections
  FOR SELECT
  TO authenticated
  USING (true);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_match_player_selections_match_team 
  ON match_player_selections(match_id, team_id);

CREATE INDEX IF NOT EXISTS idx_match_player_selections_player 
  ON match_player_selections(player_id);
