/**
 * 香料清单、分区元数据与香调规则库
 * 数据格式：[名称, 形态(展示), 形态类型, 主调级, 调级(展示), 物理分区(可选覆盖)]
 */

export const CATEGORIES = [
  { key: 'citrus',    name: '柑橘',     en: 'CITRUS',    color: '#e8b04b', glow: '#ffd377', desc: '明亮 · 挥发前调' },
  { key: 'herbal',    name: '草本绿叶', en: 'HERBAL',    color: '#7fae4e', glow: '#b6e07c', desc: '青绿 · 草本筋络' },
  { key: 'spice',     name: '辛香',     en: 'SPICE',     color: '#c9703f', glow: '#ec9a68', desc: '温热 · 辛香骨架' },
  { key: 'floral',    name: '花香',     en: 'FLORAL',    color: '#d97fae', glow: '#f7aed4', desc: '柔美 · 香氛心脏' },
  { key: 'fruity',    name: '果香',     en: 'FRUITY',    color: '#d95f7c', glow: '#fb92a9', desc: '甜润 · 汁感层次' },
  { key: 'woody',     name: '木质',     en: 'WOODY',     color: '#9b7047', glow: '#cf9e6a', desc: '沉稳 · 结构尾韵' },
  { key: 'resin',     name: '树脂',     en: 'RESIN',     color: '#d98a34', glow: '#ffb45c', desc: '黏稠 · 香膏包覆' },
  { key: 'synthetic', name: '合成原料', en: 'SYNTHETIC', color: '#8b7cf0', glow: '#b2a6ff', desc: '现代 · 定香扩散' },
]

export const GROUPS = [
  { key: 'all',      name: '全部' },
  { key: 'citrus',   name: '柑橘' },
  { key: 'herbal',   name: '草本绿叶' },
  { key: 'spice',    name: '辛香' },
  { key: 'floral',   name: '花香' },
  { key: 'fruity',   name: '果香甜品' },
  { key: 'woody',    name: '木质' },
  { key: 'resin',    name: '树脂香膏' },
  { key: 'animal',   name: '琥珀定香' },
  { key: 'special',  name: '小众特色' },
]

export const NOTES = {
  top:    { name: '前调', en: 'TOP',    color: '#5ecfb0' },
  middle: { name: '中调', en: 'HEART',  color: '#e88bb4' },
  base:   { name: '后调', en: 'BASE',   color: '#d3a05a' },
}

export const FORM_TYPES = {
  oil:       '精油',
  dried:     '干燥植物',
  resin:     '固体树脂',
  seed:      '籽实豆果',
  bark:      '树皮',
  root:      '根茎',
  wood:      '木段苔藓',
  absolute:  '浸膏',
  synthetic: '合成原料',
}

