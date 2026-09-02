import { QRCodeSVG } from 'qrcode.react'

interface QrCodeProps {
  value: string
  size?: number
  level?: 'L' | 'M' | 'Q' | 'H'
  includeMargin?: boolean
  className?: string
}

export function QrCode({
  value,
  size = 160,
  level = 'M',
  includeMargin = false,
  className = '',
}: QrCodeProps) {
  return (
    <div
      className={`p-3.5 bg-white rounded-2xl shadow-xl inline-flex items-center justify-center border border-slate-200 select-none ${className}`}
    >
      <QRCodeSVG
        value={value}
        size={size}
        level={level}
        includeMargin={includeMargin}
        bgColor="#ffffff"
        fgColor="#0f172a"
      />
    </div>
  )
}
