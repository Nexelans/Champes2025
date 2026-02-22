import { useEffect, useState } from 'react';
import { Trophy, AlertCircle, Check, Loader2, Plus, Trash2 } from 'lucide-react';
import { supabase } from '../../lib/supabase';

type Division = 'champe1' | 'champe2';

type TeamStanding = {
  team_id: string;
  club_name: string;
  club_id: string;
  total_points: number;
  away_wins: number;
  position: number;
};

type FinalMatch = {
  id: string;
  match_type: 'final_1st' | 'final_3rd' | 'final_5th';
  team1_club: string;
  team2_club: string;
  match_date: string;
  status: string;
};

const MATCH_TYPE_LABELS: Record<string, string> = {
  final_1st: 'Finale 1re / 2e place',
  final_3rd: 'Match 3e / 4e place',
  final_5th: 'Match 5e / 6e place',
};

const MATCH_TYPE_COLORS: Record<string, string> = {
  final_1st: 'bg-amber-50 border-amber-200',
  final_3rd: 'bg-slate-50 border-slate-300',
  final_5th: 'bg-orange-50 border-orange-200',
};

const HOST_CLUBS: Record<Division, { name: string; club_id: string }> = {
  champe1: { name: 'Bourg en Bresse', club_id: '1ed4a740-ac19-45ee-9fad-44d0e0a52fe5' },
  champe2: { name: 'Chassieu', club_id: '78c86f73-70f6-4a35-8468-de81d70c0caf' },
};

const FINALS_DATE: Record<Division, string> = {
  champe1: '2026-03-01',
  champe2: '2026-03-01',
};

interface FinalsManagementProps {
  division: Division;
}

