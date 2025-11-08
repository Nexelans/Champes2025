/*
  # Fix Anonymous Access to Public Data

  1. Problem
    - Current RLS policies only allow authenticated users to view data
    - Anonymous (non-logged in) users cannot see matches, teams, clubs, etc.
    - This breaks the public calendar and matches views

  2. Solution
    - Update SELECT policies on public tables to allow both authenticated and anon users
    - Tables affected: clubs, teams, matches, individual_matches, match_lineups, 
      match_player_selections, players, season_clubs, season_dates, seasons, team_players

  3. Security
    - Only SELECT operations are opened to anon
    - All INSERT/UPDATE/DELETE operations remain restricted to authenticated users
    - Admins and captains maintain their management permissions
*/

-- =====================================================
-- UPDATE SELECT POLICIES TO ALLOW ANONYMOUS ACCESS
-- =====================================================

-- CLUBS
DROP POLICY IF EXISTS "Anyone can view clubs" ON public.clubs;
CREATE POLICY "Anyone can view clubs"
  ON public.clubs FOR SELECT
  TO authenticated, anon
  USING (true);

-- TEAMS
DROP POLICY IF EXISTS "Anyone can view teams" ON public.teams;
CREATE POLICY "Anyone can view teams"
  ON public.teams FOR SELECT
  TO authenticated, anon
  USING (true);

-- MATCHES
DROP POLICY IF EXISTS "Anyone can view matches" ON public.matches;
CREATE POLICY "Anyone can view matches"
  ON public.matches FOR SELECT
  TO authenticated, anon
  USING (true);

-- INDIVIDUAL_MATCHES
DROP POLICY IF EXISTS "Anyone can view individual matches" ON public.individual_matches;
CREATE POLICY "Anyone can view individual matches"
  ON public.individual_matches FOR SELECT
  TO authenticated, anon
  USING (true);

-- MATCH_LINEUPS
DROP POLICY IF EXISTS "Anyone can view match lineups" ON public.match_lineups;
CREATE POLICY "Anyone can view match lineups"
  ON public.match_lineups FOR SELECT
  TO authenticated, anon
  USING (true);

-- MATCH_PLAYER_SELECTIONS
DROP POLICY IF EXISTS "Anyone can view selections" ON public.match_player_selections;
CREATE POLICY "Anyone can view selections"
  ON public.match_player_selections FOR SELECT
  TO authenticated, anon
  USING (true);

-- PLAYERS
DROP POLICY IF EXISTS "Anyone can view players" ON public.players;
CREATE POLICY "Anyone can view players"
  ON public.players FOR SELECT
  TO authenticated, anon
  USING (true);

-- SEASON_CLUBS
DROP POLICY IF EXISTS "Anyone can view season clubs" ON public.season_clubs;
CREATE POLICY "Anyone can view season clubs"
  ON public.season_clubs FOR SELECT
  TO authenticated, anon
  USING (true);

-- SEASON_DATES
DROP POLICY IF EXISTS "Anyone can view season dates" ON public.season_dates;
CREATE POLICY "Anyone can view season dates"
  ON public.season_dates FOR SELECT
  TO authenticated, anon
  USING (true);

-- SEASONS
DROP POLICY IF EXISTS "Anyone can view seasons" ON public.seasons;
CREATE POLICY "Anyone can view seasons"
  ON public.seasons FOR SELECT
  TO authenticated, anon
  USING (true);

-- TEAM_PLAYERS
DROP POLICY IF EXISTS "Anyone can view team players" ON public.team_players;
CREATE POLICY "Anyone can view team players"
  ON public.team_players FOR SELECT
  TO authenticated, anon
  USING (true);