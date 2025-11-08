import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const { email } = await req.json();

    if (!email) {
      return new Response(
        JSON.stringify({ error: "Email requis" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const { data: captain } = await supabaseClient
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
      .eq("email", email)
      .maybeSingle();

    if (!captain || !captain.user_id) {
      return new Response(
        JSON.stringify({ error: "Aucun compte trouvé avec cet email" }),
        {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const generatePassword = () => {
      const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%';
      let password = '';
      for (let i = 0; i < 12; i++) {
        password += chars.charAt(Math.floor(Math.random() * chars.length));
      }
      return password;
    };

    const newPassword = generatePassword();

    const { error: resetError } = await supabaseClient.auth.admin.updateUserById(
      captain.user_id,
      { password: newPassword }
    );

    if (resetError) {
      return new Response(
        JSON.stringify({ error: "Erreur lors de la réinitialisation du mot de passe" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const teamInfo = captain.teams;
    const teamName = teamInfo.clubs.name;
    const division = teamInfo.division;

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
      <h1>Réinitialisation de votre mot de passe</h1>
    </div>
    <div class="content">
      <p>Bonjour ${captain.first_name} ${captain.last_name},</p>
      <p>Vous avez demandé la réinitialisation de votre mot de passe pour accéder à la plateforme Champes.</p>
      <p>Voici votre nouveau mot de passe :</p>
      <div class="credentials">
        <p><strong>Email :</strong> ${captain.email}</p>
        <p><strong>Nouveau mot de passe :</strong> ${newPassword}</p>
      </div>
      <p>Vous pouvez maintenant vous connecter avec ces identifiants.</p>
      <p><strong>Important :</strong> Nous vous recommandons de changer ce mot de passe après votre connexion.</p>
      <p>Si vous n'avez pas demandé cette réinitialisation, contactez immédiatement l'administrateur.</p>
      <p>Cordialement,<br>L'équipe Champes ASG3V</p>
    </div>
    <div class="footer">
      <p>Cet email a été envoyé automatiquement. Merci de ne pas y répondre.</p>
    </div>
  </div>
</body>
</html>`;

    const emailText = `Bonjour ${captain.first_name} ${captain.last_name},

Vous avez demandé la réinitialisation de votre mot de passe pour accéder à la plateforme Champes.

Voici votre nouveau mot de passe :
Email : ${captain.email}
Nouveau mot de passe : ${newPassword}

Vous pouvez maintenant vous connecter avec ces identifiants.

Important : Nous vous recommandons de changer ce mot de passe après votre connexion.

Si vous n'avez pas demandé cette réinitialisation, contactez immédiatement l'administrateur.

Cordialement,
L'équipe Champes ASG3V`;

    const boundary = `----=_Part${Date.now()}`;
    const emailBody = [
      `MIME-Version: 1.0`,
      `From: Champes ASG3V <champes@asg3v.fr>`,
      `To: ${captain.email}`,
      `Subject: =?UTF-8?B?${btoa(unescape(encodeURIComponent(`Réinitialisation de votre mot de passe - ${teamName}`)))}?=`,
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
        return response;
      }
      return '';
    };

    const write = async (data: string) => {
      await conn.write(encoder.encode(data + '\r\n'));
      const response = await read();
      if (response.startsWith('5') || response.startsWith('4')) {
        throw new Error(`SMTP Error: ${response}`);
      }
      return response;
    };

    await read();
    await write('EHLO asg3v.fr');
    await write('AUTH LOGIN');
    await write(btoa('champes@asg3v.fr'));
    await write(btoa('hTQrMiT!E&xbkG6B'));
    await write(`MAIL FROM:<champes@asg3v.fr>`);
    await write(`RCPT TO:<${captain.email}>`);
    await write('DATA');
    await conn.write(encoder.encode(emailBody + '\r\n.\r\n'));
    await read();
    await write('QUIT');
    conn.close();

    return new Response(
      JSON.stringify({
        success: true,
        message: "Un nouveau mot de passe a été envoyé à votre adresse email"
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error in reset-password:", error);
    return new Response(
      JSON.stringify({ error: "Erreur lors de l'envoi de l'email" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
