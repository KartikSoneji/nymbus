use crate::state::CallbackConfig;
use anchor_lang::{prelude::*, system_program};
use base64::prelude::*;

#[derive(Accounts)]
pub struct CreateRequest<'info> {
    #[account(mut)]
    payer: Signer<'info>,

    /// CHECK: only used to receive fees
    #[account(mut, address = pubkey!("BUSvUu7YHKTJCYntTfv35D2KTNmrZZKgMKZ2X852XLcn"))]
    fee_account: UncheckedAccount<'info>,

    #[account(address = system_program::ID)]
    system_program: Program<'info, System>,
}

pub fn create_request<'info>(
    ctx: Context<'_, '_, '_, 'info, CreateRequest<'info>>,
    method: String,
    url: String,
    body: Option<Vec<u8>>,
    callback_config: CallbackConfig,
) -> Result<()> {
    let payer = &ctx.accounts.payer;
    let fee_account = &ctx.accounts.fee_account;

    system_program::transfer(
        CpiContext::new(
            ctx.accounts.system_program.to_account_info(),
            system_program::Transfer {
                from: payer.to_account_info(),
                to: fee_account.to_account_info(),
            },
        ),
        100_000,
    )?;

    let body_encoded = body
        .map(|body| BASE64_STANDARD.encode(body))
        .unwrap_or("-".to_string());
    let accounts = callback_config
        .accounts
        .iter()
        .map(|meta| meta.to_string())
        .collect::<Vec<_>>()
        .join(" | ");
    let program = callback_config.program;
    let instruction_prefix_encoded = BASE64_STANDARD.encode(callback_config.instruction_prefix);
    msg!(format!(
        "\
            --- start ---\n\
            method:{method}\n\
            url:{url}\n\
            body:{body_encoded}\n\
            program:{program}\n\
            accounts:{accounts}\n\
            instruction_prefix:{instruction_prefix_encoded}\
        "
    )
    .as_str());

    Ok(())
}
