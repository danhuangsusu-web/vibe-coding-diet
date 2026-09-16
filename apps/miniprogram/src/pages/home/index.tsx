import { Button, Text, View } from '@tarojs/components'
import Taro, { useDidShow } from '@tarojs/taro'
import { useCallback, useRef, useState } from 'react'

import {
  AppPage,
  PageHeader,
  PrimaryButton,
  StatusBadge,
  SurfaceCard
} from '../../components/ui'
import { ROUTES } from '../../navigation/routes'
import { getMealRecords, MealApiError } from '../../services/meal-api'
import {
  buildTodayRecordSummary,
  formatShanghaiTime,
  recordDisplayName,
  recordRatingPresentation,
  type TodayRecordSummary
} from './home-records'

import './index.scss'

type HomeRecordsState =
  | { phase: 'loading' }
  | { phase: 'loaded'; summary: TodayRecordSummary | null }
  | { phase: 'error'; message: string }

export default function HomePage() {
  const [recordsState, setRecordsState] = useState<HomeRecordsState>({
    phase: 'loading'
  })
  const requestVersion = useRef(0)

  const refreshRecords = useCallback(async () => {
    const version = requestVersion.current + 1
    requestVersion.current = version
    setRecordsState({ phase: 'loading' })

    try {
      const response = await getMealRecords()
      if (requestVersion.current !== version) return

      setRecordsState({
        phase: 'loaded',
        summary: buildTodayRecordSummary(response)
      })
    } catch (error) {
      if (requestVersion.current !== version) return

      setRecordsState({
        phase: 'error',
        message:
          error instanceof MealApiError
            ? error.message
            : '暂时无法读取最新记录，请稍后重试。'
      })
    }
  }, [])

  useDidShow(() => {
    void refreshRecords()
  })

  const openMealInput = () => {
    void Taro.navigateTo({ url: ROUTES.mealInput })
  }

  const openHistory = () => {
    void Taro.navigateTo({ url: ROUTES.history })
  }

  const openSavedRecord = (recordId: string) => {
    void Taro.navigateTo({
      url: `${ROUTES.mealResult}?recordId=${encodeURIComponent(recordId)}`
    })
  }

  const summary = recordsState.phase === 'loaded' ? recordsState.summary : null

  return (
    <AppPage>
      <PageHeader title='今日饮食' subtitle='小苏 · 每日建议 1400–1600 千卡' />

      {recordsState.phase === 'loading' ? (
        <SurfaceCard className='flow-card' emphasis='soft'>
          <Text className='flow-card__eyebrow'>今天</Text>
          <Text className='flow-card__title'>正在刷新记录</Text>
          <Text className='flow-card__body'>正在读取刚刚保存的餐食。</Text>
        </SurfaceCard>
      ) : null}

      {recordsState.phase === 'error' ? (
        <SurfaceCard className='flow-card home-record-error' emphasis='warning'>
          <Text className='flow-card__eyebrow'>刷新失败</Text>
          <Text className='flow-card__title'>记录已保存，首页暂时未刷新</Text>
          <Text className='flow-card__body'>{recordsState.message}</Text>
          <Button
            className='home-record-refresh'
            hoverClass='home-record-refresh--active'
            onClick={() => void refreshRecords()}
          >
            重新加载
          </Button>
        </SurfaceCard>
      ) : null}

      {recordsState.phase === 'loaded' && !summary ? (
        <SurfaceCard className='flow-card'>
          <Text className='flow-card__eyebrow'>今天</Text>
          <Text className='flow-card__title'>还没有新记录</Text>
          <Text className='flow-card__body'>选择一种方式开始记录本餐。</Text>
        </SurfaceCard>
      ) : null}

      {summary ? (
        <>
          <SurfaceCard className='flow-card home-record-summary'>
            <Text className='flow-card__eyebrow'>今天</Text>
            <Text className='flow-card__title'>已保存 {summary.count} 条记录</Text>
            <Text className='flow-card__body'>
              今日累计约 {summary.calorieRange.min}–{summary.calorieRange.max} 千卡
            </Text>
          </SurfaceCard>

          <View className='home-record-list__heading'>
            <Text className='home-record-list__title'>今天的记录</Text>
            <Text className='home-record-list__hint'>点击查看详情</Text>
          </View>
          <View className='home-record-list'>
            {summary.records.map((record) => {
              const presentation = recordRatingPresentation(
                record.assessment.rating
              )
              const displayName = recordDisplayName(record)

              return (
                <Button
                  ariaLabel={`查看${displayName}详情`}
                  className='home-record-item'
                  hoverClass='home-record-item--active'
                  key={record.id}
                  onClick={() => openSavedRecord(record.id)}
                >
                  <View className='home-record-item__content'>
                    <View className='home-record-item__info'>
                      <Text className='home-record-item__title'>
                        {displayName}
                      </Text>
                      <Text className='home-record-item__meta'>
                        {formatShanghaiTime(record.createdAt)} · 约{' '}
                        {record.assessment.calorieRange.min}–
                        {record.assessment.calorieRange.max} 千卡
                      </Text>
                    </View>
                    <View className='home-record-item__action'>
                      <StatusBadge
                        compact
                        label={presentation.label}
                        tone={presentation.tone}
                      />
                      <Text className='home-record-item__chevron'>›</Text>
                    </View>
                  </View>
                </Button>
              )
            })}
          </View>
        </>
      ) : null}

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
