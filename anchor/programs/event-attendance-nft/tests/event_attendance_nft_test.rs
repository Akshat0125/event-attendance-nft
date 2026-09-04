use anchor_lang::{AccountDeserialize, AnchorDeserialize, Id, InstructionData, ToAccountMetas};
use event_attendance_nft::{
    accounts as event_accounts, instruction as event_instructions, AttendanceRecord, Event, ID,
};
use litesvm::LiteSVM;
use solana_sdk::{
    instruction::{AccountMeta as SdkAccountMeta, Instruction as SdkInstruction},
    pubkey::Pubkey as SdkPubkey,
    signature::{Keypair, Signer},
    transaction::Transaction,
};

fn setup_svm() -> (LiteSVM, Keypair, Keypair) {
    let mut svm = LiteSVM::new();

    // Load compiled SBF binary of event_attendance_nft program
    let program_bytes = include_bytes!("../../../target/deploy/event_attendance_nft.so");
    let program_id = to_sdk_pubkey(&ID);
    svm.add_program(program_id, program_bytes);

    // Load compiled mock metadata SBF binary into LiteSVM for metadata program CPI calls
    let metadata_bytes = include_bytes!("../../../mock_metadata/target/deploy/mock_metadata.so");
    let metadata_program_id = to_sdk_pubkey(anchor_spl::metadata::Metadata::id());
    svm.add_program(metadata_program_id, metadata_bytes);

    let organizer = Keypair::new();
    let attendee = Keypair::new();

    svm.airdrop(&organizer.pubkey(), 10_000_000_000).unwrap();
    svm.airdrop(&attendee.pubkey(), 10_000_000_000).unwrap();

    (svm, organizer, attendee)
}

fn to_anchor_pubkey(p: impl AsRef<[u8]>) -> anchor_lang::prelude::Pubkey {
    let mut bytes = [0u8; 32];
    bytes.copy_from_slice(p.as_ref());
    anchor_lang::prelude::Pubkey::new_from_array(bytes)
}

fn to_sdk_pubkey(p: impl AsRef<[u8]>) -> SdkPubkey {
    let mut bytes = [0u8; 32];
    bytes.copy_from_slice(p.as_ref());
    SdkPubkey::new_from_array(bytes)
}

fn convert_account_metas(metas: Vec<anchor_lang::prelude::AccountMeta>) -> Vec<SdkAccountMeta> {
    metas
        .into_iter()
        .map(|m| SdkAccountMeta {
            pubkey: to_sdk_pubkey(&m.pubkey),
            is_signer: m.is_signer,
            is_writable: m.is_writable,
        })
        .collect()
}

