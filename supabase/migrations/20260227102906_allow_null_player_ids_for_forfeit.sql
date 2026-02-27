
/*
  # Allow null player IDs in individual_matches for forfeit cases

  In finals (foursomes), a team may have fewer pairs than the other.
  The missing pair results in a forfeit match where player IDs are null.

  ## Changes
  - Make team1_player_id nullable
  - Make team2_player_id nullable
*/

ALTER TABLE individual_matches ALTER COLUMN team1_player_id DROP NOT NULL;
ALTER TABLE individual_matches ALTER COLUMN team2_player_id DROP NOT NULL;
