/*
  # Add Score Detail Field to Individual Matches

  1. Changes to individual_matches table
    - Add `score_detail` column to store the match score description (e.g., "7&6", "tie", "6&4")
    - This provides a human-readable score alongside the result

  2. Notes
    - The score_detail is optional and can be updated by the host captain
    - Result and points are still the source of truth for calculations
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'individual_matches' AND column_name = 'score_detail'
  ) THEN
    ALTER TABLE individual_matches ADD COLUMN score_detail text;
  END IF;
END $$;
