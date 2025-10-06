import { createClient } from 'jsr:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

interface Team {
  id: string;
  club_id: string;
  club_name: string;
}

function generateRoundRobinSchedule(teams: Team[]): Array<[Team, Team]>[] {
  const n = teams.length;
  if (n % 2 !== 0) {
    throw new Error('Number of teams must be even');
  }

  const rounds: Array<[Team, Team]>[] = [];
  const teamsCopy = [...teams];

  for (let round = 0; round < n - 1; round++) {
    const matches: Array<[Team, Team]> = [];

    for (let i = 0; i < n / 2; i++) {
      const team1 = teamsCopy[i];
      const team2 = teamsCopy[n - 1 - i];
      matches.push([team1, team2]);
    }

    rounds.push(matches);

    const fixed = teamsCopy[0];
    teamsCopy.splice(0, 1);
    teamsCopy.splice(1, 0, fixed);
  }

  return rounds;
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

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      throw new Error('Unauthorized');
    }

    const { data: adminData } = await supabase
      .from('admin_users')
      .select('id')
      .eq('user_id', user.id)
      .maybeSingle();

    if (!adminData) {
      throw new Error('User is not an admin');
    }

    const { data: seasonData } = await supabase
      .from('seasons')
      .select('id')
      .eq('is_active', true)
      .maybeSingle();

    if (!seasonData) {
      throw new Error('No active season found');
    }

    await supabase
      .from('matches')
      .delete()
      .eq('season_id', seasonData.id);

    const divisions = ['champe1', 'champe2'];
    let totalMatchesCreated = 0;

    for (const division of divisions) {
      const { data: teamsData } = await supabase
        .from('teams')
        .select('id, club_id, clubs!inner(name)')
        .eq('season_id', seasonData.id)
        .eq('division', division);

      if (!teamsData || teamsData.length === 0) {
        continue;
      }

      if (teamsData.length % 2 !== 0) {
        console.log(`Skipping ${division}: odd number of teams`);
        continue;
      }

      const teams: Team[] = teamsData.map((t: any) => ({
        id: t.id,
        club_id: t.club_id,
        club_name: t.clubs.name,
      }));

      const { data: datesData } = await supabase
        .from('season_dates')
        .select('*')
        .eq('season_id', seasonData.id)
        .eq('division', division)
        .order('round_number');

      if (!datesData || datesData.length < 5) {
        console.log(`Skipping ${division}: not enough dates`);
        continue;
      }

      const schedule = generateRoundRobinSchedule(teams);

      const matchesToInsert = [];

      for (let roundIndex = 0; roundIndex < Math.min(5, schedule.length); roundIndex++) {
        const matches = schedule[roundIndex];
        const dateInfo = datesData[roundIndex];

        if (!dateInfo) continue;

        for (const [team1, team2] of matches) {
          matchesToInsert.push({
            season_id: seasonData.id,
            division: division,
            round_number: dateInfo.round_number,
            match_date: dateInfo.planned_date,
            host_club_id: dateInfo.host_club_id,
            team1_id: team1.id,
            team2_id: team2.id,
            status: 'scheduled',
            team1_points: 0,
            team2_points: 0,
          });
        }
      }

      if (datesData.length >= 6) {
        const finalDate = datesData[5];

        if (teams.length >= 2) {
          matchesToInsert.push({
            season_id: seasonData.id,
            division: division,
            round_number: 6,
            match_date: finalDate.planned_date,
            host_club_id: finalDate.host_club_id,
            team1_id: teams[0].id,
            team2_id: teams[1].id,
            status: 'scheduled',
            team1_points: 0,
            team2_points: 0,
          });
        }
      }

      if (matchesToInsert.length > 0) {
        const { error: insertError } = await supabase
          .from('matches')
          .insert(matchesToInsert);

        if (insertError) {
          console.error('Error inserting matches:', insertError);
          throw insertError;
        }

        totalMatchesCreated += matchesToInsert.length;
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        matchesCreated: totalMatchesCreated,
      }),
      {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      }
    );
  } catch (error) {
    console.error('Error generating matches:', error);
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