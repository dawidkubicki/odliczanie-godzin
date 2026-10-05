# Odliczanie godzin

Kalkulator czasu dla wielu zakresów dat i godzin (domyślnie sześciu, maksymalnie dwudziestu). Sumuje czas trwania (dni, godziny, minuty, a także łącznie w dniach jako liczbę dziesiętną) i przelicza wynik na kwotę według kursu średniego NBP.

```
kwota = łączny czas w dniach × kurs NBP × mnożnik × wartość
```

## Funkcje

- domyślnie 6 zakresów czasowych (można dodawać i usuwać, od 1 do 20), każdy z przełącznikiem „aktywny”; puste zakresy są pomijane
- wyniki aktualizowane na bieżąco: dni / godziny / minuty, łącznie w dniach (5 miejsc po przecinku) i w godzinach
- kursy średnie NBP (tabela A) dla dowolnej waluty: najnowszy albo z wybranego dnia (ostatni dzień roboczy w tym dniu lub przed nim)
- ręczna korekta kursu, mnożnika i wartości (przecinek lub kropka)
- kopiowanie pojedynczych wartości i całego podsumowania do schowka
- stan zapisywany lokalnie w przeglądarce
- tryb jasny i ciemny

Czas liczony jest według wskazań zegara: zmiana czasu letniego/zimowego nie dodaje ani nie odejmuje godziny, tak jak w pierwotnym programie desktopowym.

## Uruchomienie

```bash
pnpm install
pnpm dev        # http://localhost:3000
```

Pozostałe skrypty:

```bash
pnpm test       # testy jednostkowe (Vitest)
pnpm typecheck
pnpm lint
pnpm build
```

## Wdrożenie na Vercel

Projekt jest gotowy do wdrożenia bez dodatkowej konfiguracji i nie wymaga zmiennych środowiskowych.

1. Zaimportuj repozytorium w [vercel.com/new](https://vercel.com/new) – framework (Next.js) i menedżer pakietów (pnpm) zostaną wykryte automatycznie.
2. Kliknij **Deploy**.

Albo z terminala: `vercel` (podgląd) / `vercel --prod` (produkcja).

Funkcje serwerowe działają w regionie `fra1` (Frankfurt) – blisko API NBP i użytkowników w Polsce (`vercel.json`).

## API

Aplikacja odpytuje NBP przez własne endpointy (z cache):

- `GET /api/nbp/currencies` – lista walut z tabeli A
- `GET /api/nbp/rate?code=EUR` – najnowszy kurs średni
- `GET /api/nbp/rate?code=EUR&date=2026-09-06` – kurs z ostatniego dnia roboczego w podanym dniu lub przed nim

Źródło danych: [api.nbp.pl](https://api.nbp.pl/).
