import { readFile, readdir } from 'node:fs/promises'
import path from 'node:path'

const root = process.cwd()

async function read(relativePath) {
  return readFile(path.join(root, relativePath), 'utf8')
}

function requireText(source, expected, label) {
  if (!source.includes(expected)) throw new Error(`${label}: missing ${expected}`)
}

function rejectPattern(source, pattern, label) {
  if (pattern.test(source)) throw new Error(`${label}: matched ${pattern}`)
}

async function listFiles(directory, extension) {
  const entries = await readdir(path.join(root, directory), { withFileTypes: true })
  const files = await Promise.all(
    entries.map(async (entry) => {
      const relativePath = path.join(directory, entry.name)
      if (entry.isDirectory()) return listFiles(relativePath, extension)
      return entry.isFile() && entry.name.endsWith(extension) ? [relativePath] : []
    })
  )
  return files.flat()
}

const appConfig = await read('apps/miniprogram/src/app.config.ts')
const requiredPages = [
  'pages/home/index',
  'pages/meal-input/index',
  'pages/meal-confirm/index',
  'pages/meal-result/index',
  'pages/history/index'
]
for (const page of requiredPages) requireText(appConfig, `'${page}'`, 'five-page route')
rejectPattern(appConfig, /tabBar\s*:/, 'P0 must not introduce a tab bar')

const mealInput = await read('apps/miniprogram/src/pages/meal-input/index.tsx')
requireText(mealInput, "{ label: '图片', value: 'IMAGE' }", 'image input')
requireText(mealInput, "{ label: '文字', value: 'TEXT' }", 'text input')
requireText(
  mealInput,
  '图片会发送给第三方模型分析，仅用于本次识别，不会长期保存',
  'image privacy notice'
)

const mealResult = await read('apps/miniprogram/src/pages/meal-result/index.tsx')
requireText(mealResult, '本餐热量估算区间', 'calorie range presentation')
requireText(
  mealResult,
  '估算仅供参考，不构成医疗或营养处方建议。评价的是这顿选择，不是你。',
  'safe result copy'
)

const history = await read('apps/miniprogram/src/pages/history/index.tsx')
requireText(history, '演示使用虚构资料；图片仅用于当次识别，不会长期保存。', 'demo disclaimer')
requireText(history, '如有特殊饮食需求，请咨询注册营养师或医生。', 'professional referral')

const primitivesScss = await read('apps/miniprogram/src/components/ui/primitives.scss')
requireText(primitivesScss, 'env(safe-area-inset-bottom)', 'bottom safe area')
requireText(primitivesScss, 'min-height: $touch-target', 'minimum touch target')
requireText(primitivesScss, 'max-width: 960px', 'wide-screen constraint')

const primitivesTsx = await read('apps/miniprogram/src/components/ui/primitives.tsx')
requireText(primitivesTsx, 'ui-status-badge__icon', 'status icon encoding')
requireText(primitivesTsx, 'ui-status-badge__label', 'status text encoding')

const prismaSchema = await read('apps/server/prisma/schema.prisma')
rejectPattern(prismaSchema, /^\s*(image|imagePath|imageUrl|mealType|weight|grams)\s+/m, 'P0 database boundary')
requireText(prismaSchema, 'isDemo          Boolean', 'demo record marker')
requireText(prismaSchema, 'clientRequestId String       @unique', 'idempotent save key')

const sharedMeal = await read('packages/shared/src/meal.ts')
rejectPattern(sharedMeal, /^\s*(weight|grams|quantity)\s*:/m, 'P1 quantity fields')

const requiredDeliverables = [
  'deliverables/p0/README.md',
  'deliverables/p0/one-page-summary.md',
  'deliverables/p0/demo-video-script.md',
  'deliverables/p0/failure-case-retrospective.md',
  'deliverables/p0/final-acceptance-checklist.md',
  'deliverables/p0/usability-test-plan.md',
  'deliverables/p0/usability-test-log.md',
  'deliverables/p0/screenshots/README.md'
]
const deliverables = new Map(
  await Promise.all(requiredDeliverables.map(async (file) => [file, await read(file)]))
)
for (const [file, source] of deliverables) {
  if (!source.trim()) throw new Error(`P0 deliverable is empty: ${file}`)
}

