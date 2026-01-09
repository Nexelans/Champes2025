/*
  # Add starting hole field for shotgun starts

  1. Changes
    - Add `starting_hole` column to `individual_matches` table
      - Stores the hole number (1-18) where each match starts
      - Nullable to support existing matches
      - Validates range between 1 and 18

  2. Purpose
    - Allows captains to specify shotgun start holes for each match
    - Displayed on scorecards to help players know where to begin
*/

-- Add starting_hole column to individual_matches table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'individual_matches' AND column_name = 'starting_hole'
  ) THEN
    ALTER TABLE individual_matches 
    ADD COLUMN starting_hole integer CHECK (starting_hole >= 1 AND starting_hole <= 18);
  END IF;
END $$;