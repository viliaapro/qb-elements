# @viliaapro/qb-elements

Vanilla web components for building query expressions from a grammar.

Four structural elements — **union** (sum type), **list** (sequence), **record** (product type), **leaf** (input wrapper) — compose recursively in plain HTML. Leaves are native inputs: `<input>`, `<select>`, `<input type="date">`, anything the browser provides.

```html
<qb-union label="Query type" default="Simple search">
  <qb-option key="Simple search">
    <template>
      <qb-leaf><input type="text" placeholder="Search…" required /></qb-leaf>
    </template>
  </qb-option>
  <qb-option key="By ID">
    <template>
      <qb-leaf><input type="number" placeholder="ID…" required /></qb-leaf>
    </template>
  </qb-option>
</qb-union>
```

## Install

```bash
npm install @viliaapro/qb-elements
```

Or grab the compiled file directly:

```html
<script src="dist/qb-elements.js"></script>
```

## Usage

```js
import { QbElements } from '@viliaapro/qb-elements'

// Optional — bring your own stylesheet.
// Call before any qb-* elements connect to the DOM.
const sheet = new CSSStyleSheet()
await sheet.replace(await fetch('/my-styles.css').then(r => r.text()))
QbElements.setStyleSheet(sheet)
```

Collect the value from any root element:

```js
const root = document.querySelector('qb-union')
root.value  // { selected: 'Simple search', value: 'hello' }
```

## Elements

### `<qb-union>`

A discriminated sum. Renders a `<select>` from its `<qb-option>` children and shows the selected option's content below.

```html
<qb-union default="Name">
  <qb-option key="Name">
    <template><input type="text" /></template>
  </qb-option>
  <qb-option key="Date">
    <template><input type="date" /></template>
  </qb-option>
</qb-union>
```

**Attributes**

| Attribute | Default | Description |
|---|---|---|
| `default` | first option | Key of the initially selected option |

**`.value`** → `{ selected: string, value: unknown }`

---

### `<qb-option>`

Inert container, child of `<qb-union>`. Carries a `key` attribute and a single `<template>` child. Never rendered directly.

| Attribute | Description |
|---|---|
| `key` | The label shown in the dropdown |

---

### `<qb-list>`

A homogeneous sequence. Stamps out clones of its `<template>` child. Each item gets a remove button; an add button appends new items.

```html
<qb-list min-items="1" initial-count="2">
  <template>
    <qb-leaf><input type="text" placeholder="Tag…" /></qb-leaf>
  </template>
</qb-list>
```

**Attributes**

| Attribute | Default | Description |
|---|---|---|
| `min-items` | `0` | Minimum items; remove is disabled at this floor |
| `max-items` | — | Maximum items; add is disabled at this ceiling |
| `initial-count` | `1` | Items rendered on connect |

**`.value`** → `unknown[]`

---

### `<qb-record>`

A product type — a fixed set of named fields. Children are `<qb-field name="...">` elements each containing exactly one node.

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

**`.value`** → `Record<string, unknown>`

---

### `<qb-field>`

Inert container, child of `<qb-record>`. Carries a `name` attribute and contains exactly one child node.

| Attribute | Description |
|---|---|
| `name` | Field name — used as the label and the key in `.value` |

---

### `<qb-leaf>`

Optional wrapper for a single native input. Displays the browser's `validationMessage` below the input after the user has interacted with it. Participates in the validation protocol by delegating to its child.

```html
<qb-leaf>
  <input type="email" required />
</qb-leaf>
```

Bare inputs work without `<qb-leaf>` — it is only needed when you want inline validation messages displayed below the input.

---

## `.value` shapes

The hybrid algebraic shape — each node type returns its natural value, union includes the selected key:

```js
// qb-union
{ selected: 'Filter list', value: [ ... ] }

// qb-list
[ { operator: 'equals', value: 'alice' }, { operator: 'contains', value: 'bob' } ]

// qb-record
{ operator: 'equals', value: 'alice' }

// native input / select / textarea
'alice'   // string
true      // boolean (checkbox)
```

Accessing `.value` on a root element recursively collects the entire tree.

---

## Validation

All three composite elements and `<qb-leaf>` implement `checkValidity()` and `validationMessage`, mirroring the native input API.

### `checkValidity()`

Calling `checkValidity()` on any node recursively checks the entire subtree beneath it — a logical AND over all descendants. This mirrors how `checkValidity()` works on a `<form>` element in the HTML spec, which runs constraint validation over all its submittable children.

On leaf nodes — native inputs inside `<qb-leaf>` — `checkValidity()` fires the browser's `invalid` event if the input is invalid. `<qb-leaf>` listens for this event and displays the `validationMessage` inline below the input. This means calling `checkValidity()` on a root element both validates the tree and triggers inline messages on all invalid leaves in one pass, with no browser validation bubble.

```js
if (!root.checkValidity()) {
  // inline messages are now showing on all invalid qb-leaf elements
  console.log(root.validationMessage) // hint about which composite node failed
  return
}
const result = root.value
```

### `validationMessage`

Returns `''` when the node is valid. On composite nodes it returns a fixed hint string:

| Element | Message |
|---|---|
| `<qb-union>` | `'Selection is incomplete'` |
| `<qb-list>` | `'One or more items are invalid'` |
| `<qb-record>` | `'One or more fields are invalid'` |
| `<qb-leaf>` | The browser's native validation string for the wrapped input |

### Constraints

