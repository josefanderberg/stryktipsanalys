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
   strategier byggs om till vald radstorlek; ★ Adaptiv är standard och bygger exakt systemform.
   Jämförelsetabell, konfliktkort och kupongvy.
5. **Resultat** – hämta resultat från Svenska Spel eller rätta manuellt, spara i databasen.
6. **Statistik** – facit för strategierna över alla sparade omgångar.

## NILLE-analysen

Rad → Analys → Min rad → Resultat. Kupongöversikt med sex signaler, klickbar matchlista med
rekommenderat tecken och modellprocent, detaljpanel per match (riskbadge SER BRA UT /
KONTROLLERA / NILLE-FÄLLA, marknadsdata, modellbedömning, motivering), Topp 5 lägg till/ta bort,
samt jämförelse mellan Nilles rad och rekommenderad rad per budget och strategi.

## Statistik

Fliken **Statistik** visar hur strategierna faktiskt har gått i de sparade omgångarna, filtrerat
på spelform och radstorlek (128 / 192 / 256 kr):

- snitt antal rätt per omgång för ★ Adaptiv, Historiskt mönster, Mönster + differens och
  Sammanvägd modell, jämfört med en ren oddsrad, den sparade raden och Nilles rad,
- antal omgångar med 10+, 11+, 12 och 13 rätt,
- första halvan mot senaste, med andelen matcher som hade historik för expertmönstret,
- var felen uppstår för modellraden och Nilles rader: per teckenval, oddsprocent, differens och
  faktiskt utfall,
- alla omgångar rad för rad.

Strategiernas rader sparas inte i databasen. Varje omgång spelas därför om
(`src/lib/backtest.js`) med enbart de omgångar som var sparade före spelstopp, alltså samma
underlag som appen hade när raden byggdes. Antal rätt är den bästa raden i systemet.

## Systembygge och R-system

Budgetvalen bygger exakta systemstorlekar genom att helgardera de mest osäkra matcherna,
halvgardera nästa och spika resten:

| Val | Form | Rader |
|---|---|---|
| 128 kr | 0 hel · 7 halv · 6 spikar | 2⁷ = 128 |
| 192 kr | 1 hel · 6 halv · 6 spikar | 3 × 2⁶ = 192 |
| 256 kr | 0 hel · 8 halv · 5 spikar | 2⁸ = 256 |
| ⭐ Bästa reducerade | R-system ur katalogen | enligt system |

**⭐ Bästa reducerade** väljer ett riktigt R-system ur Svenska Spels katalog (29 system) utifrån
omgångens riskprofil: antalet helt öppna matcher styr helgarderingarna, antalet utan tydlig
favorit styr halvgarderingarna. För en profil med fyra öppna och fyra osäkra matcher blir det
**R 4-4-144** – 5 spikar + 4 halvgarderingar + 4 helgarderingar = 144 spelade rader (fullt system
1296 rader) med garanti 12 rätt när systemets villkor uppfylls.

I NILLE / Min rad visas den färdiga rekommendationen som **kupongvy** direkt före Spara rad, med
spikar, halv- och helgarderingar, radantal och R-systemets garanti.

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

- Kalibrering av modellens vikter mot verkliga utfall när databasen vuxit.
- Inloggning om databasen ska skyddas mot utomstående skrivningar.

Inofficiell prototyp utan koppling till Svenska Spel.
