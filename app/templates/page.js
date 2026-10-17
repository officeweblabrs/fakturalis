'use client';
import Crud from '../../components/Crud';
import { money } from '../../lib/format';

export default function Templates() {
  return (
    <Crud
      table="item_templates"
      title="Šabloni stavki (paketi usluga)"
      fields={[
        { key: 'description', label: 'Opis usluge / paketa', required: true, wide: true },
        { key: 'unit', label: 'Jedinica', default: 'kom' },
        { key: 'price', label: 'Cena', type: 'number' },
        { key: 'currency', label: 'Valuta', type: 'select', options: ['RSD', 'EUR', 'USD', 'GBP'], default: 'RSD' },
      ]}
      columns={[
        { label: 'Opis', render: (r) => r.description },
        { label: 'Jedinica', render: (r) => r.unit },
        { label: 'Cena', right: true, render: (r) => money(r.price, r.currency) },
      ]}
    />
  );
}
