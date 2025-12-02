/*
  # Recalculate foursome stroke allocations with new 3/8 formula

  This migration recalculates all existing foursome matches (finale, round 6) using the new stroke formula:
  - Round each individual handicap to nearest integer
  - Calculate the average of rounded handicaps for each pair
  - Calculate 3/8 (0.375) of the difference between the two pair averages
  - Floor the result to get the number of strokes

  For singles matches (rounds 1-5), the formula remains 3/4 (already updated in previous migration).
*/

DO $$
DECLARE
  match_record RECORD;
  match_round INTEGER;
  h1_player1 NUMERIC;
  h1_player2 NUMERIC;
  h2_player1 NUMERIC;
  h2_player2 NUMERIC;
  team1_rounded_avg NUMERIC;
  team2_rounded_avg NUMERIC;
  rounded_h1 INTEGER;
  rounded_h2 INTEGER;
  diff NUMERIC;
  new_strokes INTEGER;
  new_receiver INTEGER;
  new_score_detail TEXT;
BEGIN
  FOR match_record IN 
    SELECT 
      im.id,
      im.team1_player_id,
      im.team1_player2_id,
      im.team2_player_id,
      im.team2_player2_id,
      m.round_number
    FROM individual_matches im
    JOIN matches m ON im.match_id = m.id
    WHERE im.team1_player2_id IS NOT NULL
  LOOP
    SELECT p1.handicap_index, p2.handicap_index, p3.handicap_index, p4.handicap_index
    INTO h1_player1, h1_player2, h2_player1, h2_player2
    FROM players p1, players p2, players p3, players p4
    WHERE p1.id = match_record.team1_player_id
      AND p2.id = match_record.team1_player2_id
      AND p3.id = match_record.team2_player_id
      AND p4.id = match_record.team2_player2_id;
    
    team1_rounded_avg := (ROUND(h1_player1) + ROUND(h1_player2)) / 2.0;
    team2_rounded_avg := (ROUND(h2_player1) + ROUND(h2_player2)) / 2.0;
    
    rounded_h1 := ROUND(team1_rounded_avg);
    rounded_h2 := ROUND(team2_rounded_avg);
    diff := ABS(rounded_h1 - rounded_h2);
    
    new_strokes := FLOOR(diff * 0.375);
    
    IF team1_rounded_avg > team2_rounded_avg THEN
      new_receiver := 1;
    ELSE
      new_receiver := 2;
    END IF;
    
    IF new_strokes > 0 THEN
      new_score_detail := new_strokes || ' coup' || 
        CASE WHEN new_strokes > 1 THEN 's' ELSE '' END || ' rendu' ||
        CASE WHEN new_strokes > 1 THEN 's' ELSE '' END || 
        ' à l''équipe ' || new_receiver;
    ELSE
      new_score_detail := 'Égalité de handicap';
      new_receiver := NULL;
    END IF;
    
    UPDATE individual_matches
    SET 
      team1_handicap = team1_rounded_avg,
      team2_handicap = team2_rounded_avg,
      strokes_given = new_strokes,
      strokes_receiver = new_receiver,
      score_detail = new_score_detail
    WHERE id = match_record.id;
  END LOOP;
END $$;
