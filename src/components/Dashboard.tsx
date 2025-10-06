import { Trophy, Calendar, Users } from 'lucide-react';

export default function Dashboard() {
  const clubs = [
    'Le Clou',
    'Mionnay',
    'La Sorelle',
    'Bourg en Bresse',
    'Chassieu',
    '3 Vallons',
  ];

  const stats = [
    { label: 'Clubs participants', value: '6', icon: Users },
    { label: 'Équipes totales', value: '12', icon: Trophy },
    { label: 'Rencontres jouées', value: '0/5', icon: Calendar },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-bold text-slate-900 mb-4">Vue d'ensemble</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {stats.map((stat) => {
            const Icon = stat.icon;
            return (
              <div
                key={stat.label}
                className="bg-white rounded-lg shadow-sm border border-slate-200 p-6"
              >
                <div className="flex items-center space-x-4">
                  <div className="bg-blue-100 rounded-lg p-3">
                    <Icon className="w-6 h-6 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-sm text-slate-600">{stat.label}</p>
                    <p className="text-2xl font-bold text-slate-900">{stat.value}</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6">
        <h3 className="text-lg font-semibold text-slate-900 mb-4">Clubs participants</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {clubs.map((club) => (
            <div
              key={club}
              className="flex items-center space-x-3 p-4 rounded-lg bg-slate-50 border border-slate-200"
            >
              <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center text-white font-semibold">
                {club.charAt(0)}
              </div>
              <div>
                <p className="font-medium text-slate-900">{club}</p>
                <p className="text-sm text-slate-600">2 équipes</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-blue-900 mb-2">Informations importantes</h3>
        <ul className="space-y-2 text-sm text-blue-800">
          <li>• Champe 1 : Index de 0 à 17.0 (ramené à 17.0 si jusqu'à 18.0)</li>
          <li>• Champe 2 : Index de 17.1 à 30.0 (ramené à 30.0 si jusqu'à 36.0)</li>
          <li>• Les joueurs d'index 17.0-18.0 peuvent jouer dans les deux équipes de leur club</li>
          <li>• 8 joueurs par équipe en rencontre classique, 10 pour la finale</li>
          <li>• Match gagné = 2 points, Match nul = 1 point, Match perdu = 0 point</li>
        </ul>
      </div>
    </div>
  );
}