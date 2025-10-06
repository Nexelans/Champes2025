import { createClient } from 'jsr:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

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
    const numMatches = isFinals ? 5 : 8;

    const individualMatchesToInsert = [];
    for (let i = 1; i <= numMatches; i++) {
      individualMatchesToInsert.push({
        match_id: matchId,
        match_order: i,
        team1_player_id: '00000000-0000-0000-0000-000000000000',
        team2_player_id: '00000000-0000-0000-0000-000000000000',
        team1_player2_id: isFinals ? '00000000-0000-0000-0000-000000000000' : null,
        team2_player2_id: isFinals ? '00000000-0000-0000-0000-000000000000' : null,
        result: null,
        team1_points: 0,
        team2_points: 0,
        score_detail: null,
      });
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