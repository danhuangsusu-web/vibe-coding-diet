import { describe, expect, it } from 'vitest'

import {
  buildMealParseInput,
  canSubmitMealInput,
  createInitialMealInputState,
  mealInputReducer,
  shouldConfirmMealInputModeChange
} from './meal-input-state'

describe('meal input state', () => {
  it('can start from the image entry selected on the home page', () => {
    expect(createInitialMealInputState('IMAGE').activeMode).toBe('IMAGE')
  })

  it('keeps empty and whitespace-only text disabled', () => {
    const initial = createInitialMealInputState()
    const whitespace = mealInputReducer(initial, {
      type: 'text-changed',
      text: '   '
    })

    expect(canSubmitMealInput(initial)).toBe(false)
    expect(canSubmitMealInput(whitespace)).toBe(false)
  })

  it('uses the active valid input and disables duplicate submission', () => {
    const withText = mealInputReducer(createInitialMealInputState(), {
      type: 'text-changed',
      text: '  干煸芸豆 + 溜肉段 + 米饭  '
    })

    expect(canSubmitMealInput(withText)).toBe(true)
    expect(buildMealParseInput(withText)).toEqual({
      sourceType: 'TEXT',
      sourceText: '干煸芸豆 + 溜肉段 + 米饭'
    })

    const analyzing = mealInputReducer(withText, { type: 'analysis-started' })
    expect(canSubmitMealInput(analyzing)).toBe(false)
  })

  it('clears text when the user confirms switching to one local image', () => {
    const withText = mealInputReducer(createInitialMealInputState(), {
      type: 'text-changed',
      text: '白灼时蔬、水煮鸡胸和小份米饭'
    })
    expect(shouldConfirmMealInputModeChange(withText, 'IMAGE')).toBe(true)

    const imageMode = mealInputReducer(withText, {
      type: 'mode-changed',
      mode: 'IMAGE'
    })
    const withImage = mealInputReducer(imageMode, {
      type: 'image-selected',
      image: {
        localPath: 'wxfile://compressed-meal.jpg',
        size: 512_000,
        source: 'album'
      }
    })

    expect(withImage.text).toBe('')
    expect(withImage.activeMode).toBe('IMAGE')
    expect(canSubmitMealInput(withImage)).toBe(true)
    expect(buildMealParseInput(withImage)).toMatchObject({
      sourceType: 'IMAGE',
      localPath: 'wxfile://compressed-meal.jpg'
    })
  })

  it('removes the selected image when switching to text', () => {
    const withImage = mealInputReducer(createInitialMealInputState('IMAGE'), {
      type: 'image-selected',
      image: {
        localPath: 'wxfile://compressed-meal.jpg',
        size: 512_000,
        source: 'album'
      }
    })
    const textMode = mealInputReducer(withImage, {
      type: 'mode-changed',
      mode: 'TEXT'
    })

    expect(textMode).toMatchObject({
      activeMode: 'TEXT',
      text: '',
      image: null,
      phase: 'idle'
    })
    expect(shouldConfirmMealInputModeChange(textMode, 'IMAGE')).toBe(false)
  })

  it('refuses to submit an impossible mixed-input state', () => {
    const mixedState = {
      ...createInitialMealInputState('IMAGE'),
      text: '米饭',
      image: {
        localPath: 'wxfile://compressed-meal.jpg',
        size: 512_000,
        source: 'album' as const
      }
    }

    expect(buildMealParseInput(mixedState)).toBeNull()
    expect(canSubmitMealInput(mixedState)).toBe(false)
  })

  it('preserves text through permission and failure recovery', () => {
    const withText = mealInputReducer(createInitialMealInputState(), {
      type: 'text-changed',
      text: '干煸芸豆、溜肉段和米饭'
    })
    const denied = mealInputReducer(withText, { type: 'permission-denied' })
    const recovered = mealInputReducer(denied, {
      type: 'return-to-text'
    })
    const failed = mealInputReducer(recovered, {
      type: 'analysis-failed',
      message: '图片处理失败'
    })

    expect(recovered.text).toBe(withText.text)
    expect(recovered.activeMode).toBe('TEXT')
    expect(failed.text).toBe(withText.text)
    expect(canSubmitMealInput(failed)).toBe(false)
    expect(buildMealParseInput(failed)).toEqual({
      sourceType: 'TEXT',
      sourceText: '干煸芸豆、溜肉段和米饭'
    })
  })
})
