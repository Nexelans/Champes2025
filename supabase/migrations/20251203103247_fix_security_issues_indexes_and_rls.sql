/*
  # Fix security and performance issues

  1. Add Missing Indexes for Foreign Keys
    - Add indexes for all foreign keys that are missing covering indexes
    - This improves query performance for joins and lookups

  2. Fix RLS Policies
    - Replace auth.uid() with (select auth.uid()) in RLS policies
    - This prevents re-evaluation for each row and improves performance

  3. Remove Unused Indexes
    - Remove unused indexes to reduce storage overhead

  4. Fix Function Search Path
    - Set proper search path for security definer functions
*/

-- ==========================================
-- 1. ADD MISSING INDEXES FOR FOREIGN KEYS
-- ==========================================

CREATE INDEX IF NOT EXISTS idx_captains_user_id ON captains(user_id);
CREATE INDEX IF NOT EXISTS idx_individual_matches_team1_player_id ON individual_matches(team1_player_id);
CREATE INDEX IF NOT EXISTS idx_individual_matches_team1_player2_id ON individual_matches(team1_player2_id);
CREATE INDEX IF NOT EXISTS idx_individual_matches_team2_player_id ON individual_matches(team2_player_id);
CREATE INDEX IF NOT EXISTS idx_individual_matches_team2_player2_id ON individual_matches(team2_player2_id);
CREATE INDEX IF NOT EXISTS idx_match_lineups_partner_player_id ON match_lineups(partner_player_id);
CREATE INDEX IF NOT EXISTS idx_match_player_selections_team_id ON match_player_selections(team_id);
CREATE INDEX IF NOT EXISTS idx_matches_host_club_id ON matches(host_club_id);
CREATE INDEX IF NOT EXISTS idx_players_club_id ON players(club_id);
CREATE INDEX IF NOT EXISTS idx_scratch_notifications_acknowledged_by ON scratch_notifications(acknowledged_by);
CREATE INDEX IF NOT EXISTS idx_scratch_notifications_captain_id ON scratch_notifications(captain_id);
CREATE INDEX IF NOT EXISTS idx_season_clubs_club_id ON season_clubs(club_id);
CREATE INDEX IF NOT EXISTS idx_season_dates_host_club_id ON season_dates(host_club_id);
CREATE INDEX IF NOT EXISTS idx_seasons_configuration_validated_by ON seasons(configuration_validated_by);

-- ==========================================
-- 2. REMOVE UNUSED INDEXES
-- ==========================================

DROP INDEX IF EXISTS idx_scratch_notifications_match;

-- ==========================================
-- 3. FIX RLS POLICIES FOR scratch_notifications
-- ==========================================

DROP POLICY IF EXISTS "Admins can update notifications" ON scratch_notifications;
DROP POLICY IF EXISTS "Admins can view all notifications" ON scratch_notifications;
DROP POLICY IF EXISTS "Captains can create scratch notifications" ON scratch_notifications;
DROP POLICY IF EXISTS "Captains can view their team notifications" ON scratch_notifications;

CREATE POLICY "Admins can update notifications"
  ON scratch_notifications
  FOR UPDATE
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

CREATE POLICY "Admins can view all notifications"
  ON scratch_notifications
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admin_users
      WHERE admin_users.user_id = (select auth.uid())
    )
  );

CREATE POLICY "Captains can create scratch notifications"
  ON scratch_notifications
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM captains
      WHERE captains.id = scratch_notifications.captain_id
      AND captains.user_id = (select auth.uid())
    )
  );

CREATE POLICY "Captains can view their team notifications"
  ON scratch_notifications
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM captains
      WHERE captains.team_id = scratch_notifications.team_id
      AND captains.user_id = (select auth.uid())
    )
  );

-- ==========================================
-- 4. FIX RLS POLICIES FOR course_holes
-- ==========================================

DROP POLICY IF EXISTS "Only admins can delete course holes" ON course_holes;
DROP POLICY IF EXISTS "Only admins can insert course holes" ON course_holes;
DROP POLICY IF EXISTS "Only admins can update course holes" ON course_holes;

CREATE POLICY "Only admins can delete course holes"
  ON course_holes
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admin_users
      WHERE admin_users.user_id = (select auth.uid())
    )
  );

CREATE POLICY "Only admins can insert course holes"
  ON course_holes
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM admin_users
      WHERE admin_users.user_id = (select auth.uid())
    )
  );

CREATE POLICY "Only admins can update course holes"
  ON course_holes
  FOR UPDATE
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
-- 5. FIX FUNCTION SEARCH PATH
-- ==========================================

ALTER FUNCTION delete_individual_matches_on_selection_change() SET search_path = pg_catalog, public;
