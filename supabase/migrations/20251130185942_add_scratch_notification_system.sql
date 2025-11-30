/*
  # Add scratch notification system

  1. New Tables
    - `scratch_notifications`
      - `id` (uuid, primary key)
      - `match_id` (uuid, foreign key to matches)
      - `team_id` (uuid, foreign key to teams)
      - `captain_id` (uuid, foreign key to captains)
      - `message` (text) - Explanation from captain
      - `status` (text) - 'pending', 'acknowledged', 'resolved'
      - `created_at` (timestamptz)
      - `acknowledged_at` (timestamptz)
      - `acknowledged_by` (uuid, foreign key to admin_users)

  2. Security
    - Enable RLS on `scratch_notifications` table
    - Captains can create notifications for their team
    - Captains can view their own notifications
    - Admins can view and update all notifications

  3. Notes
    - When a player scratches, captain creates a notification
    - Admin acknowledges the notification
    - Captain can then modify selection
    - Admin regenerates the matches when ready
*/

CREATE TABLE IF NOT EXISTS scratch_notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id uuid NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
  team_id uuid NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  captain_id uuid NOT NULL REFERENCES captains(id) ON DELETE CASCADE,
  message text NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'acknowledged', 'resolved')),
  created_at timestamptz DEFAULT now(),
  acknowledged_at timestamptz,
  acknowledged_by uuid REFERENCES admin_users(id),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE scratch_notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Captains can create scratch notifications"
  ON scratch_notifications
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM captains
      WHERE captains.id = scratch_notifications.captain_id
      AND captains.user_id = auth.uid()
    )
  );

CREATE POLICY "Captains can view their team notifications"
  ON scratch_notifications
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM captains
      WHERE captains.team_id = scratch_notifications.team_id
      AND captains.user_id = auth.uid()
    )
  );

CREATE POLICY "Admins can view all notifications"
  ON scratch_notifications
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admin_users
      WHERE admin_users.user_id = auth.uid()
    )
  );

CREATE POLICY "Admins can update notifications"
  ON scratch_notifications
  FOR UPDATE
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

CREATE INDEX IF NOT EXISTS idx_scratch_notifications_match 
  ON scratch_notifications(match_id);

CREATE INDEX IF NOT EXISTS idx_scratch_notifications_status 
  ON scratch_notifications(status);

CREATE INDEX IF NOT EXISTS idx_scratch_notifications_team 
  ON scratch_notifications(team_id);