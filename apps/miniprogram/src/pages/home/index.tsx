import type { DemoProfile } from '@food-sense/shared'
import { Button, Text, View } from '@tarojs/components'
import Taro, { useDidShow } from '@tarojs/taro'
import { useCallback, useRef, useState } from 'react'

import { AppPage, PageHeader, StatusBadge } from '../../components/ui'
import { ROUTES } from '../../navigation/routes'
import {
  getDemoProfile,
  getMealRecords,
  MealApiError
} from '../../services/meal-api'
import {
  buildHomeDashboard,
  formatShanghaiDate,
  formatShanghaiTime,
  greetingForServerTime,
  goalDirectionLabel,
  recordDisplayName,
  recordRatingPresentation,
  type HomeDashboard
} from './home-records'

import './index.scss'

interface LoadedHomeData {
  profile: DemoProfile
  dashboard: HomeDashboard
  dateLabel: string
  serverTime: string
}

type HomeState =
  | { phase: 'loading' }
  | { phase: 'loaded'; data: LoadedHomeData }
  | { phase: 'error'; message: string }

function rangeLabel(range: { min: number; max: number }): string {
  return `${range.min}–${range.max}`
}

function progressTone(dashboard: HomeDashboard): 'success' | 'warning' | 'danger' {
  if (dashboard.isOverRange) return 'danger'
  if (dashboard.progressPercent >= 80) return 'warning'
  return 'success'
}

function progressMessage(dashboard: HomeDashboard): string {
  if (dashboard.recordCount === 0) return '从第一餐开始吧'
  if (dashboard.isOverRange) return '今日已超出建议范围'
  if (dashboard.progressPercent >= 80) return '接近建议上限'
  return '今日还有可安排的空间'
}

export default function HomePage() {
  const [state, setState] = useState<HomeState>({ phase: 'loading' })
  const requestVersion = useRef(0)

  const refreshHome = useCallback(async () => {
    const version = requestVersion.current + 1
    requestVersion.current = version
    setState({ phase: 'loading' })

    try {
      const [profile, records] = await Promise.all([
        getDemoProfile(),
        getMealRecords()
      ])
      if (requestVersion.current !== version) return

      setState({
        phase: 'loaded',
        data: {
          profile,
          dashboard: buildHomeDashboard(profile, records),
          dateLabel: formatShanghaiDate(records.todayDate),
          serverTime: records.serverTime
        }
      })
    } catch (error) {
      if (requestVersion.current !== version) return

      setState({
        phase: 'error',
        message:
          error instanceof MealApiError
            ? error.message
            : '暂时无法读取今日数据，请稍后重试。'
      })
    }
  }, [])

  useDidShow(() => {
    void refreshHome()
  })

  const openMealInput = (mode: 'image' | 'text') => {
    void Taro.navigateTo({ url: `${ROUTES.mealInput}?mode=${mode}` })
  }

  const openHistory = () => {
    void Taro.navigateTo({ url: ROUTES.history })
  }

  const openSavedRecord = (recordId: string) => {
    void Taro.navigateTo({
      url: `${ROUTES.mealResult}?recordId=${encodeURIComponent(recordId)}`
    })
  }

  return (
    <AppPage className='home-page'>
      <PageHeader title='今日饮食' />

      {state.phase === 'loading' ? (
        <View className='home-state' ariaLabel='正在加载首页数据'>
          <View className='home-state__loader' />
          <Text className='home-state__title'>正在准备今日概览</Text>
          <Text className='home-state__body'>同步资料、当天汇总和最近记录…</Text>
        </View>
      ) : null}

      {state.phase === 'error' ? (
        <View className='home-state home-state--error'>
          <View className='home-state__mark'>!</View>
          <Text className='home-state__title'>今日概览暂时无法刷新</Text>
          <Text className='home-state__body'>{state.message}</Text>
          <Text className='home-state__body'>为避免误导，这里不会用零值代替未读到的数据。</Text>
          <Button
            className='home-state__retry'
            hoverClass='home-pressable--active'
            onClick={() => void refreshHome()}
          >
            重新加载
          </Button>
        </View>
      ) : null}

      {state.phase === 'loaded' ? (
        <HomeContent
          data={state.data}
          onHistory={openHistory}
          onMealInput={openMealInput}
          onRecord={openSavedRecord}
        />
      ) : null}
    </AppPage>
  )
}

interface HomeContentProps {
  data: LoadedHomeData
  onHistory: () => void
  onMealInput: (mode: 'image' | 'text') => void
  onRecord: (recordId: string) => void
}

