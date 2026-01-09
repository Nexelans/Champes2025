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
  team1_player_name: string;
  team2_player_name: string;
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

export default function ResultsEntry() {
  const { captain, isAdmin } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [matches, setMatches] = useState<Match[]>([]);
  const [selectedMatch, setSelectedMatch] = useState<Match | null>(null);
  const [individualMatches, setIndividualMatches] = useState<IndividualMatch[]>([]);
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
    } catch (err) {
      console.error('Error loading individual matches:', err);
      setError('Erreur lors du chargement des matchs individuels');
    }
  };

  const updateIndividualMatch = (id: string, field: 'result' | 'score_detail' | 'starting_hole', value: string | number) => {
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
            }
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
      for (const im of individualMatches) {
        const { error: updateError } = await supabase
          .from('individual_matches')
          .update({
            result: im.result,
            score_detail: im.score_detail,
            starting_hole: im.starting_hole,
            team1_points: im.team1_points,
            team2_points: im.team2_points,
          })
          .eq('id', im.id);

        if (updateError) throw updateError;
      }

      const team1Total = individualMatches.reduce((sum, im) => sum + im.team1_points, 0);
      const team2Total = individualMatches.reduce((sum, im) => sum + im.team2_points, 0);

      const { error: matchUpdateError } = await supabase
        .from('matches')
        .update({
          team1_points: team1Total,
          team2_points: team2Total,
          status: 'completed',
        })
        .eq('id', selectedMatch.id);

      if (matchUpdateError) throw matchUpdateError;

      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      console.error('Error saving results:', err);
      setError('Erreur lors de l\'enregistrement des résultats');
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
                          {im.strokes_given} coup{im.strokes_given > 1 ? 's' : ''} rendu{im.strokes_given > 1 ? 's' : ''}
                        </p>
                      )}
                    </div>
                  </div>
                </div>

                <div className="p-4 space-y-3">
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex-1">
                      <p className="font-semibold text-slate-900 text-base">{im.team1_player_name}</p>
                      {im.team1_player2_name && (
                        <p className="font-semibold text-slate-900 text-base">{im.team1_player2_name}</p>
                      )}
                      {im.team1_handicap !== undefined && im.team1_handicap !== null && (
                        <p className="text-xs text-slate-500 mt-1">Index: {im.team1_handicap.toFixed(1)}</p>
                      )}
                    </div>
                    <div className="text-slate-400 font-bold text-lg px-2">VS</div>
                    <div className="flex-1">
                      <p className="font-semibold text-slate-900 text-base">{im.team2_player_name}</p>
                      {im.team2_player2_name && (
                        <p className="font-semibold text-slate-900 text-base">{im.team2_player2_name}</p>
                      )}
                      {im.team2_handicap !== undefined && im.team2_handicap !== null && (
                        <p className="text-xs text-slate-500 mt-1">Index: {im.team2_handicap.toFixed(1)}</p>
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
                      <input
                        type="number"
                        min="1"
                        max="18"
                        value={im.starting_hole || ''}
                        onChange={(e) => {
                          const value = e.target.value;
                          updateIndividualMatch(im.id, 'starting_hole', value ? parseInt(value) : null);
                        }}
                        placeholder="1-18"
                        className="w-full px-4 py-3 border-2 border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 text-base [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                      />
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
