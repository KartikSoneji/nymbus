import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { PublicKey } from "@solana/web3.js";
import * as assert from "assert";

import { Client } from "../target/types/client";

describe("client", () => {
  // Configure the client to use the local cluster.
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const program = anchor.workspace.Client as Program<Client>;

  it("Creates a request", async () => {
    let response = await program.methods
      .getSolUsdRate()
      .accounts({
        payer: provider.wallet.publicKey,
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
        `program:${program.programId}`,
        `accounts:- ${provider.wallet.publicKey}`,
        "instruction_prefix:7CednxZ6cwQ=",
      ].join("\n"),
    );
  });

  it("Handles the callback", async () => {
    let response = await program.methods
      .rateCallback(
        Buffer.from(
          JSON.stringify({
            solana: {
              usd: 150,
            },
          }),
        ),
      )
      .accounts({
        sender: new PublicKey(100),
      })
      .simulate();

    assert.deepStrictEqual(response.raw.slice(1, -2), [
      "Program log: Instruction: RateCallback",
      "Program log: recieved callback",
      "Program log:   signed by authority BUSvUu7YHKTJCYntTfv35D2KTNmrZZKgMKZ2X852XLcn",
      "Program log:   original instruction sent by 11111111111111111111111111111112j",
      "Program log: ",
      "Program log:   raw data: [123, 34, 115, 111, 108, 97, 110, 97, 34, 58, 123, 34, 117, 115, 100, 34, 58, 49, 53, 48, 125, 125]",
      "Program log:   sol to usd rate: Some(150.0)",
    ]);
  });
});
