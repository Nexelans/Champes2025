import { useEffect, useState } from 'react';
import { Building2, Plus, Trash2, Check, AlertCircle } from 'lucide-react';
import { supabase } from '../../lib/supabase';

type Club = {
  id: string;
  name: string;
};

export default function ClubManagement() {
  const [clubs, setClubs] = useState<Club[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [newClubName, setNewClubName] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);

  useEffect(() => {
    loadClubs();
  }, []);

  const loadClubs = async () => {
    try {
      const { data, error } = await supabase
        .from('clubs')
        .select('id, name')
        .order('name');

      if (error) throw error;
      setClubs(data || []);
    } catch (error) {
      console.error('Error loading clubs:', error);
      setMessage({ type: 'error', text: 'Erreur lors du chargement des clubs' });
    } finally {
      setLoading(false);
    }
  };

  const addClub = async () => {
    if (!newClubName.trim()) {
      setMessage({ type: 'error', text: 'Le nom du club est requis' });
      return;
    }

    setSaving(true);
    setMessage(null);

    try {
      const { error } = await supabase
        .from('clubs')
        .insert({ name: newClubName.trim() });

      if (error) throw error;

      setMessage({ type: 'success', text: 'Club ajouté avec succès' });
      setNewClubName('');
      setShowAddForm(false);
      await loadClubs();
    } catch (error) {
      console.error('Error adding club:', error);
      setMessage({ type: 'error', text: 'Erreur lors de l\'ajout du club' });
    } finally {
      setSaving(false);
    }
  };

  const deleteClub = async (clubId: string, clubName: string) => {
    if (!confirm(`Êtes-vous sûr de vouloir supprimer le club "${clubName}" ?\n\nAttention : Cela supprimera également toutes les équipes et capitaines associés.`)) {
      return;
    }

    setSaving(true);
    setMessage(null);

    try {
      const { error } = await supabase
        .from('clubs')
        .delete()
        .eq('id', clubId);

      if (error) throw error;

      setMessage({ type: 'success', text: 'Club supprimé avec succès' });
      await loadClubs();
    } catch (error) {
      console.error('Error deleting club:', error);
      setMessage({ type: 'error', text: 'Erreur lors de la suppression du club' });
    } finally {
      setSaving(false);
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
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <Building2 className="h-6 w-6 text-emerald-600" />
            <div>
              <h2 className="text-xl font-bold text-slate-900">Gestion des clubs</h2>
              <p className="text-sm text-slate-600">{clubs.length} club(s) enregistré(s)</p>
            </div>
          </div>
          {!showAddForm && (
            <button
              onClick={() => setShowAddForm(true)}
              className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 font-medium transition-colors"
            >
              <Plus className="h-4 w-4" />
              Ajouter un club
            </button>
          )}
        </div>

        {message && (
          <div
            className={`p-4 rounded-lg mb-6 ${
              message.type === 'success'
                ? 'bg-emerald-50 border border-emerald-200 text-emerald-900'
                : 'bg-red-50 border border-red-200 text-red-900'
            }`}
          >
            <div className="flex items-center gap-2">
              {message.type === 'success' ? (
                <Check className="h-5 w-5" />
              ) : (
                <AlertCircle className="h-5 w-5" />
              )}
              <span className="font-medium">{message.text}</span>
            </div>
          </div>
        )}

        {showAddForm && (
          <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 mb-6">
            <h3 className="text-lg font-semibold text-slate-900 mb-4">Nouveau club</h3>
            <div className="flex gap-3">
              <input
                type="text"
                value={newClubName}
                onChange={(e) => setNewClubName(e.target.value)}
                placeholder="Nom du club"
                className="flex-1 px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                onKeyPress={(e) => e.key === 'Enter' && addClub()}
              />
              <button
                onClick={() => {
                  setShowAddForm(false);
                  setNewClubName('');
                  setMessage(null);
                }}
                disabled={saving}
                className="px-4 py-2 text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 font-medium transition-colors disabled:opacity-50"
              >
                Annuler
              </button>
              <button
                onClick={addClub}
                disabled={saving}
                className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 font-medium transition-colors disabled:opacity-50 flex items-center gap-2"
              >
                {saving ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    Ajout...
                  </>
                ) : (
                  <>
                    <Check className="h-4 w-4" />
                    Ajouter
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {clubs.length === 0 ? (
          <div className="text-center py-12">
            <Building2 className="h-16 w-16 text-slate-300 mx-auto mb-4" />
            <p className="text-slate-600 font-medium mb-2">Aucun club enregistré</p>
            <p className="text-sm text-slate-500 mb-4">
              Commencez par ajouter les clubs qui participeront au championnat
            </p>
            {!showAddForm && (
              <button
                onClick={() => setShowAddForm(true)}
                className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 font-medium transition-colors"
              >
                <Plus className="h-4 w-4" />
                Ajouter le premier club
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {clubs.map((club) => (
              <div
                key={club.id}
                className="flex items-center justify-between p-4 bg-slate-50 border border-slate-200 rounded-lg hover:border-slate-300 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-emerald-600 flex items-center justify-center text-white font-semibold">
                    {club.name.charAt(0).toUpperCase()}
                  </div>
                  <span className="font-medium text-slate-900">{club.name}</span>
                </div>
                <button
                  onClick={() => deleteClub(club.id, club.name)}
                  disabled={saving}
                  className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
                  title="Supprimer"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="bg-gradient-to-r from-sky-50 to-emerald-50 rounded-xl p-6 border border-sky-200">
        <h3 className="text-lg font-semibold text-slate-900 mb-3">Informations</h3>
        <ul className="space-y-2 text-sm text-slate-700">
          <li className="flex items-start gap-2">
            <span className="text-emerald-600 mt-0.5">•</span>
            <span>Les clubs doivent être créés avant de configurer une saison</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-emerald-600 mt-0.5">•</span>
            <span>Chaque club pourra avoir une équipe en Champe 1 et/ou une équipe en Champe 2</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-emerald-600 mt-0.5">•</span>
            <span>La suppression d'un club supprimera toutes ses équipes et capitaines associés</span>
          </li>
        </ul>
      </div>
    </div>
  );
}
