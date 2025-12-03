/*
  # Consolidate multiple permissive policies

  Replace multiple permissive SELECT policies with a single policy that uses OR conditions.
  This improves performance and simplifies policy management.

  Tables affected:
  - clubs
  - individual_matches
  - match_lineups
  - match_player_selections
  - matches
  - players
  - scratch_notifications
  - season_clubs
  - season_dates
  - seasons
  - team_players
  - teams
*/

-- ==========================================
-- CLUBS
-- ==========================================

DROP POLICY IF EXISTS "Admins can manage clubs" ON clubs;
DROP POLICY IF EXISTS "Anyone can view clubs" ON clubs;

CREATE POLICY "View clubs"
  ON clubs
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins manage clubs"
  ON clubs
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admin_users
      WHERE admin_users.user_id = (select auth.uid())
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM admin_users
      WHERE admin_users.user_id = (select auth.uid())
    )
  );

-- ==========================================
-- INDIVIDUAL_MATCHES
-- ==========================================

DROP POLICY IF EXISTS "Admins can manage individual matches" ON individual_matches;
DROP POLICY IF EXISTS "Anyone can view individual matches" ON individual_matches;

CREATE POLICY "View individual matches"
  ON individual_matches
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins manage individual matches"
  ON individual_matches
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admin_users
      WHERE admin_users.user_id = (select auth.uid())
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM admin_users
      WHERE admin_users.user_id = (select auth.uid())
    )
  );

-- ==========================================
-- MATCH_LINEUPS
-- ==========================================

DROP POLICY IF EXISTS "Admins and captains can manage lineups" ON match_lineups;
DROP POLICY IF EXISTS "Anyone can view match lineups" ON match_lineups;

CREATE POLICY "View match lineups"
  ON match_lineups
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins and captains manage lineups"
  ON match_lineups
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admin_users
      WHERE admin_users.user_id = (select auth.uid())
    )
    OR EXISTS (
      SELECT 1 FROM captains
      WHERE captains.user_id = (select auth.uid())
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM admin_users
      WHERE admin_users.user_id = (select auth.uid())
    )
    OR EXISTS (
      SELECT 1 FROM captains
      WHERE captains.user_id = (select auth.uid())
    )
  );

-- ==========================================
-- MATCH_PLAYER_SELECTIONS
-- ==========================================

DROP POLICY IF EXISTS "Admins and captains can manage selections" ON match_player_selections;
DROP POLICY IF EXISTS "Anyone can view selections" ON match_player_selections;
DROP POLICY IF EXISTS "Captains can manage team selections" ON match_player_selections;

CREATE POLICY "View selections"
  ON match_player_selections
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Manage selections"
  ON match_player_selections
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admin_users
      WHERE admin_users.user_id = (select auth.uid())
    )
    OR EXISTS (
      SELECT 1 FROM captains
      WHERE captains.team_id = match_player_selections.team_id
      AND captains.user_id = (select auth.uid())
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM admin_users
      WHERE admin_users.user_id = (select auth.uid())
    )
    OR EXISTS (
      SELECT 1 FROM captains
      WHERE captains.team_id = match_player_selections.team_id
      AND captains.user_id = (select auth.uid())
    )
  );

-- ==========================================
-- MATCHES
-- ==========================================

DROP POLICY IF EXISTS "Admins can manage matches" ON matches;
DROP POLICY IF EXISTS "Anyone can view matches" ON matches;

CREATE POLICY "View matches"
  ON matches
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins manage matches"
  ON matches
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admin_users
      WHERE admin_users.user_id = (select auth.uid())
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM admin_users
      WHERE admin_users.user_id = (select auth.uid())
    )
  );

-- ==========================================
-- PLAYERS
-- ==========================================

DROP POLICY IF EXISTS "Admins and captains can manage players" ON players;
DROP POLICY IF EXISTS "Anyone can view players" ON players;

