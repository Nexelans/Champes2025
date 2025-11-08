/*
  # Create public view for captain information

  1. New Views
    - `public_captains_view`: View exposing only non-sensitive captain data
      - id, team_id, first_name, last_name
      - Excludes: phone, email, user_id
  
  2. Security
    - View is accessible to everyone (anon and authenticated)
    - Sensitive fields (phone, email) remain in captains table
    - Frontend will use this view for public display
    - Authenticated users can still access captains table directly for full data
*/

-- Create view with only public captain information
CREATE OR REPLACE VIEW public_captains_view AS
SELECT 
  id,
  team_id,
  first_name,
  last_name
FROM captains;

-- Grant access to the view
GRANT SELECT ON public_captains_view TO anon;
GRANT SELECT ON public_captains_view TO authenticated;

-- Update the RLS policy for captains table
-- Remove public access, keep only authenticated
DROP POLICY IF EXISTS "Public can view captain names" ON captains;

CREATE POLICY "Only authenticated can view captains table"
  ON captains
  FOR SELECT
  TO authenticated
  USING (true);