# 🎟️ Event Attendance Soulbound NFT dApp

> **Atomically verify event check-ins on Solana with non-transferable (Soulbound) NFT Badges.**

[![Live Demo](https://img.shields.io/badge/Live%20Demo-Vercel-purple?style=for-the-badge&logo=vercel)](https://event-attendance-nft-8y3h.vercel.app/)
[![Solana Devnet](https://img.shields.io/badge/Solana-Devnet-emerald?style=for-the-badge&logo=solana)](https://explorer.solana.com/address/BMwNMcrxpmGu7V9fHpFyGN8dFKt5NrAPNusZSLrUbafz?cluster=devnet)
[![Anchor Framework](https://img.shields.io/badge/Anchor-v0.32-blue?style=for-the-badge)](https://www.anchor-lang.com/)

---

## 🌐 Live Demo & Deployment

- **🚀 Live Web Application:** [https://event-attendance-nft-8y3h.vercel.app/](https://event-attendance-nft-8y3h.vercel.app/)
- **⚡ Solana Program ID (`Devnet`):** [`BMwNMcrxpmGu7V9fHpFyGN8dFKt5NrAPNusZSLrUbafz`](https://explorer.solana.com/address/BMwNMcrxpmGu7V9fHpFyGN8dFKt5NrAPNusZSLrUbafz?cluster=devnet)
- **📦 Fixed IPFS Metadata URI:** `ipfs://QmEventAttendanceBadgeFixedUri/metadata.json`

---

## 🌟 What is this Project?

**Event Attendance NFT** is a decentralized web application built on the Solana blockchain. It allows event organizers to host events on-chain and enables attendees to claim proof-of-attendance digital badges.

### Why "Soulbound"?
Unlike standard NFTs, **Soulbound Badges cannot be sold, transferred, or traded.** Once minted to an attendee's Solana wallet, the token account is automatically frozen by an on-chain Program Derived Address (PDA) authority (`mint_authority`). This guarantees authentic, non-falsifiable proof of participation for conferences, hackathons, and workshops.

---

## ✨ Key Features

- 🔒 **Soulbound NFT Protection:** Token accounts are automatically frozen on-chain during check-in, preventing badge transfers between wallets.
- 🛡️ **Anti-Duplicate PDA Check:** Attendees can only check in **once per event**. Re-check-in attempts are rejected at the smart contract level.
- 🎨 **Metaplex Token Metadata Integration:** Attaches rich metadata (Name, Symbol, IPFS URI) directly to the badge NFT on-chain.
- 📱 **100% Responsive Design:** Fully optimized across Mobile (375px), Tablet (768px), and Desktop (1440px+) screens.
- ⚡ **Automated Devnet Environment:** Built-in cluster detection & 1-click Devnet switcher for seamless testing.

---

## 🚀 How to Use (User Guide)

### Step 1: Connect Wallet & Get Devnet SOL
1. Open the [Live Application](https://event-attendance-nft-8y3h.vercel.app/).
2. Click **Connect Wallet** (supports Phantom, Solflare, etc.).
3. Ensure your wallet network is set to **Solana Devnet**. *(Need test SOL? Get free Devnet SOL from [Solana Faucet](https://faucet.solana.com/)).*

### Step 2: Create an Event (Organizers)
1. Under **Organizer: Create Event**, enter an Event Name (e.g. `Solana Breakpoint 2026`).
2. Click **Create Event Account** and approve the transaction in your wallet.

### Step 3: Check-In & Mint Soulbound Badge (Attendees)
1. Under **Attendee: Check-In**, enter the exact Event Name.
2. Click **Check In & Mint Badge**.
3. Approve the transaction. Your Soulbound Badge NFT will be minted directly to your wallet and instantly frozen!
4. Check your Phantom wallet under the **Collectibles** tab to view your Soulbound badge.

---

## 🛠️ Architecture & Smart Contract Design

### On-Chain Account Structure (Anchor / Rust)

1. **`Event` PDA**: Stores the event name and organizer public key.
   - Seeds: `[b"event", organizer.key(), event_name.as_bytes()]`
2. **`AttendanceRecord` PDA**: Tracks whether a user checked into an event.
   - Seeds: `[b"attendance", event.key(), attendee.key()]`
3. **`MintAuthority` PDA**: Shared program authority that holds Freeze Authority over minted badges.
   - Seeds: `[b"mint_authority"]`

```
User (Attendee) ──► check_in() ──► Mints NFT Badge (Supply: 1)
                                      │
                                      ▼
                       Freeze Account via CPI (mint_authority)
                                      │
                                      ▼
                    Token Account Frozen 🔒 (Soulbound Protection)
```

---

## 💻 Local Developer Setup

### Prerequisites
- Node.js `v18+` or `v20+`
- Rust & Solana CLI (`solana-cli`)
- Anchor Framework `v0.32.1`

### 1. Clone & Install Dependencies

```bash
git clone https://github.com/Akshat0125/event-attendance-nft.git
cd event-attendance-nft
npm install
```

### 2. Configure Environment

Create a `.env.local` file in the root directory:

```env
NEXT_PUBLIC_PROGRAM_ID=BMwNMcrxpmGu7V9fHpFyGN8dFKt5NrAPNusZSLrUbafz
NEXT_PUBLIC_RPC_ENDPOINT=https://api.devnet.solana.com
NEXT_PUBLIC_BADGE_URI=ipfs://QmEventAttendanceBadgeFixedUri/metadata.json
```

### 3. Run Frontend Locally

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### 4. Build & Test Solana Smart Contract

```bash
# Build Anchor Rust Program
cargo build-sbf --manifest-path anchor/programs/event-attendance-nft/Cargo.toml

# Run Anchor Spec Tests
npm run anchor-test
```

---

## 📜 Tech Stack

- **Frontend:** Next.js 16 (App Router), React 19, Tailwind CSS, Lucide Icons, Sonner Toasts
- **Blockchain:** Solana Web3.js, `@coral-xyz/anchor`, `@solana/wallet-adapter-react`
- **Smart Contract:** Rust, Anchor Framework, SPL Token Program, Metaplex Token Metadata
- **Hosting:** Vercel

---

## 📄 License

MIT License. Designed for Solana Builders and Community Events.
