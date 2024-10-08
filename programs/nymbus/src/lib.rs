pub mod instructions;
pub mod state;

use crate::instructions::*;
use anchor_lang::prelude::*;
use state::CallbackConfig;

declare_id!("nymNxzEAxLvovp5CywNsnEgHpfRGAX3QLFy21GGt2uy");

#[program]
pub mod nymbus {
    use super::*;

    pub fn create_request<'info>(
        ctx: Context<'_, '_, '_, 'info, CreateRequest<'info>>,
        method: String,
        url: String,
        data: Option<Vec<u8>>,
        callback_config: CallbackConfig,
    ) -> Result<()> {
        instructions::create_request(ctx, method, url, data, callback_config)
    }
}
