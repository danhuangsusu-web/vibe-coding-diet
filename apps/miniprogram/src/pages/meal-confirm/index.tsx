import { Button, Text, View } from '@tarojs/components'
import Taro from '@tarojs/taro'
import { useSetAtom } from 'jotai'

import {
  AppPage,
  BottomActionBar,
  PageHeader,
  PrimaryButton,
  SurfaceCard
} from '../../components/ui'
import { ROUTES } from '../../navigation/routes'
import { resetMealFlowDraftAtom } from '../../state/meal-flow'

import './index.scss'

export default function MealConfirmPage() {
  const resetDraft = useSetAtom(resetMealFlowDraftAtom)

  const goBack = () => {
    void Taro.navigateBack()
  }

  const continueToResult = () => {
    void Taro.navigateTo({ url: ROUTES.mealResult })
  }

  const cancel = () => {
    resetDraft()
    void Taro.reLaunch({ url: ROUTES.home })
  }

  return (
    <AppPage hasBottomAction>
      <PageHeader onBack={goBack} title='确认餐食' />

      <SurfaceCard className='flow-card' emphasis='soft'>
        <Text className='flow-card__eyebrow'>餐食内容</Text>
        <Text className='flow-card__title'>尚无可确认的餐食</Text>
        <Text className='flow-card__body'>本次记录还没有可确认的菜品。</Text>
      </SurfaceCard>

      <BottomActionBar hint='餐食尚未确认'>
        <View className='flow-bottom-actions'>
          <PrimaryButton onClick={continueToResult}>查看评估</PrimaryButton>
          <Button
            ariaLabel='取消本次记录'
            className='flow-secondary-button'
            hoverClass='flow-secondary-button--active'
            onClick={cancel}
          >
            取消记录
          </Button>
        </View>
      </BottomActionBar>
    </AppPage>
  )
}
