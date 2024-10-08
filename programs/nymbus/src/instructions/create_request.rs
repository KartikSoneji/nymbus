use crate::state::CallbackConfig;
use anchor_lang::{prelude::*, system_program};
use base64::prelude::*;

#[derive(Accounts)]
pub struct CreateRequest<'info> {
    #[account(mut)]
    payer: Signer<'info>,

    // CHECK: only used to receive fees
    #[account(mut, address = pubkey!("61vGBCJ5DTDax5e5p1f7f96PTzDC78GUggsUtaicdH81"))]
    fee_account: UncheckedAccount<'info>,

    #[account(address = system_program::ID)]
    system_program: Program<'info, System>,
}

pub fn create_request<'info>(
    ctx: Context<'_, '_, '_, 'info, CreateRequest<'info>>,
    method: String,
    url: String,
    data: Option<Vec<u8>>,
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

    let data_encoded = data
        .map(|data| BASE64_STANDARD.encode(data))
        .unwrap_or("-".to_string());
    let accounts = callback_config
        .accounts
        .iter()
        .map(|(mutable, key)| format!("{} {key}", if *mutable { 'w' } else { '-' }))
        .collect::<Vec<_>>()
        .join(" | ");
    msg!(
        "\
            --- start ---\n\
            method:{method}\n\
            url:{url}\n\
            data:{data_encoded}\n\
            program:{program}\n\
            accounts:{accounts}\n\
            data_prefix:{data_prefix}\
        ",
        program = callback_config.program,
        data_prefix = BASE64_STANDARD.encode(callback_config.data_prefix),
    );

    Ok(())
}
