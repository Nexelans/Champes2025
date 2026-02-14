/*
  # Enforce Handicap Cap at 30

  1. Changes
    - Cap all player handicap_index values at 30.0 (competition rules)
    - Recalculate all individual_matches strokes with capped handicaps
    - Ensure future calculations use capped values

  2. Impact
    - Theocaris (36.0 → 30.0) vs Rappy (31.4 → 30.0): no strokes given
    - Any other players > 30 will be capped

  3. Security
    - No RLS changes needed
*/

-- Cap all handicap indexes at 30.0
UPDATE players
SET handicap_index = 30.0
WHERE handicap_index > 30.0;

-- Recalculate all individual matches with updated handicaps
DO $$
DECLARE
  match_record RECORD;
  h1_player1 NUMERIC;
  h1_player2 NUMERIC;
  h2_player1 NUMERIC;
  h2_player2 NUMERIC;
  team1_avg NUMERIC;
  team2_avg NUMERIC;
  rounded_h1 INTEGER;
  rounded_h2 INTEGER;
  diff INTEGER;
  multiplier NUMERIC;
  new_strokes INTEGER;
  new_receiver INTEGER;
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
      -- Foursome: get handicaps of all 4 players (capped at 30)
      SELECT 
        LEAST(p1.handicap_index, 30), 
        LEAST(p2.handicap_index, 30), 
        LEAST(p3.handicap_index, 30), 
        LEAST(p4.handicap_index, 30)
      INTO h1_player1, h1_player2, h2_player1, h2_player2
      FROM players p1, players p2, players p3, players p4
      WHERE p1.id = match_record.team1_player_id
        AND p2.id = match_record.team1_player2_id
        AND p3.id = match_record.team2_player_id
        AND p4.id = match_record.team2_player2_id;
      
      -- Average of rounded handicaps for each team
      team1_avg := (ROUND(h1_player1) + ROUND(h1_player2)) / 2.0;
      team2_avg := (ROUND(h2_player1) + ROUND(h2_player2)) / 2.0;
      
      rounded_h1 := ROUND(team1_avg);
      rounded_h2 := ROUND(team2_avg);
      diff := ABS(rounded_h1 - rounded_h2);
      
      -- 3/8 of the difference for foursomes
      multiplier := 0.375;
      new_strokes := ROUND(diff * multiplier);
      
      IF team1_avg > team2_avg THEN
        new_receiver := 1;
      ELSIF team1_avg < team2_avg THEN
        new_receiver := 2;
      ELSE
        new_receiver := NULL;
      END IF;
      
      UPDATE individual_matches
      SET 
        team1_handicap = team1_avg,
        team2_handicap = team2_avg,
        strokes_given = new_strokes,
        strokes_receiver = new_receiver
      WHERE id = match_record.id;
    ELSE
      -- Singles: get handicaps (capped at 30)
      SELECT 
        LEAST(p1.handicap_index, 30), 
        LEAST(p2.handicap_index, 30)
      INTO h1_player1, h2_player1
      FROM players p1, players p2
      WHERE p1.id = match_record.team1_player_id
        AND p2.id = match_record.team2_player_id;
      
      rounded_h1 := ROUND(h1_player1);
      rounded_h2 := ROUND(h2_player1);
      diff := ABS(rounded_h1 - rounded_h2);
      
      -- 3/4 of the difference for singles
      multiplier := 0.75;
      new_strokes := ROUND(diff * multiplier);
      
      IF h1_player1 > h2_player1 THEN
        new_receiver := 1;
      ELSIF h1_player1 < h2_player1 THEN
        new_receiver := 2;
      ELSE
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
