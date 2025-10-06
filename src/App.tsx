import { useState } from 'react';
import { Calendar, Trophy, Users, BarChart3, PlusCircle } from 'lucide-react';
import Dashboard from './components/Dashboard';
import CalendarView from './components/CalendarView';
import StandingsView from './components/StandingsView';
import ResultsEntry from './components/ResultsEntry';
import PlayersManagement from './components/PlayersManagement';

type View = 'dashboard' | 'calendar' | 'standings' | 'results' | 'players';

function App() {
  const [currentView, setCurrentView] = useState<View>('dashboard');

  const navigation = [
    { id: 'dashboard' as View, name: 'Tableau de bord', icon: BarChart3 },
    { id: 'calendar' as View, name: 'Calendrier', icon: Calendar },
    { id: 'standings' as View, name: 'Classements', icon: Trophy },
    { id: 'results' as View, name: 'Saisir résultats', icon: PlusCircle },
    { id: 'players' as View, name: 'Joueurs', icon: Users },
  ];

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white shadow-sm border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-slate-900">Champe 2024-2025</h1>
              <p className="text-sm text-slate-600 mt-1">Championnat Hivernal Amical Match Play par Équipe</p>
            </div>
          </div>
        </div>
      </header>

      <nav className="bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex space-x-8">
            {navigation.map((item) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.id}
                  onClick={() => setCurrentView(item.id)}
                  className={`flex items-center space-x-2 px-3 py-4 border-b-2 transition-colors ${
                    currentView === item.id
                      ? 'border-blue-600 text-blue-600'
                      : 'border-transparent text-slate-600 hover:text-slate-900 hover:border-slate-300'
                  }`}
                >
                  <Icon className="w-5 h-5" />
                  <span className="font-medium">{item.name}</span>
                </button>
              );
            })}
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {currentView === 'dashboard' && <Dashboard />}
        {currentView === 'calendar' && <CalendarView />}
        {currentView === 'standings' && <StandingsView />}
        {currentView === 'results' && <ResultsEntry />}
        {currentView === 'players' && <PlayersManagement />}
      </main>
    </div>
  );
}

export default App;