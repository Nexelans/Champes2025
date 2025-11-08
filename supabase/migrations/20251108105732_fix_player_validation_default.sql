/*
  # Fix player validation default value

  1. Changes
    - Change default value of `is_validated` from false to true
    - This allows captains to create players that are immediately available for selection
  
  2. Security
    - No changes to RLS policies
    - Captains can only create players for their own club
*/

-- Change default value to true so players created by captains are immediately validated
ALTER TABLE players ALTER COLUMN is_validated SET DEFAULT true;

-- Update existing unvalidated players to validated
UPDATE players SET is_validated = true WHERE is_validated = false;