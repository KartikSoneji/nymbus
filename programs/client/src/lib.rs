use anchor_lang::prelude::*;

declare_id!("EbAkjcBwhekziiea2efYAq98yzZavWczDqbtsbmcvcJF");

#[program]
pub mod client {
    use super::*;

    pub fn initialize(ctx: Context<Initialize>) -> Result<()> {
        msg!("Greetings from: {:?}", ctx.program_id);
        Ok(())
    }
}

#[derive(Accounts)]
pub struct Initialize {}