#[test]
fn test_create_event_and_check_in_success() {
    let (mut svm, organizer, attendee) = setup_svm();
    let event_name = "Devcon 2026".to_string();

    let (event_pda, _event_bump) = SdkPubkey::find_program_address(
        &[b"event", organizer.pubkey().as_ref(), event_name.as_bytes()],
        &to_sdk_pubkey(&ID),
    );

    // 1. Create Event
    let create_event_accounts = convert_account_metas(
        event_accounts::CreateEvent {
            organizer: to_anchor_pubkey(organizer.pubkey()),
            event: to_anchor_pubkey(event_pda),
            system_program: to_anchor_pubkey(solana_sdk::system_program::ID),
        }
        .to_account_metas(None),
    );

    let create_event_ix = SdkInstruction {
        program_id: to_sdk_pubkey(&ID),
        accounts: create_event_accounts,
        data: event_instructions::CreateEvent {
            name: event_name.clone(),
            badge_uri: "ipfs://testbadgeuri".to_string(),
        }
        .data(),
    };

    let tx = Transaction::new_signed_with_payer(
        &[create_event_ix],
        Some(&organizer.pubkey()),
        &[&organizer],
        svm.latest_blockhash(),
    );

    let res = svm.send_transaction(tx);
    assert!(res.is_ok(), "create_event failed: {:?}", res);

    // Verify Event account state
    let event_acc = svm.get_account(&event_pda).unwrap();
    let event_data: Event = AnchorDeserialize::deserialize(&mut &event_acc.data[8..]).unwrap();
    assert_eq!(to_sdk_pubkey(&event_data.organizer), organizer.pubkey());
    assert_eq!(event_data.name, event_name);
    assert_eq!(event_data.attendee_count, 0);

    // 2. Perform Check-In
    svm.expire_blockhash();

    let mint_keypair = Keypair::new();
    let (attendance_pda, _att_bump) = SdkPubkey::find_program_address(
        &[b"attendance", event_pda.as_ref(), attendee.pubkey().as_ref()],
        &to_sdk_pubkey(&ID),
    );
    let (mint_auth_pda, _auth_bump) =
        SdkPubkey::find_program_address(&[b"mint_authority"], &to_sdk_pubkey(&ID));

    let attendee_ata = to_sdk_pubkey(anchor_spl::associated_token::get_associated_token_address(
        &to_anchor_pubkey(attendee.pubkey()),
        &to_anchor_pubkey(mint_keypair.pubkey()),
    ));

    let metadata_program_id = to_sdk_pubkey(anchor_spl::metadata::Metadata::id());
    let (metadata_pda, _meta_bump) = SdkPubkey::find_program_address(
        &[
            b"metadata",
            metadata_program_id.as_ref(),
            mint_keypair.pubkey().as_ref(),
        ],
        &metadata_program_id,
    );

    let check_in_accounts = convert_account_metas(
        event_accounts::CheckIn {
            attendee: to_anchor_pubkey(attendee.pubkey()),
            event: to_anchor_pubkey(event_pda),
            attendance_record: to_anchor_pubkey(attendance_pda),
            mint_authority: to_anchor_pubkey(mint_auth_pda),
            mint: to_anchor_pubkey(mint_keypair.pubkey()),
            token_account: to_anchor_pubkey(attendee_ata),
            metadata: to_anchor_pubkey(metadata_pda),
            token_program: anchor_spl::token::ID,
            associated_token_program: anchor_spl::associated_token::ID,
            metadata_program: anchor_spl::metadata::Metadata::id(),
            system_program: to_anchor_pubkey(solana_sdk::system_program::ID),
            rent: to_anchor_pubkey(solana_sdk::sysvar::rent::ID),
        }
        .to_account_metas(None),
    );

    let check_in_ix = SdkInstruction {
        program_id: to_sdk_pubkey(&ID),
        accounts: check_in_accounts,
        data: event_instructions::CheckIn {}.data(),
    };

    let check_in_tx = Transaction::new_signed_with_payer(
        &[check_in_ix],
        Some(&attendee.pubkey()),
        &[&attendee, &mint_keypair],
        svm.latest_blockhash(),
    );

    let check_in_res = svm.send_transaction(check_in_tx);
    assert!(check_in_res.is_ok(), "check_in failed: {:?}", check_in_res);

    // Verify event attendee count incremented to 1
    let updated_event_acc = svm.get_account(&event_pda).unwrap();
    let updated_event_data: Event =
        AnchorDeserialize::deserialize(&mut &updated_event_acc.data[8..]).unwrap();
    assert_eq!(updated_event_data.attendee_count, 1);

    // Verify AttendanceRecord account
    let att_acc = svm.get_account(&attendance_pda).unwrap();
    let att_data: AttendanceRecord =
        AnchorDeserialize::deserialize(&mut &att_acc.data[8..]).unwrap();
    assert_eq!(to_sdk_pubkey(&att_data.event), event_pda);
    assert_eq!(to_sdk_pubkey(&att_data.attendee), attendee.pubkey());

    // Verify token account balance and frozen status
    let ata_acc = svm.get_account(&attendee_ata).unwrap();
    let unpacked_ata = anchor_spl::token::TokenAccount::try_deserialize(&mut &ata_acc.data[..]).unwrap();
    assert_eq!(unpacked_ata.amount, 1);
    assert!(unpacked_ata.is_frozen(), "Token account should be frozen after check in");
}

