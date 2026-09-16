export const ROUTES = {
  home: '/pages/home/index',
  mealInput: '/pages/meal-input/index',
  mealConfirm: '/pages/meal-confirm/index',
  mealResult: '/pages/meal-result/index',
  history: '/pages/history/index'
} as const

export type AppRoute = (typeof ROUTES)[keyof typeof ROUTES]
