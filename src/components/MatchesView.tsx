import { useEffect, useState } from 'react';
import { Trophy, Users, Loader2, AlertCircle } from 'lucide-react';
import { supabase } from '../lib/supabase';

type MatchesViewProps = {
  division: 'champe1' | 'champe2';
};

type Match = {
  id: string;
  round_number: number;
  match_date: string;
  team1_club: string;
  team2_club: string;
  host_club: string;
  team1_points: number;
  team2_points: number;
};

type IndividualMatch = {
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
  team1_points: number;
  team2_points: number;
};

export default function MatchesView({ division }: MatchesViewProps) {
  const [loading, setLoading] = useState(true);
  const [matches, setMatches] = useState<Match[]>([]);
  const [selectedRound, setSelectedRound] = useState<number>(1);
  const [selectedMatch, setSelectedMatch] = useState<string | null>(null);
  const [individualMatches, setIndividualMatches] = useState<IndividualMatch[]>([]);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadMatches();
  }, [division]);

  useEffect(() => {
    if (matches.length > 0) {
      const roundMatches = matches.filter(m => m.round_number === selectedRound);
      if (roundMatches.length > 0 && !selectedMatch) {
        setSelectedMatch(roundMatches[0].id);
      }
    }
  }, [selectedRound, matches]);

  useEffect(() => {
    if (selectedMatch) {
      loadMatchDetails(selectedMatch);
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
          team1_points,
          team2_points,
          host_club:clubs!matches_host_club_id_fkey(name),
          team1:teams!matches_team1_id_fkey(
            club:clubs(name)
          ),
          team2:teams!matches_team2_id_fkey(
            club:clubs(name)
          )
        `)
        .eq('season_id', seasonData.id)
        .eq('division', division)
        .lte('round_number', 5)
        .order('round_number')
        .order('match_date');

      if (matchesError) throw matchesError;

      if (matchesData) {
        const formattedMatches: Match[] = matchesData.map((m: any) => ({
          id: m.id,
          round_number: m.round_number,
          match_date: m.match_date,
          team1_club: m.team1?.club?.name || 'Inconnu',
          team2_club: m.team2?.club?.name || 'Inconnu',
          host_club: m.host_club?.name || 'À définir',
          team1_points: m.team1_points || 0,
          team2_points: m.team2_points || 0,
        }));
        setMatches(formattedMatches);
      }
    } catch (error) {
      console.error('Error loading matches:', error);
      setError('Erreur lors du chargement des rencontres');
    } finally {
      setLoading(false);
    }
  };

  const loadMatchDetails = async (matchId: string) => {
    setLoadingDetails(true);
    try {
      const { data: individualMatchesData, error: detailsError } = await supabase
        .from('individual_matches')
        .select(`
          match_order,
          result,
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
        .eq('match_id', matchId)
        .order('match_order');

      if (detailsError) throw detailsError;

      if (individualMatchesData) {
        const formatted: IndividualMatch[] = individualMatchesData.map((im: any) => ({
          match_order: im.match_order,
          team1_player_name: `${im.team1_player?.first_name} ${im.team1_player?.last_name}`,
          team2_player_name: `${im.team2_player?.first_name} ${im.team2_player?.last_name}`,
          team1_player2_name: im.team1_player2
            ? `${im.team1_player2.first_name} ${im.team1_player2.last_name}`
            : undefined,
          team1_handicap: im.team1_handicap,
          team2_handicap: im.team2_handicap,
          strokes_given: im.strokes_given,
          strokes_receiver: im.strokes_receiver,
          team2_player2_name: im.team2_player2
            ? `${im.team2_player2.first_name} ${im.team2_player2.last_name}`
            : undefined,
          result: im.result,
          team1_points: im.team1_points || 0,
          team2_points: im.team2_points || 0,
        }));
        setIndividualMatches(formatted);
      }
    } catch (error) {
      console.error('Error loading match details:', error);
    } finally {
      setLoadingDetails(false);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  const getResultBadge = (result: string | null) => {
    if (!result) {
      return <span className="text-slate-400 text-sm">À jouer</span>;
    }

    switch (result) {
      case 'team1_win':
        return <span className="bg-emerald-100 text-emerald-800 px-2 py-1 rounded text-xs font-semibold">Victoire équipe 1</span>;
      case 'team2_win':
        return <span className="bg-sky-100 text-sky-800 px-2 py-1 rounded text-xs font-semibold">Victoire équipe 2</span>;
      case 'draw':
        return <span className="bg-amber-100 text-amber-800 px-2 py-1 rounded text-xs font-semibold">Match nul</span>;
      default:
        return <span className="text-slate-400 text-sm">À jouer</span>;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-12 w-12 text-emerald-600 animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
        <AlertCircle className="h-12 w-12 text-red-600 mx-auto mb-3" />
        <p className="text-red-900 font-medium">{error}</p>
      </div>
    );
  }

  const divisionLabel = division === 'champe1' ? 'Champe 1' : 'Champe 2';
  const roundMatches = matches.filter(m => m.round_number === selectedRound);
  const selectedMatchData = matches.find(m => m.id === selectedMatch);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-slate-900">
          Rencontres {divisionLabel}
        </h2>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
        <div className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-3">
              Sélectionner la journée
            </label>
            <div className="grid grid-cols-3 md:grid-cols-6 gap-2">
              {[1, 2, 3, 4, 5].map((round) => (
                <button
                  key={round}
                  onClick={() => {
                    setSelectedRound(round);
                    setSelectedMatch(null);
                  }}
                  className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                    selectedRound === round
                      ? 'bg-emerald-600 text-white'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  Journée {round}
                </button>
              ))}
            </div>
          </div>

          {roundMatches.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-3">
                Sélectionner la rencontre
              </label>
              <div className="space-y-2">
                {roundMatches.map((match) => (
                  <button
                    key={match.id}
                    onClick={() => setSelectedMatch(match.id)}
                    className={`w-full p-4 rounded-lg border-2 transition-all text-left ${
                      selectedMatch === match.id
                        ? 'border-emerald-500 bg-emerald-50'
                        : 'border-slate-200 bg-white hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3">
                          <span className="font-semibold text-slate-900">{match.team1_club}</span>
                          <span className="text-slate-400 font-medium">vs</span>
                          <span className="font-semibold text-slate-900">{match.team2_club}</span>
                        </div>
                        <div className="flex items-center gap-3 mt-2 text-sm text-slate-600">
                          <span>{formatDate(match.match_date)}</span>
                          <span>•</span>
                          <span>{match.host_club}</span>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-2xl font-bold text-slate-900">
                          {match.team1_points} - {match.team2_points}
                        </div>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {selectedMatchData && (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200">
          <div className="bg-gradient-to-r from-emerald-600 to-emerald-700 text-white px-6 py-4 rounded-t-xl">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xl font-bold">
                  {selectedMatchData.team1_club} vs {selectedMatchData.team2_club}
                </h3>
                <p className="text-emerald-100 text-sm mt-1">
                  Journée {selectedRound} • {formatDate(selectedMatchData.match_date)} • {selectedMatchData.host_club}
                </p>
              </div>
              <div className="text-right">
                <div className="text-3xl font-bold">
                  {selectedMatchData.team1_points} - {selectedMatchData.team2_points}
                </div>
                <p className="text-emerald-100 text-sm">Points</p>
              </div>
            </div>
          </div>

          <div className="p-6">
            {loadingDetails ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 text-emerald-600 animate-spin" />
              </div>
            ) : (
              <div className="space-y-3">
                {individualMatches.length > 0 ? (
                  individualMatches.map((im) => (
                    <div
                      key={im.match_order}
                      className="flex items-center justify-between p-4 bg-slate-50 rounded-lg hover:bg-slate-100 transition-colors"
                    >
                      <div className="flex items-center gap-4 flex-1">
                        <div className="flex items-center justify-center w-8 h-8 bg-emerald-600 text-white rounded-full font-bold text-sm">
                          {im.match_order}
                        </div>
                        <div className="flex items-center gap-4 flex-1">
                          <div className="flex-1 text-right">
                            <p className="font-medium text-slate-900">{im.team1_player_name}</p>
                            {im.team1_player2_name && (
                              <p className="font-medium text-slate-900">{im.team1_player2_name}</p>
                            )}
                            {im.team1_handicap !== undefined && (
                              <p className="text-xs text-slate-500 mt-1">Index: {im.team1_handicap.toFixed(1)}</p>
                            )}
                          </div>
                          <div className="flex flex-col items-center gap-1">
                            <div className="flex items-center gap-3">
                              <span className="text-lg font-bold text-slate-700">{im.team1_points}</span>
                              <span className="text-slate-400 font-semibold">vs</span>
                              <span className="text-lg font-bold text-slate-700">{im.team2_points}</span>
                            </div>
                            {im.strokes_given !== undefined && im.strokes_given > 0 && (
                              <p className="text-xs text-blue-600 font-medium">
                                {im.strokes_given} coup{im.strokes_given > 1 ? 's' : ''}
                              </p>
                            )}
                          </div>
                          <div className="flex-1">
                            <p className="font-medium text-slate-900">{im.team2_player_name}</p>
                            {im.team2_player2_name && (
                              <p className="font-medium text-slate-900">{im.team2_player2_name}</p>
                            )}
                            {im.team2_handicap !== undefined && (
                              <p className="text-xs text-slate-500 mt-1">Index: {im.team2_handicap.toFixed(1)}</p>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="ml-4">
                        {getResultBadge(im.result)}
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-12">
                    <Users className="h-12 w-12 text-slate-300 mx-auto mb-3" />
                    <p className="text-slate-600">Les matchs individuels n'ont pas encore été générés</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {roundMatches.length === 0 && (
        <div className="bg-slate-50 border border-slate-200 rounded-lg p-12 text-center">
          <AlertCircle className="h-12 w-12 text-slate-400 mx-auto mb-3" />
          <p className="text-slate-600">Aucune rencontre pour cette journée</p>
        </div>
      )}
    </div>
  );
}
