import * as DropdownMenu from '@radix-ui/react-dropdown-menu'
import * as TabsPrimitive from '@radix-ui/react-tabs'
import { Check, ChevronDown } from 'lucide-react'
import { motion } from 'motion/react'
import type { ReactNode } from 'react'
import { cn } from './Button'

interface TabOption {
  value: string
  label: ReactNode
  icon?: ReactNode
}

interface TabsProps {
  value: string
  onValueChange: (val: string) => void
  options: TabOption[]
  className?: string
}

export function Tabs({ value, onValueChange, options, className }: TabsProps) {
  const currentOption = options.find((o) => o.value === value) || options[0]

  return (
    <div className={cn('w-full space-y-2', className)}>
      {/* Mobile Custom Dropdown Menu (Opens vertically downwards/upwards) */}
      <div className="sm:hidden relative w-full">
        <DropdownMenu.Root>
          <DropdownMenu.Trigger asChild>
            <button
              type="button"
              className="w-full flex items-center justify-between px-4 py-3 rounded-2xl bg-slate-900 border border-slate-800 text-sm font-bold text-white shadow-xl cursor-pointer hover:border-slate-700 active:scale-[0.99] transition-all touch-manipulation"
            >
              <span className="flex items-center gap-2.5">
                {currentOption?.icon}
                <span>{currentOption?.label}</span>
              </span>
              <ChevronDown className="w-4 h-4 text-indigo-400 shrink-0" />
            </button>
          </DropdownMenu.Trigger>

          <DropdownMenu.Portal>
            <DropdownMenu.Content
              side="bottom"
              align="start"
              sideOffset={8}
              className="z-50 w-[calc(100vw-2rem)] max-w-sm p-2 rounded-2xl bg-slate-900 border border-slate-800 shadow-2xl space-y-1 focus:outline-none"
            >
              <div className="px-3 py-1.5 text-[11px] font-extrabold uppercase tracking-widest text-slate-400">
                Seleccionar Módulo
              </div>
              {options.map((opt) => {
                const isSelected = opt.value === value
                return (
                  <DropdownMenu.Item
                    key={opt.value}
                    onSelect={() => onValueChange(opt.value)}
                    className={cn(
                      'flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-semibold cursor-pointer transition-colors outline-none',
                      isSelected
                        ? 'bg-indigo-600 text-white font-bold shadow-md shadow-indigo-600/30'
                        : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                    )}
                  >
                    <span className="flex items-center gap-2.5">
                      {opt.icon}
                      <span>{opt.label}</span>
                    </span>
                    {isSelected && <Check className="w-4 h-4 text-white shrink-0" />}
                  </DropdownMenu.Item>
                )
              })}
            </DropdownMenu.Content>
          </DropdownMenu.Portal>
        </DropdownMenu.Root>
      </div>

      {/* Responsive Tabs Pill List (for tablets, desktops & touch swipe) */}
      <TabsPrimitive.Root value={value} onValueChange={onValueChange} className="w-full hidden sm:block">
        <TabsPrimitive.List className="flex flex-wrap items-center gap-1.5 p-1.5 rounded-2xl bg-slate-900 border border-slate-800 w-full shadow-inner">
          {options.map((option) => {
            const isSelected = value === option.value
            return (
              <TabsPrimitive.Trigger
                key={option.value}
                value={option.value}
                className={cn(
                  'relative flex items-center gap-1.5 lg:gap-2 px-2.5 sm:px-3 lg:px-3.5 py-2 rounded-xl text-xs lg:text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 cursor-pointer select-none',
                  isSelected ? 'text-white font-bold' : 'text-slate-400 hover:text-slate-200'
                )}
              >
                {isSelected && (
                  <motion.div
                    layoutId="activeTabPill"
                    className="absolute inset-0 rounded-xl bg-indigo-600 shadow-md shadow-indigo-600/30"
                    transition={{ type: 'spring', bounce: 0.2, duration: 0.5 }}
                  />
                )}
                <span className="relative z-10 flex items-center gap-1.5 lg:gap-2 truncate">
                  {option.icon}
                  <span className="truncate">{option.label}</span>
                </span>
              </TabsPrimitive.Trigger>
            )
          })}
        </TabsPrimitive.List>
      </TabsPrimitive.Root>
    </div>
  )
}
