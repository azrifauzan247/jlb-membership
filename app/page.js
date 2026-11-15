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
      <div className="card">
        <h1>Pendaftaran Keahlian JLB</h1>
        <form onSubmit={handleSubmit}>
          <label htmlFor="full_name">Nama Penuh *</label>
          <input id="full_name" name="full_name" required />

          <label htmlFor="phone_number">Nombor Telefon *</label>
          <input id="phone_number" name="phone_number" type="tel" required />

          <label htmlFor="email">Email</label>
          <input id="email" name="email" type="email" />

          <label htmlFor="address">Alamat</label>
          <textarea id="address" name="address" rows={3} />

          <button type="submit" disabled={loading}>
            {loading ? 'Menghantar...' : 'Daftar'}
          </button>
        </form>
        {result && (
          <div className={`msg ${result.ok ? 'ok' : 'err'}`}>{result.text}</div>
        )}
      </div>
    </main>
  );
}
