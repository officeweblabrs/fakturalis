'use client';
import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { supabase } from '../../lib/supabase';
import { money, dmy, todayStr, effectiveStatus, STATUS_LABEL } from '../../lib/format';
import { exportXlsx } from '../../lib/export';

export default function Invoices() {
  const thisYear = new Date().getFullYear();
  const [year, setYear] = useState(thisYear);
  const [rows, setRows] = useState([]);
  const [err, setErr] = useState('');

  const load = useCallback(async () => {
    const { data, error } = await supabase
      .from('invoices')
      .select('*')
      .gte('issue_date', `${year}-01-01`)
      .lte('issue_date', `${year}-12-31`)
      .order('issue_date', { ascending: false })
      .order('created_at', { ascending: false });
    if (error) setErr(error.message);
    setRows(data || []);
  }, [year]);

  useEffect(() => {
    load();
  }, [load]);

  const setStatus = async (inv, status) => {
    const patch = { status, paid_date: status === 'paid' ? inv.paid_date || todayStr() : null };
    const { error } = await supabase.from('invoices').update(patch).eq('id', inv.id);
    if (error) setErr(error.message);
    load();
  };

  const remove = async (inv) => {
    if (!confirm(`Obrisati fakturu ${inv.number}? Ovo se ne može poništiti.`)) return;
    const { error } = await supabase.from('invoices').delete().eq('id', inv.id);
    if (error) setErr(error.message);
    load();
  };

  const counted = rows.filter((r) => !['draft', 'cancelled'].includes(r.status));
  const total = counted.reduce((s, r) => s + Number(r.amount_rsd || 0), 0);

  const doExport = () =>
    exportXlsx(`fakture-${year}.xlsx`, {
      Fakture: rows.map((r) => ({
        Broj: r.number,
        Klijent: r.client_snapshot?.name || '',
        'Datum izdavanja': r.issue_date,
        'Rok plaćanja': r.due_date,
        Valuta: r.currency,
        Iznos: Number(r.total),
        Kurs: Number(r.exchange_rate),
        'Iznos u RSD': Number(r.amount_rsd),
        Status: STATUS_LABEL[effectiveStatus(r)],
        'Datum uplate': r.paid_date || '',
      })),
    });

  return (
    <>
      <div className="row" style={{ justifyContent: 'space-between', marginBottom: 16 }}>
        <h1 style={{ margin: 0 }}>Fakture</h1>
        <div className="row">
          <select style={{ width: 'auto' }} value={year} onChange={(e) => setYear(Number(e.target.value))}>
            {[thisYear + 1, thisYear, thisYear - 1, thisYear - 2].map((y) => (
              <option key={y}>{y}</option>
            ))}
          </select>
          <button className="btn" onClick={doExport} disabled={!rows.length}>Izvezi u Excel</button>
          <Link href="/invoices/new" className="btn primary">+ Nova faktura</Link>
        </div>
      </div>

      {err && <div className="err">{err}</div>}

      <div className="card">
        <div className="muted" style={{ marginBottom: 8 }}>
          Ukupno u {year}. (bez nacrta i storniranih): <b>{money(total)}</b>
        </div>
        <div className="tablewrap">
          <table className="t">
            <thead>
              <tr>
                <th>Broj</th><th>Klijent</th><th>Izdata</th><th>Rok</th>
                <th className="r">Iznos</th><th className="r">U RSD</th><th>Status</th><th></th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 && (
                <tr><td colSpan={8} className="muted">Još nema faktura za {year}.</td></tr>
              )}
              {rows.map((r) => {
                const st = effectiveStatus(r);
                return (
                  <tr key={r.id}>
                    <td><Link href={`/invoices/${r.id}`}>{r.number}</Link></td>
                    <td>{r.client_snapshot?.name}</td>
                    <td>{dmy(r.issue_date)}</td>
                    <td>{dmy(r.due_date)}</td>
                    <td className="r">{money(r.total, r.currency)}</td>
                    <td className="r">{r.currency !== 'RSD' ? money(r.amount_rsd) : ''}</td>
                    <td>
                      <select
                        value={r.status}
                        onChange={(e) => setStatus(r, e.target.value)}
                        style={{ width: 'auto', padding: '2px 6px' }}
                        title={STATUS_LABEL[st]}
                      >
                        <option value="draft">Nacrt</option>
                        <option value="sent">Poslata</option>
                        <option value="paid">Plaćena</option>
                        <option value="cancelled">Stornirana</option>
                      </select>
                      {st === 'overdue' && <span className="badge overdue" style={{ marginLeft: 6 }}>Kasni</span>}
                    </td>
                    <td className="r" style={{ whiteSpace: 'nowrap' }}>
                      <Link href={`/invoices/${r.id}/print`} className="btn small">PDF / Mejl</Link>{' '}
                      <button className="btn small danger" onClick={() => remove(r)}>Obriši</button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
