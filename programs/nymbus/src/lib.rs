use anchor_lang::prelude::*;

declare_id!("2Ytr3pUMvR5ts169xb4r4CXTNf6gJfM4c2KA9ekvUfGr");

#[program]
pub mod nymbus {
    use super::*;

    pub fn initialize(ctx: Context<Initialize>) -> Result<()> {
        msg!("Greetings from: {:?}", ctx.program_id);
        Ok(())
    }
}

#[derive(Accounts)]
pub struct Initialize {}
