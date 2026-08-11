# Stryktipsanalys – GitHub Pages-prototyp

Mobilanpassad prototyp för ett analysverktyg för Stryktipset.

## Publicera på GitHub Pages

1. Skapa ett nytt repository på GitHub, till exempel `stryktipsanalys`.
2. Ladda upp `index.html`, `.nojekyll` och `README.md` från den här mappen.
3. Gå till **Settings → Pages** i repositoryt.
4. Under **Build and deployment**, välj **Deploy from a branch**.
5. Välj `main` och `/ (root)` och tryck **Save**.
6. Efter någon minut får du en publik adress, ungefär:

   `https://DITT-GITHUB-NAMN.github.io/stryktipsanalys/`

## Vad prototypen visar

- Sex expertrader som fylls i en i taget.
- Klickbara 1/X/2-val och garderingar.
- Mobilanpassad kupongvy.
- Kuponganalys.
- Expertmönster där ordningen på experterna ignoreras.
- Historik för expertmönster och differensintervall.
- Liknande expertmönster.
- Sammanvägd modellbedömning.

## Nästa steg

Den här versionen använder demodata för Svenska folket, odds och historik. En senare webbapp kan koppla på:

- automatisk import av aktuell Stryktipsomgång,
- automatisk resultatimport efter avslutad omgång,
- riktig databas,
- statistisk kalibrering av modellens vikter,
- systembyggare utifrån vald budget.

## Viktigt

Procenten i prototypen är demonstrationsvärden och ska inte ses som kalibrerade vinstsannolikheter.
