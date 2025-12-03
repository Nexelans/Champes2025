/*
  # Auto-regenerate individual matches when player selections change

  1. New Functions
    - `regenerate_individual_matches_after_selection_change()` - Trigger function that automatically
      calls the generate-individual-matches edge function when player selections are modified

  2. New Triggers
    - Trigger on `match_player_selections` table for INSERT, UPDATE, DELETE operations
    - Only triggers after both teams have completed their selections (8 or 10 players each)

  3. Logic
    - When a captain modifies their selection, check if both teams have complete selections
    - If complete, automatically regenerate the individual matches
    - Uses the Supabase service role key to call the edge function
*/

-- Create a function to regenerate individual matches
CREATE OR REPLACE FUNCTION regenerate_individual_matches_after_selection_change()
RETURNS TRIGGER AS $$
DECLARE
  match_round INTEGER;
  required_players INTEGER;
  team1_count INTEGER;
  team2_count INTEGER;
  match_team1_id UUID;
  match_team2_id UUID;
BEGIN
  -- Get match details
  SELECT m.round_number, m.team1_id, m.team2_id
  INTO match_round, match_team1_id, match_team2_id
  FROM matches m
  WHERE m.id = COALESCE(NEW.match_id, OLD.match_id);

  -- Determine required players (10 for finals, 8 for regular season)
  required_players := CASE WHEN match_round = 6 THEN 10 ELSE 8 END;

  -- Count selections for both teams
  SELECT COUNT(*) INTO team1_count
  FROM match_player_selections
  WHERE match_id = COALESCE(NEW.match_id, OLD.match_id)
    AND team_id = match_team1_id;

  SELECT COUNT(*) INTO team2_count
  FROM match_player_selections
  WHERE match_id = COALESCE(NEW.match_id, OLD.match_id)
    AND team_id = match_team2_id;

  -- Only regenerate if both teams have complete selections
  IF team1_count = required_players AND team2_count = required_players THEN
    -- Call the edge function using pg_net extension
    PERFORM net.http_post(
      url := current_setting('app.settings.supabase_url') || '/functions/v1/generate-individual-matches',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key')
      ),
      body := jsonb_build_object('matchId', COALESCE(NEW.match_id, OLD.match_id))
    );
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger on match_player_selections
DROP TRIGGER IF EXISTS trigger_regenerate_individual_matches ON match_player_selections;

CREATE TRIGGER trigger_regenerate_individual_matches
  AFTER INSERT OR UPDATE OR DELETE ON match_player_selections
  FOR EACH ROW
  EXECUTE FUNCTION regenerate_individual_matches_after_selection_change();
