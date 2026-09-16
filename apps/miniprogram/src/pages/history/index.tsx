import type {
  DemoProfile,
  GoalDirection,
  MealRecord,
  MealRecordsResponse
} from '@food-sense/shared'
import { Button, Text, View } from '@tarojs/components'
import Taro, { useDidShow } from '@tarojs/taro'
import { useCallback, useRef, useState } from 'react'

import {
  AppPage,
  PageHeader,
  PrimaryButton,
  SegmentedControl,
  StatusBadge
} from '../../components/ui'
import { ROUTES } from '../../navigation/routes'
import {
  deleteMealRecord,
  getDemoProfile,
  getMealRecords,
  MealApiError,
  updateDemoProfile
} from '../../services/meal-api'
import {
  formatShanghaiTime,
  recordDisplayName,
  recordRatingPresentation
} from '../home/home-records'
import {
  adjustCalorieValue,
  buildProfileUpdateRequest,
  createSettingsDraft,
  formatHistoryDate,
  isSettingsDirty,
  removeHistoryRecord,
  validateSettingsDraft,
  type HistorySettingsDraft
} from './history-state'

import './index.scss'

interface LoadedHistoryData {
  profile: DemoProfile
  records: MealRecordsResponse
}

type HistoryState =
  | { phase: 'loading' }
  | { phase: 'loaded'; data: LoadedHistoryData }
  | { phase: 'error'; message: string }

const GOAL_OPTIONS = [
  { label: '减脂', value: 'FAT_LOSS' },
  { label: '维持', value: 'MAINTAIN' },
  { label: '增肌', value: 'MUSCLE_GAIN' }
] as const satisfies ReadonlyArray<{
  label: string
  value: GoalDirection
}>

function rangeLabel(range: { min: number; max: number }): string {
  return `${range.min}–${range.max}`
}

function errorMessage(error: unknown, fallback: string): string {
  return error instanceof MealApiError ? error.message : fallback
}

