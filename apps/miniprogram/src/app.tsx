import type { PropsWithChildren } from 'react'
import { Provider } from 'jotai'

import { mealFlowStore } from './state/meal-flow'

import './app.scss'

export default function App({ children }: PropsWithChildren) {
  return <Provider store={mealFlowStore}>{children}</Provider>
}
