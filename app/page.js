'use client';
import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { supabase } from '../lib/supabase';
import { useSettings } from '../lib/settings';
import { money, num, todayStr, dmy, effectiveStatus, addDays } from '../lib/format';

const MONTHS = ['jan', 'feb', 'mar', 'apr', 'maj', 'jun', 'jul', 'avg', 'sep', 'okt', 'nov', 'dec'];
const sum = (arr, k) => arr.reduce((s, x) => s + Number(x[k] || 0), 0);
const mil = (n) => `${(n / 1e6).toFixed(2).replace(/\.?0+$/, '').replace('.', ',')} mil.`;

function nextOccurrence(rem, today) {
  const [y, m] = today.split('-').map(Number);
  const pad = (n) => String(n).padStart(2, '0');
  for (let add = 0; add < 24; add++) {
    const mm0 = m - 1 + add;
    const yy = y + Math.floor(mm0 / 12);
    const mm = (mm0 % 12) + 1;
    if (rem.month && Number(rem.month) !== mm) continue;
    const d = `${yy}-${pad(mm)}-${pad(Math.min(Number(rem.day) || 1, 28))}`;
    if (d >= today) return d;
  }
  return null;
}

function greeting() {
  const h = new Date().getHours();
  return h < 11 ? 'Dobro jutro' : h < 18 ? 'Dobar dan' : 'Dobro veče';
}