export default function HistoryPage() {
  const [state, setState] = useState<HistoryState>({ phase: 'loading' })
  const [settingsExpanded, setSettingsExpanded] = useState(false)
  const [settingsDraft, setSettingsDraft] =
    useState<HistorySettingsDraft | null>(null)
  const [settingsError, setSettingsError] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [savingSettings, setSavingSettings] = useState(false)
  const requestVersion = useRef(0)

  const refreshHistory = useCallback(async () => {
    const version = requestVersion.current + 1
    requestVersion.current = version
    setState({ phase: 'loading' })

    try {
      const [profile, records] = await Promise.all([
        getDemoProfile(),
        getMealRecords()
      ])
      if (requestVersion.current !== version) return

      setState({ phase: 'loaded', data: { profile, records } })
      setSettingsDraft(createSettingsDraft(profile))
      setSettingsError(null)
    } catch (error) {
      if (requestVersion.current !== version) return

      setState({
        phase: 'error',
        message: errorMessage(error, '暂时无法读取历史记录，请稍后重试。')
      })
    }
  }, [])

  useDidShow(() => {
    void refreshHistory()
  })

  const goBack = () => {
    void Taro.navigateBack()
  }

  const returnHome = () => {
    void Taro.reLaunch({ url: ROUTES.home })
  }

  const openRecord = (recordId: string) => {
    void Taro.navigateTo({
      url: `${ROUTES.mealResult}?recordId=${encodeURIComponent(recordId)}`
    })
  }

  const updateDraft = (draft: HistorySettingsDraft) => {
    setSettingsDraft(draft)
    setSettingsError(validateSettingsDraft(draft))
  }

  const changeCalorie = (
    field: 'dailyCalorieMin' | 'dailyCalorieMax',
    direction: -1 | 1
  ) => {
    if (!settingsDraft) return
    updateDraft({
      ...settingsDraft,
      [field]: adjustCalorieValue(settingsDraft[field], direction)
    })
  }

  const saveSettings = async () => {
    if (state.phase !== 'loaded' || !settingsDraft || savingSettings) return

    const request = buildProfileUpdateRequest(settingsDraft)
    if (!request) {
      setSettingsError(validateSettingsDraft(settingsDraft))
      return
    }

    setSavingSettings(true)
    setSettingsError(null)
    try {
      const profile = await updateDemoProfile(request)
      setState((current) =>
        current.phase === 'loaded'
          ? { ...current, data: { ...current.data, profile } }
          : current
      )
      setSettingsDraft(createSettingsDraft(profile))
      void Taro.showToast({ title: '演示设置已保存', icon: 'success' })
    } catch (error) {
      setSettingsError(errorMessage(error, '设置保存失败，请稍后重试。'))
    } finally {
      setSavingSettings(false)
    }
  }

  const confirmDelete = async (record: MealRecord) => {
    if (deletingId) return

    const displayName = recordDisplayName(record)
    const modal = await Taro.showModal({
      title: '删除这条记录？',
      content: `“${displayName}”删除后无法恢复。`,
      confirmText: '删除',
      confirmColor: '#9C5238',
      cancelText: '取消'
    })
    if (!modal.confirm) return

    setDeletingId(record.id)
    try {
      await deleteMealRecord(record.id)
      setState((current) =>
        current.phase === 'loaded'
          ? {
              ...current,
              data: {
                ...current.data,
                records: removeHistoryRecord(current.data.records, record.id)
              }
            }
          : current
      )
      void Taro.showToast({
        title: '记录已删除，汇总已更新',
        icon: 'none'
      })
    } catch (error) {
      void Taro.showToast({
        title: errorMessage(error, '删除失败，原记录仍然保留。'),
        icon: 'none'
      })
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <AppPage className='history-page'>
      <PageHeader
        onBack={goBack}
        subtitle='最近保存的餐食 · 演示参数'
        title='历史与设置'
      />

      {state.phase === 'loading' ? (
        <View ariaLabel='正在加载历史与设置' className='history-state'>
          <View className='history-state__loader' />
          <Text className='history-state__title'>正在读取餐食记录</Text>
          <Text className='history-state__body'>同步历史汇总与演示设置…</Text>
        </View>
      ) : null}

      {state.phase === 'error' ? (
        <View className='history-state history-state--error'>
          <View className='history-state__mark'>!</View>
          <Text className='history-state__title'>历史记录暂时无法加载</Text>
          <Text className='history-state__body'>{state.message}</Text>
          <Button
            className='history-state__retry'
            hoverClass='history-pressable--active'
            onClick={() => void refreshHistory()}
          >
            重新加载
          </Button>
        </View>
      ) : null}

      {state.phase === 'loaded' && settingsDraft ? (
        <>
          {state.data.records.days.length > 0 ? (
            <View className='history-list'>
              {state.data.records.days.map((day) => (
                <View className='history-day' key={day.date}>
                  <View className='history-day__heading'>
                    <Text className='history-day__date'>
                      {formatHistoryDate(
                        day.date,
                        state.data.records.todayDate
                      )}
                    </Text>
                    <Text className='history-day__summary'>
                      已记录 约{' '}
                      {rangeLabel({
                        min: day.summary.calorieMin,
                        max: day.summary.calorieMax
                      })}{' '}
                      kcal
                    </Text>
                  </View>

                  <View className='history-day__records'>
                    {day.records.map((record, index) => {
                      const displayName = recordDisplayName(record)
                      const presentation = recordRatingPresentation(
                        record.assessment.rating
                      )

                      return (
                        <View
                          ariaLabel={`查看${displayName}详情`}
                          className='history-record'
                          hoverClass='history-pressable--active'
                          key={record.id}
                          onClick={() => openRecord(record.id)}
                        >
                          <View
                            className={`history-record__thumb history-record__thumb--${
                              index % 3 === 0
                                ? 'bowl'
                                : index % 3 === 1
                                  ? 'cup'
                                  : 'noodle'
                            }`}
                          />
                          <View className='history-record__info'>
                            <View className='history-record__title-row'>
                              <Text className='history-record__name'>
                                {displayName}
                              </Text>
                              {record.isDemo ? (
                                <Text className='history-record__demo'>演示</Text>
                              ) : null}
                            </View>
                            <Text className='history-record__meta'>
                              {formatShanghaiTime(record.createdAt)} · 约{' '}
                              {rangeLabel(record.assessment.calorieRange)} kcal
                            </Text>
                          </View>
                          <View className='history-record__actions'>
                            <StatusBadge
                              compact
                              label={presentation.label}
                              tone={presentation.tone}
                            />
                            <Button
                              ariaLabel={`删除${displayName}`}
                              className='history-record__delete'
                              disabled={deletingId !== null}
                              hoverClass='history-pressable--active'
                              loading={deletingId === record.id}
                              onClick={(event) => {
                                event.stopPropagation()
                                void confirmDelete(record)
                              }}
                            >
                              {deletingId === record.id ? '' : '删'}
                            </Button>
                          </View>
                        </View>
                      )
                    })}
                  </View>
                </View>
              ))}
            </View>
          ) : (
            <View className='history-empty'>
              <View className='history-empty__art'>
                <View className='history-empty__bowl' />
              </View>
              <Text className='history-empty__title'>还没有保存过记录</Text>
              <Text className='history-empty__body'>
                保存过的每一餐都会出现在这里。{`\n`}回到首页，记录今天的第一顿吧。
              </Text>
              <Button
                className='history-empty__home'
                hoverClass='history-pressable--active'
                onClick={returnHome}
              >
                返回首页
              </Button>
            </View>
          )}

          <View className='history-settings'>
            <Button
              ariaLabel={`${settingsExpanded ? '收起' : '展开'}演示设置`}
              className='history-settings__header'
              hoverClass='history-pressable--active'
              onClick={() => setSettingsExpanded((expanded) => !expanded)}
            >
              <View className='history-settings__heading'>
                <View className='history-settings__icon'>设</View>
                <View className='history-settings__copy'>
                  <Text className='history-settings__title'>演示设置</Text>
                  <Text className='history-settings__subtitle'>
                    仅作用于 Demo 数据
                  </Text>
                </View>
              </View>
              <Text
                className={`history-settings__arrow${
                  settingsExpanded ? ' history-settings__arrow--expanded' : ''
                }`}
              >
                ›
              </Text>
            </Button>

            {settingsExpanded ? (
              <View className='history-settings__body'>
                <View className='history-setting history-setting--goal'>
                  <View className='history-setting__label-group'>
                    <Text className='history-setting__label'>目标方向</Text>
                    <Text className='history-setting__hint'>
                      影响每日建议范围
                    </Text>
                  </View>
                  <View className='history-setting__goal-control'>
                    <SegmentedControl
                      ariaLabel='选择目标方向'
                      onChange={(goalDirection) =>
                        updateDraft({ ...settingsDraft, goalDirection })
                      }
                      options={GOAL_OPTIONS}
                      value={settingsDraft.goalDirection}
                    />
                  </View>
                </View>

                <CalorieStepper
                  label='每日建议下限'
                  onDecrease={() => changeCalorie('dailyCalorieMin', -1)}
                  onIncrease={() => changeCalorie('dailyCalorieMin', 1)}
                  value={settingsDraft.dailyCalorieMin}
                />
                <CalorieStepper
                  label='每日建议上限'
                  onDecrease={() => changeCalorie('dailyCalorieMax', -1)}
                  onIncrease={() => changeCalorie('dailyCalorieMax', 1)}
                  value={settingsDraft.dailyCalorieMax}
                />

                {settingsError ? (
                  <Text className='history-settings__error'>{settingsError}</Text>
                ) : null}

                <View className='history-settings__save'>
                  <PrimaryButton
                    disabled={
                      !isSettingsDirty(state.data.profile, settingsDraft) ||
                      validateSettingsDraft(settingsDraft) !== null
                    }
                    loading={savingSettings}
                    onClick={() => void saveSettings()}
                  >
                    保存演示设置
                  </PrimaryButton>
                </View>
              </View>
            ) : null}
          </View>

          <View className='history-disclaimer'>
            <Text className='history-disclaimer__line'>
              食刻 AI 为产品演示 Demo，数据均为估算区间，不构成医疗诊断或专业营养建议。
            </Text>
            <Text className='history-disclaimer__line'>
              演示使用虚构资料；图片仅用于当次识别，不会长期保存。
            </Text>
            <Text className='history-disclaimer__line'>
              如有特殊饮食需求，请咨询注册营养师或医生。
            </Text>
          </View>
        </>
      ) : null}
    </AppPage>
  )
}

interface CalorieStepperProps {
  label: string
  value: number
  onDecrease: () => void
  onIncrease: () => void
}

function CalorieStepper({
  label,
  value,
  onDecrease,
  onIncrease
}: CalorieStepperProps) {
  return (
    <View className='history-setting'>
      <Text className='history-setting__label'>{label}</Text>
      <View className='history-stepper'>
        <Button
          ariaLabel={`${label}减少 50 千卡`}
          className='history-stepper__button'
          hoverClass='history-pressable--active'
          onClick={onDecrease}
        >
          −
        </Button>
        <View className='history-stepper__value'>
          <Text className='history-stepper__number'>{value}</Text>
          <Text className='history-stepper__unit'>kcal</Text>
        </View>
        <Button
          ariaLabel={`${label}增加 50 千卡`}
          className='history-stepper__button'
          hoverClass='history-pressable--active'
          onClick={onIncrease}
        >
          +
        </Button>
      </View>
    </View>
  )
}
