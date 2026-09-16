import type { ParsedMeal } from '@food-sense/shared'
import { describe, expect, it } from 'vitest'

import {
  buildConfirmedParsedMeal,
  canConfirmMeal,
  confidencePresentation,
  createMealConfirmState,
  mealConfirmReducer
} from './meal-confirm-state'

const parsedMeal: ParsedMeal = {
  items: [
    {
      displayName: '较确定菜品',
      ingredients: ['RICE'],
      otherIngredients: [],
      cookingMethods: ['STEAMED'],
      otherCookingMethods: [],
      portionLevel: 'regular',
      confidence: 0.8,
      uncertainties: []
    },
    {
      displayName: '不确定菜品',
      ingredients: ['PORK'],
      otherIngredients: [],
      cookingMethods: ['DEEP_FRIED'],
      otherCookingMethods: [],
      portionLevel: 'regular',
      confidence: 0.49,
      uncertainties: ['实际做法无法确认']
    },
    {
      displayName: '可能菜品',
      ingredients: ['LEAFY_VEGETABLE'],
      otherIngredients: [],
      cookingMethods: ['STIR_FRIED'],
      otherCookingMethods: [],
      portionLevel: 'small',
      confidence: 0.5,
      uncertainties: []
    }
  ]
}

describe('meal confirmation state', () => {
  it('classifies all confidence tiers and places lower confidence first', () => {
    expect(confidencePresentation(0.8)).toMatchObject({
      label: '较确定',
      tone: 'high'
    })
    expect(confidencePresentation(0.5)).toMatchObject({
      label: '可能',
      tone: 'medium'
    })
    expect(confidencePresentation(0.49)).toMatchObject({
      label: '不确定',
      tone: 'low'
    })

    expect(createMealConfirmState(parsedMeal).items.map((item) => item.displayName)).toEqual(
      ['不确定菜品', '可能菜品', '较确定菜品']
    )
  })

  it('marks edits as manual and truncates overlong names with a visible flag', () => {
    const initial = createMealConfirmState(parsedMeal)
    const itemId = initial.items[0].localId
    const renamed = mealConfirmReducer(initial, {
      type: 'name-changed',
      itemId,
      value: '一二三四五六七八九十一二三四五六七八九十一二三四五六七八九十超出'
    })

    expect(Array.from(renamed.items[0].displayName)).toHaveLength(30)
    expect(renamed.items[0].nameWasTruncated).toBe(true)
    expect(renamed.items[0].wasManuallyAdjusted).toBe(true)

    const portionChanged = mealConfirmReducer(renamed, {
      type: 'portion-changed',
      itemId,
      value: 'large'
    })
    expect(portionChanged.items[0].portionLevel).toBe('large')
    expect(portionChanged.items[0].wasManuallyAdjusted).toBe(true)
  })

  it('supports controlled cooking methods without allowing an empty selection', () => {
    const initial = createMealConfirmState(parsedMeal)
    const itemId = initial.items[0].localId
    const onlyMethod = initial.items[0].cookingMethods[0]
    const unchanged = mealConfirmReducer(initial, {
      type: 'cooking-method-toggled',
      itemId,
      value: onlyMethod
    })
    expect(unchanged.items[0].cookingMethods).toEqual([onlyMethod])

    const withOther = mealConfirmReducer(initial, {
      type: 'cooking-method-toggled',
      itemId,
      value: 'OTHER'
    })
    expect(withOther.items[0].cookingMethods).toContain('OTHER')
    expect(withOther.items[0].otherCookingMethods).toEqual(['待补充做法'])
  })

  it('adds and deletes dishes while requiring at least one nonblank name', () => {
    const initial = createMealConfirmState(null)
    expect(canConfirmMeal(initial)).toBe(false)

    const added = mealConfirmReducer(initial, { type: 'item-added' })
    expect(added.items).toHaveLength(1)
    expect(canConfirmMeal(added)).toBe(false)

    const named = mealConfirmReducer(added, {
      type: 'name-changed',
      itemId: added.items[0].localId,
      value: '  新增菜品  '
    })
    expect(canConfirmMeal(named)).toBe(true)

    const deleted = mealConfirmReducer(named, {
      type: 'item-deleted',
      itemId: named.items[0].localId
    })
    expect(deleted.items).toEqual([])
    expect(canConfirmMeal(deleted)).toBe(false)
  })

  it('writes trimmed edits and manual flags into the downstream parsed draft', () => {
    const initial = createMealConfirmState(parsedMeal)
    const edited = mealConfirmReducer(initial, {
      type: 'name-changed',
      itemId: initial.items[1].localId,
      value: '  修改后的菜名  '
    })
    const confirmed = buildConfirmedParsedMeal(edited)

    expect(confirmed?.items).toHaveLength(3)
    expect(confirmed?.items[1]).toMatchObject({
      displayName: '修改后的菜名',
      wasManuallyAdjusted: true
    })
    expect(confirmed?.items[0]).toMatchObject({
      displayName: '不确定菜品',
      wasManuallyAdjusted: false
    })
    expect(confirmed?.items[0]).not.toHaveProperty('localId')
  })
})
