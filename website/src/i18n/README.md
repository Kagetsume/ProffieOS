# i18n

Component-scoped internationalization for the ProffieOS config editor. Each Lit component can ship its own JSON message bundles; shared copy lives in a chainable **root client**. All resolved strings pass through **DOMPurify** before UI injection.

Built on plain JSON key/value files, `${variable}` substitution, and `Intl` formatters — no external i18n framework.

## Quick start

### Root client (application-wide)

Configured in `root.ts`. Import `rootI18n` for shared strings:

```ts
import { rootI18n } from '../../i18n';

rootI18n.translate('actions.copy'); // "Copy"
```

### Component client

Use `createComponentI18n()` from `ui/elements/create-component-i18n.ts` (parents to
`rootI18n` automatically). One `*.i18n.ts` + `locales/po-<component>.en.json` per component:

```ts
// ui/elements/po-copy-panel.i18n.ts
import { createComponentI18n } from './create-component-i18n.js';
import en from './locales/po-copy-panel.en.json';

/** Empty local bundle — Copy/Download/Copied! come from root common.json. */
export const copyPanelI18n = createComponentI18n({ en });
```

Add regional bundles when needed: `{ root, en, en_US: enUs }`.

Use in render:

```ts
html`<wa-button>${copyPanelI18n.translate('actions.copy')}</wa-button>`;
copyPanelI18n.translate('hint.filename', { filename: this.filename });
```

## Message lookup order

For active locale `en_US`, **each client** resolves keys in this order:

1. `en_US` bundle
2. `en` bundle
3. `root` bundle (client-wide fallback, not the root *client*)
4. **Parent client** (same rules, recursively)
5. Raw key string (missing translation)

Browser tags like `en-US` are normalized to `en_US` for bundle keys. Missing bundle tables are skipped (no error).

### Parent chaining

| `parent` option | Behavior |
|-----------------|----------|
| **Omitted** | Defaults to registered `rootI18n` |
| **`null`** | No parent — use for the app root client only |
| **Explicit client** | Consult that client after local bundles |

Components **override** root strings locally without affecting other components. Undefined keys **fall through** to root.

## JSON bundle files

One file per locale tag per component. Flat `key → string` objects:

```json
{
  "panel.title": "Blade ${index}",
  "actions.copy": "Copy to clipboard"
}
```

All `po-*` components follow this layout (see `ui/elements/locales/`):

```
ui/elements/
  po-copy-panel.ts
  po-copy-panel.i18n.ts
  create-component-i18n.ts
  locales/
    po-copy-panel.en.json
    po-export-page.en.json
    …
```

Shared actions (`actions.copy`, `actions.remove`, …) and nav labels (`nav.route.*`) live in
`i18n/locales/en/common.json` — component JSON only needs strings unique to that component.

Root shared bundles:

```
i18n/locales/
  root/common.json
  en/common.json
  en_US/common.json   ← add when needed
```

## API reference

### Client factories

| Function | Description |
|----------|-------------|
| `createI18nClient(options)` | Component client; parents to `rootI18n` when `parent` is omitted |
| `createRootI18nClient(options)` | App root client; always uses `parent: null` |

### `I18nClient`

| Method / property | Description |
|-------------------|-------------|
| `locale` | Active locale tag (normalized, e.g. `en_US`) |
| `parent` | Parent client, or `null` |
| `translate(key, substitutions?)` | Resolve key, substitute `${vars}`, sanitize, return string |
| `resolveRaw(key)` | Resolve key without substitution or sanitization (tests/tooling) |
| `setBundles(bundles)` | Replace bundle tables for current locale |
| `setLocale(locale, bundles)` | Switch locale and bundles; root client also updates app locale |
| `formatNumber(value, options?)` | `Intl.NumberFormat` using this client's locale |
| `formatDate(date, options?)` | `Intl.DateTimeFormat` using this client's locale |

### Standalone format helpers

