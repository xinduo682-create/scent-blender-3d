/**
 * 本地调香规则分析引擎
 * 纯计算：只产出提示信息，绝不返回任何「禁止 / 拦截」指令。
 * 配方每次变更都会完整遍历一遍规则库。
 */
import {
  RULES, NOTES, MATERIALS, MATERIAL_BY_ID, canonName, resolveRuleName, matchKeys,
} from './data.js'

function recipeMaterials(recipe) {
  return recipe
    .map((r) => ({ item: r, material: MATERIAL_BY_ID[r.id] }))
    .filter((x) => x.material)
}

function keySetOf(recipe) {
  const keys = new Set()
  for (const { material } of recipeMaterials(recipe)) {
    for (const k of matchKeys(material)) if (k) keys.add(k)
  }
  return keys
}

function displayName(ruleName) {
  const m = resolveRuleName(ruleName)
  return m ? m.name : ruleName
}

/** 主分析入口 */
export function analyze(recipe) {
  const entries = recipeMaterials(recipe)
  const keys = keySetOf(recipe)
  const counts = { top: 0, middle: 0, base: 0 }
  for (const { item, material } of entries) counts[material.note] += item.drops
  const totalDrops = counts.top + counts.middle + counts.base
  const totalKinds = entries.length
  const ratios = {
    top: totalDrops ? counts.top / totalDrops : 0,
    middle: totalDrops ? counts.middle / totalDrops : 0,
    base: totalDrops ? counts.base / totalDrops : 0,
  }

  const alerts = []

  // ---------- 1. 冲突规则（warn → 橙色） ----------
  for (const rule of RULES.conflictRules) {
    const hit = rule.materials.every((n) => keys.has(canonName(n)))
    if (!hit) continue
    alerts.push({
      id: `conflict:${rule.materials.join('|')}`,
      kind: 'warn',
      level: rule.level,
      title: '香气冲突提示',
      msg: rule.msg,
      chips: rule.materials.map(displayName),
    })
  }

  // ---------- 2. 推荐搭配（match → 绿色） ----------
  const matches = []
  const nearMatches = []
  for (const rule of RULES.matchRules) {
    const owned = rule.materials.filter((n) => keys.has(canonName(n)))
    const missing = rule.materials.filter((n) => !keys.has(canonName(n)))
    if (missing.length === 0) {
      const alert = {
        id: `match:${rule.tag}`,
        kind: 'match',
        title: `推荐搭配 · ${rule.tag}`,
        msg: rule.msg,
        tag: rule.tag,
        season: rule.season,
        chips: rule.materials.map(displayName),
      }
      matches.push(alert)
      alerts.push(alert)
    } else if (owned.length >= 1 && missing.length <= 2) {
      nearMatches.push({
        id: `near:${rule.tag}`,
        tag: rule.tag,
        season: rule.season,
        msg: rule.msg,
        owned: owned.map(displayName),
        missing: missing.map(displayName),
      })
    }
  }

  // 类别模板会自动覆盖后来加入的同类香材，不要求逐味再写一组配方规则。
  const presentCategories = new Set(entries.map(({ material }) => material.cat))
  for (const rule of RULES.categoryBlendRules || []) {
    const ownedCategories = rule.categories.filter((cat) => presentCategories.has(cat))
    const missingCategories = rule.categories.filter((cat) => !presentCategories.has(cat))
    if (!ownedCategories.length || !missingCategories.length || missingCategories.length > 2) continue
    if (nearMatches.some((n) => n.tag === rule.tag) || matches.some((n) => n.tag === rule.tag)) continue
    const ownedNames = entries.filter(({ material }) => ownedCategories.includes(material.cat)).map(({ material }) => material.name)
    const missingNames = missingCategories.map((cat) => MATERIALS.find((m) => m.cat === cat)?.name).filter(Boolean)
    if (!missingNames.length) continue
    nearMatches.push({ id: `category:${rule.tag}`, tag: rule.tag, season: null, msg: rule.msg, owned: ownedNames.slice(0, 2), missing: missingNames })
  }

  // ---------- 3. 结构平衡（仅提示，不拦截） ----------
  const balance = []
  if (totalDrops > 0) {
    const b = RULES.balanceCheck
    const only = (k) => counts[k] > 0 && Object.keys(counts).every((x) => x === k || counts[x] === 0)
    if (only('top')) balance.push({ id: 'balance:onlyTop', kind: 'warn', title: '结构 · 只有前调', msg: b.onlyTop })
    else if (only('middle')) balance.push({ id: 'balance:onlyMiddle', kind: 'warn', title: '结构 · 只有中调', msg: b.onlyMiddle })
    else if (only('base')) balance.push({ id: 'balance:onlyBase', kind: 'warn', title: '结构 · 只有后调', msg: b.onlyBase })

    if (totalDrops >= 3 && ratios.top > 0.6) {
      balance.push({ id: 'balance:topTooMuch', kind: 'warn', title: '结构 · 前调偏重', msg: b.topTooMuch })
    }
    if (totalDrops >= 3 && ratios.base > 0.6) {
      balance.push({ id: 'balance:baseTooMuch', kind: 'warn', title: '结构 · 后调偏重', msg: b.baseTooMuch })
    }
  }
  alerts.push(...balance)

  // ---------- 4. 季节倾向（seasonMap） ----------
  const seasonScore = { 春夏: 0, 春秋: 0, 秋冬: 0 }
  const seasonHits = []
  for (const { item, material } of entries) {
    const ownKeys = matchKeys(material)
    let matchedSeason = false
    for (const [name, season] of Object.entries(RULES.seasonMap)) {
      if (ownKeys.has(canonName(name)) && seasonScore[season] !== undefined) {
        seasonScore[season] += item.drops
        seasonHits.push({ name: material.name, season, drops: item.drops })
        matchedSeason = true
      }
    }
    if (!matchedSeason && seasonScore[material.seasonHint] !== undefined) {
      seasonScore[material.seasonHint] += item.drops
      seasonHits.push({ name: material.name, season: material.seasonHint, drops: item.drops })
    }
  }
  const season = Object.entries(seasonScore).sort((a, b) => b[1] - a[1])[0]
  const dominantSeason = season && season[1] > 0 ? season[0] : null

  // ---------- 5. 概览 ----------
  if (totalKinds === 0) {
    alerts.push({
      id: 'idle', kind: 'info', title: '等待第一滴香料',
      msg: '从环绕式香料工坊取用香材，规则分析会实时提示搭配灵感、结构平衡与季节倾向。你可以自由组合任意香料。',
    })
  } else if (alerts.filter((a) => a.kind !== 'info').length === 0) {
    alerts.push({
      id: 'clean', kind: 'match', title: '配方状态良好',
      msg: '当前组合未触发任何冲突或结构失衡提示，可以继续自由探索。',
    })
  }

  return {
    counts, ratios, totalDrops, totalKinds,
    seasonScore, seasonHits, dominantSeason,
    alerts, matches, nearMatches,
    warnCount: alerts.filter((a) => a.kind === 'warn').length,
    matchCount: matches.length,
  }
}

