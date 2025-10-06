import { useEffect, useState } from 'react';
import { MapPin, Loader2, AlertCircle } from 'lucide-react';
import { supabase } from '../lib/supabase';

type Match = {
  date: string;
  round: number;
  division: 'Champe 1' | 'Champe 2';
  host: string;
  matchups: Array<{ team1: string; team2: string }>;
};

type SeasonDate = {
  round_number: number;
  planned_date: string;
  host_club_id: string | null;
};

export default function CalendarView() {
  const [loading, setLoading] = useState(true);
  const [champe1Dates, setChampe1Dates] = useState<SeasonDate[]>([]);
  const [champe2Dates, setChampe2Dates] = useState<SeasonDate[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadDates();
  }, []);

  const loadDates = async () => {
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

      const { data: datesData } = await supabase
        .from('season_dates')
        .select('*')
        .eq('season_id', seasonData.id)
        .order('round_number');

      if (datesData) {
        const c1 = datesData.filter(d => d.division === 'champe1');
        const c2 = datesData.filter(d => d.division === 'champe2');
        setChampe1Dates(c1);
        setChampe2Dates(c2);
      }
    } catch (error) {
      console.error('Error loading dates:', error);
      setError('Erreur lors du chargement des dates');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  const champe1Matches: Match[] = champe1Dates
    .filter(d => d.round_number <= 5)
    .map(d => ({
      date: formatDate(d.planned_date),
      round: d.round_number,
      division: 'Champe 1' as const,
      host: 'À définir',
      matchups: []
    }));

  const champe2Matches: Match[] = champe2Dates
    .filter(d => d.round_number <= 5)
    .map(d => ({
      date: formatDate(d.planned_date),
      round: d.round_number,
      division: 'Champe 2' as const,
      host: 'À définir',
      matchups: []
    }));

  const finals = {
    champe1: champe1Dates.find(d => d.round_number === 6),
    champe2: champe2Dates.find(d => d.round_number === 6),
  };

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

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-bold text-slate-900 mb-6">Calendrier Champe 1</h2>
        <div className="space-y-4">
          {champe1Matches.map((match, idx) => (
            <div
              key={idx}
              className="bg-white rounded-lg shadow-sm border border-slate-200 p-6"
            >
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="text-lg font-semibold text-slate-900">
                    Journée {match.round}
                  </h3>
                  <p className="text-sm text-slate-600">{match.date}</p>
                </div>
                <div className="flex items-center space-x-2 text-blue-600 bg-blue-50 px-3 py-1 rounded-full">
                  <MapPin className="w-4 h-4" />
                  <span className="text-sm font-medium">{match.host}</span>
                </div>
              </div>
              {match.matchups.length > 0 ? (
                <div className="space-y-2">
                  {match.matchups.map((matchup, midx) => (
                    <div
                      key={midx}
                      className="flex items-center justify-between p-3 bg-slate-50 rounded-lg"
                    >
                      <span className="font-medium text-slate-900">{matchup.team1}</span>
                      <span className="text-slate-400 font-semibold">vs</span>
                      <span className="font-medium text-slate-900">{matchup.team2}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-slate-500 italic mt-4">Les matchs seront générés automatiquement</p>
              )}
            </div>
          ))}
          {finals.champe1 && (
            <div className="bg-gradient-to-r from-emerald-600 to-emerald-700 rounded-lg shadow-sm p-6 text-white">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-lg font-semibold">Finale Champe 1</h3>
                  <p className="text-sm text-emerald-100">{formatDate(finals.champe1.planned_date)}</p>
                </div>
                <div className="flex items-center space-x-2 bg-white/20 px-3 py-1 rounded-full">
                  <MapPin className="w-4 h-4" />
                  <span className="text-sm font-medium">À définir</span>
                </div>
              </div>
              <p className="mt-4 text-sm text-emerald-100">
                Finale en foursome à 10 joueurs par équipe
              </p>
            </div>
          )}
        </div>
      </div>

      <div>
        <h2 className="text-2xl font-bold text-slate-900 mb-6">Calendrier Champe 2</h2>
        <div className="space-y-4">
          {champe2Matches.map((match, idx) => (
            <div
              key={idx}
              className="bg-white rounded-lg shadow-sm border border-slate-200 p-6"
            >
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="text-lg font-semibold text-slate-900">
                    Journée {match.round}
                  </h3>
                  <p className="text-sm text-slate-600">{match.date}</p>
                </div>
                <div className="flex items-center space-x-2 text-sky-600 bg-sky-50 px-3 py-1 rounded-full">
                  <MapPin className="w-4 h-4" />
                  <span className="text-sm font-medium">{match.host}</span>
                </div>
              </div>
              {match.matchups.length > 0 ? (
                <div className="space-y-2">
                  {match.matchups.map((matchup, midx) => (
                    <div
                      key={midx}
                      className="flex items-center justify-between p-3 bg-slate-50 rounded-lg"
                    >
                      <span className="font-medium text-slate-900">{matchup.team1}</span>
                      <span className="text-slate-400 font-semibold">vs</span>
                      <span className="font-medium text-slate-900">{matchup.team2}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-slate-500 italic mt-4">Les matchs seront générés automatiquement</p>
              )}
            </div>
          ))}
          {finals.champe2 && (
            <div className="bg-gradient-to-r from-sky-600 to-sky-700 rounded-lg shadow-sm p-6 text-white">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-lg font-semibold">Finale Champe 2</h3>
                  <p className="text-sm text-sky-100">{formatDate(finals.champe2.planned_date)}</p>
                </div>
                <div className="flex items-center space-x-2 bg-white/20 px-3 py-1 rounded-full">
                  <MapPin className="w-4 h-4" />
                  <span className="text-sm font-medium">À définir</span>
                </div>
              </div>
              <p className="mt-4 text-sm text-sky-100">
                Finale en foursome à 10 joueurs par équipe
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}