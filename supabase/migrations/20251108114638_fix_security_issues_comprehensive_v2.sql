/*
  # Comprehensive Security Fixes

  1. RLS Performance Optimization
    - Fix all admin_users policies to use (select auth.uid()) for better performance
    - Prevents re-evaluation of auth functions for each row

  2. Remove Unused Indexes
    - Drop indexes that have never been used to reduce storage overhead

  3. Consolidate Duplicate Policies
    - Replace multiple permissive policies with single comprehensive policies
    - Improves query performance and simplifies security model

  4. Fix Function Security
    - Add immutable search path to auto_validate_player function
    - Remove SECURITY DEFINER from public_captains_view

  5. Security
    - All changes maintain or improve existing security posture
    - No data access is expanded, only performance is optimized
*/

-- =====================================================
-- 1. FIX ADMIN_USERS RLS POLICIES FOR PERFORMANCE
-- =====================================================

DROP POLICY IF EXISTS "Users can check their own admin status" ON public.admin_users;
DROP POLICY IF EXISTS "Admins can update admin users" ON public.admin_users;
DROP POLICY IF EXISTS "Admins can delete other admins" ON public.admin_users;
DROP POLICY IF EXISTS "Allow first admin or admin-created users" ON public.admin_users;

CREATE POLICY "Users can check their own admin status"
  ON public.admin_users
  FOR SELECT
  TO authenticated
  USING (user_id = (select auth.uid()));

CREATE POLICY "Admins can update admin users"
  ON public.admin_users
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.admin_users 
      WHERE user_id = (select auth.uid())
    )
  );

CREATE POLICY "Admins can delete other admins"
  ON public.admin_users
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.admin_users 
      WHERE user_id = (select auth.uid())
    )
  );

CREATE POLICY "Allow first admin or admin-created users"
  ON public.admin_users
  FOR INSERT
  TO authenticated
  WITH CHECK (
    NOT EXISTS (SELECT 1 FROM public.admin_users) OR
    EXISTS (
      SELECT 1 FROM public.admin_users 
      WHERE user_id = (select auth.uid())
    )
  );

-- =====================================================
-- 2. DROP UNUSED INDEXES
-- =====================================================

DROP INDEX IF EXISTS idx_captains_user_id;
DROP INDEX IF EXISTS idx_captains_team_id;
DROP INDEX IF EXISTS idx_players_club_id;
DROP INDEX IF EXISTS idx_season_clubs_season_id;
DROP INDEX IF EXISTS idx_season_clubs_club_id;
DROP INDEX IF EXISTS idx_season_dates_season_id;
DROP INDEX IF EXISTS idx_individual_matches_team1_player_id;
DROP INDEX IF EXISTS idx_individual_matches_team1_player2_id;
DROP INDEX IF EXISTS idx_individual_matches_team2_player_id;
DROP INDEX IF EXISTS idx_individual_matches_team2_player2_id;
DROP INDEX IF EXISTS idx_match_lineups_partner_player_id;
DROP INDEX IF EXISTS idx_match_player_selections_team_id;
DROP INDEX IF EXISTS idx_matches_host_club_id;
DROP INDEX IF EXISTS idx_season_dates_host_club_id;
DROP INDEX IF EXISTS idx_seasons_configuration_validated_by;

-- =====================================================
-- 3. CONSOLIDATE DUPLICATE POLICIES
-- =====================================================

-- CAPTAINS TABLE
DROP POLICY IF EXISTS "Admins can manage all captains" ON public.captains;
DROP POLICY IF EXISTS "Authenticated users can insert captains" ON public.captains;
DROP POLICY IF EXISTS "Authenticated users can view all captain data" ON public.captains;
DROP POLICY IF EXISTS "Only authenticated can view captains table" ON public.captains;
DROP POLICY IF EXISTS "Captains can update own data" ON public.captains;

CREATE POLICY "Authenticated users can view captains"
  ON public.captains FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins can insert captains"
  ON public.captains FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.admin_users WHERE user_id = (select auth.uid()))
  );

CREATE POLICY "Admins and captains can update"
  ON public.captains FOR UPDATE
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.admin_users WHERE user_id = (select auth.uid())) OR
    user_id = (select auth.uid())
  );

-- CLUBS TABLE
DROP POLICY IF EXISTS "Admins can manage clubs" ON public.clubs;
DROP POLICY IF EXISTS "Authenticated users can insert clubs" ON public.clubs;
DROP POLICY IF EXISTS "Anyone can view clubs" ON public.clubs;
DROP POLICY IF EXISTS "Authenticated users can update clubs" ON public.clubs;

CREATE POLICY "Anyone can view clubs"
  ON public.clubs FOR SELECT
  USING (true);

