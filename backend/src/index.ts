import { Connection, PublicKey, Transaction, TransactionInstruction, Account, Keypair, ComputeBudgetProgram } from "@solana/web3.js";
import dotenv from "dotenv";
import * as https from 'https';
import * as http from 'http';
import { URL } from 'url';
import bs58 from 'bs58';

dotenv.config();

interface ParsedRequest {
  method: string;
  url: string;
  data: string | null;
  program: string;
  accounts: { pubkey: string; isWriteable: boolean }[];
  instruction_prefix: string;
}

interface RequestResponse {
  statusCode: number;
  body: string;
}

const LISTEN_ADDRESS = new PublicKey("nym2L1Yw53M1wZ5KWCWbjLccL8AJmPq7PLSapatgkrx");

const FEEPAYER_WALLET = Keypair.fromSecretKey(
  bs58.decode(process.env.WALLET_PRIVATE_KEYPAIR!)
);

const TX_RETRY_INTERVAL = 2000;

const solanaRpcConnection = new Connection(process.env.RPC_ENDPOINT!);

function parseLogsArray(logs: string[]): ParsedRequest | null {
  let parsedRequest: Partial<ParsedRequest> = {};
  
  // Find the log entry that contains our data
  const dataLog = logs.find(log => log.includes("--- start ---"));
  
  if (!dataLog) return null;

  // Split the data log into lines
  const dataLines = dataLog.split('\n');

  // Process each line
  dataLines.forEach(line => {
    const [key, ...valueParts] = line.split(':');
    const value = valueParts.join(':').trim(); // Rejoin the value parts in case of colons in the value

    switch (key.trim()) {
      case 'method':
        parsedRequest.method = value;
        break;
      case 'url':
        parsedRequest.url = value;
        break;
      case 'body':
        parsedRequest.data = value === '-' ? null : value;
        break;
      case 'program':
        parsedRequest.program = value;
        break;
      case 'accounts':
        parsedRequest.accounts = [{ // Changed to handle single account
          pubkey: value.split(' ')[1], // Get the pubkey part
          isWriteable: value.split(' ')[0] === 'w'
        }];
        break;
      case 'instruction_prefix':
        parsedRequest.instruction_prefix = value;
        break;
    }
  });

  return (parsedRequest.method && parsedRequest.url)
    ? parsedRequest as ParsedRequest
    : null;
}

async function sendRequest(parsedRequest: ParsedRequest): Promise<RequestResponse> {
  return new Promise((resolve, reject) => {
    const url = new URL(parsedRequest.url);
    const options: http.RequestOptions | https.RequestOptions = {
      method: parsedRequest.method,
      hostname: url.hostname,
      path: url.pathname + url.search,
      port: url.port || (url.protocol === 'https:' ? 443 : 80),
    };

    const requestModule = url.protocol === 'https:' ? https : http;

    const req = requestModule.request(options, (res) => {
      let data = '';

      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        resolve({
          statusCode: res.statusCode || 0,
          body: data,
        });
      });
    });

    req.on('error', (error) => {
      reject(new Error(`Request failed: ${error.message}`));
    });

    if (parsedRequest.data) {
      req.write(parsedRequest.data);
    }

    req.end();
  });
}

async function createSolanaTransaction(parsedRequest: ParsedRequest, apiResponse: string): Promise<Transaction> {
  const programId = new PublicKey(parsedRequest.program);

  const accounts = parsedRequest.accounts.map(account => ({
    pubkey: new PublicKey(account.pubkey),
    isSigner: false,
    isWritable: account.isWriteable
  }));
  accounts.unshift({
    pubkey: FEEPAYER_WALLET.publicKey,
    isSigner: true,
    isWritable: false
  });

  const instructionPrefix = Buffer.from(parsedRequest.instruction_prefix, 'base64');
  const responseData = Buffer.from(apiResponse, 'utf-8');
  const responseDataLength = Buffer.alloc(4);
  responseDataLength.writeUInt32LE(responseData.length);
  const instructionData = Buffer.concat([instructionPrefix, responseDataLength, responseData]);

  const instruction = new TransactionInstruction({
    programId,
    keys: accounts,
    data: instructionData,
  });

  const transaction = new Transaction().add(instruction);

  transaction.add(
    ComputeBudgetProgram.setComputeUnitLimit({
      units: 50000,
    }),
    ComputeBudgetProgram.setComputeUnitPrice({
      microLamports: 1000,
    })
  );

  return transaction;
}

