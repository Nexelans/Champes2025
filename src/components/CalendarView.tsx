import { useEffect, useState } from 'react';
import { MapPin, Loader2, AlertCircle, Trophy } from 'lucide-react';
import { supabase } from '../lib/supabase';

type Match = {
  date: string;
  round: number;
  division: 'Champe 1' | 'Champe 2';
  host: string;
  matchups: Array<{ team1: string; team2: string; match_type?: string }>;
  isFinal?: boolean;
};

type SeasonDate = {
  round_number: number;
  planned_date: string;
  host_club_id: string | null;
  host_club_name?: string | null;
  matchups?: Array<{ team1: string; team2: string; match_type?: string }>;
  isFinal?: boolean;
};

const MATCH_TYPE_LABELS: Record<string, string> = {
  final_1st: 'Finale 1re / 2e place',
  final_3rd: 'Match 3e / 4e place',
  final_5th: 'Match 5e / 6e place',
};

const MATCH_TYPE_COLORS: Record<string, string> = {
  final_1st: 'bg-amber-50 border-amber-200',
  final_3rd: 'bg-slate-50 border-slate-300',
  final_5th: 'bg-orange-50 border-orange-100',
};

type CalendarViewProps = {
  division: 'champe1' | 'champe2';
};

export default function CalendarView({ division }: CalendarViewProps) {
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

      const { data: matchesData } = await supabase
        .from('matches')
        .select(`
          id,
          division,
          round_number,
          match_date,
          host_club_id,
          match_type,
          team1:teams!matches_team1_id_fkey(id, club:clubs(name)),
          team2:teams!matches_team2_id_fkey(id, club:clubs(name)),
          host_club:clubs(name)
        `)
        .eq('season_id', seasonData.id)
        .order('round_number');

      if (matchesData) {
        const groupedMatches: Record<string, any[]> = {};

        matchesData.forEach((match: any) => {
          const isFinal = match.round_number === 6;
          const key = isFinal
            ? `${match.division}-final-${match.match_type}`
            : `${match.division}-${match.round_number}`;
          if (!groupedMatches[key]) {
            groupedMatches[key] = [];
          }
          groupedMatches[key].push({
            team1: match.team1?.club?.name || 'Inconnu',
            team2: match.team2?.club?.name || 'Inconnu',
            date: match.match_date,
            host_club_id: match.host_club_id,
            host_club_name: match.host_club?.name || null,
            match_type: match.match_type,
            isFinal,
          });
        });

        const buildDates = (divisionPrefix: string): SeasonDate[] => {
          const regularKeys = Object.keys(groupedMatches)
            .filter(k => k.startsWith(`${divisionPrefix}-`) && !k.includes('final'));
          const finalKeys = Object.keys(groupedMatches)
            .filter(k => k.startsWith(`${divisionPrefix}-final-`));

          const regular = regularKeys
            .map(key => {
              const matches = groupedMatches[key];
              const roundNumber = parseInt(key.split('-')[1]);
              return {
                round_number: roundNumber,
                planned_date: matches[0].date,
                host_club_id: matches[0].host_club_id,
                host_club_name: matches[0].host_club_name,
                matchups: matches.map((m: any) => ({ team1: m.team1, team2: m.team2 })),
                isFinal: false,
              };
            })
            .sort((a, b) => a.round_number - b.round_number);

          if (finalKeys.length > 0) {
            const allFinalMatches = finalKeys.flatMap(key => groupedMatches[key]);
            const finalOrder = ['final_1st', 'final_3rd', 'final_5th'];
            const sortedFinalMatchups = finalOrder
              .filter(type => allFinalMatches.some((m: any) => m.match_type === type))
              .map(type => {
                const m = allFinalMatches.find((x: any) => x.match_type === type)!;
                return { team1: m.team1, team2: m.team2, match_type: type };
              });

            regular.push({
              round_number: 6,
              planned_date: allFinalMatches[0].date,
              host_club_id: allFinalMatches[0].host_club_id,
              host_club_name: allFinalMatches[0].host_club_name,
              matchups: sortedFinalMatchups,
              isFinal: true,
            });
          }

          return regular;
        };

        const c1Dates = buildDates('champe1');
        const c2Dates = buildDates('champe2');

        setChampe1Dates(c1Dates);
        setChampe2Dates(c2Dates);
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

  const champe1Matches: Match[] = champe1Dates.map(d => ({
    date: formatDate(d.planned_date),
    round: d.round_number,
    division: 'Champe 1' as const,
    host: d.host_club_name || 'À définir',
    matchups: d.matchups || [],
    isFinal: d.isFinal,
  }));

  const champe2Matches: Match[] = champe2Dates.map(d => ({
    date: formatDate(d.planned_date),
    round: d.round_number,
    division: 'Champe 2' as const,
    host: d.host_club_name || 'À définir',
    matchups: d.matchups || [],
    isFinal: d.isFinal,
  }));


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

  const matches = division === 'champe1' ? champe1Matches : champe2Matches;
  const divisionLabel = division === 'champe1' ? 'Champe 1' : 'Champe 2';
  const colorClasses = division === 'champe1'
    ? { badge: 'text-blue-600 bg-blue-50' }
    : { badge: 'text-sky-600 bg-sky-50' };

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-bold text-slate-900 mb-6">Calendrier {divisionLabel}</h2>
        <div className="space-y-4">
          {matches.map((match, idx) => (
            <div
              key={idx}
              className={`rounded-lg shadow-sm border p-6 ${
                match.isFinal
                  ? 'bg-gradient-to-br from-amber-50 to-orange-50 border-amber-200'
                  : 'bg-white border-slate-200'
              }`}
            >
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
                    {match.isFinal && <Trophy className="h-5 w-5 text-amber-500" />}
                    {match.isFinal ? 'Finales' : `Journée ${match.round}`}
                  </h3>
                  <p className="text-sm text-slate-600">{match.date}</p>
                </div>
                <div className={`flex items-center space-x-2 ${
                  match.isFinal ? 'text-amber-700 bg-amber-100' : colorClasses.badge
                } px-3 py-1 rounded-full`}>
                  <MapPin className="w-4 h-4" />
                  <span className="text-sm font-medium">{match.host}</span>
                </div>
              </div>
              {match.matchups.length > 0 ? (
                <div className="space-y-2">
                  {match.matchups.map((matchup, midx) => (
                    <div
                      key={midx}
                      className={`p-3 rounded-lg border ${
                        matchup.match_type
                          ? MATCH_TYPE_COLORS[matchup.match_type] || 'bg-slate-50 border-slate-200'
                          : 'bg-slate-50 border-slate-200'
                      }`}
                    >
                      {matchup.match_type && (
                        <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                          {MATCH_TYPE_LABELS[matchup.match_type]}
                        </p>
                      )}
                      <div className="flex items-center justify-between">
                        <span className="font-medium text-slate-900">{matchup.team1}</span>
                        <span className="text-slate-400 font-semibold">vs</span>
                        <span className="font-medium text-slate-900">{matchup.team2}</span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-slate-500 italic mt-4">Les matchs seront générés automatiquement</p>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}