export default function Dashboard() {
  const { settings } = useSettings();
  const thisYear = new Date().getFullYear();
  const [year, setYear] = useState(thisYear);
  const [inv, setInv] = useState([]);
  const [exp, setExp] = useState([]);
  const [pay, setPay] = useState([]);
  const [shown, setShown] = useState(false);
  const today = todayStr();

  useEffect(() => {
    (async () => {
      const [a, b, c] = await Promise.all([
        supabase.from('invoices').select('*').gte('issue_date', `${year - 1}-01-01`).lte('issue_date', `${year}-12-31`),
        supabase.from('expenses').select('*').gte('date', `${year}-01-01`).lte('date', `${year}-12-31`),
        supabase.from('payments').select('*').gte('date', `${year}-01-01`).lte('date', `${year}-12-31`),
      ]);
      setInv(a.data || []);
      setExp(b.data || []);
      setPay(c.data || []);
      setShown(true);
    })();
  }, [year]);

  const d = useMemo(() => {
    const counted = (i) => !['draft', 'cancelled'].includes(i.status);
    const yearInv = inv.filter((i) => i.issue_date.startsWith(String(year)) && counted(i));
    const from12 = addDays(today, -365);
    const roll = inv.filter((i) => counted(i) && i.issue_date > from12 && i.issue_date <= today);
    const open = inv.filter((i) => i.status === 'sent');
    const turnover = sum(yearInv, 'amount_rsd');
    const paid = sum(yearInv.filter((i) => i.status === 'paid'), 'amount_rsd');
    const expenses = sum(exp, 'amount_rsd');
    const taxes = sum(pay, 'amount');
    return { turnover, paid, rolling: sum(roll, 'amount_rsd'), open, openSum: sum(open, 'amount_rsd'), expenses, taxes, net: turnover - expenses - taxes };
  }, [inv, exp, pay, year, today]);

  const reminders = useMemo(
    () =>
      (settings.reminders || [])
        .map((r) => ({ ...r, date: nextOccurrence(r, today) }))
        .filter((r) => r.date)
        .sort((a, b) => a.date.localeCompare(b.date)),
    [settings.reminders, today]
  );
  const daysTo = (date) => Math.round((new Date(date) - new Date(today)) / 86400000);

  const limit1 = Number(settings.limit1) || 0;
  const limit2 = Number(settings.limit2) || 0;
  const pct = limit1 > 0 ? (d.turnover / limit1) * 100 : 0;
  const pctRoll = limit1 > 0 ? (d.rolling / limit1) * 100 : 0;
  const over = pct >= 90;
  const firstName = (settings.owner_name || '').trim().split(/\s+/)[0];
  const ticks = [0, 1 / 3, 2 / 3, 1].map((f) => (f === 0 ? '0' : mil(limit1 * f)));

  return (
    <>
      <div className="page-head">
        <h1>{firstName ? `${greeting()}, ${firstName}` : 'Pregled'}</h1>
        <div className="row">
          <select style={{ width: 'auto' }} value={year} onChange={(e) => setYear(Number(e.target.value))} aria-label="Godina">
            {[thisYear, thisYear - 1, thisYear - 2].map((y) => (
              <option key={y}>{y}</option>
            ))}
          </select>
          <Link href="/invoices/new" className="btn primary">Nova faktura</Link>
        </div>
      </div>

      <section className="hero" aria-label="Limit prometa">
        <div className="hero-top">
          <div>
            <div className="hero-title">Promet u {year}. godini</div>
            <div className="hero-amount">{num(d.turnover)}<small>RSD</small></div>
            <div className="hero-of">od limita {money(limit1)}</div>
          </div>
          <div className={'hero-pct' + (over ? ' bad' : '')}>{pct.toFixed(0)}%</div>
        </div>

        <div className="ruler">
          {d.rolling > 0 && (
            <div className={'ruler-marker' + (pctRoll > 70 ? ' flip' : '')} style={{ left: Math.min(pctRoll, 100) + '%' }}>
              <span>poslednjih 12 meseci: {mil(d.rolling)}</span>
            </div>
          )}
          <div className="ruler-track">
            <div className={'ruler-fill' + (over ? ' bad' : '')} style={{ width: shown ? Math.min(pct, 100) + '%' : '0%' }} />
          </div>
          <div className="ruler-ticks" />
          <div className="ruler-labels">
            {ticks.map((t) => (
              <span key={t}>{t}</span>
            ))}
          </div>
        </div>

        <div className="hero-facts">
          <div>
            <b>{money(Math.max(0, limit1 - d.turnover))}</b>
            <span>preostalo do limita</span>
          </div>
          <div>
            <b>{money(d.rolling)}</b>
            <span>promet u poslednjih 12 meseci ({pctRoll.toFixed(0)}%)</span>
          </div>
          <div>
            <b>{limit2 > 0 ? ((d.turnover / limit2) * 100).toFixed(0) : 0}%</b>
            <span>drugog limita ({money(limit2)})</span>
          </div>
        </div>
      </section>

      <div className="strip">
        <div>
          <div className="lbl">Naplaćeno</div>
          <div className="val">{money(d.paid)}</div>
        </div>
        <div>
          <div className="lbl">Čeka naplatu</div>
          <div className="val">{money(d.openSum)}</div>
          <div className="sub">{d.open.length === 1 ? '1 faktura' : `${d.open.length} faktura`}</div>
        </div>
        <div>
          <div className="lbl">Troškovi</div>
          <div className="val">{money(d.expenses)}</div>
        </div>
        <div>
          <div className="lbl">Neto</div>
          <div className="val">{money(d.net)}</div>
          <div className="sub">promet − troškovi − doprinosi i porez</div>
        </div>
      </div>

      <div className="split">
        <div className="card">
          <div className="row" style={{ justifyContent: 'space-between', marginBottom: 6 }}>
            <h2 style={{ margin: 0 }}>Fakture koje čekaju uplatu</h2>
            <Link href="/invoices" className="btn small">Sve fakture</Link>
          </div>
          <div className="tablewrap">
            <table className="t">
              <tbody>
                {d.open.length === 0 && (
                  <tr><td className="empty">Nema faktura na čekanju. Kad pošalješ novu fakturu, pojaviće se ovde.</td></tr>
                )}
                {d.open.map((i) => {
                  const st = effectiveStatus(i);
                  return (
                    <tr key={i.id}>
                      <td><Link href={`/invoices/${i.id}`}>{i.number}</Link></td>
                      <td>{i.client_snapshot?.name}</td>
                      <td className="muted">rok {dmy(i.due_date)}</td>
                      <td className="r">{money(i.total, i.currency)}</td>
                      <td><span className={'badge ' + st}>{st === 'overdue' ? 'Kasni' : 'Poslata'}</span></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        <div className="card">
          <h2>Rokovi</h2>
          {reminders.length === 0 && <div className="empty">Nema podsetnika. Dodaj ih u Podešavanjima.</div>}
          {reminders.map((r, i) => {
            const n = daysTo(r.date);
            const [, mm, dd] = r.date.split('-');
            return (
              <div key={i} className={'deadline' + (n <= 5 ? ' soon' : '')}>
                <div className="date"><b>{Number(dd)}</b><span>{MONTHS[Number(mm) - 1]}</span></div>
                <div>
                  <div>{r.label}</div>
                  <div className="when">{n === 0 ? 'danas' : n === 1 ? 'sutra' : `za ${n} dana`}</div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </>
  );
}
