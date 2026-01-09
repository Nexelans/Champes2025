/*
  # Fix Captain Host Permissions

  1. Changes
    - Allow captains to update results for ANY match hosted at their club
    - Previously required captain to be in the match AND be hosting
    - Now only requires that the match is hosted at their club
  
  2. Security
    - Captains can update results for all matches hosted at their club
    - This is correct because the hosting captain is responsible for entering all results
*/

-- Drop the old restrictive policy for individual_matches
DROP POLICY IF EXISTS "Captains update individual matches for hosted games" ON individual_matches;

-- Create new policy: captains can update individual matches for any match hosted at their club
CREATE POLICY "Captains update individual matches at their club"
  ON individual_matches
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM matches m
      JOIN captains c ON c.user_id = auth.uid()
      JOIN teams t ON t.id = c.team_id
      WHERE m.id = individual_matches.match_id
      AND m.host_club_id = t.club_id
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM matches m
      JOIN captains c ON c.user_id = auth.uid()
      JOIN teams t ON t.id = c.team_id
      WHERE m.id = individual_matches.match_id
      AND m.host_club_id = t.club_id
    )
  );

-- Drop the old restrictive policy for matches
DROP POLICY IF EXISTS "Captains update match results for hosted games" ON matches;

-- Create new policy: captains can update match results for any match hosted at their club
CREATE POLICY "Captains update matches at their club"
  ON matches
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM captains c
      JOIN teams t ON t.id = c.team_id
      WHERE matches.host_club_id = t.club_id
      AND c.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM captains c
      JOIN teams t ON t.id = c.team_id
      WHERE matches.host_club_id = t.club_id
      AND c.user_id = auth.uid()
    )
  );