// ---------------------------------------------------------------- 原始清单
const RAW = [
  {
    g: 'citrus', cat: 'citrus', title: '柑橘类', sub: '前调 · 大多精油',
    items: [
      ['佛手柑', '精油', 'oil', 'top', '前调'],
      ['柠檬', '精油', 'oil', 'top', '前调'],
      ['甜橙', '精油', 'oil', 'top', '前调'],
      ['血橙', '精油', 'oil', 'top', '前调'],
      ['蜜橘', '精油', 'oil', 'top', '前调'],
      ['青柠', '精油', 'oil', 'top', '前调'],
      ['柚子', '精油', 'oil', 'top', '前调'],
      ['葡萄柚', '精油', 'oil', 'top', '前调'],
      ['香柠檬', '精油', 'oil', 'top', '前调'],
      ['苦橙叶', '精油', 'oil', 'top', '前调'],
      ['橙花油', '精油', 'oil', 'top', '前调'],
      ['山苍子（木姜子）', '精油', 'oil', 'top', '前调'],
      ['柠檬桃金娘', '精油', 'oil', 'top', '前调'],
      ['柚子叶', '精油', 'oil', 'top', '前调'],
    ],
  },
  {
    g: 'herbal', cat: 'herbal', title: '草本 & 绿叶类', sub: '前调 / 中调 · 固体干草、精油',
    items: [
      ['薰衣草', '干花固体', 'dried', 'top', '前调'],
      ['迷迭香', '干枝固体', 'dried', 'top', '前调'],
      ['香茅', '干草固体', 'dried', 'top', '前调'],
      ['薄荷', '干叶固体', 'dried', 'top', '前调'],
      ['罗勒', '干叶固体', 'dried', 'top', '前调'],
      ['快乐鼠尾草', '干草固体', 'dried', 'top', '前调 / 中调'],
      ['格蓬脂', '树脂固体', 'resin', 'top', '前调'],
      ['紫罗兰叶', '干叶固体', 'dried', 'top', '前调 / 中调'],
      ['天竺葵', '干花固体', 'dried', 'middle', '中调'],
      ['广藿香', '干叶固体', 'dried', 'base', '后调'],
      ['艾草', '干叶固体', 'dried', 'top', '前调'],
      ['菖蒲', '根茎固体', 'root', 'middle', '中调'],
      ['甘松', '根茎固体', 'root', 'middle', '中调 / 后调'],
    ],
  },
  {
    g: 'spice', cat: 'spice', title: '辛香香料', sub: '中调为主 · 种子、树皮固体',
    items: [
      ['小豆蔻', '籽固体', 'seed', 'top', '前调 / 中调'],
      ['芫荽籽', '籽固体', 'seed', 'top', '前调'],
      ['肉桂', '树皮固体', 'bark', 'middle', '中调'],
      ['丁香', '花苞固体', 'seed', 'middle', '中调'],
      ['肉豆蔻', '籽固体', 'seed', 'middle', '中调'],
      ['姜', '根茎固体', 'root', 'middle', '中调'],
      ['藏红花', '花丝固体', 'dried', 'middle', '中调'],
      ['茴香', '籽固体', 'seed', 'middle', '中调'],
      ['黑胡椒', '籽固体', 'seed', 'top', '前调'],
      ['粉红胡椒', '籽固体', 'seed', 'top', '前调'],
      ['多香果', '果固体', 'seed', 'middle', '中调'],
      ['良姜', '根茎固体', 'root', 'middle', '中调'],
    ],
  },
  {
    g: 'floral', cat: 'floral', title: '花香类', sub: '白花 / 彩花 · 花朵、浸膏',
    items: [
      ['茉莉', '花浸膏固体', 'absolute', 'middle', '中调'],
      ['晚香玉', '花浸膏固体', 'absolute', 'middle', '中调'],
      ['橙花', '花浸膏固体', 'absolute', 'middle', '中调'],
      ['栀子', '花浸膏固体', 'absolute', 'middle', '中调'],
      ['铃兰', '浸膏固体', 'absolute', 'middle', '中调'],
      ['依兰依兰', '花精油', 'oil', 'middle', '中调'],
      ['水仙', '浸膏固体', 'absolute', 'middle', '中调'],
      ['风信子', '浸膏固体', 'absolute', 'middle', '中调'],
      ['玫瑰', '玫瑰浸膏固体', 'absolute', 'middle', '中调'],
      ['康乃馨', '浸膏固体', 'absolute', 'middle', '中调'],
      ['紫罗兰', '浸膏固体', 'absolute', 'middle', '中调'],
      ['洋甘菊', '干花固体', 'dried', 'middle', '中调'],
      ['桂花', '干花固体', 'dried', 'middle', '中调'],
      ['鸢尾根', '根茎固体', 'root', 'middle', '中调 / 后调'],
    ],
  },
  {
    g: 'fruity', cat: 'fruity', title: '果香甜品类', sub: '前调 / 中调 · 浸膏与豆荚',
    items: [
      ['黑加仑', '果浸膏固体', 'absolute', 'top', '前调'],
      ['荔枝', '果浸膏固体', 'absolute', 'top', '前调'],
      ['桃子', '果浸膏固体', 'absolute', 'top', '前调'],
      ['菠萝', '果浸膏固体', 'absolute', 'top', '前调'],
      ['覆盆子', '果浸膏固体', 'absolute', 'middle', '中调'],
      ['无花果', '果浸膏固体', 'absolute', 'middle', '中调'],
      ['椰子', '浸膏固体', 'absolute', 'middle', '中调 / 后调'],
      ['杏仁', '籽固体', 'seed', 'base', '后调'],
      ['可可', '豆固体', 'seed', 'base', '后调'],
      ['巧克力', '浸膏固体', 'absolute', 'base', '后调'],
      ['香草豆', '豆荚固体', 'seed', 'base', '后调'],
    ],
  },
  {
    g: 'woody', cat: 'woody', title: '木质类', sub: '后调 · 木段、根茎与苔藓固体',
    items: [
      ['迈索尔檀香', '木段固体', 'wood', 'base', '后调'],
      ['雪松', '木段固体', 'wood', 'base', '后调'],
      ['沉香（乌木）', '木段固体', 'wood', 'base', '后调'],
      ['岩兰草（香根草）', '根茎固体', 'root', 'base', '后调'],
      ['愈创木', '木段固体', 'wood', 'base', '后调'],
      ['柏木', '木段固体', 'wood', 'base', '后调'],
      ['桦木', '木段固体', 'wood', 'base', '后调'],
      ['乌木', '木段固体', 'wood', 'base', '后调'],
      ['橡木苔', '苔藓固体', 'wood', 'base', '后调'],
      ['阿基拉木', '合成木原料', 'synthetic', 'base', '后调'],
    ],
  },
  {
    g: 'resin', cat: 'resin', title: '树脂 & 香膏类', sub: '后调 · 固体树脂',
    items: [
      ['安息香', '树脂固体', 'resin', 'base', '后调'],
      ['乳香', '树脂固体', 'resin', 'base', '后调'],
      ['没药', '树脂固体', 'resin', 'base', '后调'],
      ['劳丹脂', '树脂固体', 'resin', 'base', '后调'],
      ['榄香脂', '树脂固体', 'resin', 'top', '前调 / 后调'],
      ['苏合香', '树脂固体', 'resin', 'base', '后调'],
      ['古芸香', '树脂固体', 'resin', 'base', '后调'],
    ],
  },
  {
    g: 'animal', cat: 'synthetic', title: '动物 & 琥珀、合成定香原料', sub: '后调 · 现代全部合成',
    items: [
      ['龙涎香醚（Ambroxan）', '合成原料', 'synthetic', 'base', '后调'],
      ['合成麝香', '合成原料', 'synthetic', 'base', '后调'],
      ['羊绒酮 Cashmeran', '合成原料', 'synthetic', 'base', '后调'],
      ['醛类（C12 醛）', '合成原料', 'synthetic', 'top', '前调'],
      ['琥珀香基', '合成原料', 'synthetic', 'base', '后调'],
      ['烟草浸膏', '浸膏固体', 'absolute', 'base', '后调'],
      ['皮革香基', '合成原料', 'synthetic', 'base', '后调'],
    ],
  },
  {
    g: 'special', title: '小众特色香材', sub: '猎奇 / 矿物 / 烟熏',
    items: [
      ['海狸香', '合成原料', 'synthetic', 'base', '后调', 'synthetic'],
      ['灵猫香', '合成原料', 'synthetic', 'base', '后调', 'synthetic'],
      ['海盐 / 臭氧香', '合成原料', 'synthetic', 'top', '前调', 'synthetic'],
      ['茶叶', '干茶固体', 'dried', 'middle', '中调', 'herbal'],
      ['桦焦油', '树脂固体', 'resin', 'base', '后调', 'resin'],
    ],
  },
  // 新增香材直接进入相应分区；统一走下方 ID、色卡回退、规范化和规则解析流程。
  { g: 'citrus', cat: 'citrus', title: '柑橘类', sub: '明亮果皮与叶片', items: [
    ['香橼', '果皮精油', 'oil', 'top', '前调'], ['金桔', '果皮精油', 'oil', 'top', '前调'],
    ['甜柠檬', '果皮精油', 'oil', 'top', '前调'], ['橘叶', '叶片精油', 'oil', 'top', '前调'],
  ] },
  { g: 'herbal', cat: 'herbal', title: '草本 & 绿叶类', sub: '清新草叶与药草', items: [
    ['百里香', '叶片精油', 'oil', 'middle', '中调'], ['甜罗勒', '叶片精油', 'oil', 'top', '前调'],
    ['香蜂草', '叶片精油', 'oil', 'top', '前调'], ['月桂叶', '干叶固体', 'dried', 'middle', '中调'],
  ] },
  { g: 'spice', cat: 'spice', title: '辛香香料', sub: '温暖辛香与种籽', items: [
    ['八角', '果实精油', 'seed', 'middle', '中调'], ['孜然', '籽实精油', 'seed', 'middle', '中调'],
    ['肉桂叶', '叶片精油', 'oil', 'middle', '中调'], ['肉豆蔻衣', '籽衣精油', 'oil', 'middle', '中调'],
  ] },
  { g: 'floral', cat: 'floral', title: '花香类', sub: '花朵与花香浸膏', items: [
    ['含羞草', '花浸膏', 'absolute', 'middle', '中调'], ['鸢尾花', '花香原料', 'absolute', 'middle', '中调'],
    ['橙花原精', '花浸膏', 'absolute', 'middle', '中调'], ['玫瑰原精', '花浸膏', 'absolute', 'middle', '中调'],
  ] },
  { g: 'fruity', cat: 'fruity', title: '果香甜品类', sub: '清甜果实与汁感香调', items: [
    ['梨', '果香原料', 'absolute', 'top', '前调'], ['苹果', '果香原料', 'absolute', 'top', '前调'],
    ['黑莓', '果香原料', 'absolute', 'middle', '中调'], ['甜瓜', '果香原料', 'absolute', 'top', '前调'],
  ] },
  { g: 'woody', cat: 'woody', title: '木质类', sub: '雪松、木材与根茎', items: [
    ['阿特拉斯雪松', '木质精油', 'wood', 'base', '后调'], ['弗吉尼亚雪松', '木质精油', 'wood', 'base', '后调'],
    ['柏木叶', '叶片精油', 'oil', 'middle', '中调'], ['香根草精油', '根茎精油', 'oil', 'base', '后调'],
  ] },
  { g: 'resin', cat: 'resin', title: '树脂 & 香膏类', sub: '香脂与树脂原料', items: [
    ['秘鲁香脂', '香脂原料', 'resin', 'base', '后调'], ['松脂', '树脂固体', 'resin', 'base', '后调'],
    ['古巴香脂', '香脂原料', 'resin', 'base', '后调'], ['达玛树脂', '树脂固体', 'resin', 'base', '后调'],
  ] },
  { g: 'animal', cat: 'synthetic', title: '现代合成香料', sub: '扩散、花香与定香分子', items: [
    ['二氢茉莉酮酸甲酯（Hedione）', '合成原料', 'synthetic', 'middle', '中调'],
    ['异构长叶烷酮（Iso E Super）', '合成原料', 'synthetic', 'base', '后调'],
    ['苯乙醇', '合成原料', 'synthetic', 'middle', '中调'], ['香豆素', '合成原料', 'synthetic', 'base', '后调'],
  ] },
]

