/**
 * @viliaapro/qb-elements
 * Query Builder Web Components
 * https://github.com/viliaapro/qb-elements
 *
 * Six custom elements:
 *   <qb-union>   — discriminated sum: <select> revealing one branch
 *   <qb-list>    — homogeneous sequence with add/remove
 *   <qb-record>  — product: fixed named fields
 *   <qb-option>  — inert, child of <qb-union>
 *   <qb-field>   — field with label, child of <qb-record>
 *   <qb-leaf>    — optional wrapper for a native input; shows validationMessage
 *
 * value protocol (hybrid algebraic shape):
 *   qb-union  → { selected: string, value: unknown }
 *   qb-list   → unknown[]
 *   qb-record → Record<string, unknown>
 *   native input/select/textarea → string | boolean
 *
 * validity protocol:
 *   checkValidity()   — recursive AND over subtree; fires invalid events on leaves
 *   validationMessage — from QbComposite.invalidMessage() or native input string
 *
 * Styling:
 *   Call QbElements.setStyleSheet(sheet) before any elements connect.
 *   The structural sheet from qb-styles.css is always applied.
 *
 * i18n:
 *   Call QbElements.setStrings({ addItem, close, ... }) for translations.
 *
 * labels:
 *   Call QbElements.setLabels({ field, option }) to map semantic keys to
 *   display strings or DOM Nodes. Keys fall back to the raw string if unset.
 *   Namespaces: field (qb-field name=), option (qb-option key= display text).
 */

// ─── Load structural stylesheet and templates ─────────────────────────────────
//
// Both assets live alongside this module. Loaded once at module init using
// browser-native fetch. Shadow roots adopt the shared CSSStyleSheet instance.

const stylesURL    = new URL('./qb-styles.css',    import.meta.url)
const templatesURL = new URL('./qb-templates.html', import.meta.url)

const structuralSheet = new CSSStyleSheet()

// Templates keyed by their id attribute
const templates: Record<string, HTMLTemplateElement> = {}

// Single promise that resolves when both assets are ready
const assetsReady: Promise<void> = Promise.all([
  fetch(stylesURL)
    .then(r => r.text())
    .then(css => structuralSheet.replace(css)),
  fetch(templatesURL)
    .then(r => r.text())
    .then(html => {
      const doc = new DOMParser().parseFromString(html, 'text/html')
      doc.querySelectorAll('template[id]').forEach(tmpl => {
        templates[tmpl.id] = tmpl as HTMLTemplateElement
      })
    }),
]).then(() => {})

// ─── Stylesheet registry ──────────────────────────────────────────────────────

let userSheet: CSSStyleSheet | null = null

function adoptSheets(shadow: ShadowRoot): void {
  shadow.adoptedStyleSheets = userSheet
    ? [userSheet, structuralSheet]
    : [structuralSheet]
}

function cloneTemplate(id: string): DocumentFragment {
  return templates[id].content.cloneNode(true) as DocumentFragment
}

// ─── QbElements public API ───────────────────────────────────────────────────

export type QbStrings = {
  addItem:          string
  close:            string
  selectionInvalid: string
  listInvalid:      string
  recordInvalid:    string
}

let strings: QbStrings = {
  addItem:          'Add item',
  close:            'Close',
  selectionInvalid: 'Selection is incomplete',
  listInvalid:      'One or more items are invalid',
  recordInvalid:    'One or more fields are invalid',
}

export type QbLabelValue = string | Node

export type QbLabels = {
  field?:  Record<string, QbLabelValue>
  option?: Record<string, QbLabelValue>
}

let labels: QbLabels = {}

/** Resolve a label key to its display content, falling back to the raw key */
function resolveLabel(ns: keyof QbLabels, key: string): QbLabelValue {
  return labels[ns]?.[key] ?? key
}

/** Apply a resolved label to an element — string sets textContent, Node appends */
function applyLabel(el: Element, value: QbLabelValue): void {
  if (typeof value === 'string') {
    el.textContent = value
  } else {
    el.appendChild(value.cloneNode(true))
  }
}

