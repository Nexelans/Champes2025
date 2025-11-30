/*
  # Backfill handicap data for existing individual matches

  1. Purpose
    - Calculate and populate handicap and strokes data for existing matches
    - Preserve all existing match results and scores
    - Apply the same calculation logic as the edge function

  2. Process
    - For each individual match, fetch the players' handicap indexes
    - Calculate average handicap for doubles matches
    - Calculate strokes given (90% of difference, rounded)
    - Update the record with calculated values

  3. Notes
    - Only updates records where handicap data is null
    - Uses the same formula: strokes = round(|handicap1 - handicap2| * 0.9)
    - Receiver is the player/team with higher handicap
*/

DO $$
DECLARE
  im_record RECORD;
  h1 NUMERIC;
  h2 NUMERIC;
  h1_p2 NUMERIC;
  h2_p2 NUMERIC;
  avg_h1 NUMERIC;
  avg_h2 NUMERIC;
  diff NUMERIC;
  strokes INT;
  receiver INT;
BEGIN
  FOR im_record IN 
    SELECT 
      id,
      team1_player_id,
      team2_player_id,
      team1_player2_id,
      team2_player2_id
    FROM individual_matches
    WHERE team1_handicap IS NULL
  LOOP
    SELECT handicap_index INTO h1
    FROM players
    WHERE id = im_record.team1_player_id;

    SELECT handicap_index INTO h2
    FROM players
    WHERE id = im_record.team2_player_id;

    IF im_record.team1_player2_id IS NOT NULL THEN
      SELECT handicap_index INTO h1_p2
      FROM players
      WHERE id = im_record.team1_player2_id;
      
      SELECT handicap_index INTO h2_p2
      FROM players
      WHERE id = im_record.team2_player2_id;

      avg_h1 := (h1 + h1_p2) / 2.0;
      avg_h2 := (h2 + h2_p2) / 2.0;
    ELSE
      avg_h1 := h1;
      avg_h2 := h2;
    END IF;

    diff := ABS(avg_h1 - avg_h2);
    strokes := ROUND(diff * 0.9);
    
    IF avg_h1 > avg_h2 THEN
      receiver := 1;
    ELSE
      receiver := 2;
    END IF;

    UPDATE individual_matches
    SET 
      team1_handicap = avg_h1,
      team2_handicap = avg_h2,
      strokes_given = strokes,
      strokes_receiver = CASE WHEN strokes > 0 THEN receiver ELSE NULL END
    WHERE id = im_record.id;

  END LOOP;
END $$;