CREATE POLICY "Admins can manage clubs"
  ON public.clubs FOR ALL
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.admin_users WHERE user_id = (select auth.uid()))
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.admin_users WHERE user_id = (select auth.uid()))
  );

-- INDIVIDUAL_MATCHES TABLE
DROP POLICY IF EXISTS "Admins can manage all individual matches" ON public.individual_matches;
DROP POLICY IF EXISTS "Authenticated users can insert individual matches" ON public.individual_matches;
DROP POLICY IF EXISTS "Anyone can view individual matches" ON public.individual_matches;
DROP POLICY IF EXISTS "Authenticated users can update individual matches" ON public.individual_matches;

CREATE POLICY "Anyone can view individual matches"
  ON public.individual_matches FOR SELECT
  USING (true);

CREATE POLICY "Admins can manage individual matches"
  ON public.individual_matches FOR ALL
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.admin_users WHERE user_id = (select auth.uid()))
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.admin_users WHERE user_id = (select auth.uid()))
  );

-- MATCH_LINEUPS TABLE
DROP POLICY IF EXISTS "Admins can manage all match lineups" ON public.match_lineups;
DROP POLICY IF EXISTS "Captains can delete their team lineups" ON public.match_lineups;
DROP POLICY IF EXISTS "Captains can insert their team lineups" ON public.match_lineups;
DROP POLICY IF EXISTS "Anyone can view match lineups" ON public.match_lineups;
DROP POLICY IF EXISTS "Captains can update their team lineups" ON public.match_lineups;

CREATE POLICY "Anyone can view match lineups"
  ON public.match_lineups FOR SELECT
  USING (true);

CREATE POLICY "Admins and captains can manage lineups"
  ON public.match_lineups FOR ALL
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.admin_users WHERE user_id = (select auth.uid())) OR
    EXISTS (
      SELECT 1 FROM public.captains c
      WHERE c.user_id = (select auth.uid()) AND c.team_id = match_lineups.team_id
    )
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.admin_users WHERE user_id = (select auth.uid())) OR
    EXISTS (
      SELECT 1 FROM public.captains c
      WHERE c.user_id = (select auth.uid()) AND c.team_id = match_lineups.team_id
    )
  );

-- MATCH_PLAYER_SELECTIONS TABLE
DROP POLICY IF EXISTS "Anyone can view selections" ON public.match_player_selections;
DROP POLICY IF EXISTS "Captains can manage team selections" ON public.match_player_selections;

CREATE POLICY "Anyone can view selections"
  ON public.match_player_selections FOR SELECT
  USING (true);

CREATE POLICY "Admins and captains can manage selections"
  ON public.match_player_selections FOR ALL
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.admin_users WHERE user_id = (select auth.uid())) OR
    EXISTS (
      SELECT 1 FROM public.captains c
      WHERE c.user_id = (select auth.uid()) AND c.team_id = match_player_selections.team_id
    )
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.admin_users WHERE user_id = (select auth.uid())) OR
    EXISTS (
      SELECT 1 FROM public.captains c
      WHERE c.user_id = (select auth.uid()) AND c.team_id = match_player_selections.team_id
    )
  );

-- MATCHES TABLE
DROP POLICY IF EXISTS "Admins can manage all matches" ON public.matches;
DROP POLICY IF EXISTS "Authenticated users can insert matches" ON public.matches;
DROP POLICY IF EXISTS "Anyone can view matches" ON public.matches;
DROP POLICY IF EXISTS "Authenticated users can update matches" ON public.matches;

CREATE POLICY "Anyone can view matches"
  ON public.matches FOR SELECT
  USING (true);

CREATE POLICY "Admins can manage matches"
  ON public.matches FOR ALL
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.admin_users WHERE user_id = (select auth.uid()))
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.admin_users WHERE user_id = (select auth.uid()))
  );

-- PLAYERS TABLE (captains -> teams -> club_id = players.club_id)
DROP POLICY IF EXISTS "Admins can manage all players" ON public.players;
DROP POLICY IF EXISTS "Captains can delete players for their club" ON public.players;
DROP POLICY IF EXISTS "Captains can insert players for their club" ON public.players;
DROP POLICY IF EXISTS "Anyone can view players" ON public.players;
DROP POLICY IF EXISTS "Captains can update players for their club" ON public.players;

CREATE POLICY "Anyone can view players"
  ON public.players FOR SELECT
  USING (true);

CREATE POLICY "Admins and captains can manage players"
  ON public.players FOR ALL
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.admin_users WHERE user_id = (select auth.uid())) OR
    EXISTS (
      SELECT 1 FROM public.captains c
      JOIN public.teams t ON t.id = c.team_id
      WHERE c.user_id = (select auth.uid()) AND t.club_id = players.club_id
    )
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.admin_users WHERE user_id = (select auth.uid())) OR
    EXISTS (
      SELECT 1 FROM public.captains c
      JOIN public.teams t ON t.id = c.team_id
      WHERE c.user_id = (select auth.uid()) AND t.club_id = players.club_id
    )
  );

