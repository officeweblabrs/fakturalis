export const todayStr = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

export const num = (n) =>
  new Intl.NumberFormat('sr-RS', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(Number(n || 0));

export const money = (n, cur = 'RSD') => `${num(n)} ${cur}`;

export const dmy = (d) => (d ? d.split('-').reverse().join('.') + '.' : '');

export const addDays = (d, n) => {
  const x = new Date(d + 'T12:00:00');
  x.setDate(x.getDate() + Number(n || 0));
  return `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, '0')}-${String(x.getDate()).padStart(2, '0')}`;
};

export const STATUS_LABEL = { draft: 'Nacrt', sent: 'Poslata', paid: 'Plaćena', cancelled: 'Stornirana', overdue: 'Kasni' };

export const effectiveStatus = (inv) =>
  inv.status === 'sent' && inv.due_date && inv.due_date < todayStr() ? 'overdue' : inv.status;
