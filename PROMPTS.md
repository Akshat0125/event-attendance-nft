# NFTicket — All Antigravity Prompts (Reference)

A running log of every prompt used to build this project, in order. Keep this updated as you go.

---

## 1. Initial vision & setup

```
I'm building a Solana dApp called "Event Attendance NFT" — an event check-in system 
where organizers create events and attendees receive a soulbound (non-transferable) 
NFT badge as proof of attendance. Please build this following the exact design below 
— don't deviate from the architecture, and read all the "known issues" section before 
writing any code so we avoid wasted iterations.

## Vision
- Organizer creates an Event (on-chain record: name, organizer, attendee count)
- Attendee visits a link, connects Phantom, clicks "Check In"
- Check-in atomically: creates an anti-duplicate record, mints an NFT, attaches 
  metadata, and freezes the token account so it can never be transferred
- One badge design (image + metadata) is reused across ALL events — only the 
  on-chain "name" field changes per event, everything else points to one fixed 
  IPFS URI I'll provide

## Tech stack — use these exact versions, no substitutions
- Anchor CLI: 1.0.0
- anchor-lang: "1.0.0"
- anchor-spl: "1.0.0" with features = ["metadata"] — do NOT add mpl-token-metadata 
  as a separate direct dependency, it conflicts with anchor-spl's own pinned version
- Frontend: Next.js + Tailwind + @solana/web3.js + @solana/wallet-adapter-react 
  (Phantom support comes automatically via Wallet Standard)
- Testing: Rust native tests with LiteSVM (not TypeScript/mocha tests)

## Accounts

Event (PDA, seeds = [b"event", organizer.key(), name.as_bytes()]):
- organizer: Pubkey
- name: String (max 50 chars)
- attendee_count: u32
- bump: u8

AttendanceRecord (PDA, seeds = [b"attendance", event.key(), attendee.key()]):
- event: Pubkey
- attendee: Pubkey
- timestamp: i64 (from Clock sysvar)
- bump: u8
(This PDA's existence IS the anti-double-checkin mechanism — init should fail 
naturally on a second check-in attempt for the same wallet+event pair)

Mint authority PDA: a single SHARED authority reused across all events, seeds = 
[b"mint_authority"]. This PDA has no data — it's purely a signer used via 
signer seeds (find_program_address + invoke_signed pattern) for CPI calls. 
It must never be a human-held key.

## Instructions

create_event(name: String):
- Creates the Event PDA, organizer pays and signs

check_in() — no arguments:
- Fails automatically if AttendanceRecord PDA already exists for this wallet+event
- Creates a fresh mint (0 decimals, supply 1), mint authority = the shared PDA above
- Mints 1 token to attendee's associated token account
- CPI into Metaplex Token Metadata: name = event name + " — Attendance Badge", 
  uri = [I'll provide this fixed IPFS URI], is_mutable = false
- Freezes the attendee's token account, signed by the shared PDA via signer seeds
- Increments Event.attendee_count
- All of this must happen in ONE instruction/transaction — atomicity is required 
  so a partial failure can't leave someone checked-in without a badge

## Known issues to avoid preemptively (from prior experience with this exact toolchain)
1. anchor-spl 1.0.0 requires idl-build feature flags for SPL/metadata types — add 
   idl-build = ["anchor-lang/idl-build"] to the program's Cargo.toml [features]
2. Anchor 1.0.0 changed CpiContext::new() — it now takes a Pubkey (e.g. Token::id(), 
   Metadata::id()) as the first argument, NOT an AccountInfo. Use this pattern 
   everywhere a CPI context is built.
3. getrandom v0.3.x may appear as a transitive dependency (via cmov/curve25519-dalek) 
   and fail to compile for the SBF target with "target is not supported". If this 
   happens, add getrandom = { version = "0.3", features = ["custom"] } as a direct 
   dependency, implement a stub __getrandom_v03_custom function gated on 
   #[cfg(target_os = "solana")], and add rustflags = ["--cfg", 
   "getrandom_backend=\"custom\""] to .cargo/config.toml at the workspace root.
4. Test files must import the program via its Cargo.toml package/crate name (e.g. 
   event_attendance_nft::ID), not the pub mod name inside lib.rs, if they differ.
5. Call svm.expire_blockhash() before every transaction when writing multiple 
   sequential transactions in a LiteSVM test.
6. Do not add mpl-token-metadata as a direct Cargo dependency — only use it via 
   anchor_spl::metadata::mpl_token_metadata re-exports, to avoid version conflicts 
   with anchor-spl's own pin.

## What I want from you right now
Set up the program structure (Event + AttendanceRecord account structs, both 
instructions) and a LiteSVM test file covering: successful check-in, duplicate 
check-in rejection, and confirming the token account is frozen after check-in. 
Don't touch the frontend yet — I'll ask for that separately once the program 
builds and tests pass.
```

