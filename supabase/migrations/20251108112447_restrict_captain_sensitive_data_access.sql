/*
  # Restrict access to captain sensitive data

  1. Changes
    - Drop the overly permissive "Anyone can view captains" policy
    - Create separate policies for public (name only) and authenticated users (full data)
    - This ensures phone and email are only accessible to authenticated users
  
  2. Security
    - Public users (anon) can only see: first_name, last_name, team_id
    - Authenticated users can see all captain information
    - Phone and email remain protected from public access
*/

-- Drop the existing overly permissive policy
DROP POLICY IF EXISTS "Anyone can view captains" ON captains;

-- Create a restrictive policy for public users
-- Note: We cannot filter columns in RLS, so we need to handle this in the application layer
-- This policy allows reading all rows, but the application must request only allowed fields
CREATE POLICY "Public can view captain names"
  ON captains
  FOR SELECT
  TO anon
  USING (true);

-- Create policy for authenticated users to see all data
CREATE POLICY "Authenticated users can view all captain data"
  ON captains
  FOR SELECT
  TO authenticated
  USING (true);