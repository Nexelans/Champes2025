import { useState } from 'react';
import { Save, AlertCircle } from 'lucide-react';

type MatchResult = 'win' | 'draw' | 'loss' | null;

export default function ResultsEntry() {
  const [selectedDivision, setSelectedDivision] = useState<'champe1' | 'champe2'>('champe1');
  const [selectedRound, setSelectedRound] = useState<number>(1);
  const [selectedMatch, setSelectedMatch] = useState<string>('');
  const [results, setResults] = useState<Record<number, MatchResult>>({});
  const [saved, setSaved] = useState(false);

  const rounds = [
    { id: 1, date: '17/11/2024' },
    { id: 2, date: '01/12/2024' },
    { id: 3, date: '15/12/2024' },
    { id: 4, date: '19/01/2025' },
    { id: 5, date: '09/02/2025' },
  ];

  const matchesPerRound: Record<string, Array<{ id: string; team1: string; team2: string }>> = {
    'champe1-1': [
      { id: 'm1', team1: 'La Sorelle', team2: 'Mionnay' },
      { id: 'm2', team1: '3 Vallons', team2: 'Le Clou' },
      { id: 'm3', team1: 'Bourg en Bresse', team2: 'Chassieu' },
    ],
    'champe2-1': [
      { id: 'm1', team1: 'La Sorelle', team2: 'Le Clou' },
      { id: 'm2', team1: 'Mionnay', team2: '3 Vallons' },
      { id: 'm3', team1: 'Chassieu', team2: 'Bourg en Bresse' },
    ],
  };

  const matches = matchesPerRound[`${selectedDivision}-${selectedRound}`] || [];

  const handleResultChange = (position: number, result: MatchResult) => {
    setResults((prev) => ({
      ...prev,
      [position]: result,
    }));
  };

  const handleSave = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  const getTeam1Name = () => {
    const match = matches.find((m) => m.id === selectedMatch);
    return match?.team1 || 'Équipe 1';
  };

  const getTeam2Name = () => {
    const match = matches.find((m) => m.id === selectedMatch);
    return match?.team2 || 'Équipe 2';
  };

  const calculateMatchScore = () => {
    let team1Points = 0;
    let team2Points = 0;

    Object.values(results).forEach((result) => {
      if (result === 'win') team1Points += 2;
      else if (result === 'draw') {
        team1Points += 1;
        team2Points += 1;
      } else if (result === 'loss') team2Points += 2;
    });

    return { team1Points, team2Points };
  };

  const score = calculateMatchScore();
  const filledResults = Object.values(results).filter((r) => r !== null).length;
  const totalMatches = 24;

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-slate-900">Saisie des résultats</h2>

      <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Division
            </label>
            <select
              value={selectedDivision}
              onChange={(e) => {
                setSelectedDivision(e.target.value as 'champe1' | 'champe2');
                setSelectedMatch('');
                setResults({});
              }}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="champe1">Champe 1</option>
              <option value="champe2">Champe 2</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Journée
            </label>
            <select
              value={selectedRound}
              onChange={(e) => {
                setSelectedRound(Number(e.target.value));
                setSelectedMatch('');
                setResults({});
              }}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              {rounds.map((round) => (
                <option key={round.id} value={round.id}>
                  Journée {round.id} - {round.date}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Rencontre
            </label>
            <select
              value={selectedMatch}
              onChange={(e) => {
                setSelectedMatch(e.target.value);
                setResults({});
              }}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">Sélectionnez une rencontre</option>
              {matches.map((match) => (
                <option key={match.id} value={match.id}>
                  {match.team1} vs {match.team2}
                </option>
              ))}
            </select>
          </div>
        </div>

        {selectedMatch && (
          <>
            <div className="bg-slate-50 rounded-lg p-4">
              <div className="flex items-center justify-between mb-4">
                <div className="text-center flex-1">
                  <p className="text-sm text-slate-600 mb-1">Équipe domicile</p>
                  <p className="text-xl font-bold text-slate-900">{getTeam1Name()}</p>
                </div>
                <div className="text-center px-8">
                  <p className="text-3xl font-bold text-blue-600">
                    {score.team1Points} - {score.team2Points}
                  </p>
                  <p className="text-xs text-slate-500 mt-1">
                    {filledResults} / {totalMatches} matchs
                  </p>
                </div>
                <div className="text-center flex-1">
                  <p className="text-sm text-slate-600 mb-1">Équipe extérieur</p>
                  <p className="text-xl font-bold text-slate-900">{getTeam2Name()}</p>
                </div>
              </div>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex items-start space-x-2">
              <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-blue-800">
                <p className="font-medium mb-1">Instructions</p>
                <p>
                  Saisissez le résultat de chaque match individuel. Un match gagné rapporte 2 points,
                  un match nul 1 point, et un match perdu 0 point.
                </p>
              </div>
            </div>

            <div className="space-y-2">
              <h3 className="font-semibold text-slate-900">Résultats individuels</h3>
              <div className="grid grid-cols-1 gap-2 max-h-96 overflow-y-auto">
                {Array.from({ length: totalMatches }, (_, i) => i + 1).map((position) => (
                  <div
                    key={position}
                    className="flex items-center justify-between p-3 bg-white border border-slate-200 rounded-lg"
                  >
                    <span className="text-sm font-medium text-slate-700 w-24">
                      Match {position}
                    </span>
                    <div className="flex space-x-2">
                      <button
                        onClick={() => handleResultChange(position, 'win')}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                          results[position] === 'win'
                            ? 'bg-green-600 text-white'
                            : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                        }`}
                      >
                        {getTeam1Name()} gagne
                      </button>
                      <button
                        onClick={() => handleResultChange(position, 'draw')}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                          results[position] === 'draw'
                            ? 'bg-amber-500 text-white'
                            : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                        }`}
                      >
                        Match nul
                      </button>
                      <button
                        onClick={() => handleResultChange(position, 'loss')}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                          results[position] === 'loss'
                            ? 'bg-blue-600 text-white'
                            : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                        }`}
                      >
                        {getTeam2Name()} gagne
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setResults({})}
                className="px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors"
              >
                Réinitialiser
              </button>
              <button
                onClick={handleSave}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-2"
              >
                <Save className="w-4 h-4" />
                <span>Enregistrer les résultats</span>
              </button>
            </div>

            {saved && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-green-800 text-center">
                Résultats enregistrés avec succès !
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}