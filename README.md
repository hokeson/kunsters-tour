# ⛳ KUNSTERS Golf Tour

**Historický almanach, výsledky a statistiky kunratické golfové tour od roku 2017.**

### 🟢 https://hokeson.github.io/kunsters-tour/
---

## O projektu

KUNSTERS Golf Tour je dlouhodobý golfový projekt, který spojuje historický almanach tour s výsledky a skórkartami z České golfové federace (ČGF). Cílem je mít na jednom místě kompletní historii KUNSTERS Cupu a zároveň postupně automatizovat zpracování nových turnajů.

Projekt obsahuje zejména:

- sezóny a konečná pořadí od roku **2017**,
- historii jednotlivých turnajů,
- hráčské profily a rekordy,
- vývoj pravidel KUNSTERS Cupu,
- import výsledků a skórkaret z **ČGF**,
- statistiky PAR / Birdie / Eagle / Albatros / HIO a škrtnutých jamek tam, kde jsou skórkarty k dispozici,
- historii putovních headcoverů od sezóny **2023**.

## Jak vzniká výsledek

### 1. Výsledek turnaje ČGF

Pořadí konkrétního golfového turnaje vychází nejprve z výsledku ČGF. Primární je tedy výsledek soutěže a netto Stableford podle pravidel daného turnaje.

### 2. KUNSTERS pořadí a body

KUNSTERS pořadí je až druhá vrstva nad výsledkem turnaje. Do KUNSTERS pořadí vstupují pouze členové tour a následně se podle pravidel konkrétní sezóny vypočítají KUNSTERS body.

Cílem projektu je tento výpočet plně automatizovat ze skórkaret, aby pořadatelé po turnaji nemuseli body ručně přepočítávat.

Výpočet musí respektovat dobová pravidla, například:

- bodovou stupnici za umístění,
- body za PAR, Birdie, Eagle, Albatros a HIO,
- případné srážky za nízké STB,
- koeficient konkrétního turnaje,
- tie-break platný v dané sezóně.

Historické oficiální výsledky slouží jako **testovací etalon**. Automatický výpočet považujeme za ověřený až tehdy, když opakovaně reprodukuje známé historické výsledky.

## Zdroje dat

Projekt kombinuje několik zdrojů s rozdílnou rolí:

1. **ČGF** – primární zdroj výsledků jednotlivých turnajů a skórkaret.
2. **Historické KUNSTERS tabulky** – referenční zdroj uzavřených sezón a kontrola automatických výpočtů.
3. **Propozice jednotlivých ročníků** – zdroj bodování, koeficientů, počtu započítávaných výsledků a historických tie-breaků.
4. `docs/data/members.json` – autoritativní seznam členů KUNSTERS včetně historických ID a aliasů.
5. `docs/data/guests.json` – samostatně potvrzení hosté tour.

## Členové, hosté a ostatní hráči

Kompletní výsledková listina ČGF může zobrazovat všechny účastníky turnaje. Pro KUNSTERS ale rozlišujeme tři úrovně:

| Typ hráče | Výsledková listina | KUNSTERS pořadí a body | Skórkarta ve statistikách |
|---|---:|---:|---:|
| **Člen KUNSTERS** | ✅ | ✅ | ✅ |
| **Host** | ✅ | ❌ | ❌ |
| **Ostatní účastník ČGF** | ✅ | ❌ | ❌ |

Samotná účast na ČGF turnaji není důkazem, že je hráč hostem KUNSTERS. Hosté se potvrzují samostatně.

## 🐯 🐷 Putovní headcovery

Od sezóny **2023** tour eviduje putovní headcovery:

- 🐯 **tygřík** získává vítěz KUNSTERS turnaje,
- 🐷 **prasátko** získává hráč s nejnižším Stablefordem.

Při shodném Stablefordu se používá tie-break platný v dané sezóně. Historická pravidla se proto nesmějí přepočítávat podle dnešního pravidla.

Headcovery vycházejí z pořadí konkrétního turnaje, nikoli z celkových sezonních KUNSTERS bodů.

## Struktura repozitáře

```text
docs/
├── index.html              GitHub Pages
├── app.js                  hlavní logika webu
├── style.css               vzhled a responsive layout
├── img/                    logo a grafické podklady
└── data/
    ├── imports/            výsledky ČGF a skórkarty
    ├── seasons/            sezonní výsledky a KUNSTERS body
    ├── members.json        členové tour a historická ID
    └── guests.json         potvrzení hosté

scripts/                    importní a validační skripty
.github/workflows/          automatizace GitHub Actions
```

## Zásady práce s daty

- Historická data neměnit bez ověření zdroje.
- Pro Stableford používat **netto STB ze skórkarty**, ne zaměňovat jej za gross hodnotu z leaderboardu.
- Statistiky ze skórkaret počítat pouze pro potvrzené členy KUNSTERS.
- Historické tie-breaky, bodové stupnice a koeficienty vyhodnocovat podle konkrétní sezóny.
- Škrtnutá jamka není totéž jako dokončená odehraná jamka.
- Před změnou v `main` kontrolovat syntaxi a konkrétní očekávané výsledky na reálných turnajích.

## 🚧 Aktuální vývoj: Historic statistics v2

Aktuálně připravujeme další generaci historických statistik a automatizace:

- [ ] automatický výpočet KUNSTERS bodů ze skórkaret,
- [ ] oddělení ČGF a KUNSTERS pořadí,
- [ ] přesné rozlišení Eagle / Albatros / HIO,
- [ ] člen / host / ostatní účastník,
- [ ] responsive tabulky a sticky hlavičky,
- [ ] 🐯 tygříci a 🐷 prasátka v turnajích, sezónách, hráčích, profilech a rekordech,
- [ ] audit dokončených vs. škrtnutých jamek,
- [ ] audit historických rekordů.

Cílem je, aby po importu nového turnaje z ČGF vzniklo KUNSTERS pořadí, bodování a statistiky automaticky a historická data současně fungovala jako kontrola správnosti výpočtu.

---

<p align="center">
  <img src="docs/img/logo-180.png" alt="KUNSTERS Golf Tour" width="70"><br>
  <strong>KUNSTERS Golf Tour · od roku 2017</strong><br>
  <em>Chlapi sobě!</em>
</p>
