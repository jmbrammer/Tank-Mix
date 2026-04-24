📘 Tank Mix Google Sheets README
(Authoritative Source of Truth for the Tank Mix App)
This Google Sheets file is the official source of tank mix data for the Tank Mix App.
The app reads from this sheet and loads mixes onto individual devices.
⚠️ Do not change the structure described below unless you intend to change the app.

✅ Spreadsheet Overview
This spreadsheet contains:

One index sheet named MixIndex
One detail sheet per tank mix
(Optional) This README sheet for instructions

Tank_Mix_Master (Spreadsheet)
 ├─ README        ← instructions (this sheet)
 ├─ MixIndex      ← REQUIRED
 ├─ mix_001       ← one sheet per mix
 ├─ mix_002
 └─ mix_003


🟦 Sheet 1: MixIndex (REQUIRED)
This sheet tells the app what mixes exist and their basic settings.
❗ Sheet Name Must Be Exactly
MixIndex


✅ Row 1 — Column Labels (Do Not Change Order)













































ColumnLabelDescriptionAMixIDStable unique ID (never reused)BMix NameHuman‑readable nameCGPAGallons per acreDAcres to MixOptionalEGallons to LoadOptionalFLast UpdatedOptional timestampGNotesFree text

✅ Rules for MixIndex


MixID

Must be unique
Must never be changed once created
Used internally by the app



Mix Name

Can be edited freely
Shown to users in the app



Acres to Mix vs Gallons to Load

Fill only one, not both
The app will calculate the other



Rows may be reordered safely


Blank rows are ignored



✅ Example MixIndex
MixID     | Mix Name        | GPA | Acres to Mix | Gallons to Load | Last Updated | Notes
mix_001   | Corn POST 1600  | 20  | 80           |                 | 2026‑04‑22  | Standard POST
mix_002   | Soy PRE 1200    | 15  |              | 1200            | 2026‑04‑22  | PRE program


🟩 Mix Detail Sheets (ONE PER MIX)
Each tank mix has its own sheet.
✅ Sheet Naming Rule
The sheet name must exactly match the MixID.
Example:
Sheet name: mix_001

If the name does not match, the app will not load the mix.

✅ Row 1 — Ingredient Table Headers (Required)



































ColumnLabelMeaningANameProduct or ingredient nameBRateNumeric rateCUnitUnit of measureDBasisacre or 100EJug2.5, 1, or blank

✅ Ingredient Rows (Begin at Row 2)
Example:
Name       | Rate | Unit | Basis | Jug
Roundup   | 32   | floz | acre  | 2.5
AMS       | 17   | lbs  | 100   |
Laudis    | 3    | floz | acre  | 1


✅ Units (VERY IMPORTANT)
Units must be typed exactly as listed below.
✅ Allowed Units





























UnitMeaninggalGallonsqtQuartsflozFluid ouncesozOunces (dry)lbsPounds (dry)
⚠️ Use floz (no space), not fl oz.
The app handles all unit conversions internally.

✅ Basis Values

















ValueMeaningacreRate is per acre100Rate is per 100 gallons
These values must be typed exactly.

✅ Jug Values (Liquids Only)





















ValueMeaning2.5Use 2.5 gal → 1 gal → floz cascade1Use 1 gal → floz cascadeblankNo jug math
Jug math applies only to liquid products.

🚫 Do NOT Use in Mix Sheets

❌ Formulas
❌ Totals
❌ Extra header rows
❌ Comments inside table
❌ Merged cells
❌ Mixed units in a single cell

These sheets are data tables, not calculators.

✅ How the App Uses This Sheet
When a user taps “Sync from Google Sheet” in the app:

The app reads MixIndex
The app reads each matching mix_xxx sheet
Each mix is saved locally on the device
Users select a mix from the menu

📌 Each device stores its own local copy.
📌 Re‑syncing updates local mixes from the sheet.

✅ Recommended Best Practices

Copy last year’s sheet to create a new season
Never reuse old MixIDs
Use Mix Name changes instead of creating duplicates
Keep one README sheet with these rules visible
