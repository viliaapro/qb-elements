# @viliaapro/qb-elements

Vanilla web components for building query expressions from a typed grammar. Three structural elements — **union** (sum type), **list** (sequence), **record** (product type) — compose recursively in plain HTML. Native inputs are the leaves.

```html
<qb-record>
  <qb-field name="Search by">
    <qb-union default="Keyword">
      <qb-option key="Keyword">
        <template>
          <qb-leaf><input type="text" required /></qb-leaf>
        </template>
      </qb-option>
      <qb-option key="ID">
        <template>
          <qb-leaf><input type="number" required min="1" /></qb-leaf>
        </template>
      </qb-option>
    </qb-union>
  </qb-field>
</qb-record>
```

## Install

```bash
npm install @viliaapro/qb-elements
```

## Setup

The library loads `qb-styles.css` and `qb-templates.html` from alongside the module at startup. Call configuration before any elements connect to the DOM, then optionally await `QbElements.ready` before reading values:

```js
import { QbElements } from '@viliaapro/qb-elements'

QbElements.setStyleSheet(sheet)   // optional — see Styling
QbElements.setStrings({ ... })    // optional — see i18n
QbElements.setLabels({ ... })     // optional — see Labels

await QbElements.ready            // resolves when CSS and templates are loaded
```

---

## Elements

### `<qb-union>`

A discriminated sum. Renders a `<select>` populated from its `<qb-option>` children. The selected option's template is stamped below.

```html
<qb-union default="Keyword">
  <qb-option key="Keyword">
    <template>...</template>
  </qb-option>
  <qb-option key="Date range">
    <template>...</template>
  </qb-option>
</qb-union>
```

| Attribute | Default | Description |
|---|---|---|
| `default` | first option | Key of the initially selected option |

`.value` → `{ selected: string, value: unknown }`

---

### `<qb-option>`

Inert, child of `<qb-union>`. Carries a `key` and a single `<template>`. Never rendered directly — the union stamps its template on demand.

| Attribute | Description |
|---|---|
| `key` | Identifier shown in the dropdown; resolved through the label registry for display |

---

### `<qb-list>`

A homogeneous sequence. Stamps clones of its `<template>` child. Each item gets a close button; an add button appends new items.

```html
<qb-list min-items="1" initial-count="2">
  <template>
    <qb-leaf><input type="text" /></qb-leaf>
  </template>
</qb-list>
```

| Attribute | Default | Description |
|---|---|---|
| `min-items` | `0` | Minimum items; close button disabled at this floor |
| `max-items` | — | Maximum items; add button disabled at this ceiling |
| `initial-count` | `1` | Items stamped on connect |

`.value` → `unknown[]`

---

### `<qb-record>`

A product type — a fixed set of named fields. Children are `<qb-field name="...">` elements.

```html
<qb-record>
  <qb-field name="operator">
    <select>
      <option>equals</option>
      <option>contains</option>
    </select>
  </qb-field>
  <qb-field name="value">
    <qb-leaf><input type="text" required /></qb-leaf>
  </qb-field>
</qb-record>
```

`.value` → `Record<string, unknown>`

---

### `<qb-field>`

Child of `<qb-record>`. Renders a labeled row in its own shadow DOM with a default slot. Owns its label element and the `aria-labelledby` association to its child. Layout is delegated here — `<qb-record>` is a passthrough.

| Attribute | Description |
|---|---|
| `name` | Semantic key — used as the `.value` key and resolved through the label registry for display |

---

### `<qb-leaf>`

Optional wrapper for a single native input. Projects the input via a slot and displays the browser's `validationMessage` below it after the user interacts. Participates in the validation protocol by delegating to its child.

```html
<qb-leaf>
  <input type="email" required />
</qb-leaf>
```

Bare inputs work without `<qb-leaf>` — it is only needed when you want inline validation messages.

---

## `.value` shapes

