/*
  # Cap Handicap Index at 30

  1. Changes
    - Update all players with handicap_index > 30 to set it to 30.0
    - Recalculate strokes for all individual matches involving these players

  2. Purpose
    - Golf competition rules cap handicap index at 30
    - Ensure all stroke calculations are correct after capping

  3. Security
    - No RLS changes needed
*/

-- Cap all handicap indexes at 30
UPDATE players
SET handicap_index = 30.0
WHERE handicap_index > 30;

-- Recalculate strokes for all individual matches
DO $$
DECLARE
  match_record RECORD;
  h1_player1 NUMERIC;
  h1_player2 NUMERIC;
  h2_player1 NUMERIC;
  h2_player2 NUMERIC;
  team1_rounded_avg NUMERIC;
  team2_rounded_avg NUMERIC;
  rounded_h1 INTEGER;
  rounded_h2 INTEGER;
  diff INTEGER;
  multiplier NUMERIC;
  new_strokes INTEGER;
  new_receiver INTEGER;
  new_score_detail TEXT;
  is_foursome BOOLEAN;
BEGIN
  FOR match_record IN 
    SELECT 
      im.id,
      im.team1_player_id,
      im.team1_player2_id,
      im.team2_player_id,
      im.team2_player2_id,
      CASE WHEN im.team1_player2_id IS NOT NULL THEN true ELSE false END as is_foursome_match
    FROM individual_matches im
  LOOP
    is_foursome := match_record.is_foursome_match;
    
    IF is_foursome THEN
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
      
      multiplier := 0.375;
      new_strokes := ROUND(diff * multiplier);
      
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
        strokes_receiver = new_receiver
      WHERE id = match_record.id;
    ELSE
      SELECT p1.handicap_index, p2.handicap_index
      INTO h1_player1, h2_player1
      FROM players p1, players p2
      WHERE p1.id = match_record.team1_player_id
        AND p2.id = match_record.team2_player_id;
      
      rounded_h1 := ROUND(h1_player1);
      rounded_h2 := ROUND(h2_player1);
      diff := ABS(rounded_h1 - rounded_h2);
      
      multiplier := 0.75;
      new_strokes := ROUND(diff * multiplier);
      
      IF h1_player1 > h2_player1 THEN
        new_receiver := 1;
      ELSE
        new_receiver := 2;
      END IF;
      
      IF new_strokes > 0 THEN
        new_score_detail := new_strokes || ' coup' || 
          CASE WHEN new_strokes > 1 THEN 's' ELSE '' END || ' rendu' ||
          CASE WHEN new_strokes > 1 THEN 's' ELSE '' END || 
          ' au joueur ' || new_receiver;
      ELSE
        new_score_detail := 'Égalité de handicap';
        new_receiver := NULL;
      END IF;
      
      UPDATE individual_matches
      SET 
        team1_handicap = h1_player1,
        team2_handicap = h2_player1,
        strokes_given = new_strokes,
        strokes_receiver = new_receiver
      WHERE id = match_record.id;
    END IF;
  END LOOP;
END $$;
