# MeteoLive PRO – Interaktywne Centrum Pogody

**Autor:** Karol Szymczak (nr albumu 21504)\
**Adres wdrożenia:** <https://karol-szy.github.io/MeteoLive-PRO/>\
**Repozytorium Git:** <https://github.com/Karol-Szy/MeteoLive-PRO>\
**Przedmiot:** Interaktywna grafika i wizualizacja danych na stronach WWW, AHNS Radom\
**Prowadzący:** Artur Podolski

## Opis

MeteoLive PRO to interaktywny pulpit pogodowy (temat 4 z listy: „Pogoda i klimat – dashboard”) dla osób, które chcą szybko sprawdzić pogodę i zrozumieć, skąd biorą się zjawiska atmosferyczne, np. uczniów, studentów i osób planujących dzień. Po wyszukaniu miejscowości albo wybraniu miasta na mapie Polski od razu widać aktualne warunki z animowanym tłem, kafelki z najważniejszymi parametrami, prognozę godzinową i 7-dniową oraz interaktywne wykresy z danych Open-Meteo. Część edukacyjną tworzą studio animacji Canvas, animowana infografika obiegu wody, galeria zdjęć i krótki film z napisami. Aplikacja działa w przeglądarce, bez własnego serwera i bez rejestracji.

## Realizacja wymagań

| Wymaganie | Gdzie w aplikacji | Pliki | Technologie | Jak sprawdzić |
|---|---|---|---|---|
| W1 Animacje CSS | Wejście kart, przejścia kafelków i przycisków, pulsująca kropka „NA ŻYWO”, zorza w tle, animowane ikony pogody, przycisk pauzy w górnym pasku | `css/animacje.css`, `css/style.css` | `transition`, `transform` (translate/scale/rotate), `@keyframes`, `prefers-reduced-motion`, klasa `.motion-off` | Przycisk pauzy zatrzymuje wszystkie animacje dłuższe niż 5 s |
| W2 SVG | Logo, ikony pogody i interfejsu, mapa Polski, kompas, wskaźniki UV i ciśnienia, łuk słońca, infografika obiegu wody | `svg/favicon.svg`, `svg/cykl-wody.svg`, sprite w `index.html`, `js/mapa.js`, `js/ikony.js` | Własne SVG, animacje CSS w SVG (krople, płatki, błyskawica, obieg wody), atrybuty sterowane z JS | Ikona w karcie „Teraz” i infografika w sekcji „Studio” są animowane |
| W3 Wizualizacja danych | Sekcja „Wykresy”: temperatura (krzywa) i szansa opadów (słupki) + tabela danych | `js/charts.js`, `js/weather-data.js`, `data/demo.json` | Czyste SVG, `requestAnimationFrame` (płynne przejście starych wartości w nowe), dane z API Open-Meteo lub JSON | Przełącz 24/48/72 h albo zmień miasto; najedź myszą lub użyj Tab i strzałek |
| W4 Canvas 2D | Studio pogody oraz animowane tło karty „Teraz” zgodne z bieżącą pogodą | `js/symulacja.js`, `js/main.js` | Canvas 2D, pętla `requestAnimationFrame`, reakcja na mysz i dotyk (wiatr, błyskawica), przyciski, suwak i dane pogodowe | Wybierz zjawisko, przesuń kursor nad sceną, kliknij w scenie „Burza” |
| W5 Multimedia | Film „Cztery pory roku” z własnym odtwarzaczem i dźwiękiem dopasowanym do scen | `media/cztery-pory-roku.mp4`, `media/napisy-pl.vtt`, `js/odtwarzacz.js`, `docs/generuj_film.py` | HTML5 Video API bez domyślnych kontrolek, napisy WebVTT wyświetlane przez własny odtwarzacz (`cuechange`), rozdziały, chowanie panelu podczas odtwarzania | Play/pauza, przewijanie, dźwięk, napisy, pełny ekran, kliknięcie rozdziału |
| W6 Galeria | Sekcja „Galeria” w układzie bento z powiększonym podglądem (obrazy wygenerowane przez AI) | `js/galeria.js`, `media/galeria/*.webp`, `css/animacje.css` | View Transitions API (płynne przejście miniatura → podgląd i między zdjęciami) z wariantem awaryjnym w CSS | Mysz, klawiatura (strzałki, Escape, Tab), gest przesunięcia palcem |
| W7 Responsywność i dostępność | Cała aplikacja; na telefonie dolny pasek nawigacji | `css/style.css`, `index.html`, `js/szukaj.js` | Siatka CSS, media queries 360–1920 px, semantyczny HTML, ARIA (combobox, listbox, `aria-live`, `aria-current`), widoczny fokus, kontrast WCAG 2.2 AA | Zmień szerokość okna; obsłuż stronę samą klawiaturą |
| W8 Jakość kodu | Moduły ES podzielone według funkcji, brak błędów w konsoli | całe repozytorium | JavaScript ES2020+, moduły ES | Historia commitów w repozytorium; wyniki Lighthouse poniżej |
| W9 Wdrożenie | Statyczna aplikacja opublikowana na GitHub Pages | `index.html` i foldery zasobów | GitHub Pages | Adres na początku README, w Chrome lub Firefox |

