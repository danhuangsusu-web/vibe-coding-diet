import type {
  CookingMethod,
  IngredientTag,
  PortionLevel
} from '@food-sense/shared'

import type {
  MealFlowParsedItem,
  MealFlowParsedMeal
} from '../../state/meal-flow'

export const MAX_MEAL_NAME_LENGTH = 30

export const COOKING_METHOD_OPTIONS: ReadonlyArray<{
  label: string
  value: CookingMethod
}> = [
  { label: '蒸', value: 'STEAMED' },
  { label: '煮', value: 'BOILED' },
  { label: '白灼', value: 'BLANCHED' },
  { label: '炒', value: 'STIR_FRIED' },
  { label: '干煸', value: 'DRY_STIR_FRIED' },
  { label: '油炸', value: 'DEEP_FRIED' },
  { label: '煎', value: 'PAN_FRIED' },
  { label: '红烧', value: 'BRAISED' },
  { label: '糖醋', value: 'SWEET_AND_SOUR' },
  { label: '凉拌', value: 'COLD_MIXED' },
  { label: '其他', value: 'OTHER' }
]

export const PORTION_OPTIONS: ReadonlyArray<{
  label: string
  value: PortionLevel
}> = [
  { label: '小份', value: 'small' },
  { label: '正常份', value: 'regular' },
  { label: '大份', value: 'large' }
]

const INGREDIENT_LABELS: Record<IngredientTag, string> = {
  RICE: '米饭',
  LEAFY_VEGETABLE: '叶菜',
  GREEN_BEAN: '豆角',
  PORK: '猪肉',
  CHICKEN_WITH_SKIN: '带皮鸡肉',
  CHICKEN_WITHOUT_SKIN: '去皮鸡肉',
  TOFU: '豆腐',
  EGG: '鸡蛋',
  SAUCE: '酱汁',
  OTHER: '其他食材'
}

const COOKING_METHOD_LABELS = Object.fromEntries(
  COOKING_METHOD_OPTIONS.map((option) => [option.value, option.label])
) as Record<CookingMethod, string>

const HIGH_OIL_OR_SUGAR_METHODS = new Set<CookingMethod>([
  'DRY_STIR_FRIED',
  'DEEP_FRIED',
  'PAN_FRIED',
  'SWEET_AND_SOUR'
])

export type ConfidenceTone = 'high' | 'medium' | 'low'

export interface ConfidencePresentation {
  icon: string
  label: string
  tone: ConfidenceTone
}

export interface MealConfirmItem extends MealFlowParsedItem {
  localId: string
  nameWasTruncated: boolean
  wasManuallyAdjusted: boolean
}

export interface MealConfirmState {
  items: MealConfirmItem[]
  nextItemNumber: number
}

export type MealConfirmAction =
  | { type: 'name-changed'; itemId: string; value: string }
  | { type: 'item-deleted'; itemId: string }
  | { type: 'item-added' }
  | {
      type: 'cooking-method-toggled'
      itemId: string
      value: CookingMethod
    }
  | { type: 'other-cooking-changed'; itemId: string; value: string }
  | { type: 'portion-changed'; itemId: string; value: PortionLevel }

export function confidencePresentation(
  confidence: number
): ConfidencePresentation {
  if (confidence >= 0.8) {
    return { icon: '✓', label: '较确定', tone: 'high' }
  }

  if (confidence >= 0.5) {
    return { icon: '!', label: '可能', tone: 'medium' }
  }

  return { icon: '?', label: '不确定', tone: 'low' }
}

export function ingredientLabel(value: IngredientTag): string {
  return INGREDIENT_LABELS[value]
}

export function cookingMethodLabel(value: CookingMethod): string {
  return COOKING_METHOD_LABELS[value]
}

export function isHighOilOrSugarMethod(value: CookingMethod): boolean {
  return HIGH_OIL_OR_SUGAR_METHODS.has(value)
}

function cloneItem(item: MealFlowParsedItem, index: number): MealConfirmItem {
  return {
    ...item,
    ingredients: [...item.ingredients],
    otherIngredients: [...item.otherIngredients],
    cookingMethods: [...item.cookingMethods],
    otherCookingMethods: [...item.otherCookingMethods],
    uncertainties: [...item.uncertainties],
    localId: `meal-item-${index + 1}`,
    nameWasTruncated: false,
    wasManuallyAdjusted: item.wasManuallyAdjusted ?? false
  }
}

