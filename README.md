# Dirt Jumper

Gra offline w stylu dino z Chrome: rower dirt zamiast dinozaura, kickery zamiast kaktusów.

## Pliki
- `index.html` — cała gra (czcionka pikselowa zapakowana w plik, dźwięki syntezowane, zero zależności).
- `sw.js` — service worker, zapisuje grę w pamięci przeglądarki przy pierwszym otwarciu.
- `manifest.webmanifest`, `icons/` — instalacja jako aplikacja na ekranie głównym.

## Uruchomienie
1. Wrzuć katalog na hosting statyczny po https (GitHub Pages, Netlify, własny serwer). Service worker nie działa z `file://`.
2. Otwórz adres na telefonie. Android: „Dodaj do ekranu głównego”. iPhone: „Udostępnij → Do ekranu początkowego”.
3. Po pierwszym otwarciu gra działa bez sieci.

## Sterowanie
- 1× klik tuż przed krawędzią kickera — wybicie (im bliżej krawędzi, tym wyżej).
- W locie: 1× barspin, 2× backflip, 3× tailwhip. Kliknięcia w trakcie triku ustawiają następny w kolejce.
- Spacja / strzałka w górę działają jak klik.
