# Fakturalis

Lična aplikacija za paušalca: fakture (PDF + mejl), prihodi, troškovi, doprinosi i porez, klijenti, šabloni stavki, praćenje limita i rokova. Next.js + Supabase (prijava i baza), hostovano na Vercelu.

## 1. Supabase (besplatno)

1. Napravi projekat na https://supabase.com.
2. **SQL Editor** → nalepi ceo sadržaj `supabase/schema.sql` → Run.
3. **Project Settings → API**: kopiraj `Project URL` i `anon public` ključ.
4. **Authentication → Providers → Email**: ako ne želiš da potvrđuješ mejl pri registraciji, isključi „Confirm email”.
5. Kad napraviš svoj nalog u aplikaciji, ugasi nove registracije: **Authentication → Sign In / Providers → isključi „Allow new users to sign up”**. Tako samo ti možeš da se prijaviš.

## 2. Lokalno pokretanje (opciono)

```bash
cp .env.example .env.local   # upiši Supabase URL i anon ključ
npm install
npm run dev                  # http://localhost:3000
```

## 3. Vercel

1. Postavi folder na GitHub (privatni repo) i na https://vercel.com izaberi **Add New → Project** → importuj repo.
2. U **Environment Variables** dodaj iste promenljive kao u `.env.example`.
3. Deploy. Svaki sledeći `git push` pravi novu verziju.

## 4. Slanje faktura mejlom (besplatno, preko Gmail-a)

1. Google nalog → Security → uključi 2-Step Verification → **App passwords** → napravi lozinku za „Mail”.
2. Na Vercelu dodaj `GMAIL_USER`, `GMAIL_APP_PASSWORD`, `OWNER_EMAIL` (mejl kojim se prijavljuješ u aplikaciju).
3. Redeploy.

Dugme „Pošalji iz aplikacije” šalje fakturu u telu mejla (Gmail dozvoljava oko 500 mejlova dnevno). Ako ovo ne podesiš, dugme „Otvori u mejl programu” otvara tvoj mejl klijent sa popunjenim tekstom, pa PDF priložiš ručno.

## PDF

Na stranici fakture klikni **Štampaj / Sačuvaj kao PDF** i u prozoru za štampu izaberi „Sačuvaj kao PDF”. Tako su ispravna sva slova (č, ć, š, ž, đ).

## Prvi koraci u aplikaciji

1. **Podešavanja**: unesi podatke o radnji (PIB, matični broj, račun), napomenu o PDV-u, limite i rokove.
2. **Klijenti** i **Stavke**: dodaj klijente i pakete usluga koje često naplaćuješ.
3. **Fakture → Nova faktura**.

## Važno

- Limiti prometa, rokovi i tekst napomene o PDV-u su podešavanja koja ti menjaš. Podrazumevane vrednosti su okvirne, pa ih proveri sa knjigovođom ili na sajtu Poreske uprave.
- Za fakture u stranoj valuti unesi srednji kurs NBS na dan prometa; aplikacija računa protivvrednost u dinarima.
- Aplikacija ne zamenjuje knjigovođu i ne podnosi ništa Poreskoj upravi.
