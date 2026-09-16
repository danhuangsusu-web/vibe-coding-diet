import { Text, View } from '@tarojs/components'
import Taro from '@tarojs/taro'

import {
  AppPage,
  PageHeader,
  PrimaryButton,
  SurfaceCard
} from '../../components/ui'
import { ROUTES } from '../../navigation/routes'

import './index.scss'

export default function HistoryPage() {
  const goBack = () => {
    void Taro.navigateBack()
  }

  const returnHome = () => {
    void Taro.reLaunch({ url: ROUTES.home })
  }

  return (
    <AppPage>
      <PageHeader onBack={goBack} title='历史与设置' />

      <SurfaceCard className='flow-card'>
        <Text className='flow-card__eyebrow'>餐食记录</Text>
        <Text className='flow-card__title'>暂时没有餐食记录</Text>
        <Text className='flow-card__body'>当前没有已保存的餐食记录。</Text>
      </SurfaceCard>

      <View className='flow-actions'>
        <PrimaryButton onClick={returnHome}>返回首页</PrimaryButton>
      </View>
    </AppPage>
  )
}
