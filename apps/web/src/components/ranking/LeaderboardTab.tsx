import { motion } from 'framer-motion'
import {
  Award,
  CheckCircle2,
  ChevronRight,
  Crown,
  Flame,
  Medal,
  Sparkles,
  Trophy,
  Users,
  Zap,
} from 'lucide-react'
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { apiFetch } from '../../lib/api'
import { Badge } from '../ui/Badge'
import { Card } from '../ui/Card'
import { CustomSelect } from '../ui/Select'

interface LeaderboardUser {
  userId: string
  username: string
  displayName: string
  totalPoints: number
  correctCount: number
  totalAnswers: number
  accuracy: number
  level: number
  badges: string[]
}

interface LeaderboardTabProps {
  currentClassId?: string
  classes?: Array<{ id: string; name: string }>
}

export function LeaderboardTab({ currentClassId, classes = [] }: LeaderboardTabProps) {
  const { t } = useTranslation()
  const [selectedClassId, setSelectedClassId] = useState<string>(currentClassId || '')
  const [leaderboard, setLeaderboard] = useState<LeaderboardUser[]>([])
  const [_loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    const url = selectedClassId ? `/api/ranking?classId=${selectedClassId}` : '/api/ranking'

    apiFetch<{ leaderboard: LeaderboardUser[] }>(url)
      .then((res) => {
        setLeaderboard(res.leaderboard || [])
      })
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [selectedClassId])

  const top3 = leaderboard.slice(0, 3)
  const _rest = leaderboard.slice(3)

  return (
    <div className="space-y-8">
      {/* Header & Filter */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h3 className="font-display font-black text-2xl text-white flex items-center gap-2">
            <Trophy className="w-6 h-6 text-amber-400" />
            <span>{t('ranking.title')}</span>
          </h3>
          <p className="text-xs text-slate-400">{t('ranking.subtitle')}</p>
        </div>

        {classes.length > 0 && (
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 w-full sm:w-auto">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider shrink-0">
              Filtrar:
            </span>
            <div className="w-full sm:w-52 max-w-full">
              <CustomSelect
                value={selectedClassId}
                onChange={(val) => setSelectedClassId(val)}
                options={[
                  { value: '', label: t('ranking.filterAll') },
                  ...classes.map((c) => ({
                    value: c.id,
                    label: c.name,
                  })),
                ]}
              />
            </div>
          </div>
        )}
      </div>

      {/* Top 3 Podium Cards */}
      {top3.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6 pt-4 items-end">
          {/* #2 Silver (Left) */}
          {top3[1] && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="p-5 sm:p-6 rounded-3xl bg-gradient-to-b from-slate-800/80 to-slate-900/90 border border-slate-700/80 text-center space-y-3 relative shadow-xl"
            >
              <div className="w-12 h-12 rounded-2xl bg-slate-700 border border-slate-500 flex items-center justify-center mx-auto text-slate-200">
                <Medal className="w-6 h-6 text-slate-200" />
              </div>
              <div>
                <h4 className="font-display font-bold text-lg text-white">{top3[1].displayName}</h4>
                <span className="text-xs text-slate-400 font-mono">@{top3[1].username}</span>
              </div>
              <div className="font-display font-black text-2xl text-slate-300">
                {top3[1].totalPoints} <span className="text-xs text-slate-500">pts</span>
              </div>
              <Badge variant="primary" className="text-[10px]">
                Nivel {top3[1].level} • {top3[1].accuracy}% Aciertos
              </Badge>
            </motion.div>
          )}

          {/* #1 Gold (Center) */}
          {top3[0] && (
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-6 sm:p-8 rounded-3xl bg-gradient-to-b from-amber-950/40 via-slate-900/90 to-slate-900 border-2 border-amber-400/60 text-center space-y-4 relative shadow-2xl shadow-amber-500/10 md:-translate-y-4"
            >
              <div className="absolute -top-5 left-1/2 -translate-x-1/2 bg-gradient-to-r from-amber-400 to-yellow-500 text-slate-950 text-xs font-black px-4 py-1 rounded-full uppercase tracking-widest shadow-lg flex items-center gap-1">
                <Crown className="w-3.5 h-3.5 fill-current" />
                <span>{t('ranking.podium1st')}</span>
              </div>

              <div className="w-16 h-16 rounded-3xl bg-gradient-to-tr from-amber-500 to-yellow-300 border-2 border-amber-200 flex items-center justify-center mx-auto text-slate-950 shadow-xl shadow-amber-500/30">
                <Crown className="w-8 h-8 fill-slate-950 text-slate-950" />
              </div>
              <div>
                <h3 className="font-display font-black text-2xl text-white">{top3[0].displayName}</h3>
                <span className="text-xs text-amber-300 font-mono">@{top3[0].username}</span>
              </div>
              <div className="font-display font-black text-4xl text-amber-400">
                {top3[0].totalPoints} <span className="text-sm text-slate-400">pts</span>
              </div>
              <Badge variant="warning" className="text-xs font-bold">
                Nivel {top3[0].level} • {top3[0].accuracy}% Aciertos
              </Badge>
            </motion.div>
          )}

          {/* #3 Bronze (Right) */}
          {top3[2] && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="p-5 sm:p-6 rounded-3xl bg-gradient-to-b from-amber-950/20 to-slate-900/90 border border-amber-900/60 text-center space-y-3 relative shadow-xl"
            >
              <div className="w-12 h-12 rounded-2xl bg-amber-950 border border-amber-700 flex items-center justify-center mx-auto text-amber-500">
                <Medal className="w-6 h-6 text-amber-500" />
              </div>
              <div>
                <h4 className="font-display font-bold text-lg text-white">{top3[2].displayName}</h4>
                <span className="text-xs text-slate-400 font-mono">@{top3[2].username}</span>
              </div>
              <div className="font-display font-black text-2xl text-amber-600">
                {top3[2].totalPoints} <span className="text-xs text-slate-500">pts</span>
              </div>
              <Badge variant="primary" className="text-[10px]">
                Nivel {top3[2].level} • {top3[2].accuracy}% Aciertos
              </Badge>
            </motion.div>
          )}
        </div>
      )}
      {/* Full Leaderboard Table */}
      <div className="rounded-3xl bg-slate-900/90 border border-slate-800 overflow-hidden shadow-xl">
        <div className="p-4 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Trophy className="w-4 h-4 text-amber-400" />
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              {t('ranking.tableStudent')}
            </span>
          </div>
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
            {t('ranking.tablePoints')}
          </span>
        </div>

        {leaderboard.length === 0 ? (
          <div className="p-12 text-center text-slate-500 text-sm">{t('ranking.empty')}</div>
        ) : (
          <div className="divide-y divide-slate-800/60">
            {leaderboard.map((user, idx) => {
              const rank = idx + 1
              return (
                <div
                  key={user.userId}
                  className={`p-4 flex items-center justify-between transition-colors ${
                    rank <= 3 ? 'bg-slate-800/30' : 'hover:bg-slate-800/20'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span
                      className={`w-7 h-7 rounded-lg flex items-center justify-center font-bold text-xs ${
                        rank === 1
                          ? 'bg-amber-500/20 text-amber-300 border border-amber-400/40'
                          : rank === 2
                            ? 'bg-slate-700 text-slate-200'
                            : rank === 3
                              ? 'bg-amber-900/40 text-amber-500'
                              : 'bg-slate-800 text-slate-500'
                      }`}
                    >
                      {rank}
                    </span>
                    <div>
                      <span className="font-bold text-sm text-white block">{user.displayName}</span>
                      <span className="text-[11px] text-slate-400 font-mono">@{user.username}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    {/* Badges list */}
                    <div className="hidden sm:flex items-center gap-1">
                      {user.badges.map((b) => (
                        <span
                          key={b}
                          className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-300 border border-indigo-500/30 font-semibold inline-flex items-center gap-1"
                          title={b}
                        >
                          <Award className="w-3 h-3 text-amber-400" />
                          <span>{b}</span>
                        </span>
                      ))}
                    </div>

                    <div className="text-right">
                      <span className="font-display font-extrabold text-base text-amber-400 block">
                        {user.totalPoints} pts
                      </span>
                      <span className="text-[10px] text-slate-400">
                        Nivel {user.level} • {user.accuracy}%
                      </span>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