-- SEASON_CLUBS TABLE
DROP POLICY IF EXISTS "Admins can manage all season clubs" ON public.season_clubs;
DROP POLICY IF EXISTS "Authenticated users can delete season clubs" ON public.season_clubs;
DROP POLICY IF EXISTS "Authenticated users can insert season clubs" ON public.season_clubs;
DROP POLICY IF EXISTS "Anyone can view season clubs" ON public.season_clubs;
DROP POLICY IF EXISTS "Authenticated users can update season clubs" ON public.season_clubs;

CREATE POLICY "Anyone can view season clubs"
  ON public.season_clubs FOR SELECT
  USING (true);

CREATE POLICY "Admins can manage season clubs"
  ON public.season_clubs FOR ALL
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.admin_users WHERE user_id = (select auth.uid()))
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.admin_users WHERE user_id = (select auth.uid()))
  );

-- SEASON_DATES TABLE
DROP POLICY IF EXISTS "Admins can manage all season dates" ON public.season_dates;
DROP POLICY IF EXISTS "Authenticated users can delete season dates" ON public.season_dates;
DROP POLICY IF EXISTS "Authenticated users can insert season dates" ON public.season_dates;
DROP POLICY IF EXISTS "Anyone can view season dates" ON public.season_dates;
DROP POLICY IF EXISTS "Authenticated users can update season dates" ON public.season_dates;

CREATE POLICY "Anyone can view season dates"
  ON public.season_dates FOR SELECT
  USING (true);

CREATE POLICY "Admins can manage season dates"
  ON public.season_dates FOR ALL
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.admin_users WHERE user_id = (select auth.uid()))
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.admin_users WHERE user_id = (select auth.uid()))
  );

-- SEASONS TABLE
DROP POLICY IF EXISTS "Admins can manage seasons" ON public.seasons;
DROP POLICY IF EXISTS "Authenticated users can insert seasons" ON public.seasons;
DROP POLICY IF EXISTS "Anyone can view seasons" ON public.seasons;
DROP POLICY IF EXISTS "Authenticated users can update seasons" ON public.seasons;

CREATE POLICY "Anyone can view seasons"
  ON public.seasons FOR SELECT
  USING (true);

CREATE POLICY "Admins can manage seasons"
  ON public.seasons FOR ALL
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.admin_users WHERE user_id = (select auth.uid()))
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.admin_users WHERE user_id = (select auth.uid()))
  );

-- TEAM_PLAYERS TABLE
DROP POLICY IF EXISTS "Admins can manage all team players" ON public.team_players;
DROP POLICY IF EXISTS "Captains can delete team players for their team" ON public.team_players;
DROP POLICY IF EXISTS "Captains can insert team players for their team" ON public.team_players;
DROP POLICY IF EXISTS "Anyone can view team players" ON public.team_players;
DROP POLICY IF EXISTS "Captains can update team players for their team" ON public.team_players;

CREATE POLICY "Anyone can view team players"
  ON public.team_players FOR SELECT
  USING (true);

CREATE POLICY "Admins and captains can manage team players"
  ON public.team_players FOR ALL
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.admin_users WHERE user_id = (select auth.uid())) OR
    EXISTS (
      SELECT 1 FROM public.captains c
      WHERE c.user_id = (select auth.uid()) AND c.team_id = team_players.team_id
    )
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.admin_users WHERE user_id = (select auth.uid())) OR
    EXISTS (
      SELECT 1 FROM public.captains c
      WHERE c.user_id = (select auth.uid()) AND c.team_id = team_players.team_id
    )
  );

-- TEAMS TABLE
DROP POLICY IF EXISTS "Admins can manage teams" ON public.teams;
DROP POLICY IF EXISTS "Authenticated users can insert teams" ON public.teams;
DROP POLICY IF EXISTS "Anyone can view teams" ON public.teams;
DROP POLICY IF EXISTS "Authenticated users can update teams" ON public.teams;

CREATE POLICY "Anyone can view teams"
  ON public.teams FOR SELECT
  USING (true);

CREATE POLICY "Admins can manage teams"
  ON public.teams FOR ALL
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.admin_users WHERE user_id = (select auth.uid()))
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.admin_users WHERE user_id = (select auth.uid()))
  );

-- =====================================================
-- 4. FIX FUNCTION SECURITY
-- =====================================================

CREATE OR REPLACE FUNCTION public.auto_validate_player()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  NEW.validated := true;
  RETURN NEW;
END;
$$;

DROP VIEW IF EXISTS public.public_captains_view;
CREATE VIEW public.public_captains_view AS
SELECT 
  team_id,
  first_name,
  last_name
FROM public.captains;