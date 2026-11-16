'use client';

import { useState } from 'react';
import { supabase } from '../supabase';

const STATUS_LABEL = { pending: 'Menunggu kelulusan', approved: 'Diluluskan', rejected: 'Ditolak' };

export default function KemaskiniPage() {
  // identiti yang disahkan (nama + telefon asal)
  const [identity, setIdentity] = useState(null);
  const [record, setRecord] = useState(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);

  async function handleVerify(e) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const name = f.get('name').trim();
    const phone = f.get('phone').trim();
    setLoading(true);
    setResult(null);

    const { data, error } = await supabase.rpc('get_my_registration', { p_name: name, p_phone: phone });
    setLoading(false);

    if (error) {
      console.error(error);
      setResult({ ok: false, text: 'Semakan gagal. Sila cuba lagi.' });
    } else if (!data || data.length === 0) {
      setResult({ ok: false, text: 'Maklumat tidak ditemui. Pastikan nama penuh dan nombor telefon sama seperti semasa mendaftar.' });
    } else {
      setIdentity({ name, phone });
      setRecord(data[0]);
    }
  }

  async function handleUpdate(e) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const next = {
      full_name: f.get('full_name').trim(),
      phone_number: f.get('phone_number').trim(),
      email: f.get('email').trim(),
      address: f.get('address').trim(),
    };
    setLoading(true);
    setResult(null);

    const { data, error } = await supabase.rpc('update_my_registration', {
      p_name: identity.name,
      p_phone: identity.phone,
      n_name: next.full_name,
      n_phone: next.phone_number,
      n_email: next.email,
      n_address: next.address,
    });
    setLoading(false);

    const messages = {
      not_found: 'Rekod tidak ditemui. Sila sahkan semula identiti anda.',
      multiple: 'Ada lebih daripada satu rekod sepadan. Sila hubungi admin.',
      phone_taken: 'Nombor telefon baru itu sudah digunakan oleh ahli lain.',
      invalid: 'Nama penuh dan nombor telefon wajib diisi.',
    };

    if (error) {
      console.error(error);
      setResult({ ok: false, text: 'Kemaskini gagal. Sila cuba lagi.' });
    } else if (data === 'ok') {
      setIdentity({ name: next.full_name, phone: next.phone_number });
      setRecord({ ...record, ...next, email: next.email || null, address: next.address || null });
      setResult({ ok: true, text: 'Maklumat anda berjaya dikemas kini.' });
    } else {
      setResult({ ok: false, text: messages[data] || 'Kemaskini gagal.' });
    }
  }

  function reset() {
    setIdentity(null);
    setRecord(null);
    setResult(null);
  }

  return (
    <main className="wrap">
      <div className="hero">
        <img className="logo" src="/logo.jpg" alt="Logo JLB - Jadi Lebih Baik" />
        <h1>Kemaskini Maklumat</h1>
        <p>{record ? 'Ubah maklumat anda dan simpan' : 'Sahkan identiti anda dahulu'}</p>
      </div>

      <div className="card">
        {!record ? (
          <form onSubmit={handleVerify}>
            <label htmlFor="name">Nama Penuh <span className="req">*</span></label>
            <input id="name" name="name" placeholder="Seperti semasa mendaftar" required />
            <label htmlFor="phone">Nombor Telefon <span className="req">*</span></label>
            <input id="phone" name="phone" type="tel" placeholder="Seperti semasa mendaftar" required />
            <button type="submit" disabled={loading}>{loading ? 'Menyemak...' : 'Teruskan'}</button>
          </form>
        ) : (
          <form onSubmit={handleUpdate} key={`${record.full_name}|${record.phone_number}`}>
            <div className="detail small" style={{ marginTop: 0 }}>
              Status keahlian: <strong>{STATUS_LABEL[record.membership_status] || record.membership_status}</strong>
            </div>
            <label htmlFor="full_name">Nama Penuh <span className="req">*</span></label>
            <input id="full_name" name="full_name" defaultValue={record.full_name} required />
            <label htmlFor="phone_number">Nombor Telefon <span className="req">*</span></label>
            <input id="phone_number" name="phone_number" type="tel" defaultValue={record.phone_number} required />
            <label htmlFor="email">Email</label>
            <input id="email" name="email" type="email" defaultValue={record.email || ''} />
            <label htmlFor="address">Alamat</label>
            <textarea id="address" name="address" rows={3} defaultValue={record.address || ''} />
            <button type="submit" disabled={loading}>{loading ? 'Menyimpan...' : 'Simpan Perubahan'}</button>
            <button type="button" className="ghost dark" style={{ width: '100%', marginTop: 10 }} onClick={reset}>
              Selesai / Tukar akaun
            </button>
          </form>
        )}
        {result && <div className={`msg ${result.ok ? 'ok' : 'err'}`}>{result.text}</div>}
        <p className="links"><a href="/">← Kembali ke pendaftaran</a></p>
      </div>
      <p className="foot">© JLB</p>
    </main>
  );
}
