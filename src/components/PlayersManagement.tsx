import { useState } from 'react';
import { Search, UserPlus, CreditCard as Edit2, Trash2 } from 'lucide-react';

type Player = {
  id: string;
  firstName: string;
  lastName: string;
  club: string;
  index: number;
  eligibility: string;
  license: string;
};

export default function PlayersManagement() {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedClub, setSelectedClub] = useState<string>('all');
  const [showAddModal, setShowAddModal] = useState(false);

  const clubs = [
    'Le Clou',
    'Mionnay',
    'La Sorelle',
    'Bourg en Bresse',
    'Chassieu',
    '3 Vallons',
  ];

  const samplePlayers: Player[] = [
    {
      id: '1',
      firstName: 'Jean',
      lastName: 'Dupont',
      club: 'Le Clou',
      index: 12.5,
      eligibility: 'Champe 1 uniquement',
      license: 'L12345',
    },
    {
      id: '2',
      firstName: 'Marie',
      lastName: 'Martin',
      club: 'Chassieu',
      index: 17.5,
      eligibility: 'Champe 1 et 2',
      license: 'L23456',
    },
    {
      id: '3',
      firstName: 'Pierre',
      lastName: 'Durand',
      club: 'Mionnay',
      index: 24.0,
      eligibility: 'Champe 2 uniquement',
      license: 'L34567',
    },
  ];

  const getEligibility = (index: number): string => {
    if (index < 17.0) return 'Champe 1 uniquement';
    if (index >= 17.0 && index <= 18.0) return 'Champe 1 et 2';
    return 'Champe 2 uniquement';
  };

  const getEligibilityColor = (eligibility: string): string => {
    if (eligibility === 'Champe 1 uniquement') return 'bg-blue-100 text-blue-800';
    if (eligibility === 'Champe 1 et 2') return 'bg-amber-100 text-amber-800';
    return 'bg-green-100 text-green-800';
  };

  const filteredPlayers = samplePlayers.filter((player) => {
    const matchesSearch =
      player.firstName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      player.lastName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      player.license.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesClub = selectedClub === 'all' || player.club === selectedClub;
    return matchesSearch && matchesClub;
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-slate-900">Gestion des joueurs</h2>
        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <UserPlus className="w-4 h-4" />
          <span>Ajouter un joueur</span>
        </button>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input
              type="text"
              placeholder="Rechercher un joueur..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <select
            value={selectedClub}
            onChange={(e) => setSelectedClub(e.target.value)}
            className="px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="all">Tous les clubs</option>
            {clubs.map((club) => (
              <option key={club} value={club}>
                {club}
              </option>
            ))}
          </select>
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
          <h3 className="font-semibold text-blue-900 mb-2">Règles d'éligibilité</h3>
          <div className="space-y-1 text-sm text-blue-800">
            <p>• <strong>Index 0 - 16.9</strong> : Champe 1 uniquement</p>
            <p>• <strong>Index 17.0 - 18.0</strong> : Champe 1 et exceptionnellement Champe 2 (même club)</p>
            <p>• <strong>Index 17.1 - 30.0+</strong> : Champe 2 uniquement</p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                  Nom
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                  Prénom
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                  Club
                </th>
                <th className="px-6 py-3 text-center text-xs font-semibold text-slate-600 uppercase tracking-wider">
                  Index
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                  Éligibilité
                </th>
                <th className="px-6 py-3 text-center text-xs font-semibold text-slate-600 uppercase tracking-wider">
                  Licence
                </th>
                <th className="px-6 py-3 text-right text-xs font-semibold text-slate-600 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {filteredPlayers.map((player) => (
                <tr key={player.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="font-medium text-slate-900">{player.lastName}</span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-slate-600">
                    {player.firstName}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-slate-600">
                    {player.club}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-center">
                    <span className="font-semibold text-slate-900">{player.index}</span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      className={`px-2 py-1 text-xs font-medium rounded-full ${getEligibilityColor(
                        player.eligibility
                      )}`}
                    >
                      {player.eligibility}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-center text-sm text-slate-600">
                    {player.license}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right">
                    <div className="flex items-center justify-end space-x-2">
                      <button className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors">
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {filteredPlayers.length === 0 && (
            <div className="text-center py-12">
              <p className="text-slate-500">Aucun joueur trouvé</p>
            </div>
          )}
        </div>
      </div>

      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <h3 className="text-xl font-bold text-slate-900 mb-4">Ajouter un joueur</h3>

            <form className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Prénom
                </label>
                <input
                  type="text"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Prénom du joueur"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Nom
                </label>
                <input
                  type="text"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Nom du joueur"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Club
                </label>
                <select className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                  <option value="">Sélectionnez un club</option>
                  {clubs.map((club) => (
                    <option key={club} value={club}>
                      {club}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Index
                </label>
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  max="54"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="12.5"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Numéro de licence
                </label>
                <input
                  type="text"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="L12345"
                />
              </div>

              <div className="flex justify-end space-x-3 mt-6">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Ajouter
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}