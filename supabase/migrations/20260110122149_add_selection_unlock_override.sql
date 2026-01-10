/*
  # Add Selection Unlock Override Feature

  ## Summary
  Allow administrators to temporarily unlock player selections for specific matches, 
  even after the normal deadline has passed.

  ## Changes to matches table
  - Add `selection_unlocked_until` column (timestamptz, nullable)
    - When set by admin, allows captains to modify selections until this timestamp
    - NULL means no override (normal deadline applies)

  ## New Functions
  - `is_selection_allowed(match_id uuid)` - Returns boolean
    - Checks if player selection is currently allowed for a match
    - Returns true if:
      * Current time < (match_date - days_before_match_lock) OR
      * selection_unlocked_until is set and current time < selection_unlocked_until
    - Returns false otherwise

  ## Use Cases
  - Admin enters unlock code and needs to allow captain to modify selections
  - Last-minute player changes due to emergencies
  - Administrative corrections

  ## Security Notes
  - Only admins can set selection_unlocked_until
  - Captains cannot modify this field
  - Helper function is public for easy checking in application code
*/

-- Add selection_unlocked_until column to matches table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'matches' AND column_name = 'selection_unlocked_until'
  ) THEN
    ALTER TABLE matches ADD COLUMN selection_unlocked_until timestamptz DEFAULT NULL;
  END IF;
END $$;

-- Create helper function to check if selection is allowed
CREATE OR REPLACE FUNCTION is_selection_allowed(match_id_param uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  match_record RECORD;
  lock_deadline timestamptz;
BEGIN
  -- Get match details and season configuration
  SELECT 
    m.match_date,
    m.selection_unlocked_until,
    s.days_before_match_lock
  INTO match_record
  FROM matches m
  JOIN seasons s ON m.season_id = s.id
  WHERE m.id = match_id_param;

  -- If match not found, return false
  IF NOT FOUND THEN
    RETURN false;
  END IF;

  -- Calculate the normal lock deadline
  lock_deadline := match_record.match_date - (match_record.days_before_match_lock || ' days')::interval;

  -- Allow selection if:
  -- 1. We haven't reached the normal deadline yet, OR
  -- 2. Admin has set an unlock override and we haven't reached it yet
  RETURN (
    now() < lock_deadline
    OR (match_record.selection_unlocked_until IS NOT NULL 
        AND now() < match_record.selection_unlocked_until)
  );
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION is_selection_allowed(uuid) TO authenticated;

-- Add comment for documentation
COMMENT ON FUNCTION is_selection_allowed(uuid) IS 
'Checks if player selection modifications are currently allowed for a given match. Returns true if before deadline or if admin has set an unlock override.';

COMMENT ON COLUMN matches.selection_unlocked_until IS 
'Optional timestamp set by admin to allow selection modifications past the normal deadline. NULL means no override.';