// Plaćanje: broj računa, poziv na broj i NBS IPS QR kod (za m-banking).
// Format koda prema NBS uputstvu: tagovi K, V, C, R, N, I, SF, S, RO razdvojeni sa "|".

const pad = (n) => String(n).padStart(2, '0');

// "205-0000000012345-67", "205 12345 67" ili 18 cifara -> { digits, pretty, valid }
export function normalizeAccount(input) {
  const raw = String(input || '').trim();
  if (!raw) return null;
  const parts = raw.split(/[^0-9]+/).filter(Boolean);
  let bank, acct, ctrl;
  if (parts.length === 3) {
    [bank, acct, ctrl] = parts;
  } else if (parts.length === 1 && parts[0].length === 18) {
    bank = parts[0].slice(0, 3);
    acct = parts[0].slice(3, 16);
    ctrl = parts[0].slice(16);
  } else {
    return null;
  }
  if (bank.length !== 3 || ctrl.length !== 2 || acct.length < 1 || acct.length > 13) return null;
  acct = acct.padStart(13, '0');
  const digits = bank + acct + ctrl;
  return { digits, pretty: `${bank}-${acct}-${ctrl}`, valid: BigInt(digits) % 97n === 1n };
}

export const paymentCode = (s) => (/^[12]\d{2}$/.test(String(s.payment_code || '')) ? String(s.payment_code) : '221');

// Poziv na broj: model 00 + cifre iz broja fakture (15/2026 -> 152026)
export function paymentReference(inv) {
  const number = String(inv.number || '').replace(/\D/g, '').slice(0, 20);
  return number ? { model: '00', number } : null;
}

export const paymentPurpose = (inv) => `Uplata po fakturi ${String(inv.number || '').replace(/\//g, '-')}`.slice(0, 35);

// Iznos koji klijent plaća u dinarima (za stranu valutu: protivvrednost po kursu)
export const amountRsd = (inv) =>
  Math.round(Number(inv.currency === 'RSD' ? inv.total : inv.amount_rsd) * 100) / 100 || 0;

export function buildIpsQr(inv, s) {
  const acc = normalizeAccount(s.bank_account);
  if (!acc || !acc.valid) return null;
  const amount = amountRsd(inv);
  if (!(amount > 0)) return null;
  const lines = [s.business_name || s.owner_name, ...String(s.address || '').split(/\r?\n/)]
    .map((x) => String(x || '').trim())
    .filter(Boolean)
    .slice(0, 3);
  const payee = lines.join('\r\n').slice(0, 70);
  const parts = [
    'K:PR',
    'V:01',
    'C:1',
    `R:${acc.digits}`,
    `N:${payee}`,
    `I:RSD${amount.toFixed(2).replace('.', ',')}`,
    `SF:${paymentCode(s)}`,
    `S:${paymentPurpose(inv)}`,
  ];
  const ref = paymentReference(inv);
  if (ref) parts.push(`RO:${ref.model}${ref.number}`);
  return parts.join('|');
}

export { pad };
