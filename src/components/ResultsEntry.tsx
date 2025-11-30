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
  team1_points: number;
  team2_points: number;
}

export default function ResultsEntry() {
  const { captain } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [matches, setMatches] = useState<Match[]>([]);
  const [selectedMatch, setSelectedMatch] = useState<Match | null>(null);
  const [individualMatches, setIndividualMatches] = useState<IndividualMatch[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (captain) {
      loadMatches();
    }
  }, [captain]);

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

      const { data: matchesData, error: matchesError } = await supabase
        .from('matches')
        .select(`
          id,
          round_number,
          match_date,
          team1_id,
          team2_id,
          host_club_id,
          team1:teams!matches_team1_id_fkey(club:clubs(name)),
          team2:teams!matches_team2_id_fkey(club:clubs(name))
        `)
        .eq('season_id', seasonData.id)
        .eq('division', captain!.division)
        .eq('host_club_id', captain!.club_id)
        .lte('round_number', 5)
        .order('round_number')
        .order('match_date');

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
        is_host: m.host_club_id === captain!.club_id,
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
        team1_points: im.team1_points,
        team2_points: im.team2_points,
      }));

      setIndividualMatches(formatted);
    } catch (err) {
      console.error('Error loading individual matches:', err);
      setError('Erreur lors du chargement des matchs individuels');
    }
  };

  const updateIndividualMatch = (id: string, field: 'result' | 'score_detail', value: string) => {
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

      <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6">
        <h3 className="text-lg font-semibold text-slate-900 mb-4">Sélectionner une rencontre</h3>

        {matches.length === 0 ? (
          <p className="text-slate-600 text-center py-8">
            Aucune rencontre à domicile trouvée. Seuls les capitaines qui reçoivent peuvent saisir les résultats.
          </p>
        ) : (
          <div className="space-y-2">
            {matches.map((match) => (
              <button
                key={match.id}
                onClick={() => setSelectedMatch(match)}
                className={`w-full p-4 rounded-lg border-2 text-left transition-all ${
                  selectedMatch?.id === match.id
                    ? 'border-emerald-500 bg-emerald-50'
                    : 'border-slate-200 hover:border-emerald-300 hover:bg-slate-50'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-slate-700">
                      Journée {match.round_number}
                    </p>
                    <p className="text-xs text-slate-600 mt-1">{formatDate(match.match_date)}</p>
                    <p className="font-semibold text-slate-900 mt-2">
                      {match.team1_club} vs {match.team2_club}
                    </p>
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {selectedMatch && individualMatches.length > 0 && (
        <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6 space-y-6">
          <div className="bg-gradient-to-r from-emerald-600 to-emerald-700 text-white rounded-lg p-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xl font-bold">{selectedMatch.team1_club}</h3>
                <p className="text-emerald-100 text-sm">Domicile</p>
              </div>
              <div className="text-center">
                <div className="text-4xl font-bold">
                  {totals.team1Total} - {totals.team2Total}
                </div>
                <p className="text-emerald-100 text-sm mt-1">Points</p>
              </div>
              <div>
                <h3 className="text-xl font-bold text-right">{selectedMatch.team2_club}</h3>
                <p className="text-emerald-100 text-sm text-right">Extérieur</p>
              </div>
            </div>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex items-start space-x-2">
            <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-blue-800">
              <p className="font-medium mb-1">Instructions</p>
              <p>
                Saisissez le résultat de chaque match. Un match gagné = 2 points, match nul = 1 point chacun.
                Le score détaillé (ex: 7&6, tie) est optionnel.
              </p>
            </div>
          </div>

          <div className="space-y-3">
            {individualMatches.map((im) => (
              <div
                key={im.id}
                className="p-4 bg-slate-50 rounded-lg border border-slate-200"
              >
                <div className="flex items-center gap-4 mb-3">
                  <div className="flex items-center justify-center w-8 h-8 bg-emerald-600 text-white rounded-full font-bold text-sm">
                    {im.match_order}
                  </div>
                  <div className="flex-1 grid grid-cols-3 gap-4 items-center">
                    <div className="text-right">
                      <p className="font-medium text-slate-900">{im.team1_player_name}</p>
                      {im.team1_player2_name && (
                        <p className="font-medium text-slate-900">{im.team1_player2_name}</p>
                      )}
                      {im.team1_handicap !== undefined && im.team1_handicap !== null && (
                        <p className="text-xs text-slate-500 mt-1">Index: {im.team1_handicap.toFixed(1)}</p>
                      )}
                    </div>
                    <div className="text-center text-slate-400 font-semibold">vs</div>
                    <div>
                      <p className="font-medium text-slate-900">{im.team2_player_name}</p>
                      {im.team2_player2_name && (
                        <p className="font-medium text-slate-900">{im.team2_player2_name}</p>
                      )}
                      {im.team2_handicap !== undefined && im.team2_handicap !== null && (
                        <p className="text-xs text-slate-500 mt-1">Index: {im.team2_handicap.toFixed(1)}</p>
                      )}
                    </div>
                  </div>
                </div>

                {im.strokes_given !== undefined && im.strokes_given > 0 && (
                  <div className="mb-3 px-4 py-2 bg-blue-50 border border-blue-200 rounded text-center">
                    <p className="text-sm font-medium text-blue-800">
                      {im.strokes_given} coup{im.strokes_given > 1 ? 's' : ''} rendu{im.strokes_given > 1 ? 's' : ''} {im.strokes_receiver === 1 ? `à ${im.team1_player_name}` : `à ${im.team2_player_name}`}
                    </p>
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">
                      Score détaillé (optionnel)
                    </label>
                    <input
                      type="text"
                      value={im.score_detail || ''}
                      onChange={(e) => updateIndividualMatch(im.id, 'score_detail', e.target.value)}
                      placeholder="Ex: 7&6, tie, 6&4"
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-sm"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">
                      Résultat *
                    </label>
                    <select
                      value={im.result || ''}
                      onChange={(e) => updateIndividualMatch(im.id, 'result', e.target.value)}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-sm"
                    >
                      <option value="">Sélectionner</option>
                      <option value="team1_win">{selectedMatch.team1_club} gagne (2 pts)</option>
                      <option value="draw">Match nul (1 pt chacun)</option>
                      <option value="team2_win">{selectedMatch.team2_club} gagne (2 pts)</option>
                    </select>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="flex justify-end space-x-3 pt-4 border-t border-slate-200">
            <button
              onClick={() => loadIndividualMatches()}
              className="px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors"
            >
              Annuler les modifications
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="px-6 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors flex items-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Save className="w-4 h-4" />
              <span>{saving ? 'Enregistrement...' : 'Enregistrer les résultats'}</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
