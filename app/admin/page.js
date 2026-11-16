'use client';

import { useCallback, useEffect, useState } from 'react';
import { supabase, TABLE_NAME } from '../supabase';

const FILTERS = [
  { key: 'pending', label: 'Menunggu' },
  { key: 'approved', label: 'Diluluskan' },
  { key: 'rejected', label: 'Ditolak' },
  { key: 'all', label: 'Semua' },
];
const STATUS_LABEL = { pending: 'Menunggu', approved: 'Diluluskan', rejected: 'Ditolak' };

export default function AdminPage() {
  const [session, setSession] = useState(undefined); // undefined = sedang semak
  const [isAdmin, setIsAdmin] = useState(null);
  const [members, setMembers] = useState([]);
  const [filter, setFilter] = useState('pending');
  const [busyId, setBusyId] = useState(null);
  const [loginError, setLoginError] = useState('');
  const [loginBusy, setLoginBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setSession(s));
    return () => sub.subscription.unsubscribe();
  }, []);

  const loadMembers = useCallback(async () => {
    setError('');
    const { data, error } = await supabase
      .from(TABLE_NAME)
      .select('*')
      .order('created_at', { ascending: false });
    if (error) {
      console.error(error);
      setError('Gagal memuatkan senarai ahli.');
    } else {
      setMembers(data);
    }
  }, []);

  useEffect(() => {
    if (!session) { setIsAdmin(null); setMembers([]); return; }
    supabase.rpc('is_admin').then(({ data, error }) => {
      if (error) console.error(error);
      setIsAdmin(data === true);
      if (data === true) loadMembers();
    });
  }, [session, loadMembers]);

  async function handleLogin(e) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    setLoginBusy(true);
    setLoginError('');
    const { error } = await supabase.auth.signInWithPassword({
      email: f.get('email').trim(),
      password: f.get('password'),
    });
    setLoginBusy(false);
    if (error) setLoginError('Emel atau kata laluan salah.');
  }

  async function setStatus(id, status) {
    setBusyId(id);
    setError('');
    const { error } = await supabase.from(TABLE_NAME).update({ membership_status: status }).eq('id', id);
    setBusyId(null);
    if (error) {
      console.error(error);
      setError('Gagal mengemas kini status.');
    } else {
      setMembers((ms) => ms.map((m) => (m.id === id ? { ...m, membership_status: status } : m)));
      setNotice('');
      if (status === 'approved' || status === 'rejected') await notifyMember(id, status);
    }
  }

  async function notifyMember(id, status) {
    const NOTES = {
      no_email: 'Status dikemas kini. Ahli ini tiada emel, jadi tiada notifikasi dihantar.',
      not_configured: 'Status dikemas kini, tetapi emel belum dikonfigurasi di Vercel.',
      send_failed: 'Status dikemas kini, tetapi emel gagal dihantar.',
    };
    try {
      const res = await fetch('/api/notify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
        body: JSON.stringify({ memberId: id, status }),
      });
      const out = await res.json();
      if (out.sent) setNotice('Status dikemas kini dan emel notifikasi telah dihantar kepada ahli.');
      else setNotice(NOTES[out.reason] || 'Status dikemas kini, tetapi emel tidak dapat dihantar.');
    } catch (e) {
      console.error(e);
      setNotice('Status dikemas kini, tetapi emel tidak dapat dihantar.');
    }
  }

  const counts = members.reduce((acc, m) => {
    acc[m.membership_status] = (acc[m.membership_status] || 0) + 1;
    return acc;
  }, {});
  const visible = filter === 'all' ? members : members.filter((m) => m.membership_status === filter);

  // 1. Sedang semak sesi
  if (session === undefined) {
    return <main className="wrap"><p className="foot">Memuatkan...</p></main>;
  }

  // 2. Belum log masuk
  if (!session) {
    return (
      <main className="wrap">
        <div className="hero">
          <img className="logo" src="/logo.jpg" alt="Logo JLB" />
          <h1>Log Masuk Admin</h1>
          <p>Untuk pentadbir JLB sahaja</p>
        </div>
        <div className="card">
          <form onSubmit={handleLogin}>
            <label htmlFor="email">Emel</label>
            <input id="email" name="email" type="email" required autoComplete="username" />
            <label htmlFor="password">Kata Laluan</label>
            <input id="password" name="password" type="password" required autoComplete="current-password" />
            <button type="submit" disabled={loginBusy}>{loginBusy ? 'Log masuk...' : 'Log Masuk'}</button>
          </form>
          {loginError && <div className="msg err">{loginError}</div>}
        </div>
      </main>
    );
  }

  // 3. Log masuk tetapi bukan admin
  if (isAdmin === false) {
    return (
      <main className="wrap">
        <div className="card">
          <h1 style={{ marginTop: 0 }}>Akses ditolak</h1>
          <p>Akaun ini tiada kebenaran admin.</p>
          <button onClick={() => supabase.auth.signOut()}>Log Keluar</button>
        </div>
      </main>
    );
  }

  // 4. Admin
  return (
    <main className="wrap wide">
      <div className="topbar">
        <div className="brand">
          <img src="/logo.jpg" alt="" />
          <strong>Panel Admin JLB</strong>
        </div>
        <button className="ghost" onClick={() => supabase.auth.signOut()}>Log Keluar</button>
      </div>

      <div className="tabs">
        {FILTERS.map((f) => (
          <button
            key={f.key}
            className={`tab ${filter === f.key ? 'active' : ''}`}
            onClick={() => setFilter(f.key)}
          >
            {f.label}
            <span className="count">{f.key === 'all' ? members.length : counts[f.key] || 0}</span>
          </button>
        ))}
      </div>

      {error && <div className="msg err">{error}</div>}
      {notice && <div className="msg ok">{notice}</div>}
      {isAdmin === null && <p className="foot">Memuatkan...</p>}
      {isAdmin && visible.length === 0 && <div className="card empty">Tiada rekod dalam kategori ini.</div>}

      {visible.map((m) => (
        <div className="card member" key={m.id}>
          <div className="member-head">
            <strong>{m.full_name}</strong>
            <span className={`badge ${m.membership_status}`}>
              {STATUS_LABEL[m.membership_status] || m.membership_status}
            </span>
          </div>
          <div className="detail">📞 {m.phone_number}</div>
          {m.email && <div className="detail">✉️ {m.email}</div>}
          {m.address && <div className="detail">📍 {m.address}</div>}
          <div className="detail small">
            Didaftar: {new Date(m.created_at).toLocaleString('ms-MY')}
          </div>
          <div className="actions">
            {m.membership_status !== 'approved' && (
              <button className="approve" disabled={busyId === m.id} onClick={() => setStatus(m.id, 'approved')}>
                Lulus
              </button>
            )}
            {m.membership_status !== 'rejected' && (
              <button className="reject" disabled={busyId === m.id} onClick={() => setStatus(m.id, 'rejected')}>
                Tolak
              </button>
            )}
            {m.membership_status !== 'pending' && (
              <button className="ghost dark" disabled={busyId === m.id} onClick={() => setStatus(m.id, 'pending')}>
                Set Menunggu
              </button>
            )}
          </div>
        </div>
      ))}
    </main>
  );
}