---

## 2. Reviewing Antigravity's implementation plan (corrections before coding)

```
Before you start implementing, three corrections/additions to the plan:

1. MINT FREEZE AUTHORITY — the plan says the mint_authority PDA freezes the token 
   account, but doesn't specify that the Mint account itself must be created with 
   its freeze_authority explicitly set to that same PDA. If freeze_authority isn't 
   set at mint init time, the freeze_account CPI will fail with an authorization 
   error. When you init the Mint account, use:
   mint::authority = mint_authority (the PDA)
   mint::freeze_authority = mint_authority (the same PDA)
   Both must point to the PDA — not two different authorities.

2. CHECK_IN ACCOUNTS STRUCT — make sure the Accounts struct for check_in explicitly 
   includes ALL of these, not just the ones central to the logic: token_program, 
   associated_token_program, token_metadata_program, system_program, and the rent 
   sysvar. Missing any one of these will cause a CPI to fail with an 
   AccountNotEnoughKeys-style error, and it's an easy one to miss since it's not 
   "business logic," just plumbing.

3. GETRANDOM STUB SIGNATURE — confirm the __getrandom_v03_custom function is written 
   as exactly:
   #[no_mangle]
   unsafe extern "Rust" fn __getrandom_v03_custom(dest: *mut u8, len: usize) -> Result<(), getrandom::Error>
   Both #[no_mangle] AND the unsafe extern "Rust" signature are required together — 
   missing either one will cause a linker error instead of a clean compile.

Also — before writing any code, run these two commands and paste me the output so 
we lock in exact versions and there's no ambiguity mid-build:

anchor --version
solana --version

Then use these EXACT dependency versions in Cargo.toml (don't let cargo auto-resolve 
to whatever's newest, since that's what caused version conflicts before):
- anchor-lang = "1.0.0"
- anchor-spl = { version = "1.0.0", features = ["metadata"] }
- getrandom = { version = "0.3", features = ["custom"] }
[dev-dependencies]
- litesvm = "0.4"
- solana-sdk = "2"

Confirm all of the above, then proceed with the plan as written.
```

---

## 3. Deployability (devnet program + Vercel frontend)

```
Also — structure this so it's fully deployable, not just locally testable. Specifically:

1. PROGRAM DEPLOYMENT (devnet, since this is a portfolio project, not mainnet):
   - Set Anchor.toml's [provider] cluster to "devnet"
   - After anchor build succeeds and tests pass, the deploy command will be:
     anchor deploy --provider.cluster devnet
   - Make sure the declared program ID in declare_id!() matches what 
     `anchor keys list` outputs BEFORE the final deploy — mismatches here are a 
     common cause of deploy failures
   - I'll need my devnet wallet funded via `solana airdrop 2` (or a web faucet if 
     rate-limited) before deploying — flag this as a manual step for me, don't 
     assume it's done

2. FRONTEND — must be structured to build cleanly with `npm run build` (no 
   dev-only assumptions, no hardcoded localhost URLs). Environment-specific 
   values (program ID, RPC endpoint, fixed IPFS badge URI) should go in a 
   .env.local file, referenced via NEXT_PUBLIC_ prefixed variables so they're 
   available client-side, NOT hardcoded directly in components.

3. Give me a short DEPLOYMENT.md at the project root listing, in order: 
   how to deploy the program to devnet, how to update the frontend's .env with 
   the resulting program ID, and how to build the frontend for production.
```

