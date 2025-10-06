import { useEffect, useState } from 'react';
import { Users, Phone, Mail } from 'lucide-react';
import { supabase } from '../lib/supabase';

type TeamsProps = {
  division: 'champe1' | 'champe2';
};

type TeamInfo = {
  team_id: string;
  club_name: string;
  captain_name: string;
  captain_phone: string;
  captain_email: string;
  players_count: number;
};

export default function Teams({ division }: TeamsProps) {
  const [teams, setTeams] = useState<TeamInfo[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadTeams();
  }, [division]);

  const loadTeams = async () => {
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

      const { data: teamsData } = await supabase
        .from('teams')
        .select(`
          id,
          club:clubs(name),
          captains(first_name, last_name, phone, email)
        `)
        .eq('season_id', season.id)
        .eq('division', division);

      if (teamsData) {
        const teamsInfo: TeamInfo[] = await Promise.all(
          teamsData.map(async (team: any) => {
            const { count } = await supabase
              .from('team_players')
              .select('*', { count: 'exact', head: true })
              .eq('team_id', team.id)
              .eq('is_active', true);

            const captain = team.captains?.[0];

            return {
              team_id: team.id,
              club_name: team.club?.name || '',
              captain_name: captain
                ? `${captain.first_name} ${captain.last_name}`
                : 'Non défini',
              captain_phone: captain?.phone || '',
              captain_email: captain?.email || '',
              players_count: count || 0,
            };
          })
        );

        teamsInfo.sort((a, b) => a.club_name.localeCompare(b.club_name));
        setTeams(teamsInfo);
      }
    } catch (error) {
      console.error('Error loading teams:', error);
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
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
        <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2 mb-6">
          <Users className="h-6 w-6 text-emerald-600" />
          Équipes {division === 'champe1' ? 'Champe 1' : 'Champe 2'}
        </h2>

        {teams.length === 0 ? (
          <div className="text-center py-12">
            <Users className="h-12 w-12 text-slate-300 mx-auto mb-3" />
            <p className="text-slate-500">Aucune équipe enregistrée</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {teams.map((team) => (
              <div
                key={team.team_id}
                className="bg-slate-50 rounded-lg border border-slate-200 overflow-hidden hover:shadow-lg transition-shadow"
              >
                <div className="bg-gradient-to-r from-emerald-500 to-sky-500 p-4">
                  <h3 className="text-xl font-bold text-white">{team.club_name}</h3>
                  <p className="text-emerald-50 text-sm mt-1">
                    {team.players_count} joueur{team.players_count !== 1 ? 's' : ''}{' '}
                    enregistré{team.players_count !== 1 ? 's' : ''}
                  </p>
                </div>

                <div className="p-5 space-y-4">
                  <div>
                    <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
                      Capitaine
                    </h4>
                    <p className="font-medium text-slate-900">{team.captain_name}</p>
                  </div>

                  <div className="space-y-2">
                    {team.captain_phone && (
                      <div className="flex items-center gap-2 text-sm text-slate-600">
                        <Phone className="h-4 w-4 text-slate-400" />
                        <a
                          href={`tel:${team.captain_phone}`}
                          className="hover:text-emerald-600 transition-colors"
                        >
                          {team.captain_phone}
                        </a>
                      </div>
                    )}

                    {team.captain_email && (
                      <div className="flex items-center gap-2 text-sm text-slate-600">
                        <Mail className="h-4 w-4 text-slate-400" />
                        <a
                          href={`mailto:${team.captain_email}`}
                          className="hover:text-emerald-600 transition-colors truncate"
                        >
                          {team.captain_email}
                        </a>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="bg-gradient-to-r from-emerald-50 to-sky-50 rounded-xl p-6 border border-emerald-200">
        <h3 className="text-lg font-semibold text-slate-900 mb-3">
          Règles de composition des équipes
        </h3>
        <div className="space-y-2 text-sm text-slate-700">
          <p>
            <span className="font-medium">Champe 1 :</span> Joueurs avec index de 0 à 17,0
            (index jusqu'à 18 ramené à 17)
          </p>
          <p>
            <span className="font-medium">Champe 2 :</span> Joueurs avec index de 17,1 à 30
            (index jusqu'à 36 ramené à 30)
          </p>
          <p>
            <span className="font-medium">Rencontres régulières :</span> 8 joueurs par équipe,
            24 matchs individuels
          </p>
          <p>
            <span className="font-medium">Finale :</span> 10 joueurs par équipe en foursomes,
            30 matchs
          </p>
          <p className="mt-3 text-xs text-slate-600">
            Exception : Les joueurs avec index 17-18 peuvent jouer dans les deux équipes
            (Champe 1 et Champe 2) de leur club uniquement.
          </p>
        </div>
      </div>
    </div>
  );
}
