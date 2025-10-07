import { useState } from 'react';
import { BookOpen, Shield, Users, User, ChevronDown, ChevronRight, ExternalLink, HelpCircle } from 'lucide-react';

type UserType = 'admin' | 'captain' | 'player';

interface Section {
  id: string;
  title: string;
  content: string[];
  subsections?: { title: string; content: string[] }[];
}

const adminSections: Section[] = [
  {
    id: 'access',
    title: '📋 Accès au site',
    content: [
      'URL du site : https://0ec90b57d6e95fcbda19832f.supabase.co',
      'Cliquez sur le bouton "Admin" en bas de page (à droite)',
      'Entrez vos identifiants administrateur',
    ]
  },
  {
    id: 'setup',
    title: '🚀 Première configuration',
    subsections: [
      {
        title: '1. Configuration de la saison',
        content: [
          'Allez dans l\'onglet "Configuration"',
          'Sélectionnez la division (Champe 1 ou Champe 2)',
          'Cliquez sur "Nouvelle Saison"',
          'Remplissez : Nom, dates de début/fin, nombre de journées (6)',
        ]
      },
      {
        title: '2. Ajout des clubs',
        content: [
          'Dans l\'onglet "Configuration"',
          'Section "Clubs participants"',
          'Entrez le nom du club et cliquez sur "Ajouter"',
          'Répétez pour tous les clubs',
        ]
      },
      {
        title: '3. Dates des journées',
        content: [
          'Dans l\'onglet "Configuration"',
          'Section "Dates des journées"',
          'Pour chaque journée (1 à 6), sélectionnez et définissez la date',
        ]
      },
      {
        title: '4. Création des capitaines',
        content: [
          'Allez dans l\'onglet "Capitaines"',
          'Cliquez sur "Nouveau Capitaine"',
          'Remplissez : Email, nom, club, division',
          'Le capitaine recevra un email d\'invitation',
        ]
      },
      {
        title: '5. Génération du calendrier',
        content: [
          'Dans l\'onglet "Configuration"',
          'Vérifiez que tous les clubs et dates sont définis',
          'Cliquez sur "Générer le calendrier"',
          'Tous les matchs des 5 premières journées seront créés automatiquement',
        ]
      }
    ]
  },
  {
    id: 'management',
    title: '📅 Gestion en cours de saison',
    subsections: [
      {
        title: 'Validation des configurations',
        content: [
          'Onglet "Validation" : vérifiez que toutes les équipes ont sélectionné leurs joueurs',
          'Statuts : ✅ Validé / ⚠️ En attente',
          'Contactez les capitaines retardataires',
        ]
      },
      {
        title: 'Vérification des équipes',
        content: [
          'Onglet "Équipes" : consultez les joueurs de chaque club',
          'Vérifiez les licences et classements',
        ]
      },
      {
        title: 'Consultation du calendrier',
        content: [
          'Onglet "Calendrier" : vue complète des rencontres',
          'Statuts : 🔵 À venir / 🟢 Terminé / 🔒 Verrouillé',
        ]
      }
    ]
  },
  {
    id: 'finals',
    title: '🏆 Gestion des finales',
    content: [
      'Après la journée 5, les 2 premières équipes sont qualifiées',
      'Le système génère automatiquement 3 matchs : aller, retour, barrage',
      'Les capitaines sélectionnent et saisissent comme d\'habitude',
      'Le système détermine le champion automatiquement',
    ]
  },
  {
    id: 'tips',
    title: '⚠️ Points d\'attention',
    content: [
      '✅ Vérifiez les sélections avant chaque journée',
      '✅ Vérifiez les résultats après chaque journée',
      '✅ Ne partagez jamais vos identifiants',
      '✅ Déconnectez-vous après utilisation',
    ]
  }
];

