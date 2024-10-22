pub mod instructions;
pub mod state;

use crate::instructions::*;
use anchor_lang::prelude::*;
use state::CallbackConfig;

declare_id!("nym2L1Yw53M1wZ5KWCWbjLccL8AJmPq7PLSapatgkrx");

#[program]
pub mod nymbus {
    use super::*;

    pub fn create_request<'info>(
        ctx: Context<'_, '_, '_, 'info, CreateRequest<'info>>,
        method: String,
        url: String,
        body: Option<Vec<u8>>,
        callback_config: CallbackConfig,
    ) -> Result<()> {
        instructions::create_request(ctx, method, url, body, callback_config)
    }
}
