import { Text } from '@tarojs/components'
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

export default function MealResultPage() {
  const resetDraft = useSetAtom(resetMealFlowDraftAtom)

  const goBack = () => {
    void Taro.navigateBack()
  }

  const finish = () => {
    resetDraft()
    void Taro.reLaunch({ url: ROUTES.home })
  }

  return (
    <AppPage hasBottomAction>
      <PageHeader onBack={goBack} title='评估结果' />

      <SurfaceCard className='flow-card' emphasis='warning'>
        <Text className='flow-card__eyebrow'>本次餐食</Text>
        <Text className='flow-card__title'>尚无评估结果</Text>
        <Text className='flow-card__body'>本次记录还没有生成评估结果。</Text>
      </SurfaceCard>

      <BottomActionBar hint='本次结果尚未保存'>
        <PrimaryButton onClick={finish}>完成</PrimaryButton>
      </BottomActionBar>
    </AppPage>
  )
}