#[test]
fn test_duplicate_check_in_rejection() {
    let (mut svm, organizer, attendee) = setup_svm();
    let event_name = "Devcon 2026".to_string();

    let (event_pda, _) = SdkPubkey::find_program_address(
        &[b"event", organizer.pubkey().as_ref(), event_name.as_bytes()],
        &to_sdk_pubkey(&ID),
    );

    // 1. Create Event
    let create_event_accounts = convert_account_metas(
        event_accounts::CreateEvent {
            organizer: to_anchor_pubkey(organizer.pubkey()),
            event: to_anchor_pubkey(event_pda),
            system_program: to_anchor_pubkey(solana_sdk::system_program::ID),
        }
        .to_account_metas(None),
    );

    let create_event_ix = SdkInstruction {
        program_id: to_sdk_pubkey(&ID),
        accounts: create_event_accounts,
        data: event_instructions::CreateEvent { name: event_name, badge_uri: "ipfs://testbadgeuri".to_string() }.data(),
    };

    let tx = Transaction::new_signed_with_payer(
        &[create_event_ix],
        Some(&organizer.pubkey()),
        &[&organizer],
        svm.latest_blockhash(),
    );
    svm.send_transaction(tx).unwrap();

    // 2. First Check-In
    svm.expire_blockhash();
    let mint_keypair1 = Keypair::new();
    let (attendance_pda, _) = SdkPubkey::find_program_address(
        &[b"attendance", event_pda.as_ref(), attendee.pubkey().as_ref()],
        &to_sdk_pubkey(&ID),
    );
    let (mint_auth_pda, _) =
        SdkPubkey::find_program_address(&[b"mint_authority"], &to_sdk_pubkey(&ID));
    let attendee_ata1 = to_sdk_pubkey(anchor_spl::associated_token::get_associated_token_address(
        &to_anchor_pubkey(attendee.pubkey()),
        &to_anchor_pubkey(mint_keypair1.pubkey()),
    ));
    let metadata_program_id = to_sdk_pubkey(anchor_spl::metadata::Metadata::id());
    let (metadata_pda1, _) = SdkPubkey::find_program_address(
        &[
            b"metadata",
            metadata_program_id.as_ref(),
            mint_keypair1.pubkey().as_ref(),
        ],
        &metadata_program_id,
    );

    let check_in_accounts1 = convert_account_metas(
        event_accounts::CheckIn {
            attendee: to_anchor_pubkey(attendee.pubkey()),
            event: to_anchor_pubkey(event_pda),
            attendance_record: to_anchor_pubkey(attendance_pda),
            mint_authority: to_anchor_pubkey(mint_auth_pda),
            mint: to_anchor_pubkey(mint_keypair1.pubkey()),
            token_account: to_anchor_pubkey(attendee_ata1),
            metadata: to_anchor_pubkey(metadata_pda1),
            token_program: anchor_spl::token::ID,
            associated_token_program: anchor_spl::associated_token::ID,
            metadata_program: anchor_spl::metadata::Metadata::id(),
            system_program: to_anchor_pubkey(solana_sdk::system_program::ID),
            rent: to_anchor_pubkey(solana_sdk::sysvar::rent::ID),
        }
        .to_account_metas(None),
    );

    let check_in_ix1 = SdkInstruction {
        program_id: to_sdk_pubkey(&ID),
        accounts: check_in_accounts1,
        data: event_instructions::CheckIn {}.data(),
    };

    let tx1 = Transaction::new_signed_with_payer(
        &[check_in_ix1],
        Some(&attendee.pubkey()),
        &[&attendee, &mint_keypair1],
        svm.latest_blockhash(),
    );
    svm.send_transaction(tx1).unwrap();

    // 3. Second Check-In with same wallet and event MUST fail
    svm.expire_blockhash();
    let mint_keypair2 = Keypair::new();
    let attendee_ata2 = to_sdk_pubkey(anchor_spl::associated_token::get_associated_token_address(
        &to_anchor_pubkey(attendee.pubkey()),
        &to_anchor_pubkey(mint_keypair2.pubkey()),
    ));
    let (metadata_pda2, _) = SdkPubkey::find_program_address(
        &[
            b"metadata",
            metadata_program_id.as_ref(),
            mint_keypair2.pubkey().as_ref(),
        ],
        &metadata_program_id,
    );

    let check_in_accounts2 = convert_account_metas(
        event_accounts::CheckIn {
            attendee: to_anchor_pubkey(attendee.pubkey()),
            event: to_anchor_pubkey(event_pda),
            attendance_record: to_anchor_pubkey(attendance_pda), // Same attendance PDA already initialized!
            mint_authority: to_anchor_pubkey(mint_auth_pda),
            mint: to_anchor_pubkey(mint_keypair2.pubkey()),
            token_account: to_anchor_pubkey(attendee_ata2),
            metadata: to_anchor_pubkey(metadata_pda2),
            token_program: anchor_spl::token::ID,
            associated_token_program: anchor_spl::associated_token::ID,
            metadata_program: anchor_spl::metadata::Metadata::id(),
            system_program: to_anchor_pubkey(solana_sdk::system_program::ID),
            rent: to_anchor_pubkey(solana_sdk::sysvar::rent::ID),
        }
        .to_account_metas(None),
    );

    let check_in_ix2 = SdkInstruction {
        program_id: to_sdk_pubkey(&ID),
        accounts: check_in_accounts2,
        data: event_instructions::CheckIn {}.data(),
    };

    let tx2 = Transaction::new_signed_with_payer(
        &[check_in_ix2],
        Some(&attendee.pubkey()),
        &[&attendee, &mint_keypair2],
        svm.latest_blockhash(),
    );

    let dup_res = svm.send_transaction(tx2);
    assert!(
        dup_res.is_err(),
        "Duplicate check-in should fail naturally on AttendanceRecord PDA re-init"
    );
}

