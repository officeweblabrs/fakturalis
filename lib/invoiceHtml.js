import { num, dmy } from './format';
import { normalizeAccount, paymentCode, paymentReference, paymentPurpose, amountRsd } from './payment';

const esc = (s) =>
  String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const br = (s) => esc(s).replace(/\n/g, '<br>');

const BRAND = '#c4551f';
const MUTED = '#6b7280';
const LINE = '#e5e7eb';
const label = (t) => `<div style="color:${MUTED};font-size:11px;margin-bottom:2px">${t}</div>`;

// Jedna HTML šema za štampu/PDF i telo mejla (inline stilovi, tabele).
// opts.qrHtml: gotov <svg>/<img> sa IPS QR kodom (ako nema, QR polje se izostavlja).
export function buildInvoiceHtml(inv, s, opts = {}) {
  const c = inv.client_snapshot || {};
  const cur = inv.currency || 'RSD';
  const seller = s.business_name || s.owner_name;
  const isPerson = c.type ? c.type === 'person' : !inv.client_id;

  const rows = (inv.items || [])
    .map((it, i) => {
      const line = Number(it.qty || 0) * Number(it.price || 0);
      const td = `padding:9px 8px;border-bottom:1px solid ${LINE}`;
      return `<tr>
        <td style="${td}">${i + 1}</td>
        <td style="${td}">${esc(it.description)}</td>
        <td style="${td};text-align:right;white-space:nowrap">${esc(it.qty)} ${esc(it.unit)}</td>
        <td style="${td};text-align:right">${num(it.price)}</td>
        <td style="${td};text-align:right">${num(line)}</td>
      </tr>`;
    })
    .join('');

  const rsdLine =
    cur !== 'RSD'
      ? `<div style="margin-top:4px;color:${MUTED};font-size:13px">Srednji kurs: ${num(inv.exchange_rate)} RSD &middot; Protivvrednost: ${num(inv.amount_rsd)} RSD</div>`
      : '';

  // ---- Plaćanje ----
  const acc = normalizeAccount(s.bank_account);
  const ref = paymentReference(inv);
  const purpose = paymentPurpose(inv);
  const payAmount = amountRsd(inv);
  const payerLines = [c.name, isPerson ? '' : c.address].filter(Boolean);
  const payeeLines = [seller, ...String(s.address || '').split(/\r?\n/)].map((x) => x.trim()).filter(Boolean);

  const cell = (title, value, extra = '') =>
    `<td style="padding:6px 8px;border:1px solid #d1d5db;vertical-align:top;${extra}">${label(title)}<div style="font-size:14px">${value}</div></td>`;

  const slip = `<table style="width:100%;border-collapse:collapse">
      <tr>${cell('Uplatilac', payerLines.map(esc).join('<br>') || '&nbsp;', 'width:50%')}${cell('Svrha uplate', esc(purpose), 'width:50%')}</tr>
      <tr>${cell('Primalac', payeeLines.map(esc).join('<br>'), '')}${cell(
        'Račun primaoca',
        acc ? `<b>${esc(acc.pretty)}</b>` : esc(s.bank_account || '—'),
        ''
      )}</tr>
      <tr><td colspan="2" style="padding:0">
        <table style="width:100%;border-collapse:collapse"><tr>
          ${cell('Šifra plaćanja', esc(paymentCode(s)), 'width:25%')}
          ${cell('Valuta', 'RSD', 'width:20%')}
          ${cell('Iznos', `<b>${num(payAmount)}</b>`, 'width:55%;text-align:right')}
        </tr></table>
      </td></tr>
      <tr><td colspan="2" style="padding:0">
        <table style="width:100%;border-collapse:collapse"><tr>
          ${cell('Model', ref ? esc(ref.model) : '—', 'width:25%')}
          ${cell('Poziv na broj (odobrenje)', ref ? `<b>${esc(ref.number)}</b>` : '—', 'width:75%')}
        </tr></table>
      </td></tr>
    </table>`;

  const payment = `<div style="margin-top:28px;border-top:2px solid ${BRAND};padding-top:14px">
    <div style="font-size:15px;font-weight:bold;color:${BRAND};margin-bottom:10px">Plaćanje</div>
    <table style="width:100%;border-collapse:collapse"><tr>
      ${
        opts.qrHtml
          ? `<td style="vertical-align:top;width:176px;padding-right:16px">
              <div style="border:1px solid ${LINE};padding:6px;width:152px;height:152px;line-height:0">${opts.qrHtml}</div>
              <div style="color:${MUTED};font-size:11px;line-height:1.35;margin-top:6px;width:160px">Skeniraj u aplikaciji svoje banke (IPS QR) — iznos i poziv na broj se popune sami.</div>
            </td>`
          : ''
      }
      <td style="vertical-align:top">
        <div style="color:${MUTED};font-size:12px;margin-bottom:6px">Ili uplati običnom uplatnicom / prebacivanjem na račun:</div>
        ${slip}
        ${inv.currency !== 'RSD' ? `<div style="color:${MUTED};font-size:11px;margin-top:4px">Iznos u dinarima po srednjem kursu NBS.</div>` : ''}
      </td>
    </tr></table>
    ${s.payment_info ? `<div style="margin-top:10px;font-size:12px;color:#444">${br(s.payment_info)}</div>` : ''}
  </div>`;

  return `<div style="font-family:Arial,Helvetica,sans-serif;color:#111;max-width:760px;margin:0 auto;padding:24px;font-size:14px;line-height:1.45">
  <table style="width:100%;border-collapse:collapse"><tr>
    <td style="vertical-align:top">
      <div style="font-size:18px;font-weight:bold">${esc(seller)}</div>
      ${s.business_name && s.owner_name ? `<div>${esc(s.owner_name)}</div>` : ''}
      <div>${br(s.address)}</div>
      ${s.tax_id ? `<div>PIB: ${esc(s.tax_id)}</div>` : ''}
      ${s.reg_no ? `<div>Matični broj: ${esc(s.reg_no)}</div>` : ''}
      ${s.activity_code ? `<div>Šifra delatnosti: ${esc(s.activity_code)}</div>` : ''}
      ${s.email ? `<div>${esc(s.email)}</div>` : ''}
      ${s.phone ? `<div>${esc(s.phone)}</div>` : ''}
    </td>
    <td style="vertical-align:top;text-align:right">
      <div style="font-size:24px;font-weight:bold;color:${BRAND}">FAKTURA</div>
      <div style="font-size:16px">br. ${esc(inv.number)}</div>
    </td>
  </tr></table>

  <table style="width:100%;border-collapse:collapse;margin-top:22px"><tr>
    <td style="vertical-align:top;width:55%">
      ${label('Kupac')}
      <div style="font-weight:bold">${esc(c.name)}</div>
      ${
        isPerson
          ? `${c.phone ? `<div>Tel: ${esc(c.phone)}</div>` : ''}${c.email ? `<div>${esc(c.email)}</div>` : ''}`
          : `<div>${br(c.address)}</div>
      ${c.country ? `<div>${esc(c.country)}</div>` : ''}
      ${c.tax_id ? `<div>PIB / ID: ${esc(c.tax_id)}</div>` : ''}`
      }
    </td>
    <td style="vertical-align:top;text-align:right">
      <div>Datum izdavanja: <b>${dmy(inv.issue_date)}</b></div>
      <div>Datum prometa: <b>${dmy(inv.service_date || inv.issue_date)}</b></div>
      <div>Rok plaćanja: <b>${dmy(inv.due_date)}</b></div>
    </td>
  </tr></table>

  <table style="width:100%;border-collapse:collapse;margin-top:22px">
    <thead><tr style="background:#faf3ee;color:#7a3511">
      <th style="padding:8px;text-align:left;width:32px">#</th>
      <th style="padding:8px;text-align:left">Opis</th>
      <th style="padding:8px;text-align:right">Količina</th>
      <th style="padding:8px;text-align:right">Cena (${esc(cur)})</th>
      <th style="padding:8px;text-align:right">Iznos (${esc(cur)})</th>
    </tr></thead>
    <tbody>${rows}</tbody>
  </table>

  <div style="text-align:right;margin-top:16px">
    <div style="color:${MUTED};font-size:12px">Ukupno za uplatu</div>
    <div style="font-size:26px;font-weight:bold;color:${BRAND}">${num(inv.total)} ${esc(cur)}</div>
    ${rsdLine}
  </div>

  ${payment}

  ${inv.note ? `<div style="margin-top:20px;font-size:12px;color:#444">${br(inv.note)}</div>` : ''}
</div>`;
}

export function invoicePlainText(inv, s) {
  const seller = s.business_name || s.owner_name;
  const acc = normalizeAccount(s.bank_account);
  const ref = paymentReference(inv);
  return [
    `Poštovani,`,
    ``,
    `faktura br. ${inv.number} u iznosu od ${num(inv.total)} ${inv.currency}.`,
    `Rok plaćanja: ${dmy(inv.due_date)}`,
    ``,
    `Podaci za uplatu:`,
    `Primalac: ${seller}`,
    s.bank_account ? `Račun: ${acc ? acc.pretty : s.bank_account}` : '',
    `Iznos: ${num(amountRsd(inv))} RSD`,
    `Šifra plaćanja: ${paymentCode(s)}`,
    ref ? `Model i poziv na broj: ${ref.model} ${ref.number}` : '',
    `Svrha: ${paymentPurpose(inv)}`,
    ``,
    `Srdačan pozdrav,`,
    seller,
  ]
    .filter((x) => x !== '')
    .join('\n');
}
