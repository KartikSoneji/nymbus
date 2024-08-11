use anchor_lang::prelude::*;

declare_id!("FdRaNwYGHGyW4422wN2E4GfHLBc1G9eCAvBdBasbECUM");

#[program]
pub mod save_wilfred {
    use super::*;

    pub fn initialize(ctx: Context<Initialize>) -> Result<()> {
        msg!("Greetings from: {:?}", ctx.program_id);
        Ok(())
    }
}

#[derive(Accounts)]
pub struct Initialize {}