async function processRequest(parsedRequest: ParsedRequest): Promise<void> {
  try {
    console.log(`Sending request to ${parsedRequest.url}`);
    const response = await sendRequest(parsedRequest);
    console.log(`Response from ${parsedRequest.url}:`);
    console.log(`Status: ${response.statusCode}`);
    console.log(`Body: ${response.body}`);

    const transaction = await createSolanaTransaction(parsedRequest, response.body);

    transaction.feePayer = FEEPAYER_WALLET.publicKey;

    const blockhashRes = await solanaRpcConnection.getLatestBlockhash("confirmed")
    transaction.recentBlockhash = blockhashRes.blockhash;
    transaction.lastValidBlockHeight = blockhashRes.lastValidBlockHeight;

    transaction.sign(FEEPAYER_WALLET);

    let signature = bs58.encode(transaction.signature!);

    console.log("Sending transaction: ", signature);

    const sendTxResult = await solanaRpcConnection.sendRawTransaction(
      transaction.serialize(),
      {
        skipPreflight: true,
        maxRetries: 0,
      }
    );

    if (sendTxResult !== signature) {
      throw new Error(
        `Receive invalid signature from sendRawTransaction: ${sendTxResult}, expected ${signature}`
      );
    }

    let confirmedTransaction = null;
    let txSendAttempts = 1;

    while (!confirmedTransaction) {
      const resultPromise = solanaRpcConnection.confirmTransaction(
        {
          signature,
          blockhash: transaction.recentBlockhash,
          lastValidBlockHeight: transaction.lastValidBlockHeight!,
        },
        "confirmed"
      );

      confirmedTransaction = await Promise.race([
        resultPromise,
        new Promise((resolve) =>
          setTimeout(() => {
            resolve(null);
          }, TX_RETRY_INTERVAL)
        ),
      ]);
      if (confirmedTransaction) {
        break;
      }

      console.log(
        `${new Date().toISOString()} Tx not confirmed after ${TX_RETRY_INTERVAL * txSendAttempts++}ms, resending`
      );

      await solanaRpcConnection.sendRawTransaction(transaction.serialize(), {
        skipPreflight: true,
        maxRetries: 0,
      });
    }

    console.log(`Transaction confirmed: https://explorer.solana.com/tx/${signature}?cluster=devnet`);

  } catch (error) {
    console.log(parsedRequest);

    console.error(`Error processing request to ${parsedRequest.url}: ${error}`);
  }
}

async function main() {
  // const exampleLogs = [
  //   "Program log: --- start ---",
  //   "method:GET",
  //   "url:https://api.coingecko.com/api/v3/simple/price?ids=solana&vs_currencies=usd",
  //   "data:-",
  //   "program:BGUMAp9Gq7iTEuizy4pqaxsTyUCBK68MDfK752saRPUY",
  //   "accounts:w BrX9Z85BbmXYMjvvuAWU8imwsAqutVQiDg9uNfTGkzrJ | - BrX9Z85BbmXYMjvvuAWU8imwsAqutVQiDg9uNfTGkzrJ",
  //   "instruction_prefix:AAAAAAAAAAA="
  // ];

  // const parsedRequest = parseLogsArray(exampleLogs);
  // if (parsedRequest) {
  //   await processRequest(parsedRequest);
  // } else {
  //   console.log("Failed to parse the log data.");
  // }

  // Uncomment the following to use Solana log listening

  solanaRpcConnection.onLogs(LISTEN_ADDRESS, async (logData) => {
    console.log("Received logs");
    console.log(logData);
    
    
    if (logData.err) return;
    try {
      const parsedRequest = parseLogsArray(logData.logs);
      console.log(parsedRequest);
      
      if (parsedRequest) {
        await processRequest(parsedRequest);
      }
    } catch (e) {
      console.log(`ERROR: ${e}`);
    }
  });

}

main();