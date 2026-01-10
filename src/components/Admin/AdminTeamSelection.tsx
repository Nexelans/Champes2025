import { useState, useEffect } from 'react';
import { Users, ChevronDown } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import TeamSelection from '../Captain/TeamSelection';

interface Team {
  id: string;
  division: string;
  club_id: string;
  club: {
    id: string;
    name: string;
  };
}

export default function AdminTeamSelection() {
  const [teams, setTeams] = useState<Team[]>([]);
  const [selectedTeam, setSelectedTeam] = useState<Team | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadTeams();
  }, []);

  const loadTeams = async () => {
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

      const { data, error } = await supabase
        .from('teams')
        .select(`
          id,
          division,
          club_id,
          club:clubs(id, name)
        `)
        .eq('season_id', seasonData.id)
        .order('division')
        .order('club(name)');

      if (error) throw error;
      setTeams(data || []);
    } catch (err) {
      console.error('Error loading teams:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-slate-600">Chargement des équipes...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-slate-900 mb-4">
          Gérer les sélections des équipes
        </h3>
        <p className="text-sm text-slate-600 mb-4">
          Sélectionnez une équipe pour gérer sa composition de joueurs pour chaque journée.
        </p>

        <div className="relative">
          <select
            value={selectedTeam?.id || ''}
            onChange={(e) => {
              const team = teams.find(t => t.id === e.target.value);
              setSelectedTeam(team || null);
            }}
            className="w-full max-w-md px-4 py-2 pr-10 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 appearance-none"
          >
            <option value="">-- Choisir une équipe --</option>
            {teams.map((team) => (
              <option key={team.id} value={team.id}>
                {team.club.name} - {team.division === 'champe1' ? 'Championnat 1' : 'Championnat 2'}
              </option>
            ))}
          </select>
          <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 pointer-events-none" />
        </div>
      </div>

      {selectedTeam && (
        <div className="border-t border-slate-200 pt-6">
          <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4 mb-6 flex items-start space-x-2">
            <Users className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-emerald-900">Mode administrateur</p>
              <p className="text-sm text-emerald-800">
                Vous gérez les sélections pour : <strong>{selectedTeam.club.name}</strong>
              </p>
            </div>
          </div>

          <TeamSelection
            captain={{
              id: 'admin',
              team_id: selectedTeam.id,
              club_id: selectedTeam.club_id,
              division: selectedTeam.division,
            }}
          />
        </div>
      )}
    </div>
  );
}