export const CAT_MAP = Object.fromEntries(CATEGORIES.map((c) => [c.key, c]))

// ---------------------------------------------------------------- 逐味精确色卡
// 按香料本体（果实 / 叶片 / 花朵 / 木材 / 树脂 / 晶体）的真实颜色指定，
// 而不是按分区统一上色。柜格背光仍用分区色以保留分区辨识度。
export const MATERIAL_COLORS = {
  香橼: '#e5d64f', 金桔: '#f0a83c', 甜柠檬: '#e7e45b', 橘叶: '#628348',
  百里香: '#77874e', 甜罗勒: '#64a653', 香蜂草: '#84a35c', 月桂叶: '#647948',
  八角: '#89663c', 孜然: '#a7804c', 肉桂叶: '#6d583b', 肉豆蔻衣: '#bf7952',
  含羞草: '#e7bf59', 鸢尾花: '#aaa0c2', 橙花原精: '#f0e6c5', 玫瑰原精: '#c75166',
  梨: '#bad078', 苹果: '#9bb74e', 黑莓: '#453449', 甜瓜: '#d9bc72',
  阿特拉斯雪松: '#a86e48', 弗吉尼亚雪松: '#9a6548', 柏木叶: '#647c61', 香根草精油: '#797344',
  秘鲁香脂: '#a96135', 松脂: '#c69a50', 古巴香脂: '#876044', 达玛树脂: '#d0aa62',
  '二氢茉莉酮酸甲酯（Hedione）': '#e1ddd0', '异构长叶烷酮（Iso E Super）': '#c1b5a0', 苯乙醇: '#eee0db', 香豆素: '#d7bc8c',
  // 柑橘｜果实与叶片
  佛手柑: '#d8dc4a', 柠檬: '#f2e43c', 甜橙: '#f29431', 血橙: '#c8402c',
  蜜橘: '#f5a623', 青柠: '#9ccc3c', 柚子: '#ecd97a', 葡萄柚: '#ef7a6a',
  香柠檬: '#dfe063', 苦橙叶: '#4f7a3a', 橙花油: '#f0d79a', '山苍子（木姜子）': '#c9cf4b',
  柠檬桃金娘: '#b9cf58', 柚子叶: '#5b8c45',
  // 草本 & 绿叶
  薰衣草: '#9a86c8', 迷迭香: '#7e9b7a', 香茅: '#b5c95a', 薄荷: '#63c9a0',
  罗勒: '#66ad4e', 快乐鼠尾草: '#9aa886', 格蓬脂: '#8a8b46', 紫罗兰叶: '#4c7a4a',
  天竺葵: '#c56f83', 广藿香: '#4a4330', 艾草: '#9aa88c', 菖蒲: '#b99a63',
  甘松: '#6b543c', 茶叶: '#7a8a4e',
  // 辛香
  小豆蔻: '#8fa05c', 芫荽籽: '#c8a86b', 肉桂: '#a75c2e', 丁香: '#7a3f2a',
  肉豆蔻: '#a9805a', 姜: '#d9a94b', 藏红花: '#d1492f', 茴香: '#bfa565',
  黑胡椒: '#3f3b37', 粉红胡椒: '#d4707e', 多香果: '#7d5a3c', 良姜: '#d8b877',
  // 花香
  茉莉: '#f2eee0', 晚香玉: '#f5eddb', 橙花: '#f6f0df', 栀子: '#f3f1e4',
  铃兰: '#eaf1de', 依兰依兰: '#efd97a', 水仙: '#f2e9b8', 风信子: '#a9a3d6',
  玫瑰: '#d2486c', 康乃馨: '#e08a9c', 紫罗兰: '#8e72b8', 洋甘菊: '#eee2a8',
  桂花: '#e8b53f', 鸢尾根: '#c9bfd2',
  // 果香甜品
  黑加仑: '#3f2a4a', 荔枝: '#e8b9b4', 桃子: '#f2a889', 菠萝: '#e8c044',
  覆盆子: '#c0405c', 无花果: '#8c6a7d', 椰子: '#eee4cd', 杏仁: '#d9c19a',
  可可: '#5a3a26', 巧克力: '#4a2c1e', 香草豆: '#c8a56e',
  // 木质
  迈索尔檀香: '#c69a5e', 雪松: '#9c6242', '沉香（乌木）': '#3d3229', '岩兰草（香根草）': '#6d6a45',
  愈创木: '#8f7a63', 柏木: '#7d8a72', 桦木: '#d8cbb0', 乌木: '#2c2622',
  橡木苔: '#6d8250', 阿基拉木: '#8a6a50',
  // 树脂 & 香膏
  安息香: '#c07a35', 乳香: '#e6cf94', 没药: '#8f4a32', 劳丹脂: '#9c5f28',
  榄香脂: '#e0cf8e', 苏合香: '#7b6350', 古芸香: '#5f4632', 桦焦油: '#2f2620',
  // 动物 / 琥珀 / 合成定香
  '龙涎香醚（Ambroxan）': '#d8dbe0', 合成麝香: '#e8dcd8', '羊绒酮 Cashmeran': '#c9b9a6',
  '醛类（C12 醛）': '#dfe6ea', 琥珀香基: '#d19a4c', 烟草浸膏: '#8b6a3d', 皮革香基: '#5c3b2a',
  // 小众特色
  海狸香: '#7a5238', 灵猫香: '#b07a44', '海盐 / 臭氧香': '#b9dbe6',
}

