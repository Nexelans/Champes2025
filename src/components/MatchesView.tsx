import { useEffect, useState } from 'react';
import { Trophy, Users, Loader2, AlertCircle } from 'lucide-react';
import { supabase } from '../lib/supabase';
import ScorecardGenerator from './ScorecardGenerator';

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
  host_club_id: string;
  team1_points: number;
  team2_points: number;
  match_type: string;
  is_final: boolean;
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
  starting_hole: number | null;
  team1_points: number;
  team2_points: number;
};

const MATCH_TYPE_LABELS: Record<string, string> = {
  final_1st: 'Finale 1re / 2e place',
  final_3rd: 'Match 3e / 4e place',
  final_5th: 'Match 5e / 6e place',
};

export default function MatchesView({ division }: MatchesViewProps) {
  const [loading, setLoading] = useState(true);
  const [matches, setMatches] = useState<Match[]>([]);
  const [selectedRound, setSelectedRound] = useState<number>(1);
  const [showFinals, setShowFinals] = useState(false);
  const [selectedMatch, setSelectedMatch] = useState<string | null>(null);
  const [individualMatches, setIndividualMatches] = useState<IndividualMatch[]>([]);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadMatches();
  }, [division]);

  useEffect(() => {
    if (matches.length > 0 && !showFinals) {
      const roundMatches = matches.filter(m => m.round_number === selectedRound && !m.is_final);
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
          host_club_id,
          match_type,
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
          host_club_id: m.host_club_id,
          team1_points: m.team1_points || 0,
          team2_points: m.team2_points || 0,
          match_type: m.match_type || 'regular',
          is_final: m.round_number === 6,
        }));
        setMatches(formattedMatches);

        const hasFinals = formattedMatches.some(m => m.is_final);
        if (!hasFinals) {
          setShowFinals(false);
        }
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
        .eq('match_id', matchId)
        .order('match_order');

      if (detailsError) throw detailsError;

      if (individualMatchesData) {
        const formatted: IndividualMatch[] = individualMatchesData.map((im: any) => ({
          match_order: im.match_order,
          team1_player_name: im.team1_player ? `${im.team1_player.first_name} ${im.team1_player.last_name}` : 'Forfait',
          team2_player_name: im.team2_player ? `${im.team2_player.first_name} ${im.team2_player.last_name}` : 'Forfait',
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
          starting_hole: im.starting_hole,
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
    if (!result) return <span className="text-slate-400 text-sm">À jouer</span>;
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

  const getLockDeadline = (matchDate: string) => {
    const match = new Date(matchDate);
    const matchDay = match.getDay();
    let daysToSubtract;
    if (matchDay === 0) daysToSubtract = 2;
    else if (matchDay === 6) daysToSubtract = 1;
    else daysToSubtract = matchDay + 2;
    const lockDeadline = new Date(match);
    lockDeadline.setDate(lockDeadline.getDate() - daysToSubtract);
    lockDeadline.setHours(17, 0, 0, 0);
    return lockDeadline;
  };

  const isMatchLocked = (matchDate: string) => {
    const now = new Date();
    return now >= getLockDeadline(matchDate);
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
  const regularMatches = matches.filter(m => !m.is_final);
  const finalMatches = matches.filter(m => m.is_final);
  const hasFinals = finalMatches.length > 0;

  const currentRoundMatches = showFinals
    ? finalMatches
    : regularMatches.filter(m => m.round_number === selectedRound);

  const selectedMatchData = matches.find(m => m.id === selectedMatch);
  const shouldShowDisclaimer = selectedMatchData && !isMatchLocked(selectedMatchData.match_date);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-slate-900">
          Rencontres {divisionLabel}
        </h2>
      </div>

      {shouldShowDisclaimer && (
        <div className="bg-amber-50 border-2 border-amber-200 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-amber-900">
              <p className="font-semibold">Information importante</p>
              <p className="mt-1">
                Les informations affichées sont provisoires jusqu'à la date limite de sélection des joueurs :
                <span className="font-bold ml-1">
                  vendredi {getLockDeadline(selectedMatchData.match_date).toLocaleDateString('fr-FR', {
                    day: '2-digit',
                    month: '2-digit'
                  })} à 17h
                </span>
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
        <div className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-3">
              Sélectionner la journée
            </label>
            <div className="flex flex-wrap gap-2">
              {[1, 2, 3, 4, 5].map((round) => (
                <button
                  key={round}
                  onClick={() => {
                    setSelectedRound(round);
                    setShowFinals(false);
                    setSelectedMatch(null);
                  }}
                  className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                    selectedRound === round && !showFinals
                      ? 'bg-emerald-600 text-white'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  Journée {round}
                </button>
              ))}
              {hasFinals && (
                <button
                  onClick={() => {
                    setShowFinals(true);
                    setSelectedMatch(null);
                  }}
                  className={`px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2 ${
                    showFinals
                      ? 'bg-amber-500 text-white'
                      : 'bg-amber-50 text-amber-700 border border-amber-200 hover:bg-amber-100'
                  }`}
                >
                  <Trophy className="h-4 w-4" />
                  Finales
                </button>
              )}
            </div>
          </div>

          {currentRoundMatches.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-3">
                {showFinals ? 'Matchs de finale' : 'Rencontres'}
              </label>
              <div className="space-y-2">
                {currentRoundMatches.map((match) => (
                  <button
                    key={match.id}
                    onClick={() => setSelectedMatch(match.id)}
                    className={`w-full p-4 rounded-lg border-2 transition-all text-left ${
                      selectedMatch === match.id
                        ? match.is_final
                          ? 'border-amber-500 bg-amber-50'
                          : 'border-emerald-500 bg-emerald-50'
                        : 'border-slate-200 bg-white hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        {match.is_final && match.match_type !== 'regular' && (
                          <p className="text-xs font-bold text-amber-600 uppercase tracking-wider mb-1">
                            {MATCH_TYPE_LABELS[match.match_type]}
                          </p>
                        )}
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
          <div className={`text-white px-6 py-4 rounded-t-xl ${
            selectedMatchData.is_final
              ? 'bg-gradient-to-r from-amber-500 to-orange-500'
              : 'bg-gradient-to-r from-emerald-600 to-emerald-700'
          }`}>
            <div className="flex items-center justify-between">
              <div>
                {selectedMatchData.is_final && selectedMatchData.match_type !== 'regular' && (
                  <p className="text-xs font-bold uppercase tracking-wider opacity-80 mb-1">
                    {MATCH_TYPE_LABELS[selectedMatchData.match_type]}
                  </p>
                )}
                <h3 className="text-xl font-bold">
                  {selectedMatchData.team1_club} vs {selectedMatchData.team2_club}
                </h3>
                <p className={`${selectedMatchData.is_final ? 'text-orange-100' : 'text-emerald-100'} text-sm mt-1`}>
                  {selectedMatchData.is_final ? 'Finale' : `Journée ${selectedMatchData.round_number}`} •{' '}
                  {formatDate(selectedMatchData.match_date)} • {selectedMatchData.host_club}
                </p>
              </div>
              <div className="flex items-center gap-4">
                <div className="text-right">
                  <div className="text-3xl font-bold">
                    {selectedMatchData.team1_points} - {selectedMatchData.team2_points}
                  </div>
                  <p className={`${selectedMatchData.is_final ? 'text-orange-100' : 'text-emerald-100'} text-sm`}>Points</p>
                </div>
                {individualMatches.length > 0 && (
                  <ScorecardGenerator
                    matchId={selectedMatchData.id}
                    hostClubId={selectedMatchData.host_club_id}
                    team1Name={selectedMatchData.team1_club}
                    team2Name={selectedMatchData.team2_club}
                    matchDate={selectedMatchData.match_date}
                  />
                )}
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
                        <div className="flex items-center gap-2">
                          <div className="flex items-center justify-center w-8 h-8 bg-emerald-600 text-white rounded-full font-bold text-sm">
                            {im.match_order}
                          </div>
                          {im.starting_hole && (
                            <div className="px-3 py-1 bg-emerald-600 text-white rounded-full text-xs font-medium whitespace-nowrap">
                              Trou {im.starting_hole}
                            </div>
                          )}
                        </div>
                        <div className="flex items-center gap-4 flex-1">
                          <div className="flex-1 text-right">
                            <p className="font-medium text-slate-900">{im.team1_player_name}</p>
                            {im.team1_player2_name && (
                              <p className="font-medium text-slate-900">{im.team1_player2_name}</p>
                            )}
                            {im.team1_handicap !== undefined && im.team1_handicap !== null && (
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
                            {im.team2_handicap !== undefined && im.team2_handicap !== null && (
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

      {currentRoundMatches.length === 0 && (
        <div className="bg-slate-50 border border-slate-200 rounded-lg p-12 text-center">
          <AlertCircle className="h-12 w-12 text-slate-400 mx-auto mb-3" />
          <p className="text-slate-600">
            {showFinals ? 'Aucune finale programmée pour cette division' : 'Aucune rencontre pour cette journée'}
          </p>
        </div>
      )}
    </div>
  );
}
