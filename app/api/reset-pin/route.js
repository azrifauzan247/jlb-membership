import { createClient } from '@supabase/supabase-js';
import { randomInt } from 'node:crypto';
import { sendMail, esc } from '../../lib/mailer';

export const runtime = 'nodejs';

export async function POST(request) {
  const token = (request.headers.get('authorization') || '').replace(/^Bearer\s+/i, '');
  if (!token) return Response.json({ error: 'unauthorized' }, { status: 401 });

  let body;
  try { body = await request.json(); } catch { return Response.json({ error: 'bad_request' }, { status: 400 }); }
  const { memberId } = body || {};
  if (!memberId) return Response.json({ error: 'bad_request' }, { status: 400 });

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    { global: { headers: { Authorization: `Bearer ${token}` } }, auth: { persistSession: false } }
  );

  const { data: isAdmin } = await supabase.rpc('is_admin');
  if (isAdmin !== true) return Response.json({ error: 'forbidden' }, { status: 403 });

  const { data: member } = await supabase
    .from('Ahli Lembaga Pengarah JLB')
    .select('full_name, email')
    .eq('id', memberId)
    .single();
  if (!member) return Response.json({ error: 'not_found' }, { status: 404 });

  const pin = String(randomInt(0, 1000000)).padStart(6, '0');
  const { data: res, error } = await supabase.rpc('admin_set_pin', { p_member_id: memberId, p_pin: pin });
  if (error || res !== 'ok') {
    console.error('admin_set_pin:', error, res);
    return Response.json({ error: 'failed' }, { status: 500 });
  }

  let emailSent = false;
  if (member.email) {
    const origin = new URL(request.url).origin;
    const mail = await sendMail({
      to: member.email,
      subject: 'PIN baharu keahlian JLB anda',
      text: `Salam ${member.full_name},\n\nPIN baharu anda: ${pin}\nGuna nombor telefon + PIN ini di ${origin}/kemaskini untuk mengemas kini maklumat.\n\nJLB - Jadi Lebih Baik`,
      html: `<p>Salam <strong>${esc(member.full_name)}</strong>,</p><p>PIN baharu anda: <strong style="font-size:1.3em;letter-spacing:3px">${pin}</strong></p><p>Guna nombor telefon + PIN ini di <a href="${esc(origin)}/kemaskini">${esc(origin)}/kemaskini</a> untuk mengemas kini maklumat.</p><p>JLB - Jadi Lebih Baik</p>`,
    });
    emailSent = mail.sent;
  }
  return Response.json({ pin, emailSent, name: member.full_name });
}
