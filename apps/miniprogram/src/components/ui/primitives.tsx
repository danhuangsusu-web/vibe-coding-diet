import { Button, Text, View } from '@tarojs/components'
import type { ReactNode } from 'react'

import './primitives.scss'

type PressEvent = Parameters<NonNullable<React.ComponentProps<typeof Button>['onClick']>>[0]

function classes(...values: Array<string | false | null | undefined>) {
  return values.filter(Boolean).join(' ')
}

export interface AppPageProps {
  children: ReactNode
  className?: string
  hasBottomAction?: boolean
}

export function AppPage({
  children,
  className,
  hasBottomAction = false
}: AppPageProps) {
  return (
    <View
      className={classes(
        'ui-page',
        hasBottomAction && 'ui-page--with-bottom-action',
        className
      )}
    >
      {children}
    </View>
  )
}

export interface IconButtonProps {
  ariaLabel: string
  children: ReactNode
  className?: string
  disabled?: boolean
  onClick?: (event: PressEvent) => void
}

export function IconButton({
  ariaLabel,
  children,
  className,
  disabled = false,
  onClick
}: IconButtonProps) {
  return (
    <Button
      ariaLabel={ariaLabel}
      className={classes('ui-icon-button', className)}
      disabled={disabled}
      hoverClass='ui-pressable--active'
      onClick={onClick}
    >
      {children}
    </Button>
  )
}

export interface PageHeaderProps {
  title: string
  subtitle?: string
  backLabel?: string
  onBack?: (event: PressEvent) => void
  trailing?: ReactNode
}

export function PageHeader({
  title,
  subtitle,
  backLabel = '返回',
  onBack,
  trailing
}: PageHeaderProps) {
  return (
    <View className='ui-page-header'>
      <View className='ui-page-header__row'>
        <View className='ui-page-header__side'>
          {onBack ? (
            <IconButton ariaLabel={backLabel} onClick={onBack}>
              <Text className='ui-page-header__back-glyph'>‹</Text>
            </IconButton>
          ) : null}
        </View>
        <Text className='ui-page-header__title'>{title}</Text>
        <View className='ui-page-header__side ui-page-header__side--trailing'>
          {trailing}
        </View>
      </View>
      {subtitle ? (
        <Text className='ui-page-header__subtitle'>{subtitle}</Text>
      ) : null}
    </View>
  )
}

export interface SurfaceCardProps {
  children: ReactNode
  className?: string
  emphasis?: 'default' | 'soft' | 'warning'
}

export function SurfaceCard({
  children,
  className,
  emphasis = 'default'
}: SurfaceCardProps) {
  return (
    <View
      className={classes(
        'ui-card',
        `ui-card--${emphasis}`,
        className
      )}
    >
      {children}
    </View>
  )
}

export type StatusTone = 'success' | 'warning' | 'danger'

const STATUS_ICON: Record<StatusTone, string> = {
  success: '✓',
  warning: '!',
  danger: '×'
}

export interface StatusBadgeProps {
  label: string
  tone: StatusTone
  compact?: boolean
}

export function StatusBadge({
  label,
  tone,
  compact = false
}: StatusBadgeProps) {
  return (
    <View
      ariaLabel={label}
      className={classes(
        'ui-status-badge',
        `ui-status-badge--${tone}`,
        compact && 'ui-status-badge--compact'
      )}
    >
      <Text className='ui-status-badge__icon'>{STATUS_ICON[tone]}</Text>
      <Text className='ui-status-badge__label'>{label}</Text>
    </View>
  )
}

export interface SegmentedOption<T extends string> {
  label: string
  value: T
}

export interface SegmentedControlProps<T extends string> {
  ariaLabel: string
  options: readonly SegmentedOption<T>[]
  value: T
  onChange: (value: T) => void
}

export function SegmentedControl<T extends string>({
  ariaLabel,
  options,
  value,
  onChange
}: SegmentedControlProps<T>) {
  return (
    <View ariaLabel={ariaLabel} className='ui-segmented-control'>
      {options.map((option) => {
        const selected = option.value === value

        return (
          <Button
            ariaLabel={`${option.label}${selected ? '，已选择' : ''}`}
            className={classes(
              'ui-segmented-control__option',
              selected && 'ui-segmented-control__option--selected'
            )}
            hoverClass='ui-pressable--active'
            key={option.value}
            onClick={() => onChange(option.value)}
          >
            {option.label}
          </Button>
        )
      })}
    </View>
  )
}

export interface PrimaryButtonProps {
  children: ReactNode
  disabled?: boolean
  loading?: boolean
  onClick?: (event: PressEvent) => void
}

export function PrimaryButton({
  children,
  disabled = false,
  loading = false,
  onClick
}: PrimaryButtonProps) {
  return (
    <Button
      ariaLabel={typeof children === 'string' ? children : undefined}
      className='ui-primary-button'
      disabled={disabled || loading}
      hoverClass='ui-primary-button--active'
      loading={loading}
      onClick={onClick}
    >
      {children}
    </Button>
  )
}

export interface BottomActionBarProps {
  children: ReactNode
  hint?: string
}

export function BottomActionBar({ children, hint }: BottomActionBarProps) {
  return (
    <View className='ui-bottom-action'>
      <View className='ui-bottom-action__inner'>
        {hint ? <Text className='ui-bottom-action__hint'>{hint}</Text> : null}
        {children}
      </View>
    </View>
  )
}

