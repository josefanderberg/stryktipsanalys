# Tipsanalys

Mobilanpassat analysverktyg för **Stryktipset** och **Europatipset**, byggt med React + Vite +
Tailwind CSS. All data är riktig: omgångar hämtas från Svenska Spels öppna API och historiken
byggs av era egna sparade omgångar i Firestore. Ingen demodata.

**Live:** https://josefanderberg.github.io/stryktipsanalys/

## Spelformer

| | Stryktipset | Europatipset | NILLE |
|---|---|---|---|
| Expertrader | 6 | 3 | – |
| Profilfärg | Blå | Grön | Lila |
| Databas | `stryktipset` | `europatipset` | `nille` |

Valt spel används alltid primärt. Jämförbar historik från den andra spelformen används som
sekundär stödsignal när underlaget är litet.

## Huvudflödet

1. **Start** – välj spel, hämta omgången (13 matcher, Svenska folket, odds → sannolikhetsprocent).
   Odds och folkprocent som ännu inte publicerats visas som "–", aldrig som platshållarsiffror.
2. **Experter** – fyll i expertraderna, en kupong i taget.
3. **Analys** – kuponganalys (🔥 spik, 💎 värde, 💥 skräll, ⚠️ farlig favorit, 🤝/⚔️ enighet) och
   per match: expertmönster → all historik → dagens differens → historik per differensintervall →
   liknande mönster + korsstöd → modellbedömning → rekommendation.
4. **Min rad** – 128 / 192 / 256 kr eller ⭐ Bästa reducerade (192 kr standard). Alla fyra
   strategier byggs om till vald radstorlek; ★ Adaptiv är standard. Jämförelsetabell, konfliktkort
   och kupongvy.
5. **Resultat** – hämta resultat från Svenska Spel eller rätta manuellt, spara i databasen.

## NILLE-analysen

Rad → Analys → Min rad → Resultat. Kupongöversikt med sex signaler, klickbar matchlista med
rekommenderat tecken och modellprocent, detaljpanel per match (riskbadge SER BRA UT /
KONTROLLERA / NILLE-FÄLLA, marknadsdata, modellbedömning, motivering), Topp 5 lägg till/ta bort,
samt jämförelse mellan Nilles rad och rekommenderad rad per budget och strategi.

## Modellen

Modellprocenten viktas efter hur stort underlaget faktiskt är:

| Signal | Max vikt | Full vikt vid |
|---|---|---|
| Mönster + dagens differens | 40 % | 30 matcher |
| Exakt expertmönster | 20 % | 20 matcher |
| Liknande mönster | 15 % | 20 matcher |
| Stöd från andra spelformen | 10 % | 20 matcher |
| Oddsprocent | resten | – |

Med tom databas är modellen alltså identisk med marknaden, och det redovisas öppet i varje
matchanalys. Ju fler omgångar ni sparar, desto större vikt får er egen historik.

## Data och lagring

- **Omgångsdata:** `scripts/fetch-omgang.mjs` hämtar båda spelen från Svenska Spels öppna API och
  skriver `public/data/<spel>.json`. Körs av GitHub Actions vid varje deploy och enligt schema
  (var 6:e timme, tätare på lördagar).
- **Sparade omgångar:** Firestore i Firebase-projektet `hejy-5dac4`, tre samlingar
  (`stryktipset`, `europatipset`, `nille`). Per match sparas datum, match, expertrader,
  normaliserat expertmönster, Svenska folket, oddsprocent, differens, differensintervall,
  faktiskt resultat och din rad. Regler i `firestore.rules`.

## Utveckling

```bash
npm install
npm run dev      # http://localhost:5173/stryktipsanalys/
npm run build
node scripts/fetch-omgang.mjs   # uppdatera omgångsdata lokalt
```

## Nästa steg

- Riktig reduceringsmotor bakom ⭐ Bästa reducerade.
- Strategiernas historiska prestanda beräknad ur sparade omgångar.
- Kalibrering av modellens vikter mot verkliga utfall när databasen vuxit.
- Inloggning om databasen ska skyddas mot utomstående skrivningar.

Inofficiell prototyp utan koppling till Svenska Spel.
