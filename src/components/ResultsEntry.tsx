import { useState, useEffect } from 'react';
import { Save, AlertCircle, Loader2 } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

interface Match {
  id: string;
  round_number: number;
  match_date: string;
  team1_id: string;
  team2_id: string;
  team1_club: string;
  team2_club: string;
  host_club_id: string;
  is_host: boolean;
  division: string;
}

interface IndividualMatch {
  id: string;
  match_order: number;
  team1_player_id: string;
  team2_player_id: string;
  team1_player_name: string;
  team2_player_name: string;
  team1_player2_id?: string;
  team2_player2_id?: string;
  team1_player2_name?: string;
  team2_player2_name?: string;
  team1_handicap?: number;
  team2_handicap?: number;
  strokes_given?: number;
  strokes_receiver?: number;
  result: string | null;
  score_detail: string | null;
  starting_hole: number | null;
  team1_points: number;
  team2_points: number;
}

interface AvailablePlayer {
  id: string;
  name: string;
  handicap_index: number;
}

export default function ResultsEntry() {
  const { captain, isAdmin } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [matches, setMatches] = useState<Match[]>([]);
  const [selectedMatch, setSelectedMatch] = useState<Match | null>(null);
  const [individualMatches, setIndividualMatches] = useState<IndividualMatch[]>([]);
  const [team1Players, setTeam1Players] = useState<AvailablePlayer[]>([]);
  const [team2Players, setTeam2Players] = useState<AvailablePlayer[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (captain || isAdmin) {
      loadMatches();
    }
  }, [captain, isAdmin]);

  useEffect(() => {
    if (selectedMatch) {
      loadIndividualMatches();
    }
  }, [selectedMatch]);

  const loadMatches = async () => {
    try {
      const { data: seasonData } = await supabase
        .from('seasons')
        .select('id')
        .eq('is_active', true)
        .maybeSingle();

      if (!seasonData) {
        setError('Aucune saison active');
        setLoading(false);
        return;
      }

      let query = supabase
        .from('matches')
        .select(`
          id,
          round_number,
          match_date,
          team1_id,
          team2_id,
          host_club_id,
          division,
          team1:teams!matches_team1_id_fkey(club:clubs(name)),
          team2:teams!matches_team2_id_fkey(club:clubs(name))
        `)
        .eq('season_id', seasonData.id)
        .lte('round_number', 5);

      if (!isAdmin && captain) {
        query = query
          .eq('division', captain.division)
          .eq('host_club_id', captain.club_id);
      }

      query = query.order('division').order('round_number').order('match_date');

      const { data: matchesData, error: matchesError } = await query;

      if (matchesError) throw matchesError;

      const formatted: Match[] = matchesData.map((m: any) => ({
        id: m.id,
        round_number: m.round_number,
        match_date: m.match_date,
        team1_id: m.team1_id,
        team2_id: m.team2_id,
        team1_club: m.team1?.club?.name || 'Inconnu',
        team2_club: m.team2?.club?.name || 'Inconnu',
        host_club_id: m.host_club_id,
        is_host: captain ? m.host_club_id === captain.club_id : true,
        division: m.division,
      }));

      setMatches(formatted);
    } catch (err) {
      console.error('Error loading matches:', err);
      setError('Erreur lors du chargement des rencontres');
    } finally {
      setLoading(false);
    }
  };

  const loadIndividualMatches = async () => {
    if (!selectedMatch) return;

    try {
      const { data, error } = await supabase
        .from('individual_matches')
        .select(`
          id,
          match_order,
          result,
          score_detail,
          starting_hole,
          team1_points,
          team2_points,
          team1_handicap,
          team2_handicap,
          strokes_given,
          strokes_receiver,
          team1_player_id,
          team2_player_id,
          team1_player2_id,
          team2_player2_id,
          team1_player:players!individual_matches_team1_player_id_fkey(first_name, last_name),
          team2_player:players!individual_matches_team2_player_id_fkey(first_name, last_name),
          team1_player2:players!individual_matches_team1_player2_id_fkey(first_name, last_name),
          team2_player2:players!individual_matches_team2_player2_id_fkey(first_name, last_name)
        `)
        .eq('match_id', selectedMatch.id)
        .order('match_order');

      if (error) throw error;

      const formatted: IndividualMatch[] = data.map((im: any) => ({
        id: im.id,
        match_order: im.match_order,
        team1_player_id: im.team1_player_id,
        team2_player_id: im.team2_player_id,
        team1_player2_id: im.team1_player2_id,
        team2_player2_id: im.team2_player2_id,
        team1_player_name: im.team1_player ? `${im.team1_player.first_name} ${im.team1_player.last_name}` : 'À définir',
        team2_player_name: im.team2_player ? `${im.team2_player.first_name} ${im.team2_player.last_name}` : 'À définir',
        team1_player2_name: im.team1_player2 ? `${im.team1_player2.first_name} ${im.team1_player2.last_name}` : undefined,
        team2_player2_name: im.team2_player2 ? `${im.team2_player2.first_name} ${im.team2_player2.last_name}` : undefined,
        team1_handicap: im.team1_handicap,
        team2_handicap: im.team2_handicap,
        strokes_given: im.strokes_given,
        strokes_receiver: im.strokes_receiver,
        result: im.result,
        score_detail: im.score_detail,
        starting_hole: im.starting_hole,
        team1_points: im.team1_points,
        team2_points: im.team2_points,
      }));

      setIndividualMatches(formatted);

      // Load available players for admin
      if (isAdmin) {
        const { data: selectionsData, error: selectionsError } = await supabase
          .from('match_player_selections')
          .select(`
            player_id,
            team_id,
            players!inner(
              id,
              first_name,
              last_name,
              handicap_index
            )
          `)
          .eq('match_id', selectedMatch.id);

        if (selectionsError) throw selectionsError;

        const team1Selected = selectionsData
          .filter((s: any) => s.team_id === selectedMatch.team1_id)
          .map((s: any) => ({
            id: s.players.id,
            name: `${s.players.first_name} ${s.players.last_name}`,
            handicap_index: s.players.handicap_index,
          }));

        const team2Selected = selectionsData
          .filter((s: any) => s.team_id === selectedMatch.team2_id)
          .map((s: any) => ({
            id: s.players.id,
            name: `${s.players.first_name} ${s.players.last_name}`,
            handicap_index: s.players.handicap_index,
          }));

        setTeam1Players(team1Selected);
        setTeam2Players(team2Selected);
      }
    } catch (err) {
      console.error('Error loading individual matches:', err);
      setError('Erreur lors du chargement des matchs individuels');
    }
  };

  const updateIndividualMatch = (id: string, field: 'result' | 'score_detail' | 'starting_hole', value: string | number | null) => {
    setIndividualMatches(prev =>
      prev.map(im => {
        if (im.id === id) {
          const updated = { ...im, [field]: value };

          if (field === 'result') {
            if (value === 'team1_win') {
              updated.team1_points = 2;
              updated.team2_points = 0;
            } else if (value === 'team2_win') {
              updated.team1_points = 0;
              updated.team2_points = 2;
            } else if (value === 'draw') {
              updated.team1_points = 1;
              updated.team2_points = 1;
            } else if (value === null) {
              updated.team1_points = 0;
              updated.team2_points = 0;
            }
          }

          return updated;
        }
        return im;
      })
    );
  };

  const calculateStrokesGiven = (handicap1: number, handicap2: number, isFoursome: boolean = false): { strokes: number, receiver: 1 | 2 } => {
    const roundedHandicap1 = Math.round(handicap1);
    const roundedHandicap2 = Math.round(handicap2);
    const diff = Math.abs(roundedHandicap1 - roundedHandicap2);
    const multiplier = isFoursome ? 0.375 : 0.75;
    const strokes = Math.round(diff * multiplier);
    const receiver = handicap1 > handicap2 ? 1 : 2;
    return { strokes, receiver };
  };

  const updatePlayer = (matchId: string, field: 'team1_player_id' | 'team2_player_id', playerId: string) => {
    setIndividualMatches(prev =>
      prev.map(im => {
        if (im.id === matchId) {
          const players = field === 'team1_player_id' ? team1Players : team2Players;
          const player = players.find(p => p.id === playerId);

          let updated = { ...im };

          if (field === 'team1_player_id') {
            updated.team1_player_id = playerId;
            updated.team1_player_name = player?.name || 'À définir';
            updated.team1_handicap = player?.handicap_index;
          } else {
            updated.team2_player_id = playerId;
            updated.team2_player_name = player?.name || 'À définir';
            updated.team2_handicap = player?.handicap_index;
          }

          // Recalculate strokes if both players are selected
          if (updated.team1_handicap !== undefined && updated.team2_handicap !== undefined) {
            const isFoursome = im.match_order >= 7;
            const strokeCalc = calculateStrokesGiven(updated.team1_handicap, updated.team2_handicap, isFoursome);
            updated.strokes_given = strokeCalc.strokes;
            updated.strokes_receiver = strokeCalc.receiver;
          }

          return updated;
        }
        return im;
      })
    );
  };

  const handleSave = async () => {
    if (!selectedMatch) return;

    setSaving(true);
    setError(null);

    try {
      // Validate player selections for admin
      if (isAdmin) {
        const team1UsedPlayers = individualMatches.map(im => im.team1_player_id).filter(Boolean);
        const team2UsedPlayers = individualMatches.map(im => im.team2_player_id).filter(Boolean);

        // Check for unique players (each player can only play once)
        const team1Unique = new Set(team1UsedPlayers);
        const team2Unique = new Set(team2UsedPlayers);

        if (team1Unique.size !== team1UsedPlayers.length) {
          throw new Error('Chaque joueur de l\'équipe 1 ne peut être sélectionné qu\'une seule fois');
        }

        if (team2Unique.size !== team2UsedPlayers.length) {
          throw new Error('Chaque joueur de l\'équipe 2 ne peut être sélectionné qu\'une seule fois');
        }

        // Check that all 8 matches have players assigned
        if (team1UsedPlayers.length !== 8) {
          throw new Error(`Tous les matchs de l'équipe 1 doivent avoir un joueur assigné (${team1UsedPlayers.length}/8)`);
        }

        if (team2UsedPlayers.length !== 8) {
          throw new Error(`Tous les matchs de l'équipe 2 doivent avoir un joueur assigné (${team2UsedPlayers.length}/8)`);
        }

        // Check that all selected players are from the available players
        const team1PlayerIds = team1Players.map(p => p.id);
        const team2PlayerIds = team2Players.map(p => p.id);

        const invalidTeam1 = team1UsedPlayers.some(id => !team1PlayerIds.includes(id));
        const invalidTeam2 = team2UsedPlayers.some(id => !team2PlayerIds.includes(id));

        if (invalidTeam1 || invalidTeam2) {
          throw new Error('Joueurs invalides sélectionnés. Veuillez sélectionner uniquement parmi les joueurs de la sélection du capitaine.');
        }
      }

      for (const im of individualMatches) {
        const updateData: any = {
          result: im.result,
          score_detail: im.score_detail,
          starting_hole: im.starting_hole,
          team1_points: im.team1_points,
          team2_points: im.team2_points,
        };

        // Add player IDs and recalculated handicaps/strokes if admin modified them
        if (isAdmin) {
          updateData.team1_player_id = im.team1_player_id;
          updateData.team2_player_id = im.team2_player_id;
          updateData.team1_handicap = im.team1_handicap;
          updateData.team2_handicap = im.team2_handicap;
          updateData.strokes_given = im.strokes_given;
          updateData.strokes_receiver = im.strokes_receiver;
        }

        const { error: updateError, data } = await supabase
          .from('individual_matches')
          .update(updateData)
          .eq('id', im.id)
          .select();

        if (updateError) {
          console.error('Error updating individual match:', updateError);
          throw new Error(`Impossible de mettre à jour le match individuel: ${updateError.message}`);
        }

        if (!data || data.length === 0) {
          throw new Error('Vous n\'avez pas les permissions nécessaires pour modifier ce match');
        }
      }

      const team1Total = individualMatches.reduce((sum, im) => sum + im.team1_points, 0);
      const team2Total = individualMatches.reduce((sum, im) => sum + im.team2_points, 0);

      const { error: matchUpdateError, data: matchData } = await supabase
        .from('matches')
        .update({
          team1_points: team1Total,
          team2_points: team2Total,
          status: 'completed',
        })
        .eq('id', selectedMatch.id)
        .select();

      if (matchUpdateError) {
        console.error('Error updating match:', matchUpdateError);
        throw new Error(`Impossible de mettre à jour le match: ${matchUpdateError.message}`);
      }

      if (!matchData || matchData.length === 0) {
        throw new Error('Vous n\'avez pas les permissions nécessaires pour finaliser ce match');
      }

      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      console.error('Error saving results:', err);
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('Erreur lors de l\'enregistrement des résultats');
      }
    } finally {
      setSaving(false);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  };

  const calculateTotals = () => {
    const team1Total = individualMatches.reduce((sum, im) => sum + im.team1_points, 0);
    const team2Total = individualMatches.reduce((sum, im) => sum + im.team2_points, 0);
    return { team1Total, team2Total };
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-12 w-12 text-emerald-600 animate-spin" />
      </div>
    );
  }

  const totals = selectedMatch ? calculateTotals() : { team1Total: 0, team2Total: 0 };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-slate-900">Saisie des résultats</h2>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start space-x-2">
          <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-red-800">{error}</p>
        </div>
      )}

      {success && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-center text-green-800">
          Résultats enregistrés avec succès !
        </div>
      )}

      <div className="bg-white rounded-xl shadow-md border border-slate-200 p-4 sm:p-6">
        <h3 className="text-lg font-semibold text-slate-900 mb-4">
          {isAdmin ? 'Sélectionner une rencontre' : 'Sélectionner une rencontre à domicile'}
        </h3>

        {isAdmin && matches.length > 0 && (
          <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-sm text-blue-800">
              En tant qu'administrateur, vous pouvez saisir ou corriger les résultats de tous les matchs.
            </p>
          </div>
        )}

        {matches.length === 0 ? (
          <p className="text-slate-600 text-center py-8">
            {isAdmin
              ? 'Aucune rencontre trouvée pour cette saison.'
              : 'Aucune rencontre à domicile trouvée. Seuls les capitaines qui reçoivent peuvent saisir les résultats.'
            }
          </p>
        ) : (
          <div className="space-y-3">
            {matches.map((match) => (
              <button
                key={match.id}
                onClick={() => setSelectedMatch(match)}
                className={`w-full p-5 rounded-xl border-2 text-left transition-all shadow-sm ${
                  selectedMatch?.id === match.id
                    ? 'border-emerald-500 bg-emerald-50 shadow-md'
                    : 'border-slate-200 hover:border-emerald-300 hover:bg-slate-50 active:bg-slate-100'
                }`}
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="px-3 py-1 bg-emerald-600 text-white text-sm font-bold rounded-lg">
                        J{match.round_number}
                      </div>
                      {isAdmin && (
                        <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs font-medium rounded-md">
                          {match.division === 'champe1' ? 'Champe 1' : 'Champe 2'}
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-slate-600 font-medium">{formatDate(match.match_date)}</p>
                  </div>
                  <div className="pt-1">
                    <p className="text-base font-bold text-slate-900 leading-tight">
                      {match.team1_club}
                    </p>
                    <p className="text-slate-500 text-sm my-1">contre</p>
                    <p className="text-base font-bold text-slate-900 leading-tight">
                      {match.team2_club}
                    </p>
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {selectedMatch && individualMatches.length > 0 && (
        <div className="bg-white rounded-xl shadow-md border border-slate-200 p-4 sm:p-6 space-y-4 sm:space-y-6">
          <div className="bg-gradient-to-br from-emerald-600 to-emerald-700 text-white rounded-xl p-6 shadow-lg">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex-1 text-center sm:text-left">
                <h3 className="text-lg sm:text-xl font-bold leading-tight">{selectedMatch.team1_club}</h3>
                <p className="text-emerald-100 text-xs sm:text-sm mt-1">Domicile</p>
              </div>
              <div className="text-center px-4">
                <div className="text-5xl sm:text-6xl font-bold tracking-tight">
                  {totals.team1Total} - {totals.team2Total}
                </div>
                <p className="text-emerald-100 text-xs sm:text-sm mt-2 font-medium">Points totaux</p>
              </div>
              <div className="flex-1 text-center sm:text-right">
                <h3 className="text-lg sm:text-xl font-bold leading-tight">{selectedMatch.team2_club}</h3>
                <p className="text-emerald-100 text-xs sm:text-sm mt-1">Extérieur</p>
              </div>
            </div>
          </div>

          <div className="bg-blue-50 border-2 border-blue-200 rounded-xl p-4">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-blue-800 space-y-1">
                <p className="font-semibold">Mode d'emploi</p>
                <p className="text-xs sm:text-sm">
                  Cliquez sur le résultat de chaque match. Victoire = 2 pts, nul = 1 pt chacun.
                </p>
                {isAdmin && (
                  <p className="text-xs sm:text-sm mt-2 font-medium">
                    En tant qu'administrateur, vous pouvez modifier les joueurs de chaque match.
                    Les coups rendus sont recalculés automatiquement.
                  </p>
                )}
              </div>
            </div>
          </div>

          <div className="space-y-4">
            {individualMatches.map((im) => (
              <div
                key={im.id}
                className="bg-white rounded-xl border-2 border-slate-200 overflow-hidden shadow-sm"
              >
                <div className="bg-gradient-to-r from-slate-50 to-slate-100 px-4 py-3 border-b border-slate-200">
                  <div className="flex items-center gap-3">
                    <div className="flex items-center justify-center w-10 h-10 bg-emerald-600 text-white rounded-full font-bold text-base">
                      {im.match_order}
                    </div>
                    <div className="flex-1">
                      <p className="text-xs font-medium text-slate-600 uppercase tracking-wide">
                        Match {im.match_order}
                      </p>
                      {im.strokes_given !== undefined && im.strokes_given > 0 && (
                        <p className="text-xs font-medium text-blue-600 mt-0.5">
                          {im.strokes_given} coup{im.strokes_given > 1 ? 's' : ''} rendu{im.strokes_given > 1 ? 's' : ''} {im.strokes_receiver === 1 ? `à ${selectedMatch.team1_club}` : `à ${selectedMatch.team2_club}`}
                        </p>
                      )}
                    </div>
                  </div>
                </div>

                <div className="p-4 space-y-3">
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex-1">
                      {isAdmin ? (
                        <div>
                          <label className="block text-xs font-medium text-slate-600 mb-1">
                            Joueur {selectedMatch.team1_club}
                          </label>
                          <select
                            value={im.team1_player_id}
                            onChange={(e) => updatePlayer(im.id, 'team1_player_id', e.target.value)}
                            className="w-full px-3 py-2 border-2 border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 text-sm bg-white"
                          >
                            <option value="">Sélectionner un joueur</option>
                            {team1Players.map((player) => (
                              <option key={player.id} value={player.id}>
                                {player.name} (Index: {player.handicap_index.toFixed(1)})
                              </option>
                            ))}
                          </select>
                          {im.team1_handicap !== undefined && im.team1_handicap !== null && (
                            <p className="text-xs text-slate-500 mt-1">Index: {im.team1_handicap.toFixed(1)}</p>
                          )}
                        </div>
                      ) : (
                        <>
                          <p className="font-semibold text-slate-900 text-base">{im.team1_player_name}</p>
                          {im.team1_player2_name && (
                            <p className="font-semibold text-slate-900 text-base">{im.team1_player2_name}</p>
                          )}
                          {im.team1_handicap !== undefined && im.team1_handicap !== null && (
                            <p className="text-xs text-slate-500 mt-1">Index: {im.team1_handicap.toFixed(1)}</p>
                          )}
                        </>
                      )}
                    </div>
                    <div className="text-slate-400 font-bold text-lg px-2">VS</div>
                    <div className="flex-1">
                      {isAdmin ? (
                        <div>
                          <label className="block text-xs font-medium text-slate-600 mb-1">
                            Joueur {selectedMatch.team2_club}
                          </label>
                          <select
                            value={im.team2_player_id}
                            onChange={(e) => updatePlayer(im.id, 'team2_player_id', e.target.value)}
                            className="w-full px-3 py-2 border-2 border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 text-sm bg-white"
                          >
                            <option value="">Sélectionner un joueur</option>
                            {team2Players.map((player) => (
                              <option key={player.id} value={player.id}>
                                {player.name} (Index: {player.handicap_index.toFixed(1)})
                              </option>
                            ))}
                          </select>
                          {im.team2_handicap !== undefined && im.team2_handicap !== null && (
                            <p className="text-xs text-slate-500 mt-1">Index: {im.team2_handicap.toFixed(1)}</p>
                          )}
                        </div>
                      ) : (
                        <>
                          <p className="font-semibold text-slate-900 text-base">{im.team2_player_name}</p>
                          {im.team2_player2_name && (
                            <p className="font-semibold text-slate-900 text-base">{im.team2_player2_name}</p>
                          )}
                          {im.team2_handicap !== undefined && im.team2_handicap !== null && (
                            <p className="text-xs text-slate-500 mt-1">Index: {im.team2_handicap.toFixed(1)}</p>
                          )}
                        </>
                      )}
                    </div>
                  </div>

                  <div className="pt-3 border-t border-slate-200">
                    <label className="block text-sm font-semibold text-slate-900 mb-3">
                      Résultat du match
                    </label>
                    <div className="grid grid-cols-1 gap-2">
                      <button
                        type="button"
                        onClick={() => updateIndividualMatch(im.id, 'result', 'team1_win')}
                        className={`px-4 py-3 rounded-lg font-medium transition-all text-left ${
                          im.result === 'team1_win'
                            ? 'bg-emerald-600 text-white shadow-md'
                            : 'bg-slate-50 text-slate-700 hover:bg-slate-100 border border-slate-200'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span>{selectedMatch.team1_club} gagne</span>
                          <span className="font-bold">2 pts</span>
                        </div>
                      </button>

                      <button
                        type="button"
                        onClick={() => updateIndividualMatch(im.id, 'result', 'draw')}
                        className={`px-4 py-3 rounded-lg font-medium transition-all text-left ${
                          im.result === 'draw'
                            ? 'bg-amber-500 text-white shadow-md'
                            : 'bg-slate-50 text-slate-700 hover:bg-slate-100 border border-slate-200'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span>Match nul</span>
                          <span className="font-bold">1 pt chacun</span>
                        </div>
                      </button>

                      <button
                        type="button"
                        onClick={() => updateIndividualMatch(im.id, 'result', 'team2_win')}
                        className={`px-4 py-3 rounded-lg font-medium transition-all text-left ${
                          im.result === 'team2_win'
                            ? 'bg-emerald-600 text-white shadow-md'
                            : 'bg-slate-50 text-slate-700 hover:bg-slate-100 border border-slate-200'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span>{selectedMatch.team2_club} gagne</span>
                          <span className="font-bold">2 pts</span>
                        </div>
                      </button>

                      {im.result && (
                        <button
                          type="button"
                          onClick={() => updateIndividualMatch(im.id, 'result', null)}
                          className="px-4 py-3 rounded-lg font-medium transition-all text-center bg-red-50 text-red-700 hover:bg-red-100 border border-red-200"
                        >
                          Effacer le résultat
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">
                        Score détaillé (optionnel)
                      </label>
                      <input
                        type="text"
                        value={im.score_detail || ''}
                        onChange={(e) => updateIndividualMatch(im.id, 'score_detail', e.target.value)}
                        placeholder="Ex: 7&6, tie, 6&4"
                        className="w-full px-4 py-3 border-2 border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 text-base"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">
                        Trou de départ (shotgun)
                      </label>
                      <select
                        value={im.starting_hole || ''}
                        onChange={(e) => {
                          const value = e.target.value;
                          updateIndividualMatch(im.id, 'starting_hole', value ? parseInt(value) : null);
                        }}
                        className="w-full px-4 py-3 border-2 border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 text-base bg-white"
                      >
                        <option value="">Sélectionner un trou</option>
                        {Array.from({ length: 18 }, (_, i) => i + 1).map((hole) => (
                          <option key={hole} value={hole}>
                            Trou {hole}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="flex flex-col sm:flex-row gap-3 pt-6">
            <button
              onClick={() => loadIndividualMatches()}
              className="flex-1 sm:flex-none px-6 py-4 border-2 border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors font-medium text-base"
            >
              Annuler
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex-1 px-8 py-4 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors flex items-center justify-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed font-semibold text-base shadow-md"
            >
              <Save className="w-5 h-5" />
              <span>{saving ? 'Enregistrement...' : 'Enregistrer les résultats'}</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
