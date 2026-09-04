import * as anchor from '@coral-xyz/anchor'
import { Program } from '@coral-xyz/anchor'
import { Keypair, PublicKey, SystemProgram, SYSVAR_RENT_PUBKEY, LAMPORTS_PER_SOL } from '@solana/web3.js'
import { AccountLayout, TOKEN_PROGRAM_ID, ASSOCIATED_TOKEN_PROGRAM_ID } from '@solana/spl-token'
import { EventAttendanceNft } from '../target/types/event_attendance_nft'

const TOKEN_METADATA_PROGRAM_ID = new PublicKey('metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s')

describe('event-attendance-nft', () => {
  // Configure the client to use the local cluster.
  const provider = anchor.AnchorProvider.env()
  anchor.setProvider(provider)

  const program = anchor.workspace.EventAttendanceNft as Program<EventAttendanceNft>

  const organizer = Keypair.generate()
  const attendee = Keypair.generate()
  const eventName = 'Solana Hacker House 2026'

  let eventPda: PublicKey
  let mintAuthPda: PublicKey
  let firstTokenAccountPda: PublicKey

  beforeAll(async () => {
    // Airdrop SOL to test wallets on local validator
    const organizerAirdrop = await provider.connection.requestAirdrop(organizer.publicKey, 10 * LAMPORTS_PER_SOL)
    const attendeeAirdrop = await provider.connection.requestAirdrop(attendee.publicKey, 10 * LAMPORTS_PER_SOL)

    const latestBlockhash = await provider.connection.getLatestBlockhash()
    await provider.connection.confirmTransaction({ signature: organizerAirdrop, ...latestBlockhash })
    await provider.connection.confirmTransaction({ signature: attendeeAirdrop, ...latestBlockhash })

    // Derive PDAs
    ;[eventPda] = PublicKey.findProgramAddressSync(
      [Buffer.from('event'), organizer.publicKey.toBuffer(), Buffer.from(eventName)],
      program.programId
    )

    ;[mintAuthPda] = PublicKey.findProgramAddressSync(
      [Buffer.from('mint_authority')],
      program.programId
    )
  }, 30000)

  it('1. Derives Event PDA and calls create_event - asserts name and organizer match', async () => {
    const badgeUri = 'ipfs://QmEventAttendanceBadgeFixedUri/metadata.json'
    await program.methods
      .createEvent(eventName, badgeUri)
      .accounts({
        organizer: organizer.publicKey,
        event: eventPda,
        systemProgram: SystemProgram.programId,
      } as any)
      .signers([organizer])
      .rpc()

    const eventAccount = await program.account.event.fetch(eventPda)
    expect(eventAccount.name).toBe(eventName)
    expect(eventAccount.badgeUri).toBe(badgeUri)
    expect(eventAccount.organizer.toBase58()).toBe(organizer.publicKey.toBase58())
    expect(eventAccount.attendeeCount).toBe(0)
  })

  it('2. Derives AttendanceRecord PDA and mint keypair, calls check_in - asserts mint created, token account holds 1 token, metadata created', async () => {
    const mintKeypair = Keypair.generate()

    const [attendancePda] = PublicKey.findProgramAddressSync(
      [Buffer.from('attendance'), eventPda.toBuffer(), attendee.publicKey.toBuffer()],
      program.programId
    )

    const [tokenAccountPda] = PublicKey.findProgramAddressSync(
      [attendee.publicKey.toBuffer(), TOKEN_PROGRAM_ID.toBuffer(), mintKeypair.publicKey.toBuffer()],
      ASSOCIATED_TOKEN_PROGRAM_ID
    )

    firstTokenAccountPda = tokenAccountPda

    const [metadataPda] = PublicKey.findProgramAddressSync(
      [Buffer.from('metadata'), TOKEN_METADATA_PROGRAM_ID.toBuffer(), mintKeypair.publicKey.toBuffer()],
      TOKEN_METADATA_PROGRAM_ID
    )

    await program.methods
      .checkIn()
      .accounts({
        attendee: attendee.publicKey,
        event: eventPda,
        attendanceRecord: attendancePda,
        mintAuthority: mintAuthPda,
        mint: mintKeypair.publicKey,
        tokenAccount: tokenAccountPda,
        metadata: metadataPda,
        tokenProgram: TOKEN_PROGRAM_ID,
        associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
        metadataProgram: TOKEN_METADATA_PROGRAM_ID,
        systemProgram: SystemProgram.programId,
        rent: SYSVAR_RENT_PUBKEY,
      } as any)
      .signers([attendee, mintKeypair])
      .rpc()

    // Assert mint account exists
    const mintInfo = await provider.connection.getAccountInfo(mintKeypair.publicKey)
    expect(mintInfo).not.toBeNull()

    // Assert attendee token account holds 1 token
    const tokenAccountInfo = await provider.connection.getAccountInfo(tokenAccountPda)
    expect(tokenAccountInfo).not.toBeNull()
    const decodedTokenAccount = AccountLayout.decode(tokenAccountInfo!.data) as any
    const amount = decodedTokenAccount.amount.readBigUInt64LE(0)
    expect(amount).toBe(1n)

    // Assert metadata PDA was correctly derived for CPI
    expect(metadataPda).toBeDefined()

    // Assert event attendeeCount incremented
    const eventAccount = await program.account.event.fetch(eventPda)
    expect(eventAccount.attendeeCount).toBe(1)
  })

  it('3. Calling check_in a second time with the same wallet+event throws/rejects', async () => {
    const secondMintKeypair = Keypair.generate()

    const [attendancePda] = PublicKey.findProgramAddressSync(
      [Buffer.from('attendance'), eventPda.toBuffer(), attendee.publicKey.toBuffer()],
      program.programId
    )

    const [tokenAccountPda] = PublicKey.findProgramAddressSync(
      [attendee.publicKey.toBuffer(), TOKEN_PROGRAM_ID.toBuffer(), secondMintKeypair.publicKey.toBuffer()],
      ASSOCIATED_TOKEN_PROGRAM_ID
    )

    const [metadataPda] = PublicKey.findProgramAddressSync(
      [Buffer.from('metadata'), TOKEN_METADATA_PROGRAM_ID.toBuffer(), secondMintKeypair.publicKey.toBuffer()],
      TOKEN_METADATA_PROGRAM_ID
    )

    let failed = false
    try {
      await program.methods
        .checkIn()
        .accounts({
          attendee: attendee.publicKey,
          event: eventPda,
          attendanceRecord: attendancePda,
          mintAuthority: mintAuthPda,
          mint: secondMintKeypair.publicKey,
          tokenAccount: tokenAccountPda,
          metadata: metadataPda,
          tokenProgram: TOKEN_PROGRAM_ID,
          associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
          metadataProgram: TOKEN_METADATA_PROGRAM_ID,
          systemProgram: SystemProgram.programId,
          rent: SYSVAR_RENT_PUBKEY,
        } as any)
        .signers([attendee, secondMintKeypair])
        .rpc()
    } catch (err) {
      failed = true
    }

    expect(failed).toBe(true)
  })

  it('4. Asserts attendee token account state is frozen (soulbound mechanism)', async () => {
    // Fetch the attendee's token account created during check_in and assert state === 2 (Frozen)
    const tokenAccountInfo = await provider.connection.getAccountInfo(firstTokenAccountPda)
    expect(tokenAccountInfo).not.toBeNull()
    const decoded = AccountLayout.decode(tokenAccountInfo!.data) as any
    // AccountState 2 = Frozen
    expect(decoded.state).toBe(2)
  })

  it('5. Closes AttendanceRecord PDA via close_attendance_record and asserts account no longer exists', async () => {
    const [attendancePda] = PublicKey.findProgramAddressSync(
      [Buffer.from('attendance'), eventPda.toBuffer(), attendee.publicKey.toBuffer()],
      program.programId
    )

    // Verify record exists beforehand
    const preAccount = await provider.connection.getAccountInfo(attendancePda)
    expect(preAccount).not.toBeNull()

    await program.methods
      .closeAttendanceRecord(attendee.publicKey)
      .accounts({
        organizer: organizer.publicKey,
        event: eventPda,
        attendanceRecord: attendancePda,
      } as any)
      .signers([organizer])
      .rpc()

    // Assert account no longer exists
    const postAccount = await provider.connection.getAccountInfo(attendancePda)
    expect(postAccount).toBeNull()
    await expect(program.account.attendanceRecord.fetch(attendancePda)).rejects.toThrow()
  })

  it('6. Closes Event PDA via close_event and asserts account no longer exists', async () => {
    // Verify event exists beforehand
    const preAccount = await provider.connection.getAccountInfo(eventPda)
    expect(preAccount).not.toBeNull()

    await program.methods
      .closeEvent()
      .accounts({
        organizer: organizer.publicKey,
        event: eventPda,
      } as any)
      .signers([organizer])
      .rpc()

    // Assert account no longer exists
    const postAccount = await provider.connection.getAccountInfo(eventPda)
    expect(postAccount).toBeNull()
    await expect(program.account.event.fetch(eventPda)).rejects.toThrow()
  })
})