function HomeContent({
  data: { profile, dashboard, dateLabel, serverTime },
  onHistory,
  onMealInput,
  onRecord
}: HomeContentProps) {
  const tone = progressTone(dashboard)
  const progressColor = `var(--food-${tone}-accent)`
  const progressBackground = `conic-gradient(${progressColor} 0 ${dashboard.progressPercent}%, var(--food-bg-oat) ${dashboard.progressPercent}% 100%)`

  return (
    <>
      <View className='home-user'>
        <View className='home-user__copy'>
          <Text className='home-user__hello'>
            {greetingForServerTime(serverTime)}，今天也请好好吃饭
          </Text>
          <View className='home-user__identity'>
            <Text className='home-user__name'>{profile.name}</Text>
            <Text className='home-user__goal'>
              {goalDirectionLabel(profile.goalDirection)}
            </Text>
          </View>
        </View>
        <View ariaLabel='演示用户头像' className='home-avatar'>
          <View className='home-avatar__head' />
          <View className='home-avatar__body' />
        </View>
      </View>

      <View className='home-summary'>
        <View className='home-summary__topline'>
          <Text className='home-summary__date'>{dateLabel}</Text>
          <Button
            ariaLabel='打开历史与设置'
            className='home-summary__settings'
            hoverClass='home-pressable--active'
            onClick={onHistory}
          >
            历史与设置 ›
          </Button>
        </View>

        <Text className='home-summary__primary-label'>今日已记录（估算区间）</Text>
        <View className='home-summary__primary'>
          <Text className='home-summary__primary-number'>
            {rangeLabel(dashboard.consumedRange)}
          </Text>
          <Text className='home-summary__primary-unit'>kcal</Text>
        </View>

        <View className='home-summary__ranges'>
          <View className='home-summary__range'>
            <Text className='home-summary__range-label'>每日建议</Text>
            <Text className='home-summary__range-value'>
              {rangeLabel({
                min: profile.dailyCalorieMin,
                max: profile.dailyCalorieMax
              })}{' '}
              kcal
            </Text>
          </View>
          <View className='home-summary__range'>
            <Text className='home-summary__range-label'>今日剩余建议</Text>
            {dashboard.isOverRange ? (
              <Text className='home-summary__range-value home-summary__range-value--over'>
                今日已超出建议范围
              </Text>
            ) : (
              <Text className='home-summary__range-value'>
                {rangeLabel(dashboard.remainingRange)} kcal
              </Text>
            )}
          </View>
        </View>

        <View className='home-summary__progress'>
          <View
            ariaLabel={`今日进度约 ${dashboard.progressPercent}%`}
            className='home-progress-ring'
            style={{ background: progressBackground }}
          >
            <View className='home-progress-ring__inner'>
              <Text className='home-progress-ring__about'>约</Text>
              <Text className='home-progress-ring__value'>
                {dashboard.progressPercent}%
              </Text>
            </View>
          </View>
          <View className='home-summary__progress-copy'>
            <View className={`home-progress-status home-progress-status--${tone}`}>
              <View className='home-progress-status__dot' />
              <Text>{progressMessage(dashboard)}</Text>
            </View>
            <Text className='home-summary__hint'>
              {dashboard.recordCount === 0
                ? '拍照或写一句话，就能记录第一餐'
                : `已记录 ${dashboard.recordCount} 次 · 区间来自已保存的估算`}
            </Text>
          </View>
        </View>
      </View>

      <View className='home-entry-row'>
        <Button
          ariaLabel='用拍照或相册记录一餐'
          className='home-entry home-entry--photo'
          hoverClass='home-pressable--active'
          onClick={() => onMealInput('image')}
        >
          <View className='home-entry__icon'>拍</View>
          <Text className='home-entry__title'>拍照 / 相册</Text>
          <Text className='home-entry__subtitle'>识别菜单或餐食照片</Text>
        </Button>
        <Button
          ariaLabel='用文字描述记录一餐'
          className='home-entry home-entry--text'
          hoverClass='home-pressable--active'
          onClick={() => onMealInput('text')}
        >
          <View className='home-entry__icon'>写</View>
          <Text className='home-entry__title'>文字输入</Text>
          <Text className='home-entry__subtitle'>一句话描述这顿饭</Text>
        </Button>
      </View>

      {dashboard.recentRecords.length > 0 ? (
        <View className='home-recent'>
          <View className='home-recent__heading'>
            <Text className='home-recent__title'>今天吃了</Text>
            <Button
              ariaLabel='查看全部历史记录'
              className='home-recent__all'
              hoverClass='home-pressable--active'
              onClick={onHistory}
            >
              全部记录 ›
            </Button>
          </View>
          <View className='home-recent__list'>
            {dashboard.recentRecords.map((record, index) => {
              const presentation = recordRatingPresentation(
                record.assessment.rating
              )
              const displayName = recordDisplayName(record)

              return (
                <Button
                  ariaLabel={`查看${displayName}详情`}
                  className='home-record'
                  hoverClass='home-pressable--active'
                  key={record.id}
                  onClick={() => onRecord(record.id)}
                >
                  <View
                    className={`home-record__thumb home-record__thumb--${
                      index % 2 === 0 ? 'bowl' : 'cup'
                    }`}
                  />
                  <View className='home-record__info'>
                    <Text className='home-record__name'>{displayName}</Text>
                    <Text className='home-record__meta'>
                      {formatShanghaiTime(record.createdAt)} · 约{' '}
                      {rangeLabel(record.assessment.calorieRange)} kcal
                    </Text>
                  </View>
                  <StatusBadge
                    compact
                    label={presentation.label}
                    tone={presentation.tone}
                  />
                </Button>
              )
            })}
          </View>
        </View>
      ) : (
        <View className='home-empty'>
          <View className='home-empty__art'>
            <View className='home-empty__bowl' />
          </View>
          <Text className='home-empty__title'>今天还没有记录</Text>
          <Text className='home-empty__body'>
            拍下第一顿饭，或写一句话告诉我。{`\n`}估算出区间后，再决定要不要保存。
          </Text>
        </View>
      )}
    </>
  )
}