export const QbElements = {
  /** Expose the assetsReady promise for apps that need to await initial load */
  ready: assetsReady,

  setStyleSheet(sheet: CSSStyleSheet): void { userSheet = sheet },

  setStrings(overrides: Partial<QbStrings>): void {
    strings = { ...strings, ...overrides }
  },

  /**
   * Supply display labels for union labels, list labels, field names, and
   * option keys. Values can be strings or DOM Nodes (for rich content).
   * Partial overrides are accepted per namespace.
   *
   * @example
   * QbElements.setLabels({
   *   field:  { 'field': 'Column', 'value': document.createElement('strong') },
   *   option: { 'Simple search': 'Keyword search' },
   * })
   *
   * Note: union and list labels are intentionally omitted — label nodes via
   * <qb-field name="..."> which renders its own label.
   */
  setLabels(overrides: QbLabels): void {
    for (const ns of Object.keys(overrides) as (keyof QbLabels)[]) {
      labels[ns] = { ...labels[ns], ...overrides[ns] }
    }
  },
}

// ─── SVG icons ────────────────────────────────────────────────────────────────

const ICON_PLUS  = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" width="14" height="14" fill="currentColor" aria-hidden="true"><path d="M7.75 2a.75.75 0 0 1 .75.75V7h4.25a.75.75 0 0 1 0 1.5H8.5v4.25a.75.75 0 0 1-1.5 0V8.5H2.75a.75.75 0 0 1 0-1.5H7V2.75A.75.75 0 0 1 7.75 2Z"/></svg>`
const ICON_CLOSE = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" width="14" height="14" fill="currentColor" aria-hidden="true"><path d="M3.72 3.72a.75.75 0 0 1 1.06 0L8 6.94l3.22-3.22a.749.749 0 0 1 1.275.326.749.749 0 0 1-.215.734L9.06 8l3.22 3.22a.749.749 0 0 1-.326 1.275.749.749 0 0 1-.734-.215L8 9.06l-3.22 3.22a.751.751 0 0 1-1.042-.018.751.751 0 0 1-.018-1.042L6.94 8 3.72 4.78a.75.75 0 0 1 0-1.06Z"/></svg>`

// ─── QbComposite — superclass for union, list, record ────────────────────────
// FROZEN — do not modify unless explicitly instructed.

abstract class QbComposite extends HTMLElement {
  protected abstract validationNodes(): Element[]
  protected abstract invalidMessage(): string

  checkValidity(): boolean {
    return this.validationNodes()
      .map(n => (n as any).checkValidity?.() ?? true)
      .every(Boolean)
  }

  get validationMessage(): string {
    return this.checkValidity() ? '' : this.invalidMessage()
  }
}

// ─── <qb-option> ─────────────────────────────────────────────────────────────

export class QbOption extends HTMLElement {
  get key(): string { return this.getAttribute('key') ?? '' }

  getTemplate(): DocumentFragment | null {
    const tmpl = this.querySelector(':scope > template')
    return tmpl ? (tmpl as HTMLTemplateElement).content : null
  }
}

customElements.define('qb-option', QbOption)

// ─── <qb-union> ──────────────────────────────────────────────────────────────

export class QbUnion extends QbComposite {
  private shadow: ShadowRoot
  private select!: HTMLSelectElement
  private body!:   HTMLDivElement

  constructor() {
    super()
    this.shadow = this.attachShadow({ mode: 'open' })
    adoptSheets(this.shadow)
  }

  connectedCallback(): void {
    assetsReady.then(() => this.build())
  }

  private build(): void {
    this.shadow.appendChild(cloneTemplate('qb-union'))
    this.select = this.shadow.querySelector('.qb-select')!
    this.body   = this.shadow.querySelector('.qb-indent')!

    // Label span is unused — union is labelled by its containing <qb-field>
    this.shadow.querySelector('.qb-union-label')?.remove()

    this.select.addEventListener('change', () => this.renderBody())

    const options = Array.from(this.querySelectorAll(':scope > qb-option')) as QbOption[]
    if (!options.length) return

    for (const opt of options) {
      const el = document.createElement('option')
      el.value = opt.key
      const resolved = resolveLabel('option', opt.key)
      // <option> only supports text — use string or fall back to key
      el.textContent = typeof resolved === 'string' ? resolved : opt.key
      this.select.appendChild(el)
    }

    const def = this.getAttribute('default')
    if (def && options.some(o => o.key === def)) this.select.value = def

    this.renderBody()
  }

