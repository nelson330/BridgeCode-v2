import { ArrowRight, Gamepad2, Sparkles, User } from 'lucide-react'
import { motion } from 'motion/react'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '../components/ui/Button'
import { Card } from '../components/ui/Card'
import { Input } from '../components/ui/Input'
import { sound } from '../lib/audio-synth'

const AVATARS = ['🚀', '🦊', '⚡', '🐉', '🦁', '🌟', '🦄', '🤖', '👾', '🎯', '🔥', '💎']

export function JoinGame() {
  const navigate = useNavigate()
  const [pin, setPin] = useState('')
  const [nickname, setNickname] = useState('')
  const [selectedAvatar, setSelectedAvatar] = useState('🚀')

  const handleJoin = (e: React.FormEvent) => {
    e.preventDefault()
    if (!pin || !nickname) return

    sound.playPowerup()
    // Save nickname and avatar in sessionStorage for room persistence
    sessionStorage.setItem('ap_nickname', `${selectedAvatar} ${nickname.trim()}`)
    navigate(`/play/${pin.trim()}`)
  }

  return (
    <div className="flex-1 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-md space-y-6"
      >
        <Card className="p-5 sm:p-8 shadow-2xl border-slate-800 bg-slate-900/90 backdrop-blur-xl">
          <div className="text-center space-y-2 mb-6">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-violet-600 via-indigo-500 to-fuchsia-500 flex items-center justify-center mx-auto text-white shadow-lg shadow-indigo-500/30 mb-3">
              <Gamepad2 className="w-8 h-8" />
            </div>
            <h2 className="font-display font-black text-3xl text-white">Unirse a la Sala</h2>
            <p className="text-xs text-slate-400">
              Ingresa el código PIN proyectado en la pantalla del profesor.
            </p>
          </div>

          <form onSubmit={handleJoin} className="space-y-5">
            {/* PIN Input */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold uppercase tracking-wider text-indigo-400 block text-center">
                Código PIN (6 dígitos)
              </label>
              <Input
                type="text"
                maxLength={6}
                placeholder="123456"
                value={pin}
                onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))}
                className="text-center font-display font-black text-3xl sm:text-4xl tracking-widest text-indigo-300 py-3"
                required
                autoFocus
              />
            </div>

            {/* Avatar Selector */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-300 block">Elige tu Avatar</label>
              <div className="grid grid-cols-6 gap-2">
                {AVATARS.map((emoji) => {
                  const isSelected = selectedAvatar === emoji
                  return (
                    <button
                      key={emoji}
                      type="button"
                      onClick={() => {
                        setSelectedAvatar(emoji)
                        sound.playWheelTick()
                      }}
                      className={`text-2xl p-2 rounded-xl border transition-all cursor-pointer ${
                        isSelected
                          ? 'bg-indigo-600/30 border-indigo-400 scale-110 shadow-lg'
                          : 'bg-slate-950 border-slate-800 hover:border-slate-600'
                      }`}
                    >
                      {emoji}
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Nickname Input */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-slate-400" />
                Tu Nombre o Apodo
              </label>
              <Input
                type="text"
                placeholder="Ej: Sofia García"
                value={nickname}
                onChange={(e) => setNickname(e.target.value)}
                maxLength={20}
                required
              />
            </div>

            <Button
              type="submit"
              variant="game"
              size="xl"
              disabled={pin.length < 4 || !nickname}
              className="w-full gap-2 bg-gradient-to-r from-violet-600 via-indigo-600 to-fuchsia-600 text-white shadow-xl shadow-indigo-500/25"
            >
              <span>¡Entrar a Jugar!</span>
              <ArrowRight className="w-5 h-5" />
            </Button>
          </form>
        </Card>
      </motion.div>
    </div>
  )
}
