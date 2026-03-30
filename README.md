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
<qb-union label="Search by" default="Name">
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
| `label` | — | Label shown above the list |
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
| `qb-union-label` | `<qb-union>` | label before the dropdown |
| `qb-label` | `<qb-list>` | label above the list |
| `qb-btn` | `<qb-list>` | add and remove buttons |
| `qb-field-label` | `<qb-record>` | field name labels |
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

Semantic keys in the grammar — `name` attributes on `<qb-field>` and `key` attributes on `<qb-option>` — are separate from their display strings. A label registry maps keys to display content, supporting both plain strings and DOM nodes for rich content.

Neither `<qb-union>` nor `<qb-list>` has its own label. The standard pattern is to wrap them in a `<qb-field>`, which provides the label for the whole field. This follows the same convention as HTML form controls: the label belongs to the field container, not to the control itself.

```js
QbElements.setLabels({
  field:  { 'field': 'Column', 'operator': 'Condition', 'value': 'Search for' },
  option: { 'Simple search': 'Keyword', 'Filter list': 'Advanced', 'By ID': 'ID' },
})
```

Values can be plain strings or DOM `Node` objects for rich content:

```js
const icon = document.createElement('span')
icon.innerHTML = '🔍 Column'

QbElements.setLabels({
  field: { 'field': icon },
})
```

When a key has no registered label, the raw key string is used as a fallback — so the grammar works out of the box without any registration.

Labels are namespaced to prevent collisions:

| Namespace | Resolves keys from |
|---|---|
| `field` | `name` attribute on `<qb-field>` |
| `option` | `key` attribute on `<qb-option>` (display text only — `.value` always returns the raw key) |

Note: `aria-label` and `<option>` text only accept plain strings. When a Node is registered for those sites, the raw key is used for the accessible string while the Node renders visually.

---

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

`<qb-union>` — the variant `<select>` is labelled by its containing `<qb-field>` via `aria-labelledby` on slotted content.

`<qb-list>` — the list region has `role="group"`. Labeling is inherited from the containing `<qb-field>` via `aria-labelledby` on slotted content — no duplicate label is rendered.

`<qb-record>` — each field's label is associated with its child node via `aria-labelledby`, using a generated unique id per field.

`<qb-leaf>` — the validation message span has `role="alert"` and `aria-live="polite"` so screen readers announce it when it appears. The wrapped input has `aria-describedby` pointing to the message span.

## License

MIT
