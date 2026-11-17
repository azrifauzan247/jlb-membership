import { createClient } from '@supabase/supabase-js';
import { sendMail, esc } from '../../lib/mailer';

export const runtime = 'nodejs';

function buildMail(name, status) {
  if (status === 'approved') {
    return {
      subject: 'Keahlian JLB anda telah diluluskan',
      text: `Salam ${name},\n\nTahniah! Permohonan keahlian JLB anda telah DILULUSKAN.\n\nTerima kasih kerana menyertai kami.\n\nJLB - Jadi Lebih Baik`,
      html: `<p>Salam <strong>${esc(name)}</strong>,</p><p>Tahniah! Permohonan keahlian JLB anda telah <strong style="color:#3f4a2c">DILULUSKAN</strong>.</p><p>Terima kasih kerana menyertai kami.</p><p>JLB - Jadi Lebih Baik</p>`,
    };
  }
  return {
    subject: 'Keputusan permohonan keahlian JLB',
    text: `Salam ${name},\n\nMaaf, permohonan keahlian JLB anda tidak dapat diluluskan pada masa ini.\n\nJika ada pertanyaan, sila hubungi admin.\n\nJLB - Jadi Lebih Baik`,
    html: `<p>Salam <strong>${esc(name)}</strong>,</p><p>Maaf, permohonan keahlian JLB anda <strong style="color:#991b1b">tidak dapat diluluskan</strong> pada masa ini.</p><p>Jika ada pertanyaan, sila hubungi admin.</p><p>JLB - Jadi Lebih Baik</p>`,
  };
}

export async function POST(request) {
  const token = (request.headers.get('authorization') || '').replace(/^Bearer\s+/i, '');
  if (!token) return Response.json({ error: 'unauthorized' }, { status: 401 });

  let body;
  try { body = await request.json(); } catch { return Response.json({ error: 'bad_request' }, { status: 400 }); }
  const { memberId, status } = body || {};
  if (!memberId || !['approved', 'rejected'].includes(status)) {
    return Response.json({ error: 'bad_request' }, { status: 400 });
  }

  // Guna token admin: RLS memastikan hanya admin boleh baca ahli
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    { global: { headers: { Authorization: `Bearer ${token}` } }, auth: { persistSession: false } }
  );

  const { data: isAdmin } = await supabase.rpc('is_admin');
  if (isAdmin !== true) return Response.json({ error: 'forbidden' }, { status: 403 });

  const { data: member, error } = await supabase
    .from('Ahli Lembaga Pengarah JLB')
    .select('full_name, email, membership_status')
    .eq('id', memberId)
    .single();
  if (error || !member) return Response.json({ error: 'not_found' }, { status: 404 });

  if (member.membership_status !== status) return Response.json({ error: 'status_mismatch' }, { status: 409 });
  if (!member.email) return Response.json({ sent: false, reason: 'no_email' });

  const result = await sendMail({ to: member.email, ...buildMail(member.full_name, status) });
  return Response.json(result);
}
