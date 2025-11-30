import { useState, useEffect } from 'react';
import { Shield, CheckCircle, AlertTriangle, Lock, Unlock, AlertCircle, Users, Calendar, Zap } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';

type ValidationIssue = {
  type: 'error' | 'warning';
  message: string;
};

type TeamSelectionStatus = {
  team_id: string;
  division: 'champe1' | 'champe2';
  club_name: string;
  captain_name: string;
  captain_email: string;
  next_match_date: string | null;
  round_number: number | null;
  players_selected: number;
  is_locked: boolean;
  is_final: boolean;
  match_id?: string;
};

type ReadyMatch = {
  match_id: string;
  division: 'champe1' | 'champe2';
  round_number: number;
  match_date: string;
  team1_name: string;
  team2_name: string;
  team1_selections: number;
  team2_selections: number;
  is_final: boolean;
  has_individual_matches: boolean;
};

export default function ConfigurationValidation() {
  const { user } = useAuth();
  const [season, setSeason] = useState<any>(null);
  const [issues, setIssues] = useState<ValidationIssue[]>([]);
  const [teamStatuses, setTeamStatuses] = useState<TeamSelectionStatus[]>([]);
  const [readyMatches, setReadyMatches] = useState<ReadyMatch[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [generatingMatch, setGeneratingMatch] = useState<string | null>(null);
  const [showUnlockDialog, setShowUnlockDialog] = useState(false);
  const [unlockCode, setUnlockCode] = useState('');
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const UNLOCK_CODE = 'ADMIN2025';

  useEffect(() => {
    loadValidationStatus();
  }, []);

  const loadValidationStatus = async () => {
    setLoading(true);
    setIssues([]);
    try {
      const { data: seasonData } = await supabase
        .from('seasons')
        .select('*')
        .eq('is_active', true)
        .maybeSingle();

      if (!seasonData) {
        setIssues([{ type: 'error', message: 'Aucune saison active trouvée' }]);
        setLoading(false);
        return;
      }

      setSeason(seasonData);

      const validationIssues: ValidationIssue[] = [];

      for (const division of ['champe1', 'champe2']) {
        const { data: datesData } = await supabase
          .from('season_dates')
          .select('*')
          .eq('season_id', seasonData.id)
          .eq('division', division);

        if (!datesData || datesData.length < 6) {
          validationIssues.push({
            type: 'error',
            message: `${division === 'champe1' ? 'Champe 1' : 'Champe 2'}: Toutes les dates ne sont pas définies (${datesData?.length || 0}/6)`,
          });
        }

        const { data: seasonClubsData } = await supabase
          .from('season_clubs')
          .select('club_id')
          .eq('season_id', seasonData.id)
          .eq('division', division)
          .eq('is_participating', true);

        if (!seasonClubsData || seasonClubsData.length === 0) {
          validationIssues.push({
            type: 'warning',
            message: `${division === 'champe1' ? 'Champe 1' : 'Champe 2'}: Aucun club participant`,
          });
          continue;
        }

        const participatingClubIds = seasonClubsData.map((sc) => sc.club_id);

        const { data: teamsData } = await supabase
          .from('teams')
          .select('id, club_id, clubs!inner(name)')
          .eq('season_id', seasonData.id)
          .eq('division', division)
          .in('club_id', participatingClubIds);

        if (!teamsData) continue;

        for (const team of teamsData) {
          const { data: captainData } = await supabase
            .from('captains')
            .select('email')
            .eq('team_id', team.id)
            .maybeSingle();

          if (!captainData) {
            validationIssues.push({
              type: 'error',
              message: `${(team as any).clubs.name} (${division === 'champe1' ? 'Champe 1' : 'Champe 2'}): Aucun capitaine défini`,
            });
          } else if (!captainData.email) {
            validationIssues.push({
              type: 'error',
              message: `${(team as any).clubs.name} (${division === 'champe1' ? 'Champe 1' : 'Champe 2'}): Email du capitaine manquant`,
            });
          }
        }
      }

      setIssues(validationIssues);

      const { data: rawStatusData, error: statusError } = await supabase
        .from('teams')
        .select(`
          id,
          division,
          clubs!inner(name)
        `)
        .eq('season_id', seasonData.id);

      if (!statusError && rawStatusData) {
        const statusPromises = rawStatusData.map(async (team: any) => {
          const { data: captain } = await supabase
            .from('captains')
            .select('first_name, last_name, email')
            .eq('team_id', team.id)
            .maybeSingle();

          const { data: nextMatch } = await supabase
            .from('matches')
            .select('id, match_date, round_number')
            .or(`team1_id.eq.${team.id},team2_id.eq.${team.id}`)
            .gte('match_date', new Date().toISOString().split('T')[0])
            .order('match_date', { ascending: true })
            .limit(1)
            .maybeSingle();

          let playersSelected = 0;
          if (nextMatch) {
            const { data: selections } = await supabase
              .from('match_player_selections')
              .select('id')
              .eq('match_id', nextMatch.id)
              .eq('team_id', team.id);
            playersSelected = selections?.length || 0;
          }

          const isFinal = nextMatch?.round_number === 6;
          return {
            team_id: team.id,
            division: team.division,
            club_name: team.clubs.name,
            captain_name: captain ? `${captain.first_name} ${captain.last_name}` : 'Aucun capitaine',
            captain_email: captain?.email || '',
            next_match_date: nextMatch?.match_date || null,
            round_number: nextMatch?.round_number || null,
            players_selected: playersSelected,
            is_locked: false,
            is_final: isFinal,
            match_id: nextMatch?.id,
          };
        });

        const statuses = await Promise.all(statusPromises);
        setTeamStatuses(statuses);

        const { data: matchesData } = await supabase
          .from('matches')
          .select(`
            id,
            round_number,
            match_date,
            team1:teams!matches_team1_id_fkey(id, division, clubs(name)),
            team2:teams!matches_team2_id_fkey(id, division, clubs(name))
          `)
          .eq('season_id', seasonData.id)
          .gte('match_date', new Date().toISOString().split('T')[0])
          .order('match_date');

        if (matchesData) {
          const readyMatchesPromises = matchesData.map(async (match: any) => {
            const requiredPlayers = match.round_number === 6 ? 10 : 8;

            const { data: team1Selections } = await supabase
              .from('match_player_selections')
              .select('id')
              .eq('match_id', match.id)
              .eq('team_id', match.team1.id);

            const { data: team2Selections } = await supabase
              .from('match_player_selections')
              .select('id')
              .eq('match_id', match.id)
              .eq('team_id', match.team2.id);

            const { data: individualMatches } = await supabase
              .from('individual_matches')
              .select('id')
              .eq('match_id', match.id)
              .limit(1);

            const team1Count = team1Selections?.length || 0;
            const team2Count = team2Selections?.length || 0;

            if (team1Count === requiredPlayers && team2Count === requiredPlayers) {
              return {
                match_id: match.id,
                division: match.team1.division,
                round_number: match.round_number,
                match_date: match.match_date,
                team1_name: match.team1.clubs.name,
                team2_name: match.team2.clubs.name,
                team1_selections: team1Count,
                team2_selections: team2Count,
                is_final: match.round_number === 6,
                has_individual_matches: (individualMatches?.length || 0) > 0,
              };
            }
            return null;
          });

          const readyMatchesResults = await Promise.all(readyMatchesPromises);
          setReadyMatches(readyMatchesResults.filter((m): m is ReadyMatch => m !== null));
        }
      }
    } catch (error) {
      console.error('Error loading validation status:', error);
      setIssues([{ type: 'error', message: 'Erreur lors de la vérification' }]);
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateIndividualMatches = async (matchId: string) => {
    if (!confirm('Voulez-vous générer les rencontres individuelles pour ce match ? Les joueurs seront appariés automatiquement selon leur handicap.')) {
      return;
    }

    setGeneratingMatch(matchId);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData.session) {
        throw new Error('No session found');
      }

      const generateUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-individual-matches`;
      const response = await fetch(generateUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${sessionData.session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ matchId }),
      });

      if (!response.ok) {
        throw new Error('Failed to generate individual matches');
      }

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || 'Failed to generate individual matches');
      }

      setMessage({
        type: 'success',
        text: `${result.matchupsGenerated} rencontres individuelles générées avec succès !`,
      });

      await loadValidationStatus();
    } catch (error) {
      console.error('Error generating individual matches:', error);
      setMessage({
        type: 'error',
        text: error instanceof Error ? error.message : 'Erreur lors de la génération des rencontres',
      });
    } finally {
      setGeneratingMatch(null);
    }
  };

  const handleValidate = async () => {
    if (!season || !user) return;

    const errorIssues = issues.filter((i) => i.type === 'error');
    if (errorIssues.length > 0) {
      setMessage({
        type: 'error',
        text: 'Impossible de valider : des erreurs doivent être corrigées',
      });
      return;
    }

    if (!confirm('Voulez-vous vraiment valider la configuration ? Les capitaines pourront accès au système.')) {
      return;
    }

    setProcessing(true);
    try {
      setMessage({
        type: 'success',
        text: 'Génération du calendrier des matchs...',
      });

      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData.session) {
        throw new Error('No session found');
      }

      const generateMatchesUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-matches`;
      const generateResponse = await fetch(generateMatchesUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${sessionData.session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({}),
      });

      if (!generateResponse.ok) {
        throw new Error('Failed to generate matches');
      }

      const generateResult = await generateResponse.json();

      if (!generateResult.success) {
        throw new Error(generateResult.error || 'Failed to generate matches');
      }

      const { error } = await supabase
        .from('seasons')
        .update({
          is_configuration_validated: true,
          configuration_validated_at: new Date().toISOString(),
          configuration_validated_by: user.id,
        })
        .eq('id', season.id);

      if (error) throw error;

      setMessage({
        type: 'success',
        text: `${generateResult.matchesCreated} match(s) généré(s). Envoi des invitations...`,
      });

      const invitationsUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-captain-invitations`;
      const invitationsResponse = await fetch(invitationsUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${sessionData.session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({}),
      });

      if (invitationsResponse.ok) {
        const result = await invitationsResponse.json();
        setMessage({
          type: 'success',
          text: `Configuration validée ! ${generateResult.matchesCreated} match(s) créé(s). ${result.sent} invitation(s) envoyée(s).`,
        });
      } else {
        setMessage({
          type: 'success',
          text: `Configuration validée. ${generateResult.matchesCreated} match(s) créé(s). Attention : erreur lors de l'envoi des invitations.`,
        });
      }

      await loadValidationStatus();
    } catch (error) {
      console.error('Error validating configuration:', error);
      setMessage({
        type: 'error',
        text: 'Erreur lors de la validation',
      });
    } finally {
      setProcessing(false);
    }
  };

  const handleUnlock = async () => {
    if (!season || !user) return;

    if (unlockCode !== UNLOCK_CODE) {
      setMessage({
        type: 'error',
        text: 'Code incorrect',
      });
      return;
    }

    setProcessing(true);
    try {
      const { error } = await supabase
        .from('seasons')
        .update({
          is_configuration_validated: false,
          configuration_validated_at: null,
          configuration_validated_by: null,
        })
        .eq('id', season.id);

      if (error) throw error;

      setMessage({
        type: 'success',
        text: 'Configuration déverrouillée',
      });
      setShowUnlockDialog(false);
      setUnlockCode('');
      await loadValidationStatus();
    } catch (error) {
      console.error('Error unlocking configuration:', error);
      setMessage({
        type: 'error',
        text: 'Erreur lors du déverrouillage',
      });
    } finally {
      setProcessing(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600"></div>
      </div>
    );
  }

  if (!season) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
        <AlertCircle className="h-12 w-12 text-red-600 mx-auto mb-3" />
        <p className="text-red-900 font-medium">Aucune saison active</p>
      </div>
    );
  }

  const errorCount = issues.filter((i) => i.type === 'error').length;
  const warningCount = issues.filter((i) => i.type === 'warning').length;
  const isValid = errorCount === 0;

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <Shield className="h-6 w-6 text-emerald-600" />
            <div>
              <h2 className="text-xl font-bold text-slate-900">Validation de Configuration</h2>
              <p className="text-sm text-slate-600">Saison {season.name}</p>
            </div>
          </div>

          <div
            className={`flex items-center gap-2 px-4 py-2 rounded-lg ${
              season.is_configuration_validated
                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                : 'bg-slate-50 text-slate-700 border border-slate-200'
            }`}
          >
            {season.is_configuration_validated ? (
              <>
                <Lock className="h-4 w-4" />
                <span className="font-medium text-sm">Validée</span>
              </>
            ) : (
              <>
                <Unlock className="h-4 w-4" />
                <span className="font-medium text-sm">Non validée</span>
              </>
            )}
          </div>
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

        <div className="space-y-4">
          {issues.length === 0 && !season.is_configuration_validated && (
            <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <CheckCircle className="h-5 w-5 text-emerald-600 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="font-medium text-emerald-900">Configuration complète</p>
                  <p className="text-sm text-emerald-700 mt-1">
                    Tous les paramètres requis sont renseignés. Vous pouvez valider la
                    configuration.
                  </p>
                </div>
              </div>
            </div>
          )}

          {season.is_configuration_validated && (
            <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <CheckCircle className="h-5 w-5 text-emerald-600 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="font-medium text-emerald-900">Configuration validée</p>
                  <p className="text-sm text-emerald-700 mt-1">
                    Les capitaines peuvent maintenant accéder au système.
                    {season.configuration_validated_at && (
                      <span className="block mt-1">
                        Validée le{' '}
                        {new Date(season.configuration_validated_at).toLocaleDateString('fr-FR', {
                          day: 'numeric',
                          month: 'long',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                    )}
                  </p>
                </div>
              </div>
            </div>
          )}

          {errorCount > 0 && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="flex items-start gap-3 mb-3">
                <AlertCircle className="h-5 w-5 text-red-600 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="font-medium text-red-900">
                    {errorCount} erreur{errorCount > 1 ? 's' : ''} à corriger
                  </p>
                  <p className="text-sm text-red-700 mt-1">
                    Corrigez ces erreurs avant de valider la configuration
                  </p>
                </div>
              </div>
              <ul className="space-y-2 ml-8">
                {issues
                  .filter((i) => i.type === 'error')
                  .map((issue, idx) => (
                    <li key={idx} className="text-sm text-red-800">
                      • {issue.message}
                    </li>
                  ))}
              </ul>
            </div>
          )}

          {warningCount > 0 && errorCount === 0 && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
              <div className="flex items-start gap-3 mb-3">
                <AlertTriangle className="h-5 w-5 text-amber-600 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="font-medium text-amber-900">
                    {warningCount} avertissement{warningCount > 1 ? 's' : ''}
                  </p>
                  <p className="text-sm text-amber-700 mt-1">
                    Ces avertissements n'empêchent pas la validation
                  </p>
                </div>
              </div>
              <ul className="space-y-2 ml-8">
                {issues
                  .filter((i) => i.type === 'warning')
                  .map((issue, idx) => (
                    <li key={idx} className="text-sm text-amber-800">
                      • {issue.message}
                    </li>
                  ))}
              </ul>
            </div>
          )}
        </div>

        <div className="flex gap-3 mt-6 pt-6 border-t border-slate-200">
          <button
            onClick={loadValidationStatus}
            className="px-4 py-2 bg-slate-200 text-slate-700 rounded-lg hover:bg-slate-300 font-medium transition-colors"
          >
            Rafraîchir
          </button>

          {!season.is_configuration_validated ? (
            <button
              onClick={handleValidate}
              disabled={!isValid || processing}
              className="px-6 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              <CheckCircle className="h-4 w-4" />
              Valider la configuration
            </button>
          ) : (
            <button
              onClick={() => setShowUnlockDialog(true)}
              className="px-6 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 font-medium transition-colors flex items-center gap-2"
            >
              <Unlock className="h-4 w-4" />
              Déverrouiller (cas exceptionnel)
            </button>
          )}
        </div>
      </div>

      {season?.is_configuration_validated && readyMatches.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 mb-6">
          <div className="flex items-center gap-3 mb-6">
            <Zap className="h-6 w-6 text-blue-600" />
            <div>
              <h2 className="text-xl font-bold text-slate-900">Génération des Rencontres</h2>
              <p className="text-sm text-slate-600">Matchs prêts pour la génération des parties individuelles</p>
            </div>
          </div>

          <div className="space-y-6">
            {['champe1', 'champe2'].map((division) => {
              const divisionMatches = readyMatches.filter((m) => m.division === division);

              if (divisionMatches.length === 0) return null;

              return (
                <div key={division}>
                  <h3 className="text-lg font-semibold text-slate-900 mb-4">
                    {division === 'champe1' ? 'Champe 1' : 'Champe 2'}
                  </h3>
                  <div className="space-y-3">
                    {divisionMatches.map((match) => (
                      <div key={match.match_id} className="flex items-center justify-between p-4 bg-slate-50 rounded-lg border border-slate-200">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <span className="text-sm font-medium text-slate-500">
                              J{match.round_number}
                            </span>
                            <span className="text-sm text-slate-600">
                              {new Date(match.match_date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}
                            </span>
                            {match.is_final && (
                              <span className="px-2 py-1 bg-purple-100 text-purple-700 text-xs font-medium rounded">
                                FINALE
                              </span>
                            )}
                          </div>
                          <div className="text-sm font-medium text-slate-900">
                            {match.team1_name} vs {match.team2_name}
                          </div>
                          <div className="flex items-center gap-4 mt-2">
                            <span className="text-xs text-slate-600">
                              {match.team1_name}: {match.team1_selections}/{match.is_final ? 10 : 8} joueurs
                            </span>
                            <span className="text-xs text-slate-600">
                              {match.team2_name}: {match.team2_selections}/{match.is_final ? 10 : 8} joueurs
                            </span>
                          </div>
                        </div>
                        <div>
                          {match.has_individual_matches ? (
                            <div className="flex items-center gap-2 text-emerald-600">
                              <CheckCircle className="h-5 w-5" />
                              <span className="text-sm font-medium">Généré</span>
                            </div>
                          ) : (
                            <button
                              onClick={() => handleGenerateIndividualMatches(match.match_id)}
                              disabled={generatingMatch === match.match_id}
                              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                            >
                              <Zap className="h-4 w-4" />
                              {generatingMatch === match.match_id ? 'Génération...' : 'Générer les parties'}
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {season?.is_configuration_validated && teamStatuses.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <div className="flex items-center gap-3 mb-6">
            <Users className="h-6 w-6 text-emerald-600" />
            <div>
              <h2 className="text-xl font-bold text-slate-900">Sélections des Capitaines</h2>
              <p className="text-sm text-slate-600">État des sélections pour la prochaine journée</p>
            </div>
          </div>

          <div className="space-y-6">
            {['champe1', 'champe2'].map((division) => {
              const divisionTeams = teamStatuses.filter((t) => t.division === division);
              if (divisionTeams.length === 0) return null;

              return (
                <div key={division}>
                  <h3 className="text-lg font-semibold text-slate-900 mb-3">
                    {division === 'champe1' ? 'Champe 1' : 'Champe 2'}
                  </h3>
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-slate-200">
                          <th className="text-left py-3 px-4 text-sm font-medium text-slate-700">Club</th>
                          <th className="text-left py-3 px-4 text-sm font-medium text-slate-700">Capitaine</th>
                          <th className="text-left py-3 px-4 text-sm font-medium text-slate-700">Prochain match</th>
                          <th className="text-center py-3 px-4 text-sm font-medium text-slate-700">Joueurs sélectionnés</th>
                          <th className="text-center py-3 px-4 text-sm font-medium text-slate-700">Statut</th>
                        </tr>
                      </thead>
                      <tbody>
                        {divisionTeams.map((team) => (
                          <tr key={team.team_id} className="border-b border-slate-100 hover:bg-slate-50">
                            <td className="py-3 px-4 text-sm text-slate-900 font-medium">
                              {team.club_name}
                            </td>
                            <td className="py-3 px-4 text-sm text-slate-600">
                              {team.captain_name}
                            </td>
                            <td className="py-3 px-4 text-sm text-slate-600">
                              {team.next_match_date ? (
                                <div className="flex items-center gap-2">
                                  <Calendar className="h-4 w-4 text-slate-400" />
                                  <span>
                                    J{team.round_number} - {new Date(team.next_match_date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}
                                  </span>
                                </div>
                              ) : (
                                <span className="text-slate-400">Aucun match</span>
                              )}
                            </td>
                            <td className="py-3 px-4 text-center">
                              {team.next_match_date ? (
                                <span className={`inline-flex items-center justify-center px-3 py-1 rounded-full text-sm font-medium ${
                                  team.players_selected >= (team.is_final ? 10 : 8)
                                    ? 'bg-emerald-100 text-emerald-700'
                                    : team.players_selected > 0
                                    ? 'bg-amber-100 text-amber-700'
                                    : 'bg-slate-100 text-slate-600'
                                }`}>
                                  {team.players_selected}/{team.is_final ? 10 : 8}
                                </span>
                              ) : (
                                <span className="text-sm text-slate-400">-</span>
                              )}
                            </td>
                            <td className="py-3 px-4 text-center">
                              {team.next_match_date ? (
                                team.players_selected >= (team.is_final ? 10 : 8) ? (
                                  <div className="flex items-center justify-center gap-1 text-emerald-600">
                                    <CheckCircle className="h-4 w-4" />
                                    <span className="text-sm font-medium">Complet</span>
                                  </div>
                                ) : (
                                  <div className="flex items-center justify-center gap-1 text-amber-600">
                                    <AlertTriangle className="h-4 w-4" />
                                    <span className="text-sm font-medium">En cours</span>
                                  </div>
                                )
                              ) : (
                                <span className="text-sm text-slate-400">-</span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {showUnlockDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
            <h3 className="text-lg font-bold text-slate-900 mb-4">Déverrouiller la configuration</h3>
            <p className="text-sm text-slate-600 mb-4">
              Cette action déverrouillera la configuration et empêchera les capitaines d'accéder au
              système. Entrez le code de déblocage pour confirmer.
            </p>

            <div className="mb-6">
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Code de déblocage
              </label>
              <input
                type="text"
                value={unlockCode}
                onChange={(e) => setUnlockCode(e.target.value.toUpperCase())}
                placeholder="Entrez le code"
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
              />
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowUnlockDialog(false);
                  setUnlockCode('');
                  setMessage(null);
                }}
                className="flex-1 px-4 py-2 bg-slate-200 text-slate-700 rounded-lg hover:bg-slate-300 font-medium transition-colors"
              >
                Annuler
              </button>
              <button
                onClick={handleUnlock}
                disabled={!unlockCode || processing}
                className="flex-1 px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Déverrouiller
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
