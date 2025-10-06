/*
  # Add Admin Role System

  ## New Tables
  
  ### 1. `admin_users`
  Tracks admin users with elevated permissions
  - `id` (uuid, primary key)
  - `user_id` (uuid) - References auth.users
  - `email` (text)
  - `first_name` (text)
  - `last_name` (text)
  - `created_at` (timestamptz)

  ## Helper Functions
  
  ### `is_admin()`
  Function to check if current user is an admin
  
  ## Security Updates
  - Update all RLS policies to allow admin access
  - Admins can manage all data across all teams
*/

-- Create admin_users table
CREATE TABLE IF NOT EXISTS admin_users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid UNIQUE NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  email text UNIQUE NOT NULL,
  first_name text NOT NULL,
  last_name text NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Create index
CREATE INDEX IF NOT EXISTS idx_admin_users_user_id ON admin_users(user_id);

-- Enable Row Level Security
ALTER TABLE admin_users ENABLE ROW LEVEL SECURITY;

-- RLS Policies for admin_users
CREATE POLICY "Admins can view admin users"
  ON admin_users FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admin_users
      WHERE admin_users.user_id = auth.uid()
    )
  );

CREATE POLICY "Admins can insert admin users"
  ON admin_users FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM admin_users
      WHERE admin_users.user_id = auth.uid()
    )
  );

CREATE POLICY "Admins can update admin users"
  ON admin_users FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admin_users
      WHERE admin_users.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM admin_users
      WHERE admin_users.user_id = auth.uid()
    )
  );

-- Create helper function to check if user is admin
CREATE OR REPLACE FUNCTION is_admin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM admin_users
    WHERE user_id = auth.uid()
  );
$$;

-- Update RLS policies to allow admin access

-- Clubs
CREATE POLICY "Admins can manage clubs"
  ON clubs FOR ALL
  TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

-- Seasons
CREATE POLICY "Admins can manage seasons"
  ON seasons FOR ALL
  TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

-- Teams
CREATE POLICY "Admins can manage teams"
  ON teams FOR ALL
  TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

-- Captains - allow admins to manage all captains
CREATE POLICY "Admins can manage all captains"
  ON captains FOR ALL
  TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

-- Players - allow admins to manage all players
CREATE POLICY "Admins can manage all players"
  ON players FOR ALL
  TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

-- Team players - allow admins to manage all
CREATE POLICY "Admins can manage all team players"
  ON team_players FOR ALL
  TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

-- Matches - allow admins to manage all
CREATE POLICY "Admins can manage all matches"
  ON matches FOR ALL
  TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

-- Individual matches - allow admins to manage all
CREATE POLICY "Admins can manage all individual matches"
  ON individual_matches FOR ALL
  TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

-- Match lineups - allow admins to manage all
CREATE POLICY "Admins can manage all match lineups"
  ON match_lineups FOR ALL
  TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

-- Season clubs - allow admins to manage all
CREATE POLICY "Admins can manage all season clubs"
  ON season_clubs FOR ALL
  TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

-- Season dates - allow admins to manage all
CREATE POLICY "Admins can manage all season dates"
  ON season_dates FOR ALL
  TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());
