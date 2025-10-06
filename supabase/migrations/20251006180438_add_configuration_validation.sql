/*
  # Add Configuration Validation System

  1. Changes
    - Add `is_configuration_validated` field to seasons table
      - Tracks if the season configuration has been validated by admin
      - Defaults to false for new seasons
    - Add `configuration_validated_at` field to seasons table
      - Records when the configuration was validated
    - Add `configuration_validated_by` field to seasons table
      - Records which admin validated the configuration

  2. Notes
    - When is_configuration_validated is false, captains cannot access the system
    - Super admin can unlock with special code to make changes after validation
    - All required data must be present before validation (dates, captains with emails)
*/

-- Add configuration validation fields to seasons table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'seasons' AND column_name = 'is_configuration_validated'
  ) THEN
    ALTER TABLE seasons ADD COLUMN is_configuration_validated boolean DEFAULT false;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'seasons' AND column_name = 'configuration_validated_at'
  ) THEN
    ALTER TABLE seasons ADD COLUMN configuration_validated_at timestamptz;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'seasons' AND column_name = 'configuration_validated_by'
  ) THEN
    ALTER TABLE seasons ADD COLUMN configuration_validated_by uuid REFERENCES auth.users(id);
  END IF;
END $$;
