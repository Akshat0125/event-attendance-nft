use anchor_lang::prelude::*;
use anchor_spl::{
    associated_token::AssociatedToken,
    metadata::{
        create_metadata_accounts_v3, CreateMetadataAccountsV3, Metadata,
        mpl_token_metadata::types::DataV2,
    },
    token::{freeze_account, mint_to, FreezeAccount, Mint, MintTo, Token, TokenAccount},
};

declare_id!("BMwNMcrxpmGu7V9fHpFyGN8dFKt5NrAPNusZSLrUbafz");

#[program]
pub mod event_attendance_nft {
    use super::*;

    pub fn create_event(ctx: Context<CreateEvent>, name: String, badge_uri: String) -> Result<()> {
        require!(name.len() <= 50, EventError::NameTooLong);
        require!(badge_uri.len() <= 200, EventError::BadgeUriTooLong);

        let event = &mut ctx.accounts.event;
        event.organizer = ctx.accounts.organizer.key();
        event.name = name;
        event.attendee_count = 0;
        event.bump = ctx.bumps.event;
        event.badge_uri = badge_uri;

        Ok(())
    }

    pub fn check_in(ctx: Context<CheckIn>) -> Result<()> {
        let attendance_record = &mut ctx.accounts.attendance_record;
        attendance_record.event = ctx.accounts.event.key();
        attendance_record.attendee = ctx.accounts.attendee.key();
        attendance_record.timestamp = Clock::get()?.unix_timestamp;
        attendance_record.bump = ctx.bumps.attendance_record;

        let bump = ctx.bumps.mint_authority;
        let mint_authority_seeds: &[&[u8]] = &[b"mint_authority", &[bump]];
        let signer_seeds = &[mint_authority_seeds];

        // 1. Mint 1 token to attendee's associated token account
        let mint_cpi_accounts = MintTo {
            mint: ctx.accounts.mint.to_account_info(),
            to: ctx.accounts.token_account.to_account_info(),
            authority: ctx.accounts.mint_authority.to_account_info(),
        };
        let mint_cpi_ctx = CpiContext::new_with_signer(
            ctx.accounts.token_program.key(),
            mint_cpi_accounts,
            signer_seeds,
        );
        mint_to(mint_cpi_ctx, 1)?;

        // 2. CPI into Metaplex Token Metadata to attach metadata
        let suffix = " Badge";
        let max_event_chars = 32 - suffix.len(); // 26 chars
        let truncated_name: String = ctx.accounts.event.name.chars().take(max_event_chars).collect();
        let metadata_name = format!("{}{}", truncated_name, suffix);
        let data_v2 = DataV2 {
            name: metadata_name,
            symbol: "NFTKT".to_string(),
            uri: ctx.accounts.event.badge_uri.clone(),
            seller_fee_basis_points: 0,
            creators: None,
            collection: None,
            uses: None,
        };

        let metadata_cpi_accounts = CreateMetadataAccountsV3 {
            metadata: ctx.accounts.metadata.to_account_info(),
            mint: ctx.accounts.mint.to_account_info(),
            mint_authority: ctx.accounts.mint_authority.to_account_info(),
            payer: ctx.accounts.attendee.to_account_info(),
            update_authority: ctx.accounts.mint_authority.to_account_info(),
            system_program: ctx.accounts.system_program.to_account_info(),
            rent: ctx.accounts.rent.to_account_info(),
        };

        let metadata_cpi_ctx = CpiContext::new_with_signer(
            ctx.accounts.metadata_program.key(),
            metadata_cpi_accounts,
            signer_seeds,
        );

        create_metadata_accounts_v3(
            metadata_cpi_ctx,
            data_v2,
            false, // is_mutable
            true,  // update_authority_is_signer
            None,  // collection_details
        )?;

        // 3. Freeze attendee token account (soulbound)
        let freeze_accounts = FreezeAccount {
            account: ctx.accounts.token_account.to_account_info(),
            mint: ctx.accounts.mint.to_account_info(),
            authority: ctx.accounts.mint_authority.to_account_info(),
        };
        let freeze_cpi_ctx = CpiContext::new_with_signer(
            ctx.accounts.token_program.key(),
            freeze_accounts,
            signer_seeds,
        );
        freeze_account(freeze_cpi_ctx)?;

        // 4. Increment event.attendee_count
        let event = &mut ctx.accounts.event;
        event.attendee_count = event
            .attendee_count
            .checked_add(1)
            .ok_or(EventError::Overflow)?;

        Ok(())
    }

    pub fn close_attendance_record(
        _ctx: Context<CloseAttendanceRecord>,
        attendee: Pubkey,
    ) -> Result<()> {
        let _ = attendee;
        Ok(())
    }

