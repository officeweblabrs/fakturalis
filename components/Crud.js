'use client';
import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { exportXlsx } from '../lib/export';

// Generička stranica: forma za unos + tabela sa izmenom/brisanjem.
// fields: [{ key, label, type: text|number|date|select|textarea, options, default, required, wide }]
// columns: [{ label, render: (row) => node, right }]
export default function Crud({ table, title, fields, columns, dateKey, beforeSave, exportName, exportMap, summary }) {
  const thisYear = new Date().getFullYear();
  const initial = () => Object.fromEntries(fields.map((f) => [f.key, typeof f.default === 'function' ? f.default() : f.default ?? '']));
  const [rows, setRows] = useState([]);
  const [form, setForm] = useState(initial);
  const [editing, setEditing] = useState(null);
  const [year, setYear] = useState(thisYear);
  const [err, setErr] = useState('');

  const load = useCallback(async () => {
    let q = supabase.from(table).select('*');
    if (dateKey) {
      q = q.gte(dateKey, `${year}-01-01`).lte(dateKey, `${year}-12-31`).order(dateKey, { ascending: false });
    }
    q = q.order('created_at', { ascending: false });
    const { data, error } = await q;
    if (error) setErr(error.message);
    setRows(data || []);
  }, [table, dateKey, year]);

  useEffect(() => {
    load();
  }, [load]);

  const submit = async (e) => {
    e.preventDefault();
    setErr('');
    const payload = {};
    for (const f of fields) {
      let v = form[f.key];
      if (f.type === 'number') v = v === '' ? 0 : Number(v);
      if (v === '' && f.type !== 'number') v = null;
      payload[f.key] = v;
    }
    if (beforeSave) beforeSave(payload);
    const { error } = editing
      ? await supabase.from(table).update(payload).eq('id', editing)
      : await supabase.from(table).insert(payload);
    if (error) return setErr(error.message);
    setForm(initial());
    setEditing(null);
    load();
  };

  const edit = (row) => {
    setEditing(row.id);
    setForm(Object.fromEntries(fields.map((f) => [f.key, row[f.key] ?? ''])));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const remove = async (row) => {
    if (!confirm('Obrisati ovaj unos?')) return;
    const { error } = await supabase.from(table).delete().eq('id', row.id);
    if (error) setErr(error.message);
    load();
  };

  return (
    <>
      <div className="row" style={{ justifyContent: 'space-between', marginBottom: 16 }}>
        <h1 style={{ margin: 0 }}>{title}</h1>
        <div className="row">
          {dateKey && (
            <select style={{ width: 'auto' }} value={year} onChange={(e) => setYear(Number(e.target.value))}>
              {[thisYear + 1, thisYear, thisYear - 1, thisYear - 2].map((y) => (
                <option key={y}>{y}</option>
              ))}
            </select>
          )}
          {exportMap && (
            <button className="btn" disabled={!rows.length} onClick={() => exportXlsx(`${exportName}${dateKey ? '-' + year : ''}.xlsx`, { [title]: rows.map(exportMap) })}>
              Izvezi u Excel
            </button>
          )}
        </div>
      </div>

      <form className="card" onSubmit={submit}>
        <div className="fields">
          {fields.map((f) => (
            <div key={f.key} className={f.wide ? 'wide' : ''}>
              <label>{f.label}</label>
              {f.type === 'select' ? (
                <select value={form[f.key] ?? ''} onChange={(e) => setForm({ ...form, [f.key]: e.target.value })}>
                  {f.options.map((o) => (
                    <option key={o}>{o}</option>
                  ))}
                </select>
              ) : f.type === 'textarea' ? (
                <textarea value={form[f.key] ?? ''} onChange={(e) => setForm({ ...form, [f.key]: e.target.value })} />
              ) : (
                <input
                  type={f.type || 'text'}
                  step={f.type === 'number' ? 'any' : undefined}
                  required={f.required}
                  value={form[f.key] ?? ''}
                  onChange={(e) => setForm({ ...form, [f.key]: e.target.value })}
                />
              )}
            </div>
          ))}
        </div>
        {err && <div className="err">{err}</div>}
        <div className="row" style={{ marginTop: 12 }}>
          <button className="btn primary">{editing ? 'Sačuvaj izmene' : 'Dodaj'}</button>
          {editing && (
            <button type="button" className="btn" onClick={() => { setEditing(null); setForm(initial()); }}>
              Otkaži izmenu
            </button>
          )}
        </div>
      </form>

      <div className="card">
        {summary && <div style={{ marginBottom: 12 }}>{summary(rows)}</div>}
        <div className="tablewrap">
          <table className="t">
            <thead>
              <tr>
                {columns.map((c) => (
                  <th key={c.label} className={c.right ? 'r' : ''}>{c.label}</th>
                ))}
                <th></th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 && (
                <tr><td colSpan={columns.length + 1} className="muted">Još nema unosa.</td></tr>
              )}
              {rows.map((r) => (
                <tr key={r.id}>
                  {columns.map((c) => (
                    <td key={c.label} className={c.right ? 'r' : ''}>{c.render(r)}</td>
                  ))}
                  <td className="r" style={{ whiteSpace: 'nowrap' }}>
                    <button className="btn small" onClick={() => edit(r)}>Izmeni</button>{' '}
                    <button className="btn small danger" onClick={() => remove(r)}>Obriši</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
