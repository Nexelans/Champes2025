/*
  # Add trigger to auto-validate players on insert

  1. Changes
    - Create a trigger function that automatically sets is_validated to true
    - Apply trigger on INSERT to players table
    - This ensures all new players are validated regardless of frontend cache issues
  
  2. Security
    - No changes to RLS policies
    - Trigger only affects new player insertions
*/

-- Create trigger function to auto-validate players
CREATE OR REPLACE FUNCTION auto_validate_player()
RETURNS TRIGGER AS $$
BEGIN
  -- Automatically set is_validated to true for all new players
  NEW.is_validated := true;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop trigger if it exists
DROP TRIGGER IF EXISTS trigger_auto_validate_player ON players;

-- Create trigger that runs before insert
CREATE TRIGGER trigger_auto_validate_player
  BEFORE INSERT ON players
  FOR EACH ROW
  EXECUTE FUNCTION auto_validate_player();