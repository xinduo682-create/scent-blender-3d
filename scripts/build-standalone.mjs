/**
 * 把 dist/ 打包成一个可双击打开的离线单文件 HTML。
 * 用法：npm run build && npm run build:standalone
 *
 * 注意：内联 bundle 必须使用函数式 String.replace —— 直接用字符串替换时，
 * 压缩后 JS 里的 `$&` / `$'` 会被当作替换模式，破坏 HTML 结构。
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const dist = path.join(root, 'dist')
const html = fs.readFileSync(path.join(dist, 'index.html'), 'utf8')

const jsTag = html.match(/<script[^>]*type="module"[^>]*src="([^"]+)"[^>]*><\/script>/)
const cssTag = html.match(/<link[^>]*rel="stylesheet"[^>]*href="([^"]+)"[^>]*>/)
if (!jsTag || !cssTag) throw new Error('未找到 dist/index.html 中的 JS / CSS 资源标签，请先执行 npm run build')

const readAsset = (ref) => fs.readFileSync(path.join(dist, ref.replace(/^\.?\//, '')), 'utf8')
const safeJs = readAsset(jsTag[1])
  .replace(/<\/script/gi, '<\\/script')
  .replace(/<!--/g, '<\\!--')

const output = html
  .replace(cssTag[0], () => `<style>${readAsset(cssTag[1])}</style>`)
  .replace(jsTag[0], () => `<script type="module">${safeJs}</script>`)
  // 单文件版默认载入演示配方，双击即可看到完整效果
  .replace(/<head[^>]*>/, (m) => `${m}<script>window.__SCENT_DEMO__=true;</script>`)

const target = path.join(root, 'Scent-Blender-3D.html')
fs.writeFileSync(target, output, 'utf8')
console.log(`✓ 已生成 ${path.relative(root, target)} (${(Buffer.byteLength(output) / 1024).toFixed(0)} KB)`)
