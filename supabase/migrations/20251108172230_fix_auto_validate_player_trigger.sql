/*
  # Fix auto_validate_player trigger

  1. Problem
    - The auto_validate_player function references NEW.validated
    - The correct column name is NEW.is_validated
    - This causes INSERT errors when captains try to add players

  2. Solution
    - Update the function to use NEW.is_validated instead of NEW.validated

  3. Security
    - No changes to security model
    - Maintains SECURITY DEFINER for proper execution
*/

CREATE OR REPLACE FUNCTION public.auto_validate_player()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  NEW.is_validated := true;
  RETURN NEW;
END;
$$;