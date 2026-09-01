import type { ParticipantState } from '@shared/contracts/games'
import { Crown, Medal, Trophy } from 'lucide-react'
import { motion } from 'motion/react'

interface ScoreboardOverlayProps {
  leaderboard: ParticipantState[]
  mode?: string
}

const TEAM_COLORS: Record<string, string> = {
  red: 'bg-rose-500',
  blue: 'bg-blue-500',
  green: 'bg-emerald-500',
  yellow: 'bg-amber-500',
}

export function ScoreboardOverlay({ leaderboard, mode }: ScoreboardOverlayProps) {
  const top5 = leaderboard.slice(0, 5)

  // For teams mode, aggregate by team
  const isTeams = mode === 'teams' || mode === 'battle'
  const teamScores = isTeams ? aggregateTeamScores(leaderboard) : null

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="w-full max-w-xl p-6 rounded-2xl bg-slate-900/90 border border-indigo-500/30 shadow-2xl space-y-4"
    >
      <h3 className="text-xs font-bold uppercase tracking-wider text-indigo-400 flex items-center gap-1.5 text-center justify-center">
        <Trophy className="w-4 h-4" />
        Clasificación
      </h3>

      {/* Team scores for teams/battle mode */}
      {teamScores && (
        <div className="grid grid-cols-2 gap-2 pb-3 border-b border-slate-800">
          {teamScores.map((ts) => (
            <div
              key={ts.team}
              className={`p-3 rounded-xl border-2 text-center ${
                ts.team === teamScores[0]?.team
                  ? 'border-amber-400 bg-amber-500/10'
                  : 'border-slate-700 bg-slate-800/50'
              }`}
            >
              <div
                className={`w-4 h-4 rounded-full ${TEAM_COLORS[ts.team] || 'bg-slate-500'} mx-auto mb-1`}
              />
              <span className="text-xs font-bold text-white capitalize">{ts.team}</span>
              <div className="font-display font-black text-lg text-white">{ts.score}</div>
            </div>
          ))}
        </div>
      )}

      {/* Individual leaderboard */}
      <div className="space-y-2">
        {top5.map((p, idx) => {
          const rankIcons = [
            <Crown key="crown" className="w-5 h-5 text-amber-400" />,
            <Medal key="silver" className="w-5 h-5 text-slate-300" />,
            <Medal key="bronze" className="w-5 h-5 text-amber-700" />,
          ]

          return (
            <motion.div
              key={p.displayName}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: idx * 0.1 }}
              className={`flex items-center gap-3 p-3 rounded-xl border ${
                idx === 0 ? 'bg-amber-500/10 border-amber-500/30' : 'bg-slate-800/50 border-slate-700'
              }`}
            >
              <div className="w-8 flex items-center justify-center">
                {idx < 3 ? (
                  rankIcons[idx]
                ) : (
                  <span className="text-sm font-bold text-slate-500">#{idx + 1}</span>
                )}
              </div>
              <span className="flex-1 font-bold text-white text-sm truncate">{p.displayName}</span>
              {p.team && <div className={`w-3 h-3 rounded-full ${TEAM_COLORS[p.team] || 'bg-slate-500'}`} />}
              <span className="font-display font-black text-indigo-400 text-sm">{p.score}</span>
            </motion.div>
          )
        })}
      </div>
    </motion.div>
  )
}

function aggregateTeamScores(leaderboard: ParticipantState[]): Array<{ team: string; score: number }> {
  const map = new Map<string, number>()
  for (const p of leaderboard) {
    if (p.team) {
      map.set(p.team, (map.get(p.team) || 0) + p.score)
    }
  }
  return Array.from(map.entries())
    .map(([team, score]) => ({ team, score }))
    .sort((a, b) => b.score - a.score)
}
