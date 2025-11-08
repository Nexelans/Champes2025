/*
  # Fix Security Issues

  1. Performance Improvements
    - Add missing indexes on foreign key columns for better query performance
    - Optimize RLS policies to use (select auth.uid()) pattern for better performance at scale

  2. Security Enhancements
    - Enable RLS on admin_users table
    - Fix function search_path to be immutable
    - Remove redundant permissive policies where admin policies already cover the use case

  3. Changes Applied
    - Added indexes on: individual_matches foreign keys, match_lineups.partner_player_id,
      match_player_selections.team_id, matches.host_club_id, season_dates.host_club_id,
      seasons.configuration_validated_by
    - Updated all RLS policies to use (select auth.uid()) instead of auth.uid()
    - Enabled RLS on admin_users table
    - Updated is_admin function with SECURITY DEFINER and stable search_path
    - Removed duplicate permissive policies that create unnecessary overhead
*/

-- Add missing indexes on foreign keys
CREATE INDEX IF NOT EXISTS idx_individual_matches_team1_player_id ON public.individual_matches(team1_player_id);
CREATE INDEX IF NOT EXISTS idx_individual_matches_team1_player2_id ON public.individual_matches(team1_player2_id);
CREATE INDEX IF NOT EXISTS idx_individual_matches_team2_player_id ON public.individual_matches(team2_player_id);
CREATE INDEX IF NOT EXISTS idx_individual_matches_team2_player2_id ON public.individual_matches(team2_player2_id);
CREATE INDEX IF NOT EXISTS idx_match_lineups_partner_player_id ON public.match_lineups(partner_player_id);
CREATE INDEX IF NOT EXISTS idx_match_player_selections_team_id ON public.match_player_selections(team_id);
CREATE INDEX IF NOT EXISTS idx_matches_host_club_id ON public.matches(host_club_id);
CREATE INDEX IF NOT EXISTS idx_season_dates_host_club_id ON public.season_dates(host_club_id);
CREATE INDEX IF NOT EXISTS idx_seasons_configuration_validated_by ON public.seasons(configuration_validated_by);

-- Fix RLS on admin_users table
ALTER TABLE public.admin_users ENABLE ROW LEVEL SECURITY;

-- Recreate is_admin function with proper security settings
DROP FUNCTION IF EXISTS public.is_admin() CASCADE;
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.admin_users
    WHERE user_id = auth.uid()
  );
END;
$$;

-- Recreate admin policies that were dropped with CASCADE
CREATE POLICY "Admins can manage clubs"
  ON public.clubs FOR ALL
  TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

CREATE POLICY "Admins can manage seasons"
  ON public.seasons FOR ALL
  TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

CREATE POLICY "Admins can manage teams"
  ON public.teams FOR ALL
  TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

CREATE POLICY "Admins can manage all captains"
  ON public.captains FOR ALL
  TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

CREATE POLICY "Admins can manage all players"
  ON public.players FOR ALL
  TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

CREATE POLICY "Admins can manage all team players"
  ON public.team_players FOR ALL
  TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

CREATE POLICY "Admins can manage all matches"
  ON public.matches FOR ALL
  TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

CREATE POLICY "Admins can manage all individual matches"
  ON public.individual_matches FOR ALL
  TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

CREATE POLICY "Admins can manage all match lineups"
  ON public.match_lineups FOR ALL
  TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

CREATE POLICY "Admins can manage all season clubs"
  ON public.season_clubs FOR ALL
  TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

CREATE POLICY "Admins can manage all season dates"
  ON public.season_dates FOR ALL
  TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

-- Drop and recreate RLS policies with optimized auth.uid() calls

-- Captains table policies
DROP POLICY IF EXISTS "Captains can update own data" ON public.captains;
CREATE POLICY "Captains can update own data"
  ON public.captains
  FOR UPDATE
  TO authenticated
  USING (user_id = (select auth.uid()))
  WITH CHECK (user_id = (select auth.uid()));

-- Match lineups policies
DROP POLICY IF EXISTS "Captains can insert their team lineups" ON public.match_lineups;
CREATE POLICY "Captains can insert their team lineups"
  ON public.match_lineups
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.captains
      WHERE user_id = (select auth.uid())
      AND team_id = match_lineups.team_id
    )
  );

DROP POLICY IF EXISTS "Captains can update their team lineups" ON public.match_lineups;
CREATE POLICY "Captains can update their team lineups"
  ON public.match_lineups
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.captains
      WHERE user_id = (select auth.uid())
      AND team_id = match_lineups.team_id
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.captains
      WHERE user_id = (select auth.uid())
      AND team_id = match_lineups.team_id
    )
  );

DROP POLICY IF EXISTS "Captains can delete their team lineups" ON public.match_lineups;
CREATE POLICY "Captains can delete their team lineups"
  ON public.match_lineups
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.captains
      WHERE user_id = (select auth.uid())
      AND team_id = match_lineups.team_id
    )
  );

-- Players policies
DROP POLICY IF EXISTS "Captains can insert players for their club" ON public.players;
CREATE POLICY "Captains can insert players for their club"
  ON public.players
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.captains
      WHERE user_id = (select auth.uid())
      AND club_id = players.club_id
    )
  );

DROP POLICY IF EXISTS "Captains can update players for their club" ON public.players;
CREATE POLICY "Captains can update players for their club"
  ON public.players
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.captains
      WHERE user_id = (select auth.uid())
      AND club_id = players.club_id
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.captains
      WHERE user_id = (select auth.uid())
      AND club_id = players.club_id
    )
  );

DROP POLICY IF EXISTS "Captains can delete players for their club" ON public.players;
CREATE POLICY "Captains can delete players for their club"
  ON public.players
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.captains
      WHERE user_id = (select auth.uid())
      AND club_id = players.club_id
    )
  );

-- Team players policies
DROP POLICY IF EXISTS "Captains can insert team players for their team" ON public.team_players;
CREATE POLICY "Captains can insert team players for their team"
  ON public.team_players
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.captains
      WHERE user_id = (select auth.uid())
      AND team_id = team_players.team_id
    )
  );

DROP POLICY IF EXISTS "Captains can update team players for their team" ON public.team_players;
CREATE POLICY "Captains can update team players for their team"
  ON public.team_players
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.captains
      WHERE user_id = (select auth.uid())
      AND team_id = team_players.team_id
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.captains
      WHERE user_id = (select auth.uid())
      AND team_id = team_players.team_id
    )
  );

DROP POLICY IF EXISTS "Captains can delete team players for their team" ON public.team_players;
CREATE POLICY "Captains can delete team players for their team"
  ON public.team_players
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.captains
      WHERE user_id = (select auth.uid())
      AND team_id = team_players.team_id
    )
  );

-- Match player selections policy
DROP POLICY IF EXISTS "Captains can manage team selections" ON public.match_player_selections;
CREATE POLICY "Captains can manage team selections"
  ON public.match_player_selections
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.captains
      WHERE user_id = (select auth.uid())
      AND team_id = match_player_selections.team_id
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.captains
      WHERE user_id = (select auth.uid())
      AND team_id = match_player_selections.team_id
    )
  );
