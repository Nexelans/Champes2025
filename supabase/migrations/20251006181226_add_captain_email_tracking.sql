/*
  # Add Email Tracking for Captains

  1. Changes
    - Add `invitation_sent_at` field to captains table
      - Tracks when the invitation email was sent
    - Add `invitation_opened_at` field to captains table
      - Tracks when captain opened the invitation email (future feature)
    - Add `first_login_at` field to captains table
      - Tracks when captain first logged into the system
    - Add `last_login_at` field to captains table
      - Tracks the most recent login
    - Add `login_count` field to captains table
      - Tracks total number of logins

  2. Notes
    - These fields help admin track captain engagement
    - Admin can identify captains who need follow-up
    - Useful for monitoring system adoption
*/

-- Add email and login tracking fields to captains table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'captains' AND column_name = 'invitation_sent_at'
  ) THEN
    ALTER TABLE captains ADD COLUMN invitation_sent_at timestamptz;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'captains' AND column_name = 'invitation_opened_at'
  ) THEN
    ALTER TABLE captains ADD COLUMN invitation_opened_at timestamptz;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'captains' AND column_name = 'first_login_at'
  ) THEN
    ALTER TABLE captains ADD COLUMN first_login_at timestamptz;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'captains' AND column_name = 'last_login_at'
  ) THEN
    ALTER TABLE captains ADD COLUMN last_login_at timestamptz;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'captains' AND column_name = 'login_count'
  ) THEN
    ALTER TABLE captains ADD COLUMN login_count integer DEFAULT 0;
  END IF;
END $$;
