import { useEffect, useState } from 'react';
import { Trophy, TrendingUp, TrendingDown, Minus, FileDown, RefreshCw, Medal } from 'lucide-react';
import { supabase } from '../lib/supabase';

type StandingsProps = {
  division: 'champe1' | 'champe2';
};

type TeamStanding = {
  position: number;
  team_id: string;
  club_name: string;
  total_points: number;
  matches_played: number;
  wins: number;
  draws: number;
  losses: number;
  home_wins: number;
  away_wins: number;
};

type FinalResult = {
  match_type: 'final_1st' | 'final_3rd' | 'final_5th';
  team1_club: string;
  team2_club: string;
  team1_points: number;
  team2_points: number;
  status: string;
  winner?: string;
};

const MATCH_TYPE_LABELS: Record<string, string> = {
  final_1st: 'Finale 1re / 2e place',
  final_3rd: 'Match 3e / 4e place',
  final_5th: 'Match 5e / 6e place',
};

export default function Standings({ division }: StandingsProps) {
  const [standings, setStandings] = useState<TeamStanding[]>([]);
  const [finalResults, setFinalResults] = useState<FinalResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadStandings();
  }, [division]);

  const loadStandings = async () => {
    setLoading(true);
    try {
      const { data: season } = await supabase
        .from('seasons')
        .select('id')
        .eq('is_active', true)
        .maybeSingle();

      if (!season) {
        setLoading(false);
        return;
      }

      const { data: teams } = await supabase
        .from('teams')
        .select(`
          id,
          club_id,
          club:clubs(name)
        `)
        .eq('season_id', season.id)
        .eq('division', division);

      if (!teams) {
        setLoading(false);
        return;
      }

      const standingsData: TeamStanding[] = await Promise.all(
        teams.map(async (team) => {
          const { data: homeMatches } = await supabase
            .from('matches')
            .select('team1_points, team2_points, host_club_id')
            .eq('team1_id', team.id)
            .eq('division', division)
            .eq('status', 'completed');

          const { data: awayMatches } = await supabase
            .from('matches')
            .select('team1_points, team2_points, host_club_id')
            .eq('team2_id', team.id)
            .eq('division', division)
            .eq('status', 'completed');

          const teamClubId = (team as any).club_id;

          let totalPoints = 0;
          let wins = 0;
          let draws = 0;
          let losses = 0;
          let homeWins = 0;
          let awayWins = 0;

          homeMatches?.forEach((match) => {
            const team1Score = match.team1_points || 0;
            const team2Score = match.team2_points || 0;
            totalPoints += team1Score;
            const isHome = match.host_club_id === teamClubId;

            if (team1Score > team2Score) {
              wins++;
              if (isHome) homeWins++;
              else awayWins++;
            } else if (team1Score === team2Score) {
              draws++;
            } else {
              losses++;
            }
          });

          awayMatches?.forEach((match) => {
            const team1Score = match.team1_points || 0;
            const team2Score = match.team2_points || 0;
            totalPoints += team2Score;
            const isHome = match.host_club_id === teamClubId;

            if (team2Score > team1Score) {
              wins++;
              if (isHome) homeWins++;
              else awayWins++;
            } else if (team2Score === team1Score) {
              draws++;
            } else {
              losses++;
            }
          });

          return {
            position: 0,
            team_id: team.id,
            club_name: (team.club as any)?.name || '',
            total_points: totalPoints,
            matches_played: (homeMatches?.length || 0) + (awayMatches?.length || 0),
            wins,
            draws,
            losses,
            home_wins: homeWins,
            away_wins: awayWins,
          };
        })
      );

      standingsData.sort((a, b) => {
        if (b.total_points !== a.total_points) {
          return b.total_points - a.total_points;
        }
        return b.away_wins - a.away_wins;
      });

      standingsData.forEach((team, index) => {
        team.position = index + 1;
      });

      setStandings(standingsData);

      const { data: finalsData } = await supabase
        .from('matches')
        .select(`
          match_type,
          team1_points,
          team2_points,
          status,
          team1:teams!matches_team1_id_fkey(club:clubs(name)),
          team2:teams!matches_team2_id_fkey(club:clubs(name))
        `)
        .eq('season_id', season.id)
        .eq('division', division)
        .eq('round_number', 6)
        .in('match_type', ['final_1st', 'final_3rd', 'final_5th'])
        .order('match_type');

      if (finalsData) {
        const fr: FinalResult[] = finalsData.map((m: any) => {
          const t1 = m.team1?.club?.name || '';
          const t2 = m.team2?.club?.name || '';
          const p1 = m.team1_points || 0;
          const p2 = m.team2_points || 0;
          let winner: string | undefined;
          if (m.status === 'completed') {
            if (p1 > p2) winner = t1;
            else if (p2 > p1) winner = t2;
            else winner = undefined;
          }
          return {
            match_type: m.match_type,
            team1_club: t1,
            team2_club: t2,
            team1_points: p1,
            team2_points: p2,
            status: m.status,
            winner,
          };
        });
        const order = ['final_1st', 'final_3rd', 'final_5th'];
        fr.sort((a, b) => order.indexOf(a.match_type) - order.indexOf(b.match_type));
        setFinalResults(fr);
      }
    } catch (error) {
      console.error('Error loading standings:', error);
    } finally {
      setLoading(false);
    }
  };

  const handlePrintPDF = () => {
    window.print();
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadStandings();
    setRefreshing(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="p-6 border-b border-slate-200 bg-gradient-to-r from-emerald-50 to-sky-50">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                <Trophy className="h-6 w-6 text-emerald-600" />
                Classement {division === 'champe1' ? 'Champe 1' : 'Champe 2'}
              </h2>
              <p className="text-sm text-slate-600 mt-1">
                Saison 2024-2025 • {standings.length} équipes
              </p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleRefresh}
                disabled={refreshing}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors print:hidden disabled:opacity-50 disabled:cursor-not-allowed"
                title="Recalculer les classements"
              >
                <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
                <span>{refreshing ? 'Calcul...' : 'Rafraîchir'}</span>
              </button>
              <button
                onClick={handlePrintPDF}
                className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors print:hidden"
              >
                <FileDown className="h-4 w-4" />
                <span>Imprimer PDF</span>
              </button>
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                  Pos
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                  Équipe
                </th>
                <th className="px-6 py-3 text-center text-xs font-medium text-slate-500 uppercase tracking-wider">
                  J
                </th>
                <th className="px-6 py-3 text-center text-xs font-medium text-slate-500 uppercase tracking-wider">
                  V
                </th>
                <th className="px-6 py-3 text-center text-xs font-medium text-slate-500 uppercase tracking-wider">
                  N
                </th>
                <th className="px-6 py-3 text-center text-xs font-medium text-slate-500 uppercase tracking-wider">
                  D
                </th>
                <th className="px-6 py-3 text-center text-xs font-medium text-slate-500 uppercase tracking-wider">
                  Dom
                </th>
                <th className="px-6 py-3 text-center text-xs font-medium text-slate-500 uppercase tracking-wider">
                  Ext
                </th>
                <th className="px-6 py-3 text-center text-xs font-medium text-slate-500 uppercase tracking-wider">
                  Pts
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {standings.map((team) => (
                <tr
                  key={team.team_id}
                  className={`hover:bg-slate-50 transition-colors ${
                    team.position === 1
                      ? 'bg-emerald-50'
                      : team.position === 2
                      ? 'bg-sky-50'
                      : ''
                  }`}
                >
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      <div
                        className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${
                          team.position === 1
                            ? 'bg-amber-100 text-amber-700'
                            : team.position === 2
                            ? 'bg-slate-200 text-slate-700'
                            : team.position === 3
                            ? 'bg-orange-100 text-orange-700'
                            : 'bg-slate-100 text-slate-600'
                        }`}
                      >
                        {team.position}
                      </div>
                      {team.position === 1 && (
                        <Trophy className="h-4 w-4 text-amber-500" />
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      <div className="font-medium text-slate-900">{team.club_name}</div>
                      {team.position <= 2 && (
                        <span className="text-xs px-1.5 py-0.5 bg-amber-100 text-amber-700 rounded font-medium">
                          Finale
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-center text-sm text-slate-600">
                    {team.matches_played}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-center">
                    <span className="inline-flex items-center gap-1 text-sm font-medium text-emerald-600">
                      <TrendingUp className="h-3 w-3" />
                      {team.wins}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-center">
                    <span className="inline-flex items-center gap-1 text-sm font-medium text-slate-600">
                      <Minus className="h-3 w-3" />
                      {team.draws}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-center">
                    <span className="inline-flex items-center gap-1 text-sm font-medium text-red-600">
                      <TrendingDown className="h-3 w-3" />
                      {team.losses}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-center text-sm text-slate-600">
                    {team.home_wins}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-center text-sm text-slate-600">
                    {team.away_wins}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-center">
                    <span className="inline-flex items-center justify-center px-3 py-1 rounded-full text-sm font-bold bg-emerald-100 text-emerald-700">
                      {team.total_points}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {finalResults.length > 0 && (
          <div className="p-6 border-t border-slate-200 bg-gradient-to-r from-amber-50 to-orange-50">
            <h3 className="text-sm font-semibold text-slate-900 mb-3 flex items-center gap-2">
              <Medal className="h-4 w-4 text-amber-600" />
              Résultats des finales
            </h3>
            <div className="space-y-2">
              {finalResults.map((fr) => (
                <div key={fr.match_type} className="flex items-center justify-between p-3 bg-white rounded-lg border border-amber-200">
                  <div>
                    <p className="text-xs font-bold text-amber-600 uppercase tracking-wider mb-0.5">
                      {MATCH_TYPE_LABELS[fr.match_type]}
                    </p>
                    <p className="text-sm font-medium text-slate-900">
                      {fr.team1_club} vs {fr.team2_club}
                    </p>
                    {fr.winner && (
                      <p className="text-xs text-emerald-600 font-semibold mt-0.5">
                        Vainqueur : {fr.winner}
                      </p>
                    )}
                  </div>
                  <div className="text-right">
                    {fr.status === 'completed' ? (
                      <span className="text-xl font-bold text-slate-900">
                        {fr.team1_points} – {fr.team2_points}
                      </span>
                    ) : (
                      <span className="text-sm text-slate-400">À jouer</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="p-6 bg-slate-50 border-t border-slate-200">
          <h3 className="text-sm font-semibold text-slate-900 mb-3">Règlement des points</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
            <div className="flex items-start gap-2">
              <TrendingUp className="h-4 w-4 text-emerald-600 mt-0.5" />
              <div>
                <span className="font-medium text-slate-900">Victoire :</span>
                <span className="text-slate-600 ml-1">2 points</span>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <Minus className="h-4 w-4 text-slate-600 mt-0.5" />
              <div>
                <span className="font-medium text-slate-900">Match nul :</span>
                <span className="text-slate-600 ml-1">1 point</span>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <TrendingDown className="h-4 w-4 text-red-600 mt-0.5" />
              <div>
                <span className="font-medium text-slate-900">Défaite :</span>
                <span className="text-slate-600 ml-1">0 point</span>
              </div>
            </div>
          </div>
          <p className="text-xs text-slate-500 mt-3">
            En cas d'égalité, le nombre de victoires à l'extérieur est pris en compte.
          </p>
        </div>
      </div>
    </div>
  );
}
