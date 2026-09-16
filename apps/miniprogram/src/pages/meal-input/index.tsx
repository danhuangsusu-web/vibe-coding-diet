import { Button, Image, Text, Textarea, View } from '@tarojs/components'
import Taro from '@tarojs/taro'
import { useSetAtom } from 'jotai'
import { useEffect, useReducer, useRef, useState } from 'react'

import {
  AppPage,
  BottomActionBar,
  PageHeader,
  PrimaryButton,
  SurfaceCard
} from '../../components/ui'
import { ROUTES } from '../../navigation/routes'
import {
  MealImageError,
  selectAndCompressMealImage,
  type MealImageSource
} from '../../services/meal-image'
import {
  OfflineMealSampleNotFoundError,
  OFFLINE_MEAL_PARSER_METADATA,
  OFFLINE_DEMO_TEXTS,
  parseMeal
} from '../../services/meal-parser'
import { mealFlowDraftAtom } from '../../state/meal-flow'
import {
  buildMealParseInput,
  canSubmitMealInput,
  createInitialMealInputState,
  imageSourceLabel,
  mealInputReducer
} from './meal-input-state'

import './index.scss'

const DETAILED_PROGRESS_DELAY_MS = 4000
const PARSE_TIMEOUT_MS = 12000

class MealParseTimeoutError extends Error {
  constructor() {
    super('Meal parsing timed out')
    this.name = 'MealParseTimeoutError'
  }
}

async function parseMealWithTimeout(
  input: Parameters<typeof parseMeal>[0]
): Promise<Awaited<ReturnType<typeof parseMeal>>> {
  let timeoutId: ReturnType<typeof setTimeout> | undefined

  try {
    return await Promise.race([
      parseMeal(input),
      new Promise<never>((_resolve, reject) => {
        timeoutId = setTimeout(
          () => reject(new MealParseTimeoutError()),
          PARSE_TIMEOUT_MS
        )
      })
    ])
  } finally {
    if (timeoutId) clearTimeout(timeoutId)
  }
}

function readableImageError(error: MealImageError): string {
  switch (error.code) {
    case 'IMAGE_UNSUPPORTED':
      return '暂不支持这种图片格式，请使用 JPG 或 PNG，或重新拍摄。'
    case 'IMAGE_TOO_LARGE':
      return '图片压缩后仍超过 1MB，请重新选择或裁剪图片。'
    case 'IMAGE_COMPRESS_FAILED':
      return '图片读取或压缩失败，请重试，或改用文字描述。'
    case 'CANCELLED':
    case 'PERMISSION_DENIED':
      return ''
  }
}

