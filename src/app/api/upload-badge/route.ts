import { NextResponse } from 'next/server'

export async function POST(req: Request) {
  try {
    const formData = await req.formData()
    const file = formData.get('file') as File | null
    const badgeName = (formData.get('name') as string) || 'Custom Badge'

    if (!file) {
      return NextResponse.json({ error: 'No image file provided' }, { status: 400 })
    }

    const pinataJwt = process.env.PINATA_JWT

    if (pinataJwt) {
      // 1. Upload Image to Pinata
      const imageFormData = new FormData()
      imageFormData.append('file', file)
      const imageMetadata = JSON.stringify({ name: `${badgeName}-image` })
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
      const imageCid = imageData.IpfsHash
      const imageIpfsUri = `ipfs://${imageCid}`

      // 2. Upload Metadata JSON to Pinata
      const metadataBody = {
        pinataOptions: { cidVersion: 1 },
        pinataMetadata: { name: `${badgeName}-metadata` },
        pinataContent: {
          name: badgeName,
          symbol: 'NFTKT',
          description: 'NFTicket Soulbound Attendance Badge',
          image: imageIpfsUri,
          attributes: [
            { trait_type: 'Type', value: 'Soulbound Badge' },
            { trait_type: 'Platform', value: 'NFTicket' },
          ],
        },
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
        return NextResponse.json({ error: 'Failed to upload metadata to Pinata IPFS' }, { status: 500 })
      }

      const jsonResult = await jsonRes.json()
      const metadataCid = jsonResult.IpfsHash
      const metadataUri = `ipfs://${metadataCid}`

      return NextResponse.json({
        success: true,
        uri: metadataUri,
        imageUri: `https://gateway.pinata.cloud/ipfs/${imageCid}`,
      })
    } else {
      // Fallback for local testing if PINATA_JWT is not set: create mock IPFS URI
      const buffer = await file.arrayBuffer()
      const base64 = Buffer.from(buffer).toString('base64')
      const mockCid = `QmCustomUpload${Date.now().toString(36)}`
      const mockUri = `ipfs://${mockCid}/metadata.json`

      return NextResponse.json({
        success: true,
        uri: mockUri,
        preview: `data:${file.type};base64,${base64}`,
        warning: 'PINATA_JWT is not set in environment variables. Using fallback mock URI.',
      })
    }
  } catch (error: any) {
    console.error('Upload badge route error:', error)
    return NextResponse.json({ error: error?.message || 'Server upload error' }, { status: 500 })
  }
}
