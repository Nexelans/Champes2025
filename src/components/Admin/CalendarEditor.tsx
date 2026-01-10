import { useEffect, useState } from 'react';
import { MapPin, Loader2, AlertCircle, Save, Check, Unlock, Lock } from 'lucide-react';
import { supabase } from '../../lib/supabase';

type Team = {
  id: string;
  club_id: string;
  club_name: string;
};

type Match = {
  id: string;
  round_number: number;
  match_date: string;
  team1_id: string;
  team2_id: string;
  host_club_id: string;
  host_club_name: string;
  selection_unlocked_until: string | null;
};

type CalendarEditorProps = {
  division: 'champe1' | 'champe2';
};

export default function CalendarEditor({ division }: CalendarEditorProps) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [teams, setTeams] = useState<Team[]>([]);
  const [matches, setMatches] = useState<Match[]>([]);
  const [originalMatches, setOriginalMatches] = useState<Match[]>([]);
  const [seasonId, setSeasonId] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [unlockingMatchIds, setUnlockingMatchIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    loadData();
  }, [division]);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const { data: seasonData } = await supabase
        .from('seasons')
        .select('id')
        .eq('is_active', true)
        .maybeSingle();

      if (!seasonData) {
        setError('Aucune saison active');
        setLoading(false);
        return;
      }

      setSeasonId(seasonData.id);

      const { data: teamsData } = await supabase
        .from('teams')
        .select('id, club_id, clubs!inner(name)')
        .eq('season_id', seasonData.id)
        .eq('division', division);

      if (teamsData) {
        setTeams(
          teamsData.map((t: any) => ({
            id: t.id,
            club_id: t.club_id,
            club_name: t.clubs.name,
          }))
        );
      }

      const { data: matchesData } = await supabase
        .from('matches')
        .select(`
          id,
          round_number,
          match_date,
          team1_id,
          team2_id,
          host_club_id,
          selection_unlocked_until,
          team1:teams!matches_team1_id_fkey(club:clubs(name)),
          team2:teams!matches_team2_id_fkey(club:clubs(name)),
          host_club:clubs(name)
        `)
        .eq('season_id', seasonData.id)
        .eq('division', division)
        .lte('round_number', 5)
        .order('round_number')
        .order('id');

      if (matchesData) {
        const mappedMatches = matchesData.map((m: any) => ({
          id: m.id,
          round_number: m.round_number,
          match_date: m.match_date,
          team1_id: m.team1_id,
          team2_id: m.team2_id,
          host_club_id: m.host_club_id,
          host_club_name: m.host_club?.name || 'À définir',
          selection_unlocked_until: m.selection_unlocked_until,
        }));
        setMatches(mappedMatches);
        setOriginalMatches(mappedMatches);
      }
    } catch (error) {
      console.error('Error loading data:', error);
      setError('Erreur lors du chargement des données');
    } finally {
      setLoading(false);
    }
  };

  const updateMatch = (matchId: string, field: 'team1_id' | 'team2_id', value: string) => {
    setMatches(prevMatches =>
      prevMatches.map(m =>
        m.id === matchId ? { ...m, [field]: value } : m
      )
    );
  };

  const saveChanges = async () => {
    setSaving(true);
    setMessage(null);
    try {
      // Find matches where teams have changed
      const changedMatchIds: string[] = [];

      for (const match of matches) {
        if (match.team1_id === match.team2_id) {
          setMessage({
            type: 'error',
            text: 'Une équipe ne peut pas jouer contre elle-même',
          });
          setSaving(false);
          return;
        }

        // Check if teams changed
        const originalMatch = originalMatches.find(m => m.id === match.id);
        if (originalMatch &&
            (originalMatch.team1_id !== match.team1_id ||
             originalMatch.team2_id !== match.team2_id)) {
          changedMatchIds.push(match.id);
        }

        const { error } = await supabase
          .from('matches')
          .update({
            team1_id: match.team1_id,
            team2_id: match.team2_id,
          })
          .eq('id', match.id);

        if (error) throw error;
      }

      // Only delete individual_matches for matches where teams changed
      if (changedMatchIds.length > 0) {
        const { error: deleteIndividualError } = await supabase
          .from('individual_matches')
          .delete()
          .in('match_id', changedMatchIds);

        if (deleteIndividualError) throw deleteIndividualError;

        // Also delete player selections for changed matches
        const { error: deleteSelectionsError } = await supabase
          .from('match_player_selections')
          .delete()
          .in('match_id', changedMatchIds);

        if (deleteSelectionsError) throw deleteSelectionsError;
      }

      setMessage({
        type: 'success',
        text: changedMatchIds.length > 0
          ? `Calendrier mis à jour (${changedMatchIds.length} rencontre(s) modifiée(s))`
          : 'Aucune modification détectée',
      });

      await loadData();
    } catch (error) {
      console.error('Error saving changes:', error);
      setMessage({
        type: 'error',
        text: 'Erreur lors de la sauvegarde',
      });
    } finally {
      setSaving(false);
    }
  };

  const toggleSelectionUnlock = async (matchId: string, currentUnlockDate: string | null) => {
    setUnlockingMatchIds(prev => new Set(prev).add(matchId));
    try {
      let newUnlockDate = null;

      if (!currentUnlockDate) {
        // Set unlock to 7 days from now
        const unlockUntil = new Date();
        unlockUntil.setDate(unlockUntil.getDate() + 7);
        newUnlockDate = unlockUntil.toISOString();
      }

      const { error } = await supabase
        .from('matches')
        .update({ selection_unlocked_until: newUnlockDate })
        .eq('id', matchId);

      if (error) throw error;

      // Update local state
      setMatches(prevMatches =>
        prevMatches.map(m =>
          m.id === matchId ? { ...m, selection_unlocked_until: newUnlockDate } : m
        )
      );

      setMessage({
        type: 'success',
        text: newUnlockDate
          ? 'Sélection déverrouillée pour 7 jours'
          : 'Sélection verrouillée normalement',
      });
    } catch (error) {
      console.error('Error toggling unlock:', error);
      setMessage({
        type: 'error',
        text: 'Erreur lors du déverrouillage',
      });
    } finally {
      setUnlockingMatchIds(prev => {
        const newSet = new Set(prev);
        newSet.delete(matchId);
        return newSet;
      });
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

  const groupedMatches = matches.reduce((acc, match) => {
    if (!acc[match.round_number]) {
      acc[match.round_number] = [];
    }
    acc[match.round_number].push(match);
    return acc;
  }, {} as Record<number, Match[]>);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-12 w-12 text-emerald-600 animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
        <AlertCircle className="h-12 w-12 text-red-600 mx-auto mb-3" />
        <p className="text-red-900 font-medium">{error}</p>
      </div>
    );
  }

  const divisionLabel = division === 'champe1' ? 'Champe 1' : 'Champe 2';

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-slate-900">
          Modifier le calendrier {divisionLabel}
        </h2>
        <button
          onClick={saveChanges}
          disabled={saving}
          className="flex items-center gap-2 px-6 py-2.5 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 font-medium transition-colors disabled:opacity-50"
        >
          {saving ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Enregistrement...
            </>
          ) : (
            <>
              <Save className="h-4 w-4" />
              Enregistrer les modifications
            </>
          )}
        </button>
      </div>

      {message && (
        <div
          className={`p-4 rounded-lg ${
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

      <div className="space-y-4">
        {Object.keys(groupedMatches)
          .sort((a, b) => parseInt(a) - parseInt(b))
          .map((roundStr) => {
            const round = parseInt(roundStr);
            const roundMatches = groupedMatches[round];
            const roundLabel = `Journée ${round}`;

            return (
              <div key={round} className="bg-white rounded-lg shadow-sm border border-slate-200 p-6">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="text-lg font-semibold text-slate-900">{roundLabel}</h3>
                    <p className="text-sm text-slate-600">
                      {roundMatches[0] ? formatDate(roundMatches[0].match_date) : ''}
                    </p>
                  </div>
                  <div className="flex items-center space-x-2 text-emerald-600 bg-emerald-50 px-3 py-1 rounded-full">
                    <MapPin className="w-4 h-4" />
                    <span className="text-sm font-medium">
                      {roundMatches[0]?.host_club_name || 'À définir'}
                    </span>
                  </div>
                </div>

                <div className="space-y-3">
                  {roundMatches.map((match, idx) => {
                    const isUnlocking = unlockingMatchIds.has(match.id);
                    const isUnlocked = match.selection_unlocked_until &&
                      new Date(match.selection_unlocked_until) > new Date();

                    return (
                      <div
                        key={match.id}
                        className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg"
                      >
                        <span className="text-sm text-slate-500 font-medium w-8">
                          #{idx + 1}
                        </span>
                        <select
                          value={match.team1_id}
                          onChange={(e) => updateMatch(match.id, 'team1_id', e.target.value)}
                          className="flex-1 px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                        >
                          <option value="">Sélectionner une équipe</option>
                          {teams.map((team) => (
                            <option key={team.id} value={team.id}>
                              {team.club_name}
                            </option>
                          ))}
                        </select>
                        <span className="text-slate-400 font-semibold">vs</span>
                        <select
                          value={match.team2_id}
                          onChange={(e) => updateMatch(match.id, 'team2_id', e.target.value)}
                          className="flex-1 px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                        >
                          <option value="">Sélectionner une équipe</option>
                          {teams.map((team) => (
                            <option key={team.id} value={team.id}>
                              {team.club_name}
                            </option>
                          ))}
                        </select>
                        <button
                          onClick={() => toggleSelectionUnlock(match.id, match.selection_unlocked_until)}
                          disabled={isUnlocking}
                          className={`p-2 rounded-lg transition-colors ${
                            isUnlocked
                              ? 'bg-amber-100 text-amber-700 hover:bg-amber-200'
                              : 'bg-slate-200 text-slate-600 hover:bg-slate-300'
                          } disabled:opacity-50`}
                          title={isUnlocked ? 'Verrouiller la sélection' : 'Déverrouiller la sélection pour 7 jours'}
                        >
                          {isUnlocking ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : isUnlocked ? (
                            <Unlock className="h-4 w-4" />
                          ) : (
                            <Lock className="h-4 w-4" />
                          )}
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
      </div>

      <div className="flex justify-end pt-6 border-t border-slate-200">
        <button
          onClick={saveChanges}
          disabled={saving}
          className="flex items-center gap-2 px-6 py-2.5 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 font-medium transition-colors disabled:opacity-50"
        >
          {saving ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Enregistrement...
            </>
          ) : (
            <>
              <Save className="h-4 w-4" />
              Enregistrer les modifications
            </>
          )}
        </button>
      </div>
    </div>
  );
}
