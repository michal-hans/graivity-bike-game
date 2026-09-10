# Dirt Jumper

Gra offline w stylu dino z Chrome: rower dirt zamiast dinozaura, kickery zamiast kaktusów.

- `index.html` — cała gra w jednym pliku (canvas, sprite'y rysowane pikselowo w kodzie).
- `parts/` — źródło podzielone na części; `cat parts/* > index.html` składa plik.

## Sterowanie
- 1× klik na najeździe, tuż przed wierzchołkiem kickera — wybicie (im bliżej krawędzi, tym wyżej).
- 2× klik w locie — backflip. 3× klik w locie — tailwhip.
- Kolejne 2×/3× po skończonym triku — następny trik w tym samym locie (mnożnik ×2, ×3).
- Spacja / strzałka w górę działają jak klik.

## Stan prac
1. Grafika — gotowe. 2. Fizyka wybicia — gotowe. 3. Triki w locie — gotowe.
4. Poziomy, 5. Punktacja i rekordy, 6. Offline (PWA) i dźwięk — do zrobienia.
