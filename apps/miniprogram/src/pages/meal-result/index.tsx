import type { MealAssessment, MealRecord } from '@food-sense/shared'
import { Button, Text, View } from '@tarojs/components'
import Taro, { useRouter } from '@tarojs/taro'
import { useAtom, useSetAtom } from 'jotai'
import { useCallback, useEffect, useReducer, useRef, useState } from 'react'

import {
  AppPage,
  BottomActionBar,
  PageHeader,
  PrimaryButton
} from '../../components/ui'
import { ROUTES } from '../../navigation/routes'
import {
  assessConfirmedMeal,
  getMealRecords,
  saveMealRecord
} from '../../services/meal-api'
import { mealErrorPresentation } from '../../services/meal-error-presentation'
import {
  mealFlowDraftAtom,
  resetMealFlowDraftAtom
} from '../../state/meal-flow'
import {
  buildAssessMealRequest,
  buildCreateMealRecordRequest,
  createClientRequestId,
  createMealResultState,
  findMealRecord,
  mealResultReducer,
  ratingPresentation,
  ratingSummary
} from './meal-result-state'

import './index.scss'

function classes(...values: Array<string | false | null | undefined>) {
  return values.filter(Boolean).join(' ')
}

function errorDetails(error: unknown) {
  const presentation = mealErrorPresentation(error)
  return {
    ...presentation,
    code:
      presentation.code === 'REQUEST_ABORTED'
        ? ('NETWORK_ERROR' as const)
        : presentation.code
  }
}

function MealAssessmentContent({
  assessment
}: {
  assessment: MealAssessment
}) {
  const presentation = ratingPresentation(assessment.rating)

  return (
    <>
      <View
        className={classes(
          'meal-verdict',
          `meal-verdict--${presentation.tone}`
        )}
      >
        <View
          ariaLabel={`${presentation.label}，${assessment.ratingLabel}`}
          className='meal-verdict__lights'
        >
          {(['success', 'warning', 'danger'] as const).map((tone) => (
            <View
              className={classes(
                'meal-verdict__light',
                `meal-verdict__light--${tone}`,
                presentation.tone === tone && 'meal-verdict__light--active'
              )}
              key={tone}
            />
          ))}
        </View>
        <View className='meal-verdict__icon'>{presentation.icon}</View>
        <Text className='meal-verdict__status'>{presentation.label}</Text>
        <Text className='meal-verdict__title'>{assessment.ratingLabel}</Text>
        <Text className='meal-verdict__summary'>
          {ratingSummary(assessment.rating)}
        </Text>
      </View>

      <View className='meal-calorie-card'>
        <Text className='meal-calorie-card__label'>本餐热量估算区间</Text>
        <View className='meal-calorie-card__range'>
          <Text className='meal-calorie-card__about'>约</Text>
          <Text className='meal-calorie-card__number'>
            {assessment.calorieRange.min}
          </Text>
          <Text className='meal-calorie-card__dash'>–</Text>
          <Text className='meal-calorie-card__number'>
            {assessment.calorieRange.max}
          </Text>
          <Text className='meal-calorie-card__unit'>千卡</Text>
        </View>
        <View className='meal-calorie-card__budget'>
          <Text>当前餐参考额度</Text>
          <Text
            className={`meal-calorie-card__budget-value meal-tone--${presentation.tone}`}
          >
            {assessment.mealBudget} 千卡
          </Text>
        </View>
      </View>

      <View className='meal-reason-card'>
        <View
          className={`meal-reason-card__icon meal-tone-bg--${presentation.tone}`}
        >
          {presentation.icon}
        </View>
        <View className='meal-reason-card__content'>
          <Text className='meal-reason-card__title'>为什么是{presentation.label}</Text>
          <Text className='meal-reason-card__text'>{assessment.reason}</Text>
          {assessment.uncertainties.length > 0 ? (
            <View className='meal-reason-card__uncertainties'>
              <Text className='meal-reason-card__uncertainty-title'>估算中的不确定性</Text>
              {assessment.uncertainties.map((item, index) => (
                <View
                  className='meal-reason-card__uncertainty'
                  key={`${item}-${index}`}
                >
                  <Text className='meal-reason-card__bullet'>·</Text>
                  <Text>{item}</Text>
                </View>
              ))}
            </View>
          ) : null}
        </View>
      </View>

      <View className='meal-advice-heading'>
        <Text className='meal-advice-heading__title'>这样吃更合适</Text>
        <Text className='meal-advice-heading__hint'>现实可做的小调整</Text>
      </View>
      <View className='meal-advice-list'>
        {assessment.advice.map((item, index) => (
          <View className='meal-advice-card' key={item.id}>
            <View className='meal-advice-card__number'>{index + 1}</View>
            <View className='meal-advice-card__content'>
              <Text className='meal-advice-card__text'>{item.text}</Text>
              <Text className='meal-advice-card__effect'>更接近参考额度</Text>
            </View>
          </View>
        ))}
      </View>

      <Text className='meal-result-assurance'>
        估算仅供参考，不构成医疗或营养处方建议。评价的是这顿选择，不是你。
      </Text>
    </>
  )
}

