'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { supabase } from '../lib/supabase';

const ICONS = {
  home: 'M3 11l9-8 9 8v10a1 1 0 0 1-1 1h-5v-7H9v7H4a1 1 0 0 1-1-1z',
  file: 'M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z M14 3v5h5 M9 13h6 M9 17h6',
  wallet: 'M3 7a2 2 0 0 1 2-2h13v4 M3 7v10a2 2 0 0 0 2 2h14a1 1 0 0 0 1-1v-9a1 1 0 0 0-1-1H5a2 2 0 0 1-2-2z M16 14h2',
  bank: 'M3 21h18 M5 21V10 M9 21V10 M15 21V10 M19 21V10 M2 10l10-6 10 6z',
  users: 'M16 20v-1a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4v1 M9.5 11a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7z M21 20v-1a4 4 0 0 0-3-3.9 M16 4.1a3.5 3.5 0 0 1 0 6.8',
  tag: 'M20.6 13.4l-7.2 7.2a2 2 0 0 1-2.8 0L3 13V3h10l7.6 7.6a2 2 0 0 1 0 2.8z M7.5 7.5h.01',
  sliders: 'M4 6h10 M18 6h2 M4 12h4 M12 12h8 M4 18h12 M20 18h0 M14 4v4 M8 10v4 M16 16v4',
};

const NAV = [
  ['/', 'Pregled', 'home'],
  ['/invoices', 'Fakture', 'file'],
  ['/expenses', 'Troškovi', 'wallet'],
  ['/payments', 'Doprinosi i porez', 'bank'],
  ['/clients', 'Klijenti', 'users'],
  ['/templates', 'Stavke', 'tag'],
  ['/settings', 'Podešavanja', 'sliders'],
];

function Icon({ name }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d={ICONS[name]} />
    </svg>
  );
}

export default function Shell({ children }) {
  const [session, setSession] = useState(undefined); // undefined = učitava, null = odjavljen
  const path = usePathname();
  const router = useRouter();

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setSession(s));
    return () => sub.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (session === null && path !== '/login') router.replace('/login');
    if (session && path === '/login') router.replace('/');
  }, [session, path, router]);

  if (path === '/login') return <>{children}</>;
  if (!session) return <div className="center muted">Učitavanje…</div>;

  const active = (href) => (href === '/' ? path === '/' : path.startsWith(href));

  return (
    <div className="app">
      <aside className="side">
        <div className="brand">
          <span className="logo">F</span>Fakturalis
        </div>
        {NAV.map(([href, label, icon]) => (
          <Link key={href} href={href} className={'navlink' + (active(href) ? ' active' : '')}>
            <Icon name={icon} />
            {label}
          </Link>
        ))}
        <div className="side-foot">
          <button className="btn small" onClick={() => supabase.auth.signOut()}>
            Odjava
          </button>
        </div>
      </aside>
      <main className="main">{children}</main>
    </div>
  );
}
