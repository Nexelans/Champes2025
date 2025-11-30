/*
  # Add handicap and strokes information to individual matches

  1. Changes
    - Add `team1_handicap` (numeric) - Handicap index of team 1 player(s)
    - Add `team2_handicap` (numeric) - Handicap index of team 2 player(s)
    - Add `strokes_given` (integer) - Number of strokes given
    - Add `strokes_receiver` (integer) - Which team receives strokes (1 or 2)

  2. Notes
    - For singles matches, handicap is the player's index
    - For doubles matches, handicap is the average of the two players
    - Strokes calculation: (handicap difference × 90%) rounded
    - These fields are populated when matches are generated
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'individual_matches' AND column_name = 'team1_handicap'
  ) THEN
    ALTER TABLE individual_matches ADD COLUMN team1_handicap numeric;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'individual_matches' AND column_name = 'team2_handicap'
  ) THEN
    ALTER TABLE individual_matches ADD COLUMN team2_handicap numeric;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'individual_matches' AND column_name = 'strokes_given'
  ) THEN
    ALTER TABLE individual_matches ADD COLUMN strokes_given integer DEFAULT 0;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'individual_matches' AND column_name = 'strokes_receiver'
  ) THEN
    ALTER TABLE individual_matches ADD COLUMN strokes_receiver integer CHECK (strokes_receiver IN (1, 2));
  END IF;
END $$;