type SavedRecordState =
  | { phase: 'idle' }
  | { phase: 'loading' }
  | { phase: 'loaded'; record: MealRecord }
  | { phase: 'not-found' }
  | { phase: 'error'; message: string }

export default function MealResultPage() {
  const router = useRouter()
  const recordId = router.params.recordId?.trim() || null
  const [draft, setDraft] = useAtom(mealFlowDraftAtom)
  const resetDraft = useSetAtom(resetMealFlowDraftAtom)
  const [state, dispatch] = useReducer(
    mealResultReducer,
    draft.assessment,
    createMealResultState
  )
  const assessmentStarted = useRef(Boolean(draft.assessment))
  const assessmentLocked = useRef(false)
  const saveLocked = useRef(false)
  const clientRequestId = useRef(createClientRequestId())
  const assessedUnknownHandling = useRef<
    'PROMPT' | 'CONSERVATIVE_FALLBACK'
  >('PROMPT')
  const [savedRecordState, setSavedRecordState] = useState<SavedRecordState>(
    recordId ? { phase: 'loading' } : { phase: 'idle' }
  )
  const recordRequestVersion = useRef(0)

  const loadSavedRecord = useCallback(async () => {
    if (!recordId) return

    const version = recordRequestVersion.current + 1
    recordRequestVersion.current = version
    setSavedRecordState({ phase: 'loading' })

    try {
      const response = await getMealRecords()
      if (recordRequestVersion.current !== version) return

      const record = findMealRecord(response, recordId)
      setSavedRecordState(
        record ? { phase: 'loaded', record } : { phase: 'not-found' }
      )
    } catch (error) {
      if (recordRequestVersion.current !== version) return

      setSavedRecordState({
        phase: 'error',
        message: errorDetails(error).message
      })
    }
  }, [recordId])

  const assess = async (
    unknownHandling: 'PROMPT' | 'CONSERVATIVE_FALLBACK' = 'PROMPT'
  ) => {
    if (assessmentLocked.current) return
    const request = buildAssessMealRequest(draft, unknownHandling)
    if (!request) return

    assessmentLocked.current = true
    dispatch({ type: 'assessment-started' })
    try {
      const assessment = await assessConfirmedMeal(request)
      assessedUnknownHandling.current = unknownHandling
      setDraft((current) => ({ ...current, assessment }))
      dispatch({ type: 'assessment-succeeded', assessment })
    } catch (error) {
      const details = errorDetails(error)
      dispatch({
        type: 'assessment-failed',
        code: details.code,
        message: details.message,
        retryable: details.retryable
      })
    } finally {
      assessmentLocked.current = false
    }
  }

  useEffect(() => {
    if (recordId) return
    if (assessmentStarted.current || draft.assessment) return
    if (!buildAssessMealRequest(draft)) return

    assessmentStarted.current = true
    void assess()
  }, [recordId])

  useEffect(() => {
    if (!recordId) return
    void loadSavedRecord()
  }, [loadSavedRecord, recordId])

  const goBack = () => {
    void Taro.navigateBack()
  }

  const returnHomeWithoutSaving = () => {
    resetDraft()
    void Taro.reLaunch({ url: ROUTES.home })
  }

  const save = async () => {
    if (!state.assessment || saveLocked.current) return

    const request = buildCreateMealRecordRequest(
      draft,
      state.assessment,
      clientRequestId.current,
      assessedUnknownHandling.current
    )
    if (!request) return

    saveLocked.current = true
    dispatch({ type: 'save-started' })

    try {
      await saveMealRecord(request)
      dispatch({ type: 'save-succeeded' })
      await Taro.showToast({
        title: '已保存，返回首页可查看',
        icon: 'success',
        duration: 1500
      })
      setTimeout(() => {
        resetDraft()
        void Taro.reLaunch({ url: ROUTES.home })
      }, 1500)
    } catch (error) {
      const details = errorDetails(error)
      dispatch({
        type: 'save-failed',
        message: details.message,
        retryable: details.retryable
      })
      saveLocked.current = false
    }
  }

  if (recordId) {
    if (
      savedRecordState.phase === 'idle' ||
      savedRecordState.phase === 'loading'
    ) {
      return (
        <AppPage className='meal-result-page'>
          <PageHeader onBack={goBack} title='记录详情' />
          <View className='meal-result-loading'>
            <View className='meal-result-loading__lights'>
              <View className='meal-result-loading__light' />
              <View className='meal-result-loading__light' />
              <View className='meal-result-loading__light' />
            </View>
            <Text className='meal-result-loading__title'>正在读取这条记录</Text>
            <Text className='meal-result-loading__body'>
              正在加载已保存的评级、热量区间和建议。
            </Text>
          </View>
        </AppPage>
      )
    }

    if (savedRecordState.phase === 'not-found') {
      return (
        <AppPage className='meal-result-page'>
          <PageHeader onBack={goBack} title='记录详情' />
          <View className='meal-result-message'>
            <View className='meal-result-message__icon'>?</View>
            <Text className='meal-result-message__title'>没有找到这条记录</Text>
            <Text className='meal-result-message__body'>
              这条记录可能已经被删除，请返回首页刷新列表。
            </Text>
            <Button
              className='meal-result-message__action'
              hoverClass='meal-result-pressable--active'
              onClick={goBack}
            >
              返回首页
            </Button>
          </View>
        </AppPage>
      )
    }

    if (savedRecordState.phase === 'error') {
      return (
        <AppPage className='meal-result-page'>
          <PageHeader onBack={goBack} title='记录详情' />
          <View className='meal-result-message meal-result-message--warning'>
            <View className='meal-result-message__icon'>!</View>
            <Text className='meal-result-message__title'>记录暂时打不开</Text>
            <Text className='meal-result-message__body'>
              {savedRecordState.message}
            </Text>
            <View className='meal-result-message__actions'>
              <Button
                className='meal-result-message__action'
                hoverClass='meal-result-pressable--active'
                onClick={goBack}
              >
                返回首页
              </Button>
              <Button
                className='meal-result-message__action meal-result-message__action--primary'
                hoverClass='meal-result-pressable--active'
                onClick={() => void loadSavedRecord()}
              >
                重新加载
              </Button>
            </View>
          </View>
        </AppPage>
      )
    }

    return (
      <AppPage className='meal-result-page'>
        <PageHeader
          onBack={goBack}
          subtitle='已保存记录 · 只读'
          title='记录详情'
        />
        <MealAssessmentContent
          assessment={savedRecordState.record.assessment}
        />
      </AppPage>
    )
  }

  const hasMeal = Boolean(buildAssessMealRequest(draft))
  const assessment = state.assessment

  if (!hasMeal) {
    return (
      <AppPage className='meal-result-page'>
        <PageHeader onBack={goBack} title='这顿饭怎么样' />
        <View className='meal-result-message'>
          <View className='meal-result-message__icon'>?</View>
          <Text className='meal-result-message__title'>还没有可评估的餐食</Text>
          <Text className='meal-result-message__body'>
            返回上一页补充并确认菜品后，再查看本餐结果。
          </Text>
          <Button
            className='meal-result-message__action'
            hoverClass='meal-result-pressable--active'
            onClick={goBack}
          >
            返回补充
          </Button>
        </View>
      </AppPage>
    )
  }

  if (!assessment && state.phase === 'assessing') {
    return (
      <AppPage className='meal-result-page'>
        <PageHeader onBack={goBack} title='这顿饭怎么样' />
        <View className='meal-result-loading'>
          <View className='meal-result-loading__lights'>
            <View className='meal-result-loading__light' />
            <View className='meal-result-loading__light' />
            <View className='meal-result-loading__light' />
          </View>
          <Text className='meal-result-loading__title'>正在计算这顿饭</Text>
          <Text className='meal-result-loading__body'>
            正在结合菜品、份量与当前餐参考额度生成结果。
          </Text>
        </View>
      </AppPage>
    )
  }

  if (!assessment && state.phase === 'assessment-error') {
    const isUnknownDish = state.errorCode === 'UNKNOWN_DISH'

    return (
      <AppPage className='meal-result-page'>
        <PageHeader onBack={goBack} title='这顿饭怎么样' />
        <View className='meal-result-message meal-result-message--warning'>
          <View className='meal-result-message__icon'>!</View>
          <Text className='meal-result-message__title'>
            {isUnknownDish ? '有些菜品暂时无法准确估算' : '这次评估没有完成'}
          </Text>
          <Text className='meal-result-message__body'>{state.errorMessage}</Text>
          <View className='meal-result-message__actions'>
            <Button
              className='meal-result-message__action'
              hoverClass='meal-result-pressable--active'
              onClick={goBack}
            >
              返回补充
            </Button>
            {isUnknownDish || state.retryable ? (
              <Button
                className='meal-result-message__action meal-result-message__action--primary'
                hoverClass='meal-result-pressable--active'
                onClick={() =>
                  void assess(isUnknownDish ? 'CONSERVATIVE_FALLBACK' : 'PROMPT')
                }
              >
                {isUnknownDish ? '仍按宽范围估算' : '重新评估'}
              </Button>
            ) : null}
          </View>
        </View>
      </AppPage>
    )
  }

  if (!assessment) return null

  const saving = state.phase === 'saving' || state.phase === 'saved'
  const saveRetryBlocked =
    state.phase === 'save-error' && !state.retryable

  return (
    <AppPage className='meal-result-page' hasBottomAction>
      <PageHeader onBack={goBack} title='这顿饭怎么样' />

      <MealAssessmentContent assessment={assessment} />

      <BottomActionBar hint='保存后可在首页和历史记录中查看'>
        <View className='flow-bottom-actions'>
          <PrimaryButton
            disabled={saveRetryBlocked}
            loading={saving}
            onClick={() => void save()}
          >
            {saving ? '正在保存' : '保存这顿饭'}
          </PrimaryButton>
          <Button
            ariaLabel='暂不保存，返回首页'
            className='flow-secondary-button flow-cancel-button'
            disabled={saving}
            hoverClass='flow-secondary-button--active'
            onClick={returnHomeWithoutSaving}
          >
            暂不保存，返回首页
          </Button>
        </View>
      </BottomActionBar>

      {state.phase === 'save-error' ? (
        <View className='meal-save-error'>
          <View className='meal-save-error__icon'>!</View>
          <View className='meal-save-error__content'>
            <Text className='meal-save-error__title'>保存没有成功</Text>
            <Text className='meal-save-error__body'>{state.errorMessage}</Text>
          </View>
          {state.retryable ? (
            <Button
              className='meal-save-error__retry'
              hoverClass='meal-result-pressable--active'
              onClick={() => void save()}
            >
              重试
            </Button>
          ) : null}
        </View>
      ) : null}
    </AppPage>
  )
}
