import { Trophy, TrendingUp } from 'lucide-react';
import { useState } from 'react';

type Standing = {
  position: number;
  team: string;
  played: number;
  won: number;
  drawn: number;
  lost: number;
  points: number;
  awayWins: number;
};

export default function StandingsView() {
  const [selectedDivision, setSelectedDivision] = useState<'champe1' | 'champe2'>('champe1');

  const champe1Standings: Standing[] = [
    {
      position: 1,
      team: 'Chassieu',
      played: 0,
      won: 0,
      drawn: 0,
      lost: 0,
      points: 0,
      awayWins: 0,
    },
    {
      position: 2,
      team: 'Le Clou',
      played: 0,
      won: 0,
      drawn: 0,
      lost: 0,
      points: 0,
      awayWins: 0,
    },
    {
      position: 3,
      team: 'Mionnay',
      played: 0,
      won: 0,
      drawn: 0,
      lost: 0,
      points: 0,
      awayWins: 0,
    },
    {
      position: 4,
      team: 'La Sorelle',
      played: 0,
      won: 0,
      drawn: 0,
      lost: 0,
      points: 0,
      awayWins: 0,
    },
    {
      position: 5,
      team: 'Bourg en Bresse',
      played: 0,
      won: 0,
      drawn: 0,
      lost: 0,
      points: 0,
      awayWins: 0,
    },
    {
      position: 6,
      team: '3 Vallons',
      played: 0,
      won: 0,
      drawn: 0,
      lost: 0,
      points: 0,
      awayWins: 0,
    },
  ];

  const champe2Standings: Standing[] = [
    {
      position: 1,
      team: '3 Vallons',
      played: 0,
      won: 0,
      drawn: 0,
      lost: 0,
      points: 0,
      awayWins: 0,
    },
    {
      position: 2,
      team: 'Chassieu',
      played: 0,
      won: 0,
      drawn: 0,
      lost: 0,
      points: 0,
      awayWins: 0,
    },
    {
      position: 3,
      team: 'Le Clou',
      played: 0,
      won: 0,
      drawn: 0,
      lost: 0,
      points: 0,
      awayWins: 0,
    },
    {
      position: 4,
      team: 'Mionnay',
      played: 0,
      won: 0,
      drawn: 0,
      lost: 0,
      points: 0,
      awayWins: 0,
    },
    {
      position: 5,
      team: 'La Sorelle',
      played: 0,
      won: 0,
      drawn: 0,
      lost: 0,
      points: 0,
      awayWins: 0,
    },
    {
      position: 6,
      team: 'Bourg en Bresse',
      played: 0,
      won: 0,
      drawn: 0,
      lost: 0,
      points: 0,
      awayWins: 0,
    },
  ];

  const standings = selectedDivision === 'champe1' ? champe1Standings : champe2Standings;
  const champion = selectedDivision === 'champe1' ? 'Chassieu' : '3 Vallons';

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-slate-900">Classements</h2>
        <div className="flex space-x-2">
          <button
            onClick={() => setSelectedDivision('champe1')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              selectedDivision === 'champe1'
                ? 'bg-blue-600 text-white'
                : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
            }`}
          >
            Champe 1
          </button>
          <button
            onClick={() => setSelectedDivision('champe2')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              selectedDivision === 'champe2'
                ? 'bg-green-600 text-white'
                : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
            }`}
          >
            Champe 2
          </button>
        </div>
      </div>

      <div className="bg-gradient-to-r from-amber-400 to-amber-500 rounded-lg shadow-sm p-6 text-white">
        <div className="flex items-center space-x-3">
          <Trophy className="w-8 h-8" />
          <div>
            <p className="text-sm font-medium text-amber-100">Champion 2023-2024</p>
            <p className="text-2xl font-bold">{champion}</p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                  Pos
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                  Équipe
                </th>
                <th className="px-6 py-3 text-center text-xs font-semibold text-slate-600 uppercase tracking-wider">
                  J
                </th>
                <th className="px-6 py-3 text-center text-xs font-semibold text-slate-600 uppercase tracking-wider">
                  G
                </th>
                <th className="px-6 py-3 text-center text-xs font-semibold text-slate-600 uppercase tracking-wider">
                  N
                </th>
                <th className="px-6 py-3 text-center text-xs font-semibold text-slate-600 uppercase tracking-wider">
                  P
                </th>
                <th className="px-6 py-3 text-center text-xs font-semibold text-slate-600 uppercase tracking-wider">
                  Pts
                </th>
                <th className="px-6 py-3 text-center text-xs font-semibold text-slate-600 uppercase tracking-wider">
                  V.Ext
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {standings.map((standing, idx) => {
                const isQualifiedForFinal = idx < 2;
                const isPlayoff = idx >= 2 && idx < 6;

                return (
                  <tr
                    key={standing.team}
                    className={`hover:bg-slate-50 transition-colors ${
                      isQualifiedForFinal
                        ? 'bg-green-50'
                        : isPlayoff
                        ? 'bg-blue-50'
                        : ''
                    }`}
                  >
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center space-x-2">
                        <span className="font-semibold text-slate-900">
                          {standing.position}
                        </span>
                        {isQualifiedForFinal && (
                          <TrendingUp className="w-4 h-4 text-green-600" />
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="font-medium text-slate-900">{standing.team}</span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center text-slate-600">
                      {standing.played}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center text-green-600 font-medium">
                      {standing.won}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center text-slate-600">
                      {standing.drawn}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center text-red-600 font-medium">
                      {standing.lost}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      <span className="font-bold text-lg text-slate-900">
                        {standing.points}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center text-slate-600">
                      {standing.awayWins}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
        <h3 className="font-semibold text-slate-900 mb-2">Légende</h3>
        <div className="space-y-1 text-sm text-slate-600">
          <div className="flex items-center space-x-2">
            <div className="w-4 h-4 bg-green-50 border border-green-200 rounded"></div>
            <span>Qualifié pour la finale (1er et 2ème)</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-4 h-4 bg-blue-50 border border-blue-200 rounded"></div>
            <span>Barrage pour les places (3ème-4ème et 5ème-6ème)</span>
          </div>
          <p className="mt-3 text-xs">
            <strong>V.Ext</strong> : Victoires à l'extérieur (critère de départage en cas d'égalité)
          </p>
        </div>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h3 className="font-semibold text-blue-900 mb-2">Système de points</h3>
        <ul className="space-y-1 text-sm text-blue-800">
          <li>• Match gagné : <strong>2 points</strong></li>
          <li>• Match nul : <strong>1 point</strong></li>
          <li>• Match perdu : <strong>0 point</strong></li>
        </ul>
      </div>
    </div>
  );
}