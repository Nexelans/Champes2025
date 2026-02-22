import { useState, useEffect } from 'react';
import { Calendar, Users, AlertCircle, Save, X, Bell, CheckCircle, ArrowRight, UserPlus } from 'lucide-react';
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
  match_type: string;
  selection_unlocked_until: string | null;
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
  isAdmin?: boolean;
}

const MATCH_TYPE_LABELS: Record<string, string> = {
  final_1st: 'Finale 1re / 2e place',
  final_3rd: 'Match 3e / 4e place',
  final_5th: 'Match 5e / 6e place',
};

export default function TeamSelection({ captain, isAdmin = false }: TeamSelectionProps) {
  const [matches, setMatches] = useState<Match[]>([]);
  const [selectedMatch, setSelectedMatch] = useState<Match | null>(null);
  const [availablePlayers, setAvailablePlayers] = useState<Player[]>([]);
  const [selectedPlayers, setSelectedPlayers] = useState<Selection[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [showScratchDialog, setShowScratchDialog] = useState(false);
  const [scratchMessage, setScratchMessage] = useState('');
  const [reportingScratch, setReportingScratch] = useState(false);
  const [hasAcknowledgedScratch, setHasAcknowledgedScratch] = useState(false);

  useEffect(() => {
    loadMatches();
    loadPlayers();
  }, [captain]);

  useEffect(() => {
    if (selectedMatch) {
      setSelectedPlayers([]);
      setError(null);
      loadSelections();
      checkScratchNotification();
    }
  }, [selectedMatch]);

  const checkScratchNotification = async () => {
    if (!selectedMatch) return;
    try {
      const { data } = await supabase
        .from('scratch_notifications')
        .select('status')
        .eq('match_id', selectedMatch.id)
        .eq('team_id', captain.team_id)
        .eq('status', 'acknowledged')
        .maybeSingle();
      setHasAcknowledgedScratch(!!data);
    } catch (err) {
      console.error('Error checking scratch notification:', err);
    }
  };

  const loadMatches = async () => {
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
          match_type,
          selection_unlocked_until,
          team1:teams!matches_team1_id_fkey(id, club:clubs(name)),
          team2:teams!matches_team2_id_fkey(id, club:clubs(name))
        `)
        .eq('season_id', seasonData.id)
        .eq('division', captain.division)
        .or(`team1_id.eq.${captain.team_id},team2_id.eq.${captain.team_id}`)
        .order('match_date');

      if (error) throw error;

      const matchesWithOpponent = data.map((match: any) => {
        const isTeam1 = match.team1_id === captain.team_id;
        const opponentClub = isTeam1 ? match.team2?.club : match.team1?.club;
        const isFinal = match.round_number === 6;

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
          is_final: isFinal,
          match_type: match.match_type || 'regular',
          selection_unlocked_until: match.selection_unlocked_until,
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

  const getLockDeadline = (matchDate: string) => {
    const match = new Date(matchDate);
    const matchDay = match.getDay();
    let daysToSubtract;
    if (matchDay === 0) daysToSubtract = 2;
    else if (matchDay === 6) daysToSubtract = 1;
    else daysToSubtract = matchDay + 2;

    const lockDeadline = new Date(match);
    lockDeadline.setDate(lockDeadline.getDate() - daysToSubtract);
    lockDeadline.setHours(17, 0, 0, 0);
    return lockDeadline;
  };

  const isMatchLocked = (matchDate: string, selectionUnlockedUntil: string | null) => {
    const now = new Date();
    if (selectionUnlockedUntil) {
      const unlockDeadline = new Date(selectionUnlockedUntil);
      if (now < unlockDeadline) return false;
    }
    const lockDeadline = getLockDeadline(matchDate);
    return now >= lockDeadline;
  };

  const getMaxPlayers = (match: Match) => match.is_final ? 10 : 8;

  const canModifySelection = () => {
    if (!selectedMatch) return false;
    if (isAdmin) return true;
    return !isMatchLocked(selectedMatch.match_date, selectedMatch.selection_unlocked_until) || hasAcknowledgedScratch;
  };

  const getDaysUntilLock = (matchDate: string) => {
    const now = new Date();
    const lockDeadline = getLockDeadline(matchDate);
    const diffTime = lockDeadline.getTime() - now.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  };

  const togglePlayerSelection = (playerId: string) => {
    if (!canModifySelection()) return;

    const isSelected = selectedPlayers.some(s => s.player_id === playerId);
    if (isSelected) {
      setSelectedPlayers(prev => {
        const filtered = prev.filter(s => s.player_id !== playerId);
        return filtered.map((s, i) => ({ ...s, selection_order: i + 1 }));
      });
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

  const movePairUp = (pairIndex: number) => {
    if (pairIndex === 0) return;
    setSelectedPlayers(prev => {
      const arr = [...prev];
      const p1 = pairIndex * 2;
      const p2 = pairIndex * 2 + 1;
      const prev1 = (pairIndex - 1) * 2;
      const prev2 = (pairIndex - 1) * 2 + 1;
      [arr[p1], arr[prev1]] = [arr[prev1], arr[p1]];
      [arr[p2], arr[prev2]] = [arr[prev2], arr[p2]];
      return arr.map((s, i) => ({ ...s, selection_order: i + 1 }));
    });
  };

  const movePairDown = (pairIndex: number, totalPairs: number) => {
    if (pairIndex === totalPairs - 1) return;
    setSelectedPlayers(prev => {
      const arr = [...prev];
      const p1 = pairIndex * 2;
      const p2 = pairIndex * 2 + 1;
      const next1 = (pairIndex + 1) * 2;
      const next2 = (pairIndex + 1) * 2 + 1;
      [arr[p1], arr[next1]] = [arr[next1], arr[p1]];
      [arr[p2], arr[next2]] = [arr[next2], arr[p2]];
      return arr.map((s, i) => ({ ...s, selection_order: i + 1 }));
    });
  };

  const handleReportScratch = async () => {
    if (!selectedMatch || !scratchMessage.trim()) {
      setError('Veuillez décrire la situation');
      return;
    }
    setReportingScratch(true);
    setError(null);
    try {
      const { error: insertError } = await supabase.from('scratch_notifications').insert({
        match_id: selectedMatch.id,
        team_id: captain.team_id,
        captain_id: captain.id,
        message: scratchMessage.trim(),
        status: 'pending',
      });
      if (insertError) throw insertError;
      setSuccess(true);
      setShowScratchDialog(false);
      setScratchMessage('');
      setTimeout(() => {
        setSuccess(false);
        setError("Notification envoyée à l'administrateur. Vous pourrez modifier votre sélection une fois la demande acceptée.");
      }, 2000);
    } catch (err) {
      console.error('Error reporting scratch:', err);
      setError("Erreur lors de l'envoi de la notification");
    } finally {
      setReportingScratch(false);
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

      if (selectedMatch.is_final) {
        const uniqueIds = new Set(selectedPlayers.map(s => s.player_id));
        if (uniqueIds.size !== maxPlayers) {
          setError('Un joueur ne peut pas être sélectionné deux fois');
          setSaving(false);
          return;
        }
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

      const { error: insertError } = await supabase.from('match_player_selections').insert(selectionsToInsert);
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
      setError("Erreur lors de l'enregistrement de la sélection");
    } finally {
      setSaving(false);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' });
  };

  const isPlayerSelected = (playerId: string) => selectedPlayers.some(s => s.player_id === playerId);

  const getPlayerById = (id: string) => availablePlayers.find(p => p.id === id);

  const getPairs = () => {
    const pairs: [Selection, Selection | null][] = [];
    for (let i = 0; i < selectedPlayers.length; i += 2) {
      pairs.push([selectedPlayers[i], selectedPlayers[i + 1] || null]);
    }
    return pairs;
  };

  const regularMatches = matches.filter(m => !m.is_final);
  const finalMatches = matches.filter(m => m.is_final);

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

      {regularMatches.length > 0 && (
        <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6">
          <h3 className="text-lg font-semibold text-slate-900 mb-4">Journées régulières</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {regularMatches.map((match) => {
              const locked = isMatchLocked(match.match_date, match.selection_unlocked_until);
              const daysUntil = getDaysUntilLock(match.match_date);
              return (
                <button
                  key={match.id}
                  onClick={() => setSelectedMatch(match)}
                  disabled={locked && !isAdmin}
                  className={`p-4 rounded-lg border-2 text-left transition-all ${
                    selectedMatch?.id === match.id
                      ? 'border-blue-500 bg-blue-50'
                      : locked && !isAdmin
                      ? 'border-slate-200 bg-slate-50 opacity-60 cursor-not-allowed'
                      : 'border-slate-200 hover:border-blue-300 hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center space-x-2 mb-2">
                    <Calendar className="w-4 h-4 text-slate-500" />
                    <span className="text-sm font-medium text-slate-700">Journée {match.round_number}</span>
                  </div>
                  <p className="text-xs text-slate-600 mb-2">{formatDate(match.match_date)}</p>
                  <p className="text-sm font-semibold text-slate-900">
                    {match.is_home ? 'Domicile' : 'Extérieur'} vs {match.opponent_name}
                  </p>
                  {!isAdmin && (
                    <>
                      {match.selection_unlocked_until && new Date(match.selection_unlocked_until) > new Date() ? (
                        <p className="text-xs text-emerald-600 mt-2 font-medium">Déverrouillé par l'admin</p>
                      ) : locked ? (
                        <p className="text-xs text-red-600 mt-2">Sélection verrouillée</p>
                      ) : daysUntil <= 7 && daysUntil > 0 ? (
                        <p className="text-xs text-amber-600 mt-2">
                          Verrouillage vendredi {getLockDeadline(match.match_date).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' })} à 17h
                        </p>
                      ) : null}
                    </>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {finalMatches.length > 0 && (
        <div className="bg-white rounded-lg shadow-sm border border-amber-200 p-6">
          <h3 className="text-lg font-semibold text-slate-900 mb-1 flex items-center gap-2">
            <span className="text-amber-500">★</span>
            Finales
          </h3>
          <p className="text-sm text-slate-500 mb-4">5 foursomes — sélectionnez 10 joueurs groupés par paires</p>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {finalMatches.map((match) => {
              const locked = isMatchLocked(match.match_date, match.selection_unlocked_until);
              const daysUntil = getDaysUntilLock(match.match_date);
              return (
                <button
                  key={match.id}
                  onClick={() => setSelectedMatch(match)}
                  disabled={locked && !isAdmin}
                  className={`p-4 rounded-lg border-2 text-left transition-all ${
                    selectedMatch?.id === match.id
                      ? 'border-amber-500 bg-amber-50'
                      : locked && !isAdmin
                      ? 'border-slate-200 bg-slate-50 opacity-60 cursor-not-allowed'
                      : 'border-amber-200 hover:border-amber-400 hover:bg-amber-50'
                  }`}
                >
                  <div className="flex items-center space-x-2 mb-2">
                    <span className="text-xs font-bold text-amber-600 uppercase tracking-wider">
                      {MATCH_TYPE_LABELS[match.match_type] || 'Finale'}
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 mb-2">{formatDate(match.match_date)}</p>
                  <p className="text-sm font-semibold text-slate-900">vs {match.opponent_name}</p>
                  {!isAdmin && (
                    <>
                      {locked ? (
                        <p className="text-xs text-red-600 mt-2">Sélection verrouillée</p>
                      ) : daysUntil <= 7 && daysUntil > 0 ? (
                        <p className="text-xs text-amber-600 mt-2">
                          Verrouillage vendredi {getLockDeadline(match.match_date).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' })} à 17h
                        </p>
                      ) : null}
                    </>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {selectedMatch && (
        <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-lg font-semibold text-slate-900">
                {selectedMatch.is_final
                  ? MATCH_TYPE_LABELS[selectedMatch.match_type] || 'Finale'
                  : `Journée ${selectedMatch.round_number}`}
                {' '}- {formatDate(selectedMatch.match_date)}
              </h3>
              <p className="text-sm text-slate-600">
                {selectedMatch.is_final ? '' : (selectedMatch.is_home ? 'Domicile' : 'Extérieur') + ' '}
                vs {selectedMatch.opponent_name}
              </p>
            </div>
            <div className="flex items-center space-x-2 text-sm">
              <Users className="w-4 h-4 text-slate-500" />
              <span className="font-medium text-slate-900">
                {selectedPlayers.length} / {getMaxPlayers(selectedMatch)} joueurs
              </span>
            </div>
          </div>

          {!canModifySelection() && !hasAcknowledgedScratch && !isAdmin && (
            <div className="space-y-3 mb-4">
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 flex items-start space-x-2">
                <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-amber-800">La sélection est verrouillée le vendredi 17h avant la rencontre.</p>
              </div>
              <button
                onClick={() => setShowScratchDialog(true)}
                className="w-full px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 font-medium transition-colors flex items-center justify-center gap-2"
              >
                <Bell className="w-4 h-4" />
                Signaler un joueur absent
              </button>
            </div>
          )}

          {hasAcknowledgedScratch && (
            <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4 mb-4 flex items-start space-x-2">
              <CheckCircle className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-emerald-800">Votre demande a été acceptée. Vous pouvez modifier votre sélection.</p>
            </div>
          )}

          {selectedMatch.is_final ? (
            <FinalSelectionView
              availablePlayers={availablePlayers}
              selectedPlayers={selectedPlayers}
              canModify={canModifySelection()}
              onToggle={togglePlayerSelection}
              onMovePairUp={movePairUp}
              onMovePairDown={movePairDown}
              getPairs={getPairs}
              getPlayerById={getPlayerById}
              isPlayerSelected={isPlayerSelected}
            />
          ) : (
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
                          <p className="font-medium text-slate-900">{player.first_name} {player.last_name}</p>
                          <p className="text-sm text-slate-600">Index: {player.handicap_index} - {player.gender === 'M' ? 'Homme' : 'Femme'}</p>
                        </div>
                      </div>
                      {selected && canModifySelection() && <X className="w-5 h-5 text-slate-400" />}
                    </div>
                  </button>
                );
              })}
            </div>
          )}

          {canModifySelection() && (
            <div className="flex justify-end space-x-3 mt-4">
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

      {showScratchDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
            <h3 className="text-lg font-bold text-slate-900 mb-4">Signaler un joueur absent</h3>
            <p className="text-sm text-slate-600 mb-4">
              Expliquez la situation à l'administrateur. Une fois votre demande acceptée, vous pourrez modifier votre sélection.
            </p>
            <div className="mb-6">
              <label className="block text-sm font-medium text-slate-700 mb-2">Description de la situation</label>
              <textarea
                value={scratchMessage}
                onChange={(e) => setScratchMessage(e.target.value)}
                placeholder="Ex: Le joueur X s'est blessé..."
                rows={4}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
              />
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => { setShowScratchDialog(false); setScratchMessage(''); }}
                className="flex-1 px-4 py-2 bg-slate-200 text-slate-700 rounded-lg hover:bg-slate-300 font-medium transition-colors"
              >
                Annuler
              </button>
              <button
                onClick={handleReportScratch}
                disabled={reportingScratch || !scratchMessage.trim()}
                className="flex-1 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 font-medium transition-colors disabled:opacity-50"
              >
                {reportingScratch ? 'Envoi...' : 'Envoyer'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

interface FinalSelectionViewProps {
  availablePlayers: Player[];
  selectedPlayers: Selection[];
  canModify: boolean;
  onToggle: (id: string) => void;
  onMovePairUp: (pairIndex: number) => void;
  onMovePairDown: (pairIndex: number, total: number) => void;
  getPairs: () => [Selection, Selection | null][];
  getPlayerById: (id: string) => Player | undefined;
  isPlayerSelected: (id: string) => boolean;
}

function FinalSelectionView({
  availablePlayers,
  selectedPlayers,
  canModify,
  onToggle,
  onMovePairUp,
  onMovePairDown,
  getPairs,
  getPlayerById,
  isPlayerSelected,
}: FinalSelectionViewProps) {
  const pairs = getPairs();
  const completePairs = pairs.filter(([, p2]) => p2 !== null);
  const incompletePair = pairs.find(([, p2]) => p2 === null);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <div>
        <h4 className="text-sm font-semibold text-slate-700 mb-3">
          Joueurs disponibles ({selectedPlayers.length}/10 sélectionnés)
        </h4>
        <div className="space-y-1.5 max-h-96 overflow-y-auto pr-1">
          {availablePlayers.map((player) => {
            const selected = isPlayerSelected(player.id);
            const selOrder = selectedPlayers.find(s => s.player_id === player.id)?.selection_order;
            const pairNum = selOrder ? Math.ceil(selOrder / 2) : null;
            return (
              <button
                key={player.id}
                onClick={() => onToggle(player.id)}
                disabled={!canModify}
                className={`w-full p-2.5 rounded-lg border text-left transition-all ${
                  selected
                    ? 'border-amber-400 bg-amber-50'
                    : canModify
                    ? 'border-slate-200 hover:border-amber-300 hover:bg-slate-50'
                    : 'border-slate-200 bg-slate-50 cursor-not-allowed opacity-60'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {selected && pairNum && (
                      <div className="w-5 h-5 bg-amber-500 rounded-full flex items-center justify-center text-white text-xs font-bold">
                        {pairNum}
                      </div>
                    )}
                    <div>
                      <p className="text-sm font-medium text-slate-900">{player.first_name} {player.last_name}</p>
                      <p className="text-xs text-slate-500">Index {player.handicap_index}</p>
                    </div>
                  </div>
                  {selected && canModify && <X className="w-4 h-4 text-slate-400" />}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      <div>
        <h4 className="text-sm font-semibold text-slate-700 mb-3">
          Paires constituées ({completePairs.length}/5)
        </h4>

        {pairs.length === 0 && (
          <div className="border-2 border-dashed border-slate-200 rounded-lg p-6 text-center text-slate-400 text-sm">
            <UserPlus className="w-8 h-8 mx-auto mb-2 opacity-50" />
            Cliquez sur des joueurs pour former vos paires
          </div>
        )}

        <div className="space-y-2">
          {completePairs.map(([p1, p2], pairIndex) => {
            const player1 = getPlayerById(p1.player_id);
            const player2 = p2 ? getPlayerById(p2.player_id) : null;
            return (
              <div key={pairIndex} className="bg-emerald-50 border border-emerald-200 rounded-lg p-3">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-emerald-700 uppercase tracking-wider">
                    Paire {pairIndex + 1}
                  </span>
                  {canModify && (
                    <div className="flex gap-1">
                      <button
                        onClick={() => onMovePairUp(pairIndex)}
                        disabled={pairIndex === 0}
                        className="p-1 text-slate-400 hover:text-slate-600 disabled:opacity-20 transition-colors"
                        title="Monter"
                      >
                        ▲
                      </button>
                      <button
                        onClick={() => onMovePairDown(pairIndex, completePairs.length)}
                        disabled={pairIndex === completePairs.length - 1}
                        className="p-1 text-slate-400 hover:text-slate-600 disabled:opacity-20 transition-colors"
                        title="Descendre"
                      >
                        ▼
                      </button>
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex-1 bg-white rounded p-2 text-sm">
                    <p className="font-medium text-slate-900">{player1?.first_name} {player1?.last_name}</p>
                    <p className="text-xs text-slate-500">Index {player1?.handicap_index}</p>
                  </div>
                  <ArrowRight className="w-4 h-4 text-slate-300 flex-shrink-0" />
                  <div className="flex-1 bg-white rounded p-2 text-sm">
                    <p className="font-medium text-slate-900">{player2?.first_name} {player2?.last_name}</p>
                    <p className="text-xs text-slate-500">Index {player2?.handicap_index}</p>
                  </div>
                </div>
              </div>
            );
          })}

          {incompletePair && (
            <div className="bg-amber-50 border border-amber-300 border-dashed rounded-lg p-3">
              <span className="text-xs font-bold text-amber-700 uppercase tracking-wider mb-2 block">
                Paire {completePairs.length + 1} — en cours
              </span>
              <div className="flex items-center gap-2">
                <div className="flex-1 bg-white rounded p-2 text-sm">
                  <p className="font-medium text-slate-900">
                    {getPlayerById(incompletePair[0].player_id)?.first_name}{' '}
                    {getPlayerById(incompletePair[0].player_id)?.last_name}
                  </p>
                  <p className="text-xs text-slate-500">
                    Index {getPlayerById(incompletePair[0].player_id)?.handicap_index}
                  </p>
                </div>
                <ArrowRight className="w-4 h-4 text-slate-300 flex-shrink-0" />
                <div className="flex-1 border-2 border-dashed border-amber-300 rounded p-2 text-sm text-center text-amber-500">
                  Sélectionner le 2e joueur
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