| Function | Description |
|----------|-------------|
| `formatNumber(value, options?)` | Locale-aware number formatting |
| `formatDate(date, options?)` | Locale-aware date/time formatting |

**Locale resolution** (formatters): `options.locale` → `options.client.locale` → `getAppLocale()` (converted to BCP 47 for `Intl`).

**`formatDate` options:**

| Option | Values | Default |
|--------|--------|---------|
| `part` | `date`, `time`, `datetime` | `datetime` |
| `length` | `short`, `medium`, `long`, `full` | `medium` |
| `timeZone` | IANA zone string | browser default |

`formatNumber` forwards additional options to `Intl.NumberFormat` (`style`, `currency`, `maximumFractionDigits`, …).

### Locale utilities

| Function | Description |
|----------|-------------|
| `detectBrowserLocale()` | `navigator.language` normalized to `en_US` form |
| `normalizeLocaleTag(tag)` | `en-US` → `en_US` |
| `toIntlLocaleTag(tag)` | `en_US` → `en-US` for `Intl` APIs |
| `localeLookupChain(locale)` | `['en_US', 'en']` — language tags only (no `root`) |
| `getAppLocale()` / `setAppLocale(locale)` | App-wide locale for standalone formatters |
| `resolveLocale(source?)` | Resolve BCP 47 tag for `Intl` from override, client, or app locale |

### Substitution and sanitization

| Function | Description |
|----------|-------------|
| `applySubstitutions(template, map?)` | Replace `${name}` tokens; unknown keys left intact |
| `sanitizeI18nString(value)` | DOMPurify strip-all-tags; keep text content |

**Substitution rules:**

- Map keys match `${variable}` names inside the template
- Values may be `string`, `number`, or `boolean` (coerced to string)
- Missing map keys → token unchanged
- Extra map keys → ignored
- Each value and the final string are sanitized

### Types

| Type | Description |
|------|-------------|
| `LocaleId` | String locale tag |
| `I18nMessages` | `Record<string, string>` |
| `I18nLocaleBundles` | `{ root?, en?, en_US?, … }` |
| `SubstitutionMap` | `Record<string, string \| number \| boolean>` |
| `I18nClientOptions` | `{ locale, bundles, parent? }` |
| `FormatNumberOptions` | Locale source + `Intl.NumberFormatOptions` |
| `FormatDateOptions` | Locale source + `part`, `length`, `timeZone` |

## Module map

| File | Role |
|------|------|
| `index.ts` | Public exports |
| `client.ts` | `I18nClient` class |
| `create-client.ts` | Factory functions |
| `root.ts` | `rootI18n` singleton |
| `client-registry.ts` | Default parent registration |
| `bundles.ts` | Bundle normalization and lookup tag order |
| `locale-chain.ts` | Tag normalization, browser locale, Intl conversion |
| `resolve-locale.ts` | App locale + formatter locale resolution |
| `substitute.ts` | `${variable}` replacement |
| `sanitize.ts` | DOMPurify wrapper |
| `format-number.ts` | `Intl.NumberFormat` helper |
| `format-date.ts` | `Intl.DateTimeFormat` helper |
| `types.ts` | Shared TypeScript types |

## Security

All strings returned from `translate()` are sanitized. User-supplied substitution values (preset names, filenames, etc.) are stripped of HTML/script before interpolation. Prefer `translate()` for any dynamic copy — do not bypass sanitization when using `unsafeHTML`.

Lit text bindings already escape HTML; sanitization adds defense in depth for substitution values and tampered JSON bundles.

## Testing

```bash
cd website
npx vitest run src/i18n
```

Test files mirror modules: `i18n.test.ts`, `format.test.ts`, `locale-chain.test.ts`, `substitute.test.ts`, `sanitize.test.ts`, `bundles.test.ts`, `resolve-locale.test.ts`, `client-registry.test.ts`.

## Future work

- Locale picker Effector store wired to `rootI18n.setLocale()`
- Lazy-loaded JSON bundles per language
- Wire `translate()` into existing `<po-*>` components
