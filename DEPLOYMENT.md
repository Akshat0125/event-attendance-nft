# Event Attendance Soulbound NFT - Deployment Guide

This guide details the step-by-step procedure to deploy the **Event Attendance Soulbound NFT** Solana program to **Devnet** and configure the Next.js production frontend.

---

## 1. Prerequisites & Devnet Wallet Funding

Before deploying, ensure you have a Solana wallet keypair generated and funded on Devnet.

1. **Verify or create CLI keypair**:
   ```bash
   solana-keygen new --no-bip39-passphrase -o ~/.config/solana/id.json
   ```

2. **Set CLI cluster to Devnet**:
   ```bash
   solana config set --url https://api.devnet.solana.com
   ```

3. **Fund Devnet wallet**:
   ```bash
   solana airdrop 2
   ```
   *(If rate-limited by the RPC CLI, use a public faucet such as [faucet.solana.com](https://faucet.solana.com) or [solfaucet.com](https://solfaucet.com)).*

4. **Verify balance**:
   ```bash
   solana balance
   ```

---

## 2. Sync Program ID & Build Program

1. **Get Program Keypair Address**:
   ```bash
   solana address -k anchor/target/deploy/event_attendance_nft-keypair.json
   ```
   *Expected Address*: `BMwNMcrxpmGu7V9fHpFyGN8dFKt5NrAPNusZSLrUbafz`

2. **Verify `declare_id!` in `anchor/programs/event-attendance-nft/src/lib.rs`**:
   Ensure line 15 matches:
   ```rust
   declare_id!("BMwNMcrxpmGu7V9fHpFyGN8dFKt5NrAPNusZSLrUbafz");
   ```

3. **Build the Anchor Program**:
   ```bash
   cd anchor
   OPENSSL_NO_VENDOR=1 RUSTFLAGS='--cfg getrandom_backend="custom"' anchor build
   ```

---

## 3. Native LiteSVM Test Suite Verification

Run the native Rust LiteSVM test suite to verify program execution:

```bash
cd anchor/programs/event-attendance-nft
OPENSSL_NO_VENDOR=1 RUSTFLAGS='--cfg getrandom_backend="custom"' cargo test -- --nocapture
```

---

## 4. Deploy Program to Solana Devnet

Run Anchor deploy targeting Devnet:

```bash
cd anchor
anchor deploy --provider.cluster devnet
```

Upon successful deployment, note the Program ID and transaction signature in your terminal.

---

## 5. Configure Next.js Frontend Environment

1. Create or update `.env.local` at the root of the project:
   ```env
   NEXT_PUBLIC_PROGRAM_ID=BMwNMcrxpmGu7V9fHpFyGN8dFKt5NrAPNusZSLrUbafz
   NEXT_PUBLIC_RPC_ENDPOINT=https://api.devnet.solana.com
   NEXT_PUBLIC_IPFS_BADGE_URI=ipfs://bafkreicx64pyp22n77a4a2wnd3gsq2zpxxxxxxxxxx/metadata.json
   ```

2. Test production build:
   ```bash
   npm run build
   ```

3. Launch production server locally:
   ```bash
   npm start
   ```

---

## 6. Security & Architecture Summary

- **Atomic Soulbound Minting**: Check-in, minting, Metaplex metadata attachment, and token account freezing occur inside a single atomic instruction.
- **PDA Ownership**: Mint authority PDA (`mint_authority`) enforces token freezing so badges cannot be transferred across wallets.
- **Anti-Duplicate Check**: `attendance_record` PDA (`[b"attendance", event_pda, attendee]`) enforces 1 badge per attendee per event on-chain.
