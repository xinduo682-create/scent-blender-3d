import { CATEGORIES, GROUPS, NOTES, FORM_TYPES, MATERIALS, MATERIAL_BY_ID, CAT_MAP } from './data.js'
import { RULES } from './data.js'

const TYPE_ICON = {
  oil: '◍', dried: '❋', resin: '◆', seed: '●', bark: '▤',
  root: '⌇', wood: '▮', absolute: '▣', synthetic: '✦',
}

function esc(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]))
}
function rgba(hex, a) {
  const h = hex.replace('#', '')
  const n = parseInt(h.length === 3 ? h.split('').map((x) => x + x).join('') : h, 16)
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`
}
function $(id) { return document.getElementById(id) }

// 按香料形态绘制展柜里的小瓶，填色使用该香料的本体精确色
function bottleSvg(m) {
  const gid = `bg_${m.id}`
  const defs = `<defs><linearGradient id="${gid}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${m.glow}"/><stop offset=".52" stop-color="${m.color}"/><stop offset="1" stop-color="${m.color}" stop-opacity=".72"/></linearGradient></defs>`
  const F = `url(#${gid})`
  const S = 'stroke="rgba(255,255,255,.38)" stroke-width="1"'
  let shape
  switch (m.type) {
    case 'oil':
      shape = `<rect x="18" y="16" width="24" height="36" rx="6" fill="${F}" ${S}/><rect x="24" y="8" width="12" height="9" rx="2" fill="#c9a45c"/><rect x="21" y="20" width="4" height="25" rx="2" fill="rgba(255,255,255,.3)"/>`
      break
    case 'dried':
      shape = `<path d="M14 48 Q12 26 30 11 Q48 26 46 48 Z" fill="${F}" ${S}/><path d="M30 11V48M20 31h20" stroke="rgba(255,255,255,.22)" stroke-width="1.5" fill="none"/>`
      break
    case 'resin':
      shape = `<path d="M30 8 48 26 40 50 20 50 12 26Z" fill="${F}" ${S}/><path d="M30 8v42M12 26h36" stroke="rgba(255,255,255,.22)" stroke-width="1.2" fill="none"/>`
      break
    case 'synthetic':
      shape = `<path d="M30 6 50 30 30 54 10 30Z" fill="${F}" ${S}/><path d="M30 6v48M10 30h40" stroke="rgba(255,255,255,.3)" stroke-width="1.2" fill="none"/>`
      break
    case 'seed':
      shape = `<circle cx="23" cy="37" r="11" fill="${F}" ${S}/><circle cx="38" cy="35" r="10" fill="${F}" ${S}/><circle cx="30" cy="22" r="9" fill="${F}" ${S}/>`
      break
    case 'bark':
      shape = `<path d="M16 14Q44 10 44 30Q44 50 16 46Q24 30 16 14Z" fill="${F}" ${S}/>`
      break
    case 'root':
      shape = `<path d="M30 10Q48 14 46 32Q50 50 30 50Q10 50 14 32Q12 14 30 10Z" fill="${F}" ${S}/>`
      break
    case 'wood':
      shape = `<rect x="10" y="22" width="40" height="24" rx="12" fill="${F}" ${S}/><ellipse cx="48" cy="34" rx="6" ry="12" fill="${m.glow}" opacity=".8" ${S}/><ellipse cx="48" cy="34" rx="3" ry="7" fill="none" stroke="rgba(0,0,0,.3)"/>`
      break
    case 'absolute':
      shape = `<rect x="14" y="24" width="32" height="26" rx="5" fill="${F}" ${S}/><rect x="12" y="18" width="36" height="8" rx="3" fill="#c9a45c"/>`
      break
    default:
      shape = `<circle cx="30" cy="32" r="18" fill="${F}" ${S}/>`
  }
  return `<svg viewBox="0 0 60 60" class="case-svg" aria-hidden="true">${defs}${shape}</svg>`
}

const GROUP_TO_CAT = {
  citrus: 'citrus', herbal: 'herbal', spice: 'spice', floral: 'floral',
  fruity: 'fruity', woody: 'woody', resin: 'resin', animal: 'synthetic',
}

export function createUI(handlers) {
  const els = {
    stage: $('stage'),
    canvasWrap: $('canvas-wrap'),
    dropZone: $('drop-zone'),
    dropLabel: $('drop-label'),
    tooltip: $('tooltip'),
    tabs: $('cat-tabs'),
    search: $('search'),
    list: $('library-list'),
    libCount: $('lib-count'),
    recipePanel: $('recipe-panel'),
    recipeCount: $('recipe-count'),
    balanceBar: $('balance-bar'),
    aiPanel: $('ai-panel'),
    aiStatus: $('ai-status'),
    stats: $('topbar-stats'),
    status: $('status-left'),
    legend: $('stage-legend'),
    toastStack: $('toast-stack'),
    loading: $('stage-loading'),
    modal: $('review-modal'),
    materialModal: $('material-modal'),
    materialBody: $('material-info-body'),
    reviewBody: $('review-body'),
    reviewSource: $('review-source'),
    hint: $('stage-hint'),
    caseModal: $('case-modal'),
    caseHead: $('case-head'),
    caseGrid: $('case-grid'),
    caseDrop: $('case-drop'),
    actionBar: $('action-bar'),
  }

  let filter = { mode: 'all', key: null }
  let searchTerm = ''
  let recipe = []
  let analysis = null
  let shownToasts = new Set()
  let hoverMaterial = null
  let mouse = { x: 0, y: 0 }

  function setPanelCollapsed(side, collapsed) {
    const app = $('app')
    const button = $(`toggle-${side}`)
    app.classList.toggle(`${side}-panel-collapsed`, collapsed)
    button.setAttribute('aria-expanded', String(!collapsed))
    button.title = collapsed ? '点击展开，向内拖动也可展开' : '点击收起，向右拖动也可收起'
    button.querySelector('span').textContent = collapsed ? '‹' : '›'
  }

  for (const side of ['recipe']) {
    const button = $(`toggle-${side}`)
    let gesture = null
    let suppressClick = false
    button.addEventListener('pointerdown', (e) => {
      if (e.button !== 0) return
      gesture = { pointerId: e.pointerId, startX: e.clientX }
      try { button.setPointerCapture(e.pointerId) } catch { /* noop */ }
    })
    button.addEventListener('pointermove', (e) => {
      if (gesture?.pointerId === e.pointerId && Math.abs(e.clientX - gesture.startX) > 6) e.preventDefault()
    })
    button.addEventListener('pointerup', (e) => {
      if (gesture?.pointerId !== e.pointerId) return
      const dx = e.clientX - gesture.startX
      gesture = null
      if (Math.abs(dx) <= 6) return
      suppressClick = true
      setTimeout(() => { suppressClick = false }, 0)
      if (Math.abs(dx) < 32) return
      const outward = side === 'library' ? dx < 0 : dx > 0
      const inward = side === 'library' ? dx > 0 : dx < 0
      if (outward) setPanelCollapsed(side, true)
      else if (inward) setPanelCollapsed(side, false)
    })
    button.addEventListener('pointercancel', () => { gesture = null })
    button.addEventListener('click', (e) => {
      if (suppressClick) { e.preventDefault(); return }
      setPanelCollapsed(side, !$('app').classList.contains(`${side}-panel-collapsed`))
    })
  }

  // ---------------------------------------------------------------- 初始化静态件
  els.legend.innerHTML = Object.entries(NOTES).map(([k, n]) =>
    `<span class="flex items-center gap-1" style="color:${n.color}"><i class="w-1.5 h-1.5 rounded-full inline-block" style="background:${n.color}"></i>${n.name}</span>`
  ).join('')

  function renderTabs() {
    els.tabs.innerHTML = GROUPS.map((g) => {
      const cat = CAT_MAP[GROUP_TO_CAT[g.key]]
      const on = filter.mode === 'group' && filter.key === g.key
      const allOn = g.key === 'all' && filter.mode === 'all'
      const color = cat ? cat.color : '#d9a441'
      const style = (on || allOn) ? `background:${color};` : ''
      return `<button class="cat-tab ${on || allOn ? 'active' : ''}" data-group="${g.key}" style="${style}">${g.name === '小众特色' ? '✦ ' : ''}${g.name}</button>`
    }).join('') + (filter.mode === 'cat'
      ? `<button class="cat-tab active" data-clear="1" style="background:${CAT_MAP[filter.key].color}">📦 柜格：${CAT_MAP[filter.key].name} ×</button>`
      : '')
  }

  // ---------------------------------------------------------------- 香料清单
  function filteredMaterials() {
    const q = searchTerm.trim().toLowerCase()
    return MATERIALS.filter((m) => {
      if (filter.mode === 'group' && filter.key !== 'all' && m.group !== filter.key) return false
      if (filter.mode === 'cat' && m.cat !== filter.key) return false
      if (!q) return true
      return `${m.name} ${m.form} ${m.noteLabel} ${FORM_TYPES[m.type] || ''} ${m.groupTitle}`.toLowerCase().includes(q)
    })
  }

  function renderLibrary() {
    const list = filteredMaterials()
    const inRecipe = new Set(recipe.map((r) => r.id))
    els.libCount.textContent = `${list.length} / ${MATERIALS.length} 味`
    if (!list.length) {
      els.list.innerHTML = `<div class="text-center text-[11px] text-stone-600 py-10">没有匹配的香料<br/><span class="text-[10px]">换个关键词试试</span></div>`
      return
    }
    let lastGroup = ''
    els.list.innerHTML = list.map((m) => {
      const cat = CAT_MAP[m.cat]
      const note = NOTES[m.note]
      const head = m.group !== lastGroup
        ? `<div class="pt-2 pb-1 pl-1 text-[9px] tracking-wider text-stone-600 uppercase">${esc(m.groupTitle)} · ${esc(m.subtitle)}</div>`
        : ''
      lastGroup = m.group
      return head + `
        <button class="mat-card ${inRecipe.has(m.id) ? 'in-recipe' : ''}" draggable="true" data-id="${m.id}"
          style="--accent:${cat.color}" title="拖拽投入香水瓶，或点击 + 加入">
          <span class="mat-dot" style="background:${rgba(cat.color, .18)};color:${cat.glow}">${TYPE_ICON[m.type] || '◆'}</span>
          <span class="min-w-0 flex-1">
            <span class="block text-[11px] text-stone-200 truncate leading-tight">${esc(m.name)}</span>
            <span class="flex items-center gap-1 mt-[3px]">
              <span class="badge" style="color:${cat.glow};background:${rgba(cat.color, .13)};border-color:${rgba(cat.color, .25)}">${esc(m.form)}</span>
              <span class="badge" style="color:${note.color};background:${rgba(note.color, .12)};border-color:${rgba(note.color, .25)}">${esc(m.noteLabel)}</span>
            </span>
          </span>
          <span class="card-add" data-add="${m.id}">+</span>
        </button>`
    }).join('')
  }

  // ---------------------------------------------------------------- 配方
  function renderRecipe() {
    const total = analysis?.totalDrops || 0
    els.recipeCount.textContent = `${recipe.length} 味 · ${total} 滴`
    if (!recipe.length) {
      els.recipePanel.innerHTML = `
        <div class="p-6 text-center">
          <div class="text-2xl opacity-25 mb-2">◌</div>
          <p class="text-[11px] text-stone-500">香水瓶还是空的</p>
          <p class="text-[10px] text-stone-600 mt-1.5 leading-relaxed">从环绕式柜墙取出香材投入中央香水瓶，<br/>右键任意瓶子查看介绍与属性</p>
        </div>`
      return
    }
    const groups = { top: [], middle: [], base: [] }
    for (const r of recipe) {
      const m = MATERIAL_BY_ID[r.id]
      if (m) groups[m.note].push({ ...r, m })
    }
    els.recipePanel.innerHTML = `<div class="p-3 space-y-3">` + Object.entries(groups).map(([k, items]) => {
      const note = NOTES[k]
      return `
        <div>
          <div class="note-head">
            <span class="w-1.5 h-1.5 rounded-full" style="background:${note.color}"></span>
            <span style="color:${note.color}">${note.name} ${note.en}</span>
            <span class="ml-auto text-stone-600">${items.reduce((s, x) => s + x.drops, 0)} 滴</span>
          </div>
          ${items.length ? items.map(({ m, drops }) => `
            <div class="recipe-item mb-1" data-id="${m.id}">
              <span class="w-1.5 h-1.5 rounded-full shrink-0" style="background:${CAT_MAP[m.cat].color}"></span>
              <span class="flex-1 truncate text-stone-200" title="${esc(m.name)}">${esc(m.name)}</span>
              <button type="button" class="stepper" data-act="dec" title="减少一滴" aria-label="减少${esc(m.name)}一滴">−</button>
              <span class="w-4 text-center text-amber-soft tabular-nums">${drops}</span>
              <button type="button" class="stepper" data-act="inc" title="增加一滴" aria-label="增加${esc(m.name)}一滴" ${drops >= 9 ? 'disabled' : ''}>+</button>
              <button type="button" class="stepper" data-act="del" title="移除" aria-label="移除${esc(m.name)}">×</button>
            </div>`).join('') : `<div class="text-[10px] text-stone-700 pl-1">— 暂无 —</div>`}
        </div>`
    }).join('') + `</div>`
  }

  function renderBalance() {
    const a = analysis
    const r = a?.ratios || { top: 0, middle: 0, base: 0 }
    const pct = (v) => `${Math.round(v * 100)}%`
    els.balanceBar.innerHTML = `
      <div class="balance-track">
        <div class="balance-seg" style="width:${pct(r.top)};background:${NOTES.top.color}"></div>
        <div class="balance-seg" style="width:${pct(r.middle)};background:${NOTES.middle.color}"></div>
        <div class="balance-seg" style="width:${pct(r.base)};background:${NOTES.base.color}"></div>
      </div>
      <div class="flex justify-between mt-1.5 text-[9px] text-stone-500">
        <span style="color:${NOTES.top.color}">前 ${pct(r.top)}</span>
        <span style="color:${NOTES.middle.color}">中 ${pct(r.middle)}</span>
        <span style="color:${NOTES.base.color}">后 ${pct(r.base)}</span>
      </div>`
  }

  // ---------------------------------------------------------------- 规则分析
  function alertCard(a) {
    if (a.kind === 'info') {
      return `<div class="alert-card alert-info">
        <div class="alert-title text-stone-300">✧ ${esc(a.title)}</div>
        <div class="alert-msg text-stone-500">${esc(a.msg)}</div>
      </div>`
    }
    const warn = a.kind === 'warn'
    const color = warn ? '#fbbf24' : '#6ee7b7'
    const icon = warn ? '⚠' : '✦'
    return `<div class="alert-card ${warn ? 'alert-warn' : 'alert-match'}">
      <div class="alert-title" style="color:${color}">
        <span>${icon}</span><span>${esc(a.title)}</span>
        ${a.season ? `<span class="ml-auto chip" style="color:${color}">${esc(a.season)}</span>` : ''}
        ${a.level ? `<span class="ml-auto chip" style="color:${color}">${esc(a.level)}</span>` : ''}
      </div>
      <div class="alert-msg">${esc(a.msg)}</div>
      ${a.chips ? `<div class="flex flex-wrap gap-1 mt-2">${a.chips.map((c) => `<span class="chip" style="color:${color}">${esc(c)}</span>`).join('')}</div>` : ''}
      ${warn ? `<div class="alert-foot" style="color:${color}">仅作为提示，不阻止调配 · 可自由组合任意香料</div>` : ''}
    </div>`
  }

  function renderAI() {
    if (!analysis) return
    const a = analysis
    els.aiStatus.textContent = `${a.warnCount} 提示 · ${a.matchCount} 搭配`
    const seasonEntries = Object.entries(a.seasonScore)
    const maxSeason = Math.max(1, ...seasonEntries.map((x) => x[1]))
    const seasonBlock = `
      <div class="alert-card alert-info">
        <div class="alert-title text-stone-300">◷ 季节倾向
          ${a.dominantSeason ? `<span class="ml-auto chip" style="color:#f0cd85">${esc(a.dominantSeason)}</span>` : ''}
        </div>
        <div class="mt-2 space-y-1.5">
          ${seasonEntries.map(([name, score]) => `
            <div class="flex items-center gap-2 text-[9px]">
              <span class="w-7 text-stone-500 shrink-0">${name}</span>
              <span class="flex-1 h-1 rounded-full bg-white/[.06] overflow-hidden"><span class="block h-full rounded-full bg-amber-brand/70" style="width:${(score / maxSeason) * 100}%"></span></span>
              <span class="w-5 text-right text-stone-600 tabular-nums">${score}</span>
            </div>`).join('')}
        </div>
        <div class="alert-foot">按滴数加权；新香材自动按所属香调补足季节倾向</div>
      </div>`

    const nearBlock = a.nearMatches.length ? `
      <div class="alert-card alert-info">
        <div class="alert-title text-stone-400">✧ 灵感 · 经典组合与自动搭配建议</div>
        ${a.nearMatches.slice(0, 3).map((n) => `
          <div class="mt-2 text-[10px] leading-relaxed text-stone-500">
            <span class="text-emerald-300/80">${esc(n.tag)}</span> · 已有 ${esc(n.owned.join('、'))}，再加 <span style="color:#f0cd85">${esc(n.missing.join('、'))}</span> 即可解锁
          </div>`).join('')}
      </div>` : ''

    els.aiPanel.innerHTML = `
      <div class="px-1 pb-1 text-[9px] text-stone-600 leading-relaxed">
        每次配方变更自动分析：${RULES.conflictRules.length} 条冲突规则 · ${RULES.matchRules.length} 条经典搭配 · ${RULES.categoryBlendRules.length} 组分区搭配模板 · 结构平衡与新香材季节提示
      </div>
      ${a.alerts.map(alertCard).join('')}
      ${seasonBlock}
      ${nearBlock}
      <div class="px-1 pt-1 text-[9px] text-stone-600 leading-relaxed border-t border-white/[.06] mt-1">
        ※ 所有校验只做弹窗 / 提示框警告，<span class="text-amber-soft/80">不拦截、不禁止</span>任何调配。你可以自由组合任意香料。
      </div>`
  }

  function renderStats() {
    els.stats.innerHTML = `
      <span><b class="text-amber-soft font-medium">${MATERIALS.length}</b> 味香料</span>
      <span class="w-px h-3 bg-white/10"></span>
      <span><b class="text-amber-soft font-medium">${CATEGORIES.length}</b> 大分区</span>
      <span class="w-px h-3 bg-white/10"></span>
      <span>配方 <b class="text-amber-soft font-medium">${recipe.length}</b> 味 / ${analysis?.totalDrops || 0} 滴</span>`
  }

  // ---------------------------------------------------------------- Toast
  function toast(alert) {
    const warn = alert.kind === 'warn'
    const el = document.createElement('div')
    el.className = `toast ${warn ? 'warn' : 'match'}`
    const color = warn ? '#fbbf24' : '#6ee7b7'
    el.innerHTML = `
      <div class="flex items-start gap-2.5">
        <span class="text-[15px] leading-none mt-0.5" style="color:${color}">${warn ? '⚠' : '✦'}</span>
        <div class="min-w-0 flex-1">
          <div class="text-[11px] font-semibold" style="color:${color}">${warn ? '调香提示' : '推荐搭配'} · ${esc(alert.title)}</div>
          <div class="text-[10px] leading-relaxed mt-1 text-stone-300">${esc(alert.msg)}</div>
          <div class="text-[9px] mt-1.5 text-stone-500">${warn ? '仅作为提示，不阻止调配' : '可继续自由调配，无强制限制'}</div>
        </div>
      </div>`
    els.toastStack.appendChild(el)
    while (els.toastStack.children.length > 3) els.toastStack.firstChild.remove()
    setTimeout(() => {
      el.classList.add('leaving')
      setTimeout(() => el.remove(), 320)
    }, 4800)
  }

  function syncToasts() {
    if (!analysis) return
    if (!recipe.length) { shownToasts = new Set(); return }
    const fresh = analysis.alerts.filter((a) =>
      (a.kind === 'warn' || a.kind === 'match') && a.id !== 'clean' && !shownToasts.has(a.id))
    for (const a of fresh.slice(0, 3)) { shownToasts.add(a.id); toast(a) }
    // 已消失的提示从集合移除，下次再命中可重新弹窗
    const alive = new Set(analysis.alerts.map((a) => a.id))
    for (const id of shownToasts) if (!alive.has(id)) shownToasts.delete(id)
  }

  // ---------------------------------------------------------------- Tooltip
  function positionTooltip() {
    if (!hoverMaterial) return
    const w = els.stage.clientWidth, h = els.stage.clientHeight
    let x = mouse.x + 18, y = mouse.y + 14
    if (x + 200 > w) x = mouse.x - 200
    if (y + 120 > h) y = mouse.y - 120
    els.tooltip.style.left = `${Math.max(6, x)}px`
    els.tooltip.style.top = `${Math.max(6, y)}px`
  }
  function showTooltip(m) {
    hoverMaterial = m
    if (!m) { els.tooltip.classList.add('hidden'); return }
    const cat = CAT_MAP[m.cat], note = NOTES[m.note]
    els.tooltip.innerHTML = `
      <div class="text-[12px] font-medium text-stone-100 mb-1.5">${esc(m.name)}</div>
      <div class="flex flex-wrap gap-1 mb-2">
        <span class="badge" style="color:${cat.glow};background:${rgba(cat.color, .15)}">${esc(cat.name)}</span>
        <span class="badge" style="color:${note.color};background:${rgba(note.color, .13)}">${esc(m.noteLabel)}</span>
      </div>
      <div class="text-[10px] text-stone-400 leading-relaxed">形态：${esc(m.form)}<br/>类型：${esc(FORM_TYPES[m.type] || '固体')}</div>
      <div class="mt-2 pt-2 border-t border-white/10 text-[9px] text-amber-soft/80">点击取用 · 投入香水瓶</div>`
    els.tooltip.classList.remove('hidden')
    positionTooltip()
  }

  // ---------------------------------------------------------------- 事件绑定
  els.tabs.addEventListener('click', (e) => {
    const clear = e.target.closest('[data-clear]')
    if (clear) { setFilter({ mode: 'all', key: null }); handlers.onCategorySelect?.(null); return }
    const btn = e.target.closest('[data-group]')
    if (!btn) return
    const key = btn.dataset.group
    setFilter({ mode: key === 'all' ? 'all' : 'group', key: key === 'all' ? null : key })
    handlers.onCategorySelect?.(GROUP_TO_CAT[key] || null)
  })

  els.search.addEventListener('input', (e) => { searchTerm = e.target.value; renderLibrary() })

  els.list.addEventListener('click', (e) => {
    const card = e.target.closest('.mat-card')
    if (card) handlers.onAdd?.(card.dataset.id)
  })
  els.list.addEventListener('dragstart', (e) => {
    const card = e.target.closest('.mat-card')
    if (!card) return
    e.dataTransfer.setData('text/plain', card.dataset.id)
    e.dataTransfer.effectAllowed = 'copy'
    card.classList.add('is-dragging')
    els.dropZone.classList.add('is-over')
    els.dropLabel.classList.add('show')
    els.dropLabel.textContent = '松手，投入香水瓶'
  })
  els.list.addEventListener('dragend', (e) => {
    e.target.closest('.mat-card')?.classList.remove('is-dragging')
    els.dropZone.classList.remove('is-over')
    els.dropLabel.classList.remove('show')
  })

  els.dropZone.addEventListener('dragover', (e) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'copy'
    els.dropZone.classList.add('is-over')
    els.dropLabel.classList.add('show')
    els.dropLabel.textContent = '松手，投入香水瓶'
  })
  els.dropZone.addEventListener('dragleave', () => {
    els.dropZone.classList.remove('is-over')
    els.dropLabel.classList.remove('show')
  })
  els.dropZone.addEventListener('drop', (e) => {
    e.preventDefault()
    els.dropZone.classList.remove('is-over')
    els.dropLabel.classList.remove('show')
    const id = e.dataTransfer.getData('text/plain')
    if (id && MATERIAL_BY_ID[id]) handlers.onAdd?.(id)
  })

  els.recipePanel.addEventListener('click', (e) => {
    const step = e.target.closest('.stepper')
    if (!step) return
    const id = step.closest('.recipe-item')?.dataset.id
    if (!id) return
    const act = step.dataset.act
    if (act === 'inc') handlers.onDrops?.(id, 1)
    else if (act === 'dec') handlers.onDrops?.(id, -1)
    else if (act === 'del') handlers.onRemove?.(id)
  })

  $('btn-reset').addEventListener('click', () => handlers.onReset?.())
  $('btn-undo').addEventListener('click', () => handlers.onUndo?.())
  $('btn-export-recipe').addEventListener('click', () => {
    const payload = { format: 'scent-blender-recipe', version: 1, exportedAt: new Date().toISOString(), recipe }
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `scent-recipe-${new Date().toISOString().slice(0, 10)}.json`
    link.click()
    setTimeout(() => URL.revokeObjectURL(url), 1000)
    setStatus('配方 JSON 已导出')
  })
  const recipeFile = $('recipe-file')
  $('btn-import-recipe').addEventListener('click', () => recipeFile.click())
  recipeFile.addEventListener('change', async () => {
    const file = recipeFile.files?.[0]
    if (!file) return
    try {
      const payload = JSON.parse(await file.text())
      const rows = Array.isArray(payload) ? payload : payload?.recipe
      if (!handlers.onImportRecipe?.(rows)) throw new Error('配方格式或香料数据无效')
      setStatus(`已导入 ${file.name}`)
    } catch (err) {
      setStatus(`导入失败：${err.message}`)
    } finally { recipeFile.value = '' }
  })
  $('btn-review').addEventListener('click', () => openReview())
  $('btn-close-material').addEventListener('click', closeMaterialInfo)
  els.materialModal.addEventListener('click', (e) => {
    if (e.target === els.materialModal) closeMaterialInfo()
    const addButton = e.target.closest('#btn-add-info-material')
    if (addButton) { handlers.onAdd?.(addButton.dataset.id); closeMaterialInfo() }
  })
  $('btn-close-review').addEventListener('click', closeReview)
  $('btn-regen-review').addEventListener('click', () => openReview(true))
  $('btn-copy-review').addEventListener('click', async () => {
    const text = els.reviewBody.dataset.full || els.reviewBody.innerText
    try { await navigator.clipboard.writeText(text); setStatus('香评已复制到剪贴板') }
    catch { setStatus('复制失败，请手动选择文本') }
  })
  els.modal.addEventListener('click', (e) => { if (e.target === els.modal) closeReview() })

  // 展柜：点击取用 / 拖出投入 / 关闭
  $('btn-close-case').addEventListener('click', closeCase)
  els.caseHead.addEventListener('click', (e) => { if (e.target.closest('#case-x')) closeCase() })
  els.caseModal.addEventListener('click', (e) => { if (e.target === els.caseModal) closeCase() })
  els.caseGrid.addEventListener('click', (e) => {
    const card = e.target.closest('.case-card')
    if (card) handlers.onAdd?.(card.dataset.id)
  })
  els.caseGrid.addEventListener('dragstart', (e) => {
    const card = e.target.closest('.case-card')
    if (!card) return
    e.dataTransfer.setData('text/plain', card.dataset.id)
    e.dataTransfer.effectAllowed = 'copy'
    card.classList.add('is-dragging')
    els.caseModal.classList.add('dragging-through')
    els.dropZone.classList.add('is-over')
    els.dropLabel.classList.add('show')
    els.dropLabel.textContent = '松手，投入香水瓶'
  })
  els.caseGrid.addEventListener('dragend', (e) => {
    e.target.closest('.case-card')?.classList.remove('is-dragging')
    els.caseModal.classList.remove('dragging-through')
    els.dropZone.classList.remove('is-over')
    els.dropLabel.classList.remove('show')
    els.caseDrop.classList.remove('is-over')
  })
  els.caseDrop.addEventListener('dragover', (e) => { e.preventDefault(); els.caseDrop.classList.add('is-over') })
  els.caseDrop.addEventListener('dragleave', () => els.caseDrop.classList.remove('is-over'))
  els.caseDrop.addEventListener('drop', (e) => {
    e.preventDefault()
    els.caseDrop.classList.remove('is-over')
    const id = e.dataTransfer.getData('text/plain')
    if (id && MATERIAL_BY_ID[id]) handlers.onAdd?.(id)
  })

  // 手持 / 撤销 操作条
  els.actionBar.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-act]')
    if (!btn) return
    if (btn.dataset.act === 'cancel') { heldKey = ''; handlers.onCancelHeld?.() }
    else if (btn.dataset.act === 'undo') handlers.onUndo?.()
  })

  document.addEventListener('keydown', (e) => {
    const editing = typeof HTMLElement !== 'undefined' && e.target instanceof HTMLElement && (e.target.matches('input, textarea, select') || e.target.isContentEditable)
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z' && !editing) { e.preventDefault(); handlers.onUndo?.(); return }
    if (e.key !== 'Escape') return
    if (!els.materialModal.classList.contains('hidden')) { closeMaterialInfo(); return }
    if (!els.modal.classList.contains('hidden')) { closeReview(); return }
    if (!els.caseModal.classList.contains('hidden')) { closeCase(); return }
  })

  els.stage.addEventListener('pointermove', (e) => {
    const r = els.stage.getBoundingClientRect()
    mouse = { x: e.clientX - r.left, y: e.clientY - r.top }
    if (hoverMaterial) positionTooltip()
  })
  els.stage.addEventListener('pointerleave', () => showTooltip(null))

  // ---------------------------------------------------------------- 结构化香评
  async function openReview(regen = false) {
    els.modal.classList.remove('hidden')
    els.modal.classList.add('flex')
    els.reviewBody.innerHTML = '<div class="review-loading">正在分析配方结构…</div>'
    els.reviewSource.textContent = '生成中'
    const result = await handlers.onReview?.(regen)
    if (!result) return
    const text = result.text || ''
    els.reviewBody.dataset.full = text
    els.reviewSource.textContent = result.source || ''
    const sections = result.sections?.length ? result.sections : [{ title: '香评', body: text, lead: true }]
    els.reviewBody.innerHTML = sections.map((s, i) => `
      <div class="review-block ${s.lead ? 'is-lead' : ''}" style="animation-delay:${i * 90}ms">
        <div class="review-label">${esc(s.title)}</div>
        <div class="review-text">${esc(s.body)}</div>
      </div>`).join('')
  }
  function closeReview() {
    els.modal.classList.add('hidden')
    els.modal.classList.remove('flex')
  }

  function openMaterialInfo(m) {
    if (!m) return
    const note = NOTES[m.note]
    const cat = CAT_MAP[m.cat]
    const existing = recipe.find((row) => row.id === m.id)
    const intro = m.description || `${m.name}属于${cat.name}香材，资料中标注为${m.form}形态与${note.name}位置。${cat.desc}。`
    els.materialBody.innerHTML = `
      <div class="material-hero" style="--material-color:${m.color};--material-glow:${m.glow}">
        <div class="material-hero-vial">${bottleSvg(m)}</div>
        <div class="min-w-0">
          <p class="material-kicker">${esc(cat.en)} · ${esc(cat.name)}</p>
          <h2 class="material-title">${esc(m.name)}</h2>
          <p class="material-subtitle">${esc(m.groupTitle)} · ${esc(m.subtitle)}</p>
        </div>
      </div>
      <section class="material-description">
        <h3>香材介绍</h3><p>${esc(intro)}</p>
      </section>
      <div class="material-attributes">
        <div><span>香调位置</span><b style="color:${note.color}">${esc(note.name)} · ${esc(m.noteLabel)}</b></div>
        <div><span>香材形态</span><b>${esc(FORM_TYPES[m.type] || m.form)} · ${esc(m.form)}</b></div>
        <div><span>所属分区</span><b>${esc(cat.name)} · ${esc(cat.desc)}</b></div>
        <div><span>瓶身色卡</span><b class="material-color-value"><i style="background:${m.color}"></i>${esc(m.color.toUpperCase())}</b></div>
      </div>
      <div class="material-modal-footer">
        <span>${existing ? `已在配方中 · ${existing.drops} 滴` : '左键拖动瓶身可投入配方'}</span>
        <button type="button" id="btn-add-info-material" class="material-add-button" data-id="${m.id}">${existing ? '再加入一滴' : '加入配方'}　＋</button>
      </div>`
    els.materialModal.classList.remove('hidden')
    els.materialModal.classList.add('flex')
  }
  function closeMaterialInfo() {
    els.materialModal.classList.add('hidden')
    els.materialModal.classList.remove('flex')
  }

  // ---------------------------------------------------------------- 分区展柜
  function openCase(catKey) {
    const cat = CAT_MAP[catKey]
    if (!cat) return
    const list = MATERIALS.filter((m) => m.cat === catKey)
    els.caseHead.innerHTML = `
      <div class="flex items-center gap-3">
        <span class="w-9 h-9 rounded-lg grid place-items-center text-[16px] shrink-0" style="background:${rgba(cat.color, .18)};color:${cat.glow};border:1px solid ${rgba(cat.color, .35)}">◆</span>
        <div class="min-w-0">
          <h3 class="text-[14px] font-medium text-stone-100">${esc(cat.name)}展柜 <span class="text-[10px] font-normal text-stone-500 ml-1">${cat.en} · ${list.length} 味</span></h3>
          <p class="text-[10px] text-stone-500 mt-0.5">${esc(cat.desc)} · 每瓶按本体真实颜色呈现</p>
        </div>
      </div>
      <button id="case-x" class="text-stone-500 hover:text-stone-200 text-xl leading-none px-1">×</button>`
    const inRecipe = new Set(recipe.map((r) => r.id))
    els.caseGrid.innerHTML = list.map((m) => {
      const note = NOTES[m.note]
      return `<button class="case-card ${inRecipe.has(m.id) ? 'in-recipe' : ''}" draggable="true" data-id="${m.id}" style="--mc:${m.color};--mg:${m.glow}" title="${esc(m.name)} · ${esc(m.form)} · ${esc(m.noteLabel)}">
        ${bottleSvg(m)}
        <div class="case-name">${esc(m.name)}</div>
        <div class="case-meta"><span style="color:${cat.glow}">${esc(m.form)}</span><span style="color:${note.color}">${esc(m.noteLabel)}</span></div>
      </button>`
    }).join('')
    els.caseModal.classList.remove('hidden')
    els.caseModal.classList.add('flex')
    setStatus(`已展开「${cat.name}」展柜 · ${list.length} 味香料 · 点击取用或拖进瓶子`)
  }
  function closeCase() {
    els.caseModal.classList.add('hidden')
    els.caseModal.classList.remove('flex')
    els.caseModal.classList.remove('dragging-through')
  }
  function refreshCaseCards() {
    if (els.caseModal.classList.contains('hidden')) return
    const ids = new Set(recipe.map((r) => r.id))
    els.caseGrid.querySelectorAll('.case-card').forEach((c) => c.classList.toggle('in-recipe', ids.has(c.dataset.id)))
  }

  // ---------------------------------------------------------------- 手持 / 撤销操作条
  let heldKey = ''
  let actionSeq = 0
  let actionTimer = 0
  function setActionBar(html, ttl, key) {
    if (key && key === heldKey) return
    heldKey = key || ''
    clearTimeout(actionTimer)
    els.actionBar.innerHTML = html
    els.actionBar.classList.remove('hidden')
    if (ttl) actionTimer = setTimeout(hideActionBar, ttl)
  }
  function hideActionBar() {
    clearTimeout(actionTimer)
    heldKey = ''
    els.actionBar.classList.add('hidden')
    els.actionBar.innerHTML = ''
  }
  function showHeld(info) {
    if (!info) { hideActionBar(); return }
    const m = MATERIAL_BY_ID[info.id]
    if (!m) return
    const key = `held:${info.id}:${info.over}`
    if (key === heldKey) return
    setActionBar(`
      <div class="action-card ${info.over ? 'is-ready' : ''}">
        <span class="action-dot" style="background:${m.color};box-shadow:0 0 14px ${m.glow}"></span>
        <div class="min-w-0 flex-1">
          <div class="text-[11px] text-stone-100">已取出 <b style="color:${m.glow}">${esc(m.name)}</b> · ${esc(m.form)}</div>
          <div class="text-[10px] text-stone-400 mt-0.5">${info.over ? '松手或点击即可投入香水瓶' : '移到瓶口上方松手 / 点击投放 · ESC 放弃'}</div>
        </div>
        <button data-act="cancel" class="action-btn">取消投放</button>
      </div>`, 0, key)
  }
  function showUndo(name) {
    setActionBar(`
      <div class="action-card is-undo">
        <span class="text-[13px] text-emerald-300 leading-none">✓</span>
        <div class="min-w-0 flex-1">
          <div class="text-[11px] text-stone-100">已投入 <b class="text-amber-soft">${esc(name)}</b></div>
          <div class="text-[10px] text-stone-500 mt-0.5">6 秒内可撤销本次投放（Ctrl + Z）</div>
        </div>
        <button data-act="undo" class="action-btn">↩ 取消投放</button>
      </div>`, 6000, `undo:${++actionSeq}`)
  }

  // ---------------------------------------------------------------- 对外接口
  function setFilter(f) { filter = f; renderTabs(); renderLibrary() }
  function selectCategoryFrom3D(catKey) {
    setFilter({ mode: 'cat', key: catKey })
    setStatus(`已定位 3D 柜格：${CAT_MAP[catKey].name}`)
  }
  function layoutDropZone(rect) {
    if (!rect) return
    els.dropZone.style.left = `${rect.left}px`
    els.dropZone.style.top = `${rect.top}px`
    els.dropZone.style.width = `${rect.width}px`
    els.dropZone.style.height = `${rect.height}px`
    els.dropLabel.style.left = `${rect.left + rect.width / 2}px`
    els.dropLabel.style.top = `${rect.top + 12}px`
    els.dropLabel.style.transform = 'translateX(-50%)'
  }
  function setStatus(text) { els.status.textContent = text }
  function hideLoading() {
    els.loading.style.opacity = '0'
    setTimeout(() => els.loading.remove(), 720)
  }
  function setHint(text) { els.hint.innerHTML = `<span class="w-1.5 h-1.5 rounded-full bg-amber-brand animate-pulse"></span>${esc(text)}` }

  function render(state) {
    recipe = state.recipe
    analysis = state.analysis
    renderLibrary()
    renderRecipe()
    renderBalance()
    renderAI()
    renderStats()
    refreshCaseCards()
    syncToasts()
  }

  renderTabs()
  renderLibrary()

  return {
    render, showTooltip, selectCategoryFrom3D, layoutDropZone,
    setStatus, hideLoading, setHint, setFilter,
    openCase, closeCase, openMaterialInfo, showHeld, showUndo, hideActionBar,
  }
}
