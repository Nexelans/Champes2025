import { useEffect, useState } from 'react';
import { Settings, Calendar, Users, Check, AlertCircle, Plus } from 'lucide-react';
import { supabase, type Club, type Season, type SeasonClub, type SeasonDate } from '../lib/supabase';

type SeasonSetupProps = {
  division: 'champe1' | 'champe2';
};

type ClubParticipation = {
  club_id: string;
  club_name: string;
  is_participating: boolean;
};

export default function SeasonSetup({ division }: SeasonSetupProps) {
  const [season, setSeason] = useState<Season | null>(null);
  const [clubs, setClubs] = useState<ClubParticipation[]>([]);
  const [dates, setDates] = useState<{ [key: number]: string }>({
    1: '',
    2: '',
    3: '',
    4: '',
    5: '',
    6: '',
  });
  const [hostClubs, setHostClubs] = useState<{ [key: number]: string }>({
    1: '',
    2: '',
    3: '',
    4: '',
    5: '',
    6: '',
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [showNewSeasonForm, setShowNewSeasonForm] = useState(false);
  const [newSeasonName, setNewSeasonName] = useState('');
  const [newSeasonStartDate, setNewSeasonStartDate] = useState('');
  const [newSeasonEndDate, setNewSeasonEndDate] = useState('');

  useEffect(() => {
    loadSeasonConfiguration();
  }, [division]);

  const loadSeasonConfiguration = async () => {
    setLoading(true);
    try {
      const { data: seasonData } = await supabase
        .from('seasons')
        .select('*')
        .eq('is_active', true)
        .maybeSingle();

      if (!seasonData) {
        setLoading(false);
        return;
      }

      setSeason(seasonData);

      const { data: clubsData } = await supabase
        .from('clubs')
        .select('id, name')
        .order('name');

      if (clubsData) {
        const { data: seasonClubsData } = await supabase
          .from('season_clubs')
          .select('*')
          .eq('season_id', seasonData.id)
          .eq('division', division);

        const clubParticipation: ClubParticipation[] = clubsData.map((club) => {
          const participation = seasonClubsData?.find((sc) => sc.club_id === club.id);
          return {
            club_id: club.id,
            club_name: club.name,
            is_participating: participation?.is_participating ?? true,
          };
        });

        setClubs(clubParticipation);
      }

      const { data: datesData } = await supabase
        .from('season_dates')
        .select('*')
        .eq('season_id', seasonData.id)
        .eq('division', division);

      if (datesData) {
        const datesMap: { [key: number]: string } = {};
        const hostClubsMap: { [key: number]: string } = {};
        datesData.forEach((date) => {
          datesMap[date.round_number] = date.planned_date;
          hostClubsMap[date.round_number] = date.host_club_id || '';
        });
        setDates(datesMap);
        setHostClubs(hostClubsMap);
      }
    } catch (error) {
      console.error('Error loading configuration:', error);
      setMessage({ type: 'error', text: 'Erreur lors du chargement de la configuration' });
    } finally {
      setLoading(false);
    }
  };

  const toggleClubParticipation = (clubId: string) => {
    setClubs((prev) =>
      prev.map((club) =>
        club.club_id === clubId
          ? { ...club, is_participating: !club.is_participating }
          : club
      )
    );
  };

  const updateDate = (roundNumber: number, date: string) => {
    setDates((prev) => ({ ...prev, [roundNumber]: date }));
  };

  const updateHostClub = (roundNumber: number, clubId: string) => {
    setHostClubs((prev) => ({ ...prev, [roundNumber]: clubId }));
  };

  const saveConfiguration = async () => {
    if (!season) return;

    const participatingClubs = clubs.filter((c) => c.is_participating);
    if (participatingClubs.length < 2) {
      setMessage({
        type: 'error',
        text: 'Au moins 2 clubs doivent participer',
      });
      return;
    }

    const allDatesSet = Object.values(dates).every((date) => date !== '');
    if (!allDatesSet) {
      setMessage({
        type: 'error',
        text: 'Toutes les dates doivent être définies',
      });
      return;
    }

    setSaving(true);
    setMessage(null);

    try {
      await supabase
        .from('season_clubs')
        .delete()
        .eq('season_id', season.id)
        .eq('division', division);

      for (const club of clubs) {
        await supabase.from('season_clubs').insert({
          season_id: season.id,
          club_id: club.club_id,
          division: division,
          is_participating: club.is_participating,
        });
      }

      await supabase
        .from('season_dates')
        .delete()
        .eq('season_id', season.id)
        .eq('division', division);

      for (const [roundNumber, date] of Object.entries(dates)) {
        await supabase.from('season_dates').insert({
          season_id: season.id,
          division: division,
          round_number: parseInt(roundNumber),
          planned_date: date,
          host_club_id: hostClubs[parseInt(roundNumber)] || null,
        });
      }

      await supabase
        .from('teams')
        .delete()
        .eq('season_id', season.id)
        .eq('division', division);

      for (const club of clubs.filter(c => c.is_participating)) {
        await supabase.from('teams').insert({
          season_id: season.id,
          club_id: club.club_id,
          division: division,
        });
      }

      setMessage({
        type: 'success',
        text: 'Génération du calendrier des matchs...',
      });

      const { data: sessionData } = await supabase.auth.getSession();
      if (sessionData.session) {
        const generateMatchesUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-matches`;
        const generateResponse = await fetch(generateMatchesUrl, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${sessionData.session.access_token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            season_id: season.id,
            division: division,
          }),
        });

        if (!generateResponse.ok) {
          const errorText = await generateResponse.text();
          console.error('Error generating matches:', errorText);
          setMessage({
            type: 'error',
            text: 'Configuration enregistrée mais erreur lors de la génération du calendrier',
          });
          return;
        }
      }

      setMessage({
        type: 'success',
        text: 'Configuration enregistrée avec succès. Le calendrier a été généré.',
      });
    } catch (error) {
      console.error('Error saving configuration:', error);
      setMessage({
        type: 'error',
        text: 'Erreur lors de l\'enregistrement',
      });
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

  const createNewSeason = async () => {
    if (!newSeasonName || !newSeasonStartDate || !newSeasonEndDate) {
      setMessage({ type: 'error', text: 'Tous les champs sont requis' });
      return;
    }

    if (new Date(newSeasonEndDate) <= new Date(newSeasonStartDate)) {
      setMessage({ type: 'error', text: 'La date de fin doit être après la date de début' });
      return;
    }

    setSaving(true);
    setMessage(null);

    try {
      await supabase
        .from('seasons')
        .update({ is_active: false })
        .eq('is_active', true);

      const { data: newSeason, error } = await supabase
        .from('seasons')
        .insert({
          name: newSeasonName,
          start_date: newSeasonStartDate,
          end_date: newSeasonEndDate,
          is_active: true,
        })
        .select()
        .single();

      if (error) throw error;

      setSeason(newSeason);
      setShowNewSeasonForm(false);
      setNewSeasonName('');
      setNewSeasonStartDate('');
      setNewSeasonEndDate('');
      setMessage({ type: 'success', text: 'Saison créée avec succès' });
      await loadSeasonConfiguration();
    } catch (error) {
      console.error('Error creating season:', error);
      setMessage({ type: 'error', text: 'Erreur lors de la création de la saison' });
    } finally {
      setSaving(false);
    }
  };

  if (!season) {
    return (
      <div className="space-y-6">
        <div className="bg-sky-50 border border-sky-200 rounded-lg p-6">
          <AlertCircle className="h-12 w-12 text-sky-600 mx-auto mb-3" />
          <p className="text-sky-900 font-medium text-center mb-4">Aucune saison active</p>

          {!showNewSeasonForm ? (
            <div className="text-center">
              <button
                onClick={() => setShowNewSeasonForm(true)}
                className="inline-flex items-center gap-2 px-6 py-3 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 font-medium transition-colors"
              >
                <Plus className="h-5 w-5" />
                Créer une nouvelle saison
              </button>
            </div>
          ) : (
            <div className="max-w-md mx-auto mt-6">
              <h3 className="text-lg font-semibold text-slate-900 mb-4">Nouvelle saison</h3>

              {message && (
                <div
                  className={`p-4 rounded-lg mb-4 ${
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
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Nom de la saison
                  </label>
                  <input
                    type="text"
                    value={newSeasonName}
                    onChange={(e) => setNewSeasonName(e.target.value)}
                    placeholder="Ex: 2024-2025"
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Date de début
                  </label>
                  <input
                    type="date"
                    value={newSeasonStartDate}
                    onChange={(e) => setNewSeasonStartDate(e.target.value)}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Date de fin
                  </label>
                  <input
                    type="date"
                    value={newSeasonEndDate}
                    onChange={(e) => setNewSeasonEndDate(e.target.value)}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                  />
                </div>
                <div className="flex gap-3 pt-4">
                  <button
                    onClick={() => {
                      setShowNewSeasonForm(false);
                      setMessage(null);
                    }}
                    disabled={saving}
                    className="flex-1 px-4 py-2 text-slate-700 bg-slate-100 rounded-lg hover:bg-slate-200 font-medium transition-colors disabled:opacity-50"
                  >
                    Annuler
                  </button>
                  <button
                    onClick={createNewSeason}
                    disabled={saving}
                    className="flex-1 px-4 py-2 text-white bg-emerald-600 rounded-lg hover:bg-emerald-700 font-medium transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {saving ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                        Création...
                      </>
                    ) : (
                      <>
                        <Check className="h-4 w-4" />
                        Créer
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
        <div className="flex items-center gap-3 mb-6">
          <Settings className="h-6 w-6 text-emerald-600" />
          <div>
            <h2 className="text-xl font-bold text-slate-900">
              Configuration {division === 'champe1' ? 'Champe 1' : 'Champe 2'}
            </h2>
            <p className="text-sm text-slate-600">Saison {season.name}</p>
          </div>
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

        <div className="space-y-8">
          <div>
            <div className="flex items-center gap-2 mb-4">
              <Users className="h-5 w-5 text-slate-600" />
              <h3 className="text-lg font-semibold text-slate-900">
                Clubs participants
              </h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {clubs.map((club) => (
                <label
                  key={club.club_id}
                  className={`flex items-center gap-3 p-4 rounded-lg border-2 cursor-pointer transition-all ${
                    club.is_participating
                      ? 'bg-emerald-50 border-emerald-300'
                      : 'bg-slate-50 border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={club.is_participating}
                    onChange={() => toggleClubParticipation(club.club_id)}
                    className="w-5 h-5 text-emerald-600 rounded focus:ring-emerald-500"
                  />
                  <span
                    className={`font-medium ${
                      club.is_participating ? 'text-emerald-900' : 'text-slate-600'
                    }`}
                  >
                    {club.club_name}
                  </span>
                </label>
              ))}
            </div>
            <p className="text-sm text-slate-500 mt-3">
              {clubs.filter((c) => c.is_participating).length} club(s) sélectionné(s)
            </p>
          </div>

          <div>
            <div className="flex items-center gap-2 mb-4">
              <Calendar className="h-5 w-5 text-slate-600" />
              <h3 className="text-lg font-semibold text-slate-900">
                Dates des rencontres
              </h3>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {[1, 2, 3, 4, 5].map((round) => (
                <div key={round} className="bg-slate-50 p-4 rounded-lg">
                  <h4 className="text-sm font-semibold text-slate-900 mb-3">
                    Journée {round}
                  </h4>
                  <div className="space-y-3">
                    <div>
                      <label className="block text-xs font-medium text-slate-600 mb-1">
                        Date
                      </label>
                      <input
                        type="date"
                        value={dates[round] || ''}
                        onChange={(e) => updateDate(round, e.target.value)}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-600 mb-1">
                        Club hôte (optionnel)
                      </label>
                      <select
                        value={hostClubs[round] || ''}
                        onChange={(e) => updateHostClub(round, e.target.value)}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                      >
                        <option value="">Automatique (club de l'équipe 1)</option>
                        {clubs
                          .filter((c) => c.is_participating)
                          .map((club) => (
                            <option key={club.club_id} value={club.club_id}>
                              {club.club_name}
                            </option>
                          ))}
                      </select>
                    </div>
                  </div>
                </div>
              ))}
              <div className="bg-slate-50 p-4 rounded-lg">
                <h4 className="text-sm font-semibold text-slate-900 mb-3">
                  Finale
                </h4>
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">
                      Date
                    </label>
                    <input
                      type="date"
                      value={dates[6] || ''}
                      onChange={(e) => updateDate(6, e.target.value)}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">
                      Club hôte (optionnel)
                    </label>
                    <select
                      value={hostClubs[6] || ''}
                      onChange={(e) => updateHostClub(6, e.target.value)}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                    >
                      <option value="">Automatique (club de l'équipe 1)</option>
                      {clubs
                        .filter((c) => c.is_participating)
                        .map((club) => (
                          <option key={club.club_id} value={club.club_id}>
                            {club.club_name}
                          </option>
                        ))}
                    </select>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-6 border-t border-slate-200">
            <button
              onClick={loadSeasonConfiguration}
              disabled={saving}
              className="px-6 py-2.5 text-slate-700 bg-slate-100 rounded-lg hover:bg-slate-200 font-medium transition-colors disabled:opacity-50"
            >
              Annuler
            </button>
            <button
              onClick={saveConfiguration}
              disabled={saving}
              className="px-6 py-2.5 text-white bg-emerald-600 rounded-lg hover:bg-emerald-700 font-medium transition-colors disabled:opacity-50 flex items-center gap-2"
            >
              {saving ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  Enregistrement...
                </>
              ) : (
                <>
                  <Check className="h-4 w-4" />
                  Enregistrer la configuration
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      <div className="bg-gradient-to-r from-sky-50 to-emerald-50 rounded-xl p-6 border border-sky-200">
        <h3 className="text-lg font-semibold text-slate-900 mb-3">
          Informations
        </h3>
        <ul className="space-y-2 text-sm text-slate-700">
          <li className="flex items-start gap-2">
            <span className="text-emerald-600 mt-0.5">•</span>
            <span>Sélectionnez les clubs qui participent à cette édition</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-emerald-600 mt-0.5">•</span>
            <span>Définissez les dates des 5 journées régulières et de la finale</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-emerald-600 mt-0.5">•</span>
            <span>Vous pouvez choisir un club hôte pour chaque journée (optionnel)</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-emerald-600 mt-0.5">•</span>
            <span>Le calendrier des matchs sera généré automatiquement</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-emerald-600 mt-0.5">•</span>
            <span>
              Les équipes seront créées uniquement pour les clubs participants
            </span>
          </li>
        </ul>
      </div>
    </div>
  );
}
