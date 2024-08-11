import {
  Connection,
  Keypair,
  LAMPORTS_PER_SOL,
  PublicKey,
  SystemProgram,
  TransactionMessage,
  VersionedTransaction,
} from "@solana/web3.js";
import * as fs from "fs";
import * as dotenv from "dotenv";
dotenv.config();

// Connect to Solana cluster
const connection = new Connection(`${process.env.RPC_URL}`);
const secret = fs.readFileSync(`${process.env.LOCAL_PAYER_JSON_ABSPATH}`, "utf8");
// Fee payer (the account that will pay for the transaction)
const payer = Keypair.fromSecretKey(Uint8Array.from(JSON.parse(secret)));
// create new account
const newAccount = Keypair.generate();
// Define the recipient address
const recipient = new PublicKey("63EEC9FfGyksm7PkVC6z8uAmqozbQcTzbkWJNsgqjkFs");

(async () => {
  const space = 0;
  const recentBlockhash = await connection.getLatestBlockhash().then(res => res.blockhash);

  // 1. Fund the new account with some SOL (0.2 SOL for example)
  const createAccountIx = SystemProgram.createAccount({
    fromPubkey: payer.publicKey,
    newAccountPubkey: newAccount.publicKey,
    lamports: 0.2 * LAMPORTS_PER_SOL,
    space,
    programId: SystemProgram.programId,
  });

  // 2. Transfer 0.1 SOL to the recipient
  const depositSolIx = SystemProgram.transfer({
    fromPubkey: newAccount.publicKey,
    toPubkey: recipient,
    lamports: 0.1 * LAMPORTS_PER_SOL,
  });

  // 3. close the account and transfer the remaining SOL back to the payer
  const closeAccountIx = SystemProgram.transfer({
    fromPubkey: newAccount.publicKey,
    toPubkey: payer.publicKey,
    lamports: 0.1 * LAMPORTS_PER_SOL,
  });

  const message = new TransactionMessage({
    payerKey: payer.publicKey,
    recentBlockhash,
    instructions: [createAccountIx, depositSolIx, closeAccountIx],
  }).compileToV0Message();

  const tx = new VersionedTransaction(message);

  tx.sign([payer, newAccount]);

  const signature = await connection.sendTransaction(tx);

  console.log("Transaction confirmed with signature:", signature);
})();
