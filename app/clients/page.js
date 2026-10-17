'use client';
import Crud from '../../components/Crud';

export default function Clients() {
  return (
    <Crud
      table="clients"
      title="Klijenti"
      exportName="klijenti"
      fields={[
        { key: 'name', label: 'Naziv / ime', required: true },
        { key: 'tax_id', label: 'PIB / VAT ID' },
        { key: 'country', label: 'Država', default: 'Srbija' },
        { key: 'email', label: 'Mejl', type: 'email' },
        { key: 'address', label: 'Adresa', type: 'textarea', wide: true },
        { key: 'notes', label: 'Beleške', type: 'textarea', wide: true },
      ]}
      columns={[
        { label: 'Naziv', render: (r) => r.name },
        { label: 'PIB / ID', render: (r) => r.tax_id },
        { label: 'Država', render: (r) => r.country },
        { label: 'Mejl', render: (r) => r.email },
      ]}
      exportMap={(r) => ({ Naziv: r.name, 'PIB/ID': r.tax_id, Država: r.country, Mejl: r.email, Adresa: r.address })}
    />
  );
}
