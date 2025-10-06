import { createClient } from 'jsr:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

interface Player {
  id: string;
  handicap_index: number;
}

function generateMatchups(team1Players: Player[], team2Players: Player[], isFinals: boolean): Array<{
  match_order: number;
  team1_player_id: string;
  team2_player_id: string;
  team1_player2_id?: string;
  team2_player2_id?: string;
}> {
  const matchups = [];

  if (isFinals) {
    const numPairs = 5;
    for (let i = 0; i < numPairs; i++) {
      const pair1Start = i * 2;
      const pair2Start = i * 2;

      if (pair1Start + 1 < team1Players.length && pair2Start + 1 < team2Players.length) {
        matchups.push({
          match_order: i + 1,
          team1_player_id: team1Players[pair1Start].id,
          team1_player2_id: team1Players[pair1Start + 1].id,
          team2_player_id: team2Players[pair2Start].id,
          team2_player2_id: team2Players[pair2Start + 1].id,
        });
      }
    }
  } else {
    const numMatches = Math.min(8, team1Players.length, team2Players.length);
    for (let i = 0; i < numMatches; i++) {
      matchups.push({
        match_order: i + 1,
        team1_player_id: team1Players[i].id,
        team2_player_id: team2Players[i].id,
      });
    }
  }

  return matchups;
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

    await supabase
      .from('individual_matches')
      .delete()
      .eq('match_id', matchId);

    const isFinals = matchData.round_number === 6;
    const expectedPlayers = isFinals ? 10 : 8;

    const { data: team1Selections, error: t1Error } = await supabase
      .from('match_player_selections')
      .select('player_id, players!inner(id, handicap_index)')
      .eq('match_id', matchId)
      .eq('team_id', matchData.team1_id)
      .order('selection_order');

    const { data: team2Selections, error: t2Error } = await supabase
      .from('match_player_selections')
      .select('player_id, players!inner(id, handicap_index)')
      .eq('match_id', matchId)
      .eq('team_id', matchData.team2_id)
      .order('selection_order');

    if (t1Error || t2Error) {
      throw new Error('Error loading player selections');
    }

    if (!team1Selections || team1Selections.length !== expectedPlayers) {
      throw new Error(`Team 1 must have exactly ${expectedPlayers} players selected`);
    }

    if (!team2Selections || team2Selections.length !== expectedPlayers) {
      throw new Error(`Team 2 must have exactly ${expectedPlayers} players selected`);
    }

    const team1Players: Player[] = team1Selections.map((s: any) => ({
      id: s.players.id,
      handicap_index: s.players.handicap_index,
    }));

    const team2Players: Player[] = team2Selections.map((s: any) => ({
      id: s.players.id,
      handicap_index: s.players.handicap_index,
    }));

    const matchups = generateMatchups(team1Players, team2Players, isFinals);

    if (matchups.length === 0) {
      throw new Error('No matchups generated');
    }

    const individualMatchesToInsert = matchups.map(m => ({
      match_id: matchId,
      match_order: m.match_order,
      team1_player_id: m.team1_player_id,
      team2_player_id: m.team2_player_id,
      team1_player2_id: m.team1_player2_id || null,
      team2_player2_id: m.team2_player2_id || null,
      result: null,
      team1_points: 0,
      team2_points: 0,
    }));

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
        matchupsGenerated: matchups.length,
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