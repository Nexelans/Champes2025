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
      @page { size: portrait; margin: 8mm; }
      body { margin: 0; }
    }
    body {
      font-family: Arial, sans-serif;
      font-size: 10px;
      line-height: 1.2;
      margin: 10px;
    }
    .header {
      text-align: center;
      margin-bottom: 15px;
      border-bottom: 2px solid #000;
      padding-bottom: 8px;
    }
    .header h1 { margin: 0 0 5px 0; font-size: 18px; }
    .header h2 { margin: 0; font-size: 14px; font-weight: normal; }
    .match-info {
      text-align: center;
      margin-bottom: 12px;
      font-size: 11px;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 8px;
    }
    th, td {
      border: 1px solid #333;
      padding: 4px 2px;
      text-align: center;
      font-size: 9px;
      width: 4.5%;
    }
    th:first-child, td:first-child {
      width: 19%;
    }
    th {
      background-color: #e0e0e0;
      font-weight: bold;
    }
    .player-row {
      text-align: left;
      padding-left: 5px;
      font-weight: bold;
      font-size: 9px;
    }
    .stroke-row {
      background-color: #ffffcc;
      font-weight: bold;
      font-size: 10px;
    }
    .match-separator {
      height: 0;
      border: none;
    }
    .cut-line {
      border: none;
      height: 20px;
      text-align: center;
      vertical-align: middle;
      font-size: 16px;
      color: #999;
      position: relative;
    }
    .cut-line::before {
      content: '';
      position: absolute;
      left: 0;
      right: 0;
      top: 50%;
      border-top: 1px dashed #999;
      z-index: 0;
    }
    .cut-line span {
      background: white;
      padding: 0 10px;
      position: relative;
      z-index: 1;
    }
    .footer {
      margin-top: 20px;
      text-align: center;
      font-size: 9px;
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
    <tbody>
      ${matches.map((match, idx) => {
        const player1 = playersMap.get(match.team1_player_id);
        const player2 = playersMap.get(match.team2_player_id);

        if (!player1 || !player2) return '';

        const strokeHoles = match.strokes_receiver === 1
          ? calculateStrokeHoles(strokeIndexes, match.strokes_given)
          : match.strokes_receiver === 2
          ? calculateStrokeHoles(strokeIndexes, match.strokes_given)
          : [];

        return `
      ${idx > 0 ? '<tr><td colspan="20" class="cut-line"><span>✂</span></td></tr>' : ''}
      <tr>
        <th>Trou</th>
        ${Array.from({ length: 18 }, (_, i) => `<th>${i + 1}</th>`).join('')}
        <th>Total</th>
      </tr>
      <tr>
        <td class="player-row">${match.match_order}. ${player1.first_name} ${player1.last_name} (${team1.substring(0, 15)}) - Index ${player1.handicap_index}</td>
        ${Array.from({ length: 18 }, (_, i) => `<td></td>`).join('')}
        <td></td>
      </tr>
      <tr>
        <td class="stroke-row">Coups rendus</td>
        ${Array.from({ length: 18 }, (_, i) => {
          const hasStroke = strokeHoles.includes(i + 1);
          return `<td class="stroke-row">${hasStroke ? '1' : ''}</td>`;
        }).join('')}
        <td class="stroke-row">${match.strokes_given}</td>
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

  <div style="margin-top: 15px; font-size: 9px; color: #666;">
    <p><strong>Instructions :</strong> La ligne centrale indique où le joueur avec le plus petit index reçoit un coup (1 = coup rendu)</p>
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
