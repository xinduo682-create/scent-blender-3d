import './style.css'
import { analyze, generateReview } from './analyzer.js'
import { createScene } from './scene3d.js'
import { createUI } from './ui.js'
import { MATERIAL_BY_ID, NOTES, MATERIALS, CATEGORIES } from './data.js'

const STORAGE_KEY = 'scent-blender-recipe-v1'
const params = new URLSearchParams(window.location.search)
const demoMode = params.get('demo') === '1' || Boolean(window.__SCENT_DEMO__)

function loadSavedRecipe() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null')
    if (!Array.isArray(saved)) return []
    return saved.filter((row) => MATERIAL_BY_ID[row?.id] && Number.isInteger(row.drops) && row.drops >= 1 && row.drops <= 9)
      .map(({ id, drops }) => ({ id, drops }))
  } catch { return [] }
}

const state = { recipe: demoMode ? [] : loadSavedRecipe() }
const undoStack = []
let scene = null

const ui = createUI({
  onAdd: (id) => add(id),
  onRemove: (id) => remove(id),
  onDrops: (id, delta) => changeDrops(id, delta),
  onReset: () => reset(),
  onUndo: () => undo(),
  onImportRecipe: (recipe) => importRecipe(recipe),
  onCategorySelect: (cat) => scene?.focusCategory(cat),
  onMaterialInfo: (material) => ui.openMaterialInfo(material),
  onReview: () => generateReview(state.recipe),
  onCancelHeld: () => { scene?.cancelHeld(); ui.setStatus('已取消取出 · 未投入任何香料') },
})

// 配方侧栏可点击收起，也可把侧边把手向右拖出画面收起。
const recipeToggle = document.getElementById('toggle-recipe')
const appRoot = document.getElementById('app')
let recipeHandleDragged = false
function setRecipeCollapsed(collapsed) {
  appRoot.classList.toggle('right-panel-collapsed', collapsed)
  recipeToggle.setAttribute('aria-expanded', String(!collapsed))
  recipeToggle.title = collapsed ? '点击展开配方区' : '点击收起，向右拖动也可收起'
  recipeToggle.querySelector('span').textContent = collapsed ? '‹' : '›'
}
recipeToggle.addEventListener('click', () => {
  if (recipeHandleDragged) { recipeHandleDragged = false; return }
  setRecipeCollapsed(!appRoot.classList.contains('right-panel-collapsed'))
})
recipeToggle.addEventListener('pointerdown', (event) => {
  if (event.button !== 0) return
  const startX = event.clientX
  const onMove = (moveEvent) => {
    if (moveEvent.clientX - startX > 54) {
      recipeHandleDragged = true
      setRecipeCollapsed(true)
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
    }
  }
  const onUp = () => {
    window.removeEventListener('pointermove', onMove)
    window.removeEventListener('pointerup', onUp)
  }
  window.addEventListener('pointermove', onMove)
  window.addEventListener('pointerup', onUp, { once: true })
})

scene = createScene(document.getElementById('canvas-wrap'), {
  onHoverMaterial: (m) => ui.showTooltip(m),
  onPickCategory: (cat) => {
    ui.selectCategoryFrom3D(cat)
    scene.focusCategory(cat)
  },
  onDropMaterial: (id) => add(id, '3D 拖入'),
  onHeldChange: (info) => { if (info) ui.showHeld(info); else ui.hideActionBar() },
  onHeldCancelled: () => ui.setStatus('已取消取出 · 未投入香料'),
  onCameraChange: () => { if (scene) ui.layoutDropZone(scene.getBottleScreenRect()) },
  onReady: () => ui.hideLoading(),
})
ui.layoutDropZone(scene.getBottleScreenRect())

function commit(message) {
  const analysis = analyze(state.recipe)
  if (!demoMode) {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state.recipe)) } catch { /* storage may be disabled or full */ }
  }
  scene.setRecipe(state.recipe)
  ui.render({ recipe: state.recipe, analysis })
  if (message) ui.setStatus(message)
}

function invalidateUndo() {
  undoStack.length = 0
  ui.hideActionBar()
}

