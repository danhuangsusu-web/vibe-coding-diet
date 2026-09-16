import { describe, expect, it } from 'vitest'

import {
  classifyMediaSelectionError,
  getCompressedDimensions,
  isSupportedMealImage
} from './meal-image-policy'

describe('meal image constraints', () => {
  it('keeps small images stable and scales the longest edge to 1280px', () => {
    expect(getCompressedDimensions(800, 600)).toEqual({
      width: 800,
      height: 600
    })
    expect(getCompressedDimensions(3000, 2000)).toEqual({
      width: 1280,
      height: 853
    })
    expect(getCompressedDimensions(1000, 2500)).toEqual({
      width: 512,
      height: 1280
    })
  })

  it('accepts JPG and PNG but rejects HEIC and unknown image formats', () => {
    expect(isSupportedMealImage('jpeg', 'wxfile://meal.jpg')).toBe(true)
    expect(isSupportedMealImage('png', 'wxfile://meal.png')).toBe(true)
    expect(isSupportedMealImage('heic', 'wxfile://meal.heic')).toBe(false)
    expect(isSupportedMealImage('', 'wxfile://meal.webp')).toBe(false)
  })

  it('distinguishes cancellation, permission denial and other failures', () => {
    expect(classifyMediaSelectionError({ errMsg: 'chooseMedia:fail cancel' })).toBe(
      'cancelled'
    )
    expect(
      classifyMediaSelectionError({ errMsg: 'chooseMedia:fail auth deny' })
    ).toBe('permission-denied')
    expect(classifyMediaSelectionError(new Error('file read failed'))).toBe(
      'failed'
    )
  })
})
