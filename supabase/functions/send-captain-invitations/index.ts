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

      const generatePassword = () => {
        const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%';
        let password = '';
        for (let i = 0; i < 12; i++) {
          password += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return password;
      };

      const temporaryPassword = specificCaptainId && captain.user_id
        ? generatePassword()
        : generatePassword();

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
      } else if (captain.user_id && specificCaptainId && temporaryPassword) {
        const { error: resetError } = await supabaseClient.auth.admin.updateUserById(
          captain.user_id,
          { password: temporaryPassword }
        );

        if (resetError) {
          errors.push(`${teamName} (${division}): Failed to reset password - ${resetError.message}`);
          continue;
        }
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

      console.log(`Account created/updated for ${captain.email} with password: ${temporaryPassword}`);

      try {
        const emailHtml = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background-color: #10b981; color: white; padding: 20px; text-align: center; border-radius: 5px 5px 0 0; }
    .content { background-color: #f9fafb; padding: 30px; border: 1px solid #e5e7eb; border-top: none; }
    .credentials { background-color: white; padding: 20px; margin: 20px 0; border-left: 4px solid #10b981; }
    .footer { text-align: center; margin-top: 20px; color: #6b7280; font-size: 12px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Bienvenue sur la plateforme Champes</h1>
    </div>
    <div class="content">
      <p>Bonjour ${captain.first_name} ${captain.last_name},</p>
      <p>Vous êtes le capitaine de l'équipe <strong>${teamName}</strong> en <strong>${division === 'champe1' ? 'Championnat 1' : 'Championnat 2'}</strong>.</p>
      <p>Voici vos identifiants de connexion pour accéder à la plateforme :</p>
      <div class="credentials">
        <p><strong>Email :</strong> ${captain.email}</p>
        <p><strong>Mot de passe :</strong> ${temporaryPassword}</p>
      </div>
      <p>Vous pouvez vous connecter en utilisant ces identifiants sur la plateforme.</p>
      <p><strong>Important :</strong> Nous vous recommandons de changer votre mot de passe après votre première connexion.</p>
      <p>Si vous avez des questions, n'hésitez pas à nous contacter.</p>
      <p>Cordialement,<br>L'équipe Champes ASG3V</p>
    </div>
    <div class="footer">
      <p>Cet email a été envoyé automatiquement. Merci de ne pas y répondre.</p>
    </div>
  </div>
</body>
</html>`;

        const emailText = `Bonjour ${captain.first_name} ${captain.last_name},

Vous êtes le capitaine de l'équipe ${teamName} en ${division === 'champe1' ? 'Championnat 1' : 'Championnat 2'}.

Voici vos identifiants de connexion :
Email : ${captain.email}
Mot de passe : ${temporaryPassword}

Important : Nous vous recommandons de changer votre mot de passe après votre première connexion.

Cordialement,
L'équipe Champes ASG3V`;

        const boundary = `----=_Part${Date.now()}`;
        const emailBody = [
          `MIME-Version: 1.0`,
          `From: Champes ASG3V <champes@asg3v.fr>`,
          `To: ${captain.email}`,
          `Subject: =?UTF-8?B?${btoa(unescape(encodeURIComponent(`Vos identifiants pour la plateforme Champes - ${teamName}`)))}?=`,
          `Content-Type: multipart/alternative; boundary="${boundary}"`,
          ``,
          `--${boundary}`,
          `Content-Type: text/plain; charset=UTF-8`,
          `Content-Transfer-Encoding: quoted-printable`,
          ``,
          emailText,
          ``,
          `--${boundary}`,
          `Content-Type: text/html; charset=UTF-8`,
          `Content-Transfer-Encoding: quoted-printable`,
          ``,
          emailHtml,
          ``,
          `--${boundary}--`,
        ].join('\r\n');

        const conn = await Deno.connectTls({
          hostname: 'ssl0.ovh.net',
          port: 465,
        });

        const encoder = new TextEncoder();
        const decoder = new TextDecoder();

        const read = async () => {
          const buffer = new Uint8Array(4096);
          const n = await conn.read(buffer);
          if (n) {
            const response = decoder.decode(buffer.subarray(0, n));
            console.log('SMTP Response:', response.trim());
            return response;
          }
          return '';
        };

        const write = async (data: string, hidePassword = false) => {
          console.log('SMTP Send:', hidePassword ? '***PASSWORD***' : data.trim());
          await conn.write(encoder.encode(data + '\r\n'));
          const response = await read();
          if (response.startsWith('5') || response.startsWith('4')) {
            throw new Error(`SMTP Error: ${response}`);
          }
          return response;
        };

        console.log('Connecting to SMTP server...');
        await read();
        console.log('Sending EHLO...');
        await write('EHLO asg3v.fr');
        console.log('Sending AUTH LOGIN...');
        await write('AUTH LOGIN');
        console.log('Sending username...');
        await write(btoa('champes@asg3v.fr'));
        console.log('Sending password...');
        await write(btoa('hTQrMiT!E&xbkG6B'), true);
        console.log('Sending MAIL FROM...');
        await write(`MAIL FROM:<champes@asg3v.fr>`);
        console.log('Sending RCPT TO...');
        await write(`RCPT TO:<${captain.email}>`);
        console.log('Sending DATA command...');
        await write('DATA');
        console.log('Sending email body...');
        await conn.write(encoder.encode(emailBody + '\r\n.\r\n'));
        const dataResponse = await read();
        console.log('Email data sent, server response:', dataResponse);
        console.log('Sending QUIT...');
        await write('QUIT');
        conn.close();
        console.log('Connection closed successfully');

        console.log(`Email sent successfully to ${captain.email}`);
        sentEmails.push(`${teamName} (${division}) - ${captain.email} - Password: ${temporaryPassword} (Email envoyé)`);
      } catch (emailError) {
        console.error(`Error sending email to ${captain.email}:`, emailError);
        sentEmails.push(`${teamName} (${division}) - ${captain.email} - Password: ${temporaryPassword} (Erreur: ${emailError.message})`);
      }
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