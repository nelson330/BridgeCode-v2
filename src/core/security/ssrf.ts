export function isBlockedUrl(urlString: string): boolean {
  try {
    const url = new URL(urlString)

    if (url.protocol !== 'http:' && url.protocol !== 'https:') {
      return true
    }

    const host = url.hostname.toLowerCase()

    if (
      host === 'localhost' ||
      host === '127.0.0.1' ||
      host === '0.0.0.0' ||
      host === '::1' ||
      host.endsWith('.local') ||
      host.endsWith('.internal')
    ) {
      return true
    }

    // IP address checks
    const ipv4Regex = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/
    const match = host.match(ipv4Regex)
    if (match) {
      const b0 = Number.parseInt(match[1] || '0', 10)
      const b1 = Number.parseInt(match[2] || '0', 10)

      // 127.0.0.0/8
      if (b0 === 127) return true
      // 10.0.0.0/8
      if (b0 === 10) return true
      // 172.16.0.0/12
      if (b0 === 172 && b1 >= 16 && b1 <= 31) return true
      // 192.168.0.0/16
      if (b0 === 192 && b1 === 168) return true
      // 169.254.0.0/16 (Link Local / Cloud Metadata)
      if (b0 === 169 && b1 === 254) return true
      // 0.0.0.0/8
      if (b0 === 0) return true
    }

    return false
  } catch {
    return true
  }
}
