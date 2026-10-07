# EPOA Coupon Generator (coupon-pdf-gen)

A DHIS2 **Capture form field plugin** for the **EPOA program stage**. A Case Manager enters a Peer
Mobilizer Code and a number of coupons, clicks **Generate coupons**, and the plugin:

1. Generates unique coupon numbers following the *EPOA Coupon Number Generation Logic*
   (e.g. `101-001-KAZ01`, `101-001-PXT02`, …).
2. Saves them on the EPOA event, as a JSON list ready for future redemption tracking.
3. Lets users **preview** or **download** the *EPOA COUPON GENERATION SHEET* PDF at any time
   after the event is saved.

The PDF is not stored in DHIS2. It is rebuilt in the browser from the saved event data whenever it
is needed, so it uses no file storage on the server.

---

## Contents

1. [How it works](#1-how-it-works)
2. [Requirements](#2-requirements)
3. [Installation](#3-installation)
4. [DHIS2 configuration](#4-dhis2-configuration)
5. [Plugin settings (constants and dataStore)](#5-plugin-settings-constants-and-datastore)
6. [Using the plugin](#6-using-the-plugin)
7. [Stored data format](#7-stored-data-format)
8. [Development](#8-development)
9. [Troubleshooting](#9-troubleshooting)
10. [Known limitations](#10-known-limitations)

---

## 1. How it works

### Coupon number format

```
<parent>-<AAA><NN>
```

| Part | Meaning |
|---|---|
| `parent` | The Peer Mobilizer (seed) code, e.g. `101-001`, or an existing coupon for recursive generation, e.g. `101-001-KAZ01` |
| `AAA` | Random 3-letter code (A–Z), never reused under the same parent |
| `NN` | Sequential number under the parent: at least 2 digits, continues across events (`…05`, then `…06` in the next batch) |

Examples:

| Parent | Generated coupons |
|---|---|
| `101-001` (seed) | `101-001-KAZ01`, `101-001-PXT02`, `101-001-MQN03` |
| `101-001` (second batch) | `101-001-RDL04`, `101-001-BFW05` |
| `101-001-KAZ01` (recruit became a mobilizer) | `101-001-KAZ01-QIJ01`, `101-001-KAZ01-AZX02` |

### Generation flow

```
EPOA event form (Capture)
  Peer Mobilizer Code + Number of coupons (+ Expiry date, auto-filled)
        │
        ▼
  [Generate coupons]  (plugin)
    1. validate the inputs
    2. search saved EPOA events with the same Peer Mobilizer Code
       → last number used + random codes already used
    3. build the new coupon numbers
    4. write couponNumbers + couponGenerationDate into the form
        │
        ▼
  User clicks Save in Capture → values stored on the event
        │
        ▼
  Reopen event → coupon details + table, Preview PDF / Download PDF
```

The plugin works out which numbers and codes are already taken by searching earlier saved events.
It uses no separate counter and needs no extra storage.

---

## 2. Requirements

| Item | Notes |
|---|---|
| DHIS2 instance | A version whose Capture app supports form field plugins in program stage forms |
| Capture app | Bundled or App Hub version, with form field plugin support |
| Tracker Plugin Configurator | Installed from the App Hub. Used to place the plugin in the form and map the fields |
| Admin user | Authority to install apps, edit metadata (Maintenance) and use the Data Store Manager (optional) |
| For building from source | Node.js 18+ and Yarn 1.x (or npm) |

---

## 3. Installation

### 3.1 Build the app

```bash
cd coupon-pdf-gen
yarn install        # or: npm install
yarn build          # or: npm run build
```

The installable file is created at:

```
build/bundle/coupon-pdf-gen-<version>.zip
```

### 3.2 Install in DHIS2

Either:

- **App Management (UI):** open **App Management → Upload app** and select the `.zip` file. Or
- **Command line:** run `yarn deploy` and enter the server URL and an admin username and password
  when prompted (run `yarn build` first).

After installing, the plugin is served at:

```
https://<your-server>/api/apps/coupon-pdf-gen/plugin.html
```

### 3.3 Updating to a new version

1. Increase `version` in `package.json` (recommended, so the zip name changes).
2. Run `yarn build` and upload the new zip in App Management. It replaces the old version.
3. Users hard-reload Capture (**Ctrl+Shift+R**) to pick up the new plugin.

---

## 4. DHIS2 configuration

### 4.1 Data elements

In **Maintenance → Data element**, create these data elements with **Domain type: Tracker**, then
add them to the **EPOA program stage** (**Maintenance → Program → \<program\> → Program stages →
EPOA → Data elements**).

| Purpose | Suggested name | Value type | Plugin alias | Shown in form? |
|---|---|---|---|---|
| Peer Mobilizer Code (the parent) | e.g. "Primary coupon" | Text | `peerMobilizerCode` | **Yes** (user types it) |
| Number of coupons to generate | Coupon quantity | Positive integer | `couponQuantity` | **Yes** (user types it) |
| Coupon expiry date | Coupon expiry date | Date | `couponExpiryDate` | Optional (see below) |
| Date the coupons were generated | Coupon generation date | Date | `couponGenerationDate` | No |
| Issued coupons (JSON list) | Coupon numbers | Long text | `couponNumbers` | No |

Recommended: give the **Peer Mobilizer Code** and **Coupon numbers** data elements a **Code** in
Maintenance. The plugin looks them up by code (or by name if no code is set) when it searches
earlier events, and a code makes that lookup reliable.

### 4.2 Place the plugin in the EPOA form (Tracker Plugin Configurator)

1. Open the **Tracker Plugin Configurator** and choose your program, then the **EPOA program
   stage** form (not the enrollment form).
2. Drag the **coupon-pdf-gen** plugin into the section where the button should appear.
3. Open the plugin's **settings** and map **every** data element from the table above to its
   **Plugin alias**, spelled exactly as shown:
   `peerMobilizerCode`, `couponQuantity`, `couponExpiryDate`, `couponGenerationDate`, `couponNumbers`.
4. In the **form layout**:
   - **Keep** the fields users must type into (Peer Mobilizer Code, Coupon quantity) as normal fields.
   - **Remove** the fields users should not see or edit (generation date, coupon numbers). They stay
     mapped to the plugin, so their values are still saved with the event.
   - The expiry date is auto-filled with today + 3 months. Keep it in the layout if users must be
     able to change it; remove it to make it fixed.
5. **Save** the configuration and hard-reload Capture.

> **How hidden fields still work:** a data element that is mapped to the plugin but not placed in
> the layout isn't drawn by Capture, but the plugin can still read and write it, and Capture saves
> it with the event. A data element that is both in the layout **and** mapped is shown normally, and
> the plugin sees whatever the user types.

> **Do not hide fields with program rules (HIDEFIELD).** Capture clears the value of hidden fields,
> which would erase the coupon numbers before saving.

If any alias is missing, the plugin shows **"Plugin configuration incomplete"** with the list of
missing aliases.

### 4.3 User access

Users who generate coupons need:

- **Data write** access to the EPOA program stage (to save the event).
- **Data read** access to EPOA events in the org units where earlier coupons for the same mobilizer
  were issued. The search uses org unit mode `ACCESSIBLE` by default (configurable, see
  `orgUnitMode`).
- **Metadata read** access to the data elements and program stage (normal for Capture users).
- If the plugin does not load for some users, add the **coupon-pdf-gen** app to their user role.

### 4.4 Optional: lock completed events

To stop changes after coupons are issued:

- **Maintenance → Program → Program stages → EPOA →** tick **"Block entry form after completed"**.
- Don't give ordinary users the **"Uncomplete events"** authority.
- Optionally set **"Complete events expiry days"** on the program.

---

## 5. Plugin settings (constants and dataStore)

All settings have defaults in [`src/constants.ts`](src/constants.ts) (`DEFAULT_CONFIG`). Any of
them can be **overridden without rebuilding** from the DHIS2 **dataStore**:

| | |
|---|---|
| Namespace | `couponPdfGen` |
| Key | `config` |

**Merge rule:** a value in the dataStore is used only when it is **provided** and has the **same
type** as the default. Missing keys, `null`, empty strings, empty lists and wrong types fall back to
`constants.ts`. Unknown keys are ignored. If the entry doesn't exist (or the user can't read it),
all defaults are used.

### 5.1 Settings reference

| Key | Default | Description |
|---|---|---|
| `fields.mobilizerCode` | `peerMobilizerCode` | Plugin alias of the Peer Mobilizer Code data element |
| `fields.quantity` | `couponQuantity` | Plugin alias of the number-of-coupons data element |
| `fields.expiryDate` | `couponExpiryDate` | Plugin alias of the expiry date data element |
| `fields.generationDate` | `couponGenerationDate` | Plugin alias of the generation date data element |
| `fields.couponNumbers` | `couponNumbers` | Plugin alias of the coupon numbers (JSON) data element |
| `expiryMonths` | `3` | Months added to today for the default expiry date |
| `maxQuantity` | `99` | Maximum coupons per generation |
| `requiredBeforeGenerate` | `["mobilizerCode", "quantity"]` | Field keys (from `fields`) that must be filled before **Generate coupons** is enabled |
| `hideGenerateUntilReady` | `false` | `true` hides the button until the required fields are filled; `false` shows it disabled with a hint |
| `mobilizerCodePattern` | `""` (no check) | Regular expression the Peer Mobilizer Code must match, e.g. `^\\d{3}-\\d{3}(-[A-Z]{3}\\d{2,})*$` |
| `mobilizerCodePatternMessage` | `Peer Mobilizer Code: expected format 101-001` | Message shown when the pattern doesn't match |
| `couponCode.letters` | `ABCDEFGHIJKLMNOPQRSTUVWXYZ` | Characters used for the random code |
| `couponCode.length` | `3` | Length of the random code |
| `couponCode.suffixDigits` | `2` | Minimum digits of the sequential number |
| `orgUnitMode` | `ACCESSIBLE` | Org unit scope used when searching earlier coupons (`ACCESSIBLE`, `CAPTURE`, `ALL`, …) |
| `dateLocale` | `en-GB` | Locale for long dates ("22 September 2026") |
| `pdf.fileNamePrefix` | `EPOA_Coupons` | Download name: `<prefix>_<code>_<YYYY-MM-DD>.pdf` |
| `pdf.title` | `EPOA COUPON GENERATION SHEET` | PDF title |
| `pdf.titleColor` | `[84, 122, 161]` | Title colour (RGB) |
| `pdf.labels.cbo` | `Community-Based Organization (CBO)` | Label (PDF and plugin view) |
| `pdf.labels.generationDate` | `Date of generation` | Label |
| `pdf.labels.mobilizerCode` | `Peer Mobilizer Code` | Label |
| `pdf.labels.couponCount` | `Number of Coupons Generated` | Label |
| `pdf.labels.expiryDate` | `Coupon Expiry Date` | Label |
| `pdf.labels.tableNumber` | `No.` | Table header |
| `pdf.labels.tableCoupon` | `Coupon Number` | Table header |
| `pdf.labels.notice` | `Important Notice` | Notice heading |
| `pdf.notice` | *(the notice paragraph)* | Notice text at the bottom of the PDF |

The CBO name on the sheet is the **display name of the event's organisation unit**. The two logos
are the image files in `src/assets/` (`usaid-flag.png`, `epic-logo.png`). To change them, replace
the files and rebuild.

### 5.2 Creating the dataStore entry

1. Open the **Data Store Manager** app (install it from the App Hub if needed).
2. Create namespace **`couponPdfGen`** with key **`config`**.
3. Enter only the values you want to change. Example:

```json
{
  "expiryMonths": 6,
  "maxQuantity": 50,
  "hideGenerateUntilReady": true,
  "mobilizerCodePattern": "^\\d{3}-\\d{3}(-[A-Z]{3}\\d{2,})*$",
  "pdf": {
    "title": "EPOA COUPON SHEET",
    "labels": { "notice": "Notice" }
  }
}
```

4. Share the namespace so users who generate coupons have **read** access.
5. Users reload Capture to pick up the change.

---

## 6. Using the plugin

1. In Capture, open the enrollment and add (or open) an **EPOA** event.
2. Fill in the **Peer Mobilizer Code** (e.g. `101-001`, or a coupon such as `101-001-KAZ01`) and the
   **number of coupons**. **Generate coupons** becomes available once both are filled. Capture
   records a field's value when you leave the field.
3. Check the expiry date (auto-filled to today + 3 months, if the field is shown).
4. Click **Generate coupons**. The coupon details and table appear, with a red **"Remember to
   save"** message.
5. Click Capture's **Save**. Coupons are stored only when the event is saved. Unsaved coupons are
   discarded.
6. Reopen the saved event at any time to see the coupons and use **Preview PDF** or **Download
   PDF**. These buttons are disabled until the event has been saved.

Once an event has coupons, **Generate coupons** is no longer shown on that event, so coupons are
never issued twice from the same event.

---

## 7. Stored data format

`couponNumbers` (Long text) holds a JSON list. Each entry has a redemption status for future
tracking:

```json
[
  { "clientCoupon": "101-001-KAZ01", "redeemed": false, "redeemedAt": null },
  { "clientCoupon": "101-001-PXT02", "redeemed": false, "redeemedAt": null }
]
```

- `redeemed` / `redeemedAt` are not changed by this plugin. A future redemption tool can update them,
  and the plugin keeps any values already set when it reads the list.
- The plugin still reads the older line-by-line format (one coupon per line).
- The parent is the first part of each coupon number, so the full recruitment chain can be rebuilt
  from the coupon numbers alone.

`couponGenerationDate` and `couponExpiryDate` are stored as normal DHIS2 dates.

---

## 8. Development

### Scripts

| Command | Description |
|---|---|
| `yarn start` / `npm start` | Dev server, proxying API calls to `https://dhis-epiccmr-dev.fhi360.org/` (see `package.json`). Log in with the local proxy URL printed in the terminal (e.g. `http://localhost:8080`) |
| `yarn test` | Unit tests (`src/coupons.test.ts`) |
| `yarn build` | Production build → `build/bundle/*.zip` |
| `yarn deploy` | Upload the built zip to a DHIS2 server |
| `npx tsc --noEmit -p .` | Type check |

The project contains only a **plugin** entry point (`d2.config.js`), so `yarn start` shows a blank
main page. Test the plugin inside Capture after deploying.

### Project structure

```
coupon-pdf-gen/
├── d2.config.js               # App platform config (plugin entry, pluginType CAPTURE)
├── src/
│   ├── Plugin.tsx             # Plugin entry: reads form values, generate flow, preview/download
│   ├── Plugin.types.ts        # Props Capture passes to form field plugins
│   ├── constants.ts           # DEFAULT_CONFIG (all settings) + dataStore location
│   ├── components/
│   │   ├── CouponForm.tsx     # Generate button, required-field hint, validation messages
│   │   └── CouponSheetView.tsx# Coupon details, table, Preview/Download buttons
│   ├── hooks/
│   │   ├── useConfig.ts       # Loads dataStore config and merges it over the defaults
│   │   ├── useIssuedCoupons.ts# Searches saved EPOA events for coupons already issued
│   │   └── useServerInfo.ts   # Org unit (CBO) name + system date format
│   ├── lib/
│   │   ├── config.ts          # mergeConfig (dataStore → defaults)
│   │   ├── coupons.ts         # Coupon number generation, JSON format, issued summary
│   │   ├── couponPdf.ts       # PDF layout (jsPDF + jspdf-autotable)
│   │   ├── dates.ts           # Date parsing/formatting (Capture date formats)
│   │   └── logos.ts           # Loads the logo images for the PDF
│   ├── assets/                # Logo images
│   └── coupons.test.ts        # Unit tests
```

### Notes for developers

- **Fields are accessed only by plugin alias** (`config.fields`). Capture rejects
  `setFieldValue` calls for aliases that aren't configured.
- **Date values** in Capture forms follow the system setting `keyDateFormat`
  (`yyyy-MM-dd` or `dd-MM-yyyy`). `lib/dates.ts` reads both and writes in the system format.
- **Adding a setting:** add it to `DEFAULT_CONFIG` in `constants.ts` and read it from `config` in
  the code. The dataStore override then works automatically.

---

## 9. Troubleshooting

| Symptom | Cause / fix |
|---|---|
| **"Plugin configuration incomplete"** | One or more aliases aren't mapped in the Plugin Configurator. Map them exactly as listed in [4.1](#41-data-elements) |
| Console: `setFieldValue: fieldId must be one of the configured plugin ids` | An alias in `config.fields` doesn't match the alias in the Plugin Configurator |
| **"Could not find the Peer Mobilizer Code / coupon numbers data elements"** | The lookup by name failed. Give both data elements a **Code** in Maintenance |
| **Generate coupons** stays disabled | A required field is empty (see the hint under the button). Leave the field (Tab) so Capture records the value |
| Numbers restart at `01` for a mobilizer who already has coupons | Earlier events aren't visible to the user (org unit access), or the Peer Mobilizer Code was typed differently. Check access and `orgUnitMode` |
| dataStore settings are ignored | Check the namespace and key (`couponPdfGen` / `config`), valid JSON, value types, and that users can read the namespace. The browser console shows a warning if it can't be read |
| Plugin not visible / old version shows | Hard-reload Capture (**Ctrl+Shift+R**). Check that the plugin is placed in the **EPOA stage** form |
| Generated coupons disappeared | The event was not saved after generating. Generate again and click **Save** |

---

## 10. Known limitations

- **Simultaneous generation:** if two users generate coupons for the **same** Peer Mobilizer Code
  before either saves, both can get the same numbers. Saved events are always taken into account.
- **Search scope:** only events the user can access (per `orgUnitMode`) are searched.
- **Deleted events:** numbers from deleted events can be issued again.
- **Seed codes** (`101-001`) are typed in. Deriving the district code from the org unit and
  auto-numbering seeds is not part of this plugin.
- Screen text such as button labels and messages is in English and not yet configurable.