**Elementy dodatkowe:** dane na żywo z trzech usług Open-Meteo z obsługą błędów (automatyczny tryb demonstracyjny) i stanu ładowania, View Transitions API z wariantem awaryjnym, moduły ES, wyszukiwarka miejscowości obsługiwana klawiaturą, wykresy dostępne z klawiatury i w formie tabeli, zapamiętywanie ostatnio wybranego miasta.

## Dane i materiały

- **Dane na żywo:** Open-Meteo, https://open-meteo.com/en/docs – prognoza (Forecast API), jakość powietrza (Air Quality API: europejski indeks EAQI, PM2,5, PM10) i wyszukiwarka miejscowości (Geocoding API). Licencja danych CC BY 4.0, bez klucza dla zastosowań niekomercyjnych. Dane pobierane są w chwili wyświetlenia strony i oznaczone napisem „NA ŻYWO”.
- **Dane demonstracyjne:** `data/demo.json` – dane wymyślone na potrzeby demonstracji dla 10 miast (7 dni, krok godzinowy), wygenerowane 14.11.2026 skryptem `docs/generuj_demo.mjs`. Nie są pomiarami ani prognozą. Godziny wschodu i zachodu słońca liczone są wzorem astronomicznym. Gdy API nie odpowiada, aplikacja pokazuje je z oznaczeniem „DEMO”. Dla innych miejscowości działa ten sam generator w przeglądarce (`js/demo.js`).
- **Obrazy w galerii:** 5 obrazów wygenerowanych przeze mnie 14.11.2026 w ChatGPT (generator obrazów OpenAI). Oryginalne pliki PNG zawierały poświadczenia pochodzenia C2PA („Content Credentials”) OpenAI. Do strony przekonwertowałem je do WebP – przy konwersji metadane nie są zachowywane, dlatego pochodzenie z AI jest podane na stronie (podpis w podglądzie galerii i opis sekcji) oraz w tabeli poniżej.

  | Plik | Autor | Źródło | Licencja |
  |---|---|---|---|
  | `zorza-nad-fiordem.webp` | autor projektu (obraz wygenerowany przez AI) | ChatGPT, OpenAI – 14.11.2026 | prawa do wyniku przysługują użytkownikowi wg warunków korzystania OpenAI |
  | `burza-nad-jeziorem.webp` | autor projektu (obraz wygenerowany przez AI) | ChatGPT, OpenAI – 14.11.2026 | prawa do wyniku przysługują użytkownikowi wg warunków korzystania OpenAI |
  | `burzowa-noc.webp` | autor projektu (obraz wygenerowany przez AI) | ChatGPT, OpenAI – 14.11.2026 | prawa do wyniku przysługują użytkownikowi wg warunków korzystania OpenAI |
  | `mglista-droga.webp` | autor projektu (obraz wygenerowany przez AI) | ChatGPT, OpenAI – 14.11.2026 | prawa do wyniku przysługują użytkownikowi wg warunków korzystania OpenAI |
  | `zloty-swit.webp` | autor projektu (obraz wygenerowany przez AI) | ChatGPT, OpenAI – 14.11.2026 | prawa do wyniku przysługują użytkownikowi wg warunków korzystania OpenAI |

  Warunki OpenAI (Terms of Use, część „Ownership of content”): https://openai.com/policies/terms-of-use/