Declare constraints on native inputs using standard HTML attributes — `required`, `pattern`, `type`, `min`, `max`, `minlength`, `maxlength`. No library API needed.

```html
<qb-leaf>
  <input type="email" required />
</qb-leaf>
```

---

## Styling

Elements use open shadow DOM and `adoptedStyleSheets`. Structural styles (indentation, flex layout) are built in. All other styling — inputs, buttons, labels — comes from your own stylesheet.

```js
import { QbElements } from '@viliaapro/qb-elements'

const sheet = new CSSStyleSheet()
await sheet.replace(css)
QbElements.setStyleSheet(sheet)   // shared across all shadow roots, zero duplication
```

Internal CSS class names for styling hooks:

| Class | Element | Purpose |
|---|---|---|
| `qb-select` | `<qb-union>` | the variant dropdown |
| `qb-btn qb-btn-add` | `<qb-list>` | add button |
| `qb-btn qb-btn-close` | `<qb-list>` | close button per item |
| `qb-field-label` | `<qb-field>` | field name label |
| `qb-leaf-msg` | `<qb-leaf>` | validation message span |

---

## Deferred stamping

`<qb-option>` and `<qb-list>` require content wrapped in a `<template>` tag. A `<template>` element is a browser primitive for inert content — the browser parses it but does not render or upgrade custom elements inside it until the fragment is explicitly cloned.

Without `<template>`, child elements would connect to the DOM immediately, running their own lifecycle before the parent has read them. With `<template>`, the parent clones the fragment on demand — when a union variant is selected or a list item is added. This is the same role a factory function — or lambda — plays in a programmatic API: `() => new Node()` defers construction until needed.

The `<template>` requirement applies wherever content is stamped conditionally or repeatedly:

- `<qb-option>` — stamped when its variant is selected
- `<qb-list>` — stamped once per item, potentially many times

`<qb-record>` does not use `<template>` because its fields render exactly once on connect.

---

## Composing grammars

Elements compose arbitrarily deep:

```html
<qb-list label="Filters" min-items="1">
  <template>
    <qb-union label="Field">
      <qb-option key="Name">
        <template><qb-leaf><input type="text" placeholder="Name…" /></qb-leaf></template>
      </qb-option>
      <qb-option key="Created">
        <template><input type="date" /></template>
      </qb-option>
      <qb-option key="Status">
        <template>
          <select>
            <option>active</option>
            <option>inactive</option>
          </select>
        </template>
      </qb-option>
    </qb-union>
  </template>
</qb-list>
```

`.value` on the list returns:

```js
[
  { selected: 'Name',    value: 'alice' },
  { selected: 'Status',  value: 'active' },
  { selected: 'Created', value: '2024-01-15' }
]
```

---

## Labels

Semantic keys — `name` on `<qb-field>` and `key` on `<qb-option>` — are separate from their display strings. A label registry maps keys to display content.

Each entry can be a plain string, a DOM Node, or an object with separate `display` and `aria` properties:

```js
QbElements.setLabels({
  field: {
    'field':    'Column',                              // string: display and aria
    'operator': { display: 'Condition' },              // object: display only
    'value':    { display: valueIcon, aria: 'Value' }, // object: Node display + aria string
  },
  option: {
    'Simple search': 'Keyword',
    'Filter list':   'Filters',
    'By ID':         'ID',
  },
})
```

**Display resolution** — for each key, the display value is resolved in this order:

1. Entry's `display` property (if object form)
2. The entry itself if string or Node
3. Raw key as final fallback

**Aria resolution** — for `aria-label` attributes, resolved in this order:

1. Entry's `aria` property (if object form)
2. The entry itself if it is a string
3. Left unset — no fallback to raw key (avoids exposing code-level identifiers to assistive technology)

Labels are namespaced to prevent collisions between field names and option keys:

| Namespace | Resolves keys from |
|---|---|
| `field` | `name` attribute on `<qb-field>` |
| `option` | `key` attribute on `<qb-option>` (display text only — `.value` always returns the raw key) |

## i18n

All internal strings are translatable via `QbElements.setStrings()`. Call it before any elements connect to the DOM. Partial overrides are fine — unset keys fall back to the English defaults.

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

Elements are built with screen reader support in mind.

**Roles** — structural roles are set in shadow DOM templates:

| Element | Role |
|---|---|
| `<qb-record>` | `group` — groups related fields |
| `<qb-list>` | `list` — homogeneous sequence |
| list item row | `listitem` |

`<qb-union>` and `<qb-field>` have no explicit host role — their semantics come from the native elements inside them.

**Labeling** — `<qb-field>` generates a unique `id` for its label element and sets `aria-labelledby` on each slotted child, associating the visible label text with the control.

`aria-label` is only set when a `QbLabelEntry` object with an explicit `aria` property is registered for that key via `setLabels`. In all other cases it is left unset, so the browser derives the accessible name from visible content. This follows the guidance from MDN's [Accessible name](https://developer.mozilla.org/en-US/docs/Glossary/Accessible_name):

> It is best to use visible text as the accessible name. Many elements, including `<a>`, `<td>` and `<button>`, can get their accessible name from their content. For example, given `<a href="foo.html">Bar</a>`, the accessible name of this hyperlink is "Bar."

`aria-label` should therefore only be supplied when the visible label is a Node whose text content is insufficient or absent — for example, an icon-only label.

`<qb-leaf>` — the validation message span has `role="alert"` and `aria-live="polite"` so screen readers announce it when it appears. The wrapped input has `aria-describedby` pointing to the message span.

## License

MIT
