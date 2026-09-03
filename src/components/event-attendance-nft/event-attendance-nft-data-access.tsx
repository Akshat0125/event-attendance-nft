'use client'

import { getEventAttendanceNftProgram, EVENT_ATTENDANCE_NFT_PROGRAM_ID } from '@project/anchor'
import { useConnection, useWallet } from '@solana/wallet-adapter-react'
import { PublicKey, Keypair, SystemProgram, SYSVAR_RENT_PUBKEY } from '@solana/web3.js'
import { TOKEN_PROGRAM_ID, ASSOCIATED_TOKEN_PROGRAM_ID } from '@solana/spl-token'
import { useMutation, useQuery } from '@tanstack/react-query'
import { useMemo } from 'react'
import { useCluster } from '../cluster/cluster-data-access'
import { useAnchorProvider } from '../solana/solana-provider'
import { useTransactionToast } from '../use-transaction-toast'
import { toast } from 'sonner'

export const TOKEN_METADATA_PROGRAM_ID = new PublicKey('metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s')

export function useEventAttendanceNftProgram() {
  const { connection } = useConnection()
  const { cluster } = useCluster()
  const transactionToast = useTransactionToast()
  const provider = useAnchorProvider()
  const wallet = useWallet()

  const programId = useMemo(() => {
    return process.env.NEXT_PUBLIC_PROGRAM_ID
      ? new PublicKey(process.env.NEXT_PUBLIC_PROGRAM_ID)
      : EVENT_ATTENDANCE_NFT_PROGRAM_ID
  }, [])

  const program = useMemo(() => {
    if (!provider) return null
    return getEventAttendanceNftProgram(provider, programId)
  }, [provider, programId])

  const createEvent = useMutation({
    mutationKey: ['event-attendance-nft', 'create-event', { cluster }],
    mutationFn: async ({ name, badgeUri, organizer }: { name: string; badgeUri: string; organizer: PublicKey }) => {
      if (!program || !wallet.sendTransaction) {
        toast.error('Wallet not connected! Please connect Phantom wallet first.')
        throw new Error('Wallet not connected')
      }

      const [eventPda] = PublicKey.findProgramAddressSync(
        [Buffer.from('event'), organizer.toBuffer(), Buffer.from(name)],
        programId
      )

      // Pre-check if event account already exists
      const existing = await connection.getAccountInfo(eventPda)
      if (existing !== null) {
        toast.info(`Event "${name}" already exists on-chain! You can proceed directly to Check-In.`)
        return { signature: '', eventPda, alreadyExists: true }
      }

      const transaction = await program.methods
        .createEvent(name, badgeUri)
        .accounts({
          organizer,
          event: eventPda,
          systemProgram: SystemProgram.programId,
        } as any)
        .transaction()

      transaction.feePayer = organizer
      const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash('confirmed')
      transaction.recentBlockhash = blockhash

      const signature = await wallet.sendTransaction(transaction, connection)
      await connection.confirmTransaction({ signature, blockhash, lastValidBlockHeight }, 'confirmed')

      return { signature, eventPda, alreadyExists: false }
    },
    onSuccess: ({ signature, eventPda, alreadyExists }) => {
      if (!alreadyExists && signature) {
        transactionToast(signature)
        toast.success(`Event created successfully! PDA: ${eventPda.toBase58().slice(0, 8)}...`)
      }
    },
    onError: (err: any) => {
      console.error('CreateEvent Error:', err)
      const msg = err?.message || ''
      if (msg.includes('already in use') || err?.logs?.some((l: string) => l.includes('already in use'))) {
        toast.info('Event already exists on-chain! Proceed directly to Check-In.')
      } else if (msg.includes('Blockhash not found') || msg.includes('Simulation failed')) {
        toast.error('Simulation failed: Please ensure cluster is set to "devnet" and your wallet has SOL!')
      } else if (msg.includes('User rejected')) {
        toast.error('Transaction cancelled/rejected in Phantom wallet.')
      } else {
        toast.error(msg || 'Failed to create event')
      }
    },
  })

  const checkIn = useMutation({
    mutationKey: ['event-attendance-nft', 'check-in', { cluster }],
    mutationFn: async ({ eventPda }: { eventPda: PublicKey }) => {
      if (!program || !wallet.publicKey || !wallet.sendTransaction) {
        toast.error('Wallet not connected! Please connect Phantom wallet first.')
        throw new Error('Wallet not connected')
      }

      const attendee = wallet.publicKey
      const mintKeypair = Keypair.generate()

      // Pre-check if event account exists
      const eventAccountInfo = await connection.getAccountInfo(eventPda)
      if (!eventAccountInfo) {
        throw new Error(`Event PDA ${eventPda.toBase58().slice(0, 8)}... does not exist on-chain! Create the event first!`)
      }

      const [attendancePda] = PublicKey.findProgramAddressSync(
        [Buffer.from('attendance'), eventPda.toBuffer(), attendee.toBuffer()],
        programId
      )

      const [mintAuthPda] = PublicKey.findProgramAddressSync(
        [Buffer.from('mint_authority')],
        programId
      )

      const [tokenAccount] = PublicKey.findProgramAddressSync(
        [attendee.toBuffer(), TOKEN_PROGRAM_ID.toBuffer(), mintKeypair.publicKey.toBuffer()],
        ASSOCIATED_TOKEN_PROGRAM_ID
      )

      const [metadataPda] = PublicKey.findProgramAddressSync(
        [Buffer.from('metadata'), TOKEN_METADATA_PROGRAM_ID.toBuffer(), mintKeypair.publicKey.toBuffer()],
        TOKEN_METADATA_PROGRAM_ID
      )

      const transaction = await program.methods
        .checkIn()
        .accounts({
          attendee,
          event: eventPda,
          attendanceRecord: attendancePda,
          mintAuthority: mintAuthPda,
          mint: mintKeypair.publicKey,
          tokenAccount,
          metadata: metadataPda,
          tokenProgram: TOKEN_PROGRAM_ID,
          associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
          metadataProgram: TOKEN_METADATA_PROGRAM_ID,
          systemProgram: SystemProgram.programId,
          rent: SYSVAR_RENT_PUBKEY,
        } as any)
        .transaction()

      transaction.feePayer = attendee
      const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash('confirmed')
      transaction.recentBlockhash = blockhash

      const signature = await wallet.sendTransaction(transaction, connection, {
        signers: [mintKeypair],
      })
      await connection.confirmTransaction({ signature, blockhash, lastValidBlockHeight }, 'confirmed')
      return { signature, mint: mintKeypair.publicKey, attendancePda }
    },
    onSuccess: ({ signature, mint }) => {
      transactionToast(signature)
      toast.success(`Checked in & Soulbound Badge Minted! Mint: ${mint.toBase58().slice(0, 8)}...`)
    },
    onError: (err: any) => {
      console.error('CheckIn Error:', err)
      const msg = err?.message || ''
      if (msg.includes('already in use') || err?.logs?.some((l: string) => l.includes('already in use'))) {
        toast.error('Already checked in for this event! Badges are 1 per attendee.')
      } else if (msg.includes('Blockhash not found') || msg.includes('Simulation failed')) {
        toast.error('Simulation failed: Please ensure cluster is set to "devnet" and your wallet has SOL!')
      } else if (msg.includes('User rejected')) {
        toast.error('Transaction cancelled/rejected in Phantom wallet.')
      } else {
        toast.error(msg || 'Failed to check in')
      }
    },
  })

  return {
    program,
    programId,
    createEvent,
    checkIn,
  }
}
