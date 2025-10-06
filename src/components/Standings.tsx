import { useEffect, useState } from 'react';
import { Trophy, TrendingUp, TrendingDown, Minus } from 'lucide-react';
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

export default function Standings({ division }: StandingsProps) {
  const [standings, setStandings] = useState<TeamStanding[]>([]);
  const [loading, setLoading] = useState(true);

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
            .select('team1_points, team2_points, status')
            .eq('team1_id', team.id)
            .eq('status', 'completed');

          const { data: awayMatches } = await supabase
            .from('matches')
            .select('team1_points, team2_points, status')
            .eq('team2_id', team.id)
            .eq('status', 'completed');

          let totalPoints = 0;
          let wins = 0;
          let draws = 0;
          let losses = 0;
          let homeWins = 0;
          let awayWins = 0;

          homeMatches?.forEach((match) => {
            totalPoints += match.team1_points;
            if (match.team1_points > match.team2_points) {
              wins++;
              homeWins++;
            } else if (match.team1_points === match.team2_points) {
              draws++;
            } else {
              losses++;
            }
          });

          awayMatches?.forEach((match) => {
            totalPoints += match.team2_points;
            if (match.team2_points > match.team1_points) {
              wins++;
              awayWins++;
            } else if (match.team2_points === match.team1_points) {
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
    } catch (error) {
      console.error('Error loading standings:', error);
    } finally {
      setLoading(false);
    }
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
          <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <Trophy className="h-6 w-6 text-emerald-600" />
            Classement {division === 'champe1' ? 'Champe 1' : 'Champe 2'}
          </h2>
          <p className="text-sm text-slate-600 mt-1">
            Saison 2024-2025 • {standings.length} équipes
          </p>
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
                    <div className="font-medium text-slate-900">{team.club_name}</div>
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
