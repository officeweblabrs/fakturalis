'use client';
import { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { supabase } from '../../../../lib/supabase';
import { useSettings } from '../../../../lib/settings';
import { buildInvoiceHtml, invoicePlainText } from '../../../../lib/invoiceHtml';
import { buildIpsQr } from '../../../../lib/payment';

export default function PrintInvoice() {
  const { id } = useParams();
  const { settings, loaded } = useSettings();
  const [inv, setInv] = useState(null);
  const [to, setTo] = useState('');
  const [msg, setMsg] = useState({ type: '', text: '' });
  const [busy, setBusy] = useState(false);
  const [qr, setQr] = useState({ svg: '', png: '', text: null });

  useEffect(() => {
    supabase
      .from('invoices')
      .select('*')
      .eq('id', id)
      .single()
      .then(({ data }) => {
        setInv(data);
        setTo(data?.client_snapshot?.email || '');
      });
  }, [id]);

  useEffect(() => {
    if (!inv || !loaded) return;
    const text = buildIpsQr(inv, settings);
    if (!text) return setQr({ svg: '', png: '', text: null });
    let off = false;
    Promise.all([
      QRCode.toString(text, { type: 'svg', margin: 0, errorCorrectionLevel: 'M' }),
      QRCode.toDataURL(text, { margin: 1, width: 300, errorCorrectionLevel: 'M' }),
    ])
      .then(([svg, png]) => {
        if (off) return;
        svg = svg.replace('<svg ', '<svg width="140" height="140" style="display:block" ');
        setQr({ svg, png, text });
      })
      .catch(() => !off && setQr({ svg: '', png: '', text: null }));
    return () => {
      off = true;
    };
  }, [inv, loaded, settings]);

  if (!inv || !loaded) return <div className="muted">Učitavanje…</div>;

  const seller = settings.business_name || settings.owner_name;
  const subject = `Faktura ${inv.number} – ${seller}`;

  const markSent = async () => {
    if (inv.status === 'draft') {
      await supabase.from('invoices').update({ status: 'sent' }).eq('id', id);
      setInv({ ...inv, status: 'sent' });
    }
  };

  const sendMail = async () => {
    setMsg({ type: '', text: '' });
    if (!to) return setMsg({ type: 'err', text: 'Unesi mejl primaoca.' });
    setBusy(true);
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const res = await fetch('/api/send-invoice', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
        body: JSON.stringify({
          to,
          subject,
          html: buildInvoiceHtml(inv, settings, {
            qrHtml: qr.png ? '<img src="cid:ipsqr" width="140" height="140" alt="IPS QR" style="display:block">' : '',
          }),
          qrPng: qr.png || undefined,
          replyTo: settings.email || undefined,
          fromName: seller,
        }),
      });
      const body = await res.json().catch(() => ({}));
      if (res.ok) {
        await markSent();
        setMsg({ type: 'ok', text: 'Poslato. Status fakture je postavljen na „Poslata”.' });
      } else if (res.status === 501) {
        setMsg({
          type: 'err',
          text: 'Slanje iz aplikacije nije podešeno (vidi README). Koristi dugme „Otvori u mejl programu” ispod.',
        });
      } else {
        setMsg({ type: 'err', text: body.error || 'Slanje nije uspelo.' });
      }
    } catch (e) {
      setMsg({ type: 'err', text: 'Slanje nije uspelo: ' + e.message });
    }
    setBusy(false);
  };

  const mailto = () => {
    const url = `mailto:${encodeURIComponent(to)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(
      invoicePlainText(inv, settings)
    )}`;
    window.location.href = url;
  };

  return (
    <>
      <div className="no-print card">
        <div className="row" style={{ justifyContent: 'space-between', marginBottom: 12 }}>
          <Link href="/invoices">← Sve fakture</Link>
          <div className="row">
            <Link href={`/invoices/${id}`} className="btn small">Izmeni</Link>
            <button className="btn primary" onClick={() => window.print()}>
              Štampaj / Sačuvaj kao PDF
            </button>
          </div>
        </div>
        <div className="row" style={{ alignItems: 'flex-end' }}>
          <div style={{ flex: 1, minWidth: 240 }}>
            <label>Pošalji klijentu (mejl)</label>
            <input type="email" value={to} onChange={(e) => setTo(e.target.value)} placeholder="klijent@primer.com" />
          </div>
          <button className="btn" disabled={busy} onClick={sendMail}>Pošalji iz aplikacije</button>
          <button className="btn" onClick={mailto}>Otvori u mejl programu</button>
        </div>
        {!qr.text && (
          <div className="err" style={{ marginTop: 8 }}>
            QR kod se ne prikazuje: u <Link href="/settings">Podešavanjima</Link> unesi ispravan tekući račun (npr. 205-0000000012345-67).
          </div>
        )}
        {msg.text && <div className={msg.type === 'ok' ? 'ok' : 'err'}>{msg.text}</div>}
        <p className="muted" style={{ fontSize: 12, margin: '8px 0 0' }}>
          Za PDF: klikni „Štampaj”, pa u prozoru za štampu izaberi „Sačuvaj kao PDF”. „Pošalji iz aplikacije” šalje
          fakturu u telu mejla; ako želiš PDF kao prilog, sačuvaj PDF i priloži ga ručno preko „Otvori u mejl programu”.
        </p>
      </div>
      <div className="card" dangerouslySetInnerHTML={{ __html: buildInvoiceHtml(inv, settings, { qrHtml: qr.svg }) }} />
    </>
  );
}