  private renderBody(): void {
    this.body.innerHTML = ''
    const selected = (Array.from(this.querySelectorAll(':scope > qb-option')) as QbOption[])
      .find(o => o.key === this.select.value)
    if (!selected) return
    const fragment = selected.getTemplate()
    if (!fragment) return
    this.body.appendChild(fragment.cloneNode(true))
  }

  protected validationNodes(): Element[] {
    const child = this.body?.firstElementChild ?? null
    return child ? [child] : []
  }

  protected invalidMessage(): string { return strings.selectionInvalid }

  get value(): { selected: string; value: unknown } {
    const selected = this.select?.value ?? ''
    const child    = this.body?.firstElementChild ?? null
    return { selected, value: child ? (child as any).value : null }
  }
}

customElements.define('qb-union', QbUnion)

// ─── <qb-list> ───────────────────────────────────────────────────────────────

export class QbList extends QbComposite {
  private shadow:   ShadowRoot
  private itemsEl!: HTMLDivElement
  private addBtn!:  HTMLButtonElement
  private minItems: number
  private maxItems: number | null

  constructor() {
    super()
    this.shadow   = this.attachShadow({ mode: 'open' })
    adoptSheets(this.shadow)
    this.minItems = parseInt(this.getAttribute('min-items') ?? '0', 10)
    this.maxItems = this.hasAttribute('max-items')
      ? parseInt(this.getAttribute('max-items')!, 10) : null
  }

  connectedCallback(): void {
    assetsReady.then(() => this.build())
  }

  private build(): void {
    this.shadow.appendChild(cloneTemplate('qb-list'))

    this.itemsEl = this.shadow.querySelector('.qb-items')!
    this.addBtn  = this.shadow.querySelector('.qb-btn-add')!
    this.addBtn.innerHTML = `${ICON_PLUS} ${strings.addItem}`
    this.addBtn.addEventListener('click', () => this.addItem())

    const initial = Math.max(
      this.minItems,
      parseInt(this.getAttribute('initial-count') ?? '1', 10)
    )
    for (let i = 0; i < initial; i++) this.addItem()
  }

  private getItemTemplate(): DocumentFragment | null {
    const tmpl = this.querySelector(':scope > template')
    return tmpl ? (tmpl as HTMLTemplateElement).content : null
  }

  private addItem(): void {
    if (this.maxItems !== null && this.itemsEl.children.length >= this.maxItems) return
    const fragment = this.getItemTemplate()
    if (!fragment) return

    const rowFrag  = cloneTemplate('qb-list-row')
    const rowEl    = rowFrag.querySelector('.qb-row')!
    const content  = rowFrag.querySelector('.qb-row-content')!
    const closeBtn = rowFrag.querySelector('.qb-btn-close') as HTMLButtonElement

    content.appendChild(fragment.cloneNode(true))
    closeBtn.innerHTML = ICON_CLOSE
    closeBtn.setAttribute('aria-label', strings.close)
    closeBtn.addEventListener('click', () => {
      if (this.itemsEl.children.length > this.minItems) {
        rowEl.remove()
        this.updateAddBtn()
      }
    })

    this.itemsEl.appendChild(rowEl)
    this.updateAddBtn()
  }

  private updateAddBtn(): void {
    if (this.maxItems !== null) {
      this.addBtn.disabled = this.itemsEl.children.length >= this.maxItems
    }
  }

  protected validationNodes(): Element[] {
    return Array.from(this.itemsEl?.children ?? []).flatMap(row => {
      const child = row.querySelector('.qb-row-content')?.firstElementChild
      return child ? [child] : []
    })
  }

  protected invalidMessage(): string { return strings.listInvalid }

  get value(): unknown[] {
    return this.validationNodes().map(n => (n as any).value)
  }
}

customElements.define('qb-list', QbList)

// ─── <qb-field> ──────────────────────────────────────────────────────────────
//
// Each qb-field builds its own shadow DOM: a labeled row with a default slot.
// The label uses a class-scoped static counter for unique IDs — no UUID needed.
// QbRecord simply iterates its qb-field children; layout logic lives here.

