use anchor_lang::{prelude::*, AnchorDeserialize, AnchorSerialize};

#[derive(AnchorSerialize, AnchorDeserialize, Clone, PartialEq, Eq, Debug)]
pub struct CallbackConfig {
    pub program: Pubkey,
    pub accounts: Vec<AccountMeta>,
    pub instruction_prefix: Vec<u8>,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, PartialEq, Eq, Debug)]
pub struct AccountMeta {
    pub mutable: bool,
    pub key: Pubkey,
}

impl core::fmt::Display for AccountMeta {
    fn fmt(&self, f: &mut core::fmt::Formatter<'_>) -> core::fmt::Result {
        write!(f, "{} {}", if self.mutable { 'm' } else { '-' }, self.key)
    }
}