Each element exposes `.value` recursively. Reading it on any root element collects the entire subtree in one call.

```js
// qb-union
{ selected: 'Keyword', value: 'alice' }

// qb-list
[ { operator: 'equals', value: 'alice' }, { operator: 'contains', value: 'bob' } ]

// qb-record
{ operator: 'equals', value: 'alice' }

// native input / select / textarea
'alice'   // string
true      // boolean (checkbox)
```

---

## Deferred stamping

`<qb-option>` and `<qb-list>` require their content in a `<template>` tag. A `<template>` is a browser primitive for inert content — parsed but not rendered or upgraded until explicitly cloned. This defers element construction to the moment it is needed: when a union variant is selected, or when a list item is added. The `<template>` requirement applies wherever content is stamped conditionally or repeatedly:

- `<qb-option>` — stamped when its variant is selected
- `<qb-list>` — stamped once per item

`<qb-record>` does not use `<template>` — its fields are fixed and rendered once on connect.

---

## Validation

`<qb-union>`, `<qb-list>`, `<qb-record>`, and `<qb-leaf>` all implement `checkValidity()` and `validationMessage`, mirroring the native input API.

### `checkValidity()`

Calling `checkValidity()` on any node recursively validates the entire subtree — a logical AND over all descendants. This mirrors how `checkValidity()` works on a `<form>`, which runs constraint validation over all its submittable children.

On native inputs inside `<qb-leaf>`, `checkValidity()` fires the browser's `invalid` event. `<qb-leaf>` listens for this and displays the `validationMessage` inline. So calling `checkValidity()` on a root node both validates the tree and triggers inline messages on all invalid leaves — no browser validation bubble.

```js
if (!root.checkValidity()) {
  // inline messages are now showing on all invalid qb-leaf elements
  return
}
const result = root.value
```

### `validationMessage`

Returns `''` when valid. On composite nodes it returns a fixed string:

| Element | Message |
|---|---|
| `<qb-union>` | `'Selection is incomplete'` |
| `<qb-list>` | `'One or more items are invalid'` |
| `<qb-record>` | `'One or more fields are invalid'` |
| `<qb-leaf>` | The browser's native validation string for the wrapped input |

Constraints are declared on native inputs with standard HTML attributes — `required`, `pattern`, `type`, `min`, `max`, `minlength`, `maxlength`.

---

## Styling

Elements use open shadow DOM with `adoptedStyleSheets`. A structural stylesheet (`qb-styles.css`) is always applied, providing layout geometry only — no colours, no typography.

To supply your own stylesheet, call `setStyleSheet` before any elements connect:

```js
const sheet = new CSSStyleSheet()
await sheet.replace(await fetch('/my-styles.css').then(r => r.text()))
QbElements.setStyleSheet(sheet)
```

The user sheet is adopted before the structural sheet in every shadow root, so structural rules can be overridden.

Internal CSS classes available as styling hooks:

| Class | Where | Purpose |
|---|---|---|
| `.qb-select` | `<qb-union>` shadow | the variant dropdown |
| `.qb-indent` | `<qb-union>` shadow | indented body below the select |
| `.qb-items` | `<qb-list>` shadow | container for item rows |
| `.qb-row` | `<qb-list>` shadow | each item row |
| `.qb-row-content` | `<qb-list>` shadow | item content wrapper inside each row |
| `.qb-actions` | `<qb-list>` shadow | add button container |
| `.qb-btn` | `<qb-list>` shadow | shared class on add and close buttons |
| `.qb-btn-add` | `<qb-list>` shadow | add button |
| `.qb-btn-close` | `<qb-list>` shadow | close button on each row |
| `.qb-fields` | `<qb-record>` shadow | container for field rows |
| `.qb-field-row` | `<qb-field>` shadow | label + slot row |
| `.qb-field-label` | `<qb-field>` shadow | the label element |
| `.qb-leaf` | `<qb-leaf>` host | class added to the host element on connect |
| `.qb-leaf-msg` | `<qb-leaf>` shadow | validation message span |

