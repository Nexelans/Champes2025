import { useState, useEffect } from 'react';
import { Shield, CheckCircle, AlertTriangle, Lock, Unlock, AlertCircle } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';

type ValidationIssue = {
  type: 'error' | 'warning';
  message: string;
};

export default function ConfigurationValidation() {
  const { user } = useAuth();
  const [season, setSeason] = useState<any>(null);
  const [issues, setIssues] = useState<ValidationIssue[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
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
    } catch (error) {
      console.error('Error loading validation status:', error);
      setIssues([{ type: 'error', message: 'Erreur lors de la vérification' }]);
    } finally {
      setLoading(false);
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