- **Infografika, logo i ikony:** `svg/cykl-wody.svg`, `svg/favicon.svg` oraz sprite ikon w `index.html` – grafiki wektorowe przygotowane dla projektu.
- **Mapa Polski:** uproszczony kontur granic i rzek (Wisła, Odra) zapisany współrzędnymi w `js/mapa.js` – ilustracyjny, nie jest mapą geodezyjną.
- **Film, dźwięk i napisy:** `media/cztery-pory-roku.mp4` (18 s, 1280×720, 24 kl./s, ok. 6 MB) i plakat `media/plakat-filmu.webp`. Ujęcia to cztery 5-sekundowe klipy tej samej górskiej doliny, które wygenerowałem 19.11.2026 w PixVerse V6 (tryb „obraz + tekst”, opisy w `docs/PROMPTY_FILMU.md`). Pliki mają poświadczenia pochodzenia C2PA i widoczny znak „PixVerse.ai”, którego nie usuwałem. Skrypt `docs/generuj_film.py` (Pillow, NumPy, FFmpeg) sprowadza klipy do 1280×720, łączy je płynnymi przejściami, lekko wyrównuje kolory, dodaje tytuły pór roku i plakat. Dźwięk nie pochodzi z klipów: jest syntetyzowany w tym samym skrypcie osobno dla każdej pory roku i zgrany z obrazem (szum deszczu, melodia przy tęczy, świergot jaskółek, gęganie gęsi przesuwające się z lewej na prawą, zimowy wiatr) – to nie są cudze nagrania ani muzyka. Napisy WebVTT mają po jednym zdaniu na porę roku. Klipy źródłowe nie są dołączone do projektu.

  | Element | Autor | Źródło | Licencja |
  |---|---|---|---|
  | obraz filmu (4 klipy) | autor projektu (klipy wygenerowane przez AI) | PixVerse V6 – 19.11.2026, opisy w `docs/PROMPTY_FILMU.md` | PixVerse nie rości sobie praw do wygenerowanych treści, prawa zachowuje użytkownik; w planie bezpłatnym tylko do użytku niekomercyjnego (warunki PixVerse, pkt 4.1) – projekt zaliczeniowy jest niekomercyjny |
  | montaż, tytuły, ścieżka dźwiękowa, napisy | autor projektu | `docs/generuj_film.py`, `media/napisy-pl.vtt` | własne |

  Warunki PixVerse: https://pixverse.ai/en/terms-of-service
- **Krój pisma:** Inter (The Inter Project Authors), licencja SIL Open Font License 1.1 – podzbiór znaków w `fonts/`, pełna licencja w `fonts/OFL.txt`. Font jest dołączony lokalnie.
- **Biblioteki uruchomieniowe:** brak. Wykresy wykonane są w natywnym SVG (instrukcja dopuszcza D3.js lub czyste SVG).
- **Licencja projektu:** zob. `LICENSE.md`. Nie użyto szablonów stron ani kreatorów.

## Uruchomienie lokalne

Wystarczy serwer HTTP w katalogu głównym projektu (bez `npm install`) – najlepiej dołączony `serwer.py`.

1. Pobierz repozytorium (`git clone`) albo rozpakuj archiwum ZIP i otwórz folder w Visual Studio Code.
2. Kliknij dwukrotnie `START.bat` (wymaga Pythona) albo wpisz w terminalu:

   ```powershell
   py serwer.py
   ```

   `serwer.py` to prosty serwer z biblioteki standardowej Pythona. W przeciwieństwie do `py -m http.server` obsługuje zapytania Range, więc w filmie działa przewijanie i rozdziały.

   Bez Pythona można użyć rozszerzenia **Live Server** (**Open with Live Server** na pliku `index.html`).
3. Otwórz `http://localhost:5500` w Chrome lub Firefox.

Strona korzysta z modułów JavaScript (`type="module"`), dlatego po otwarciu `index.html` dwuklikiem (adres `file://`) przeglądarka zablokuje skrypty – trzeba użyć serwera HTTP.

## Struktura plików

Struktura jest zbliżona do zalecanej w instrukcji. Różnice wynikają z podziału kodu na mniejsze moduły: rolę `wykresy.js` pełni `js/charts.js`, rolę `scena.js` – `js/symulacja.js`, dane JSON są w `data/demo.json` (dane demonstracyjne; dane docelowe pochodzą z API), obrazy galerii w `media/galeria/`, a logo to `svg/favicon.svg`.

