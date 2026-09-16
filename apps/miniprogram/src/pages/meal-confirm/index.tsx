import { Button, Input, Text, View } from '@tarojs/components'
import Taro from '@tarojs/taro'
import { useAtom, useSetAtom } from 'jotai'
import { useReducer, useState } from 'react'

import {
  AppPage,
  BottomActionBar,
  PageHeader,
  PrimaryButton,
  SegmentedControl
} from '../../components/ui'
import { ROUTES } from '../../navigation/routes'
import {
  mealFlowDraftAtom,
  resetMealFlowDraftAtom,
  type MealInputSummary
} from '../../state/meal-flow'
import {
  buildConfirmedParsedMeal,
  canConfirmMeal,
  collectMealUncertainties,
  confidencePresentation,
  COOKING_METHOD_OPTIONS,
  cookingMethodLabel,
  createMealConfirmState,
  ingredientLabel,
  isHighOilOrSugarMethod,
  mealConfirmReducer,
  PORTION_OPTIONS,
  type MealConfirmItem
} from './meal-confirm-state'

import './index.scss'

function classes(...values: Array<string | false | null | undefined>) {
  return values.filter(Boolean).join(' ')
}

function formatSubmittedTime(value: string): string {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '本次输入'

  return `${String(date.getHours()).padStart(2, '0')}:${String(
    date.getMinutes()
  ).padStart(2, '0')}`
}

function sourceDescription(summary: MealInputSummary): string {
  const time = formatSubmittedTime(summary.submittedAt)
  return summary.sourceType === 'IMAGE'
    ? `${time} 选择 · 已在本地压缩`
    : `${time} 提交 · 文字描述`
}

function ConfidenceBadge({ item }: { item: MealConfirmItem }) {
  if (item.wasManuallyAdjusted) {
    return (
      <View className='meal-confidence meal-confidence--manual'>
        <Text className='meal-confidence__icon'>改</Text>
        <Text>已手动调整</Text>
      </View>
    )
  }

  const presentation = confidencePresentation(item.confidence)

  return (
    <View
      ariaLabel={`识别可信度：${presentation.label}`}
      className={`meal-confidence meal-confidence--${presentation.tone}`}
    >
      <Text className='meal-confidence__icon'>{presentation.icon}</Text>
      <Text>{presentation.label}</Text>
    </View>
  )
}

function confidenceHint(item: MealConfirmItem): string | null {
  if (item.wasManuallyAdjusted) return null
  if (item.confidence < 0.5) {
    return '这项信息不够确定，请修改菜名、做法或份量后再确认。'
  }
  if (item.confidence < 0.8) {
    return '请确认菜名、做法和份量是否准确。'
  }
  return null
}

