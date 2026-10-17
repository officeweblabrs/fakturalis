import nodemailer from 'nodemailer';
import { createClient } from '@supabase/supabase-js';

export const runtime = 'nodejs';

export async function POST(req) {
  const token = (req.headers.get('authorization') || '').replace('Bearer ', '');
  const sb = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co',
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder-key'
  );
  const { data, error } = await sb.auth.getUser(token);
  if (error || !data?.user) {
    return Response.json({ error: 'Neautorizovano.' }, { status: 401 });
  }
  if (process.env.OWNER_EMAIL && data.user.email?.toLowerCase() !== process.env.OWNER_EMAIL.toLowerCase()) {
    return Response.json({ error: 'Ovom nalogu nije dozvoljeno slanje.' }, { status: 403 });
  }
  const user = process.env.GMAIL_USER;
  const pass = process.env.GMAIL_APP_PASSWORD;
  if (!user || !pass) {
    return Response.json({ error: 'not_configured' }, { status: 501 });
  }

  const { to, subject, html, replyTo, fromName, qrPng } = await req.json();
  if (!to || !subject || !html) {
    return Response.json({ error: 'Nedostaju podaci za slanje.' }, { status: 400 });
  }

  try {
    const transporter = nodemailer.createTransport({ service: 'gmail', auth: { user, pass } });
    await transporter.sendMail({
      from: `"${String(fromName || 'Faktura').replace(/"/g, '')}" <${user}>`,
      to,
      subject,
      html,
      replyTo,
      attachments:
        typeof qrPng === 'string' && /^data:image\/png;base64,[A-Za-z0-9+/=]+$/.test(qrPng) && qrPng.length < 200000
          ? [{ filename: 'uplata-qr.png', content: qrPng.split(',')[1], encoding: 'base64', cid: 'ipsqr' }]
          : [],
    });
    return Response.json({ ok: true });
  } catch (e) {
    return Response.json({ error: 'Slanje nije uspelo: ' + e.message }, { status: 500 });
  }
}