---

## Labels

Semantic keys — `name` on `<qb-field>` and `key` on `<qb-option>` — are intentionally separate from their display strings. Call `setLabels` to register display content. Partial overrides are accepted per namespace.

```js
QbElements.setLabels({
  field:  {
    'operator': 'Condition',
    'value':    'Search for',
  },
  option: {
    'Keyword':    'Keyword search',
    'Date range': 'By date',
  },
})
```

Each entry is typed as `string | Node | { display?: string | Node, aria?: string }`:

```js
QbElements.setLabels({
  field: {
    'value': 'Search for',                        // string — display and aria
    'operator': { display: operatorIcon },        // Node display, no aria override
    'status':   { display: statusIcon, aria: 'Status' }, // Node display, explicit aria
  },
})
```

**Display resolution** for each key, in order:

1. `entry.display` if entry is an object
2. The entry itself if string or Node
3. Raw key as final fallback

**Aria resolution** for `aria-label`, in order:

1. `entry.aria` if entry is an object with `aria` set
2. Left unset otherwise — no further fallback

The `aria` property exists for the specific case where the visible label is a Node whose text content is absent or insufficient — for example, an icon-only label. When the display label is a string, `aria-label` is intentionally left unset: the browser derives the accessible name from visible content, which is preferable. From [MDN — Accessible name](https://developer.mozilla.org/en-US/docs/Glossary/Accessible_name):

> It is best to use visible text as the accessible name. Many elements, including `<a>`, `<td>` and `<button>`, can get their accessible name from their content. For example, given `<a href="foo.html">Bar</a>`, the accessible name of this hyperlink is "Bar."

---

## i18n

All internal UI strings are replaceable via `setStrings`. Partial overrides are accepted — unset keys fall back to the English defaults. Call before any elements connect.

```js
QbElements.setStrings({
  addItem:          'Lisää rivi',
  close:            'Sulje',
  selectionInvalid: 'Valinta on puutteellinen',
  listInvalid:      'Yksi tai useampi kohde on virheellinen',
  recordInvalid:    'Yksi tai useampi kenttä on virheellinen',
})
```

| Key | Default | Used in |
|---|---|---|
| `addItem` | `'Add item'` | `<qb-list>` add button label |
| `close` | `'Close'` | `<qb-list>` close button `aria-label` |
| `selectionInvalid` | `'Selection is incomplete'` | `<qb-union>` `validationMessage` |
| `listInvalid` | `'One or more items are invalid'` | `<qb-list>` `validationMessage` |
| `recordInvalid` | `'One or more fields are invalid'` | `<qb-record>` `validationMessage` |

---

## Accessibility

**Roles** are set in shadow DOM templates:

| Element | Role | Notes |
|---|---|---|
| `<qb-record>` shadow | `group` | groups related fields |
| `<qb-list>` shadow | `list` | homogeneous sequence |
| list item row | `listitem` | child of the list |

`<qb-union>` has no explicit host role — semantics come from the native `<select>` inside. `<qb-field>` has no explicit host role — it is a label container.

**Labeling** — `<qb-field>` generates a unique `id` for its label element and sets `aria-labelledby` on each slotted child. The label's visible text is the accessible name, following MDN guidance that visible text is the best source for accessible names.

`aria-label` is only set on a field's child when the label entry's `aria` property is explicitly provided — for cases where the visible label is a Node with no meaningful text content. See the Labels section for the full resolution rules.

**Validation messages** — `<qb-leaf>` gives its message span `role="alert"` and `aria-live="polite"`, so screen readers announce validation messages when they appear. The wrapped input has `aria-describedby` pointing to the message span.

---

## Build

```bash
npm install
npm run build   # tsup → dist/
npm pack        # → viliaapro-qb-elements-x.y.z.tgz
```

## License

MIT
