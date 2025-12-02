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
  const strokes = Math.floor(diff * multiplier);
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

    if (!team1SelectionsRaw || team1SelectionsRaw.length !== requiredPlayers) {
      throw new Error(`Team 1 must select exactly ${requiredPlayers} players`);
    }

    if (!team2SelectionsRaw || team2SelectionsRaw.length !== requiredPlayers) {
      throw new Error(`Team 2 must select exactly ${requiredPlayers} players`);
    }

    const team1Selections = team1SelectionsRaw.sort((a, b) => {
      const handicapA = (a.players as any).handicap_index;
      const handicapB = (b.players as any).handicap_index;
      return handicapA - handicapB;
    });

    const team2Selections = team2SelectionsRaw.sort((a, b) => {
      const handicapA = (a.players as any).handicap_index;
      const handicapB = (b.players as any).handicap_index;
      return handicapA - handicapB;
    });

    await supabase
      .from('individual_matches')
      .delete()
      .eq('match_id', matchId);

    const individualMatchesToInsert = [];

    if (isFinals) {
      for (let i = 0; i < 5; i++) {
        const team1Player1 = team1Selections[i * 2];
        const team1Player2 = team1Selections[i * 2 + 1];
        const team2Player1 = team2Selections[i * 2];
        const team2Player2 = team2Selections[i * 2 + 1];

        const team1Player1Handicap = (team1Player1.players as any).handicap_index;
        const team1Player2Handicap = (team1Player2.players as any).handicap_index;
        const team2Player1Handicap = (team2Player1.players as any).handicap_index;
        const team2Player2Handicap = (team2Player2.players as any).handicap_index;

        const team1RoundedAvg = (Math.round(team1Player1Handicap) + Math.round(team1Player2Handicap)) / 2;
        const team2RoundedAvg = (Math.round(team2Player1Handicap) + Math.round(team2Player2Handicap)) / 2;

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
      for (let i = 0; i < 8; i++) {
        const team1Player = team1Selections[i];
        const team2Player = team2Selections[i];

        const team1Handicap = (team1Player.players as any).handicap_index;
        const team2Handicap = (team2Player.players as any).handicap_index;

        const strokeInfo = calculateStrokesGiven(team1Handicap, team2Handicap);
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