const finalChecklist = deliverables.get('deliverables/p0/final-acceptance-checklist.md')
const usabilityLog = deliverables.get('deliverables/p0/usability-test-log.md')
const demoVideoScript = deliverables.get('deliverables/p0/demo-video-script.md')
if (!finalChecklist || !usabilityLog || !demoVideoScript) {
  throw new Error('P0 acceptance evidence is unavailable')
}

// 视频状态只在成片文件真实落地时才允许为 PASS
const demoVideoPath = 'deliverables/p0/food-sense-p0-demo.mp4'
const demoVideo = await readFile(path.join(root, demoVideoPath)).catch(() => null)
if (!demoVideo || demoVideo.length < 100 * 1024) {
  throw new Error(`P0 demo video artifact is missing or too small: ${demoVideoPath}`)
}
if (demoVideo.subarray(4, 8).toString('ascii') !== 'ftyp') {
  throw new Error(`P0 demo video artifact is not a valid MP4 container: ${demoVideoPath}`)
}
requireText(finalChecklist, '| 实际演示视频 | PASS：', 'video status backed by artifact')
requireText(finalChecklist, 'food-sense-p0-demo.mp4', 'video artifact referenced by checklist')
requireText(demoVideoScript, '只用于模拟系统录屏状态', 'documented simulator recording limitation')
requireText(finalChecklist, '| P01–P05 对照原型 | PASS |', 'verified screenshot status')
requireText(finalChecklist, '统一为“真机调试（需正式 AppID）”', 'D5 final wording')
requireText(usabilityLog, '已完成 0/5 人', 'honest usability-test status')
requireText(usabilityLog, '用户已接受本次无法招募记录', 'accepted usability-test status')
rejectPattern(finalChecklist, /\| 实际演示视频 \| PENDING/, 'video status must not stay pending once the artifact lands')

const requiredScreenshots = [
  'p01-home-records.png',
  'p01-home-empty.png',
  'p02-text.png',
  'p02-image.png',
  'p03-confirm.png',
  'p03-missing-method.png',
  'p04-result-green.png',
  'p04-result-yellow.png',
  'p04-result-red.png',
  'p04-fallback.png',
  'p05-history.png',
  'p05-settings.png'
]
for (const file of requiredScreenshots) {
  const screenshot = await readFile(path.join(root, 'deliverables/p0/screenshots', file))
  const pngSignature = screenshot.subarray(0, 8).toString('hex')
  if (pngSignature !== '89504e470d0a1a0a') throw new Error(`Invalid PNG screenshot: ${file}`)
}

const productionTsxFiles = await listFiles('apps/miniprogram/src/pages', '.tsx')
const productionTsx = (
  await Promise.all(productionTsxFiles.map(async (file) => `${file}\n${await read(file)}`))
).join('\n')
rejectPattern(productionTsx, /\.workbuddy_html|<iframe|采用建议|建议后重算|克重输入/, 'prototype/P1 UI leakage')
rejectPattern(productionTsx, /1290\s*(?:kcal|千卡)|650\s*[–-]\s*850\s*(?:kcal|千卡)/i, 'prototype demo values')

console.log('P0 static audit passed:')
console.log(`- ${requiredPages.length} registered pages, no tab bar`)
console.log('- image/text inputs and privacy notice present')
console.log('- calorie range and safety copy present')
console.log('- status uses icon + text; touch target and safe area rules present')
console.log('- Prisma stores no image, meal type, or weight fields')
console.log('- no HTML showcase shell, prototype values, or P1 controls in production pages')
console.log(`- ${requiredDeliverables.length} P0 deliverables present; demo video artifact verified (${demoVideoPath})`)
console.log(`- ${requiredScreenshots.length} final simulator screenshots present as valid PNG files`)
