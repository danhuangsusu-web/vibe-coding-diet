import { Button, Text, View } from '@tarojs/components'
import Taro from '@tarojs/taro'

import {
  AppPage,
  PageHeader,
  PrimaryButton,
  SurfaceCard
} from '../../components/ui'
import { ROUTES } from '../../navigation/routes'

import './index.scss'

export default function HomePage() {
  const openMealInput = () => {
    void Taro.navigateTo({ url: ROUTES.mealInput })
  }

  const openHistory = () => {
    void Taro.navigateTo({ url: ROUTES.history })
  }

  return (
    <AppPage>
      <PageHeader title='今日饮食' subtitle='小苏 · 每日建议 1400–1600 千卡' />

      <SurfaceCard className='flow-card'>
        <Text className='flow-card__eyebrow'>今天</Text>
        <Text className='flow-card__title'>还没有新记录</Text>
        <Text className='flow-card__body'>选择一种方式开始记录本餐。</Text>
      </SurfaceCard>

      <View className='flow-actions'>
        <PrimaryButton onClick={openMealInput}>记录一餐</PrimaryButton>
        <Button
          ariaLabel='打开历史与设置'
          className='flow-secondary-button'
          hoverClass='flow-secondary-button--active'
          onClick={openHistory}
        >
          历史与设置
        </Button>
      </View>
    </AppPage>
  )
}
