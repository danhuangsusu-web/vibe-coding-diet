import { Text, View } from '@tarojs/components'
import { useState } from 'react'

import {
  AppPage,
  BottomActionBar,
  PageHeader,
  PrimaryButton,
  SegmentedControl,
  StatusBadge,
  SurfaceCard
} from '../../components/ui'

import './index.scss'

const GOAL_OPTIONS = [
  { label: '减脂', value: 'fat-loss' },
  { label: '维持', value: 'maintain' },
  { label: '增肌', value: 'muscle-gain' }
] as const

type GoalValue = (typeof GOAL_OPTIONS)[number]['value']

export default function HomePage() {
  const [goal, setGoal] = useState<GoalValue>('fat-loss')

  return (
    <AppPage hasBottomAction>
      <PageHeader title='今日饮食' subtitle='9 月 16 日 · 星期三' />

      <SurfaceCard className='foundation-summary'>
        <View className='foundation-summary__heading'>
          <View>
            <Text className='foundation-kicker'>今日已记录</Text>
            <View className='foundation-range'>
              <Text className='foundation-range__value'>840–1450</Text>
              <Text className='foundation-range__unit'>千卡</Text>
            </View>
          </View>
          <StatusBadge compact label='黄灯' tone='warning' />
        </View>
        <Text className='foundation-supporting'>每日建议 1400–1600 千卡</Text>
      </SurfaceCard>

      <View className='foundation-section'>
        <Text className='foundation-section__title'>目标方向</Text>
        <SegmentedControl
          ariaLabel='目标方向'
          onChange={setGoal}
          options={GOAL_OPTIONS}
          value={goal}
        />
      </View>

      <View className='foundation-section'>
        <Text className='foundation-section__title'>餐食状态</Text>
        <View className='foundation-statuses'>
          <StatusBadge compact label='绿灯' tone='success' />
          <StatusBadge compact label='黄灯' tone='warning' />
          <StatusBadge compact label='红灯' tone='danger' />
        </View>
      </View>

      <SurfaceCard emphasis='soft'>
        <Text className='foundation-note__title'>先确认，再计算保存</Text>
        <Text className='foundation-note__body'>热量区间来自估算，评价的是这顿选择，不是你。</Text>
      </SurfaceCard>

      <BottomActionBar hint='确认餐食内容后，再计算并保存记录'>
        <PrimaryButton disabled>记录一餐</PrimaryButton>
      </BottomActionBar>
    </AppPage>
  )
}
