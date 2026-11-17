import { createClient } from '@supabase/supabase-js';
import { randomInt } from 'node:crypto';
import { sendMail, esc } from '../../lib/mailer';

export const runtime = 'nodejs';

// Had kadar ringkas (per instans pelayan): 5 pendaftaran / 10 minit / IP
const hits = new Map();
function limited(ip) {
  const now = Date.now();
  const recent = (hits.get(ip) || []).filter((t) => now - t < 10 * 60 * 1000);
  if (recent.length >= 5) { hits.set(ip, recent); return true; }
  recent.push(now);
  hits.set(ip, recent);
  return false;
}

const clean = (v, max) => (typeof v === 'string' ? v.trim().slice(0, max) : '');

export async function POST(request) {
  const ip = (request.headers.get('x-forwarded-for') || 'unknown').split(',')[0].trim();
  if (limited(ip)) return Response.json({ result: 'rate_limited' }, { status: 429 });

  let body;
  try { body = await request.json(); } catch { return Response.json({ result: 'invalid' }, { status: 400 }); }

  const name = clean(body.full_name, 120);
  const phone = clean(body.phone_number, 20);
  const email = clean(body.email, 254);
  const address = clean(body.address, 300);

  if (!name || !/^[0-9+\-\s]{7,20}$/.test(phone) || (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))) {
    return Response.json({ result: 'invalid' }, { status: 400 });
  }

  const pin = String(randomInt(0, 1000000)).padStart(6, '0');

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    { auth: { persistSession: false } }
  );
  const { data, error } = await supabase.rpc('register_member', {
    p_name: name, p_phone: phone, p_email: email, p_address: address, p_pin: pin,
  });
  if (error) {
    console.error('register_member:', error);
    return Response.json({ result: 'error' }, { status: 500 });
  }
  if (data !== 'ok') return Response.json({ result: data });

  // Emel pengesahan (jika ada emel). Kegagalan emel tidak membatalkan pendaftaran.
  let emailSent = false;
  if (email) {
    const origin = new URL(request.url).origin;
    const mail = await sendMail({
      to: email,
      subject: 'Pendaftaran JLB anda telah diterima',
      text: `Salam ${name},\n\nPendaftaran keahlian JLB anda telah DITERIMA dan sedang menunggu kelulusan.\n\nPIN anda: ${pin}\nSimpan PIN ini. Anda memerlukannya untuk mengemas kini maklumat di ${origin}/kemaskini (guna nombor telefon + PIN).\n\nKeputusan akan dimaklumkan melalui emel ini.\n\nJLB - Jadi Lebih Baik`,
      html: `<p>Salam <strong>${esc(name)}</strong>,</p><p>Pendaftaran keahlian JLB anda telah <strong>diterima</strong> dan sedang menunggu kelulusan.</p><p>PIN anda: <strong style="font-size:1.3em;letter-spacing:3px">${pin}</strong></p><p>Simpan PIN ini. Anda memerlukannya untuk mengemas kini maklumat di <a href="${esc(origin)}/kemaskini">${esc(origin)}/kemaskini</a> (guna nombor telefon + PIN).</p><p>Keputusan akan dimaklumkan melalui emel ini.</p><p>JLB - Jadi Lebih Baik</p>`,
    });
    emailSent = mail.sent;
  }

  return Response.json({ result: 'ok', pin, emailSent });
}