    pub fn close_event(ctx: Context<CloseEvent>) -> Result<()> {
        emit!(EventClosed {
            event_name: ctx.accounts.event.name.clone(),
            organizer: ctx.accounts.organizer.key(),
            final_attendee_count: ctx.accounts.event.attendee_count,
            closed_at: Clock::get()?.unix_timestamp,
        });

        Ok(())
    }
}

#[derive(Accounts)]
#[instruction(name: String, badge_uri: String)]
pub struct CreateEvent<'info> {
    #[account(mut)]
    pub organizer: Signer<'info>,

    #[account(
        init,
        payer = organizer,
        space = 8 + 32 + (4 + 50) + 4 + 1 + (4 + 200),
        seeds = [b"event", organizer.key().as_ref(), name.as_bytes()],
        bump
    )]
    pub event: Account<'info, Event>,

    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct CheckIn<'info> {
    #[account(mut)]
    pub attendee: Signer<'info>,

    #[account(mut)]
    pub event: Account<'info, Event>,

    #[account(
        init,
        payer = attendee,
        space = 8 + 32 + 32 + 8 + 1,
        seeds = [b"attendance", event.key().as_ref(), attendee.key().as_ref()],
        bump
    )]
    pub attendance_record: Account<'info, AttendanceRecord>,

    /// CHECK: Mint authority PDA (shared signer PDA)
    #[account(
        seeds = [b"mint_authority"],
        bump
    )]
    pub mint_authority: UncheckedAccount<'info>,

    #[account(
        init,
        payer = attendee,
        mint::decimals = 0,
        mint::authority = mint_authority,
        mint::freeze_authority = mint_authority
    )]
    pub mint: Account<'info, Mint>,

    #[account(
        init,
        payer = attendee,
        associated_token::mint = mint,
        associated_token::authority = attendee
    )]
    pub token_account: Account<'info, TokenAccount>,

    /// CHECK: Metaplex Metadata account
    #[account(
        mut,
        seeds = [
            b"metadata",
            metadata_program.key().as_ref(),
            mint.key().as_ref()
        ],
        seeds::program = metadata_program,
        bump
    )]
    pub metadata: UncheckedAccount<'info>,

    pub token_program: Program<'info, Token>,
    pub associated_token_program: Program<'info, AssociatedToken>,
    pub metadata_program: Program<'info, Metadata>,
    pub system_program: Program<'info, System>,
    pub rent: Sysvar<'info, Rent>,
}

#[derive(Accounts)]
#[instruction(attendee: Pubkey)]
pub struct CloseAttendanceRecord<'info> {
    #[account(mut)]
    pub organizer: Signer<'info>,

    #[account(
        has_one = organizer @ EventError::UnauthorizedOrganizer
    )]
    pub event: Account<'info, Event>,

    #[account(
        mut,
        close = organizer,
        seeds = [b"attendance", event.key().as_ref(), attendee.as_ref()],
        bump = attendance_record.bump
    )]
    pub attendance_record: Account<'info, AttendanceRecord>,
}

#[derive(Accounts)]
pub struct CloseEvent<'info> {
    #[account(mut)]
    pub organizer: Signer<'info>,

    #[account(
        mut,
        close = organizer,
        has_one = organizer @ EventError::UnauthorizedOrganizer
    )]
    pub event: Account<'info, Event>,
}

#[account]
pub struct Event {
    pub organizer: Pubkey,
    pub name: String,
    pub attendee_count: u32,
    pub bump: u8,
    pub badge_uri: String,
}

#[account]
pub struct AttendanceRecord {
    pub event: Pubkey,
    pub attendee: Pubkey,
    pub timestamp: i64,
    pub bump: u8,
}

#[event]
pub struct EventClosed {
    pub event_name: String,
    pub organizer: Pubkey,
    pub final_attendee_count: u32,
    pub closed_at: i64,
}

#[error_code]
pub enum EventError {
    #[msg("Event name exceeds maximum length of 50 characters.")]
    NameTooLong,
    #[msg("Badge URI exceeds maximum length of 200 characters.")]
    BadgeUriTooLong,
    #[msg("Attendee count overflow.")]
    Overflow,
    #[msg("Organizer authority does not match event organizer.")]
    UnauthorizedOrganizer,
}

#[cfg(target_os = "solana")]
#[no_mangle]
unsafe extern "Rust" fn __getrandom_v03_custom(
    dest: *mut u8,
    len: usize,
) -> core::result::Result<(), getrandom::Error> {
    for i in 0..len {
        *dest.add(i) = 0;
    }
    Ok(())
}
