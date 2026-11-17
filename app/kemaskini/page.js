'use client';

import { useState } from 'react';
import { supabase } from '../supabase';

const STATUS_LABEL = { pending: 'Menunggu kelulusan', approved: 'Diluluskan', rejected: 'Ditolak' };
const AUTH_ERRORS = {
  bad: 'Nombor telefon atau PIN salah.',
  locked: 'Terlalu banyak percubaan salah. Sila cuba lagi selepas 15 minit, atau hubungi admin.',
};

export default function KemaskiniPage() {
  const [identity, setIdentity] = useState(null); // { phone, pin } yang telah disahkan
  const [record, setRecord] = useState(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);

  async function handleVerify(e) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const phone = f.get('phone').trim();
    const pin = f.get('pin').trim();
    setLoading(true);
    setResult(null);

    const { data, error } = await supabase.rpc('get_my_registration', { p_phone: phone, p_pin: pin });
    setLoading(false);

    if (error) {
      console.error(error);
      setResult({ ok: false, text: 'Semakan gagal. Sila cuba lagi.' });
    } else if (data?.result === 'ok') {
      setIdentity({ phone, pin });
      setRecord(data.data);
    } else {
      setResult({ ok: false, text: AUTH_ERRORS[data?.result] || 'Semakan gagal.' });
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
      p_phone: identity.phone,
      p_pin: identity.pin,
      n_name: next.full_name,
      n_phone: next.phone_number,
      n_email: next.email,
      n_address: next.address,
    });
    setLoading(false);

    const messages = {
      ...AUTH_ERRORS,
      phone_taken: 'Nombor telefon baru itu sudah digunakan oleh ahli lain.',
      missing: 'Nama penuh dan nombor telefon wajib diisi.',
    };

    if (error) {
      console.error(error);
      setResult({ ok: false, text: 'Kemaskini gagal. Sila cuba lagi.' });
    } else if (data === 'ok') {
      setIdentity({ phone: next.phone_number, pin: identity.pin });
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
        <p>{record ? 'Ubah maklumat anda dan simpan' : 'Masukkan nombor telefon dan PIN anda'}</p>
      </div>

      <div className="card">
        {!record ? (
          <form onSubmit={handleVerify}>
            <label htmlFor="phone">Nombor Telefon <span className="req">*</span></label>
            <input id="phone" name="phone" type="tel" placeholder="Seperti semasa mendaftar" required />
            <label htmlFor="pin">PIN (6 digit) <span className="req">*</span></label>
            <input id="pin" name="pin" type="password" inputMode="numeric" pattern="[0-9]{6}" maxLength={6}
              placeholder="••••••" autoComplete="one-time-code" required />
            <button type="submit" disabled={loading}>{loading ? 'Menyemak...' : 'Teruskan'}</button>
            <p className="detail small" style={{ textAlign: 'center' }}>
              Lupa PIN atau belum ada PIN? Sila hubungi admin untuk mendapatkan PIN baharu.
            </p>
          </form>
        ) : (
          <form onSubmit={handleUpdate} key={`${record.full_name}|${record.phone_number}`}>
            <div className="detail small" style={{ marginTop: 0 }}>
              Status keahlian: <strong>{STATUS_LABEL[record.membership_status] || record.membership_status}</strong>
            </div>
            <label htmlFor="full_name">Nama Penuh <span className="req">*</span></label>
            <input id="full_name" name="full_name" defaultValue={record.full_name} required maxLength={120} />
            <label htmlFor="phone_number">Nombor Telefon <span className="req">*</span></label>
            <input id="phone_number" name="phone_number" type="tel" defaultValue={record.phone_number} required maxLength={20} />
            <label htmlFor="email">Email</label>
            <input id="email" name="email" type="email" defaultValue={record.email || ''} maxLength={254} />
            <label htmlFor="address">Alamat</label>
            <textarea id="address" name="address" rows={3} defaultValue={record.address || ''} maxLength={300} />
            <button type="submit" disabled={loading}>{loading ? 'Menyimpan...' : 'Simpan Perubahan'}</button>
            <button type="button" className="ghost dark" style={{ width: '100%', marginTop: 10 }} onClick={reset}>
              Selesai
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
