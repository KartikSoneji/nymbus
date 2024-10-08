use anchor_lang::{prelude::*, AnchorDeserialize, AnchorSerialize};

#[derive(AnchorSerialize, AnchorDeserialize, Clone, PartialEq, Eq, Debug)]
pub struct CallbackConfig {
    pub program: Pubkey,
    pub accounts: Vec<(bool, Pubkey)>,
    pub data_prefix: Vec<u8>,
}
