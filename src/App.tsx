import { useEffect, useState } from 'react';
import { Trophy, Calendar, Users, Award, Settings, CircleUser as UserCircle, LogOut, Shield, ClipboardList, Swords, CreditCard as Edit3, LogIn } from 'lucide-react';
import { useAuth } from './contexts/AuthContext';
import LoginForm from './components/Auth/LoginForm';
import CreateAdmin from './components/Admin/CreateAdmin';
import TeamManagement from './components/Admin/TeamManagement';
import ConfigurationValidation from './components/Admin/ConfigurationValidation';
import Dashboard from './components/Dashboard';
import CalendarView from './components/CalendarView';
import Teams from './components/Teams';
import Standings from './components/Standings';
import SeasonSetup from './components/SeasonSetup';
import ProfileManagement from './components/Captain/ProfileManagement';
import PlayersManagement from './components/Captain/PlayersManagement';
import TeamSelection from './components/Captain/TeamSelection';
import MatchesView from './components/MatchesView';
import ResultsEntry from './components/ResultsEntry';

type Tab = 'dashboard' | 'calendar' | 'teams' | 'standings' | 'matches' | 'setup' | 'profile' | 'players' | 'team-management' | 'validation' | 'selection' | 'results';

function App() {
  const { user, captain, isAdmin, loading: authLoading, signOut } = useAuth();
  const [activeTab, setActiveTab] = useState<Tab>('dashboard');
  const [division, setDivision] = useState<'champe1' | 'champe2'>('champe1');
  const [loading, setLoading] = useState(true);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [loginType, setLoginType] = useState<'captain' | 'admin'>('captain');

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
    { id: 'matches' as Tab, label: 'Rencontres', icon: Swords },
    { id: 'standings' as Tab, label: 'Classement', icon: Award },
    { id: 'teams' as Tab, label: 'Équipes', icon: Users },
  ];

  const captainTabs = [
    ...publicTabs,
    { id: 'profile' as Tab, label: 'Mon Profil', icon: UserCircle },
    { id: 'players' as Tab, label: 'Mes Joueurs', icon: Users },
    { id: 'selection' as Tab, label: 'Sélection', icon: ClipboardList },
    { id: 'results' as Tab, label: 'Résultats', icon: Edit3 },
  ];

  const adminTabs = [
    ...publicTabs,
    { id: 'team-management' as Tab, label: 'Capitaines', icon: Users },
    { id: 'setup' as Tab, label: 'Configuration', icon: Settings },
    { id: 'validation' as Tab, label: 'Validation', icon: Shield },
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

  const params = new URLSearchParams(window.location.search);
  if (params.get('setup') === 'admin') {
    return <CreateAdmin />;
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
              {['calendar', 'matches', 'standings', 'teams', 'setup'].includes(activeTab) && (
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
                <div className="flex items-center gap-3">
                  <div className="text-sm text-slate-600">
                    {isAdmin && (
                      <span className="inline-flex items-center gap-1 px-2 py-1 bg-emerald-100 text-emerald-700 rounded-md font-medium">
                        <Shield className="h-3 w-3" />
                        Admin
                      </span>
                    )}
                    {captain && !isAdmin && (
                      <span className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-700 rounded-md font-medium">
                        <UserCircle className="h-3 w-3" />
                        Capitaine
                      </span>
                    )}
                  </div>
                  <button
                    onClick={signOut}
                    className="flex items-center gap-2 px-4 py-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors"
                  >
                    <LogOut className="h-4 w-4" />
                    <span className="text-sm font-medium">Déconnexion</span>
                  </button>
                </div>
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

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 pb-24">
        {activeTab === 'dashboard' && <Dashboard />}
        {activeTab === 'calendar' && <CalendarView division={division} />}
        {activeTab === 'matches' && <MatchesView division={division} />}
        {activeTab === 'standings' && <Standings division={division} />}
        {activeTab === 'teams' && <Teams division={division} />}
        {activeTab === 'profile' && <ProfileManagement />}
        {activeTab === 'players' && <PlayersManagement />}
        {activeTab === 'selection' && captain && <TeamSelection captain={captain} />}
        {activeTab === 'results' && <ResultsEntry />}
        {activeTab === 'team-management' && <TeamManagement />}
        {activeTab === 'validation' && <ConfigurationValidation />}
        {activeTab === 'setup' && <SeasonSetup division={division} />}
      </main>

      {!user && (
        <footer className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 shadow-lg">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
            <div className="flex items-center justify-center gap-4">
              <button
                onClick={() => {
                  setLoginType('captain');
                  setShowLoginModal(true);
                }}
                className="flex items-center gap-2 px-6 py-2.5 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors shadow-sm"
              >
                <LogIn className="h-4 w-4" />
                <span className="font-medium">Connexion Capitaine</span>
              </button>
              <button
                onClick={() => {
                  setLoginType('admin');
                  setShowLoginModal(true);
                }}
                className="flex items-center gap-2 px-4 py-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors text-sm"
              >
                <Shield className="h-4 w-4" />
                <span>Admin</span>
              </button>
            </div>
          </div>
        </footer>
      )}

      {showLoginModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                  {loginType === 'admin' ? (
                    <>
                      <Shield className="h-6 w-6 text-emerald-600" />
                      Connexion Admin
                    </>
                  ) : (
                    <>
                      <UserCircle className="h-6 w-6 text-emerald-600" />
                      Connexion Capitaine
                    </>
                  )}
                </h2>
                <button
                  onClick={() => setShowLoginModal(false)}
                  className="text-slate-400 hover:text-slate-600 transition-colors"
                >
                  <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <LoginForm onClose={() => setShowLoginModal(false)} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