function add(id, source = '') {
  const m = MATERIAL_BY_ID[id]
  if (!m) return
  const idx = state.recipe.findIndex((r) => r.id === id)
  const wasNew = idx < 0
  const prevDrops = idx >= 0 ? state.recipe[idx].drops : 0
  if (!wasNew && prevDrops >= 9) {
    ui.setStatus(`${m.name} 已达到 9 滴上限`)
    ui.setHint(`${m.name} 已达到单味香料上限`)
    return
  }
  if (wasNew) state.recipe.push({ id, drops: 1 })
  else state.recipe[idx].drops = Math.min(9, prevDrops + 1)

  undoStack.push({ id, wasNew, prevDrops })
  if (undoStack.length > 30) undoStack.shift()

  scene.addMaterial(m)
  commit(`${source ? source + ' · ' : ''}已投入 ${m.name} · ${NOTES[m.note].name} · ${m.form}`)
  ui.setHint(`已投入 ${m.name}　·　配方 ${state.recipe.length} 味`)
  ui.showUndo(m.name)
}

function importRecipe(rows) {
  if (!Array.isArray(rows)) return false
  const normalized = []
  const seen = new Set()
  for (const row of rows) {
    if (!MATERIAL_BY_ID[row?.id] || !Number.isInteger(row.drops) || row.drops < 1 || row.drops > 9 || seen.has(row.id)) return false
    seen.add(row.id)
    normalized.push({ id: row.id, drops: row.drops })
  }
  invalidateUndo()
  state.recipe = normalized
  commit(`已导入配方 · ${normalized.length} 味香料`)
  return true
}

function undo() {
  const last = undoStack.pop()
  if (!last) { ui.hideActionBar(); ui.setStatus('没有可撤销的投放'); return }
  const m = MATERIAL_BY_ID[last.id]
  if (last.wasNew) state.recipe = state.recipe.filter((r) => r.id !== last.id)
  else {
    const row = state.recipe.find((r) => r.id === last.id)
    if (row) row.drops = last.prevDrops
  }
  commit(`已取消投放 ${m?.name || ''} · 配方已恢复`)
  ui.hideActionBar()
}

function remove(id) {
  const m = MATERIAL_BY_ID[id]
  invalidateUndo()
  state.recipe = state.recipe.filter((r) => r.id !== id)
  commit(m ? `已移除 ${m.name}` : '已移除香料')
}

function changeDrops(id, delta) {
  const row = state.recipe.find((r) => r.id === id)
  if (!row) return
  invalidateUndo()
  row.drops = Math.min(9, row.drops + delta)
  if (row.drops <= 0) { remove(id); return }
  commit(`${MATERIAL_BY_ID[id].name} → ${row.drops} 滴`)
}

function reset() {
  invalidateUndo()
  state.recipe = []
  commit('配方已清空 · 可重新自由调配')
  ui.setHint('拖拽香料投入中央香水瓶')
  ui.setFilter({ mode: 'all', key: null })
  scene.focusCategory(null)
  ui.closeCase()
}

// 初始渲染
commit('就绪 · 取出柜墙香材投入中央香水瓶；右键查看介绍，拖动画面环绕')

// 演示入口：?demo=1 自动载入配方；?case=citrus 直接展开某分区展柜；?review=1 打开香评
if (window.__SCENT_DEMO__ || params.get('demo') === '1') {
  for (const name of ['佛手柑', '茉莉', '雪松', '丁香', '乳香']) {
    const m = MATERIALS.find((x) => x.name === name)
    if (m) add(m.id)
  }
  ui.setHint('演示配方已载入 · 绿色推荐搭配 / 橙色为提示')
}
if (params.get('case')) {
  const cat = params.get('case')
  if (CATEGORIES.some((c) => c.key === cat)) {
    scene.focusCategory(cat)
    ui.openCase(cat)
  }
}
if (params.get('review') === '1') {
  setTimeout(() => document.getElementById('btn-review').click(), 300)
}
if (params.get('held') === '1') {
  // 仅供自动化冒烟：模拟手持状态
  setTimeout(() => ui.showHeld({ id: MATERIALS[0].id, over: false }), 400)
}

// 便于调试 / 冒烟验证
window.__SCENT__ = {
  state, add, remove, reset, undo, scene, ui,
  analyze: () => analyze(state.recipe),
  openCase: (cat) => ui.openCase(cat),
  showHeld: (info) => ui.showHeld(info),
  materials: MATERIALS.length,
  categories: CATEGORIES.length,
}