export function createMealConfirmState(
  parsedMeal: MealFlowParsedMeal | null
): MealConfirmState {
  const items = (parsedMeal?.items ?? [])
    .map(cloneItem)
    .sort((left, right) => left.confidence - right.confidence)

  return {
    items,
    nextItemNumber: items.length + 1
  }
}

function updateItem(
  state: MealConfirmState,
  itemId: string,
  updater: (item: MealConfirmItem) => MealConfirmItem
): MealConfirmState {
  return {
    ...state,
    items: state.items.map((item) =>
      item.localId === itemId ? updater(item) : item
    )
  }
}

function createAddedItem(localId: string): MealConfirmItem {
  return {
    localId,
    displayName: '',
    ingredients: ['OTHER'],
    otherIngredients: ['待补充食材'],
    cookingMethods: ['OTHER'],
    otherCookingMethods: ['待补充做法'],
    portionLevel: 'regular',
    confidence: 0,
    uncertainties: ['新增菜品的信息需要你确认'],
    nameWasTruncated: false,
    wasManuallyAdjusted: true
  }
}

export function mealConfirmReducer(
  state: MealConfirmState,
  action: MealConfirmAction
): MealConfirmState {
  switch (action.type) {
    case 'name-changed': {
      const characters = Array.from(action.value)
      const displayName = characters.slice(0, MAX_MEAL_NAME_LENGTH).join('')

      return updateItem(state, action.itemId, (item) => ({
        ...item,
        displayName,
        nameWasTruncated: characters.length > MAX_MEAL_NAME_LENGTH,
        wasManuallyAdjusted:
          item.wasManuallyAdjusted || displayName !== item.displayName
      }))
    }
    case 'item-deleted':
      return {
        ...state,
        items: state.items.filter((item) => item.localId !== action.itemId)
      }
    case 'item-added':
      return {
        items: [
          ...state.items,
          createAddedItem(`meal-item-${state.nextItemNumber}`)
        ],
        nextItemNumber: state.nextItemNumber + 1
      }
    case 'cooking-method-toggled':
      return updateItem(state, action.itemId, (item) => {
        const isSelected = item.cookingMethods.includes(action.value)

        if (isSelected && item.cookingMethods.length === 1) return item

        const cookingMethods = isSelected
          ? item.cookingMethods.filter((method) => method !== action.value)
          : item.cookingMethods.length === 1 &&
              item.cookingMethods[0] === 'OTHER' &&
              item.otherCookingMethods[0] === '待补充做法'
            ? [action.value]
            : [...item.cookingMethods, action.value]
        const hasOther = cookingMethods.includes('OTHER')

        return {
          ...item,
          cookingMethods,
          otherCookingMethods: hasOther
            ? item.otherCookingMethods.length > 0
              ? item.otherCookingMethods
              : ['待补充做法']
            : [],
          wasManuallyAdjusted: true
        }
      })
    case 'other-cooking-changed':
      return updateItem(state, action.itemId, (item) => ({
        ...item,
        otherCookingMethods: [action.value],
        wasManuallyAdjusted: true
      }))
    case 'portion-changed':
      return updateItem(state, action.itemId, (item) => ({
        ...item,
        portionLevel: action.value,
        wasManuallyAdjusted: true
      }))
  }
}

export function canConfirmMeal(state: MealConfirmState): boolean {
  return state.items.some((item) => item.displayName.trim().length > 0)
}

export function collectMealUncertainties(state: MealConfirmState): string[] {
  return [...
    new Set(
      state.items.flatMap((item) =>
        item.displayName.trim() ? item.uncertainties : []
      )
    )
  ]
}

function toDraftItem(item: MealConfirmItem): MealFlowParsedItem {
  const otherCookingMethods = item.cookingMethods.includes('OTHER')
    ? item.otherCookingMethods.map((value) => value.trim()).filter(Boolean)
    : []

  return {
    displayName: item.displayName.trim(),
    ingredients: [...item.ingredients],
    otherIngredients: [...item.otherIngredients],
    cookingMethods: [...item.cookingMethods],
    otherCookingMethods:
      item.cookingMethods.includes('OTHER') && otherCookingMethods.length === 0
        ? ['待补充做法']
        : otherCookingMethods,
    portionLevel: item.portionLevel,
    confidence: item.confidence,
    uncertainties: [...item.uncertainties],
    wasManuallyAdjusted: item.wasManuallyAdjusted
  }
}

export function buildConfirmedParsedMeal(
  state: MealConfirmState
): MealFlowParsedMeal | null {
  const items = state.items
    .filter((item) => item.displayName.trim().length > 0)
    .map(toDraftItem)

  return items.length > 0 ? { items } : null
}
