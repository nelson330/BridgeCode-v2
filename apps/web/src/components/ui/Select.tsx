import * as DropdownMenu from '@radix-ui/react-dropdown-menu'
import type { ReactNode } from 'react'
import { Check, ChevronDown } from '../../lib/icons'
import { cn } from './Button'

export interface SelectOption<T extends string | number = string> {
  value: T
  label: ReactNode
  icon?: ReactNode
}

export interface CustomSelectProps<T extends string | number = string> {
  value: T
  id?: string
  'aria-label'?: string
  onChange: (value: T) => void
  options: SelectOption<T>[]
  placeholder?: string
  className?: string
  triggerClassName?: string
  contentClassName?: string
  disabled?: boolean
  align?: 'start' | 'center' | 'end'
}

export function CustomSelect<T extends string | number = string>({
  value,
  id,
  'aria-label': ariaLabel,
  onChange,
  options,
  placeholder = 'Seleccionar...',
  className,
  triggerClassName,
  contentClassName,
  disabled = false,
  align = 'start',
}: CustomSelectProps<T>) {
  const selectedOption = options.find((o) => o.value === value)

  return (
    <div className={cn('relative inline-block w-full', className)}>
      <DropdownMenu.Root>
        <DropdownMenu.Trigger asChild disabled={disabled}>
          <button
            type="button"
            id={id}
            aria-label={ariaLabel}
            className={cn(
              'w-full flex items-center justify-between gap-2 px-3 sm:px-4 py-2 sm:py-2.5 rounded-xl border font-semibold text-xs sm:text-sm shadow-sm transition-all cursor-pointer select-none text-left touch-manipulation focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed',
              'bg-surface border-line text-foreground hover:border-line',
              triggerClassName
            )}
          >
            <span className="flex items-center gap-2 truncate">
              {selectedOption?.icon}
              <span className="truncate">{selectedOption ? selectedOption.label : placeholder}</span>
            </span>
            <ChevronDown className="w-4 h-4 text-accent shrink-0 transition-transform duration-200" />
          </button>
        </DropdownMenu.Trigger>

        <DropdownMenu.Portal>
          <DropdownMenu.Content
            side="bottom"
            align={align}
            sideOffset={6}
            className={cn(
              'z-50 min-w-[180px] max-w-[calc(100vw-2rem)] max-h-[min(16rem,var(--radix-dropdown-menu-content-available-height))] overflow-y-auto p-1.5 rounded-2xl border shadow-2xl space-y-1 focus:outline-none',
              'bg-surface border-line text-foreground',
              contentClassName
            )}
          >
            {options.map((opt) => {
              const isSelected = opt.value === value
              return (
                <DropdownMenu.Item
                  key={String(opt.value)}
                  onSelect={() => onChange(opt.value)}
                  className={cn(
                    'flex min-h-[44px] items-center justify-between gap-2 px-3 py-2 rounded-xl text-xs sm:text-sm font-medium cursor-pointer transition-colors outline-none select-none',
                    isSelected
                      ? 'bg-indigo-600 text-on-accent font-bold shadow-md shadow-indigo-600/30'
                      : 'text-secondary hover:bg-elevated hover:text-foreground'
                  )}
                >
                  <span className="flex items-center gap-2 truncate">
                    {opt.icon}
                    <span className="truncate">{opt.label}</span>
                  </span>
                  {isSelected && <Check className="w-4 h-4 text-on-accent shrink-0" />}
                </DropdownMenu.Item>
              )
            })}
          </DropdownMenu.Content>
        </DropdownMenu.Portal>
      </DropdownMenu.Root>
    </div>
  )
}
