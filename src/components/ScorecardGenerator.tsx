import { Download } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface Player {
  id: string;
  first_name: string;
  last_name: string;
  handicap_index: number;
}

interface IndividualMatch {
  match_order: number;
  team1_player_id: string;
  team2_player_id: string;
  team1_handicap: number;
  team2_handicap: number;
  strokes_given: number;
  strokes_receiver: number | null;
}

interface ScorecardGeneratorProps {
  matchId: string;
  hostClubId: string;
  team1Name: string;
  team2Name: string;
  matchDate: string;
}

export default function ScorecardGenerator({
  matchId,
  hostClubId,
  team1Name,
  team2Name,
  matchDate,
}: ScorecardGeneratorProps) {
  const generateScorecard = async () => {
    try {
      console.log('Generating scorecard for match:', matchId, 'host club:', hostClubId);

      const [{ data: courseHoles, error: holesError }, { data: individualMatches, error: matchesError }, { data: allPlayers, error: playersError }] = await Promise.all([
        supabase
          .from('course_holes')
          .select('hole_number, stroke_index, par')
          .eq('club_id', hostClubId)
          .order('hole_number'),
        supabase
          .from('individual_matches')
          .select('*')
          .eq('match_id', matchId)
          .order('match_order'),
        supabase
          .from('players')
          .select('id, first_name, last_name, handicap_index'),
      ]);

      if (holesError) {
        console.error('Error loading course holes:', holesError);
        alert('Erreur lors du chargement du parcours: ' + holesError.message);
        return;
      }

      if (matchesError) {
        console.error('Error loading individual matches:', matchesError);
        alert('Erreur lors du chargement des rencontres: ' + matchesError.message);
        return;
      }

      if (playersError) {
        console.error('Error loading players:', playersError);
        alert('Erreur lors du chargement des joueurs: ' + playersError.message);
        return;
      }

      console.log('Course holes:', courseHoles);
      console.log('Individual matches:', individualMatches);
      console.log('Players:', allPlayers);

      if (!courseHoles || courseHoles.length === 0) {
        alert('Les données du parcours ne sont pas configurées pour ce club. Veuillez les ajouter dans la section Parcours.');
        return;
      }

      if (!individualMatches || individualMatches.length === 0) {
        alert('Aucun match individuel généré. Veuillez générer les rencontres individuelles d\'abord.');
        return;
      }

      const playersMap = new Map(allPlayers?.map(p => [p.id, p]) || []);

      const html = generateScorecardHTML(
        courseHoles,
        individualMatches as IndividualMatch[],
        playersMap,
        team1Name,
        team2Name,
        matchDate
      );

      console.log('HTML generated, opening window...');

      const printWindow = window.open('', '_blank');
      if (printWindow) {
        printWindow.document.write(html);
        printWindow.document.close();
        printWindow.focus();
        setTimeout(() => {
          printWindow.print();
        }, 250);
      } else {
        alert('Impossible d\'ouvrir la fenêtre popup. Veuillez autoriser les popups pour ce site.');
      }
    } catch (err: any) {
      console.error('Error generating scorecard:', err);
      alert('Erreur lors de la génération de la feuille de score: ' + (err.message || err));
    }
  };

  const calculateStrokeHoles = (strokeIndex: number[], strokesGiven: number): number[] => {
    if (strokesGiven === 0) return [];

    const indexMap = strokeIndex.map((si, idx) => ({ hole: idx + 1, index: si }));
    indexMap.sort((a, b) => a.index - b.index);

    return indexMap.slice(0, strokesGiven).map(item => item.hole);
  };

  const generateScorecardHTML = (
    holes: any[],
    matches: IndividualMatch[],
    playersMap: Map<string, Player>,
    team1: string,
    team2: string,
    date: string
  ) => {
    const strokeIndexes = holes.map(h => h.stroke_index);
    const pars = holes.map(h => h.par);

    const scorecardHTML = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Feuille de Score - ${team1} vs ${team2}</title>
  <style>
    @media print {
      @page { size: landscape; margin: 8mm; }
      body { margin: 0; }
    }
    body {
      font-family: Arial, sans-serif;
      font-size: 8px;
      line-height: 1.1;
      margin: 10px;
    }
    .header {
      text-align: center;
      margin-bottom: 10px;
      border-bottom: 2px solid #000;
      padding-bottom: 5px;
    }
    .header h1 { margin: 0 0 3px 0; font-size: 16px; }
    .header h2 { margin: 0; font-size: 12px; font-weight: normal; }
    .match-info {
      display: flex;
      justify-content: space-between;
      margin-bottom: 8px;
      font-size: 9px;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 3px;
    }
    th, td {
      border: 1px solid #333;
      padding: 2px 1px;
      text-align: center;
      font-size: 7px;
    }
    th {
      background-color: #e0e0e0;
      font-weight: bold;
    }
    .player-row {
      text-align: left;
      padding-left: 3px;
      font-weight: bold;
      font-size: 7px;
    }
    .stroke-row {
      background-color: #ffffcc;
      font-weight: bold;
      font-size: 8px;
    }
    .match-separator {
      height: 8px;
      background-color: #f5f5f5;
    }
    .footer {
      position: fixed;
      bottom: 5mm;
      left: 0;
      right: 0;
      text-align: center;
      font-size: 8px;
      color: #666;
    }
    .footer a {
      color: #059669;
      text-decoration: none;
    }
    .footer a:hover {
      text-decoration: underline;
    }
  </style>
</head>
<body>
  <div class="header">
    <h1>Championnat Champe - Feuille de Score</h1>
    <h2>${team1} vs ${team2}</h2>
  </div>

  <div class="match-info">
    <div><strong>Date:</strong> ${new Date(date).toLocaleDateString('fr-FR')}</div>
  </div>

  <table>
    <thead>
      <tr>
        <th style="width: 120px;">Joueur</th>
        ${Array.from({ length: 18 }, (_, i) => `<th>${i + 1}</th>`).join('')}
        <th>Total</th>
      </tr>
      <tr>
        <th>PAR</th>
        ${pars.map(p => `<th>${p}</th>`).join('')}
        <th>${pars.reduce((a, b) => a + b, 0)}</th>
      </tr>
      <tr>
        <th>SI</th>
        ${strokeIndexes.map(si => `<th>${si}</th>`).join('')}
        <th></th>
      </tr>
    </thead>
    <tbody>
      ${matches.map((match, idx) => {
        const player1 = playersMap.get(match.team1_player_id);
        const player2 = playersMap.get(match.team2_player_id);

        if (!player1 || !player2) return '';

        const strokeHolesTeam1 = match.strokes_receiver === 1
          ? calculateStrokeHoles(strokeIndexes, match.strokes_given)
          : [];
        const strokeHolesTeam2 = match.strokes_receiver === 2
          ? calculateStrokeHoles(strokeIndexes, match.strokes_given)
          : [];

        return `
      ${idx > 0 ? '<tr class="match-separator"><td colspan="21"></td></tr>' : ''}
      <tr>
        <td class="player-row">${match.match_order}. ${player1.first_name} ${player1.last_name} (${team1.substring(0, 15)}) - Index ${player1.handicap_index}</td>
        ${Array.from({ length: 18 }, (_, i) => `<td></td>`).join('')}
        <td></td>
      </tr>
      <tr>
        <td class="stroke-row">Coups rendus</td>
        ${Array.from({ length: 18 }, (_, i) => {
          const hasStroke1 = strokeHolesTeam1.includes(i + 1);
          const hasStroke2 = strokeHolesTeam2.includes(i + 1);
          return `<td class="stroke-row">${hasStroke1 ? '1' : hasStroke2 ? '2' : '0'}</td>`;
        }).join('')}
        <td class="stroke-row">${match.strokes_given > 0 ? match.strokes_receiver : ''}</td>
      </tr>
      <tr>
        <td class="player-row">${match.match_order}. ${player2.first_name} ${player2.last_name} (${team2.substring(0, 15)}) - Index ${player2.handicap_index}</td>
        ${Array.from({ length: 18 }, (_, i) => `<td></td>`).join('')}
        <td></td>
      </tr>
        `;
      }).join('')}
    </tbody>
  </table>

  <div style="margin-top: 10px; font-size: 8px; color: #666;">
    <p><strong>Instructions :</strong> La ligne centrale indique les coups rendus : 1 = coup pour joueur 1, 2 = coup pour joueur 2, 0 = pas de coup</p>
  </div>

  <div class="footer">
    2025, site réalisé par <a href="https://nexelans.fr" target="_blank">Nexelans</a>
  </div>
</body>
</html>`;

    return scorecardHTML;
  };

  return (
    <button
      onClick={generateScorecard}
      className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
    >
      <Download className="w-4 h-4" />
      Télécharger les feuilles de score
    </button>
  );
}
