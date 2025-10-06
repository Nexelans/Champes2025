/*
  # Add Season Configuration Tables

  ## New Tables
  
  ### 1. `season_clubs`
  Tracks which clubs are participating in each season for each division
  - `id` (uuid, primary key)
  - `season_id` (uuid) - References seasons
  - `club_id` (uuid) - References clubs
  - `division` (text) - 'champe1' or 'champe2'
  - `is_participating` (boolean) - Whether club participates in this division
  - `created_at` (timestamptz)

  ### 2. `season_dates`
  Stores the planned dates for each round in a season
  - `id` (uuid, primary key)
  - `season_id` (uuid) - References seasons
  - `division` (text) - 'champe1' or 'champe2'
  - `round_number` (int) - Round 1-5 for regular, 6 for finals
  - `planned_date` (date) - The planned date for this round
  - `host_club_id` (uuid, nullable) - The club hosting this round
  - `created_at` (timestamptz)

  ## Security
  - RLS enabled on all tables
  - Authenticated users can modify configuration
  - Public can view configuration
*/

-- Create season_clubs table
CREATE TABLE IF NOT EXISTS season_clubs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  season_id uuid NOT NULL REFERENCES seasons(id) ON DELETE CASCADE,
  club_id uuid NOT NULL REFERENCES clubs(id) ON DELETE CASCADE,
  division text NOT NULL CHECK (division IN ('champe1', 'champe2')),
  is_participating boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  UNIQUE(season_id, club_id, division)
);

-- Create season_dates table
CREATE TABLE IF NOT EXISTS season_dates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  season_id uuid NOT NULL REFERENCES seasons(id) ON DELETE CASCADE,
  division text NOT NULL CHECK (division IN ('champe1', 'champe2')),
  round_number int NOT NULL CHECK (round_number >= 1 AND round_number <= 6),
  planned_date date NOT NULL,
  host_club_id uuid REFERENCES clubs(id),
  created_at timestamptz DEFAULT now(),
  UNIQUE(season_id, division, round_number)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_season_clubs_season_id ON season_clubs(season_id);
CREATE INDEX IF NOT EXISTS idx_season_clubs_club_id ON season_clubs(club_id);
CREATE INDEX IF NOT EXISTS idx_season_dates_season_id ON season_dates(season_id);

-- Enable Row Level Security
ALTER TABLE season_clubs ENABLE ROW LEVEL SECURITY;
ALTER TABLE season_dates ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Anyone can view season clubs"
  ON season_clubs FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Authenticated users can insert season clubs"
  ON season_clubs FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update season clubs"
  ON season_clubs FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can delete season clubs"
  ON season_clubs FOR DELETE
  TO authenticated
  USING (true);

CREATE POLICY "Anyone can view season dates"
  ON season_dates FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Authenticated users can insert season dates"
  ON season_dates FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update season dates"
  ON season_dates FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can delete season dates"
  ON season_dates FOR DELETE
  TO authenticated
  USING (true);
