import { createClient } from 'jsr:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

interface PlayerSelection {
  player_id: string;
  selection_order: number;
  handicap_index: number;
}

function calculateStrokesGiven(handicap1: number, handicap2: number, isFoursome: boolean = false): { strokes: number, receiver: 1 | 2 } {
  const roundedHandicap1 = Math.round(handicap1);
  const roundedHandicap2 = Math.round(handicap2);
  const diff = Math.abs(roundedHandicap1 - roundedHandicap2);
  const multiplier = isFoursome ? 0.375 : 0.75;
  const strokes = Math.round(diff * multiplier);
  const receiver = handicap1 > handicap2 ? 1 : 2;
  return { strokes, receiver };
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Missing Authorization header');
    }

    const { matchId } = await req.json();
    if (!matchId) {
      throw new Error('Missing matchId');
    }

    const { data: matchData, error: matchError } = await supabase
      .from('matches')
      .select('id, round_number, team1_id, team2_id')
      .eq('id', matchId)
      .maybeSingle();

    if (matchError || !matchData) {
      throw new Error('Match not found');
    }

    const isFinals = matchData.round_number === 6;
    const requiredPlayers = isFinals ? 10 : 8;

    const { data: team1SelectionsRaw, error: team1Error } = await supabase
      .from('match_player_selections')
      .select(`
        player_id,
        selection_order,
        players!inner(handicap_index)
      `)
      .eq('match_id', matchId)
      .eq('team_id', matchData.team1_id);

    const { data: team2SelectionsRaw, error: team2Error } = await supabase
      .from('match_player_selections')
      .select(`
        player_id,
        selection_order,
        players!inner(handicap_index)
      `)
      .eq('match_id', matchId)
      .eq('team_id', matchData.team2_id);

    if (team1Error || team2Error) {
      throw new Error('Error fetching player selections');
    }

    const team1Count = team1SelectionsRaw?.length ?? 0;
    const team2Count = team2SelectionsRaw?.length ?? 0;

    if (isFinals) {
      if (team1Count > 0 && team1Count % 2 !== 0) {
        throw new Error('Team 1 has an incomplete foursome pair');
      }
      if (team2Count > 0 && team2Count % 2 !== 0) {
        throw new Error('Team 2 has an incomplete foursome pair');
      }
    }

    if (team1Count === 0 && team2Count === 0) {
      throw new Error('At least one team must have players selected');
    }

    const sortSelections = (raw: typeof team1SelectionsRaw) => {
      if (!raw || raw.length === 0) return [];
      if (isFinals) {
        const sorted = raw.sort((a, b) => a.selection_order - b.selection_order);
        const pairs: typeof sorted[] = [];
        for (let i = 0; i < sorted.length; i += 2) pairs.push(sorted.slice(i, i + 2));
        pairs.sort((pairA, pairB) => {
          const avgA = ((pairA[0].players as any).handicap_index + (pairA[1].players as any).handicap_index) / 2;
          const avgB = ((pairB[0].players as any).handicap_index + (pairB[1].players as any).handicap_index) / 2;
          return avgA - avgB;
        });
        return pairs.flat();
      }
      return raw.sort((a, b) => {
        const handicapA = (a.players as any).handicap_index;
        const handicapB = (b.players as any).handicap_index;
        return handicapA - handicapB;
      });
    };

    const team1Selections = sortSelections(team1SelectionsRaw);
    const team2Selections = sortSelections(team2SelectionsRaw);

    await supabase
      .from('individual_matches')
      .delete()
      .eq('match_id', matchId);

    const individualMatchesToInsert = [];
    const numMatches = isFinals ? 5 : 8;

    if (isFinals) {
      const team1Pairs = team1Count / 2;
      const team2Pairs = team2Count / 2;

      for (let i = 0; i < numMatches; i++) {
        const hasTeam1 = i < team1Pairs;
        const hasTeam2 = i < team2Pairs;

        if (!hasTeam1 && !hasTeam2) {
          individualMatchesToInsert.push({
            match_id: matchId,
            match_order: i + 1,
            team1_player_id: null,
            team1_player2_id: null,
            team2_player_id: null,
            team2_player2_id: null,
            team1_handicap: null,
            team2_handicap: null,
            strokes_given: 0,
            strokes_receiver: null,
            result: null,
            team1_points: 0,
            team2_points: 0,
            score_detail: 'Aucun joueur désigné',
          });
          continue;
        }

        if (!hasTeam1) {
          const team2Player1 = team2Selections[i * 2];
          const team2Player2 = team2Selections[i * 2 + 1];
          individualMatchesToInsert.push({
            match_id: matchId,
            match_order: i + 1,
            team1_player_id: null,
            team1_player2_id: null,
            team2_player_id: team2Player1.player_id,
            team2_player2_id: team2Player2.player_id,
            team1_handicap: null,
            team2_handicap: ((team2Player1.players as any).handicap_index + (team2Player2.players as any).handicap_index) / 2,
            strokes_given: 0,
            strokes_receiver: null,
            result: 'team2_win',
            team1_points: 0,
            team2_points: 1,
            score_detail: 'Forfait équipe 1 — match accordé à l\'équipe 2',
          });
          continue;
        }

        if (!hasTeam2) {
          const team1Player1 = team1Selections[i * 2];
          const team1Player2 = team1Selections[i * 2 + 1];
          individualMatchesToInsert.push({
            match_id: matchId,
            match_order: i + 1,
            team1_player_id: team1Player1.player_id,
            team1_player2_id: team1Player2.player_id,
            team2_player_id: null,
            team2_player2_id: null,
            team1_handicap: ((team1Player1.players as any).handicap_index + (team1Player2.players as any).handicap_index) / 2,
            team2_handicap: null,
            strokes_given: 0,
            strokes_receiver: null,
            result: 'team1_win',
            team1_points: 1,
            team2_points: 0,
            score_detail: 'Forfait équipe 2 — match accordé à l\'équipe 1',
          });
          continue;
        }

        const team1Player1 = team1Selections[i * 2];
        const team1Player2 = team1Selections[i * 2 + 1];
        const team2Player1 = team2Selections[i * 2];
        const team2Player2 = team2Selections[i * 2 + 1];

        const team1Player1Handicap = (team1Player1.players as any).handicap_index;
        const team1Player2Handicap = (team1Player2.players as any).handicap_index;
        const team2Player1Handicap = (team2Player1.players as any).handicap_index;
        const team2Player2Handicap = (team2Player2.players as any).handicap_index;

        const team1Player1Capped = Math.min(team1Player1Handicap, 30);
        const team1Player2Capped = Math.min(team1Player2Handicap, 30);
        const team2Player1Capped = Math.min(team2Player1Handicap, 30);
        const team2Player2Capped = Math.min(team2Player2Handicap, 30);

        const team1RoundedAvg = (Math.round(team1Player1Capped) + Math.round(team1Player2Capped)) / 2;
        const team2RoundedAvg = (Math.round(team2Player1Capped) + Math.round(team2Player2Capped)) / 2;

        const strokeInfo = calculateStrokesGiven(team1RoundedAvg, team2RoundedAvg, true);
        const scoreDetail = strokeInfo.strokes > 0
          ? `${strokeInfo.strokes} coup${strokeInfo.strokes > 1 ? 's' : ''} rendu${strokeInfo.strokes > 1 ? 's' : ''} à l'équipe ${strokeInfo.receiver}`
          : 'Égalité de handicap';

        individualMatchesToInsert.push({
          match_id: matchId,
          match_order: i + 1,
          team1_player_id: team1Player1.player_id,
          team1_player2_id: team1Player2.player_id,
          team2_player_id: team2Player1.player_id,
          team2_player2_id: team2Player2.player_id,
          team1_handicap: team1RoundedAvg,
          team2_handicap: team2RoundedAvg,
          strokes_given: strokeInfo.strokes,
          strokes_receiver: strokeInfo.strokes > 0 ? strokeInfo.receiver : null,
          result: null,
          team1_points: 0,
          team2_points: 0,
          score_detail: scoreDetail,
        });
      }
    } else {
      for (let i = 0; i < numMatches; i++) {
        const hasTeam1 = i < team1Count;
        const hasTeam2 = i < team2Count;

        if (!hasTeam1 && !hasTeam2) {
          individualMatchesToInsert.push({
            match_id: matchId,
            match_order: i + 1,
            team1_player_id: null,
            team2_player_id: null,
            team1_player2_id: null,
            team2_player2_id: null,
            team1_handicap: null,
            team2_handicap: null,
            strokes_given: 0,
            strokes_receiver: null,
            result: null,
            team1_points: 0,
            team2_points: 0,
            score_detail: 'Aucun joueur désigné',
          });
          continue;
        }

        if (!hasTeam1) {
          const team2Player = team2Selections[i];
          individualMatchesToInsert.push({
            match_id: matchId,
            match_order: i + 1,
            team1_player_id: null,
            team2_player_id: team2Player.player_id,
            team1_player2_id: null,
            team2_player2_id: null,
            team1_handicap: null,
            team2_handicap: (team2Player.players as any).handicap_index,
            strokes_given: 0,
            strokes_receiver: null,
            result: 'team2_win',
            team1_points: 0,
            team2_points: 1,
            score_detail: 'Forfait équipe 1 — match accordé à l\'équipe 2',
          });
          continue;
        }

        if (!hasTeam2) {
          const team1Player = team1Selections[i];
          individualMatchesToInsert.push({
            match_id: matchId,
            match_order: i + 1,
            team1_player_id: team1Player.player_id,
            team2_player_id: null,
            team1_player2_id: null,
            team2_player2_id: null,
            team1_handicap: (team1Player.players as any).handicap_index,
            team2_handicap: null,
            strokes_given: 0,
            strokes_receiver: null,
            result: 'team1_win',
            team1_points: 1,
            team2_points: 0,
            score_detail: 'Forfait équipe 2 — match accordé à l\'équipe 1',
          });
          continue;
        }

        const team1Player = team1Selections[i];
        const team2Player = team2Selections[i];

        const team1Handicap = (team1Player.players as any).handicap_index;
        const team2Handicap = (team2Player.players as any).handicap_index;

        const team1HandicapCapped = Math.min(team1Handicap, 30);
        const team2HandicapCapped = Math.min(team2Handicap, 30);

        const strokeInfo = calculateStrokesGiven(team1HandicapCapped, team2HandicapCapped);
        const scoreDetail = strokeInfo.strokes > 0
          ? `${strokeInfo.strokes} coup${strokeInfo.strokes > 1 ? 's' : ''} rendu${strokeInfo.strokes > 1 ? 's' : ''} au joueur ${strokeInfo.receiver}`
          : 'Égalité de handicap';

        individualMatchesToInsert.push({
          match_id: matchId,
          match_order: i + 1,
          team1_player_id: team1Player.player_id,
          team2_player_id: team2Player.player_id,
          team1_player2_id: null,
          team2_player2_id: null,
          team1_handicap: team1Handicap,
          team2_handicap: team2Handicap,
          strokes_given: strokeInfo.strokes,
          strokes_receiver: strokeInfo.strokes > 0 ? strokeInfo.receiver : null,
          result: null,
          team1_points: 0,
          team2_points: 0,
          score_detail: scoreDetail,
        });
      }
    }

    const { error: insertError } = await supabase
      .from('individual_matches')
      .insert(individualMatchesToInsert);

    if (insertError) {
      console.error('Error inserting individual matches:', insertError);
      throw insertError;
    }

    return new Response(
      JSON.stringify({
        success: true,
        matchupsGenerated: individualMatchesToInsert.length,
      }),
      {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      }
    );
  } catch (error) {
    console.error('Error generating individual matches:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
      }),
      {
        status: 500,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      }
    );
  }
});
