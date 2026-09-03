export interface EventMetadata {
  name: string
  description?: string
  location?: string
  eventDate?: string
  startTime?: string
  endTime?: string
  eventType?: string
  capacity?: number
  badgeImage?: string
  image?: string
  symbol?: string
}

/**
 * Converts IPFS URI (ipfs://...) or standard HTTP URL to a browser-fetchable gateway URL.
 */
export function getGatewayUrl(uri: string): string {
  if (!uri) return ''
  if (uri.startsWith('ipfs://')) {
    const cid = uri.replace('ipfs://', '').replace('/metadata.json', '')
    return `https://gateway.pinata.cloud/ipfs/${cid}`
  }
  return uri
}

/**
 * Fetches and parses EventMetadata from an IPFS or HTTP URI with fallback.
 */
export async function fetchEventMetadata(badgeUri: string): Promise<EventMetadata | null> {
  if (!badgeUri) return null

  // If badgeUri is directly a preset URI or image URI
  if (badgeUri.endsWith('.png') || badgeUri.endsWith('.jpg') || badgeUri.endsWith('.jpeg') || badgeUri.endsWith('.svg')) {
    return {
      name: 'Soulbound Badge',
      badgeImage: getGatewayUrl(badgeUri),
      image: getGatewayUrl(badgeUri),
    }
  }

  try {
    const url = getGatewayUrl(badgeUri)
    const res = await fetch(url, { next: { revalidate: 300 } })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)

    const data = await res.json()
    const badgeImg = data.badgeImage || data.image || ''

    return {
      name: data.name || 'Event Attendance',
      description: data.description || '',
      location: data.location || '',
      eventDate: data.eventDate || '',
      startTime: data.startTime || '',
      endTime: data.endTime || '',
      eventType: data.eventType || 'Event',
      capacity: typeof data.capacity === 'number' ? data.capacity : data.capacity ? parseInt(data.capacity) : undefined,
      badgeImage: getGatewayUrl(badgeImg),
      image: getGatewayUrl(badgeImg),
      symbol: data.symbol || 'NFTKT',
    }
  } catch (err) {
    console.warn('Failed to fetch event metadata JSON from IPFS:', badgeUri, err)
    return {
      name: 'Event Attendance',
      badgeImage: getGatewayUrl(badgeUri),
      image: getGatewayUrl(badgeUri),
    }
  }
}

/**
 * Formats a public key into truncated wallet string (e.g. 7xK...92A)
 */
export function truncateWallet(pubkey?: string, start = 4, end = 4): string {
  if (!pubkey) return ''
  if (pubkey.length <= start + end) return pubkey
  return `${pubkey.slice(0, start)}...${pubkey.slice(-end)}`
}

/**
 * Calculates event status (UPCOMING, LIVE, COMPLETED) based on eventDate.
 * Returns null if no date is provided.
 */
export function getEventStatus(
  eventDate?: string,
  startTime?: string,
  endTime?: string
): 'UPCOMING' | 'LIVE' | 'COMPLETED' | null {
  if (!eventDate) return null

  try {
    const now = new Date()
    const todayStr = now.toISOString().split('T')[0]

    // Compare date strings (YYYY-MM-DD)
    if (eventDate === todayStr) {
      return 'LIVE'
    }

    const eventDateTime = new Date(`${eventDate}T${startTime || '00:00'}`)
    if (isNaN(eventDateTime.getTime())) {
      // Fallback simple string comparison
      if (eventDate > todayStr) return 'UPCOMING'
      if (eventDate < todayStr) return 'COMPLETED'
      return 'LIVE'
    }

    if (eventDate > todayStr) return 'UPCOMING'
    if (eventDate < todayStr) return 'COMPLETED'
    return 'LIVE'
  } catch {
    return null
  }
}
