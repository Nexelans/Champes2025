/*
  # Fix admin_users RLS policies

  1. Changes
    - Add policy allowing authenticated users to check if they are admin
    - This allows the auth flow to determine if a user is an admin

  2. Security
    - Users can only check their own admin status
    - This is required for the authentication context to work properly
*/

-- Allow users to check if they are admin by reading their own row
CREATE POLICY "Users can check their own admin status"
  ON public.admin_users
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());