export function lightenHex(hex, amount = 0.36) {
  const n = parseInt(String(hex).replace('#', ''), 16)
  const mix = (c) => Math.round(c + (255 - c) * amount).toString(16).padStart(2, '0')
  return `#${mix((n >> 16) & 255)}${mix((n >> 8) & 255)}${mix(n & 255)}`
}

export const MATERIALS = []
let _uid = 0
for (const block of RAW) {
  for (const row of block.items) {
    const [name, form, type, note, noteLabel, catOverride] = row
    const cat = catOverride || block.cat
    const color = MATERIAL_COLORS[name] || CAT_MAP[cat].color
    MATERIALS.push({
      id: `m${_uid++}`,
      name,
      form,
      type,
      note,
      noteLabel,
      cat,
      group: block.g,
      groupTitle: block.title,
      subtitle: block.sub,
      color,
      glow: lightenHex(color, 0.4),
      catColor: CAT_MAP[cat].color,
      // 新条目会自动获得一致的规则属性，无需为 3D、搜索或基础分析另写注册代码。
      ruleFamily: cat,
      seasonHint: ({ citrus: '春夏', herbal: '春夏', spice: '春秋', floral: '春秋', fruity: '春夏', woody: '秋冬', resin: '秋冬', synthetic: note === 'top' ? '春夏' : '秋冬' })[cat] || '春秋',
      description: `${CAT_MAP[cat].desc}；通常作为${NOTES[note]?.name || '中调'}香材使用，呈${form}形态。${block.sub}。`,
      special: block.g === 'special',
    })
  }
}