export class QbField extends HTMLElement {
  private static count = 0

  private shadow:          ShadowRoot
  readonly labelId:        string
  readonly fieldName:      string

  constructor() {
    super()
    this.shadow    = this.attachShadow({ mode: 'open' })
    adoptSheets(this.shadow)
    this.labelId   = `qb-field-label-${QbField.count++}`
    this.fieldName = this.getAttribute('name') ?? ''
  }

  connectedCallback(): void {
    assetsReady.then(() => this.build())
  }

  private build(): void {
    this.shadow.appendChild(cloneTemplate('qb-field'))

    const labelEl = this.shadow.querySelector('.qb-field-label')!
    labelEl.id = this.labelId
    applyLabel(labelEl, resolveLabel('field', this.fieldName))

    // Associate slotted child with the label
    for (const child of Array.from(this.children)) {
      child.setAttribute('aria-labelledby', this.labelId)
    }
  }
}

customElements.define('qb-field', QbField)

// ─── <qb-record> ─────────────────────────────────────────────────────────────
//
// QbRecord collects its qb-field children for value/validity.
// Layout is fully delegated to QbField — record just groups them.

export class QbRecord extends QbComposite {
  private shadow: ShadowRoot

  constructor() {
    super()
    this.shadow = this.attachShadow({ mode: 'open' })
    adoptSheets(this.shadow)
  }

  connectedCallback(): void {
    assetsReady.then(() => this.build())
  }

  private build(): void {
    this.shadow.innerHTML = ''
    const container = document.createElement('div')
    container.className = 'qb-fields'

    // Each qb-field handles its own shadow DOM and labeling.
    // Record projects them into a container via a default slot.
    const slot = document.createElement('slot')
    container.appendChild(slot)
    this.shadow.appendChild(container)
  }

  private fields(): QbField[] {
    return Array.from(this.querySelectorAll(':scope > qb-field')) as QbField[]
  }

  protected validationNodes(): Element[] {
    return this.fields().flatMap(f => Array.from(f.children))
  }

  protected invalidMessage(): string { return strings.recordInvalid }

  get value(): Record<string, unknown> {
    const result: Record<string, unknown> = {}
    for (const field of this.fields()) {
      const child = field.firstElementChild
      result[field.fieldName] = child ? (child as any).value : null
    }
    return result
  }
}

customElements.define('qb-record', QbRecord)

// ─── <qb-leaf> ───────────────────────────────────────────────────────────────
// FROZEN — do not modify unless explicitly instructed.

export class QbLeaf extends HTMLElement {
  private static count = 0

  private shadow:          ShadowRoot
  private msgEl!:          HTMLSpanElement
  private readonly msgId = `qb-msg-${QbLeaf.count++}`

  constructor() {
    super()
    this.shadow = this.attachShadow({ mode: 'open' })
    adoptSheets(this.shadow)
  }

  connectedCallback(): void {
    this.classList.add('qb-leaf')
    assetsReady.then(() => this.build())
  }

  private build(): void {
    this.shadow.appendChild(cloneTemplate('qb-leaf'))
    this.msgEl    = this.shadow.querySelector('.qb-leaf-msg')!
    this.msgEl.id = this.msgId

    const slot = this.shadow.querySelector('slot')!
    slot.addEventListener('slotchange', () => this.wireInput())
    this.wireInput()
  }

  private wireInput(): void {
    const input = this.firstElementChild
    if (!input) return
    input.setAttribute('aria-describedby', this.msgId)

    const updateMsg = () => {
      this.msgEl.textContent = this.checkValidity() ? '' : this.validationMessage
    }
    input.addEventListener('invalid', () => { this.msgEl.textContent = this.validationMessage })
    input.addEventListener('input',   updateMsg)
    input.addEventListener('change',  updateMsg)
  }

  get value(): unknown {
    return (this.firstElementChild as any)?.value ?? null
  }

  get validationMessage(): string {
    return (this.firstElementChild as any)?.validationMessage ?? ''
  }

  checkValidity(): boolean {
    return (this.firstElementChild as any)?.checkValidity?.() ?? true
  }
}

customElements.define('qb-leaf', QbLeaf)
