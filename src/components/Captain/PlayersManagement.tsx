import { useState, useEffect } from 'react';
import { Users, Plus, CreditCard as Edit2, Trash2, Check, X, AlertCircle, CheckCircle } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase, type Player } from '../../lib/supabase';

type PlayerWithTeam = Player & {
  team_assignment?: 'champe1' | 'champe2' | 'both' | null;
};

export default function PlayersManagement() {
  const { captain } = useAuth();
  const [players, setPlayers] = useState<PlayerWithTeam[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingPlayer, setEditingPlayer] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    license_number: '',
    handicap_index: '',
    gender: 'M' as 'M' | 'F',
    is_junior: false,
  });

  useEffect(() => {
    if (captain) {
      loadPlayers();
    }
  }, [captain]);

  const loadPlayers = async () => {
    if (!captain) return;

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('players')
        .select('*')
        .eq('club_id', captain.club_id)
        .order('last_name');

      if (error) throw error;

      const playersWithTeams = await Promise.all(
        (data || []).map(async (player) => {
          const { data: teamAssignments } = await supabase
            .from('team_players')
            .select(`
              team_id,
              teams!inner(division)
            `)
            .eq('player_id', player.id)
            .eq('is_active', true);

          let assignment: 'champe1' | 'champe2' | 'both' | null = null;
          if (teamAssignments && teamAssignments.length > 0) {
            const divisions = teamAssignments.map((ta: any) => ta.teams.division);
            if (divisions.includes('champe1') && divisions.includes('champe2')) {
              assignment = 'both';
            } else if (divisions.includes('champe1')) {
              assignment = 'champe1';
            } else if (divisions.includes('champe2')) {
              assignment = 'champe2';
            }
          }

          return {
            ...player,
            team_assignment: assignment,
          };
        })
      );

      setPlayers(playersWithTeams);
    } catch (error) {
      console.error('Error loading players:', error);
    } finally {
      setLoading(false);
    }
  };

  const validateIndex = (index: number, division: 'champe1' | 'champe2' | 'both') => {
    if (division === 'champe1') {
      return index >= 0 && index <= 18;
    } else if (division === 'champe2') {
      return index >= 17 && index <= 36;
    } else {
      return index >= 17 && index <= 18;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!captain) return;

    const index = parseFloat(formData.handicap_index);
    if (isNaN(index) || index < 0 || index > 54) {
      setMessage({ type: 'error', text: 'Index invalide (doit être entre 0 et 54)' });
      return;
    }

    if (captain.division === 'champe1' && index > 18) {
      setMessage({ type: 'error', text: 'Index invalide pour Champe 1 (maximum 18)' });
      return;
    }

    if (captain.division === 'champe2' && index < 17) {
      setMessage({ type: 'error', text: 'Index invalide pour Champe 2 (minimum 17)' });
      return;
    }

    setLoading(true);
    setMessage(null);

    try {
      if (editingPlayer) {
        const { error } = await supabase
          .from('players')
          .update({
            first_name: formData.first_name,
            last_name: formData.last_name,
            license_number: formData.license_number || null,
            handicap_index: index,
            gender: formData.gender,
            is_junior: formData.is_junior,
          })
          .eq('id', editingPlayer);

        if (error) throw error;
        setMessage({ type: 'success', text: 'Joueur mis à jour avec succès' });
      } else {
        const { error } = await supabase.from('players').insert({
          club_id: captain.club_id,
          first_name: formData.first_name,
          last_name: formData.last_name,
          license_number: formData.license_number || null,
          handicap_index: index,
          gender: formData.gender,
          is_junior: formData.is_junior,
          is_validated: false,
        });

        if (error) throw error;
        setMessage({ type: 'success', text: 'Joueur ajouté avec succès' });
      }

      resetForm();
      await loadPlayers();
    } catch (error) {
      console.error('Error saving player:', error);
      setMessage({ type: 'error', text: 'Erreur lors de l\'enregistrement' });
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (player: Player) => {
    setEditingPlayer(player.id);
    setFormData({
      first_name: player.first_name,
      last_name: player.last_name,
      license_number: player.license_number || '',
      handicap_index: player.handicap_index.toString(),
      gender: player.gender,
      is_junior: player.is_junior,
    });
    setShowAddForm(true);
  };

  const handleDelete = async (playerId: string) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer ce joueur ?')) return;

    try {
      const { error } = await supabase.from('players').delete().eq('id', playerId);
      if (error) throw error;
      setMessage({ type: 'success', text: 'Joueur supprimé avec succès' });
      await loadPlayers();
    } catch (error) {
      console.error('Error deleting player:', error);
      setMessage({ type: 'error', text: 'Erreur lors de la suppression' });
    }
  };

  const resetForm = () => {
    setFormData({
      first_name: '',
      last_name: '',
      license_number: '',
      handicap_index: '',
      gender: 'M',
      is_junior: false,
    });
    setShowAddForm(false);
    setEditingPlayer(null);
  };

  const getIndexValidation = (index: number) => {
    const canPlayChampe1 = index <= 18;
    const canPlayChampe2 = index >= 17 && index <= 36;
    const canPlayBoth = index >= 17 && index <= 18;

    return { canPlayChampe1, canPlayChampe2, canPlayBoth };
  };

  if (!captain) return null;

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <Users className="h-6 w-6 text-emerald-600" />
            <div>
              <h2 className="text-xl font-bold text-slate-900">Gestion des Joueurs</h2>
              <p className="text-sm text-slate-600">{captain.club_name}</p>
            </div>
          </div>
          <button
            onClick={() => setShowAddForm(!showAddForm)}
            className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 font-medium transition-colors flex items-center gap-2"
          >
            <Plus className="h-4 w-4" />
            Ajouter un joueur
          </button>
        </div>

        {message && (
          <div
            className={`p-4 rounded-lg mb-6 ${
              message.type === 'success'
                ? 'bg-emerald-50 border border-emerald-200'
                : 'bg-red-50 border border-red-200'
            }`}
          >
            <div className="flex items-center gap-2">
              {message.type === 'success' ? (
                <CheckCircle className="h-5 w-5 text-emerald-600" />
              ) : (
                <AlertCircle className="h-5 w-5 text-red-600" />
              )}
              <span
                className={`text-sm font-medium ${
                  message.type === 'success' ? 'text-emerald-900' : 'text-red-900'
                }`}
              >
                {message.text}
              </span>
            </div>
          </div>
        )}

        {showAddForm && (
          <form onSubmit={handleSubmit} className="mb-6 p-4 bg-slate-50 rounded-lg border border-slate-200">
            <h3 className="font-semibold text-slate-900 mb-4">
              {editingPlayer ? 'Modifier le joueur' : 'Nouveau joueur'}
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Prénom</label>
                <input
                  type="text"
                  value={formData.first_name}
                  onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                  required
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Nom</label>
                <input
                  type="text"
                  value={formData.last_name}
                  onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                  required
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">N° Licence</label>
                <input
                  type="text"
                  value={formData.license_number}
                  onChange={(e) => setFormData({ ...formData, license_number: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Index</label>
                <input
                  type="number"
                  step="0.1"
                  value={formData.handicap_index}
                  onChange={(e) => setFormData({ ...formData, handicap_index: e.target.value })}
                  required
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Genre</label>
                <select
                  value={formData.gender}
                  onChange={(e) => setFormData({ ...formData, gender: e.target.value as 'M' | 'F' })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="M">Homme</option>
                  <option value="F">Femme</option>
                </select>
              </div>
              <div className="flex items-center">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.is_junior}
                    onChange={(e) => setFormData({ ...formData, is_junior: e.target.checked })}
                    className="w-4 h-4 text-emerald-600 rounded focus:ring-emerald-500"
                  />
                  <span className="text-sm font-medium text-slate-700">Joueur junior</span>
                </label>
              </div>
            </div>
            <div className="flex gap-2 mt-4">
              <button
                type="submit"
                disabled={loading}
                className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 font-medium transition-colors disabled:opacity-50 flex items-center gap-2"
              >
                <Check className="h-4 w-4" />
                {editingPlayer ? 'Modifier' : 'Ajouter'}
              </button>
              <button
                type="button"
                onClick={resetForm}
                className="px-4 py-2 bg-slate-200 text-slate-700 rounded-lg hover:bg-slate-300 font-medium transition-colors flex items-center gap-2"
              >
                <X className="h-4 w-4" />
                Annuler
              </button>
            </div>
          </form>
        )}

        {loading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600"></div>
          </div>
        ) : players.length === 0 ? (
          <div className="text-center py-12">
            <Users className="h-12 w-12 text-slate-300 mx-auto mb-3" />
            <p className="text-slate-500">Aucun joueur enregistré</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">Nom</th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-slate-500 uppercase">Index</th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-slate-500 uppercase">Genre</th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-slate-500 uppercase">Équipe(s)</th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-slate-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {players.map((player) => {
                  const validation = getIndexValidation(player.handicap_index);
                  return (
                    <tr key={player.id} className="hover:bg-slate-50">
                      <td className="px-4 py-3">
                        <div>
                          <div className="font-medium text-slate-900">
                            {player.first_name} {player.last_name}
                          </div>
                          {player.license_number && (
                            <div className="text-xs text-slate-500">N° {player.license_number}</div>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className="font-medium text-slate-900">{player.handicap_index}</span>
                      </td>
                      <td className="px-4 py-3 text-center text-sm text-slate-600">
                        {player.gender === 'M' ? 'H' : 'F'}
                        {player.is_junior && <span className="ml-1 text-xs">(Junior)</span>}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <div className="flex justify-center gap-1">
                          {validation.canPlayChampe1 && (
                            <span className="px-2 py-1 bg-emerald-100 text-emerald-700 text-xs rounded">
                              C1
                            </span>
                          )}
                          {validation.canPlayChampe2 && (
                            <span className="px-2 py-1 bg-sky-100 text-sky-700 text-xs rounded">
                              C2
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={() => handleEdit(player)}
                            className="p-1.5 text-slate-600 hover:text-emerald-600 hover:bg-emerald-50 rounded transition-colors"
                          >
                            <Edit2 className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(player.id)}
                            className="p-1.5 text-slate-600 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="bg-gradient-to-r from-emerald-50 to-sky-50 rounded-xl p-6 border border-emerald-200">
        <h3 className="text-lg font-semibold text-slate-900 mb-3">Règles d'index</h3>
        <ul className="space-y-2 text-sm text-slate-700">
          <li className="flex items-start gap-2">
            <span className="px-2 py-0.5 bg-emerald-100 text-emerald-700 text-xs rounded font-medium">C1</span>
            <span>Index 0 à 18 (ramené à 17 max)</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="px-2 py-0.5 bg-sky-100 text-sky-700 text-xs rounded font-medium">C2</span>
            <span>Index 17 à 36 (ramené à 30 max)</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-emerald-600 font-bold">•</span>
            <span>Les joueurs avec index 17-18 peuvent jouer dans les deux équipes de leur club</span>
          </li>
        </ul>
      </div>
    </div>
  );
}