// ---------------------------------------------------------------- 简洁结构化香评
const STYLE = {
  citrus:    { vibe: '清亮爽利', people: '喜欢干净不甜、不想打扰别人的人；中性通勤党、香水入门者', scene: '白天通勤、办公室、户外' },
  herbal:    { vibe: '青绿清醒', people: '偏爱自然草本、运动感与中性气质的人', scene: '晨间、户外、春夏日常' },
  spice:     { vibe: '温热有棱角', people: '喜欢有温度、带点个性、不怕被记住的人', scene: '秋冬聚会、傍晚、寒冷天气' },
  floral:    { vibe: '柔和优雅', people: '偏爱温柔好穿、接受度高的人；约会与日常都合适', scene: '办公室、约会、春秋全天' },
  fruity:    { vibe: '明快甜润', people: '喜欢显年轻、轻松有活力的人；休闲派对常客', scene: '周末出街、聚会、春夏白天' },
  woody:     { vibe: '沉稳有质感', people: '偏好低调、不爱撞香的人；成熟职场与木质调爱好者', scene: '正式场合、秋冬夜晚、书房' },
  resin:     { vibe: '温厚包覆', people: '喜欢香膏感、氛围感与慢节奏的人；沙龙香玩家', scene: '秋冬夜晚、室内、安静场合' },
  synthetic: { vibe: '洁净现代', people: '偏爱皂感、极简与强留香的人；现代都市风格', scene: '通勤、健身房、全年日常' },
}

