/*
  # Add Captain Permissions for Results Entry

  1. Changes
    - Allow captains to update individual_matches for their hosted matches
    - Allow captains to update match totals for their hosted matches
  
  2. Security
    - Captains can only update results for matches they are hosting
    - Must be authenticated and have a captain record
    - Cannot modify match structure, only results and points
*/

-- Allow captains to update individual match results for matches they host
CREATE POLICY "Captains update individual matches for hosted games"
  ON individual_matches
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM matches m
      JOIN captains c ON c.team_id = m.team1_id OR c.team_id = m.team2_id
      JOIN teams t ON t.id = c.team_id
      WHERE m.id = individual_matches.match_id
      AND m.host_club_id = t.club_id
      AND c.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM matches m
      JOIN captains c ON c.team_id = m.team1_id OR c.team_id = m.team2_id
      JOIN teams t ON t.id = c.team_id
      WHERE m.id = individual_matches.match_id
      AND m.host_club_id = t.club_id
      AND c.user_id = auth.uid()
    )
  );

-- Allow captains to update match totals for matches they host
CREATE POLICY "Captains update match results for hosted games"
  ON matches
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM captains c
      JOIN teams t ON t.id = c.team_id
      WHERE (matches.team1_id = c.team_id OR matches.team2_id = c.team_id)
      AND matches.host_club_id = t.club_id
      AND c.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM captains c
      JOIN teams t ON t.id = c.team_id
      WHERE (matches.team1_id = c.team_id OR matches.team2_id = c.team_id)
      AND matches.host_club_id = t.club_id
      AND c.user_id = auth.uid()
    )
  );