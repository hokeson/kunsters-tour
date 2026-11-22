# Kunsters Tour

Starter projektu pro automatický import výsledků z ČGF a budoucí veřejný almanach.

## Pilot
KUNSTERS 2026 FINALE 1: Tournament ID `1300152020`, Category ID `377389`.

## Lokální / Actions test
`npm install`
`npx playwright install chromium`
`npm run test:finale1`

## GitHub Actions
Actions > Import CGF tournament > Run workflow. Zadejte Tournament ID a Category ID. Výsledek se uloží do `data/imports/<TournamentID>.json`.

## Další práce
1. Doplnit 22 členů do `data/members.json` z master Excelu.
2. Doplnit scraper celkové výsledkové tabulky (HCP před/po, STB, pořadí).
3. Přidat výpočet Kunsters bodů podle `data/rules.json`.
4. Porovnat pilot 2026 Finale 1 s almanachem.
5. Importovat historii a vytvořit Pages dashboard.

Pozn.: 2027 pravidla v `rules.json` jsou označena jako provisional, dokud nebudou finální propozice.

dalsi co udelame

na kartě sezóny v tabulce. Konečné pořadí budeme kromě HCP chtít mít HCP na začátku sezony a HCP na konci sezony. Handicap.  A budeme tam chtít zlepšení handicapu zlepšení budou plusové hodnoty a zhoršení bude v závorkách. u sezón jednotlivejch je jsou turnaje sezóny a tam máme 1 sloupek, kde je hodně ran AU toho by mělo bejt jméno toho kdo nejméně ran dosáhl.

Asi kdekoliv, kde je nejméně ran tak uveď kdo nejméně ran měl?

v rekordech chybi nejvic eaglu. pridej nejvic skrtlych jamek, nejvic ran.

Tam, kde je největší snížení handicapu v turnaji na stránky se s recordama, tak tam přidej datum. Toho turnaje.	