function pct(v) { return `${Math.round(v * 100)}%` }

function dominantCategory(recipe) {
  const score = {}
  for (const r of recipe) {
    const m = MATERIAL_BY_ID[r.id]
    if (m) score[m.cat] = (score[m.cat] || 0) + r.drops
  }
  return Object.entries(score).sort((a, b) => b[1] - a[1])[0]?.[0] || 'floral'
}

function seasonOf(a) {
  if (a.dominantSeason) return a.dominantSeason
  if (a.ratios.base > 0.5) return '秋冬'
  if (a.ratios.top > 0.5) return '春夏'
  return '春秋'
}

function longevity(a) {
  if (a.ratios.base > 0.45) return '后调占比较高，留香潜力偏长'
  if (a.ratios.top > 0.5) return '前调占比较高，开场更轻快'
  return '前中后调较均衡，留香表现需结合实际原料判断'
}

function projection(a) {
  if (a.ratios.top > 0.45) return '扩散较开'
  if (a.ratios.base > 0.5) return '偏贴肤'
  return '扩散适中'
}

function buildReview(recipe, a) {
  const entries = recipeMaterials(recipe)
  if (!entries.length) {
    const sections = [
      { title: '一句话香评', body: '瓶身尚空，玻璃里只盛着光。', lead: true },
      { title: '香水分析', body: '尚未投入香料，暂无前 / 中 / 后调结构。双击 3D 柜格可展开分区展柜，点住一瓶拖进香水瓶即可开始。' },
      { title: '适合人群', body: '所有想自己动手调香的人 —— 这里没有禁区，任意组合都被允许。' },
      { title: '适合季节与场合', body: '四季皆可，取决于你投入的第一味香料。' },
    ]
    return { sections, text: sections.map((s) => `【${s.title}】${s.body}`).join('\n\n') }
  }

  const names = (note) => entries.filter((x) => x.material.note === note).map((x) => x.material.name)
  const top = names('top'), mid = names('middle'), base = names('base')
  const cat = dominantCategory(recipe)
  const style = STYLE[cat] || STYLE.floral
  // 命中经典搭配时优先采用规则库标注的季节，比按滴数统计更贴近「适合哪种季节」
  const season = a.matches.length ? a.matches[0].season : seasonOf(a)
  const tag = a.matches.length ? `读得出「${a.matches.map((m) => m.tag).join('、')}」的骨架` : '个性比协调更值得玩味'

  const lead = top[0] || mid[0] || base[0]
  const tail = base[0] ? `收在${base[0]}里` : '收得轻而干净'
  const hasOpening = top.length > 0 || mid.length > 0
  const oneLine = hasOpening
    ? `${lead}起头，${style.vibe}地铺开，${tail}；${tag}。`
    : `略过明亮开场，${style.vibe}从第一秒就铺满；${tag}。`

  const dominant = Object.entries(a.ratios).sort((x, y) => y[1] - x[1])[0][0]
  const layer = { top: '开场明亮', middle: '中调饱满', base: '尾韵厚重' }[dominant]
  const analysis = [
    `前 ${pct(a.ratios.top)} / 中 ${pct(a.ratios.middle)} / 后 ${pct(a.ratios.base)}，${layer}。`,
    `${longevity(a)}，${projection(a)}；${a.totalKinds} 味 / ${a.totalDrops} 滴。`,
    `季节倾向${season}${a.matches.length ? `，命中「${a.matches[0].tag}」` : ''}。`,
    a.warnCount ? `${a.warnCount} 条提示仅作参考，不阻止调配。` : '',
  ].filter(Boolean).join('')

  const young = a.ratios.top > 0.5 ? '偏年轻、爱清爽的人尤其合适' : null
  const people = [style.people, young].filter(Boolean).join('；') + '。'
  const scene = `${season}最合适；${style.scene}。${season === '秋冬' ? '少量喷洒即可。' : '高温时减少用量。'}`

  const sections = [
    { title: '一句话香评', body: oneLine, lead: true },
    { title: '香水分析', body: analysis },
    { title: '适合人群', body: people },
    { title: '适合季节与场合', body: scene },
  ]
  return { sections, text: sections.map((s) => `【${s.title}】${s.body}`).join('\n\n') }
}