export default function MealInputPage() {
  const setDraft = useSetAtom(mealFlowDraftAtom)
  const [state, dispatch] = useReducer(
    mealInputReducer,
    undefined,
    createInitialMealInputState
  )
  const [showDetailedProgress, setShowDetailedProgress] = useState(false)
  const submitLockedRef = useRef(false)
  const requestVersionRef = useRef(0)
  const progressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    return () => {
      if (progressTimerRef.current) clearTimeout(progressTimerRef.current)
      requestVersionRef.current += 1
    }
  }, [])

  const clearProgressTimer = () => {
    if (!progressTimerRef.current) return
    clearTimeout(progressTimerRef.current)
    progressTimerRef.current = null
  }

  const goBack = () => {
    void Taro.navigateBack()
  }

  const chooseImage = async (source: MealImageSource) => {
    if (state.phase === 'analyzing') return

    try {
      const image = await selectAndCompressMealImage(source)
      dispatch({ type: 'image-selected', image })
    } catch (error) {
      if (!(error instanceof MealImageError)) {
        dispatch({
          type: 'analysis-failed',
          message: '图片处理失败，请重试，或改用文字描述。'
        })
        return
      }

      if (error.code === 'CANCELLED') return

      if (error.code === 'PERMISSION_DENIED') {
        dispatch({ type: 'permission-denied' })
        return
      }

      dispatch({
        type: 'analysis-failed',
        message: readableImageError(error)
      })
    }
  }

  const submit = async () => {
    if (submitLockedRef.current) return

    const input = buildMealParseInput(state)
    if (!input) return

    submitLockedRef.current = true
    const requestVersion = requestVersionRef.current + 1
    requestVersionRef.current = requestVersion
    setShowDetailedProgress(false)
    dispatch({ type: 'analysis-started' })
    progressTimerRef.current = setTimeout(() => {
      if (requestVersionRef.current === requestVersion) {
        setShowDetailedProgress(true)
      }
    }, DETAILED_PROGRESS_DELAY_MS)

    try {
      const parsedMeal = await parseMealWithTimeout(input)

      if (requestVersionRef.current !== requestVersion) return

      const inputSummary =
        input.sourceType === 'TEXT'
          ? {
              sourceType: 'TEXT' as const,
              sourceText: input.sourceText,
              displayLabel: '文字输入',
              submittedAt: new Date().toISOString(),
              ...OFFLINE_MEAL_PARSER_METADATA
            }
          : {
              sourceType: 'IMAGE' as const,
              displayLabel: state.image
                ? imageSourceLabel(state.image.source)
                : '图片输入',
              submittedAt: new Date().toISOString(),
              ...OFFLINE_MEAL_PARSER_METADATA
            }

      setDraft((current) => ({
        ...current,
        inputSummary,
        parsedMeal,
        assessment: null
      }))
      dispatch({ type: 'analysis-cancelled' })
      void Taro.navigateTo({ url: ROUTES.mealConfirm })
    } catch (error) {
      if (requestVersionRef.current !== requestVersion) return

      if (error instanceof OfflineMealSampleNotFoundError) {
        dispatch({ type: 'no-meal-detected' })
      } else if (error instanceof MealParseTimeoutError) {
        dispatch({
          type: 'analysis-failed',
          message: '分析时间较长，已经停止等待。你的内容仍然保留，可以重新尝试。'
        })
      } else {
        dispatch({
          type: 'analysis-failed',
          message: '这次没有成功。你的内容仍然保留，可以重新尝试。'
        })
      }
    } finally {
      if (requestVersionRef.current === requestVersion) {
        clearProgressTimer()
        setShowDetailedProgress(false)
        submitLockedRef.current = false
      }
    }
  }

  const cancelAnalysis = () => {
    requestVersionRef.current += 1
    submitLockedRef.current = false
    clearProgressTimer()
    setShowDetailedProgress(false)
    dispatch({ type: 'return-to-text' })
  }

  const openSettings = async () => {
    try {
      await Taro.openSetting()
    } finally {
      dispatch({ type: 'return-to-input', mode: 'IMAGE' })
    }
  }

  const retryAfterFailure = () => {
    if (buildMealParseInput(state)) {
      void submit()
      return
    }

    dispatch({ type: 'return-to-input' })
  }

  const canSubmit = canSubmitMealInput(state)
  const isAnalyzing = state.phase === 'analyzing'
  const submitHint = canSubmit
    ? '识别后先给你确认，再计算保存'
    : isAnalyzing
      ? '正在准备识别结果，请稍候'
      : '先上传一张照片，或输入一句描述'

  return (
    <AppPage className='meal-input-page' hasBottomAction>
      <PageHeader
        onBack={goBack}
        subtitle='拍张照，或写一句话就好'
        title='记录这一餐'
      />

      <SurfaceCard className='meal-upload'>
        <Text className='meal-upload__title'>上传餐食照片</Text>
        <Text className='meal-upload__subtitle'>
          支持外卖菜单截图或餐食实拍 · 一次一张
        </Text>

        <Button
          ariaLabel={state.image ? '重新选择餐食照片' : '选择餐食照片'}
          className='meal-upload__drop-zone'
          hoverClass='meal-pressable--active'
          onClick={() => void chooseImage('album')}
        >
          {state.image ? (
            <>
              <Image
                className='meal-upload__preview'
                mode='aspectFill'
                src={state.image.localPath}
              />
              <View className='meal-upload__selected-copy'>
                <Text className='meal-upload__selected-label'>已选择一张照片</Text>
                <Text className='meal-upload__selected-meta'>
                  已在本地压缩 · {Math.ceil(state.image.size / 1024)} KB
                </Text>
              </View>
            </>
          ) : (
            <>
              <View className='meal-upload__camera-mark'>
                <Text>拍</Text>
              </View>
              <Text className='meal-upload__drop-main'>点这里从相册选择</Text>
              <Text className='meal-upload__drop-sub'>
                识别菜品与做法，热量稍后由规则估算
              </Text>
            </>
          )}
        </Button>

        <View className='meal-upload__sources'>
          <Button
            ariaLabel='拍摄餐食照片'
            className='meal-upload__source-button'
            hoverClass='meal-pressable--active'
            onClick={() => void chooseImage('camera')}
          >
            <Text className='meal-upload__source-symbol'>拍</Text>
            <Text>拍照</Text>
          </Button>
          <Button
            ariaLabel='从相册选择餐食照片'
            className='meal-upload__source-button meal-upload__source-button--album'
            hoverClass='meal-pressable--active'
            onClick={() => void chooseImage('album')}
          >
            <Text className='meal-upload__source-symbol'>图</Text>
            <Text>从相册选择</Text>
          </Button>
        </View>
      </SurfaceCard>

      <View className='meal-text-input'>
        <View className='meal-text-input__heading'>
          <Text className='meal-text-input__label'>文字描述</Text>
          <Text className='meal-text-input__or'>或</Text>
          {state.activeMode === 'TEXT' && state.text.trim() ? (
            <Text className='meal-text-input__active'>当前使用文字</Text>
          ) : null}
        </View>
        <Textarea
          ariaLabel='餐食文字描述'
          className='meal-text-input__control'
          maxlength={100}
          placeholder='例如：干煸芸豆、溜肉段和米饭'
          placeholderClass='meal-text-input__placeholder'
          value={state.text}
          onFocus={() => dispatch({ type: 'text-activated' })}
          onInput={(event) =>
            dispatch({ type: 'text-changed', text: event.detail.value })
          }
        />
        <Text className='meal-text-input__count'>{state.text.length} / 100</Text>
      </View>

      <View className='meal-examples'>
        <Text className='meal-examples__heading'>试试离线样例</Text>
        <View className='meal-examples__list'>
          <Button
            className='meal-examples__chip'
            hoverClass='meal-pressable--active'
            onClick={() =>
              dispatch({
                type: 'text-changed',
                text: OFFLINE_DEMO_TEXTS.northeastCombo
              })
            }
          >
            干煸芸豆 + 溜肉段 + 米饭
          </Button>
          <Button
            className='meal-examples__chip'
            hoverClass='meal-pressable--active'
            onClick={() =>
              dispatch({
                type: 'text-changed',
                text: OFFLINE_DEMO_TEXTS.lightChickenSet
              })
            }
          >
            白灼时蔬 + 水煮鸡胸 + 小份米饭
          </Button>
        </View>
        <Text className='meal-examples__tip'>
          带上做法和份量，估算会更可靠。图片处理失败时，文字随时兜底。
        </Text>
      </View>

      <BottomActionBar hint={submitHint}>
        <PrimaryButton
          disabled={!canSubmit}
          loading={isAnalyzing}
          onClick={() => void submit()}
        >
          {isAnalyzing ? '正在分析' : '开始分析'}
        </PrimaryButton>
      </BottomActionBar>

      {state.phase === 'analyzing' && showDetailedProgress ? (
        <View className='meal-state meal-state--loading'>
          <View className='meal-state__visual meal-state__visual--loading'>
            <Text>...</Text>
          </View>
          <Text className='meal-state__title'>正在分析这顿饭</Text>
          <Text className='meal-state__description'>正在识别菜品与做法…</Text>
          <View className='meal-progress' ariaLabel='餐食分析进行中'>
            <View className='meal-progress__fill' />
          </View>
          <View className='meal-progress-steps'>
            <View className='meal-progress-step meal-progress-step--done'>
              <View className='meal-progress-step__dot' />
              <Text>输入完成</Text>
            </View>
            <View className='meal-progress-step meal-progress-step--active'>
              <View className='meal-progress-step__dot' />
              <Text>识别中</Text>
            </View>
            <View className='meal-progress-step'>
              <View className='meal-progress-step__dot' />
              <Text>待你确认</Text>
            </View>
          </View>
          <Text className='meal-state__description meal-state__description--wide'>
            识别结果会先给你确认，确认后才计算热量与评级，不会直接保存。
          </Text>
          <Button
            className='meal-state__secondary meal-state__secondary--muted'
            hoverClass='meal-pressable--active'
            onClick={cancelAnalysis}
          >
            取消并改用文字输入
          </Button>
        </View>
      ) : null}

      {state.phase === 'permission-denied' ? (
        <View className='meal-state'>
          <View className='meal-state__visual meal-state__visual--warning'>
            <Text>!</Text>
          </View>
          <Text className='meal-state__title'>无法使用相机和相册</Text>
          <Text className='meal-state__description'>
            需要你在系统设置中允许访问，才能选择照片；也可以先用文字描述这一餐。
          </Text>
          <View className='meal-state__actions'>
            <Button
              className='meal-state__primary'
              hoverClass='meal-pressable--active'
              onClick={() => void openSettings()}
            >
              去开启权限
            </Button>
            <Button
              className='meal-state__secondary'
              hoverClass='meal-pressable--active'
              onClick={() => dispatch({ type: 'return-to-text' })}
            >
              改用文字输入
            </Button>
          </View>
        </View>
      ) : null}

      {state.phase === 'failure' ? (
        <View className='meal-state'>
          <View className='meal-state__visual meal-state__visual--danger'>
            <Text>!</Text>
          </View>
          <Text className='meal-state__title'>这次没有成功</Text>
          <Text className='meal-state__description'>
            {state.errorMessage ?? '你的内容没有丢失，可以重新尝试。'}
          </Text>
          <View className='meal-state__actions'>
            <Button
              className='meal-state__primary'
              hoverClass='meal-pressable--active'
              onClick={retryAfterFailure}
            >
              重新尝试
            </Button>
            <Button
              className='meal-state__secondary'
              hoverClass='meal-pressable--active'
              onClick={() => dispatch({ type: 'return-to-text' })}
            >
              改用文字输入
            </Button>
          </View>
        </View>
      ) : null}

      {state.phase === 'no-meal' ? (
        <View className='meal-state'>
          <View className='meal-state__visual meal-state__visual--warning'>
            <Text>?</Text>
          </View>
          <Text className='meal-state__title'>没有认出这是一顿饭</Text>
          <Text className='meal-state__description'>
            当前离线模式只识别两个演示样例。请选择样例，或换一张更清楚的照片。
          </Text>
          <View className='meal-state__actions'>
            <Button
              className='meal-state__primary'
              hoverClass='meal-pressable--active'
              onClick={() => dispatch({ type: 'return-to-input' })}
            >
              修改当前输入
            </Button>
            <Button
              className='meal-state__secondary'
              hoverClass='meal-pressable--active'
              onClick={() => dispatch({ type: 'return-to-text' })}
            >
              选择文字样例
            </Button>
          </View>
        </View>
      ) : null}
    </AppPage>
  )
}
