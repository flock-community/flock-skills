// Overlay toolkit for demoing a change you cannot photograph: hit areas, spacing, focus rings,
// z-order. Every box is drawn from a live `boundingBox()`, so the numbers on screen are measured
// from the running app rather than typed into a caption — which is what makes the take evidence
// instead of narration.
//
// Import it from your steps module:
//   import { box, bandBox, crosshair, clearAnno, titleCard, frame, tapAt } from '<skill>/scripts/annotate.mjs'
//
// Two rules that break takes if ignored:
//   1. Boxes are `position:fixed` at client rects. Measure AFTER any scrolling has settled, and do
//      not scroll again while they are up — they do not follow the page. `frame()` settles first.
//   2. z-index ladder: app < annotations (…640) < title card (…646) < harness caption pill (…647).
//      A full-frame card would otherwise have the caption burned across it, so `titleCard` hides it.
//
// A selector that matches nothing throws (after the page timeout) rather than drawing nothing, so a
// wrong target surfaces as `SECTION_FAIL[name]` instead of a beat that quietly lost its annotation.
//
// Everything fades in over ~280ms, so hold for at least that long after drawing before the beat's
// pause is meaningful — otherwise the annotation is still half-transparent for most of the hold.

const LAYER = '__demo_anno__'
const FAM = '-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif'

const asLoc = (page, target) => (typeof target === 'string' ? page.locator(target) : target)

async function ensureLayer(page) {
  await page.evaluate((id) => {
    if (document.getElementById(id)) return
    const el = document.createElement('div')
    el.id = id
    el.style.cssText = 'position:fixed;inset:0;z-index:2147483640;pointer-events:none'
    document.body.appendChild(el)
  }, LAYER)
}

/** Remove every annotation. Call before a beat that re-draws, and before a title card. */
export async function clearAnno(page) {
  await page.evaluate((id) => {
    const l = document.getElementById(id)
    if (l) l.innerHTML = ''
  }, LAYER)
}

/**
 * Outline a real element and label it. Returns the measured rect, so the caller can put the
 * measurement in the label and in the caption from the same source:
 *   const a = await box(page, trigger, { color: RED })
 *   await box(page, trigger, { color: RED, label: `${Math.round(a.height)} px tall` })
 * opts: color (required), label, pad, radius, fill, dashed.
 */
export async function box(page, target, opts = {}) {
  await ensureLayer(page)
  const rect = await asLoc(page, target).first().boundingBox()
  if (!rect) return null
  await page.evaluate(({ id, rect, o, FAM }) => {
    const layer = document.getElementById(id)
    const pad = o.pad || 0
    const b = document.createElement('div')
    b.style.cssText = `position:fixed;left:${rect.x - pad}px;top:${rect.y - pad}px;` +
      `width:${rect.width + pad * 2}px;height:${rect.height + pad * 2}px;box-sizing:border-box;` +
      `border:2.5px ${o.dashed ? 'dashed' : 'solid'} ${o.color};border-radius:${o.radius ?? 8}px;` +
      `background:${o.fill || 'transparent'};opacity:0;transition:opacity .28s ease-out`
    layer.appendChild(b)
    requestAnimationFrame(() => { b.style.opacity = '1' })
    if (!o.label) return
    const above = rect.y > 90 // near the top of the frame the label would be clipped
    const t = document.createElement('div')
    t.textContent = o.label
    t.style.cssText = `position:fixed;left:${rect.x - pad}px;` +
      (above ? `top:${rect.y - pad - 30}px;` : `top:${rect.y + rect.height + pad + 8}px;`) +
      `background:${o.color};color:#fff;font:700 13px/1 ${FAM};padding:6px 9px;border-radius:6px;` +
      `white-space:nowrap;opacity:0;transition:opacity .28s ease-out`
    layer.appendChild(t)
    requestAnimationFrame(() => { t.style.opacity = '1' })
  }, { id: LAYER, rect, o: opts, FAM })
  return rect
}

/**
 * Outline an arbitrary viewport rect, hatched — for the space *between* elements, which is where
 * spacing and dead-zone bugs live and which no selector can name. Label sits to the right.
 */
export async function bandBox(page, rect, opts = {}) {
  await ensureLayer(page)
  await page.evaluate(({ id, rect, o, FAM }) => {
    const layer = document.getElementById(id)
    const fill = o.fill || 'rgba(0,0,0,.25)'
    const b = document.createElement('div')
    b.style.cssText = `position:fixed;left:${rect.x}px;top:${rect.y}px;width:${rect.width}px;` +
      `height:${Math.max(rect.height, 3)}px;box-sizing:border-box;border:2px dashed ${o.color};` +
      `background:repeating-linear-gradient(45deg,${fill},${fill} 5px,transparent 5px,transparent 10px);` +
      `opacity:0;transition:opacity .28s ease-out`
    layer.appendChild(b)
    requestAnimationFrame(() => { b.style.opacity = '1' })
    if (!o.label) return
    const t = document.createElement('div')
    t.textContent = o.label
    t.style.cssText = `position:fixed;left:${rect.x + rect.width + 12}px;` +
      `top:${rect.y + rect.height / 2 - 14}px;background:${o.color};color:#fff;` +
      `font:700 13px/1 ${FAM};padding:6px 9px;border-radius:6px;white-space:nowrap;` +
      `opacity:0;transition:opacity .28s ease-out`
    layer.appendChild(t)
    requestAnimationFrame(() => { t.style.opacity = '1' })
  }, { id: LAYER, rect, o: opts, FAM })
}

