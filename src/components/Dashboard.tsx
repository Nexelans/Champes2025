import { useEffect, useState } from 'react';
import { Trophy, Calendar, Users, Loader2 } from 'lucide-react';
import { supabase } from '../lib/supabase';

type ClubStats = {
  club_id: string;
  club_name: string;
  champe1_participating: boolean;
  champe2_participating: boolean;
  team_count: number;
};

export default function Dashboard() {
  const [loading, setLoading] = useState(true);
  const [clubs, setClubs] = useState<ClubStats[]>([]);
  const [totalTeams, setTotalTeams] = useState(0);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      const { data: seasonData } = await supabase
        .from('seasons')
        .select('id')
        .eq('is_active', true)
        .maybeSingle();

      if (!seasonData) {
        setLoading(false);
        return;
      }

      const { data: seasonClubsData } = await supabase
        .from('season_clubs')
        .select(`
          club_id,
          division,
          is_participating,
          clubs!inner(name)
        `)
        .eq('season_id', seasonData.id);

      if (seasonClubsData) {
        const clubMap = new Map<string, ClubStats>();

        seasonClubsData.forEach((sc: any) => {
          if (!clubMap.has(sc.club_id)) {
            clubMap.set(sc.club_id, {
              club_id: sc.club_id,
              club_name: sc.clubs.name,
              champe1_participating: false,
              champe2_participating: false,
              team_count: 0,
            });
          }

          const club = clubMap.get(sc.club_id)!;
          if (sc.division === 'champe1' && sc.is_participating) {
            club.champe1_participating = true;
            club.team_count++;
          }
          if (sc.division === 'champe2' && sc.is_participating) {
            club.champe2_participating = true;
            club.team_count++;
          }
        });

        const clubsArray = Array.from(clubMap.values())
          .filter(c => c.team_count > 0)
          .sort((a, b) => a.club_name.localeCompare(b.club_name));

        setClubs(clubsArray);
        setTotalTeams(clubsArray.reduce((sum, c) => sum + c.team_count, 0));
      }
    } catch (error) {
      console.error('Error loading dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const stats = [
    { label: 'Clubs participants', value: clubs.length.toString(), icon: Users },
    { label: 'Équipes totales', value: totalTeams.toString(), icon: Trophy },
    { label: 'Rencontres jouées', value: '0/5', icon: Calendar },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-12 w-12 text-emerald-600 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-bold text-slate-900 mb-4">Vue d'ensemble</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {stats.map((stat) => {
            const Icon = stat.icon;
            return (
              <div
                key={stat.label}
                className="bg-white rounded-lg shadow-sm border border-slate-200 p-6"
              >
                <div className="flex items-center space-x-4">
                  <div className="bg-emerald-100 rounded-lg p-3">
                    <Icon className="w-6 h-6 text-emerald-600" />
                  </div>
                  <div>
                    <p className="text-sm text-slate-600">{stat.label}</p>
                    <p className="text-2xl font-bold text-slate-900">{stat.value}</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6">
        <h3 className="text-lg font-semibold text-slate-900 mb-4">Clubs participants</h3>
        {clubs.length === 0 ? (
          <p className="text-slate-600 text-center py-8">
            Aucun club configuré. Allez dans "Configuration" pour définir les clubs participants.
          </p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {clubs.map((club) => (
              <div
                key={club.club_id}
                className="flex items-center space-x-3 p-4 rounded-lg bg-slate-50 border border-slate-200"
              >
                <div className="w-10 h-10 rounded-full bg-emerald-600 flex items-center justify-center text-white font-semibold">
                  {club.club_name.charAt(0)}
                </div>
                <div>
                  <p className="font-medium text-slate-900">{club.club_name}</p>
                  <p className="text-sm text-slate-600">
                    {club.team_count} équipe{club.team_count > 1 ? 's' : ''}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-blue-900 mb-2">Informations importantes</h3>
        <ul className="space-y-2 text-sm text-blue-800">
          <li>• Champe 1 : Index de 0 à 17.0 (ramené à 17.0 si jusqu'à 18.0)</li>
          <li>• Champe 2 : Index de 17.1 à 30.0 (ramené à 30.0 si jusqu'à 36.0)</li>
          <li>• Les joueurs d'index 17.0-18.0 peuvent jouer dans les deux équipes de leur club</li>
          <li>• 8 joueurs par équipe en rencontre classique, 10 pour la finale</li>
          <li>• Match gagné = 2 points, Match nul = 1 point, Match perdu = 0 point</li>
        </ul>
      </div>
    </div>
  );
}