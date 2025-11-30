/*
  # Add Stroke Index and Scorecard Support

  1. New Tables
    - `course_holes`
      - `id` (uuid, primary key)
      - `club_id` (uuid, foreign key to clubs)
      - `hole_number` (integer, 1-18)
      - `stroke_index` (integer, 1-18, difficulty ranking)
      - `par` (integer, par for the hole)
      - `created_at` (timestamp)
    
  2. Purpose
    - Store stroke index (difficulty) for each hole at each club
    - Used to calculate which holes receive strokes in matches
    - Par information for complete scorecard
    
  3. Security
    - Enable RLS on course_holes table
    - Allow public read access (needed for scorecards)
    - Only admins can insert/update/delete
*/

CREATE TABLE IF NOT EXISTS course_holes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id uuid REFERENCES clubs(id) ON DELETE CASCADE NOT NULL,
  hole_number integer NOT NULL CHECK (hole_number >= 1 AND hole_number <= 18),
  stroke_index integer NOT NULL CHECK (stroke_index >= 1 AND stroke_index <= 18),
  par integer NOT NULL CHECK (par >= 3 AND par <= 5),
  created_at timestamptz DEFAULT now(),
  UNIQUE(club_id, hole_number)
);

ALTER TABLE course_holes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view course holes"
  ON course_holes FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Only admins can insert course holes"
  ON course_holes FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM admin_users
      WHERE admin_users.user_id = auth.uid()
    )
  );

CREATE POLICY "Only admins can update course holes"
  ON course_holes FOR UPDATE
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

CREATE POLICY "Only admins can delete course holes"
  ON course_holes FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admin_users
      WHERE admin_users.user_id = auth.uid()
    )
  );

-- Add index for faster lookups
CREATE INDEX IF NOT EXISTS idx_course_holes_club_id ON course_holes(club_id);
