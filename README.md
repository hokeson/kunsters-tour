# KUNSTERS Golf Tour

Historický almanach, výsledky a statistiky kunratické golfové tour KUNSTERS Cup.

Web projektu: https://hokeson.github.io/kunsters-tour/

## Co projekt obsahuje

- sezóny a konečná pořadí od roku 2017,
- historii jednotlivých turnajů,
- hráčské profily a rekordy,
- vývoj pravidel KUNSTERS Cupu,
- import výsledků a skórkaret z České golfové federace (ČGF),
- statistiky PAR / Birdie / Eagle / Albatros / HIO a škrtnutých jamek tam, kde jsou skórkarty k dispozici,
- historii putovních headcoverů od sezóny 2023.

## Zdroje dat

Projekt kombinuje několik zdrojů, které mají rozdílnou roli:

1. **ČGF** je primární zdroj výsledků jednotlivých golfových turnajů a skórkaret.
2. **Historické KUNSTERS tabulky** jsou referenčním zdrojem pro již uzavřené sezóny a slouží také ke kontrole automatických výpočtů.
3. **Propozice jednotlivých ročníků** určují bodování, koeficienty, počet započítávaných turnajů a historické tie-breaky.
4. `docs/data/members.json` je autoritativní seznam členů KUNSTERS.
5. `docs/data/guests.json` je samostatný seznam hostů. Host není člen tour a jeho skórkarta se nestahuje pro KUNSTERS statistiky.

## Princip výsledků

### Výsledek turnaje ČGF

Pořadí konkrétního turnaje vychází nejprve z výsledku ČGF, zejména z netto Stablefordu a pravidel dané soutěže.

### KUNSTERS body

KUNSTERS pořadí a body jsou až druhá vrstva nad výsledkem turnaje.

Cílem projektu je počítat je automaticky ze skórkaret a pravidel příslušné sezóny, aby nebylo nutné turnajové body ručně přepočítávat.

Výpočet musí respektovat dobová pravidla, například:

- bodovou stupnici za umístění,
- body za PAR, Birdie, Eagle, Albatros a HIO,
- případné srážky za nízké STB,
- koeficient konkrétního turnaje,
- tie-break platný v dané sezóně.

Historické oficiální výsledky slouží jako testovací etalon. Automatický výpočet se považuje za důvěryhodný teprve po cross-checku proti známým výsledkům.

## Členové, hosté a ostatní hráči

Ve výsledkové listině ČGF mohou být zobrazeni všichni účastníci turnaje, ale KUNSTERS rozlišuje tři úrovně:

- **člen KUNSTERS** – započítává se do KUNSTERS pořadí, bodů a statistik a může mít importovanou skórkartu,
- **host** – eviduje se samostatně v `guests.json`, ale jeho skórkarta se pro KUNSTERS statistiky nestahuje,
- **ostatní účastník ČGF** – zůstává pouze součástí kompletní výsledkové listiny turnaje.

## Putovní headcovery

Od sezóny 2023 tour eviduje putovní headcovery:

- 🐯 **tygřík** pro vítěze turnaje,
- 🐷 **prasátko** pro hráče s nejnižším Stablefordem.

Při shodě je nutné použít tie-break platný v konkrétní sezóně.

Headcovery se určují podle turnajového pořadí, nikoli podle celkových KUNSTERS bodů.

## Struktura repozitáře

- `docs/` – GitHub Pages web,
- `docs/app.js` – hlavní logika webu,
- `docs/style.css` – vzhled a responsive layout,
- `docs/data/imports/` – importované výsledky ČGF a skórkarty,
- `docs/data/seasons/` – sezonní výsledky a KUNSTERS body,
- `docs/data/members.json` – členové tour a historická ID,
- `docs/data/guests.json` – potvrzení hosté,
- `scripts/` – importní a validační skripty,
- `.github/workflows/` – automatizace GitHub Actions.

## Zásady pro změny

- Neměnit historická data bez ověření zdroje.
- Při výpočtu Stablefordu používat netto STB ze skórkarty, ne zaměňovat jej za gross hodnotu z leaderboardu.
- Statistiky ze skórkaret počítat pouze pro potvrzené členy KUNSTERS.
- Historické tie-breaky a bodování vyhodnocovat podle sezóny, ne podle jednoho univerzálního pravidla.
- Před změnami v `main` ověřit syntaxi a pokud možno také konkrétní očekávané výsledky na reálných turnajích.

## Aktuální vývoj

Probíhá **Historic statistics v2**:

- automatický výpočet KUNSTERS bodů ze skórkaret,
- oddělení ČGF a KUNSTERS pořadí,
- přesnější Eagle / Albatros / HIO,
- člen / host / ostatní účastník,
- responsive tabulky a sticky hlavičky,
- tygříci a prasátka napříč turnaji, sezónami, hráči, profily a rekordy,
- následný audit historických rekordů a odehraných vs. škrtnutých jamek.

---

KUNSTERS Golf Tour vznikl v roce **2017**.

**Chlapi sobě!**
