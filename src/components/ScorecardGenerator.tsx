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
      const [{ data: courseHoles }, { data: individualMatches }, { data: allPlayers }] = await Promise.all([
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

      const printWindow = window.open('', '_blank');
      if (printWindow) {
        printWindow.document.write(html);
        printWindow.document.close();
        printWindow.focus();
        setTimeout(() => {
          printWindow.print();
        }, 250);
      }
    } catch (err) {
      console.error('Error generating scorecard:', err);
      alert('Erreur lors de la génération de la feuille de score');
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

    let scorecardHTML = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Feuille de Score - ${team1} vs ${team2}</title>
  <style>
    @media print {
      @page { size: landscape; margin: 10mm; }
      body { margin: 0; }
    }
    body {
      font-family: Arial, sans-serif;
      font-size: 10px;
      line-height: 1.2;
      margin: 20px;
    }
    .page-break { page-break-after: always; }
    .header {
      text-align: center;
      margin-bottom: 15px;
      border-bottom: 2px solid #000;
      padding-bottom: 10px;
    }
    .header h1 { margin: 0 0 5px 0; font-size: 18px; }
    .header h2 { margin: 0; font-size: 14px; font-weight: normal; }
    .match-info {
      display: flex;
      justify-content: space-between;
      margin-bottom: 10px;
      font-size: 11px;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 20px;
    }
    th, td {
      border: 1px solid #333;
      padding: 4px 2px;
      text-align: center;
    }
    th {
      background-color: #e0e0e0;
      font-weight: bold;
      font-size: 9px;
    }
    .player-name {
      text-align: left;
      padding-left: 5px;
      font-weight: bold;
    }
    .stroke-hole {
      background-color: #ffffcc;
      font-weight: bold;
    }
    .totals {
      background-color: #f0f0f0;
      font-weight: bold;
    }
    .signature {
      margin-top: 20px;
      display: flex;
      justify-content: space-around;
    }
    .signature div {
      text-align: center;
    }
    .sig-line {
      border-top: 1px solid #000;
      width: 200px;
      margin-top: 30px;
    }
  </style>
</head>
<body>`;

    matches.forEach((match, idx) => {
      const player1 = playersMap.get(match.team1_player_id);
      const player2 = playersMap.get(match.team2_player_id);

      if (!player1 || !player2) return;

      const strokeHolesTeam1 = match.strokes_receiver === 1
        ? calculateStrokeHoles(strokeIndexes, match.strokes_given)
        : [];
      const strokeHolesTeam2 = match.strokes_receiver === 2
        ? calculateStrokeHoles(strokeIndexes, match.strokes_given)
        : [];

      scorecardHTML += `
  <div class="${idx < matches.length - 1 ? 'page-break' : ''}">
    <div class="header">
      <h1>Championnat Champe - Feuille de Score</h1>
      <h2>${team1} vs ${team2}</h2>
    </div>

    <div class="match-info">
      <div><strong>Match ${match.match_order}</strong></div>
      <div><strong>Date:</strong> ${new Date(date).toLocaleDateString('fr-FR')}</div>
    </div>

    <table>
      <thead>
        <tr>
          <th rowspan="2">Trou</th>
          <th colspan="9">ALLER</th>
          <th rowspan="2">Total</th>
          <th colspan="9">RETOUR</th>
          <th rowspan="2">Total</th>
          <th rowspan="2">Score</th>
        </tr>
        <tr>
          ${Array.from({ length: 9 }, (_, i) => `<th>${i + 1}</th>`).join('')}
          ${Array.from({ length: 9 }, (_, i) => `<th>${i + 10}</th>`).join('')}
        </tr>
      </thead>
      <tbody>
        <tr>
          <td><strong>Par</strong></td>
          ${pars.slice(0, 9).map(p => `<td>${p}</td>`).join('')}
          <td class="totals">${pars.slice(0, 9).reduce((a, b) => a + b, 0)}</td>
          ${pars.slice(9, 18).map(p => `<td>${p}</td>`).join('')}
          <td class="totals">${pars.slice(9, 18).reduce((a, b) => a + b, 0)}</td>
          <td class="totals">${pars.reduce((a, b) => a + b, 0)}</td>
        </tr>
        <tr>
          <td><strong>SI</strong></td>
          ${strokeIndexes.slice(0, 9).map(si => `<td style="font-size: 8px;">${si}</td>`).join('')}
          <td></td>
          ${strokeIndexes.slice(9, 18).map(si => `<td style="font-size: 8px;">${si}</td>`).join('')}
          <td></td>
          <td></td>
        </tr>
        <tr>
          <td class="player-name">${player1.first_name} ${player1.last_name}</td>
          ${Array.from({ length: 9 }, (_, i) => {
            const isStrokeHole = strokeHolesTeam1.includes(i + 1);
            return `<td class="${isStrokeHole ? 'stroke-hole' : ''}">${isStrokeHole ? '●' : ''}</td>`;
          }).join('')}
          <td class="totals"></td>
          ${Array.from({ length: 9 }, (_, i) => {
            const isStrokeHole = strokeHolesTeam1.includes(i + 10);
            return `<td class="${isStrokeHole ? 'stroke-hole' : ''}">${isStrokeHole ? '●' : ''}</td>`;
          }).join('')}
          <td class="totals"></td>
          <td class="totals"></td>
        </tr>
        <tr>
          <td class="player-name" style="font-size: 8px;">Index: ${player1.handicap_index}</td>
          <td colspan="10" style="text-align: left; padding-left: 5px; font-size: 9px;">
            ${team1}${match.strokes_receiver === 1 ? ` - Reçoit ${match.strokes_given} coup${match.strokes_given > 1 ? 's' : ''}` : ''}
          </td>
          <td colspan="10"></td>
          <td></td>
        </tr>
        <tr style="height: 15px;"><td colspan="23"></td></tr>
        <tr>
          <td class="player-name">${player2.first_name} ${player2.last_name}</td>
          ${Array.from({ length: 9 }, (_, i) => {
            const isStrokeHole = strokeHolesTeam2.includes(i + 1);
            return `<td class="${isStrokeHole ? 'stroke-hole' : ''}">${isStrokeHole ? '●' : ''}</td>`;
          }).join('')}
          <td class="totals"></td>
          ${Array.from({ length: 9 }, (_, i) => {
            const isStrokeHole = strokeHolesTeam2.includes(i + 10);
            return `<td class="${isStrokeHole ? 'stroke-hole' : ''}">${isStrokeHole ? '●' : ''}</td>`;
          }).join('')}
          <td class="totals"></td>
          <td class="totals"></td>
        </tr>
        <tr>
          <td class="player-name" style="font-size: 8px;">Index: ${player2.handicap_index}</td>
          <td colspan="10" style="text-align: left; padding-left: 5px; font-size: 9px;">
            ${team2}${match.strokes_receiver === 2 ? ` - Reçoit ${match.strokes_given} coup${match.strokes_given > 1 ? 's' : ''}` : ''}
          </td>
          <td colspan="10"></td>
          <td></td>
        </tr>
      </tbody>
    </table>

    <div style="margin-top: 30px; font-size: 11px;">
      <p><strong>Résultat du match:</strong> _________________________________</p>
      <p style="font-size: 9px; color: #666;">● = Coup de handicap reçu sur ce trou</p>
    </div>

    <div class="signature">
      <div>
        <div>Capitaine ${team1}</div>
        <div class="sig-line"></div>
      </div>
      <div>
        <div>Capitaine ${team2}</div>
        <div class="sig-line"></div>
      </div>
    </div>
  </div>`;
    });

    scorecardHTML += `
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
