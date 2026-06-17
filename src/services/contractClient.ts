import * as StellarSdk from '@stellar/stellar-sdk';
import { signTransaction } from '@stellar/freighter-api';

const HORIZON_URL =
  process.env.NEXT_PUBLIC_HORIZON_URL ?? 'https://horizon-testnet.stellar.org';

const server = new StellarSdk.Horizon.Server(HORIZON_URL);

/**
 * Build, Freighter-sign, and submit a vote transaction.
 *
 * @param prId GitHub PR number registered by the Vero Relayer
 * @param publicKey Stellar public key from WalletContext
 * @returns Submitted transaction hash
 */
export async function castVote(prId: number, publicKey: string): Promise<string> {
  const account = await server.loadAccount(publicKey);

  const tx = new StellarSdk.TransactionBuilder(account, {
    fee: StellarSdk.BASE_FEE,
    networkPassphrase: StellarSdk.Networks.TESTNET,
  })
    .addOperation(
      StellarSdk.Operation.manageData({ name: `vote_${prId}`, value: 'approve' })
    )
    .setTimeout(30)
    .build();

  const signed = await signTransaction(tx.toXDR(), {
    networkPassphrase: StellarSdk.Networks.TESTNET,
    address: publicKey,
  });
  if (signed.error) {
    throw new Error(signed.error.message ?? 'Freighter failed to sign the vote transaction');
  }

  const signedTx = StellarSdk.TransactionBuilder.fromXDR(
    signed.signedTxXdr,
    StellarSdk.Networks.TESTNET
  );

  const result = await server.submitTransaction(signedTx);
  return result.hash;
}
