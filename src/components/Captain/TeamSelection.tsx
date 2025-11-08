import { useState, useEffect } from 'react';
import { Calendar, Users, AlertCircle, Save, X } from 'lucide-react';
import { supabase } from '../../lib/supabase';

interface Player {
  id: string;
  first_name: string;
  last_name: string;
  handicap_index: number;
  gender: string;
}

interface Match {
  id: string;
  division: string;
  round_number: number;
  match_date: string;
  team1_id: string;
  team2_id: string;
  host_club_id: string;
  status: string;
  opponent_name: string;
  is_home: boolean;
  is_final: boolean;
}

interface Selection {
  player_id: string;
  selection_order: number;
}

interface TeamSelectionProps {
  captain: {
    id: string;
    team_id: string;
    club_id: string;
    division: string;
  };
}

export default function TeamSelection({ captain }: TeamSelectionProps) {
  const [matches, setMatches] = useState<Match[]>([]);
  const [selectedMatch, setSelectedMatch] = useState<Match | null>(null);
  const [availablePlayers, setAvailablePlayers] = useState<Player[]>([]);
  const [selectedPlayers, setSelectedPlayers] = useState<Selection[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [daysBeforeLock, setDaysBeforeLock] = useState(3);

  useEffect(() => {
    loadMatches();
    loadPlayers();
    loadSeasonConfig();
  }, [captain]);

  useEffect(() => {
    if (selectedMatch) {
      loadSelections();
    }
  }, [selectedMatch]);

  const loadSeasonConfig = async () => {
    try {
      const { data: seasonData } = await supabase
        .from('seasons')
        .select('days_before_match_lock')
        .eq('is_active', true)
        .maybeSingle();

      if (seasonData) {
        setDaysBeforeLock(seasonData.days_before_match_lock || 3);
      }
    } catch (err) {
      console.error('Error loading season config:', err);
    }
  };

  const loadMatches = async () => {
    try {
      const { data: seasonData } = await supabase
        .from('seasons')
        .select('id')
        .eq('is_active', true)
        .single();

      if (!seasonData) return;

      const { data, error } = await supabase
        .from('matches')
        .select(`
          id,
          division,
          round_number,
          match_date,
          team1_id,
          team2_id,
          host_club_id,
          status,
          team1:teams!matches_team1_id_fkey(id, club:clubs(name)),
          team2:teams!matches_team2_id_fkey(id, club:clubs(name))
        `)
        .eq('season_id', seasonData.id)
        .eq('division', captain.division)
        .or(`team1_id.eq.${captain.team_id},team2_id.eq.${captain.team_id}`)
        .lte('round_number', 5)
        .order('match_date');

      if (error) throw error;

      const matchesWithOpponent = data.map((match: any) => {
        const isTeam1 = match.team1_id === captain.team_id;
        const opponentClub = isTeam1 ? match.team2?.club : match.team1?.club;

        return {
          id: match.id,
          division: match.division,
          round_number: match.round_number,
          match_date: match.match_date,
          team1_id: match.team1_id,
          team2_id: match.team2_id,
          host_club_id: match.host_club_id,
          status: match.status,
          opponent_name: opponentClub?.name || 'Inconnu',
          is_home: match.host_club_id === captain.club_id,
          is_final: false,
        };
      });

      setMatches(matchesWithOpponent);
    } catch (err) {
      console.error('Error loading matches:', err);
      setError('Erreur lors du chargement des rencontres');
    } finally {
      setLoading(false);
    }
  };

  const loadPlayers = async () => {
    try {
      let query = supabase
        .from('players')
        .select('id, first_name, last_name, handicap_index, gender')
        .eq('club_id', captain.club_id)
        .eq('is_validated', true);

      if (captain.division === 'champe1') {
        query = query.lte('handicap_index', 18);
      } else if (captain.division === 'champe2') {
        query = query.gte('handicap_index', 17);
      }

      const { data, error } = await query.order('handicap_index');

      if (error) throw error;
      setAvailablePlayers(data || []);
    } catch (err) {
      console.error('Error loading players:', err);
      setError('Erreur lors du chargement des joueurs');
    }
  };

  const loadSelections = async () => {
    if (!selectedMatch) return;

    try {
      const { data, error } = await supabase
        .from('match_player_selections')
        .select('player_id, selection_order')
        .eq('match_id', selectedMatch.id)
        .eq('team_id', captain.team_id)
        .order('selection_order');

      if (error) throw error;
      setSelectedPlayers(data || []);
    } catch (err) {
      console.error('Error loading selections:', err);
      setError('Erreur lors du chargement de la sélection');
    }
  };

  const isMatchLocked = (matchDate: string) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const match = new Date(matchDate);
    match.setHours(0, 0, 0, 0);
    const lockDate = new Date(match);
    lockDate.setDate(lockDate.getDate() - daysBeforeLock);
    return today >= lockDate;
  };

  const getMaxPlayers = (match: Match) => {
    return match.is_final ? 10 : 8;
  };

  const canModifySelection = () => {
    if (!selectedMatch) return false;
    return !isMatchLocked(selectedMatch.match_date);
  };

  const getDaysUntilLock = (matchDate: string) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const match = new Date(matchDate);
    match.setHours(0, 0, 0, 0);
    const lockDate = new Date(match);
    lockDate.setDate(lockDate.getDate() - daysBeforeLock);
    const diffTime = lockDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const togglePlayerSelection = (playerId: string) => {
    if (!canModifySelection()) return;

    const isSelected = selectedPlayers.some(s => s.player_id === playerId);

    if (isSelected) {
      setSelectedPlayers(prev => prev.filter(s => s.player_id !== playerId));
    } else {
      const maxPlayers = getMaxPlayers(selectedMatch!);
      if (selectedPlayers.length >= maxPlayers) {
        setError(`Vous ne pouvez sélectionner que ${maxPlayers} joueurs pour cette rencontre`);
        setTimeout(() => setError(null), 3000);
        return;
      }

      const nextOrder = selectedPlayers.length + 1;
      setSelectedPlayers(prev => [...prev, { player_id: playerId, selection_order: nextOrder }]);
    }
  };

  const handleSave = async () => {
    if (!selectedMatch) return;

    setSaving(true);
    setError(null);

    try {
      const maxPlayers = getMaxPlayers(selectedMatch);
      if (selectedPlayers.length !== maxPlayers) {
        setError(`Vous devez sélectionner exactement ${maxPlayers} joueurs`);
        setSaving(false);
        return;
      }

      await supabase
        .from('match_player_selections')
        .delete()
        .eq('match_id', selectedMatch.id)
        .eq('team_id', captain.team_id);

      const selectionsToInsert = selectedPlayers.map((selection, index) => ({
        match_id: selectedMatch.id,
        team_id: captain.team_id,
        player_id: selection.player_id,
        selection_order: index + 1,
      }));

      const { error: insertError } = await supabase
        .from('match_player_selections')
        .insert(selectionsToInsert);

      if (insertError) throw insertError;

      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('No session');

      const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-individual-matches`;
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ matchId: selectedMatch.id }),
      });

      const result = await response.json();
      if (!result.success) {
        console.log('Individual matches generation:', result.error);
      }

      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      console.error('Error saving selections:', err);
      setError('Erreur lors de l\'enregistrement de la sélection');
    } finally {
      setSaving(false);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  };

  const isPlayerSelected = (playerId: string) => {
    return selectedPlayers.some(s => s.player_id === playerId);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-slate-600">Chargement...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-slate-900">Sélection des joueurs</h2>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start space-x-2">
          <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-red-800">{error}</p>
        </div>
      )}

      {success && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-center text-green-800">
          Sélection enregistrée avec succès !
        </div>
      )}

      <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6">
        <h3 className="text-lg font-semibold text-slate-900 mb-4">Choisir une rencontre</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {matches.map((match) => {
            const locked = isMatchLocked(match.match_date);
            const daysUntil = getDaysUntilLock(match.match_date);
            return (
              <button
                key={match.id}
                onClick={() => setSelectedMatch(match)}
                disabled={locked}
                className={`p-4 rounded-lg border-2 text-left transition-all ${
                  selectedMatch?.id === match.id
                    ? 'border-blue-500 bg-blue-50'
                    : locked
                    ? 'border-slate-200 bg-slate-50 opacity-60 cursor-not-allowed'
                    : 'border-slate-200 hover:border-blue-300 hover:bg-slate-50'
                }`}
              >
                <div className="flex items-center space-x-2 mb-2">
                  <Calendar className="w-4 h-4 text-slate-500" />
                  <span className="text-sm font-medium text-slate-700">
                    Journée {match.round_number}
                  </span>
                </div>
                <p className="text-xs text-slate-600 mb-2">{formatDate(match.match_date)}</p>
                <p className="text-sm font-semibold text-slate-900">
                  {match.is_home ? 'Domicile' : 'Extérieur'} vs {match.opponent_name}
                </p>
                {locked ? (
                  <p className="text-xs text-red-600 mt-2">Sélection verrouillée</p>
                ) : daysUntil <= 7 && daysUntil > 0 ? (
                  <p className="text-xs text-amber-600 mt-2">Verrouillage dans {daysUntil} jour{daysUntil > 1 ? 's' : ''}</p>
                ) : null}
              </button>
            );
          })}
        </div>
      </div>

      {selectedMatch && (
        <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-lg font-semibold text-slate-900">
                Journée {selectedMatch.round_number} - {formatDate(selectedMatch.match_date)}
              </h3>
              <p className="text-sm text-slate-600">
                {selectedMatch.is_home ? 'Domicile' : 'Extérieur'} vs {selectedMatch.opponent_name}
              </p>
            </div>
            <div className="flex items-center space-x-2 text-sm">
              <Users className="w-4 h-4 text-slate-500" />
              <span className="font-medium text-slate-900">
                {selectedPlayers.length} / {getMaxPlayers(selectedMatch)} joueurs
              </span>
            </div>
          </div>

          {!canModifySelection() && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-4 flex items-start space-x-2">
              <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-amber-800">
                La sélection est verrouillée {daysBeforeLock} jour{daysBeforeLock > 1 ? 's' : ''} avant la rencontre.
              </p>
            </div>
          )}

          {canModifySelection() && getDaysUntilLock(selectedMatch.match_date) <= 7 && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4 flex items-start space-x-2">
              <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-blue-800">
                La sélection sera verrouillée dans {getDaysUntilLock(selectedMatch.match_date)} jour{getDaysUntilLock(selectedMatch.match_date) > 1 ? 's' : ''}.
              </p>
            </div>
          )}

          <div className="space-y-2 mb-6">
            {availablePlayers.map((player) => {
              const selected = isPlayerSelected(player.id);
              return (
                <button
                  key={player.id}
                  onClick={() => togglePlayerSelection(player.id)}
                  disabled={!canModifySelection()}
                  className={`w-full p-3 rounded-lg border-2 text-left transition-all ${
                    selected
                      ? 'border-blue-500 bg-blue-50'
                      : canModifySelection()
                      ? 'border-slate-200 hover:border-blue-300 hover:bg-slate-50'
                      : 'border-slate-200 bg-slate-50 cursor-not-allowed'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      {selected && (
                        <div className="w-6 h-6 bg-blue-600 rounded-full flex items-center justify-center text-white text-xs font-bold">
                          {selectedPlayers.find(s => s.player_id === player.id)?.selection_order}
                        </div>
                      )}
                      <div>
                        <p className="font-medium text-slate-900">
                          {player.first_name} {player.last_name}
                        </p>
                        <p className="text-sm text-slate-600">
                          Index: {player.handicap_index} - {player.gender === 'M' ? 'Homme' : 'Femme'}
                        </p>
                      </div>
                    </div>
                    {selected && canModifySelection() && (
                      <X className="w-5 h-5 text-slate-400" />
                    )}
                  </div>
                </button>
              );
            })}
          </div>

          {canModifySelection() && (
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setSelectedPlayers([])}
                className="px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors"
              >
                Réinitialiser
              </button>
              <button
                onClick={handleSave}
                disabled={saving || selectedPlayers.length !== getMaxPlayers(selectedMatch)}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Save className="w-4 h-4" />
                <span>{saving ? 'Enregistrement...' : 'Enregistrer'}</span>
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