#[test]
fn test_token_account_frozen_prevents_transfer() {
    let (mut svm, organizer, attendee) = setup_svm();
    let recipient = Keypair::new();
    svm.airdrop(&recipient.pubkey(), 1_000_000_000).unwrap();

    let event_name = "Devcon 2026".to_string();

    let (event_pda, _) = SdkPubkey::find_program_address(
        &[b"event", organizer.pubkey().as_ref(), event_name.as_bytes()],
        &to_sdk_pubkey(&ID),
    );

    let create_event_accounts = convert_account_metas(
        event_accounts::CreateEvent {
            organizer: to_anchor_pubkey(organizer.pubkey()),
            event: to_anchor_pubkey(event_pda),
            system_program: to_anchor_pubkey(solana_sdk::system_program::ID),
        }
        .to_account_metas(None),
    );

    let create_event_ix = SdkInstruction {
        program_id: to_sdk_pubkey(&ID),
        accounts: create_event_accounts,
        data: event_instructions::CreateEvent { name: event_name, badge_uri: "ipfs://testbadgeuri".to_string() }.data(),
    };

    let tx = Transaction::new_signed_with_payer(
        &[create_event_ix],
        Some(&organizer.pubkey()),
        &[&organizer],
        svm.latest_blockhash(),
    );
    svm.send_transaction(tx).unwrap();

    svm.expire_blockhash();
    let mint_keypair = Keypair::new();
    let (attendance_pda, _) = SdkPubkey::find_program_address(
        &[b"attendance", event_pda.as_ref(), attendee.pubkey().as_ref()],
        &to_sdk_pubkey(&ID),
    );
    let (mint_auth_pda, _) =
        SdkPubkey::find_program_address(&[b"mint_authority"], &to_sdk_pubkey(&ID));
    let attendee_ata = to_sdk_pubkey(anchor_spl::associated_token::get_associated_token_address(
        &to_anchor_pubkey(attendee.pubkey()),
        &to_anchor_pubkey(mint_keypair.pubkey()),
    ));
    let metadata_program_id = to_sdk_pubkey(anchor_spl::metadata::Metadata::id());
    let (metadata_pda, _) = SdkPubkey::find_program_address(
        &[
            b"metadata",
            metadata_program_id.as_ref(),
            mint_keypair.pubkey().as_ref(),
        ],
        &metadata_program_id,
    );

    let check_in_accounts = convert_account_metas(
        event_accounts::CheckIn {
            attendee: to_anchor_pubkey(attendee.pubkey()),
            event: to_anchor_pubkey(event_pda),
            attendance_record: to_anchor_pubkey(attendance_pda),
            mint_authority: to_anchor_pubkey(mint_auth_pda),
            mint: to_anchor_pubkey(mint_keypair.pubkey()),
            token_account: to_anchor_pubkey(attendee_ata),
            metadata: to_anchor_pubkey(metadata_pda),
            token_program: anchor_spl::token::ID,
            associated_token_program: anchor_spl::associated_token::ID,
            metadata_program: anchor_spl::metadata::Metadata::id(),
            system_program: to_anchor_pubkey(solana_sdk::system_program::ID),
            rent: to_anchor_pubkey(solana_sdk::sysvar::rent::ID),
        }
        .to_account_metas(None),
    );

    let check_in_ix = SdkInstruction {
        program_id: to_sdk_pubkey(&ID),
        accounts: check_in_accounts,
        data: event_instructions::CheckIn {}.data(),
    };

    let check_in_tx = Transaction::new_signed_with_payer(
        &[check_in_ix],
        Some(&attendee.pubkey()),
        &[&attendee, &mint_keypair],
        svm.latest_blockhash(),
    );
    svm.send_transaction(check_in_tx).unwrap();

    // Create recipient ATA
    svm.expire_blockhash();
    let recipient_ata = to_sdk_pubkey(anchor_spl::associated_token::get_associated_token_address(
        &to_anchor_pubkey(recipient.pubkey()),
        &to_anchor_pubkey(mint_keypair.pubkey()),
    ));
    let create_recipient_ata_ix = SdkInstruction {
        program_id: to_sdk_pubkey(anchor_spl::associated_token::ID),
        accounts: vec![
            SdkAccountMeta::new(attendee.pubkey(), true),
            SdkAccountMeta::new(recipient_ata, false),
            SdkAccountMeta::new_readonly(recipient.pubkey(), false),
            SdkAccountMeta::new_readonly(mint_keypair.pubkey(), false),
            SdkAccountMeta::new_readonly(solana_sdk::system_program::ID, false),
            SdkAccountMeta::new_readonly(to_sdk_pubkey(anchor_spl::token::ID), false),
        ],
        data: vec![],
    };

    let ata_tx = Transaction::new_signed_with_payer(
        &[create_recipient_ata_ix],
        Some(&attendee.pubkey()),
        &[&attendee],
        svm.latest_blockhash(),
    );
    svm.send_transaction(ata_tx).unwrap();

    // Attempt token transfer from attendee ATA to recipient ATA — MUST fail because token account is frozen!
    svm.expire_blockhash();
    let raw_transfer_ix = anchor_spl::token::spl_token::instruction::transfer(
        &anchor_spl::token::ID,
        &to_anchor_pubkey(attendee_ata),
        &to_anchor_pubkey(recipient_ata),
        &to_anchor_pubkey(attendee.pubkey()),
        &[],
        1,
    )
    .unwrap();

    let transfer_ix = SdkInstruction {
        program_id: to_sdk_pubkey(raw_transfer_ix.program_id),
        accounts: raw_transfer_ix
            .accounts
            .into_iter()
            .map(|m| SdkAccountMeta {
                pubkey: to_sdk_pubkey(m.pubkey),
                is_signer: m.is_signer,
                is_writable: m.is_writable,
            })
            .collect(),
        data: raw_transfer_ix.data,
    };

    let transfer_tx = Transaction::new_signed_with_payer(
        &[transfer_ix],
        Some(&attendee.pubkey()),
        &[&attendee],
        svm.latest_blockhash(),
    );

    let transfer_res = svm.send_transaction(transfer_tx);
    assert!(
        transfer_res.is_err(),
        "Token transfer must fail because soulbound token account is frozen"
    );
}

