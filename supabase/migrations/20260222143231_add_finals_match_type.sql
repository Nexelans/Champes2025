/*
  # Ajout du type de match pour les finales

  ## Objectif
  Permettre de distinguer les matchs de finale (1re, 3e, 5e place) des matchs réguliers.

  ## Modifications
  - Ajout de la colonne `match_type` dans la table `matches`
    - Valeurs possibles : 'regular' (journée normale), 'final_1st' (finale 1re/2e place), 
      'final_3rd' (match 3e/4e place), 'final_5th' (match 5e/6e place)
    - Valeur par défaut : 'regular'
  
  ## Notes
  - Tous les matchs existants restent 'regular'
  - Les 3 matchs de finale par division seront créés avec round_number = 6 et le type approprié
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'matches' AND column_name = 'match_type'
  ) THEN
    ALTER TABLE matches ADD COLUMN match_type text NOT NULL DEFAULT 'regular';
  END IF;
END $$;