CREATE POLICY "View players"
  ON players
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins and captains manage players"
  ON players
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admin_users
      WHERE admin_users.user_id = (select auth.uid())
    )
    OR EXISTS (
      SELECT 1 FROM captains c
      JOIN teams t ON c.team_id = t.id
      WHERE t.club_id = players.club_id
      AND c.user_id = (select auth.uid())
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM admin_users
      WHERE admin_users.user_id = (select auth.uid())
    )
    OR EXISTS (
      SELECT 1 FROM captains c
      JOIN teams t ON c.team_id = t.id
      WHERE t.club_id = players.club_id
      AND c.user_id = (select auth.uid())
    )
  );

-- ==========================================
-- SCRATCH_NOTIFICATIONS (consolidate SELECT)
-- ==========================================

DROP POLICY IF EXISTS "Admins can view all notifications" ON scratch_notifications;
DROP POLICY IF EXISTS "Captains can view their team notifications" ON scratch_notifications;

CREATE POLICY "View notifications"
  ON scratch_notifications
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admin_users
      WHERE admin_users.user_id = (select auth.uid())
    )
    OR EXISTS (
      SELECT 1 FROM captains
      WHERE captains.team_id = scratch_notifications.team_id
      AND captains.user_id = (select auth.uid())
    )
  );

-- ==========================================
-- SEASON_CLUBS
-- ==========================================

DROP POLICY IF EXISTS "Admins can manage season clubs" ON season_clubs;
DROP POLICY IF EXISTS "Anyone can view season clubs" ON season_clubs;

CREATE POLICY "View season clubs"
  ON season_clubs
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins manage season clubs"
  ON season_clubs
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admin_users
      WHERE admin_users.user_id = (select auth.uid())
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM admin_users
      WHERE admin_users.user_id = (select auth.uid())
    )
  );

-- ==========================================
-- SEASON_DATES
-- ==========================================

DROP POLICY IF EXISTS "Admins can manage season dates" ON season_dates;
DROP POLICY IF EXISTS "Anyone can view season dates" ON season_dates;

CREATE POLICY "View season dates"
  ON season_dates
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins manage season dates"
  ON season_dates
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admin_users
      WHERE admin_users.user_id = (select auth.uid())
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM admin_users
      WHERE admin_users.user_id = (select auth.uid())
    )
  );

-- ==========================================
-- SEASONS
-- ==========================================

DROP POLICY IF EXISTS "Admins can manage seasons" ON seasons;
DROP POLICY IF EXISTS "Anyone can view seasons" ON seasons;

CREATE POLICY "View seasons"
  ON seasons
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins manage seasons"
  ON seasons
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admin_users
      WHERE admin_users.user_id = (select auth.uid())
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM admin_users
      WHERE admin_users.user_id = (select auth.uid())
    )
  );

-- ==========================================
-- TEAM_PLAYERS
-- ==========================================

DROP POLICY IF EXISTS "Admins and captains can manage team players" ON team_players;
DROP POLICY IF EXISTS "Anyone can view team players" ON team_players;

CREATE POLICY "View team players"
  ON team_players
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins and captains manage team players"
  ON team_players
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admin_users
      WHERE admin_users.user_id = (select auth.uid())
    )
    OR EXISTS (
      SELECT 1 FROM captains c
      WHERE c.team_id = team_players.team_id
      AND c.user_id = (select auth.uid())
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM admin_users
      WHERE admin_users.user_id = (select auth.uid())
    )
    OR EXISTS (
      SELECT 1 FROM captains c
      WHERE c.team_id = team_players.team_id
      AND c.user_id = (select auth.uid())
    )
  );

-- ==========================================
-- TEAMS
-- ==========================================

DROP POLICY IF EXISTS "Admins can manage teams" ON teams;
DROP POLICY IF EXISTS "Anyone can view teams" ON teams;

CREATE POLICY "View teams"
  ON teams
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins manage teams"
  ON teams
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admin_users
      WHERE admin_users.user_id = (select auth.uid())
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM admin_users
      WHERE admin_users.user_id = (select auth.uid())
    )
  );