const captainSections: Section[] = [
  {
    id: 'access',
    title: '📋 Accès au site',
    content: [
      'URL du site : https://0ec90b57d6e95fcbda19832f.supabase.co',
      'Première connexion : Cliquez sur le lien reçu par email pour créer votre mot de passe',
      'Connexions suivantes : Cliquez sur "Connexion Capitaine" en bas de page',
      'Mot de passe oublié : Utilisez le lien "Mot de passe oublié ?" sur la page de connexion',
    ]
  },
  {
    id: 'players',
    title: '👥 Gestion des joueurs',
    subsections: [
      {
        title: 'Ajouter un joueur',
        content: [
          'Onglet "Mes Joueurs" → "Ajouter un joueur"',
          'Remplissez : Prénom, Nom, Licence, Classement',
          'Cliquez sur "Enregistrer"',
        ]
      },
      {
        title: 'Modifier/Supprimer',
        content: [
          'Trouvez le joueur dans la liste',
          'Utilisez les icônes crayon (modifier) ou poubelle (supprimer)',
        ]
      }
    ]
  },
  {
    id: 'selection',
    title: '🎯 Sélection de l\'équipe',
    content: [
      'Onglet "Sélection" : liste des prochains matchs',
      'Cliquez sur "Sélectionner l\'équipe"',
      'Choisissez 4 joueurs et définissez leur ordre (1 à 4)',
      'Validez avant la date limite',
      '⚠️ L\'ordre compte : joueur 1 affronte joueur 1 adverse, etc.',
    ]
  },
  {
    id: 'results',
    title: '📊 Saisie des résultats',
    content: [
      'Après chaque match, allez dans "Résultats"',
      'Sélectionnez le match concerné',
      'Entrez le score de chaque rencontre individuelle (4 matchs)',
      'Format : Nombre de manches gagnées (ex: 3-1)',
      'Le système calcule automatiquement les points',
      'Règles : Victoire (3-4 manches) = 2 pts, Nul (2-2) = 1 pt, Défaite (0-1) = 0 pt',
    ]
  },
  {
    id: 'follow',
    title: '📅 Suivi du championnat',
    content: [
      'Onglet "Calendrier" : toutes les rencontres de la saison',
      'Onglet "Classement" : position et statistiques de votre équipe',
      'Onglet "Rencontres" : résultats détaillés de tous les matchs',
      'Onglet "Équipes" : consultation des joueurs adverses',
      'Bouton "Imprimer PDF" disponible sur le classement',
    ]
  },
  {
    id: 'finals',
    title: '🏆 Les finales',
    content: [
      'Qualification : Les 2 premières équipes après 5 journées',
      'Format : Match aller, match retour, barrage si nécessaire',
      'Même procédure : sélection, match, saisie des résultats',
    ]
  },
  {
    id: 'tips',
    title: '⚠️ À faire absolument',
    content: [
      '✅ Ajoutez tous vos joueurs dès le début',
      '✅ Sélectionnez avant chaque date limite',
      '✅ Saisissez les résultats immédiatement après le match',
      '✅ Prévenez l\'admin en cas de problème',
      '❌ Ne partagez pas vos identifiants',
      '❌ Ne saisissez pas de faux résultats',
    ]
  }
];

