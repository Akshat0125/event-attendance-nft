import { AnchorProvider, Program } from '@coral-xyz/anchor'
import { PublicKey } from '@solana/web3.js'
import EventAttendanceNftIDL from '../target/idl/event_attendance_nft.json'
import type { EventAttendanceNft } from '../target/types/event_attendance_nft'

export { EventAttendanceNft, EventAttendanceNftIDL }

export const EVENT_ATTENDANCE_NFT_PROGRAM_ID = new PublicKey(
  process.env.NEXT_PUBLIC_PROGRAM_ID || EventAttendanceNftIDL.address
)

export function getEventAttendanceNftProgram(
  provider: AnchorProvider,
  address?: PublicKey
): Program<EventAttendanceNft> {
  return new Program(
    {
      ...EventAttendanceNftIDL,
      address: address ? address.toBase58() : EVENT_ATTENDANCE_NFT_PROGRAM_ID.toBase58(),
    } as EventAttendanceNft,
    provider
  )
}