export const MATERIAL_BY_ID = Object.fromEntries(MATERIALS.map((m) => [m.id, m]))

// ---------------------------------------------------------------- 规则库（原样内置）
export const RULES = {
  conflictRules: [
    { materials: ['丁香', '茉莉'], level: 'warn', msg: '丁香与茉莉大量叠加容易刺鼻厚重，仅作为提示，不阻止调配' },
    { materials: ['广藿香', '紫罗兰叶'], level: 'warn', msg: '广藿香搭配紫罗兰叶容易闷沉，适合小众浓香水，仅作为提示，不阻止调配' },
    { materials: ['龙涎香醚', '合成麝香'], level: 'warn', msg: '两种定香香材叠加尾调偏重，容易盖住中调花香，仅作为提示，不阻止调配' },
    { materials: ['肉桂', '薄荷'], level: 'warn', msg: '肉桂辛香和薄荷凉感气味割裂，风格比较另类，仅作为提示，不阻止调配' },
    { materials: ['乳香', '黑加仑'], level: 'warn', msg: '树脂厚重感和黑加仑酸甜果香反差大，风格猎奇，仅作为提示，不阻止调配' },
  ],
  matchRules: [
    { materials: ['佛手柑', '茉莉', '雪松'], tag: '清新皂感', season: '春夏', msg: '经典清新组合，干净柔和，适合日常通勤' },
    { materials: ['檀香', '乳香', '香草豆'], tag: '温暖木质', season: '秋冬', msg: '温润治愈，氛围感强，适合冷天使用' },
    { materials: ['葡萄柚', '迷迭香', '天竺葵'], tag: '活力草本', season: '春夏', msg: '清爽提神，偏中性运动感' },
    { materials: ['玫瑰', '依兰依兰', '岩兰草'], tag: '温柔花香木质', season: '春秋', msg: '花香柔和，尾调沉稳，接受度很高' },
    { materials: ['橙花', '安息香', '柏木'], tag: '安宁安神', season: '秋冬', msg: '柔和白花搭配树脂，安静舒缓' },
    { materials: ['香橼', '甜罗勒', '柏木叶'], tag: '清新绿意', season: '春夏', msg: '柑橘果皮与明亮草叶交织，木质尾韵收束清爽' },
    { materials: ['梨', '玫瑰原精', '阿特拉斯雪松'], tag: '果香花束', season: '春秋', msg: '多汁梨香衬托玫瑰花心，以干燥雪松平衡甜感' },
    { materials: ['八角', '橙花原精', '秘鲁香脂'], tag: '暖辛白花', season: '秋冬', msg: '轻辛香带出白花层次，香脂提供柔软的尾韵' },
    { materials: ['香蜂草', '黑莓', '异构长叶烷酮'], tag: '青绿莓果', season: '春夏', msg: '柠檬草本与深色莓果形成对比，木质分子延长留香' },
  ],
  // 按香调分区自动补足新香材搭配建议；新增香材只要归入 CATEGORIES 就会参与匹配。
  categoryBlendRules: [
    { categories: ['citrus', 'floral', 'woody'], tag: '柑橘花木', msg: '以柑橘打开香气，花香承接，木质收尾。' },
    { categories: ['herbal', 'floral', 'resin'], tag: '草本花脂', msg: '草本提亮花香，少量树脂让尾韵更圆润。' },
    { categories: ['fruity', 'floral', 'woody'], tag: '果香花木', msg: '果香与花心融合，再用木质降低甜感。' },
    { categories: ['spice', 'woody', 'resin'], tag: '辛香暖木', msg: '辛香、木质和树脂构成温暖的后调骨架。' },
    { categories: ['citrus', 'herbal', 'synthetic'], tag: '清新扩散', msg: '柑橘与草本提供清新开场，扩散型香材延长留香。' },
    { categories: ['floral', 'resin', 'synthetic'], tag: '花香定香', msg: '花香搭配树脂与现代定香香材，增强层次和持久度。' },
  ],
  seasonMap: {
    佛手柑: '春夏', 柠檬: '春夏', 葡萄柚: '春夏', 薄荷: '春夏', 香茅: '春夏',
    黑加仑: '春夏', 荔枝: '春夏', 茉莉: '春秋', 玫瑰: '春秋', 天竺葵: '春秋',
    檀香: '秋冬', 雪松: '秋冬', 沉香: '秋冬', 广藿香: '秋冬', 乳香: '秋冬',
    没药: '秋冬', 安息香: '秋冬', 香草豆: '秋冬', 肉桂: '秋冬', 丁香: '秋冬',
  },
  balanceCheck: {
    onlyTop: '只有前调，香水挥发很快，留香短，仅作为提示，不阻止调配',
    onlyMiddle: '只有中调，缺少开场层次，建议增加少量前调提亮，仅作为提示，不阻止调配',
    onlyBase: '只有后调，气味沉闷厚重，缺少前调开场，仅作为提示，不阻止调配',
    topTooMuch: '前调占比过多，容易冲鼻，留香偏弱，仅作为提示，不阻止调配',
    baseTooMuch: '后调过重，气味压抑，建议加入果香、柑橘调和，仅作为提示，不阻止调配',
  },
}