---

## 4. TypeScript integration test file

```
Also write a TypeScript integration test file at anchor/tests/event-attendance-nft.spec.ts 
(or match whatever naming convention create-solana-dapp's scaffold already uses in 
that folder — check for an existing test file there first and follow its pattern).

This should use @coral-xyz/anchor's TypeScript client against a local validator 
(anchor test spins one up automatically) and cover the same flow end-to-end, but 
from the client side — this is what actually exercises the code path the frontend 
will use, so it needs to exist even though the LiteSVM tests already cover the 
program logic itself.

Cover:
1. Deriving the Event PDA and calling create_event — assert the account's name 
   and organizer field match what was passed in
2. Deriving the AttendanceRecord PDA and mint keypair, calling check_in — assert 
   the mint was created, the attendee's associated token account holds 1 token, 
   and the metadata account's name field includes the event name
3. Calling check_in a second time with the same wallet+event — assert it throws/
   rejects (duplicate attendance record)
4. Fetching the attendee's token account after check-in and asserting its state 
   is "frozen" — this is the one that actually proves the soulbound mechanism 
   works from the client's perspective, not just the program's

Use @solana/web3.js's Keypair.generate() for test wallets, and airdrop SOL to 
them within the test setup (beforeEach or a shared setup function) since a local 
validator resets state each run.

Run this with: anchor test
```

---

## 5. Fixing the getrandom / SBF build error

```
The getrandom fix didn't take effect — cargo-build-sbf is still hitting "target is 
not supported" from getrandom v0.3.4. The --cfg getrandom_backend="custom" flag in 
.cargo/config.toml isn't reaching the actual compiler invocation.

Please fix this properly:

1. Confirm the exact location of .cargo/config.toml — it must be at the Anchor 
   workspace root (same directory as the anchor/Cargo.toml that lists 
   [workspace] members), not the outer project root, since cargo resolves config 
   by walking up from wherever the build command is actually invoked.

2. Cargo's rustflags resolution has a strict priority order: the RUSTFLAGS 
   environment variable, if set, completely overrides [build] rustflags and 
   target.<cfg>.rustflags in config.toml — they are NOT merged. cargo-build-sbf 
   likely sets its own RUSTFLAGS internally for SBF-specific flags, which is 
   silently discarding our custom cfg flag. Change the config.toml entry from the 
   generic [build] table to a target-specific selector instead:

   [target.'cfg(target_os = "solana")']
   rustflags = ["--cfg", "getrandom_backend=\"custom\""]

3. If that still doesn't take effect, as a fallback, show me how to pass the flag 
   directly via environment variable at build time instead of relying on 
   config.toml, preserving whatever RUSTFLAGS cargo-build-sbf already needs:

   export RUSTFLAGS="$RUSTFLAGS --cfg getrandom_backend=\"custom\""
   cargo build-sbf

4. Also double check the __getrandom_v03_custom stub function actually exists in 
   lib.rs with the exact signature:
   #[no_mangle]
   unsafe extern "Rust" fn __getrandom_v03_custom(dest: *mut u8, len: usize) -> Result<(), getrandom::Error>
   gated behind #[cfg(target_os = "solana")] — if this function is missing or 
   misspelled, the cfg flag alone won't fix the error, you'll just get a different 
   linker error instead.

Try option 2 first, tell me what changed, and only fall back to option 3 if 2 
still fails.
```

---

## 6. Diagnosing "User rejected the request" (before the real cause was known)

