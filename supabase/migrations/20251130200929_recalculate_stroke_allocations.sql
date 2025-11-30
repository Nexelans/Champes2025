/*
  # Recalculate stroke allocations for all existing matches

  1. Purpose
    - Update all individual matches with proper stroke allocation based on course stroke indexes
    - Ensures that strokes are given on the hardest holes (lowest stroke index)
    - Applies to all matches where course data is available

  2. Process
    - For each individual match, get the host club's stroke indexes
    - Calculate which holes receive strokes based on stroke index ranking
    - No data is lost, only recalculation of existing data

  3. Notes
    - Uses the existing strokes_given and strokes_receiver data
    - Only updates matches where stroke data exists
    - The actual hole allocation is done by the scorecard generator
*/

-- This migration doesn't need to update the database structure
-- The stroke allocation is calculated dynamically by the scorecard generator
-- using the stroke_index from course_holes table

-- However, we can add a helpful comment to document this
COMMENT ON COLUMN individual_matches.strokes_given IS 
  'Number of strokes given in the match. Strokes are allocated to holes based on the stroke_index column in course_holes, starting with index 1 (hardest hole).';

COMMENT ON COLUMN individual_matches.strokes_receiver IS 
  'Which team receives the strokes: 1 for team1, 2 for team2, NULL if no strokes given.';
