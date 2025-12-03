/*
  # Auto-delete individual matches when player selections change

  1. Strategy
    - When player selections are modified, automatically delete the existing individual_matches
    - The frontend will regenerate them when saving (already implemented in TeamSelection.tsx)
    - This ensures individual matches are always in sync with player selections

  2. New Functions
    - `delete_individual_matches_on_selection_change()` - Trigger function that deletes
      individual matches when selections are modified

  3. New Triggers
    - Trigger on `match_player_selections` table for INSERT, UPDATE, DELETE operations
*/

-- Drop the previous trigger and function if they exist
DROP TRIGGER IF EXISTS trigger_regenerate_individual_matches ON match_player_selections;
DROP FUNCTION IF EXISTS regenerate_individual_matches_after_selection_change();

-- Create a function to delete individual matches when selections change
CREATE OR REPLACE FUNCTION delete_individual_matches_on_selection_change()
RETURNS TRIGGER AS $$
BEGIN
  -- Delete existing individual matches for this match
  DELETE FROM individual_matches
  WHERE match_id = COALESCE(NEW.match_id, OLD.match_id);

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger on match_player_selections
CREATE TRIGGER trigger_delete_individual_matches_on_selection_change
  AFTER INSERT OR UPDATE OR DELETE ON match_player_selections
  FOR EACH ROW
  EXECUTE FUNCTION delete_individual_matches_on_selection_change();