```
I keep getting "WalletSendTransactionError: User rejected the request" on check_in, 
even though I am not clicking reject — I have 5+ SOL in my devnet wallet, and this 
has persisted across multiple "fixes" you've already suggested. Stop proposing new 
fixes. Instead, do this diagnostic sequence first and report back what you find at 
each step before changing any code:

1. Add a console.log of the fully built transaction object right before 
   wallet.sendTransaction() is called in event-attendance-nft-data-access.tsx 
   (around line 149/157) — log the instructions array, the number of required 
   signers, and the feePayer.

2. Add connection.simulateTransaction(transaction) BEFORE the actual send, and 
   log the full simulation result, including any "err" field and the full "logs" 
   array. This is the most important step — if the simulation itself fails, 
   Phantom may auto-reject without ever truly presenting an approval prompt to 
   the user, which would explain "rejected" happening even when nobody clicks 
   anything.

3. Check whether mintKeypair is actually being passed correctly as a required 
   signer in BOTH the instruction's accounts AND the signers array — a mismatch 
   here can cause Phantom to flag the transaction as malformed/suspicious in its 
   simulation and silently refuse it before showing a real approve/reject choice 
   to the user.

4. Check the browser console (not just the terminal) for any separate warning 
   or error logged by Phantom's extension itself at the moment the popup would 
   normally appear — this is different from the Next.js error boundary output 
   already shown.

5. Confirm React StrictMode or any query/mutation retry logic isn't causing 
   checkIn to fire twice in quick succession — a second invocation while the 
   first is still awaiting wallet approval could cause the first one to be 
   auto-rejected.

Report the simulateTransaction output and console findings from steps 1–4 before 
touching any code. I want to see the actual root cause, not another guess.
```

---

## 7. Following up after Phantom showed "reverted during simulation"

```
The check_in transaction is reverting on-chain — Phantom shows a second popup 
saying the transaction was reverted, and wallet-adapter is just wrapping that 
failure as a generic "WalletSendTransactionError: User rejected the request," 
which was misleading me into thinking it was a click issue. It's not — this is 
a real program-level revert. Do not touch the frontend UI code. Focus only on 
surfacing the real error first.

1. Wrap the wallet.sendTransaction call in a try/catch, and in the catch block, 
   if the error has a getLogs() method (it will, if it's a SendTransactionError 
   from @solana/web3.js), call it and console.log the full array of program logs.
   This will show the actual Anchor error name/code instead of the generic 
   wrapper message.

2. Alternatively/additionally, call connection.simulateTransaction(transaction) 
   right before the real send, and log result.value.err and result.value.logs 
   in full — simulation logs will show exactly which instruction and which 
   require!/constraint failed.

3. Once you have the actual error (it will look like a number, e.g. "Custom 
   program error: 0x1770" or an Anchor error name like "ConstraintSeeds" or 
   "AccountNotInitialized" or similar) — report that exact error to me. Do not 
   guess a fix before seeing it.

4. After identifying the exact error from the logs, propose ONE targeted fix 
   for that specific error only, explain why that error occurs, then stop and 
   let me test again before making any other changes.

Show me the raw log output first before proposing anything.
```

---

## 8. The actual fix: Metaplex "Name too long" (error 0xb)

```
Root cause found — this was never a wallet/signing issue. The check_in instruction 
fails with custom program error 0xb, which is Metaplex Token Metadata's 
NameTooLong error. The program builds the badge's on-chain name as 
event.name + " — Attendance Badge", but Metaplex enforces a strict 32-character 
limit on the metadata name field, and that concatenation exceeds it for any 
reasonably named event.

Please fix in lib.rs:

1. In check_in(), before calling create_metadata_accounts_v3, truncate the final 
   name to fit within 32 bytes total. Reserve space for a short suffix like 
   " Badge" (6 chars), so the event name portion gets truncated to at most 26 
   characters, e.g.:
   
   let suffix = " Badge";
   let max_name_len = 32 - suffix.len();
   let mut truncated_name = event.name.clone();
   truncated_name.truncate(max_name_len);
   let badge_name = format!("{}{}", truncated_name, suffix);

   Make sure this truncation is byte-safe for UTF-8 (use .chars().take(n).collect() 
   instead of a raw byte truncate, in case an event name has multi-byte characters).

2. Double check this doesn't affect the Event account's own stored `name` field 
   (max 50 chars) — that stays as-is, this truncation is ONLY for what gets passed 
   into the Metaplex metadata name argument, nothing else.

3. Rebuild, redeploy to devnet (since this is a program logic change, not just 
   frontend), and confirm check_in succeeds end-to-end with a real event name.

This is the full fix — no other changes needed elsewhere.
```

