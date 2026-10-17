'use client';
import Crud from '../../components/Crud';
import { dmy, money, todayStr } from '../../lib/format';

const CATEGORIES = [
  'Softver i alati',
  'Marketing i reklame',
  'Hosting i domeni',
  'Oprema',
  'Kancelarijski materijal',
  'Putovanja',
  'Edukacija',
  'Knjigovodstvo',
  'Bankarske provizije',
  'Ostalo',
];

export default function Expenses() {
  return (
    <Crud
      table="expenses"
      title="Troškovi"
      dateKey="date"
      exportName="troskovi"
      fields={[
        { key: 'date', label: 'Datum', type: 'date', default: todayStr, required: true },
        { key: 'category', label: 'Kategorija', type: 'select', options: CATEGORIES, default: CATEGORIES[0] },
        { key: 'description', label: 'Opis', wide: true },
        { key: 'amount', label: 'Iznos', type: 'number', required: true },
        { key: 'currency', label: 'Valuta', type: 'select', options: ['RSD', 'EUR', 'USD', 'GBP'], default: 'RSD' },
        { key: 'exchange_rate', label: 'Kurs (za stranu valutu)', type: 'number', default: 1 },
      ]}
      beforeSave={(p) => {
        const rate = p.currency === 'RSD' ? 1 : Number(p.exchange_rate) || 0;
        p.exchange_rate = rate || 1;
        p.amount_rsd = p.amount * (rate || 1);
      }}
      columns={[
        { label: 'Datum', render: (r) => dmy(r.date) },
        { label: 'Kategorija', render: (r) => r.category },
        { label: 'Opis', render: (r) => r.description },
        { label: 'Iznos', right: true, render: (r) => money(r.amount, r.currency) },
        { label: 'U RSD', right: true, render: (r) => (r.currency !== 'RSD' ? money(r.amount_rsd) : '') },
      ]}
      exportMap={(r) => ({
        Datum: r.date,
        Kategorija: r.category,
        Opis: r.description,
        Iznos: Number(r.amount),
        Valuta: r.currency,
        Kurs: Number(r.exchange_rate),
        'Iznos u RSD': Number(r.amount_rsd),
      })}
      summary={(rows) => {
        const by = {};
        let total = 0;
        rows.forEach((r) => {
          by[r.category || 'Ostalo'] = (by[r.category || 'Ostalo'] || 0) + Number(r.amount_rsd || 0);
          total += Number(r.amount_rsd || 0);
        });
        return (
          <div>
            <b>Ukupno: {money(total)}</b>
            <div className="muted" style={{ fontSize: 13, marginTop: 4 }}>
              {Object.entries(by)
                .sort((a, b) => b[1] - a[1])
                .map(([k, v]) => `${k}: ${money(v)}`)
                .join(' · ')}
            </div>
          </div>
        );
      }}
    />
  );
}
