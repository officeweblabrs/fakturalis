'use client';
import { useEffect, useState } from 'react';
import { useSettings } from '../../lib/settings';
import { normalizeAccount } from '../../lib/payment';

const TEXT = [
  ['business_name', 'Naziv radnje (npr. PR ...)'],
  ['owner_name', 'Ime i prezime vlasnika'],
  ['tax_id', 'PIB'],
  ['reg_no', 'Matični broj'],
  ['activity_code', 'Šifra delatnosti'],
  ['email', 'Mejl (za fakture)'],
  ['phone', 'Telefon'],
  ['bank_account', 'Tekući račun (dinarski)'],
];

export default function Settings() {
  const { settings, loaded, save } = useSettings();
  const [s, setS] = useState(settings);
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');

  useEffect(() => {
    if (loaded) setS(settings);
  }, [loaded, settings]);

  const set = (k, v) => setS((p) => ({ ...p, [k]: v }));
  const setRem = (i, k, v) =>
    setS((p) => ({ ...p, reminders: p.reminders.map((r, idx) => (idx === i ? { ...r, [k]: v } : r)) }));

  const acc = normalizeAccount(s.bank_account);

  const submit = async (e) => {
    e.preventDefault();
    setMsg('');
    setErr('');
    if (s.payment_code && !/^[12]\d{2}$/.test(String(s.payment_code))) {
      return setErr('Šifra plaćanja mora imati 3 cifre i počinjati sa 1 ili 2 (npr. 221).');
    }
    const error = await save({
      ...s,
      due_days: Number(s.due_days) || 0,
      limit1: Number(s.limit1) || 0,
      limit2: Number(s.limit2) || 0,
      reminders: (s.reminders || []).map((r) => ({
        label: r.label,
        day: Number(r.day) || 1,
        month: r.month === '' || r.month == null ? null : Number(r.month),
      })),
    });
    if (error) setErr(error.message);
    else setMsg('Sačuvano.');
  };

  return (
    <form onSubmit={submit}>
      <h1>Podešavanja</h1>

      <div className="card">
        <h2>Podaci o firmi (prikazuju se na fakturi)</h2>
        {s.bank_account ? (
          <p style={{ fontSize: 13, margin: '0 0 12px', color: acc ? (acc.valid ? '#1a7f4b' : '#b42318') : '#b42318' }}>
            {acc
              ? acc.valid
                ? `Račun je ispravan (${acc.pretty}) — QR kod za uplatu će se prikazivati na fakturi.`
                : 'Kontrolni broj računa nije ispravan — proveri unos. Bez ispravnog računa nema QR koda.'
              : 'Format računa nije prepoznat. Primer: 205-0000000012345-67'}
          </p>
        ) : (
          <p className="muted" style={{ fontSize: 13, margin: '0 0 12px' }}>
            Unesi tekući račun (npr. 205-0000000012345-67) da bi se na fakturi prikazao QR kod za m-banking.
          </p>
        )}
        <div className="fields">
          {TEXT.map(([k, label]) => (
            <div key={k}>
              <label>{label}</label>
              <input value={s[k] || ''} onChange={(e) => set(k, e.target.value)} />
            </div>
          ))}
          <div>
            <label>Šifra plaćanja</label>
            <input maxLength={3} value={s.payment_code || ''} onChange={(e) => set('payment_code', e.target.value)} />
            <div className="muted" style={{ fontSize: 11, marginTop: 4 }}>221 = bezgotovinska uplata (m-banking), 121 = gotovinska. Proveri sa knjigovođom.</div>
          </div>
          <div className="wide">
            <label>Adresa</label>
            <textarea value={s.address || ''} onChange={(e) => set('address', e.target.value)} />
          </div>
          <div className="wide">
            <label>Dodatni podaci za uplatu (npr. devizni račun, IBAN, SWIFT — za strane klijente)</label>
            <textarea value={s.payment_info || ''} onChange={(e) => set('payment_info', e.target.value)} />
          </div>
          <div className="wide">
            <label>Podrazumevana napomena na fakturi (proveri tekst sa knjigovođom)</label>
            <textarea value={s.invoice_note || ''} onChange={(e) => set('invoice_note', e.target.value)} />
          </div>
          <div>
            <label>Podrazumevani rok plaćanja (dana)</label>
            <input type="number" value={s.due_days} onChange={(e) => set('due_days', e.target.value)} />
          </div>
        </div>
      </div>

      <div className="card">
        <h2>Limiti prometa (RSD)</h2>
        <div className="fields">
          <div>
            <label>Limit 1</label>
            <input type="number" value={s.limit1} onChange={(e) => set('limit1', e.target.value)} />
          </div>
          <div>
            <label>Limit 2</label>
            <input type="number" value={s.limit2} onChange={(e) => set('limit2', e.target.value)} />
          </div>
        </div>
        <p className="muted" style={{ fontSize: 12 }}>Iznosi se menjaju zakonom — ažuriraj ih ovde kad se promene.</p>
      </div>

      <div className="card">
        <h2>Podsetnici za rokove</h2>
        <p className="muted" style={{ fontSize: 12, marginTop: 0 }}>
          Mesec ostavi prazan za mesečni rok. Podrazumevani rokovi su okvirni — proveri ih i prilagodi.
        </p>
        {(s.reminders || []).map((r, i) => (
          <div key={i} className="fields" style={{ marginBottom: 8, gridTemplateColumns: '2fr 1fr 1fr auto' }}>
            <div><label>Naziv</label><input value={r.label} onChange={(e) => setRem(i, 'label', e.target.value)} /></div>
            <div><label>Dan u mesecu</label><input type="number" min="1" max="28" value={r.day} onChange={(e) => setRem(i, 'day', e.target.value)} /></div>
            <div><label>Mesec (1–12, prazno = svaki)</label><input type="number" min="1" max="12" value={r.month ?? ''} onChange={(e) => setRem(i, 'month', e.target.value)} /></div>
            <div style={{ alignSelf: 'end' }}>
              <button type="button" className="btn small danger" onClick={() => setS((p) => ({ ...p, reminders: p.reminders.filter((_, idx) => idx !== i) }))}>×</button>
            </div>
          </div>
        ))}
        <button type="button" className="btn small" onClick={() => setS((p) => ({ ...p, reminders: [...(p.reminders || []), { label: '', day: 15, month: null }] }))}>
          + Dodaj podsetnik
        </button>
      </div>

      {err && <div className="err">{err}</div>}
      {msg && <div className="ok">{msg}</div>}
      <button className="btn primary">Sačuvaj podešavanja</button>
    </form>
  );
}
