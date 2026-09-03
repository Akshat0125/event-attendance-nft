import { NextResponse } from 'next/server'

export async function POST(req: Request) {
  try {
    const formData = await req.formData()

    const file = formData.get('file') as File | null
    const name = (formData.get('name') as string) || 'Event Attendance'
    const description = (formData.get('description') as string) || ''
    const location = (formData.get('location') as string) || ''
    const eventDate = (formData.get('eventDate') as string) || ''
    const startTime = (formData.get('startTime') as string) || ''
    const endTime = (formData.get('endTime') as string) || ''
    const eventType = (formData.get('eventType') as string) || 'Event'
    const capacityRaw = formData.get('capacity') as string | null
    const capacity = capacityRaw ? parseInt(capacityRaw, 10) : undefined
    const presetBadgeUri = (formData.get('presetBadgeUri') as string) || 'ipfs://QmEventAttendanceBadgeFixedUri/metadata.json'

    const pinataJwt = process.env.PINATA_JWT
    let badgeImageIpfsUri = presetBadgeUri

    if (file && pinataJwt) {
      // 1. Upload Custom Badge Image to Pinata IPFS
      const imageFormData = new FormData()
      imageFormData.append('file', file)
      const imageMetadata = JSON.stringify({ name: `${name}-badge-image` })
      imageFormData.append('pinataMetadata', imageMetadata)

      const imageRes = await fetch('https://api.pinata.cloud/pinning/pinFileToIPFS', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${pinataJwt}`,
        },
        body: imageFormData,
      })

      if (!imageRes.ok) {
        const errorText = await imageRes.text()
        console.error('Pinata image upload error:', errorText)
        return NextResponse.json({ error: 'Failed to upload image to Pinata IPFS' }, { status: 500 })
      }

      const imageData = await imageRes.json()
      badgeImageIpfsUri = `ipfs://${imageData.IpfsHash}`
    }

    // 2. Build Rich Event Metadata Object
    const metadataPayload = {
      name,
      description,
      location,
      eventDate,
      startTime,
      endTime,
      eventType,
      capacity,
      badgeImage: badgeImageIpfsUri,
      image: badgeImageIpfsUri,
      symbol: 'NFTKT',
      attributes: [
        { trait_type: 'Platform', value: 'NFTicket' },
        { trait_type: 'Type', value: 'Soulbound Attendance Badge' },
        ...(location ? [{ trait_type: 'Location', value: location }] : []),
        ...(eventDate ? [{ trait_type: 'Date', value: eventDate }] : []),
        ...(eventType ? [{ trait_type: 'Category', value: eventType }] : []),
      ],
    }

    if (pinataJwt) {
      // 3. Upload Full Event Metadata JSON to Pinata IPFS
      const metadataBody = {
        pinataOptions: { cidVersion: 1 },
        pinataMetadata: { name: `${name}-event-metadata` },
        pinataContent: metadataPayload,
      }

      const jsonRes = await fetch('https://api.pinata.cloud/pinning/pinJSONToIPFS', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${pinataJwt}`,
        },
        body: JSON.stringify(metadataBody),
      })

      if (!jsonRes.ok) {
        const errorText = await jsonRes.text()
        console.error('Pinata metadata JSON upload error:', errorText)
        return NextResponse.json({ error: 'Failed to upload metadata JSON to Pinata IPFS' }, { status: 500 })
      }

      const jsonResult = await jsonRes.json()
      const metadataCid = jsonResult.IpfsHash
      const metadataUri = `ipfs://${metadataCid}`

      return NextResponse.json({
        success: true,
        uri: metadataUri,
        metadata: metadataPayload,
      })
    } else {
      // Fallback for local dev mode when PINATA_JWT is not set
      const mockCid = `QmEventMetadata${Date.now().toString(36)}`
      const mockUri = `ipfs://${mockCid}/metadata.json`

      return NextResponse.json({
        success: true,
        uri: mockUri,
        metadata: metadataPayload,
        warning: 'PINATA_JWT is not set in environment. Generated mock IPFS URI for local testing.',
      })
    }
  } catch (error: any) {
    console.error('Upload event metadata route error:', error)
    return NextResponse.json({ error: error?.message || 'Server upload error' }, { status: 500 })
  }
}