const playerSections: Section[] = [
  {
    id: 'access',
    title: '📋 Accès au site',
    content: [
      'URL du site : https://0ec90b57d6e95fcbda19832f.supabase.co',
      '✅ Aucune connexion nécessaire',
      '✅ Toutes les pages sont accessibles directement',
      '✅ Consultez depuis ordinateur, tablette ou smartphone',
    ]
  },
  {
    id: 'follow',
    title: '📅 Suivre le championnat',
    subsections: [
      {
        title: 'Calendrier',
        content: [
          'Onglet "Calendrier" → Sélectionnez votre division',
          'Toutes les rencontres avec dates et lieux',
          'Notez les dates de vos matchs dans votre agenda',
        ]
      },
      {
        title: 'Classement',
        content: [
          'Onglet "Classement" → Position de votre équipe',
          'Points, victoires, nuls, défaites',
          'Classement complet de la division',
          'Bouton "Imprimer PDF" disponible',
        ]
      },
      {
        title: 'Résultats',
        content: [
          'Onglet "Rencontres" → Cliquez sur un match',
          'Joueurs participants, scores détaillés',
          'Points gagnés par chaque équipe',
        ]
      },
      {
        title: 'Équipes',
        content: [
          'Onglet "Équipes" → Tous les clubs et joueurs',
          'Utile pour connaître vos adversaires',
        ]
      }
    ]
  },
  {
    id: 'match',
    title: '🎯 Avant un match',
    content: [
      'Votre capitaine vous contactera pour confirmer',
      'Vérifiez votre sélection dans "Rencontres" → Match à venir',
      'Si sélectionné mais indisponible : prévenez immédiatement',
      'Consultez le classement de votre adversaire',
      '🏓 Apportez votre licence le jour J',
    ]
  },
  {
    id: 'during',
    title: '🏆 Le match',
    content: [
      'Présentez-vous à l\'heure',
      'Ordre : Joueur 1 vs Joueur 1, Joueur 2 vs Joueur 2, etc.',
      'Points : Victoire (3-4 manches) = 2 pts, Nul (2-2) = 1 pt, Défaite (0-1) = 0 pt',
      'Votre capitaine saisira les résultats après',
      'Résultats visibles quelques heures après',
    ]
  },
  {
    id: 'finals',
    title: '🏆 Les finales',
    content: [
      'Qualification : 2 meilleures équipes après 5 journées',
      'Format : Aller, retour, barrage si besoin',
      'Votre capitaine vous informera de votre sélection',
    ]
  },
  {
    id: 'tips',
    title: '💡 Conseils pratiques',
    content: [
      '✅ Consultez le calendrier en début de saison',
      '✅ Enregistrez l\'URL dans vos favoris',
      '✅ Informez rapidement vos indisponibilités',
      '✅ Respectez vos adversaires',
      '🤝 Fair-play : Serrez la main avant/après le match',
      '👏 Félicitez les beaux points',
    ]
  },
  {
    id: 'faq',
    title: '❓ Questions fréquentes',
    content: [
      'Q : Dois-je créer un compte ? R : Non, tout est public',
      'Q : Comment savoir quand je joue ? R : Votre capitaine vous contactera',
      'Q : Résultats en temps réel ? R : Publiés après saisie du capitaine',
      'Q : Site sur mobile ? R : Oui, site responsive',
      'Q : Plus disponible pour un match ? R : Prévenez votre capitaine immédiatement',
    ]
  }
];