#[test]
fn test_close_attendance_record_and_event() {
    let (mut svm, organizer, attendee) = setup_svm();
    let event_name = "Solana Hacker House 2026".to_string();

    let (event_pda, _) = SdkPubkey::find_program_address(
        &[b"event", organizer.pubkey().as_ref(), event_name.as_bytes()],
        &to_sdk_pubkey(&ID),
    );

    // 1. Create Event
    let create_event_accounts = convert_account_metas(
        event_accounts::CreateEvent {
            organizer: to_anchor_pubkey(organizer.pubkey()),
            event: to_anchor_pubkey(event_pda),
            system_program: to_anchor_pubkey(solana_sdk::system_program::ID),
        }
        .to_account_metas(None),
    );

    let create_event_ix = SdkInstruction {
        program_id: to_sdk_pubkey(&ID),
        accounts: create_event_accounts,
        data: event_instructions::CreateEvent {
            name: event_name.clone(),
            badge_uri: "ipfs://testbadgeuri".to_string(),
        }
        .data(),
    };

    let tx = Transaction::new_signed_with_payer(
        &[create_event_ix],
        Some(&organizer.pubkey()),
        &[&organizer],
        svm.latest_blockhash(),
    );
    svm.send_transaction(tx).unwrap();

    // 2. Perform Check-In
    svm.expire_blockhash();
    let mint_keypair = Keypair::new();
    let (attendance_pda, _) = SdkPubkey::find_program_address(
        &[b"attendance", event_pda.as_ref(), attendee.pubkey().as_ref()],
        &to_sdk_pubkey(&ID),
    );
    let (mint_auth_pda, _) =
        SdkPubkey::find_program_address(&[b"mint_authority"], &to_sdk_pubkey(&ID));
    let attendee_ata = to_sdk_pubkey(anchor_spl::associated_token::get_associated_token_address(
        &to_anchor_pubkey(attendee.pubkey()),
        &to_anchor_pubkey(mint_keypair.pubkey()),
    ));
    let metadata_program_id = to_sdk_pubkey(anchor_spl::metadata::Metadata::id());
    let (metadata_pda, _) = SdkPubkey::find_program_address(
        &[
            b"metadata",
            metadata_program_id.as_ref(),
            mint_keypair.pubkey().as_ref(),
        ],
        &metadata_program_id,
    );

    let check_in_accounts = convert_account_metas(
        event_accounts::CheckIn {
            attendee: to_anchor_pubkey(attendee.pubkey()),
            event: to_anchor_pubkey(event_pda),
            attendance_record: to_anchor_pubkey(attendance_pda),
            mint_authority: to_anchor_pubkey(mint_auth_pda),
            mint: to_anchor_pubkey(mint_keypair.pubkey()),
            token_account: to_anchor_pubkey(attendee_ata),
            metadata: to_anchor_pubkey(metadata_pda),
            token_program: anchor_spl::token::ID,
            associated_token_program: anchor_spl::associated_token::ID,
            metadata_program: anchor_spl::metadata::Metadata::id(),
            system_program: to_anchor_pubkey(solana_sdk::system_program::ID),
            rent: to_anchor_pubkey(solana_sdk::sysvar::rent::ID),
        }
        .to_account_metas(None),
    );

    let check_in_ix = SdkInstruction {
        program_id: to_sdk_pubkey(&ID),
        accounts: check_in_accounts,
        data: event_instructions::CheckIn {}.data(),
    };

    let check_in_tx = Transaction::new_signed_with_payer(
        &[check_in_ix],
        Some(&attendee.pubkey()),
        &[&attendee, &mint_keypair],
        svm.latest_blockhash(),
    );
    svm.send_transaction(check_in_tx).unwrap();

    // Verify AttendanceRecord and Event accounts exist
    assert!(svm.get_account(&attendance_pda).is_some());
    assert!(svm.get_account(&event_pda).is_some());

    // 3. Close AttendanceRecord
    svm.expire_blockhash();
    let close_att_accounts = convert_account_metas(
        event_accounts::CloseAttendanceRecord {
            organizer: to_anchor_pubkey(organizer.pubkey()),
            event: to_anchor_pubkey(event_pda),
            attendance_record: to_anchor_pubkey(attendance_pda),
        }
        .to_account_metas(None),
    );

    let close_att_ix = SdkInstruction {
        program_id: to_sdk_pubkey(&ID),
        accounts: close_att_accounts,
        data: event_instructions::CloseAttendanceRecord {
            attendee: to_anchor_pubkey(attendee.pubkey()),
        }
        .data(),
    };

    let close_att_tx = Transaction::new_signed_with_payer(
        &[close_att_ix],
        Some(&organizer.pubkey()),
        &[&organizer],
        svm.latest_blockhash(),
    );
    let close_att_res = svm.send_transaction(close_att_tx);
    assert!(close_att_res.is_ok(), "close_attendance_record failed: {:?}", close_att_res);

    // Confirm AttendanceRecord account no longer exists or has 0 lamports & system owner
    let att_acc = svm.get_account(&attendance_pda);
    assert!(
        att_acc.is_none() || att_acc.as_ref().unwrap().lamports == 0,
        "AttendanceRecord account should be closed (lamports == 0)"
    );

    // 4. Close Event
    svm.expire_blockhash();
    let close_event_accounts = convert_account_metas(
        event_accounts::CloseEvent {
            organizer: to_anchor_pubkey(organizer.pubkey()),
            event: to_anchor_pubkey(event_pda),
        }
        .to_account_metas(None),
    );

    let close_event_ix = SdkInstruction {
        program_id: to_sdk_pubkey(&ID),
        accounts: close_event_accounts,
        data: event_instructions::CloseEvent {}.data(),
    };

    let close_event_tx = Transaction::new_signed_with_payer(
        &[close_event_ix],
        Some(&organizer.pubkey()),
        &[&organizer],
        svm.latest_blockhash(),
    );
    let close_event_res = svm.send_transaction(close_event_tx);
    assert!(close_event_res.is_ok(), "close_event failed: {:?}", close_event_res);

    // Confirm Event account no longer exists or has 0 lamports
    let evt_acc = svm.get_account(&event_pda);
    assert!(
        evt_acc.is_none() || evt_acc.as_ref().unwrap().lamports == 0,
        "Event account should be closed (lamports == 0)"
    );
}
