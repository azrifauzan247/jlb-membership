'use client';

import { useState } from 'react';
import { supabase, TABLE_NAME } from './supabase';

export default function Home() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);

  async function handleSubmit(e) {
    e.preventDefault();
    const form = e.currentTarget;
    const data = new FormData(form);
    setLoading(true);
    setResult(null);

    // Tiada .select() selepas insert, kerana pengguna awam tiada kebenaran SELECT
    const { error } = await supabase.from(TABLE_NAME).insert({
      full_name: data.get('full_name').trim(),
      phone_number: data.get('phone_number').trim(),
      email: data.get('email').trim() || null,
      address: data.get('address').trim() || null,
      membership_status: 'pending',
    });

    setLoading(false);
    if (error) {
      console.error(error);
      setResult({
        ok: false,
        text: error.code === '23505'
          ? 'Nombor telefon ini sudah didaftarkan.'
          : 'Pendaftaran gagal. Sila cuba lagi.',
      });
    } else {
      setResult({ ok: true, text: 'Pendaftaran berjaya! Status anda: menunggu kelulusan.' });
      form.reset();
    }
  }

  return (
    <main className="wrap">
      <div className="hero">
        <img className="logo" src="/logo.jpg" alt="Logo JLB - Jadi Lebih Baik" />
        <h1>Pendaftaran Keahlian JLB</h1>
        <p>Sertai kami dengan mengisi borang di bawah</p>
      </div>
      <div className="card">
        <form onSubmit={handleSubmit}>
          <label htmlFor="full_name">Nama Penuh <span className="req">*</span></label>
          <input id="full_name" name="full_name" placeholder="Contoh: Ahmad bin Ali" required />

          <label htmlFor="phone_number">Nombor Telefon <span className="req">*</span></label>
          <input id="phone_number" name="phone_number" type="tel" placeholder="Contoh: 0123456789" required />

          <label htmlFor="email">Email</label>
          <input id="email" name="email" type="email" placeholder="nama@email.com (pilihan)" />

          <label htmlFor="address">Alamat</label>
          <textarea id="address" name="address" rows={3} placeholder="Alamat (pilihan)" />

          <button type="submit" disabled={loading}>
            {loading ? 'Menghantar...' : 'Daftar'}
          </button>
        </form>
        {result && (
          <div className={`msg ${result.ok ? 'ok' : 'err'}`}>{result.text}</div>
        )}
        <p className="links">Sudah mendaftar? <a href="/status">Semak status</a> · <a href="/kemaskini">Kemaskini maklumat</a></p>
      </div>
      <p className="foot">© JLB</p>
    </main>
  );
}
