import { useEffect, useState } from 'react';
import { Trophy, Calendar, Users, Award, Settings, CircleUser as UserCircle, LogOut } from 'lucide-react';
import { useAuth } from './contexts/AuthContext';
import LoginForm from './components/Auth/LoginForm';
import CreateAdmin from './components/Admin/CreateAdmin';
import TeamManagement from './components/Admin/TeamManagement';
import Dashboard from './components/Dashboard';
import CalendarView from './components/CalendarView';
import Teams from './components/Teams';
import Standings from './components/Standings';
import SeasonSetup from './components/SeasonSetup';
import ProfileManagement from './components/Captain/ProfileManagement';
import PlayersManagement from './components/Captain/PlayersManagement';

type Tab = 'dashboard' | 'calendar' | 'teams' | 'standings' | 'setup' | 'profile' | 'players' | 'team-management';

function App() {
  const { user, captain, isAdmin, loading: authLoading, signOut } = useAuth();
  const [activeTab, setActiveTab] = useState<Tab>('dashboard');
  const [division, setDivision] = useState<'champe1' | 'champe2'>('champe1');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authLoading) {
      setTimeout(() => setLoading(false), 500);
    }
  }, [authLoading]);

  useEffect(() => {
    if (captain) {
      setDivision(captain.division);
    }
  }, [captain]);

  const publicTabs = [
    { id: 'dashboard' as Tab, label: 'Tableau de Bord', icon: Trophy },
    { id: 'calendar' as Tab, label: 'Calendrier', icon: Calendar },
    { id: 'standings' as Tab, label: 'Classement', icon: Award },
    { id: 'teams' as Tab, label: 'Équipes', icon: Users },
  ];

  const captainTabs = [
    ...publicTabs,
    { id: 'profile' as Tab, label: 'Mon Profil', icon: UserCircle },
    { id: 'players' as Tab, label: 'Mes Joueurs', icon: Users },
    { id: 'setup' as Tab, label: 'Configuration', icon: Settings },
  ];

  const adminTabs = [
    ...publicTabs,
    { id: 'team-management' as Tab, label: 'Capitaines', icon: Users },
    { id: 'setup' as Tab, label: 'Configuration', icon: Settings },
  ];

  const tabs = isAdmin ? adminTabs : (user ? captainTabs : publicTabs);

  if (loading || authLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-emerald-600 mx-auto mb-4"></div>
          <p className="text-slate-600">Chargement...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    const params = new URLSearchParams(window.location.search);
    if (params.get('setup') === 'admin') {
      return <CreateAdmin />;
    }
    return <LoginForm />;
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white shadow-sm border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Trophy className="h-8 w-8 text-emerald-600" />
              <div>
                <h1 className="text-2xl font-bold text-slate-900">
                  Championnat Champe
                </h1>
                <p className="text-sm text-slate-600">
                  Saison 2024-2025
                  {captain && ` • ${captain.club_name}`}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-4">
              {['calendar', 'standings', 'teams'].includes(activeTab) && (
                <div className="flex gap-2 bg-slate-100 p-1 rounded-lg">
                  <button
                    onClick={() => setDivision('champe1')}
                    className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                      division === 'champe1'
                        ? 'bg-white text-emerald-700 shadow-sm'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Champe 1
                  </button>
                  <button
                    onClick={() => setDivision('champe2')}
                    className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                      division === 'champe2'
                        ? 'bg-white text-emerald-700 shadow-sm'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Champe 2
                  </button>
                </div>
              )}

              {user && (
                <button
                  onClick={signOut}
                  className="flex items-center gap-2 px-4 py-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors"
                >
                  <LogOut className="h-4 w-4" />
                  <span className="text-sm font-medium">Déconnexion</span>
                </button>
              )}
            </div>
          </div>

          <nav className="mt-6 flex gap-1" role="tablist">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all ${
                    activeTab === tab.id
                      ? 'bg-emerald-50 text-emerald-700 shadow-sm'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                  }`}
                  role="tab"
                  aria-selected={activeTab === tab.id}
                >
                  <Icon className="h-4 w-4" />
                  {tab.label}
                </button>
              );
            })}
          </nav>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {activeTab === 'dashboard' && <Dashboard />}
        {activeTab === 'calendar' && <CalendarView division={division} />}
        {activeTab === 'standings' && <Standings division={division} />}
        {activeTab === 'teams' && <Teams division={division} />}
        {activeTab === 'profile' && <ProfileManagement />}
        {activeTab === 'players' && <PlayersManagement />}
        {activeTab === 'team-management' && <TeamManagement />}
        {activeTab === 'setup' && <SeasonSetup division={division} />}
      </main>
    </div>
  );
}

export default App;
