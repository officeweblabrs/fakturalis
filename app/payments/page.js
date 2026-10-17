'use client';
import Crud from '../../components/Crud';
import { dmy, money, todayStr } from '../../lib/format';

const KINDS = ['Penzijsko i invalidsko (PIO)', 'Zdravstveno osiguranje', 'Nezaposlenost', 'Porez', 'Ostalo'];

export default function Payments() {
  return (
    <Crud
      table="payments"
      title="Doprinosi i porez"
      dateKey="date"
      exportName="doprinosi-i-porez"
      fields={[
        { key: 'date', label: 'Datum uplate', type: 'date', default: todayStr, required: true },
        { key: 'kind', label: 'Vrsta', type: 'select', options: KINDS, default: KINDS[0] },
        { key: 'amount', label: 'Iznos (RSD)', type: 'number', required: true },
        { key: 'note', label: 'Napomena (npr. za koji mesec)', wide: true },
      ]}
      columns={[
        { label: 'Datum', render: (r) => dmy(r.date) },
        { label: 'Vrsta', render: (r) => r.kind },
        { label: 'Napomena', render: (r) => r.note },
        { label: 'Iznos', right: true, render: (r) => money(r.amount) },
      ]}
      exportMap={(r) => ({ Datum: r.date, Vrsta: r.kind, Napomena: r.note, 'Iznos (RSD)': Number(r.amount) })}
      summary={(rows) => (
        <b>Ukupno uplaćeno: {money(rows.reduce((s, r) => s + Number(r.amount || 0), 0))}</b>
      )}
    />
  );
}
