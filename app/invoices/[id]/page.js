'use client';
import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { supabase } from '../../../lib/supabase';
import { useSettings } from '../../../lib/settings';
import { todayStr, addDays, num } from '../../../lib/format';

const EMPTY_PERSON = { name: '', phone: '', email: '' };
const emptyItem = () => ({ description: '', qty: 1, unit: 'kom', price: 0 });

function nextNumber(numbers, year) {
  let max = 0;
  const re = new RegExp(`^(\\d+)/${year}$`);
  for (const n of numbers) {
    const m = re.exec(n);
    if (m) max = Math.max(max, Number(m[1]));
  }
  return `${max + 1}/${year}`;
}

export default function InvoiceEditor() {
  const { id } = useParams();
  const router = useRouter();
  const isNew = id === 'new';
  const { settings, loaded } = useSettings();
  const [clients, setClients] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [numbers, setNumbers] = useState([]);
  const [ready, setReady] = useState(false);
  const [inv, setInv] = useState(null);
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    (async () => {
      const [c, t, n] = await Promise.all([
        supabase.from('clients').select('*').order('name'),
        supabase.from('item_templates').select('*').order('description'),
        supabase.from('invoices').select('id,number'),
      ]);
      setClients(c.data || []);
      setTemplates(t.data || []);
      setNumbers((n.data || []).map((x) => x.number));
      if (!isNew) {
        const { data, error } = await supabase.from('invoices').select('*').eq('id', id).single();
        if (error) setErr('Faktura nije pronađena.');
        else {
          const snap = data.client_snapshot || {};
          const type = snap.type || (data.client_id ? 'company' : 'person');
          setInv({
            ...data,
            customer_type: type,
            person:
              type === 'person'
                ? { name: snap.name || '', phone: snap.phone || '', email: snap.email || '' }
                : { name: '', phone: '', email: '' },
          });
        }
      }
      setReady(true);
    })();
  }, [id, isNew]);

  useEffect(() => {
    if (isNew && ready && loaded && !inv) {
      const t = todayStr();
      setInv({
        number: nextNumber(numbers, new Date().getFullYear()),
        customer_type: 'person',
        person: { name: '', phone: '', email: '' },
        client_id: '',
        issue_date: t,
        service_date: t,
        due_date: addDays(t, settings.due_days),
        currency: 'RSD',
        exchange_rate: 1,
        items: [emptyItem()],
        status: 'draft',
        paid_date: null,
        note: settings.invoice_note,
      });
    }
  }, [isNew, ready, loaded, inv, numbers, settings]);

  if (!inv) return err ? <div className="err">{err}</div> : <div className="muted">Učitavanje…</div>;

  const set = (k, v) => setInv((p) => ({ ...p, [k]: v }));
  const setPerson = (k, v) => setInv((p) => ({ ...p, person: { ...EMPTY_PERSON, ...p.person, [k]: v } }));
  const isPerson = (inv.customer_type || 'person') === 'person';
  const person = { ...EMPTY_PERSON, ...inv.person };
  const selectedClient = clients.find((c) => c.id === inv.client_id);
  const setItem = (i, k, v) =>
    setInv((p) => ({ ...p, items: p.items.map((it, idx) => (idx === i ? { ...it, [k]: v } : it)) }));
  const addItem = (it = emptyItem()) => setInv((p) => ({ ...p, items: [...p.items, it] }));
  const delItem = (i) => setInv((p) => ({ ...p, items: p.items.filter((_, idx) => idx !== i) }));

  const total = inv.items.reduce((s, it) => s + Number(it.qty || 0) * Number(it.price || 0), 0);
  const rate = inv.currency === 'RSD' ? 1 : Number(inv.exchange_rate || 0);

  const addTemplate = (tid) => {
    const t = templates.find((x) => x.id === tid);
    if (!t) return;
    const item = { description: t.description, qty: 1, unit: t.unit || 'kom', price: Number(t.price || 0) };
    // ako je samo jedna prazna stavka, zameni je
    if (inv.items.length === 1 && !inv.items[0].description && !Number(inv.items[0].price)) {
      setInv((p) => ({ ...p, items: [item] }));
    } else addItem(item);
  };

  const save = async (thenPrint) => {
    setErr('');
    if (!inv.number.trim()) return setErr('Unesi broj fakture.');
    if (isPerson) {
      if (!person.name.trim()) return setErr('Unesi ime i prezime kupca.');
      if (person.email.trim() && !person.email.includes('@')) return setErr('Mejl kupca nije ispravan.');
    } else if (!inv.client_id && !inv.client_snapshot) {
      return setErr('Izaberi pravno lice iz liste (ili ga prvo dodaj u Klijenti).');
    }
    if (inv.currency !== 'RSD' && !rate) return setErr('Unesi kurs za stranu valutu.');
    if (!inv.items.some((it) => it.description.trim())) return setErr('Dodaj bar jednu stavku sa opisom.');
    const client = clients.find((c) => c.id === inv.client_id);
    const snapshot = isPerson
      ? { type: 'person', name: person.name.trim(), phone: person.phone.trim(), email: person.email.trim() }
      : client
        ? { type: 'company', name: client.name, address: client.address, tax_id: client.tax_id, country: client.country, email: client.email }
        : inv.client_snapshot;
    const payload = {
      number: inv.number.trim(),
      client_id: isPerson ? null : inv.client_id || null,
      client_snapshot: snapshot,
      issue_date: inv.issue_date,
      service_date: inv.service_date || null,
      due_date: inv.due_date || null,
      currency: inv.currency,
      exchange_rate: rate,
      items: inv.items.filter((it) => it.description.trim()),
      total,
      amount_rsd: total * rate,
      status: inv.status,
      paid_date: inv.status === 'paid' ? inv.paid_date || todayStr() : null,
      note: inv.note,
    };
    setBusy(true);
    const q = isNew
      ? supabase.from('invoices').insert(payload).select().single()
      : supabase.from('invoices').update(payload).eq('id', id).select().single();
    const { data, error } = await q;
    setBusy(false);
    if (error) {
      return setErr(error.code === '23505' ? 'Faktura sa tim brojem već postoji.' : error.message);
    }
    router.push(thenPrint ? `/invoices/${data.id}/print` : '/invoices');
  };

  return (
    <>
      <h1>{isNew ? 'Nova faktura' : `Faktura ${inv.number}`}</h1>

      <div className="card">
        <h2>Kupac</h2>
        <div className="seg" data-value={isPerson ? 'person' : 'company'} role="radiogroup" aria-label="Vrsta kupca" style={{ marginBottom: 16 }}>
          <span className="seg-thumb" aria-hidden="true" />
          <button type="button" role="radio" aria-checked={isPerson} onClick={() => set('customer_type', 'person')}>
            Fizičko lice
          </button>
          <button type="button" role="radio" aria-checked={!isPerson} onClick={() => set('customer_type', 'company')}>
            Pravno lice
          </button>
        </div>
        {isPerson ? (
          <div className="fields">
            <div>
              <label htmlFor="p-name">Ime i prezime</label>
              <input id="p-name" value={person.name} onChange={(e) => setPerson('name', e.target.value)} autoComplete="off" />
            </div>
            <div>
              <label htmlFor="p-phone">Broj telefona</label>
              <input id="p-phone" type="tel" value={person.phone} onChange={(e) => setPerson('phone', e.target.value)} autoComplete="off" />
            </div>
            <div>
              <label htmlFor="p-email">Mejl</label>
              <input id="p-email" type="email" value={person.email} onChange={(e) => setPerson('email', e.target.value)} autoComplete="off" />
            </div>
          </div>
        ) : (
          <div>
            <div style={{ maxWidth: 420 }}>
              <label htmlFor="c-select">Pravno lice</label>
              <select id="c-select" value={inv.client_id || ''} onChange={(e) => set('client_id', e.target.value)}>
                <option value="">— izaberi —</option>
                {clients.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
            {selectedClient && (
              <div className="muted" style={{ marginTop: 8, fontSize: 13 }}>
                {[selectedClient.tax_id && `PIB / ID: ${selectedClient.tax_id}`, selectedClient.address, selectedClient.email]
                  .filter(Boolean)
                  .join(' · ')}
              </div>
            )}
            {clients.length === 0 && (
              <div className="muted" style={{ marginTop: 8 }}>
                Još nemaš pravnih lica. Dodaj ih u sekciji <a href="/clients">Klijenti</a>, pa ih ovde biraš sa liste.
              </div>
            )}
          </div>
        )}
      </div>

      <div className="card">
        <div className="fields">
          <div>
            <label>Broj fakture</label>
            <input value={inv.number} onChange={(e) => set('number', e.target.value)} />
          </div>
          <div>
            <label>Datum izdavanja</label>
            <input type="date" value={inv.issue_date} onChange={(e) => set('issue_date', e.target.value)} />
          </div>
          <div>
            <label>Datum prometa</label>
            <input type="date" value={inv.service_date || ''} onChange={(e) => set('service_date', e.target.value)} />
          </div>
          <div>
            <label>Rok plaćanja</label>
            <input type="date" value={inv.due_date || ''} onChange={(e) => set('due_date', e.target.value)} />
          </div>
          <div>
            <label>Status</label>
            <select value={inv.status} onChange={(e) => set('status', e.target.value)}>
              <option value="draft">Nacrt</option>
              <option value="sent">Poslata</option>
              <option value="paid">Plaćena</option>
              <option value="cancelled">Stornirana</option>
            </select>
          </div>
          <div>
            <label>Valuta</label>
            <select value={inv.currency} onChange={(e) => set('currency', e.target.value)}>
              <option>RSD</option>
              <option>EUR</option>
              <option>USD</option>
              <option>GBP</option>
              <option>CHF</option>
            </select>
          </div>
          {inv.currency !== 'RSD' && (
            <div>
              <label>Kurs (RSD za 1 {inv.currency}, srednji kurs NBS na dan prometa)</label>
              <input type="number" step="0.0001" value={inv.exchange_rate} onChange={(e) => set('exchange_rate', e.target.value)} />
            </div>
          )}
        </div>
      </div>

      <div className="card">
        <div className="row" style={{ justifyContent: 'space-between', marginBottom: 8 }}>
          <h2 style={{ margin: 0 }}>Stavke</h2>
          <div className="row">
            {templates.length > 0 && (
              <select style={{ width: 'auto' }} value="" onChange={(e) => addTemplate(e.target.value)}>
                <option value="">+ Dodaj iz šablona…</option>
                {templates.map((t) => (
                  <option key={t.id} value={t.id}>{t.description} ({num(t.price)} {t.currency})</option>
                ))}
              </select>
            )}
            <button className="btn small" onClick={() => addItem()}>+ Prazna stavka</button>
          </div>
        </div>
        <div className="tablewrap">
          <table className="t">
            <thead>
              <tr>
                <th>Opis</th><th style={{ width: 90 }}>Kol.</th><th style={{ width: 90 }}>Jedinica</th>
                <th style={{ width: 130 }}>Cena</th><th className="r" style={{ width: 130 }}>Iznos</th><th></th>
              </tr>
            </thead>
            <tbody>
              {inv.items.map((it, i) => (
                <tr key={i}>
                  <td><input value={it.description} onChange={(e) => setItem(i, 'description', e.target.value)} /></td>
                  <td><input type="number" step="any" value={it.qty} onChange={(e) => setItem(i, 'qty', e.target.value)} /></td>
                  <td><input value={it.unit} onChange={(e) => setItem(i, 'unit', e.target.value)} /></td>
                  <td><input type="number" step="any" value={it.price} onChange={(e) => setItem(i, 'price', e.target.value)} /></td>
                  <td className="r">{num(Number(it.qty || 0) * Number(it.price || 0))}</td>
                  <td className="r">
                    {inv.items.length > 1 && <button className="btn small danger" onClick={() => delItem(i)}>×</button>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div style={{ textAlign: 'right', marginTop: 12, fontSize: 18, fontWeight: 700 }}>
          Ukupno: {num(total)} {inv.currency}
          {inv.currency !== 'RSD' && (
            <div className="muted" style={{ fontSize: 13, fontWeight: 400 }}>≈ {num(total * rate)} RSD</div>
          )}
        </div>
      </div>

      <div className="card">
        <label>Napomena na fakturi</label>
        <textarea value={inv.note || ''} onChange={(e) => set('note', e.target.value)} />
      </div>

      {err && <div className="err">{err}</div>}
      <div className="row">
        <button className="btn primary" disabled={busy} onClick={() => save(false)}>Sačuvaj</button>
        <button className="btn" disabled={busy} onClick={() => save(true)}>Sačuvaj i otvori PDF / mejl</button>
        <button className="btn" onClick={() => router.push('/invoices')}>Otkaži</button>
      </div>
    </>
  );
}