- `index.html` – układ pulpitu (pasek boczny, górny pasek, karty), sprite ikon SVG, semantyka i elementy sterowania.
- `css/style.css` – wygląd, siatka kart i responsywność; `css/animacje.css` – animacje, przejścia i ograniczenie ruchu.
- `js/main.js` – inicjalizacja, stan wybranego miejsca, odświeżanie, zegar, nawigacja z podświetlaniem sekcji, pauza animacji.
- `js/weather-data.js` – Open-Meteo (prognoza, jakość powietrza, wiele miast naraz, wyszukiwarka), kontrola odpowiedzi i dane awaryjne; `js/demo.js` – generator danych demonstracyjnych.
- `js/opisy.js` – opisy kodów pogody WMO, formatowanie po polsku, skale UV / EAQI / wiatru, punkt rosy.
- `js/pulpit.js` – karta „Teraz”, kafelki, prognoza godzinowa i 7-dniowa; `js/mapa.js` – mapa Polski i lista miast; `js/szukaj.js` – wyszukiwarka.
- `js/charts.js` – wykresy (W3); `js/symulacja.js` – Canvas (W4); `js/odtwarzacz.js` – wideo (W5); `js/galeria.js` – galeria (W6); `js/ikony.js` – pomocnicze tworzenie elementów i ikon.
- `serwer.py` i `START.bat` – lokalne uruchomienie (serwer z obsługą przewijania wideo).
- `svg/`, `fonts/`, `data/`, `media/` – zasoby; `docs/` – materiały do obrony i testów, audyt, raport Lighthouse oraz skrypty generujące film i dane demonstracyjne.

## Podział pracy

Projekt jest indywidualny – wszystkie etapy prowadziłem sam, z pomocą narzędzi AI opisaną w następnej sekcji.

## Wykorzystanie narzędzi AI

Przy projekcie korzystałem z trzech narzędzi AI:

- **ChatGPT (OpenAI)** – pierwsza wersja aplikacji: koncepcja i struktura, kod HTML/CSS/JavaScript/SVG, pierwsza wersja filmu i ilustracji oraz pierwsza wersja README; generator obrazów ChatGPT posłużył też do wykonania 5 obrazów do galerii.

- **PixVerse V6 (PixVerse.ai)** – 4 klipy wideo do filmu „Cztery pory roku”, wygenerowane przeze mnie 19.11.2026 w trybie „obraz + tekst” na podstawie opisów z `docs/PROMPTY_FILMU.md`.
- **Claude (Anthropic)** –  przebudowa interfejsu na pulpit (moduły `pulpit.js`, `mapa.js`, `szukaj.js`, `demo.js`, `opisy.js`, nowe wersje `charts.js`, `symulacja.js`, `galeria.js`, `odtwarzacz.js` i arkuszy CSS, ikony SVG), opisy ujęć do filmu (`docs/PROMPTY_FILMU.md`) i skrypt montażu filmu „Cztery pory roku” z tytułami i syntetyzowaną ścieżką dźwiękową, lokalny serwer `serwer.py`, konwersja obrazów galerii do WebP, sprawdzenie zgodności z instrukcją projektu oraz redakcja dokumentacji.


## Wyniki Lighthouse

Performance: 99 | Accessibility: 93 | Best Practices: 100 | SEO: 100

Pomiar z 14.11.2026, tryb Desktop, wersja lokalna (`http://localhost:5500`), Lighthouse 13.5. Pełny raport: `docs/lighthouse.html`. Po pomiarze poprawiono dwie uwagi z kategorii Accessibility: kontrast etykiety dnia w prognozie godzinowej oraz wyróżnienie linków w tekście (podkreślenie).

## Wdrożenie

Aplikacja jest statyczna, więc nie wymaga budowania. Strona jest publikowana przez GitHub Pages z gałęzi `main` – każdy push automatycznie aktualizuje wersję online.


## Znane ograniczenia i dalszy rozwój

- Prognoza Open-Meteo zależy od dostępu do internetu i dostępności usługi; dane API są prognozą modelową, a nie gwarancją pogody.
- Mapa obejmuje Polskę; wyszukane miejscowości spoza Polski są obsługiwane w pulpicie, ale nie pojawiają się na mapie.
- Dane o jakości powietrza bywają niedostępne dla części lokalizacji – wtedy kafelek pokazuje „Brak danych”.
- Animacje Canvas to symulacja artystyczna, nie fizyczny model atmosfery; na słabszych urządzeniach warto użyć przycisku pauzy.
- Możliwy rozwój: jasny motyw, działanie offline (Service Worker), linter (ESLint) i testy automatyczne.

## Oświadczenie o samodzielności

> Oświadczam, że niniejszy projekt został wykonany samodzielnie przez wymienionego autora. Wszystkie wykorzystane materiały zewnętrzne (biblioteki, dane, zdjęcia, filmy, dźwięki, fragmenty kodu, wyniki narzędzi AI) zostały wskazane wraz ze źródłem i licencją. Znam i potrafię wyjaśnić całość kodu projektu.
>
> Data: 19-11-2026 Podpis: Szymczak Karol
