import { useState, useEffect } from 'react';
import { Users, Plus, CreditCard as Edit2, Trash2, Check, X, AlertCircle, CheckCircle, Mail, Clock, UserCheck } from 'lucide-react';
import { supabase } from '../../lib/supabase';

type Club = {
  id: string;
  name: string;
};

type Captain = {
  id: string;
  first_name: string;
  last_name: string;
  phone: string;
  email: string;
  team_id: string | null;
  invitation_sent_at: string | null;
  first_login_at: string | null;
  last_login_at: string | null;
  login_count: number;
};

type Team = {
  id: string;
  division: 'champe1' | 'champe2';
  club_id: string;
  club_name: string;
  captain?: Captain;
};

export default function TeamManagement() {
  const [clubs, setClubs] = useState<Club[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [allCaptains, setAllCaptains] = useState<Captain[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingCaptain, setEditingCaptain] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [assigningTeam, setAssigningTeam] = useState<string | null>(null);
  const [selectedCaptainId, setSelectedCaptainId] = useState<string>('');

  const [formData, setFormData] = useState({
    team_id: '',
    first_name: '',
    last_name: '',
    phone: '',
    email: '',
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
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
        .select('club_id, division')
        .eq('season_id', seasonData.id)
        .eq('is_participating', true);

      const participatingTeams = seasonClubsData || [];

      const { data: clubsData } = await supabase
        .from('clubs')
        .select('id, name')
        .order('name');

      const { data: teamsData } = await supabase
        .from('teams')
        .select(`
          id,
          division,
          club_id,
          season_id,
          clubs!inner(name)
        `)
        .eq('season_id', seasonData.id)
        .order('division');

      const { data: captainsData } = await supabase
        .from('captains')
        .select('*')
        .order('last_name');

      setClubs(clubsData || []);
      setAllCaptains(captainsData || []);

      const filteredTeams = (teamsData || []).filter((team: any) =>
        participatingTeams.some(
          (pt) => pt.club_id === team.club_id && pt.division === team.division
        )
      );

      const teamsWithCaptains = filteredTeams.map((team: any) => ({
        id: team.id,
        division: team.division,
        club_id: team.club_id,
        club_name: team.clubs.name,
        captain: captainsData?.find((c) => c.team_id === team.id),
      }));

      setTeams(teamsWithCaptains);
    } catch (error) {
      console.error('Error loading data:', error);
      setMessage({ type: 'error', text: 'Erreur lors du chargement des données' });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.team_id) return;

    setLoading(true);
    setMessage(null);

    try {
      if (editingCaptain) {
        const { error } = await supabase
          .from('captains')
          .update({
            first_name: formData.first_name,
            last_name: formData.last_name,
            phone: formData.phone,
            email: formData.email,
          })
          .eq('id', editingCaptain);

        if (error) throw error;
        setMessage({ type: 'success', text: 'Capitaine mis à jour avec succès' });
      } else {
        const { error } = await supabase.from('captains').insert({
          team_id: formData.team_id,
          first_name: formData.first_name,
          last_name: formData.last_name,
          phone: formData.phone,
          email: formData.email,
        });

        if (error) throw error;
        setMessage({ type: 'success', text: 'Capitaine créé avec succès' });
      }

      resetForm();
      await loadData();
    } catch (error: any) {
      console.error('Error saving captain:', error);
      setMessage({
        type: 'error',
        text: error.message?.includes('captains_email_key')
          ? 'Cet email est déjà utilisé'
          : 'Erreur lors de l\'enregistrement'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (team: Team) => {
    if (!team.captain) return;

    setEditingCaptain(team.captain.id);
    setFormData({
      team_id: team.id,
      first_name: team.captain.first_name,
      last_name: team.captain.last_name,
      phone: team.captain.phone,
      email: team.captain.email,
    });
    setShowForm(true);
  };

  const handleDelete = async (captainId: string) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer ce capitaine ?')) return;

    try {
      const { error } = await supabase
        .from('captains')
        .delete()
        .eq('id', captainId);

      if (error) throw error;
      setMessage({ type: 'success', text: 'Capitaine supprimé avec succès' });
      await loadData();
    } catch (error) {
      console.error('Error deleting captain:', error);
      setMessage({ type: 'error', text: 'Erreur lors de la suppression' });
    }
  };

  const handleResendInvitation = async (captainId: string, captainName: string) => {
    if (!confirm(`Renvoyer l'invitation à ${captainName} ?`)) return;

    setLoading(true);
    setMessage(null);

    try {
      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData.session) {
        setMessage({ type: 'error', text: 'Session expirée' });
        return;
      }

      const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-captain-invitations`;
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${sessionData.session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ captain_id: captainId }),
      });

      if (response.ok) {
        setMessage({ type: 'success', text: 'Invitation renvoyée avec succès' });
        await loadData();
      } else {
        setMessage({ type: 'error', text: 'Erreur lors de l\'envoi de l\'invitation' });
      }
    } catch (error) {
      console.error('Error resending invitation:', error);
      setMessage({ type: 'error', text: 'Erreur lors de l\'envoi de l\'invitation' });
    } finally {
      setLoading(false);
    }
  };

  const handleAssignCaptain = async (teamId: string) => {
    if (!selectedCaptainId) return;

    setLoading(true);
    setMessage(null);

    try {
      const { error } = await supabase
        .from('captains')
        .update({ team_id: teamId })
        .eq('id', selectedCaptainId);

      if (error) throw error;

      setMessage({ type: 'success', text: 'Capitaine affecté avec succès' });
      setAssigningTeam(null);
      setSelectedCaptainId('');
      await loadData();
    } catch (error) {
      console.error('Error assigning captain:', error);
      setMessage({ type: 'error', text: 'Erreur lors de l\'affectation' });
    } finally {
      setLoading(false);
    }
  };

  const handleUnassignCaptain = async (captainId: string) => {
    if (!confirm('Êtes-vous sûr de vouloir désaffecter ce capitaine de son équipe ?')) return;

    setLoading(true);
    setMessage(null);

    try {
      const { error } = await supabase
        .from('captains')
        .update({ team_id: null })
        .eq('id', captainId);

      if (error) throw error;

      setMessage({ type: 'success', text: 'Capitaine désaffecté avec succès' });
      await loadData();
    } catch (error) {
      console.error('Error unassigning captain:', error);
      setMessage({ type: 'error', text: 'Erreur lors de la désaffectation' });
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      team_id: '',
      first_name: '',
      last_name: '',
      phone: '',
      email: '',
    });
    setShowForm(false);
    setEditingCaptain(null);
  };

  if (loading && teams.length === 0) {
    return (
      <div className="flex justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <Users className="h-6 w-6 text-emerald-600" />
            <div>
              <h2 className="text-xl font-bold text-slate-900">Gestion des Capitaines</h2>
              <p className="text-sm text-slate-600">Créer et gérer les capitaines d'équipe</p>
            </div>
          </div>
          <button
            onClick={() => setShowForm(!showForm)}
            className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 font-medium transition-colors flex items-center gap-2"
          >
            <Plus className="h-4 w-4" />
            Ajouter un capitaine
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

        {showForm && (
          <form onSubmit={handleSubmit} className="mb-6 p-4 bg-slate-50 rounded-lg border border-slate-200">
            <h3 className="font-semibold text-slate-900 mb-4">
              {editingCaptain ? 'Modifier le capitaine' : 'Nouveau capitaine'}
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Équipe
                </label>
                <select
                  value={formData.team_id}
                  onChange={(e) => setFormData({ ...formData, team_id: e.target.value })}
                  disabled={!!editingCaptain}
                  required
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 disabled:bg-slate-100 disabled:cursor-not-allowed"
                >
                  <option value="">Sélectionner une équipe</option>
                  {teams
                    .filter((t) => !t.captain || t.captain.id === editingCaptain)
                    .map((team) => (
                      <option key={team.id} value={team.id}>
                        {team.club_name} - {team.division === 'champe1' ? 'Champe 1' : 'Champe 2'}
                      </option>
                    ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Prénom
                </label>
                <input
                  type="text"
                  value={formData.first_name}
                  onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                  required
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Nom
                </label>
                <input
                  type="text"
                  value={formData.last_name}
                  onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                  required
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Téléphone
                </label>
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  required
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Email
                </label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  required
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
                />
              </div>
            </div>
            <div className="flex gap-2 mt-4">
              <button
                type="submit"
                disabled={loading}
                className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 font-medium transition-colors disabled:opacity-50 flex items-center gap-2"
              >
                <Check className="h-4 w-4" />
                {editingCaptain ? 'Modifier' : 'Créer'}
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

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">
                  Équipe
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">
                  Capitaine
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">
                  Contact
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">
                  Statut
                </th>
                <th className="px-4 py-3 text-center text-xs font-medium text-slate-500 uppercase">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {teams.map((team) => (
                <tr key={team.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3">
                    <div>
                      <div className="font-medium text-slate-900">{team.club_name}</div>
                      <div className="text-xs text-slate-500">
                        {team.division === 'champe1' ? 'Champe 1' : 'Champe 2'}
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    {team.captain ? (
                      <span className="font-medium text-slate-900">
                        {team.captain.first_name} {team.captain.last_name}
                      </span>
                    ) : assigningTeam === team.id ? (
                      <div className="flex items-center gap-2">
                        <select
                          value={selectedCaptainId}
                          onChange={(e) => setSelectedCaptainId(e.target.value)}
                          className="text-sm px-2 py-1 border border-slate-300 rounded focus:ring-2 focus:ring-emerald-500"
                          autoFocus
                        >
                          <option value="">Sélectionner un capitaine</option>
                          {allCaptains
                            .filter((c) => !c.team_id)
                            .map((captain) => (
                              <option key={captain.id} value={captain.id}>
                                {captain.first_name} {captain.last_name}
                              </option>
                            ))}
                        </select>
                        <button
                          onClick={() => handleAssignCaptain(team.id)}
                          disabled={!selectedCaptainId}
                          className="p-1 text-emerald-600 hover:bg-emerald-50 rounded disabled:opacity-50"
                        >
                          <Check className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => {
                            setAssigningTeam(null);
                            setSelectedCaptainId('');
                          }}
                          className="p-1 text-slate-600 hover:bg-slate-100 rounded"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setAssigningTeam(team.id)}
                        className="text-sm text-emerald-600 hover:text-emerald-700 font-medium"
                      >
                        + Affecter un capitaine
                      </button>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {team.captain ? (
                      <div className="text-sm">
                        <div className="text-slate-900">{team.captain.phone}</div>
                        <div className="text-slate-600">{team.captain.email}</div>
                      </div>
                    ) : (
                      <span className="text-sm text-slate-400">-</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {team.captain ? (
                      <div className="space-y-1">
                        {team.captain.invitation_sent_at ? (
                          <div className="flex items-center gap-1.5 text-xs">
                            <Mail className="h-3.5 w-3.5 text-emerald-600" />
                            <span className="text-slate-600">
                              Invitation envoyée
                            </span>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1.5 text-xs">
                            <Clock className="h-3.5 w-3.5 text-amber-600" />
                            <span className="text-slate-600">En attente</span>
                          </div>
                        )}
                        {team.captain.first_login_at ? (
                          <div className="flex items-center gap-1.5 text-xs">
                            <UserCheck className="h-3.5 w-3.5 text-emerald-600" />
                            <span className="text-slate-600">
                              Connecté ({team.captain.login_count}x)
                            </span>
                          </div>
                        ) : team.captain.invitation_sent_at ? (
                          <div className="flex items-center gap-1.5 text-xs">
                            <AlertCircle className="h-3.5 w-3.5 text-amber-600" />
                            <span className="text-amber-700 font-medium">
                              Pas encore connecté
                            </span>
                          </div>
                        ) : null}
                        {team.captain.last_login_at && (
                          <div className="text-xs text-slate-500">
                            Dernière visite: {new Date(team.captain.last_login_at).toLocaleDateString('fr-FR')}
                          </div>
                        )}
                      </div>
                    ) : (
                      <span className="text-sm text-slate-400">-</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-center gap-2">
                      {team.captain ? (
                        <>
                          {team.captain.invitation_sent_at && !team.captain.first_login_at && (
                            <button
                              onClick={() =>
                                handleResendInvitation(
                                  team.captain!.id,
                                  `${team.captain!.first_name} ${team.captain!.last_name}`
                                )
                              }
                              className="p-1.5 text-slate-600 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                              title="Renvoyer l'invitation"
                            >
                              <Mail className="h-4 w-4" />
                            </button>
                          )}
                          <button
                            onClick={() => handleEdit(team)}
                            className="p-1.5 text-slate-600 hover:text-emerald-600 hover:bg-emerald-50 rounded transition-colors"
                            title="Modifier"
                          >
                            <Edit2 className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleUnassignCaptain(team.captain!.id)}
                            className="p-1.5 text-slate-600 hover:text-amber-600 hover:bg-amber-50 rounded transition-colors"
                            title="Désaffecter"
                          >
                            <X className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(team.captain!.id)}
                            className="p-1.5 text-slate-600 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                            title="Supprimer"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </>
                      ) : (
                        <span className="text-xs text-slate-400">-</span>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="bg-gradient-to-r from-blue-50 to-emerald-50 rounded-xl p-6 border border-blue-200">
        <h3 className="text-lg font-semibold text-slate-900 mb-3">
          Processus de connexion des capitaines
        </h3>
        <ol className="space-y-2 text-sm text-slate-700 list-decimal list-inside">
          <li>Le super admin crée le capitaine avec ses informations de contact</li>
          <li>Le capitaine reçoit un email à l'adresse renseignée</li>
          <li>Le capitaine clique sur "Mot de passe oublié" sur la page de connexion</li>
          <li>Il entre son adresse email et reçoit un lien de réinitialisation</li>
          <li>Il définit son mot de passe et peut se connecter</li>
        </ol>
      </div>
    </div>
  );
}
