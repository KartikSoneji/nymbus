import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { PublicKey } from "@solana/web3.js";
import * as assert from "assert";

import { Nymbus } from "../target/types/nymbus";

describe("nymbus", () => {
  // Configure the client to use the local cluster.
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const program = anchor.workspace.Nymbus as Program<Nymbus>;

  it("Echos parameters", async () => {
    let response = await program.methods
      .createRequest(
        "GET",
        "https://api.coingecko.com/api/v3/simple/price?ids=solana&vs_currencies=usd",
        null,
        {
          program: new PublicKey(1),
          accounts: [
            {
              mutable: true,
              key: new PublicKey(100),
            },
            {
              mutable: false,
              key: new PublicKey(200),
            },
          ],
          instructionPrefix: Buffer.from([0, 0, 0, 0, 0, 0, 0, 0]),
        },
      )
      .accounts({
        payer: provider.publicKey,
      })
      .simulate();

    let dataLog = response.raw.find((line) =>
      line.startsWith("Program log: --- start ---"),
    );

    assert.strictEqual(
      dataLog,
      [
        "Program log: --- start ---",
        "method:GET",
        "url:https://api.coingecko.com/api/v3/simple/price?ids=solana&vs_currencies=usd",
        "body:-",
        "program:11111111111111111111111111111112",
        "accounts:m 11111111111111111111111111111112j | - 11111111111111111111111111111114T",
        "instruction_prefix:AAAAAAAAAAA=",
      ].join("\n"),
    );
  });
});
