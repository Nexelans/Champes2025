import { MapPin } from 'lucide-react';

type Match = {
  date: string;
  round: number;
  division: 'Champe 1' | 'Champe 2';
  host: string;
  matchups: Array<{ team1: string; team2: string }>;
};

export default function CalendarView() {
  const champe1Matches: Match[] = [
    {
      date: '17/11/2024',
      round: 1,
      division: 'Champe 1',
      host: 'La Sorelle',
      matchups: [
        { team1: 'La Sorelle', team2: 'Mionnay' },
        { team1: '3 Vallons', team2: 'Le Clou' },
        { team1: 'Bourg en Bresse', team2: 'Chassieu' },
      ],
    },
    {
      date: '01/12/2024',
      round: 2,
      division: 'Champe 1',
      host: 'Le Clou',
      matchups: [
        { team1: 'Le Clou', team2: 'Bourg en Bresse' },
        { team1: 'Mionnay', team2: 'Chassieu' },
        { team1: '3 Vallons', team2: 'La Sorelle' },
      ],
    },
    {
      date: '15/12/2024',
      round: 3,
      division: 'Champe 1',
      host: '3 Vallons',
      matchups: [
        { team1: '3 Vallons', team2: 'Chassieu' },
        { team1: 'Mionnay', team2: 'Bourg en Bresse' },
        { team1: 'La Sorelle', team2: 'Le Clou' },
      ],
    },
    {
      date: '19/01/2025',
      round: 4,
      division: 'Champe 1',
      host: 'Mionnay',
      matchups: [
        { team1: 'Mionnay', team2: 'Le Clou' },
        { team1: '3 Vallons', team2: 'Bourg en Bresse' },
        { team1: 'La Sorelle', team2: 'Chassieu' },
      ],
    },
    {
      date: '09/02/2025',
      round: 5,
      division: 'Champe 1',
      host: 'Bourg en Bresse',
      matchups: [
        { team1: 'Bourg en Bresse', team2: 'La Sorelle' },
        { team1: 'Le Clou', team2: 'Chassieu' },
        { team1: '3 Vallons', team2: 'Mionnay' },
      ],
    },
  ];

  const champe2Matches: Match[] = [
    {
      date: '01/12/2024',
      round: 1,
      division: 'Champe 2',
      host: 'La Sorelle',
      matchups: [
        { team1: 'La Sorelle', team2: 'Le Clou' },
        { team1: 'Mionnay', team2: '3 Vallons' },
        { team1: 'Chassieu', team2: 'Bourg en Bresse' },
      ],
    },
    {
      date: '12/01/2025',
      round: 2,
      division: 'Champe 2',
      host: 'Chassieu',
      matchups: [
        { team1: 'Chassieu', team2: '3 Vallons' },
        { team1: 'Mionnay', team2: 'Le Clou' },
        { team1: 'Bourg en Bresse', team2: 'La Sorelle' },
      ],
    },
    {
      date: '26/01/2025',
      round: 3,
      division: 'Champe 2',
      host: 'Mionnay',
      matchups: [
        { team1: 'Mionnay', team2: 'La Sorelle' },
        { team1: 'Chassieu', team2: 'Le Clou' },
        { team1: 'Bourg en Bresse', team2: '3 Vallons' },
      ],
    },
    {
      date: '09/02/2025',
      round: 4,
      division: 'Champe 2',
      host: 'Le Clou',
      matchups: [
        { team1: 'Le Clou', team2: 'Bourg en Bresse' },
        { team1: 'La Sorelle', team2: '3 Vallons' },
        { team1: 'Chassieu', team2: 'Mionnay' },
      ],
    },
    {
      date: '23/02/2025',
      round: 5,
      division: 'Champe 2',
      host: 'Bourg en Bresse',
      matchups: [
        { team1: 'Bourg en Bresse', team2: 'Mionnay' },
        { team1: 'Chassieu', team2: 'La Sorelle' },
        { team1: 'Le Clou', team2: '3 Vallons' },
      ],
    },
  ];

  const finals = {
    champe1: { date: '02/03/2025', host: 'Chassieu' },
    champe2: { date: '02/03/2025', host: '3 Vallons' },
  };

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
            </div>
          ))}
          <div className="bg-gradient-to-r from-blue-600 to-blue-700 rounded-lg shadow-sm p-6 text-white">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-lg font-semibold">Finale Champe 1</h3>
                <p className="text-sm text-blue-100">{finals.champe1.date}</p>
              </div>
              <div className="flex items-center space-x-2 bg-white/20 px-3 py-1 rounded-full">
                <MapPin className="w-4 h-4" />
                <span className="text-sm font-medium">{finals.champe1.host}</span>
              </div>
            </div>
            <p className="mt-4 text-sm text-blue-100">
              Finale en foursome à 10 joueurs par équipe
            </p>
          </div>
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
                <div className="flex items-center space-x-2 text-green-600 bg-green-50 px-3 py-1 rounded-full">
                  <MapPin className="w-4 h-4" />
                  <span className="text-sm font-medium">{match.host}</span>
                </div>
              </div>
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
            </div>
          ))}
          <div className="bg-gradient-to-r from-green-600 to-green-700 rounded-lg shadow-sm p-6 text-white">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-lg font-semibold">Finale Champe 2</h3>
                <p className="text-sm text-green-100">{finals.champe2.date}</p>
              </div>
              <div className="flex items-center space-x-2 bg-white/20 px-3 py-1 rounded-full">
                <MapPin className="w-4 h-4" />
                <span className="text-sm font-medium">{finals.champe2.host}</span>
              </div>
            </div>
            <p className="mt-4 text-sm text-green-100">
              Finale en foursome à 10 joueurs par équipe
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}