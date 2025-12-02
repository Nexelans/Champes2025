/*
  # Recalculate stroke allocations with new 3/4 formula

  This migration recalculates all existing individual matches using the new stroke formula:
  - Round both handicaps to nearest integer
  - Calculate 3/4 of the difference
  - Floor the result to get the number of strokes

  Examples:
  - 21.5 vs 21.3 => 22 vs 21 => diff=1 => 1*0.75=0.75 => floor=0 (previously might have been 1)
  - 30 vs 23.3 => 30 vs 23 => diff=7 => 7*0.75=5.25 => floor=5
*/

DO $$
DECLARE
  match_record RECORD;
  rounded_h1 INTEGER;
  rounded_h2 INTEGER;
  diff INTEGER;
  new_strokes INTEGER;
  new_receiver INTEGER;
  new_score_detail TEXT;
BEGIN
  FOR match_record IN 
    SELECT id, team1_handicap, team2_handicap, team1_player2_id
    FROM individual_matches
  LOOP
    rounded_h1 := ROUND(match_record.team1_handicap);
    rounded_h2 := ROUND(match_record.team2_handicap);
    diff := ABS(rounded_h1 - rounded_h2);
    new_strokes := FLOOR(diff * 0.75);
    
    IF match_record.team1_handicap > match_record.team2_handicap THEN
      new_receiver := 1;
    ELSE
      new_receiver := 2;
    END IF;
    
    IF new_strokes > 0 THEN
      IF match_record.team1_player2_id IS NOT NULL THEN
        new_score_detail := new_strokes || ' coup' || 
          CASE WHEN new_strokes > 1 THEN 's' ELSE '' END || ' rendu' ||
          CASE WHEN new_strokes > 1 THEN 's' ELSE '' END || 
          ' à l''équipe ' || new_receiver;
      ELSE
        new_score_detail := new_strokes || ' coup' || 
          CASE WHEN new_strokes > 1 THEN 's' ELSE '' END || ' rendu' ||
          CASE WHEN new_strokes > 1 THEN 's' ELSE '' END || 
          ' au joueur ' || new_receiver;
      END IF;
    ELSE
      new_score_detail := 'Égalité de handicap';
      new_receiver := NULL;
    END IF;
    
    UPDATE individual_matches
    SET 
      strokes_given = new_strokes,
      strokes_receiver = new_receiver,
      score_detail = new_score_detail
    WHERE id = match_record.id;
  END LOOP;
END $$;
