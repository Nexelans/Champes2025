import { useState } from 'react';
import { Building2, Users, Settings, Edit, MapPin, Shield, Database, ClipboardList } from 'lucide-react';
import ClubManagement from './ClubManagement';
import TeamManagement from './TeamManagement';
import ConfigurationValidation from './ConfigurationValidation';
import CalendarEditor from './CalendarEditor';
import CourseManagement from './CourseManagement';
import DatabaseBackup from './DatabaseBackup';
import ResultsEntry from '../ResultsEntry';

type AdminSection = 'clubs' | 'captains' | 'calendar' | 'courses' | 'validation' | 'backup' | 'results';

interface AdminPanelProps {
  division: 'champe1' | 'champe2';
}

export default function AdminPanel({ division }: AdminPanelProps) {
  const [activeSection, setActiveSection] = useState<AdminSection>('clubs');

  const sections = [
    { id: 'clubs' as AdminSection, label: 'Clubs', icon: Building2 },
    { id: 'captains' as AdminSection, label: 'Capitaines', icon: Users },
    { id: 'calendar' as AdminSection, label: 'Calendrier', icon: Edit },
    { id: 'courses' as AdminSection, label: 'Parcours', icon: MapPin },
    { id: 'results' as AdminSection, label: 'Résultats', icon: ClipboardList },
    { id: 'validation' as AdminSection, label: 'Validation', icon: Shield },
    { id: 'backup' as AdminSection, label: 'Sauvegarde', icon: Database },
  ];

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow-sm border border-slate-200">
        <div className="border-b border-slate-200 p-4">
          <h2 className="text-xl font-bold text-slate-900">Administration</h2>
          <p className="text-sm text-slate-600 mt-1">Gestion de la plateforme</p>
        </div>

        <div className="flex flex-wrap gap-2 p-4 border-b border-slate-200 bg-slate-50">
          {sections.map((section) => {
            const Icon = section.icon;
            return (
              <button
                key={section.id}
                onClick={() => setActiveSection(section.id)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  activeSection === section.id
                    ? 'bg-emerald-600 text-white shadow-sm'
                    : 'bg-white text-slate-600 hover:text-slate-900 hover:bg-slate-100 border border-slate-200'
                }`}
              >
                <Icon className="h-4 w-4" />
                {section.label}
              </button>
            );
          })}
        </div>

        <div className="p-6">
          {activeSection === 'clubs' && <ClubManagement />}
          {activeSection === 'captains' && <TeamManagement />}
          {activeSection === 'calendar' && <CalendarEditor division={division} />}
          {activeSection === 'courses' && <CourseManagement />}
          {activeSection === 'results' && <ResultsEntry />}
          {activeSection === 'validation' && <ConfigurationValidation />}
          {activeSection === 'backup' && <DatabaseBackup />}
        </div>
      </div>
    </div>
  );
}