export default function MealConfirmPage() {
  const [draft, setDraft] = useAtom(mealFlowDraftAtom)
  const resetDraft = useSetAtom(resetMealFlowDraftAtom)
  const [state, dispatch] = useReducer(
    mealConfirmReducer,
    draft.parsedMeal,
    createMealConfirmState
  )
  const [editingMethodsFor, setEditingMethodsFor] = useState<string | null>(null)

  const canContinue = canConfirmMeal(state)
  const uncertainties = collectMealUncertainties(state)
  const summary = draft.inputSummary

  const goBack = () => {
    void Taro.navigateBack()
  }

  const continueToResult = () => {
    const parsedMeal = buildConfirmedParsedMeal(state)
    if (!parsedMeal) return

    setDraft((current) => ({
      ...current,
      parsedMeal,
      assessment: null
    }))
    void Taro.navigateTo({ url: ROUTES.mealResult })
  }

  const cancel = () => {
    resetDraft()
    void Taro.reLaunch({ url: ROUTES.home })
  }

  return (
    <AppPage className='meal-confirm-page' hasBottomAction>
      <PageHeader
        onBack={goBack}
        subtitle='确认或改一改，再开始计算'
        title='确认识别结果'
      />

      {summary ? (
        <View className='meal-source-summary'>
          <View
            className={classes(
              'meal-source-summary__icon',
              summary.sourceType === 'TEXT' && 'meal-source-summary__icon--text'
            )}
          >
            <Text>{summary.sourceType === 'IMAGE' ? '图' : '文'}</Text>
          </View>
          <View className='meal-source-summary__copy'>
            <Text className='meal-source-summary__title'>{summary.displayLabel}</Text>
            <Text className='meal-source-summary__meta'>
              {sourceDescription(summary)}
            </Text>
          </View>
          <Text className='meal-source-summary__count'>{state.items.length} 道菜</Text>
        </View>
      ) : null}

      {uncertainties.length > 0 ? (
        <View className='meal-whole-note'>
          <View className='meal-whole-note__icon'>
            <Text>!</Text>
          </View>
          <Text className='meal-whole-note__text'>
            <Text className='meal-whole-note__label'>整餐提示：</Text>
            {uncertainties.join('；')}。估算时会保留这些不确定性，请先确认菜品信息。
          </Text>
        </View>
      ) : null}

      <View className='meal-confirm-heading'>
        <Text className='meal-confirm-heading__title'>识别出的菜品</Text>
        <Text className='meal-confirm-heading__hint'>可直接修改或删除</Text>
      </View>

      {state.items.length === 0 ? (
        <View className='meal-confirm-empty'>
          <View className='meal-confirm-empty__mark'>
            <Text>+</Text>
          </View>
          <Text className='meal-confirm-empty__title'>还没有可确认的菜品</Text>
          <Text className='meal-confirm-empty__body'>
            返回补充输入，或在这里添加漏掉的菜品。
          </Text>
          <Button
            className='meal-confirm-empty__back'
            hoverClass='meal-pressable--active'
            onClick={goBack}
          >
            返回补充
          </Button>
        </View>
      ) : (
        <View className='meal-dish-list'>
          {state.items.map((item) => {
            const presentation = confidencePresentation(item.confidence)
            const hint = confidenceHint(item)
            const editingMethods = editingMethodsFor === item.localId

            return (
              <View
                className={classes(
                  'meal-dish-card',
                  !item.wasManuallyAdjusted &&
                    presentation.tone === 'low' &&
                    'meal-dish-card--low-confidence'
                )}
                key={item.localId}
              >
                <View className='meal-dish-card__top'>
                  <View className='meal-dish-card__thumb'>
                    <Text>{item.displayName.trim().charAt(0) || '菜'}</Text>
                  </View>
                  <View className='meal-dish-card__main'>
                    <Input
                      ariaLabel='菜品名称'
                      className='meal-dish-card__name'
                      maxlength={-1}
                      placeholder='输入菜品名称'
                      placeholderClass='meal-dish-card__name-placeholder'
                      value={item.displayName}
                      onInput={(event) =>
                        dispatch({
                          type: 'name-changed',
                          itemId: item.localId,
                          value: event.detail.value
                        })
                      }
                    />
                    <ConfidenceBadge item={item} />
                  </View>
                  <Button
                    ariaLabel={`删除${item.displayName.trim() || '这道菜'}`}
                    className='meal-dish-card__delete'
                    hoverClass='meal-pressable--active'
                    onClick={() => {
                      if (editingMethodsFor === item.localId) {
                        setEditingMethodsFor(null)
                      }
                      dispatch({ type: 'item-deleted', itemId: item.localId })
                    }}
                  >
                    ×
                  </Button>
                </View>

                {item.nameWasTruncated ? (
                  <Text className='meal-dish-card__validation'>
                    菜名最多 30 字，超出内容已截断。
                  </Text>
                ) : null}

                {hint ? <Text className='meal-dish-card__hint'>{hint}</Text> : null}

                <View className='meal-attribute-row'>
                  <Text className='meal-attribute-row__label'>食材</Text>
                  <View className='meal-tag-list'>
                    {item.ingredients.map((ingredient) => (
                      <Text className='meal-tag' key={ingredient}>
                        {ingredientLabel(ingredient)}
                      </Text>
                    ))}
                    {item.otherIngredients.map((ingredient, index) => (
                      <Text className='meal-tag' key={`${ingredient}-${index}`}>
                        {ingredient}
                      </Text>
                    ))}
                  </View>
                </View>

                <View className='meal-attribute-row'>
                  <Text className='meal-attribute-row__label'>做法</Text>
                  <View className='meal-tag-list'>
                    {item.cookingMethods.map((method) => (
                      <Text
                        className={classes(
                          'meal-tag',
                          'meal-tag--selected',
                          isHighOilOrSugarMethod(method)
                            ? 'meal-tag--warning'
                            : 'meal-tag--calm'
                        )}
                        key={method}
                      >
                        {cookingMethodLabel(method)}
                      </Text>
                    ))}
                    <Button
                      className='meal-method-edit'
                      hoverClass='meal-pressable--active'
                      onClick={() =>
                        setEditingMethodsFor(editingMethods ? null : item.localId)
                      }
                    >
                      {editingMethods ? '收起' : '修改'}
                    </Button>
                  </View>
                </View>

                {editingMethods ? (
                  <View className='meal-method-picker'>
                    <Text className='meal-method-picker__title'>选择一个或多个做法</Text>
                    <View className='meal-method-picker__options'>
                      {COOKING_METHOD_OPTIONS.map((option) => {
                        const selected = item.cookingMethods.includes(option.value)
                        return (
                          <Button
                            ariaLabel={`${option.label}${selected ? '，已选择' : ''}`}
                            className={classes(
                              'meal-method-option',
                              selected && 'meal-method-option--selected',
                              selected &&
                                (isHighOilOrSugarMethod(option.value)
                                  ? 'meal-method-option--warning'
                                  : 'meal-method-option--calm')
                            )}
                            hoverClass='meal-pressable--active'
                            key={option.value}
                            onClick={() =>
                              dispatch({
                                type: 'cooking-method-toggled',
                                itemId: item.localId,
                                value: option.value
                              })
                            }
                          >
                            {option.label}
                          </Button>
                        )
                      })}
                    </View>
                    {item.cookingMethods.includes('OTHER') ? (
                      <Input
                        ariaLabel='其他做法说明'
                        className='meal-method-picker__other'
                        maxlength={30}
                        placeholder='补充其他做法'
                        placeholderClass='meal-method-picker__placeholder'
                        value={item.otherCookingMethods[0] ?? ''}
                        onInput={(event) =>
                          dispatch({
                            type: 'other-cooking-changed',
                            itemId: item.localId,
                            value: event.detail.value
                          })
                        }
                      />
                    ) : null}
                  </View>
                ) : null}

                <View className='meal-portion-row'>
                  <Text className='meal-attribute-row__label'>份量</Text>
                  <View className='meal-portion-row__control'>
                    <SegmentedControl
                      ariaLabel={`${item.displayName.trim() || '菜品'}份量`}
                      options={PORTION_OPTIONS}
                      value={item.portionLevel}
                      onChange={(value) =>
                        dispatch({
                          type: 'portion-changed',
                          itemId: item.localId,
                          value
                        })
                      }
                    />
                  </View>
                </View>
              </View>
            )
          })}
        </View>
      )}

      <Button
        className='meal-add-dish'
        hoverClass='meal-pressable--active'
        onClick={() => dispatch({ type: 'item-added' })}
      >
        <Text className='meal-add-dish__plus'>+</Text>
        <Text>添加漏掉的菜品</Text>
      </Button>

      <Text className='meal-confirm-assurance'>
        未经你的确认，不会生成评级，也不会保存任何记录
      </Text>

      <BottomActionBar hint='热量与红黄绿灯由规则计算，AI 不直接决定'>
        <View className='flow-bottom-actions'>
          <PrimaryButton disabled={!canContinue} onClick={continueToResult}>
            确认无误，开始计算
          </PrimaryButton>
          <Button
            ariaLabel='取消本次记录'
            className='flow-secondary-button flow-cancel-button'
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
