import { Keypair, PublicKey, SystemProgram } from "@solana/web3.js";
import {
  MINT_SIZE,
  TOKEN_PROGRAM_ID,
  ASSOCIATED_TOKEN_PROGRAM_ID,
  createAssociatedTokenAccountInstruction,
  createInitializeMint2Instruction,
  createMintToInstruction,
} from "@solana/spl-token";

import {
  PROGRAM_ID as METADATA_PROGRAM_ID,
  createCreateMetadataAccountV3Instruction,
} from "@metaplex-foundation/mpl-token-metadata";

import { payer, connection } from "../lib/vars";
import { buildTransaction, explorerURL } from "../lib/helpers";

(async () => {
  console.log("Payer address:", payer.publicKey.toBase58());

  // Generate a new keypair for the mint
  const mintKeypair = Keypair.generate();
  console.log("Mint address:", mintKeypair.publicKey.toBase58());

  const tokenConfig = {
    decimals: 6,
    name: "Julian Token",
    symbol: "JT",
    uri: "https://gist.githubusercontent.com/lainhathoang/b6c0c7fa3d0fc529c33ae97072631865/raw/956add4950e27f1d2484ef1d91cc22ce4d874010/julian-token",
  };

  // 1. Create the Mint Account =====
  const createMintAccountInstruction = SystemProgram.createAccount({
    fromPubkey: payer.publicKey,
    newAccountPubkey: mintKeypair.publicKey,
    space: MINT_SIZE,
    lamports: await connection.getMinimumBalanceForRentExemption(MINT_SIZE),
    programId: TOKEN_PROGRAM_ID,
  });

  // 2. Initialize the Mint =====
  const initializeMintInstruction = createInitializeMint2Instruction(
    mintKeypair.publicKey,
    tokenConfig.decimals,
    payer.publicKey,
    payer.publicKey,
  );

  // 3.1 =====
  // Derive the associated token account address for the payer
  const associatedTokenAccountPubkey = PublicKey.findProgramAddressSync(
    [payer.publicKey.toBuffer(), TOKEN_PROGRAM_ID.toBuffer(), mintKeypair.publicKey.toBuffer()],
    ASSOCIATED_TOKEN_PROGRAM_ID,
  );
  // Create the Associated Token Account
  const createAssociatedTokenAccountIx = createAssociatedTokenAccountInstruction(
    payer.publicKey,
    associatedTokenAccountPubkey[0],
    payer.publicKey,
    mintKeypair.publicKey,
  );
  // Mint 100 tokens to the associated token account
  const mintAmount = 100 * 10 ** tokenConfig.decimals;
  const createMintToIx = createMintToInstruction(
    mintKeypair.publicKey,
    associatedTokenAccountPubkey[0],
    payer.publicKey,
    mintAmount,
  );

  // 3.2 =====
  // Derive the associated token account address for the receipient
  const receipient = new PublicKey("63EEC9FfGyksm7PkVC6z8uAmqozbQcTzbkWJNsgqjkFs");
  const associatedTokenAccountPubkey2 = PublicKey.findProgramAddressSync(
    [receipient.toBuffer(), TOKEN_PROGRAM_ID.toBuffer(), mintKeypair.publicKey.toBuffer()],
    ASSOCIATED_TOKEN_PROGRAM_ID,
  );
  // Create the Associated Token Account
  const createAssociatedTokenAccountIx2 = createAssociatedTokenAccountInstruction(
    payer.publicKey,
    associatedTokenAccountPubkey2[0],
    receipient,
    mintKeypair.publicKey,
  );
  // Mint 10 tokens to the associated token account
  const mintAmount2 = 10 * 10 ** tokenConfig.decimals;
  const createMintToIx2 = createMintToInstruction(
    mintKeypair.publicKey,
    associatedTokenAccountPubkey2[0],
    payer.publicKey,
    mintAmount2,
  );
  // ==========================

  // 4. Build the Metadata Account
  const metadataAccount = PublicKey.findProgramAddressSync(
    [Buffer.from("metadata"), METADATA_PROGRAM_ID.toBuffer(), mintKeypair.publicKey.toBuffer()],
    METADATA_PROGRAM_ID,
  )[0];

  const createMetadataInstruction = createCreateMetadataAccountV3Instruction(
    {
      metadata: metadataAccount,
      mint: mintKeypair.publicKey,
      mintAuthority: payer.publicKey,
      payer: payer.publicKey,
      updateAuthority: payer.publicKey,
    },
    {
      createMetadataAccountArgsV3: {
        data: {
          creators: null,
          name: tokenConfig.name,
          symbol: tokenConfig.symbol,
          uri: tokenConfig.uri,
          sellerFeeBasisPoints: 0,
          collection: null,
          uses: null,
        },
        collectionDetails: null,
        isMutable: true,
      },
    },
  );

  // 5. build the transaction
  const tx = await buildTransaction({
    connection,
    payer: payer.publicKey,
    signers: [payer, mintKeypair],
    instructions: [
      createMintAccountInstruction,
      initializeMintInstruction,
      createAssociatedTokenAccountIx,
      createMintToIx,
      createAssociatedTokenAccountIx2,
      createMintToIx2,
      createMetadataInstruction,
    ],
  });

  try {
    // Send the transaction
    const sig = await connection.sendTransaction(tx);
    console.log("Transaction completed.");
    console.log(explorerURL({ txSignature: sig }));
  } catch (err) {
    console.error("Failed to send transaction:", err);
  }
})();