---

## 9. Making the frontend responsive

```
The frontend isn't responsive across screen sizes/dimensions. Please review all 
pages and components under web/app and web/components and make them responsive:

1. Replace any fixed pixel widths on containers/cards with responsive Tailwind 
   classes (e.g. w-full max-w-md instead of w-[400px]).
2. Ensure the layout stacks vertically on small screens (use flex-col on mobile, 
   flex-row on md: and up, or grid with responsive column counts).
3. Check that any wallet-connect button, forms, and NFT/event cards don't 
   overflow or get cut off on mobile viewport widths (test at 375px, 768px, 
   and 1440px).
4. Make sure text sizes scale down appropriately on small screens (text-sm on 
   mobile, text-base or larger on desktop where relevant).

After changes, tell me which specific files you modified so I can spot-check them.
```

---

## 10. Fixing the Vercel deploy — missing IDL file

```
The Vercel build fails with "Module not found: Can't resolve 
'../target/idl/event_attendance_nft.json'" — because anchor/target/ is (correctly) 
gitignored as a build artifact, but the frontend directly imports the IDL JSON 
from inside that folder. Since Vercel clones fresh from GitHub, this file never 
exists there even though it exists locally after anchor build.

Fix this properly:

1. Check .gitignore — it likely has a blanket anchor/target/ or target/ entry. 
   Add explicit exceptions so ONLY the IDL and generated TypeScript types are 
   tracked by git, while everything else in target/ (the compiled .so binary, 
   build cache, etc.) stays ignored. Something like:
   
   anchor/target/*
   !anchor/target/idl
   !anchor/target/idl/*.json
   !anchor/target/types
   !anchor/target/types/*.ts

2. Run git add -f anchor/target/idl/event_attendance_nft.json 
   anchor/target/types/event_attendance_nft.ts to force-add them despite the 
   previous ignore rule, then commit and push.

3. Confirm going forward: every time the program is rebuilt after a code change 
   (like the NameTooLong fix), these two generated files change too and must be 
   committed again alongside the Rust changes — they're not automatically synced 
   on Vercel's end, since Vercel never runs anchor build, only npm run build.

4. As a sanity check before I push again, run git status and confirm those two 
   files show as tracked/staged, not still ignored.

After this, I'll push and retry the Vercel deploy.
```

---

## 11. UI overhaul — rebrand to NFTicket, role split, QR, theme fix

