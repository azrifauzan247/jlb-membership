'use client';

import { useState } from 'react';
import { supabase } from '../supabase';

const MESSAGES = {
  pending: { ok: true, text: 'Pendaftaran anda sedang menunggu kelulusan.' },
  approved: { ok: true, text: 'Tahniah! Keahlian anda telah diluluskan.' },
  rejected: { ok: false, text: 'Maaf, permohonan anda tidak diluluskan.' },
  not_found: { ok: false, text: 'Nama tidak ditemui. Semak ejaan nama penuh anda.' },
  multiple: { ok: false, text: 'Ada lebih daripada satu nama yang sama. Sila hubungi admin.' },
};

export default function StatusPage() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);

  async function handleSubmit(e) {
    e.preventDefault();
    const name = new FormData(e.currentTarget).get('full_name').trim();
    setLoading(true);
    setResult(null);

    const { data, error } = await supabase.rpc('check_membership_status', { p_name: name });

    setLoading(false);
    if (error) {
      console.error(error);
      setResult({ ok: false, text: 'Semakan gagal. Sila cuba lagi.' });
    } else {
      setResult(MESSAGES[data] || { ok: false, text: `Status: ${data}` });
    }
  }

  return (
    <main className="wrap">
      <div className="card">
        <h1>Semak Status Keahlian</h1>
        <form onSubmit={handleSubmit}>
          <label htmlFor="full_name">Nama Penuh *</label>
          <input id="full_name" name="full_name" required />
          <button type="submit" disabled={loading}>
            {loading ? 'Menyemak...' : 'Semak'}
          </button>
        </form>
        {result && <div className={`msg ${result.ok ? 'ok' : 'err'}`}>{result.text}</div>}
        <p style={{ marginTop: 16, fontSize: '.9rem' }}>
          <a href="/">← Kembali ke pendaftaran</a>
        </p>
      </div>
    </main>
  );
}