/** Mark exactly where a scripted tap will land, before it happens. */
export async function crosshair(page, x, y, opts = {}) {
  await ensureLayer(page)
  await page.evaluate(({ id, x, y, o, FAM }) => {
    const layer = document.getElementById(id)
    const c = document.createElement('div')
    c.style.cssText = `position:fixed;left:${x}px;top:${y}px;width:0;height:0;opacity:0;transition:opacity .25s`
    c.innerHTML =
      `<div style="position:absolute;left:-15px;top:-1.5px;width:30px;height:3px;background:${o.color}"></div>` +
      `<div style="position:absolute;left:-1.5px;top:-15px;width:3px;height:30px;background:${o.color}"></div>` +
      `<div style="position:absolute;left:-13px;top:-13px;width:26px;height:26px;border:2px solid ${o.color};border-radius:50%"></div>`
    layer.appendChild(c)
    requestAnimationFrame(() => { c.style.opacity = '1' })
    if (!o.label) return
    const t = document.createElement('div')
    t.textContent = o.label
    t.style.cssText = `position:fixed;left:${x + 26}px;top:${y - 13}px;background:${o.color};color:#fff;` +
      `font:700 13px/1 ${FAM};padding:6px 9px;border-radius:6px;white-space:nowrap;opacity:0;transition:opacity .25s`
    layer.appendChild(t)
    requestAnimationFrame(() => { t.style.opacity = '1' })
  }, { id: LAYER, x, y, o: opts, FAM })
}

/**
 * Tap a COORDINATE, not an element — the only way to demo a hit area, since the harness's `click()`
 * aims at the element's centre and would never reproduce a near-miss. The approach move keeps the
 * injected cursor reading like a hand: it tracks real mouse events, which `page.mouse` dispatches.
 */
export async function tapAt(page, x, y, opts = {}) {
  await page.mouse.move(x, y - (opts.approach ?? 44))
  await page.waitForTimeout(opts.gap ?? 300)
  await page.mouse.move(x, y)
  await page.waitForTimeout(opts.aim ?? 600)
  await page.mouse.click(x, y)
}

/**
 * Scroll a target to `top` and settle, so a beat's measurements are stable.
 *
 * The scroll is clamped to what the document can actually do, and skipped when that leaves under
 * 8px to travel. That covers both ways this bites: an element already in place (a few px of scroll
 * only jitters the frame), and one near the end of the page, where the request exceeds the scroll
 * limit — there the element stops short of `top`, which is fine, and a second call then correctly
 * does nothing instead of re-attempting an impossible scroll on every beat.
 */
export async function frame(page, target, opts = {}) {
  const loc = asLoc(page, target).first()
  const rect = await loc.boundingBox()
  if (!rect) return
  const moved = await page.evaluate((dy) => {
    const max = document.documentElement.scrollHeight - window.innerHeight
    const from = window.scrollY
    const to = Math.max(0, Math.min(max, from + dy))
    if (Math.abs(to - from) < 8) return 0
    window.scrollTo({ top: to, behavior: 'smooth' })
    return to - from
  }, rect.y - (opts.top ?? 300))
  await page.waitForTimeout(moved ? (opts.settle ?? 900) : 200)
}

/**
 * Full-frame title beat. Bookends a take, and — cutting between segments — turns the blank frame
 * while the next take loads the app into a dark-to-dark transition instead of a white flash.
 *
 * Every rule carries an explicit family stack on purpose: `inherit` is NOT a valid family inside
 * the `font` shorthand, and that one bad token drops the whole declaration, so the card silently
 * renders at the browser's default size. Don't "simplify" these back to `font:800 40px/1.2 inherit`.
 */
export async function titleCard(page, { kicker, title, sub, accent = '#3b82f6' }, ms = 2600) {
  await clearAnno(page)
  await page.evaluate(({ kicker, title, sub, accent, FAM }) => {
    const cap = document.getElementById('__demo_caption__') // outranks this layer — hide it
    if (cap) cap.style.visibility = 'hidden'
    const w = document.createElement('div')
    w.id = '__demo_title__'
    w.style.cssText = 'position:fixed;inset:0;z-index:2147483646;background:#12161a;color:#fff;' +
      'display:flex;flex-direction:column;align-items:center;justify-content:center;gap:18px;' +
      'padding:0 8vw;box-sizing:border-box;opacity:0;transition:opacity .35s ease'
    w.innerHTML =
      (kicker ? `<div style="font:800 15px/1.2 ${FAM};letter-spacing:.22em;text-transform:uppercase;color:${accent}">${kicker}</div>` : '') +
      `<div style="font:800 40px/1.2 ${FAM};text-align:center">${title}</div>` +
      (sub ? `<div style="font:400 19px/1.55 ${FAM};opacity:.74;text-align:center;max-width:34em">${sub}</div>` : '')
    document.body.appendChild(w)
    requestAnimationFrame(() => { w.style.opacity = '1' })
  }, { kicker, title, sub, accent, FAM })
  await page.waitForTimeout(ms)
  await page.evaluate(() => {
    const cap = document.getElementById('__demo_caption__')
    if (cap) cap.style.visibility = 'visible'
    const w = document.getElementById('__demo_title__')
    if (!w) return
    w.style.opacity = '0'
    setTimeout(() => w.remove(), 400)
  })
  await page.waitForTimeout(450)
}