```
Rebrand this project from "Event Attendance NFT" to "NFTicket" — update the app 
title, page headers, README, and any user-facing text (leave internal program/
crate/variable names as-is, only user-facing branding changes).

## Restructure into two clear roles

1. Landing page (/): two large, clearly labeled options — "I'm an Organizer" and 
   "I'm Attending an Event" — nothing else on this page. This is the entry point 
   that removes any confusion about who does what.

2. /organizer route:
   - Form to create a new event (name input, submit button)
   - List of events this connected wallet has organized, each showing: event 
     name, live attendee count, and a "Show QR" button
   - Clicking "Show QR" reveals a QR code (generate client-side using the 
     qrcode.react package — add it as a dependency) encoding the full check-in 
     URL for that event, e.g. https://yourapp.com/check-in/[eventPublicKey]
   - No camera/scanning functionality needed anywhere — the QR just opens a link, 
     handled entirely by the attendee's own phone camera app

3. /check-in/[eventId] route:
   - Fetches and displays the event name from that PDA
   - Connect wallet button (if not already connected)
   - Single "Check In" button
   - After success, show a confirmation state with the badge — don't let them 
     click check-in again once it succeeds

## Theme fix

The current light/dark mode toggle produces broken color combinations in light mode. Remove the light/dark toggle entirely and commit to ONE polished theme: a semi-dark theme using this palette:
- Background: #0B1220 (deep navy, not pure black)
- Card/surface background: #161F30 or similar slightly-lighter navy
- Primary accent: #9945FF (purple) to #14F195 (teal/green) gradient — Solana's 
  own brand gradient, use it for buttons, active states, borders
- Text: #E8EDF6 for headings, #8FA3C8 for secondary/muted text
- Keep sufficient contrast throughout — this needs to look professional enough 
  to show investors/funders, not like a hackathon demo

## General polish for a funder-facing pitch

- Clean, generous spacing — avoid cramped layouts
- Consistent card styling across organizer and attendee views (rounded corners, 
  subtle borders using the accent gradient, consistent padding)
- Add a simple header/nav showing "NFTicket" branding on every page
- Make sure typography has clear hierarchy (large bold headings, smaller muted 
  subtext)
- Ensure responsiveness holds at 375px, 768px, and 1440px widths

## Do NOT touch
- The Anchor program (anchor/programs/) — this stays exactly as-is, this is a 
  frontend-only task
- Any existing wallet connection / Anchor client logic — only wrap it in the new 
  page structure, don't rewrite the data-access layer

After changes, list every file you modified or created so I can review the diff 
before testing.
```

---

## 12. Organizer badge selection (presets + custom upload)

```
I need to change the badge system from one fixed design to organizer-selectable 
per event. This requires both a program change and a frontend change.

## Program changes (anchor/programs/event_attendance_nft/src/lib.rs)

1. Add a new field to the Event account struct: badge_uri: String, with 
   #[max_len(200)] (IPFS URIs need more room than the existing fields — 
   recalculate the account's INIT_SPACE accordingly since this affects the 
   space allocated in the init constraint).

2. Update create_event to accept a new parameter: badge_uri: String, and store 
   it on the Event account at creation.

3. Update check_in to read event.badge_uri instead of the current hardcoded 
   FIXED_BADGE_URI constant when calling create_metadata_accounts_v3. Remove 
   the hardcoded constant entirely once this is wired through.

4. Since this changes the Event account's data layout, this requires a full 
   rebuild and redeploy to devnet — existing test events on the current deployed 
   program will no longer match this schema, which is expected and fine at this 
   stage.

5. Update both the LiteSVM tests and the TypeScript integration tests to pass a 
   test badge_uri string into create_event calls.

## Frontend changes

1. In the organizer's Create Event flow, add a badge selection step before 
   submission, showing three options as clickable image cards:
   - "Classic Violet" — a fixed preset (I'll provide its IPFS URI as a constant 
     once uploaded)
   - "Classic Teal" — a second fixed preset (same — I'll provide its URI)
   - "Upload your own" — opens a file picker for a custom image

2. If a preset is selected, use its known fixed URI directly — no upload needed.

3. If "Upload your own" is selected: after the organizer picks a file, send it 
   to a new Next.js API route (e.g. app/api/upload-badge/route.ts) that:
   - Accepts the image file
   - Uploads it to Pinata using a Pinata JWT/API key stored ONLY in a 
     server-side environment variable (PINATA_JWT, no NEXT_PUBLIC_ prefix, so 
     it's never exposed to the browser)
   - Builds and uploads the metadata JSON (image CID reference)
   - Returns the final metadata URI to the frontend

4. Whichever URI is determined (preset or freshly uploaded), pass it as the 
   badge_uri argument into the create_event call.

5. Show a loading state while a custom upload is in progress, and a preview of 
   the selected/uploaded image before the organizer confirms event creation.

Don't touch the check-in flow (attendee side) beyond what naturally follows from 
event.badge_uri now existing on-chain — attendees still just connect and check in, 
no badge choice on their end.

I'll provide the two preset image files and their IPFS URIs once you confirm the 
upload-badge API route pattern is ready to receive them.
```

---

## Still pending / not yet sent
- Providing the two preset badge IPFS URIs (violet + teal) to Antigravity once uploaded via Pinata