export default function HelpPage() {
  const [selectedType, setSelectedType] = useState<UserType>('player');
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(['access']));

  const toggleSection = (sectionId: string) => {
    const newExpanded = new Set(expandedSections);
    if (newExpanded.has(sectionId)) {
      newExpanded.delete(sectionId);
    } else {
      newExpanded.add(sectionId);
    }
    setExpandedSections(newExpanded);
  };

  const sections = selectedType === 'admin' ? adminSections : selectedType === 'captain' ? captainSections : playerSections;

  return (
    <div className="max-w-5xl mx-auto">
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="bg-gradient-to-r from-emerald-600 to-emerald-700 px-8 py-12 text-white">
          <div className="flex items-center gap-3 mb-4">
            <BookOpen className="h-10 w-10" />
            <h1 className="text-3xl font-bold">Centre d'aide</h1>
          </div>
          <p className="text-emerald-50 text-lg">
            Guides complets pour utiliser la plateforme du Championnat Champe
          </p>
        </div>

        <div className="border-b border-slate-200 bg-slate-50">
          <div className="flex gap-2 px-8 py-4">
            <button
              onClick={() => {
                setSelectedType('player');
                setExpandedSections(new Set(['access']));
              }}
              className={`flex items-center gap-2 px-6 py-3 rounded-lg font-medium transition-all ${
                selectedType === 'player'
                  ? 'bg-emerald-600 text-white shadow-md'
                  : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
              }`}
            >
              <User className="h-5 w-5" />
              Guide Joueur
            </button>
            <button
              onClick={() => {
                setSelectedType('captain');
                setExpandedSections(new Set(['access']));
              }}
              className={`flex items-center gap-2 px-6 py-3 rounded-lg font-medium transition-all ${
                selectedType === 'captain'
                  ? 'bg-emerald-600 text-white shadow-md'
                  : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
              }`}
            >
              <Users className="h-5 w-5" />
              Guide Capitaine
            </button>
            <button
              onClick={() => {
                setSelectedType('admin');
                setExpandedSections(new Set(['access']));
              }}
              className={`flex items-center gap-2 px-6 py-3 rounded-lg font-medium transition-all ${
                selectedType === 'admin'
                  ? 'bg-emerald-600 text-white shadow-md'
                  : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
              }`}
            >
              <Shield className="h-5 w-5" />
              Guide Admin
            </button>
          </div>
        </div>

        <div className="p-8">
          <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg flex items-start gap-3">
            <HelpCircle className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
            <div className="text-sm text-blue-900">
              <p className="font-medium mb-1">
                {selectedType === 'admin' && 'Guide pour les administrateurs du championnat'}
                {selectedType === 'captain' && 'Guide pour les capitaines d\'équipe'}
                {selectedType === 'player' && 'Guide pour les joueurs et spectateurs'}
              </p>
              <p className="text-blue-700">
                Cliquez sur les sections pour afficher le contenu détaillé.
              </p>
            </div>
          </div>

          <div className="space-y-3">
            {sections.map((section) => (
              <div key={section.id} className="border border-slate-200 rounded-lg overflow-hidden bg-white">
                <button
                  onClick={() => toggleSection(section.id)}
                  className="w-full px-6 py-4 flex items-center justify-between hover:bg-slate-50 transition-colors"
                >
                  <h2 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
                    {section.title}
                  </h2>
                  {expandedSections.has(section.id) ? (
                    <ChevronDown className="h-5 w-5 text-slate-400" />
                  ) : (
                    <ChevronRight className="h-5 w-5 text-slate-400" />
                  )}
                </button>

                {expandedSections.has(section.id) && (
                  <div className="px-6 pb-6 pt-2 border-t border-slate-100">
                    {section.subsections ? (
                      <div className="space-y-4">
                        {section.subsections.map((subsection, idx) => (
                          <div key={idx} className="bg-slate-50 rounded-lg p-4">
                            <h3 className="font-semibold text-slate-900 mb-2">{subsection.title}</h3>
                            <ul className="space-y-2">
                              {subsection.content.map((item, itemIdx) => (
                                <li key={itemIdx} className="text-slate-700 text-sm flex items-start gap-2">
                                  <span className="text-emerald-600 mt-1 flex-shrink-0">•</span>
                                  <span>{item}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <ul className="space-y-2">
                        {section.content.map((item, idx) => (
                          <li key={idx} className="text-slate-700 flex items-start gap-2">
                            <span className="text-emerald-600 mt-1 flex-shrink-0">•</span>
                            <span>{item}</span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>

          <div className="mt-8 p-6 bg-gradient-to-r from-slate-50 to-slate-100 rounded-lg border border-slate-200">
            <div className="flex items-start gap-3">
              <ExternalLink className="h-5 w-5 text-slate-600 mt-1 flex-shrink-0" />
              <div>
                <h3 className="font-semibold text-slate-900 mb-2">Documentation complète</h3>
                <p className="text-sm text-slate-600 mb-3">
                  Pour consulter les modes opératoires complets au format PDF, téléchargez les documents :
                </p>
                <div className="flex flex-wrap gap-2">
                  <a
                    href="/MODE_OPERATOIRE_JOUEUR.md"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 px-4 py-2 bg-white text-slate-700 rounded-lg hover:bg-slate-50 border border-slate-300 transition-colors text-sm font-medium"
                  >
                    <User className="h-4 w-4" />
                    Mode opératoire Joueur
                  </a>
                  <a
                    href="/MODE_OPERATOIRE_CAPITAINE.md"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 px-4 py-2 bg-white text-slate-700 rounded-lg hover:bg-slate-50 border border-slate-300 transition-colors text-sm font-medium"
                  >
                    <Users className="h-4 w-4" />
                    Mode opératoire Capitaine
                  </a>
                  <a
                    href="/MODE_OPERATOIRE_ADMIN.md"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 px-4 py-2 bg-white text-slate-700 rounded-lg hover:bg-slate-50 border border-slate-300 transition-colors text-sm font-medium"
                  >
                    <Shield className="h-4 w-4" />
                    Mode opératoire Admin
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
