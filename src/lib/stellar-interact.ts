import * as StellarSdk from '@stellar/stellar-sdk';
import { signTransaction } from '@stellar/freighter-api';

const HORIZON_URL = process.env.NEXT_PUBLIC_HORIZON_URL ?? 'https://horizon-testnet.stellar.org';
const server = new StellarSdk.Horizon.Server(HORIZON_URL);

function decodeBase64(value: string): string {
  if (typeof atob === 'function') {
    return atob(value);
  }
  return Buffer.from(value, 'base64').toString();
}

/**
 * Build, sign with Freighter, and submit a vote transaction.
 * @param prId  GitHub PR number registered by the Vero Relayer
 * @param publicKey  Guardian's Stellar public key from WalletContext
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
  if (!signed.signedTxXdr) {
    throw new Error('Freighter did not return a signed transaction. Unlock Freighter and try again.');
  }

  const result = await server.submitTransaction(
    StellarSdk.TransactionBuilder.fromXDR(signed.signedTxXdr, StellarSdk.Networks.TESTNET)
  );
  return result.hash;
}

/** Fetch Guardian reputation score from contract data entries. */
export async function getReputation(publicKey: string): Promise<number> {
  const account = await server.loadAccount(publicKey);
  const entry = (account.data_attr as Record<string, string>)['vero_reputation'];
  if (!entry) {
    return 0;
  }

  const decodedReputation = decodeBase64(entry).trim();
  const reputation = Number(decodedReputation);
  if (!Number.isInteger(reputation) || reputation < 0) {
    throw new Error('Stellar reputation data is invalid. Refresh the page or contact support if this continues.');
  }
  return reputation;
}
