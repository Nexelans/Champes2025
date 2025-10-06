/*
  # Add Match Lock Configuration and Finals Logic

  1. Changes to seasons table
    - Add `days_before_match_lock` column (default 3 days)
    - This determines when team selections become locked before a match

  2. Notes
    - Captains can modify their team selection until X days before the match
    - After the lock period, selections are frozen
    - Finals will match teams based on standings: 1st vs 2nd, 3rd vs 4th, 5th vs 6th
*/

-- Add days_before_match_lock column to seasons table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'seasons' AND column_name = 'days_before_match_lock'
  ) THEN
    ALTER TABLE seasons ADD COLUMN days_before_match_lock integer DEFAULT 3;
    ALTER TABLE seasons ADD CONSTRAINT days_before_match_lock_positive CHECK (days_before_match_lock >= 0);
  END IF;
END $$;
