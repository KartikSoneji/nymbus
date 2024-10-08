use anchor_lang::{prelude::*, system_program, Discriminator};
use nymbus::{
    self,
    cpi::{accounts::CreateRequest, create_request},
    program::Nymbus,
    state::{AccountMeta, CallbackConfig},
};

declare_id!("EbAkjcBwhekziiea2efYAq98yzZavWczDqbtsbmcvcJF");

#[program]
pub mod client {
    use super::*;

    pub fn get_sol_usd_rate(ctx: Context<GetSolUsdRate>) -> Result<()> {
        let payer = &ctx.accounts.payer;
        let nymbus_fee_account = &ctx.accounts.nymbus_fee_account;

        create_request(
            CpiContext::new(
                ctx.accounts.nymbus.to_account_info(),
                CreateRequest {
                    payer: payer.to_account_info(),
                    fee_account: nymbus_fee_account.to_account_info(),
                    system_program: ctx.accounts.system_program.to_account_info(),
                },
            ),
            "GET".to_string(),
            "https://api.coingecko.com/api/v3/simple/price?ids=solana&vs_currencies=usd"
                .to_string(),
            None,
            CallbackConfig {
                program: ID,
                accounts: vec![AccountMeta {
                    mutable: false,
                    key: payer.key(),
                }],
                instruction_prefix: crate::instruction::RateCallback::DISCRIMINATOR.to_vec(),
            },
        )
    }

    pub fn rate_callback(ctx: Context<RateCallback>, data: Vec<u8>) -> Result<()> {
        let nymbus_authority = &ctx.accounts.nymbus_authority;
        let sender = &ctx.accounts.sender;

        msg!("recieved callback");
        msg!("  signed by authority {}", nymbus_authority.key());
        msg!("  original instruction sent by {}", sender.key());
        msg!("");
        msg!("  raw data: {:?}", data);

        let json_data = serde_json::from_slice::<serde_json::Value>(&data).map_err(|e| {
            msg!("could not parse data as json: {}", e);
            ProgramError::InvalidInstructionData
        })?;
        msg!(
            "  sol to usd rate: {:?}",
            (|| json_data.get("solana")?.get("usd")?.as_f64())()
        );

        Ok(())
    }
}

#[derive(Accounts)]
pub struct GetSolUsdRate<'info> {
    #[account(mut)]
    payer: Signer<'info>,

    /// CHECK: checked in CPI to nymbus
    #[account(mut, address = pubkey!("BUSvUu7YHKTJCYntTfv35D2KTNmrZZKgMKZ2X852XLcn"))]
    nymbus_fee_account: UncheckedAccount<'info>,

    #[account(address = nymbus::ID)]
    nymbus: Program<'info, Nymbus>,

    #[account(address = system_program::ID)]
    system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct RateCallback<'info> {
    #[account(address = pubkey!("BUSvUu7YHKTJCYntTfv35D2KTNmrZZKgMKZ2X852XLcn"))]
    nymbus_authority: Signer<'info>,

    /// CHECK: only logged
    sender: UncheckedAccount<'info>,
}
