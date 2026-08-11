# Stryktipsanalys

Mobilanpassad prototyp för ett analysverktyg för Stryktipset, byggd med **React + Vite + Tailwind CSS**.

**Live:** https://josefanderberg.github.io/stryktipsanalys/

## Flödet

1. **Ny omgång** – hämta omgångens 13 matcher med Svenska folket och oddsprocent (demodata i prototypen).
2. **Expertrad 1–6** – fyll i sex expertrader, en i taget, med klickbara 1/X/2-tecken (halv- och helgarderingar stöds).
3. **Expertmönster** – raderna normaliseras per match så att ordningen på experterna räknas bort (t.ex. `1×2 · 1X×3 · X2×1`).
4. **Differens** – Svenska folket jämförs med oddsprocenten per tecken; totaldifferensen placerar matchen i ett differensintervall.
5. **Matchanalys** i fast ordning: experternas val → exakt mönster → **all historik för mönstret (baslinjen)** → dagens differens → historik uppdelad efter differensintervall (⭐ markerar dagens) → liknande mönster (sekundärt) → **modellbedömning** med underlag och tillförlitlighet → rekommendation.
6. **Kuponganalys** – starkaste spik 🔥, bästa värdetecken 💎, sannolikaste skräll 💥, farlig favorit ⚠️, störst expertenighet 🤝 och expertoenighet ⚔️.
7. **Min rad** – välj budget; systemet föreslår spikar, halv- och helgarderingar som ryms i budgeten. Allt kan ändras manuellt. Kupongvy + "Kopiera rad".
8. **Resultat** – hämta/rätta resultat efter avslutad omgång och **spara i databasen** (13 nya datapunkter per omgång).
9. **Databas** – sparade omgångar och därför värdet växer med tiden.

## Viktigt

Procent och historik i prototypen är **demonstrationsvärden** och ska inte ses som kalibrerade vinstsannolikheter. Modellens vikter är prototypvärden som ska kalibreras mot verkliga resultat när databasen växer.

## Utveckling

```bash
npm install
npm run dev      # dev-server på http://localhost:5173/stryktipsanalys/
npm run build    # produktionsbygge till dist/
```

## Publicering

Varje push till `main` bygger och deployar automatiskt till GitHub Pages via GitHub Actions (`.github/workflows/deploy.yml`).

## Nästa steg

- Automatisk import av aktuell Stryktipsomgång (kräver kontroll av Svenska Spels användarvillkor och datakällor).
- Automatisk resultatimport efter avslutad omgång.
- Riktig databas i backend i stället för demogenererad historik.
- Statistisk kalibrering av modellens vikter mot verkliga utfall.
- Systembyggare som optimerar radbygget mot vald budget.
