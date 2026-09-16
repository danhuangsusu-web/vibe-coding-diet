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

export default function MealInputPage() {
  const resetDraft = useSetAtom(resetMealFlowDraftAtom)

  const goBack = () => {
    void Taro.navigateBack()
  }

  const continueToConfirmation = () => {
    void Taro.navigateTo({ url: ROUTES.mealConfirm })
  }

  const cancel = () => {
    resetDraft()
    void Taro.reLaunch({ url: ROUTES.home })
  }

  return (
    <AppPage hasBottomAction>
      <PageHeader onBack={goBack} title='记录一餐' />

      <SurfaceCard className='flow-card'>
        <Text className='flow-card__eyebrow'>餐食输入</Text>
        <Text className='flow-card__title'>尚未添加餐食</Text>
        <Text className='flow-card__body'>本次记录还没有餐食内容。</Text>
      </SurfaceCard>

      <BottomActionBar hint='本次餐食尚未保存'>
        <View className='flow-bottom-actions'>
          <PrimaryButton onClick={continueToConfirmation}>继续确认</PrimaryButton>
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
