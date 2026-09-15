import type {
  CalorieRange,
  CookingMethod,
  IngredientTag,
  PortionLevel
} from '@food-sense/shared'

export type KnownIngredientTag = Exclude<IngredientTag, 'OTHER'>
export type KnownCookingMethod = Exclude<CookingMethod, 'OTHER'>

export const CALORIE_RANGE_RULE_VERSION = 'calorie-range-v1'

export const INGREDIENT_ALIASES = {
  '米饭': 'RICE',
  '白米饭': 'RICE',
  '青菜': 'LEAFY_VEGETABLE',
  '叶菜': 'LEAFY_VEGETABLE',
  '时蔬': 'LEAFY_VEGETABLE',
  '芸豆': 'GREEN_BEAN',
  '四季豆': 'GREEN_BEAN',
  '猪肉': 'PORK',
  '肉段': 'PORK',
  '带皮鸡肉': 'CHICKEN_WITH_SKIN',
  '鸡腿': 'CHICKEN_WITH_SKIN',
  '去皮鸡肉': 'CHICKEN_WITHOUT_SKIN',
  '鸡胸肉': 'CHICKEN_WITHOUT_SKIN',
  '豆腐': 'TOFU',
  '鸡蛋': 'EGG',
  '蛋': 'EGG',
  '酱汁': 'SAUCE',
  '菜汁': 'SAUCE'
} as const satisfies Record<string, KnownIngredientTag>

export const INGREDIENT_BASE_RANGES = {
  RICE: { min: 170, max: 240 },
  LEAFY_VEGETABLE: { min: 30, max: 70 },
  GREEN_BEAN: { min: 50, max: 90 },
  PORK: { min: 160, max: 240 },
  CHICKEN_WITH_SKIN: { min: 190, max: 290 },
  CHICKEN_WITHOUT_SKIN: { min: 140, max: 220 },
  TOFU: { min: 90, max: 170 },
  EGG: { min: 70, max: 100 },
  SAUCE: { min: 15, max: 50 }
} as const satisfies Record<KnownIngredientTag, CalorieRange>

export const COOKING_METHOD_ADDITIONS = {
  STEAMED: { min: 0, max: 10 },
  BOILED: { min: 0, max: 10 },
  BLANCHED: { min: 0, max: 10 },
  STIR_FRIED: { min: 25, max: 60 },
  DRY_STIR_FRIED: { min: 50, max: 100 },
  DEEP_FRIED: { min: 70, max: 120 },
  PAN_FRIED: { min: 40, max: 90 },
  BRAISED: { min: 35, max: 90 },
  SWEET_AND_SOUR: { min: 40, max: 100 },
  COLD_MIXED: { min: 15, max: 50 }
} as const satisfies Record<KnownCookingMethod, CalorieRange>

export const PORTION_MULTIPLIERS = {
  small: 0.75,
  regular: 1,
  large: 1.35
} as const satisfies Record<PortionLevel, number>

export const UNKNOWN_INGREDIENT_FALLBACK = {
  min: 100,
  max: 450
} as const satisfies CalorieRange

export const UNKNOWN_COOKING_METHOD_FALLBACK = {
  min: 0,
  max: 150
} as const satisfies CalorieRange

export function resolveIngredientAlias(
  value: string
): KnownIngredientTag | null {
  const normalized = value.trim().toLocaleLowerCase('zh-CN')

  return INGREDIENT_ALIASES[
    normalized as keyof typeof INGREDIENT_ALIASES
  ] ?? null
}
