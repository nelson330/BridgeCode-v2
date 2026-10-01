import { useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Button } from '../components/ui/Button'
import { Card } from '../components/ui/Card'
import { Input } from '../components/ui/Input'
import { sound } from '../lib/audio-synth'
import { ArrowRight, Bot, Bullseye, Cat, Dragon, Gamepad2, Gem, Rocket } from '../lib/icons'

const avatars = [
  { id: 'rocket', label: 'Cohete', icon: Rocket },
  { id: 'cat', label: 'Gato', icon: Cat },
  { id: 'dragon', label: 'Dragón', icon: Dragon },
  { id: 'robot', label: 'Robot', icon: Bot },
  { id: 'target', label: 'Diana', icon: Bullseye },
  { id: 'gem', label: 'Gema', icon: Gem },
]
export function JoinGame() {
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const [pin, setPin] = useState(() => (params.get('pin') || '').replace(/\D/g, '').slice(0, 6))
  const [nickname, setNickname] = useState('')
  const [avatar, setAvatar] = useState('rocket')
  const handleJoin = (event: React.FormEvent) => {
    event.preventDefault()
    if (pin.length !== 6 || !nickname.trim()) return
    sound.playPowerup()
    sessionStorage.setItem('ap_nickname', nickname.trim())
    sessionStorage.setItem('ap_avatar', avatar)
    navigate(`/play/${pin}`)
  }
  return (
    <div className="flex-1 flex items-center justify-center p-4 py-8">
      <Card className="w-full max-w-md p-5 sm:p-8 space-y-6">
        <div className="text-center space-y-3">
          <Gamepad2 className="w-10 h-10 text-accent mx-auto" />
          <h1 className="font-display font-black text-3xl text-foreground">Únete a la aventura</h1>
          <p className="text-sm text-secondary">Escribe el PIN que aparece en la pantalla del docente.</p>
        </div>
        <form onSubmit={handleJoin} className="space-y-5">
          <div className="space-y-2">
            <label htmlFor="game-pin" className="text-sm font-semibold text-secondary">
              Código PIN
            </label>
            <Input
              id="game-pin"
              inputMode="numeric"
              pattern="[0-9]{6}"
              autoComplete="off"
              maxLength={6}
              placeholder="123456"
              value={pin}
              onChange={(event) => setPin(event.target.value.replace(/\D/g, ''))}
              className="text-center text-3xl sm:text-4xl font-black tracking-widest py-3"
              required
              autoFocus
            />
          </div>
          <fieldset className="space-y-2">
            <legend className="text-sm font-semibold text-secondary">Elige tu avatar</legend>
            <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
              {avatars.map(({ id, label, icon: Icon }) => (
                <button
                  key={id}
                  type="button"
                  aria-label={label}
                  aria-pressed={avatar === id}
                  onClick={() => setAvatar(id)}
                  className={`min-h-12 flex items-center justify-center rounded-xl border p-3 ${avatar === id ? 'border-indigo-500 bg-accent-soft text-accent' : 'border-line bg-canvas text-secondary'}`}
                >
                  <Icon className="w-5 h-5" />
                </button>
              ))}
            </div>
          </fieldset>
          <div className="space-y-2">
            <label htmlFor="game-nickname" className="text-sm font-semibold text-secondary">
              Tu nombre o apodo
            </label>
            <Input
              id="game-nickname"
              placeholder="Sofía García"
              value={nickname}
              onChange={(event) => setNickname(event.target.value)}
              maxLength={30}
              required
            />
          </div>
          <Button type="submit" size="lg" disabled={pin.length !== 6 || !nickname.trim()} className="w-full">
            Entrar a jugar
            <ArrowRight className="w-4 h-4" />
          </Button>
        </form>
      </Card>
    </div>
  )
}
