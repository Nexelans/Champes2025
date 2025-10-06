/*
  # Fix Admin Creation RLS Policy

  ## Changes
  - Drop restrictive admin_users policies
  - Add policy to allow first admin creation when no admins exist
  - Add policy to allow existing admins to manage other admins
  
  ## Security
  - Only allows insert if no admin users exist OR if user is already an admin
  - Prevents unauthorized admin creation
*/

-- Drop existing policies
DROP POLICY IF EXISTS "Admins can view admin users" ON admin_users;
DROP POLICY IF EXISTS "Admins can insert admin users" ON admin_users;
DROP POLICY IF EXISTS "Admins can update admin users" ON admin_users;

-- Allow anyone to view if they are an admin
CREATE POLICY "Admins can view admin users"
  ON admin_users FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admin_users
      WHERE admin_users.user_id = auth.uid()
    )
  );

-- Allow insert if no admins exist (first admin) OR if user is already an admin
CREATE POLICY "Allow first admin creation or admin-managed creation"
  ON admin_users FOR INSERT
  TO authenticated
  WITH CHECK (
    NOT EXISTS (SELECT 1 FROM admin_users LIMIT 1)
    OR EXISTS (
      SELECT 1 FROM admin_users
      WHERE admin_users.user_id = auth.uid()
    )
  );

-- Allow admins to update admin users
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

-- Allow admins to delete admin users (but not themselves)
CREATE POLICY "Admins can delete other admin users"
  ON admin_users FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admin_users a
      WHERE a.user_id = auth.uid()
    )
    AND user_id != auth.uid()
  );
