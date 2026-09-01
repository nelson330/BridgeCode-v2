import { BarChart3, CheckCircle2, Clock, Users, XCircle } from 'lucide-react'
import { motion } from 'motion/react'

interface AnswerDistributionChartProps {
  distribution: Array<{ optionIndex: number; count: number; label?: string }>
  stats: {
    accuracyPercent: number
    correctCount: number
    totalCount: number
    avgLatencyMs: number
  } | null
}

const OPTION_COLORS = ['bg-rose-500', 'bg-blue-500', 'bg-amber-500', 'bg-emerald-500']

const OPTION_ICONS = ['▲', '◆', '●', '■']

export function AnswerDistributionChart({ distribution, stats }: AnswerDistributionChartProps) {
  const maxCount = Math.max(...distribution.map((d) => d.count), 1)

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="w-full max-w-xl p-6 rounded-2xl bg-slate-900/90 border border-slate-800 shadow-xl space-y-4"
    >
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-bold uppercase tracking-wider text-indigo-400 flex items-center gap-1.5">
          <BarChart3 className="w-4 h-4" />
          Distribución de Respuestas
        </h3>
        {stats && (
          <div className="flex items-center gap-3 text-xs">
            <span className="flex items-center gap-1 text-emerald-400 font-bold">
              <CheckCircle2 className="w-3.5 h-3.5" />
              {stats.accuracyPercent}%
            </span>
            <span className="flex items-center gap-1 text-slate-400">
              <Clock className="w-3.5 h-3.5" />
              {(stats.avgLatencyMs / 1000).toFixed(1)}s
            </span>
          </div>
        )}
      </div>

      {/* Bar chart */}
      <div className="space-y-2">
        {distribution.map((d) => {
          const pct = d.count > 0 ? Math.round((d.count / Math.max(stats?.totalCount || 1, 1)) * 100) : 0
          const barWidth = maxCount > 0 ? (d.count / maxCount) * 100 : 0

          return (
            <div key={d.optionIndex} className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-slate-800 border border-slate-700 flex items-center justify-center text-sm font-bold text-white shrink-0">
                {OPTION_ICONS[d.optionIndex] || String.fromCharCode(65 + d.optionIndex)}
              </div>
              <div className="flex-1 space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-300 font-semibold truncate max-w-[200px]">
                    {d.label || `Opción ${d.optionIndex + 1}`}
                  </span>
                  <span className="text-slate-400 font-bold">
                    {d.count} ({pct}%)
                  </span>
                </div>
                <div className="h-6 rounded-lg bg-slate-800 overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${barWidth}%` }}
                    transition={{ duration: 0.8, ease: 'easeOut' }}
                    className={`h-full rounded-lg ${OPTION_COLORS[d.optionIndex] || 'bg-indigo-500'}`}
                  />
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Stats footer */}
      {stats && (
        <div className="flex items-center justify-between pt-3 border-t border-slate-800 text-xs text-slate-400">
          <span className="flex items-center gap-1">
            <Users className="w-3.5 h-3.5" />
            {stats.correctCount} correctas de {stats.totalCount} respuestas
          </span>
          <span className="flex items-center gap-1">
            <XCircle className="w-3.5 h-3.5 text-rose-400" />
            {stats.totalCount - stats.correctCount} incorrectas
          </span>
        </div>
      )}
    </motion.div>
  )
}