// ---------------------------------------------------------------- 名称归一化
// 规则库用简称，清单用全称/带括号名，这里做精确别名归一，避免「紫罗兰 / 紫罗兰叶」「橙花 / 橙花油」误匹配。
export function canonName(s) {
  return String(s || '')
    .replace(/[（(][^）)]*[）)]/g, '')
    .replace(/\s+/g, '')
    .trim()
}

const ALIASES = {
  迈索尔檀香: ['檀香'],
  '山苍子（木姜子）': ['木姜子'],
  羊绒酮Cashmeran: ['羊绒酮'],
  '海盐 / 臭氧香': ['海盐', '臭氧香'],
}

export function matchKeys(material) {
  const keys = new Set([canonName(material.name)])
  const first = String(material.name).split(/\s|\//)[0]
  if (first) keys.add(canonName(first))
  for (const alias of ALIASES[material.name] || ALIASES[canonName(material.name)] || []) {
    keys.add(canonName(alias))
  }
  return keys
}

// key -> 香料（先到先得，同名词只保留首个）
export const KEY_INDEX = new Map()
for (const m of MATERIALS) {
  for (const k of matchKeys(m)) {
    if (k && !KEY_INDEX.has(k)) KEY_INDEX.set(k, m)
  }
}

export function resolveRuleName(name) {
  return KEY_INDEX.get(canonName(name)) || null
}
