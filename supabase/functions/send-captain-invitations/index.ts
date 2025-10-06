import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface CaptainInvitation {
  email: string;
  first_name: string;
  last_name: string;
  club_name: string;
  division: string;
  temporary_password: string;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Missing authorization header" }),
        {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(token);

    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const { data: adminData } = await supabaseClient
      .from("admin_users")
      .select("*")
      .eq("user_id", user.id)
      .maybeSingle();

    if (!adminData) {
      return new Response(
        JSON.stringify({ error: "Admin access required" }),
        {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    let body: any = {};
    let specificCaptainId = null;

    if (req.method === "POST") {
      try {
        const text = await req.text();
        if (text) {
          body = JSON.parse(text);
          specificCaptainId = body.captain_id;
        }
      } catch (e) {
        console.log("No JSON body provided");
      }
    }

    const { data: seasonData } = await supabaseClient
      .from("seasons")
      .select("*")
      .eq("is_active", true)
      .maybeSingle();

    if (!seasonData) {
      return new Response(
        JSON.stringify({ error: "No active season found" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const { data: seasonClubsData } = await supabaseClient
      .from("season_clubs")
      .select("club_id, division")
      .eq("season_id", seasonData.id)
      .eq("is_participating", true);

    if (!seasonClubsData || seasonClubsData.length === 0) {
      return new Response(
        JSON.stringify({ error: "No participating clubs found" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const { data: teamsData } = await supabaseClient
      .from("teams")
      .select(`
        id,
        division,
        club_id,
        clubs!inner(name)
      `)
      .eq("season_id", seasonData.id);

    if (!teamsData) {
      return new Response(
        JSON.stringify({ error: "No teams found" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const participatingTeams = teamsData.filter((team: any) =>
      seasonClubsData.some(
        (sc) => sc.club_id === team.club_id && sc.division === team.division
      )
    );

    const sentEmails: string[] = [];
    const errors: string[] = [];

    let captainsToProcess: any[] = [];

    if (specificCaptainId) {
      const { data: captainData } = await supabaseClient
        .from("captains")
        .select(`
          id,
          email,
          first_name,
          last_name,
          user_id,
          teams!inner(
            division,
            clubs!inner(name)
          )
        `)
        .eq("id", specificCaptainId)
        .maybeSingle();

      if (captainData) {
        captainsToProcess = [captainData];
      }
    } else {
      for (const team of participatingTeams) {
        const { data: captainData } = await supabaseClient
          .from("captains")
          .select("id, email, first_name, last_name, user_id")
          .eq("team_id", team.id)
          .maybeSingle();

        if (captainData) {
          captainsToProcess.push({
            ...captainData,
            teams: {
              division: team.division,
              clubs: { name: (team as any).clubs.name }
            }
          });
        }
      }
    }

    for (const captain of captainsToProcess) {
      const teamInfo = captain.teams;
      const teamName = teamInfo.clubs.name;
      const division = teamInfo.division;

      if (!captain.email) {
        errors.push(`${teamName} (${division}): No email`);
        continue;
      }

      if (captain.user_id && !specificCaptainId) {
        errors.push(`${teamName} (${division}): Captain account already exists`);
        continue;
      }

      const temporaryPassword = specificCaptainId && captain.user_id
        ? null
        : "1234";

      let authUserId = captain.user_id;

      if (!captain.user_id && temporaryPassword) {
        const { data: authData, error: createError } = await supabaseClient.auth.admin.createUser({
          email: captain.email,
          password: temporaryPassword,
          email_confirm: true,
        });

        if (createError || !authData.user) {
          errors.push(`${teamName} (${division}): ${createError?.message || 'Failed to create account'}`);
          continue;
        }

        authUserId = authData.user.id;
      }

      const { error: updateError } = await supabaseClient
        .from("captains")
        .update({
          user_id: authUserId,
          invitation_sent_at: new Date().toISOString(),
        })
        .eq("id", captain.id);

      if (updateError) {
        errors.push(`${teamName} (${division}): Failed to update captain record`);
        continue;
      }

      console.log(`Account created for ${captain.email} with password: 1234`);
      sentEmails.push(`${teamName} (${division}) - Compte créé`);

      // Email sending disabled for testing
      // const resendApiKey = Deno.env.get("RESEND_API_KEY");
      // if (resendApiKey) { ... }
    }

    return new Response(
      JSON.stringify({
        success: true,
        sent: sentEmails.length,
        sentTo: sentEmails,
        errors: errors.length > 0 ? errors : undefined,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error in send-captain-invitations:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});