function parseSections(text) {
  const re = /【([^】]+)】\s*([^【]*)/g
  const out = []
  let m
  while ((m = re.exec(text)) !== null) {
    const body = m[2].trim()
    if (body) out.push({ title: m[1].trim(), body, lead: out.length === 0 })
  }
  return out.length ? out : [{ title: '香评', body: text.trim(), lead: true }]
}

/**
 * 可选接入同源服务端代理：window.SCENT_LLM_CONFIG = { endpoint, model }。
 * 浏览器端不接受或发送 API key，避免把服务凭据打包进静态页面。
 */
export async function generateReview(recipe, config) {
  const cfg = config || (typeof window !== 'undefined' ? window.SCENT_LLM_CONFIG : null) || {}
  const a = analyze(recipe)
  const local = buildReview(recipe, a)
  const names = (note) => recipeMaterials(recipe).filter((x) => x.material.note === note).map((x) => x.material.name)

  if (cfg.endpoint) {
    let endpoint
    try {
      endpoint = new URL(cfg.endpoint, window.location.href)
      if (endpoint.origin !== window.location.origin) throw new Error('只允许请求同源服务端代理')
    } catch (err) {
      return { ...local, source: `本地结构化分析（代理地址不可用：${err.message}）` }
    }
    const prompt = [
      '你是专业评香师。请输出简洁的中文香评，严格按下面四行格式，每行一段，全文不超过 180 字，不要客套与营销话术：',
      '【一句话香评】一句有画面感的总评',
      '【香水分析】前/中/后调占比与层次、留香与扩散的定性倾向、季节倾向、命中搭配与提示（提示只作参考，不给具体小时数）',
      '【适合人群】性格/风格/使用经验画像',
      '【适合季节与场合】季节 + 具体场合 + 用量建议',
      `配方前调：${names('top').join('、') || '无'}；中调：${names('middle').join('、') || '无'}；后调：${names('base').join('、') || '无'}`,
      `占比：前 ${pct(a.ratios.top)} / 中 ${pct(a.ratios.middle)} / 后 ${pct(a.ratios.base)}；季节倾向：${seasonOf(a)}；命中搭配：${a.matches.map((m) => m.tag).join('、') || '无'}；提示数：${a.warnCount}`,
    ].join('\n')
    try {
      const res = await fetch(endpoint.href, {
        method: 'POST',
        mode: 'same-origin',
        redirect: 'error',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: cfg.model || 'gpt-4o-mini',
          messages: [{ role: 'user', content: prompt }],
          temperature: 0.8,
        }),
      })
      if (!res.ok) throw new Error(`LLM HTTP ${res.status}`)
      const data = await res.json()
      const text = data?.choices?.[0]?.message?.content?.trim()
      if (text) return { text, sections: parseSections(text), source: `LLM · ${cfg.model || 'chat-completions'}` }
      throw new Error('empty completion')
    } catch (err) {
      return { ...local, source: `本地分析（LLM 未响应：${err.message}）` }
    }
  }
  return { ...local, source: '本地规则分析 · 留香与扩散为定性估算' }
}

export { NOTES }
