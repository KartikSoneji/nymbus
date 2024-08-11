use anchor_lang::prelude::*;

declare_id!("C2FTqqDJzzaBdavjdvtRmA9bSkmDZWkmh6qmhN4wpSvG");

#[program]
pub mod server {
    use super::*;

    pub fn initialize(ctx: Context<Initialize>) -> Result<()> {
        msg!("Greetings from: {:?}", ctx.program_id);
        Ok(())
    }
}

#[derive(Accounts)]
pub struct Initialize {}