export default function FinalsManagement({ division }: FinalsManagementProps) {
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [standings, setStandings] = useState<TeamStanding[]>([]);
  const [finalMatches, setFinalMatches] = useState<FinalMatch[]>([]);
  const [seasonId, setSeasonId] = useState<string>('');
  const [finalsDate, setFinalsDate] = useState(FINALS_DATE[division]);

  useEffect(() => {
    setFinalsDate(FINALS_DATE[division]);
    loadData();
  }, [division]);

  const loadData = async () => {
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

      setSeasonId(season.id);

      const { data: teams } = await supabase
        .from('teams')
        .select('id, club_id, clubs!inner(name)')
        .eq('season_id', season.id)
        .eq('division', division);

      if (!teams) {
        setLoading(false);
        return;
      }

      const standingsData: TeamStanding[] = await Promise.all(
        teams.map(async (team: any) => {
          const { data: homeMatches } = await supabase
            .from('matches')
            .select('team1_points, team2_points, host_club_id')
            .eq('team1_id', team.id)
            .eq('division', division)
            .eq('status', 'completed')
            .eq('match_type', 'regular');

          const { data: awayMatches } = await supabase
            .from('matches')
            .select('team1_points, team2_points, host_club_id')
            .eq('team2_id', team.id)
            .eq('division', division)
            .eq('status', 'completed')
            .eq('match_type', 'regular');

          let totalPoints = 0;
          let awayWins = 0;

          homeMatches?.forEach((m) => {
            totalPoints += m.team1_points || 0;
            if ((m.team1_points || 0) > (m.team2_points || 0) && m.host_club_id !== team.club_id) {
              awayWins++;
            }
          });

          awayMatches?.forEach((m) => {
            totalPoints += m.team2_points || 0;
            if ((m.team2_points || 0) > (m.team1_points || 0) && m.host_club_id !== team.club_id) {
              awayWins++;
            }
          });

          return {
            team_id: team.id,
            club_name: team.clubs.name,
            club_id: team.club_id,
            total_points: totalPoints,
            away_wins: awayWins,
            position: 0,
          };
        })
      );

      standingsData.sort((a, b) => {
        if (b.total_points !== a.total_points) return b.total_points - a.total_points;
        return b.away_wins - a.away_wins;
      });
      standingsData.forEach((t, i) => (t.position = i + 1));
      setStandings(standingsData);

      const { data: existingFinals } = await supabase
        .from('matches')
        .select(`
          id,
          match_type,
          match_date,
          status,
          team1:teams!matches_team1_id_fkey(club:clubs(name)),
          team2:teams!matches_team2_id_fkey(club:clubs(name))
        `)
        .eq('season_id', season.id)
        .eq('division', division)
        .eq('round_number', 6)
        .order('match_type');

      if (existingFinals) {
        setFinalMatches(
          existingFinals.map((m: any) => ({
            id: m.id,
            match_type: m.match_type,
            team1_club: m.team1?.club?.name || '',
            team2_club: m.team2?.club?.name || '',
            match_date: m.match_date,
            status: m.status,
          }))
        );
      }
    } catch (err) {
      console.error('Error loading finals data:', err);
      setMessage({ type: 'error', text: 'Erreur lors du chargement' });
    } finally {
      setLoading(false);
    }
  };

  const generateFinals = async () => {
    if (standings.length < 6) {
      setMessage({ type: 'error', text: 'Il faut 6 équipes pour générer les finales' });
      return;
    }

    if (!finalsDate) {
      setMessage({ type: 'error', text: 'Veuillez saisir la date des finales' });
      return;
    }

    setGenerating(true);
    setMessage(null);

    try {
      const hostClub = HOST_CLUBS[division];

      const matchesToCreate = [
        {
          match_type: 'final_1st',
          team1: standings[0],
          team2: standings[1],
        },
        {
          match_type: 'final_3rd',
          team1: standings[2],
          team2: standings[3],
        },
        {
          match_type: 'final_5th',
          team1: standings[4],
          team2: standings[5],
        },
      ];

      for (const finalDef of matchesToCreate) {
        const { error } = await supabase.from('matches').insert({
          season_id: seasonId,
          division,
          round_number: 6,
          match_date: finalsDate,
          host_club_id: hostClub.club_id,
          team1_id: finalDef.team1.team_id,
          team2_id: finalDef.team2.team_id,
          status: 'scheduled',
          team1_points: 0,
          team2_points: 0,
          match_type: finalDef.match_type,
        });

        if (error) throw error;
      }

      setMessage({ type: 'success', text: 'Matchs de finale générés avec succès !' });
      await loadData();
    } catch (err) {
      console.error('Error generating finals:', err);
      setMessage({ type: 'error', text: 'Erreur lors de la génération des finales' });
    } finally {
      setGenerating(false);
    }
  };

  const deleteAllFinals = async () => {
    if (!confirm('Supprimer tous les matchs de finale ? Cette action effacera également les sélections et résultats associés.')) return;

    try {
      const finalIds = finalMatches.map((m) => m.id);
      await supabase.from('individual_matches').delete().in('match_id', finalIds);
      await supabase.from('match_player_selections').delete().in('match_id', finalIds);
      await supabase.from('matches').delete().in('id', finalIds);

      setMessage({ type: 'success', text: 'Finales supprimées' });
      await loadData();
    } catch (err) {
      console.error('Error deleting finals:', err);
      setMessage({ type: 'error', text: 'Erreur lors de la suppression' });
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' });
  };

  const hostClub = HOST_CLUBS[division];
  const hasFinals = finalMatches.length > 0;
  const divisionLabel = division === 'champe1' ? 'Champe 1' : 'Champe 2';

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-12 w-12 text-emerald-600 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <Trophy className="h-6 w-6 text-amber-500" />
            Finales {divisionLabel}
          </h2>
          <p className="text-sm text-slate-500 mt-1">
            Hébergées par <span className="font-medium text-slate-700">{hostClub.name}</span>
          </p>
        </div>
        {hasFinals && (
          <button
            onClick={deleteAllFinals}
            className="flex items-center gap-2 px-4 py-2 bg-red-50 text-red-700 border border-red-200 rounded-lg hover:bg-red-100 transition-colors text-sm font-medium"
          >
            <Trash2 className="h-4 w-4" />
            Supprimer les finales
          </button>
        )}
      </div>

      {message && (
        <div
          className={`p-4 rounded-lg flex items-center gap-2 ${
            message.type === 'success'
              ? 'bg-emerald-50 border border-emerald-200 text-emerald-900'
              : 'bg-red-50 border border-red-200 text-red-900'
          }`}
        >
          {message.type === 'success' ? <Check className="h-5 w-5" /> : <AlertCircle className="h-5 w-5" />}
          <span className="font-medium">{message.text}</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <h3 className="text-lg font-semibold text-slate-900 mb-4">
            Classement saison régulière
          </h3>
          <div className="space-y-2">
            {standings.map((team) => (
              <div
                key={team.team_id}
                className={`flex items-center gap-3 p-3 rounded-lg ${
                  team.position <= 2
                    ? 'bg-amber-50 border border-amber-200'
                    : team.position <= 4
                    ? 'bg-slate-50 border border-slate-200'
                    : 'bg-orange-50 border border-orange-100'
                }`}
              >
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${
                    team.position === 1
                      ? 'bg-amber-200 text-amber-800'
                      : team.position === 2
                      ? 'bg-slate-300 text-slate-700'
                      : team.position === 3
                      ? 'bg-orange-200 text-orange-800'
                      : team.position === 4
                      ? 'bg-orange-100 text-orange-700'
                      : 'bg-slate-100 text-slate-600'
                  }`}
                >
                  {team.position}
                </div>
                <div className="flex-1">
                  <p className="font-medium text-slate-900">{team.club_name}</p>
                  <p className="text-xs text-slate-500">{team.total_points} pts • {team.away_wins} V ext.</p>
                </div>
                <div className="text-xs font-medium text-slate-500">
                  {team.position <= 2 ? (
                    <span className="px-2 py-0.5 bg-amber-100 text-amber-700 rounded-full">Finale 1/2</span>
                  ) : team.position <= 4 ? (
                    <span className="px-2 py-0.5 bg-slate-200 text-slate-600 rounded-full">Match 3/4</span>
                  ) : (
                    <span className="px-2 py-0.5 bg-orange-100 text-orange-600 rounded-full">Match 5/6</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-4">
          {!hasFinals ? (
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
              <h3 className="text-lg font-semibold text-slate-900 mb-4">Générer les finales</h3>

              <div className="mb-4">
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Date des finales
                </label>
                <input
                  type="date"
                  value={finalsDate}
                  onChange={(e) => setFinalsDate(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                />
              </div>

              <div className="bg-slate-50 rounded-lg p-4 mb-4 space-y-2 text-sm text-slate-700">
                <p className="font-semibold text-slate-900 mb-2">Matchs à créer :</p>
                {standings.length >= 2 && (
                  <div className="flex items-center gap-2">
                    <Trophy className="h-4 w-4 text-amber-500" />
                    <span><strong>Finale :</strong> {standings[0]?.club_name} vs {standings[1]?.club_name}</span>
                  </div>
                )}
                {standings.length >= 4 && (
                  <div className="flex items-center gap-2">
                    <span className="w-4 text-center text-slate-400">3</span>
                    <span><strong>Match 3e/4e :</strong> {standings[2]?.club_name} vs {standings[3]?.club_name}</span>
                  </div>
                )}
                {standings.length >= 6 && (
                  <div className="flex items-center gap-2">
                    <span className="w-4 text-center text-slate-400">5</span>
                    <span><strong>Match 5e/6e :</strong> {standings[4]?.club_name} vs {standings[5]?.club_name}</span>
                  </div>
                )}
                <p className="text-xs text-slate-500 pt-2">
                  Tous les matchs se jouent à <strong>{hostClub.name}</strong>
                </p>
              </div>

              <button
                onClick={generateFinals}
                disabled={generating || standings.length < 6}
                className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 font-medium transition-colors disabled:opacity-50"
              >
                {generating ? (
                  <>
                    <Loader2 className="h-5 w-5 animate-spin" />
                    Génération...
                  </>
                ) : (
                  <>
                    <Plus className="h-5 w-5" />
                    Générer les 3 matchs de finale
                  </>
                )}
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              <h3 className="text-lg font-semibold text-slate-900">Matchs de finale créés</h3>
              {(['final_1st', 'final_3rd', 'final_5th'] as const).map((type) => {
                const match = finalMatches.find((m) => m.match_type === type);
                if (!match) return null;
                return (
                  <div
                    key={type}
                    className={`rounded-xl border p-4 ${MATCH_TYPE_COLORS[type]}`}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <p className="text-sm font-bold text-slate-900">
                          {MATCH_TYPE_LABELS[type]}
                        </p>
                        <p className="text-xs text-slate-500 mt-0.5">{formatDate(match.match_date)} • {hostClub.name}</p>
                      </div>
                      <span
                        className={`px-2 py-0.5 text-xs font-medium rounded-full ${
                          match.status === 'completed'
                            ? 'bg-emerald-100 text-emerald-700'
                            : 'bg-blue-100 text-blue-700'
                        }`}
                      >
                        {match.status === 'completed' ? 'Terminé' : 'Programmé'}
                      </span>
                    </div>
                    <p className="text-sm font-semibold text-slate-800">
                      {match.team1_club}
                      <span className="text-slate-400 font-normal mx-2">vs</span>
                      {match.team2_club}
                    </p>
                  </div>
                );
              })}
            </div>
          )}

          <div className="bg-sky-50 rounded-xl border border-sky-200 p-4">
            <h4 className="text-sm font-semibold text-sky-900 mb-2">Format de la finale</h4>
            <ul className="space-y-1 text-sm text-sky-800">
              <li>• <strong>5 foursomes</strong> (matchs en équipes de 2 joueurs)</li>
              <li>• Chaque capitaine sélectionne <strong>10 joueurs</strong> groupés par paires</li>
              <li>• Tous les matchs se jouent le même jour à {hostClub.name}</li>
              <li>• Les capitaines du club recevant saisissent les résultats</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
