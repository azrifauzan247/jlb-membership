'use client';

import { useState } from 'react';

const ERRORS = {
  phone_taken: 'Nombor telefon ini sudah didaftarkan.',
  invalid: 'Sila semak maklumat anda. Nama dan nombor telefon yang sah diperlukan.',
  rate_limited: 'Terlalu banyak percubaan. Sila cuba lagi sebentar nanti.',
};

export default function Home() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(null); // { pin, emailSent, hasEmail }

  async function handleSubmit(e) {
    e.preventDefault();
    const form = e.currentTarget;
    const data = new FormData(form);
    const payload = {
      full_name: data.get('full_name').trim(),
      phone_number: data.get('phone_number').trim(),
      email: data.get('email').trim(),
      address: data.get('address').trim(),
    };
    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const out = await res.json();
      if (out.result === 'ok') {
        setDone({ pin: out.pin, emailSent: out.emailSent, hasEmail: !!payload.email });
        form.reset();
      } else {
        setError(ERRORS[out.result] || 'Pendaftaran gagal. Sila cuba lagi.');
      }
    } catch (err) {
      console.error(err);
      setError('Pendaftaran gagal. Sila cuba lagi.');
    }
    setLoading(false);
  }

  return (
    <main className="wrap">
      <div className="hero">
        <img className="logo" src="/logo.jpg" alt="Logo JLB - Jadi Lebih Baik" />
        <h1>Pendaftaran Keahlian JLB</h1>
        <p>Sertai kami dengan mengisi borang di bawah</p>
      </div>
      <div className="card">
        {done ? (
          <div>
            <div className="msg ok" style={{ marginTop: 0 }}>
              Pendaftaran berjaya! Status anda: menunggu kelulusan.
            </div>
            <p style={{ marginBottom: 6 }}>PIN anda:</p>
            <div className="pin">{done.pin}</div>
            <p className="detail small">
              <strong>Simpan PIN ini.</strong> Anda memerlukannya (bersama nombor telefon) untuk mengemas kini
              maklumat. PIN ini tidak dipaparkan lagi selepas anda tutup halaman.
              {done.emailSent && ' Satu salinan juga telah dihantar ke emel anda.'}
              {done.hasEmail && !done.emailSent && ' Emel pengesahan tidak dapat dihantar, jadi sila catat PIN ini.'}
            </p>
            <button type="button" onClick={() => setDone(null)}>Daftar ahli lain</button>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <label htmlFor="full_name">Nama Penuh <span className="req">*</span></label>
            <input id="full_name" name="full_name" placeholder="Contoh: Ahmad bin Ali" required maxLength={120} />

            <label htmlFor="phone_number">Nombor Telefon <span className="req">*</span></label>
            <input id="phone_number" name="phone_number" type="tel" placeholder="Contoh: 0123456789" required maxLength={20} />

            <label htmlFor="email">Email</label>
            <input id="email" name="email" type="email" placeholder="nama@email.com (pilihan)" maxLength={254} />

            <label htmlFor="address">Alamat</label>
            <textarea id="address" name="address" rows={3} placeholder="Alamat (pilihan)" maxLength={300} />

            <button type="submit" disabled={loading}>{loading ? 'Menghantar...' : 'Daftar'}</button>
          </form>
        )}
        {error && <div className="msg err">{error}</div>}
        <p className="links">
          Sudah mendaftar? <a href="/status">Semak status</a> · <a href="/kemaskini">Kemaskini maklumat</a>
        </p>
      </div>
      <p className="foot">© JLB</p>
    </main>
  );
}
