'use client';
import { useState } from 'react';
import { supabase } from '../../lib/supabase';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [mode, setMode] = useState('in');
  const [err, setErr] = useState('');
  const [info, setInfo] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setErr('');
    setInfo('');
    setBusy(true);
    if (mode === 'in') {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) setErr('Mejl ili lozinka nisu tačni. Proveri ih i pokušaj ponovo.');
    } else {
      const { data, error } = await supabase.auth.signUp({ email, password });
      if (error) setErr(error.message);
      else if (!data.session) setInfo('Poslali smo ti mejl za potvrdu. Potvrdi nalog, pa se prijavi.');
    }
    setBusy(false);
  };

  return (
    <div className="login-wrap">
      <div className="login">
        <div className="card">
          <div className="brand">
            <span className="logo">F</span>Fakturalis
          </div>
          <p className="tag">Fakture, troškovi i limit prometa na jednom mestu.</p>
          <form onSubmit={submit}>
            <div style={{ marginBottom: 14 }}>
              <label htmlFor="email">Mejl</label>
              <input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
            </div>
            <div style={{ marginBottom: 16 }}>
              <label htmlFor="password">Lozinka</label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                minLength={6}
                required
              />
            </div>
            {err && <div className="err">{err}</div>}
            {info && <div className="ok">{info}</div>}
            <button className="btn primary" disabled={busy} style={{ width: '100%', padding: '10px 14px' }}>
              {mode === 'in' ? 'Prijavi se' : 'Napravi nalog'}
            </button>
          </form>
          <p className="muted" style={{ marginTop: 16, marginBottom: 0, fontSize: 13 }}>
            {mode === 'in' ? 'Nemaš nalog?' : 'Već imaš nalog?'}{' '}
            <a href="#" onClick={(e) => { e.preventDefault(); setMode(mode === 'in' ? 'up' : 'in'); }}>
              {mode === 'in' ? 'Napravi nalog' : 'Prijavi se'}
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
