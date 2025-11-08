/*
  # Create function to get public captain info

  1. New Functions
    - `get_public_captain_info`: Returns only first_name and last_name for a given team_id
      - Safe for public access (anon role)
      - No sensitive data exposed
  
  2. Security
    - Function is accessible to everyone (anon and authenticated)
    - Returns only non-sensitive captain information
*/

-- Create function to get public captain information
CREATE OR REPLACE FUNCTION get_public_captain_info(p_team_id uuid)
RETURNS TABLE (
  first_name text,
  last_name text
) 
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT first_name, last_name
  FROM captains
  WHERE team_id = p_team_id
  LIMIT 1;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION get_public_captain_info(uuid) TO anon;
GRANT EXECUTE ON FUNCTION get_public_captain_info(uuid) TO authenticated;