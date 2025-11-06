import axios from 'axios';

/**
 * Zcash RPC Client
 * Communicates with zcashd node via JSON-RPC
 */

const ZCASH_RPC_URL = process.env.ZCASH_RPC_URL || 'http://127.0.0.1:8232';
const ZCASH_RPC_USER = process.env.ZCASH_RPC_USER || 'zcashrpc';
const ZCASH_RPC_PASSWORD = process.env.ZCASH_RPC_PASSWORD || '';
const ZCASH_API_KEY = process.env.ZCASH_API_KEY; // For Tatum.io and similar services

interface ZcashRPCResponse {
  result: any;
  error: any;
  id: string;
}

/**
 * Make RPC call to zcashd
 */
export async function rpcCall(method: string, params: any[] = []): Promise<any> {
  try {
    // Build headers - use API key if available (Tatum.io), otherwise use Basic auth
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'accept': 'application/json',
    };

    if (ZCASH_API_KEY) {
      headers['x-api-key'] = ZCASH_API_KEY;
    }

    const config: any = {
      headers,
    };

    // Only add Basic auth if no API key (for self-hosted nodes)
    if (!ZCASH_API_KEY && ZCASH_RPC_USER) {
      config.auth = {
        username: ZCASH_RPC_USER,
        password: ZCASH_RPC_PASSWORD,
      };
    }

    const response = await axios.post<ZcashRPCResponse>(
      ZCASH_RPC_URL,
      {
        jsonrpc: '2.0', // Tatum uses JSON-RPC 2.0
        id: 1,
        method,
        params,
      },
      config
    );

    if (response.data.error) {
      throw new Error(`Zcash RPC Error: ${response.data.error.message}`);
    }

    return response.data.result;
  } catch (error: any) {
    if (error.response?.data?.error) {
      throw new Error(`Zcash RPC Error: ${error.response.data.error.message}`);
    }
    throw error;
  }
}

/**
 * Generate a new z-address (shielded Sapling address)
 */
export async function generateZAddress(): Promise<string> {
  const address = await rpcCall('z_getnewaddress', ['sapling']);
  console.log(`🔐 Generated new z-address: ${address}`);
  return address;
}

/**
 * Generate a new t-address (transparent address)
 */
export async function generateTAddress(): Promise<string> {
  const address = await rpcCall('getnewaddress');
  console.log(`📬 Generated new t-address: ${address}`);
  return address;
}

/**
 * Get balance of an address (works for both z and t addresses)
 */
export async function getBalance(address: string): Promise<number> {
  if (address.startsWith('z')) {
    // Z-address balance
    const result = await rpcCall('z_getbalance', [address]);
    return result;
  } else {
    // T-address balance - need to use getreceivedbyaddress
    const result = await rpcCall('getreceivedbyaddress', [address, 1]);
    return result;
  }
}

/**
 * Shield funds: Transfer from t-address to z-address
 */
export async function shieldFunds(
  fromTAddress: string,
  toZAddress: string,
  amount: number,
  memo?: string
): Promise<string> {
  console.log(`🛡️ Shielding ${amount} ZEC from ${fromTAddress} to ${toZAddress}`);

  const params: any[] = [
    fromTAddress,
    [
      {
        address: toZAddress,
        amount,
        memo: memo ? Buffer.from(memo).toString('hex') : undefined,
      },
    ],
  ];

  // Optional parameters
  params.push(1); // minconf
  params.push(0.0001); // fee

  const opid = await rpcCall('z_sendmany', params);
  console.log(`📝 Shield operation ID: ${opid}`);

  // Wait for operation to complete
  const txid = await waitForOperation(opid);
  return txid;
}

/**
 * Shielded transfer: z-address to z-address (FULLY PRIVATE)
 */
export async function shieldedTransfer(
  fromZAddress: string,
  toZAddress: string,
  amount: number,
  memo?: string
): Promise<string> {
  console.log(`🔒 Shielded transfer: ${amount} ZEC (z-to-z)`);
  console.log(`   From: ${fromZAddress.substring(0, 20)}...`);
  console.log(`   To: ${toZAddress.substring(0, 20)}...`);

  const params: any[] = [
    fromZAddress,
    [
      {
        address: toZAddress,
        amount,
        memo: memo ? Buffer.from(memo).toString('hex') : undefined,
      },
    ],
  ];

  params.push(1); // minconf
  params.push(0.0001); // fee

  const opid = await rpcCall('z_sendmany', params);
  console.log(`📝 Shielded operation ID: ${opid}`);

  const txid = await waitForOperation(opid);
  console.log(`✅ Shielded transfer completed: ${txid}`);
  return txid;
}

/**
 * Deshield funds: Transfer from z-address to t-address
 */
export async function deshieldFunds(
  fromZAddress: string,
  toTAddress: string,
  amount: number
): Promise<string> {
  console.log(`🔓 Deshielding ${amount} ZEC from z-address to ${toTAddress}`);

  const params: any[] = [
    fromZAddress,
    [
      {
        address: toTAddress,
        amount,
      },
    ],
  ];

  params.push(1); // minconf
  params.push(0.0001); // fee

  const opid = await rpcCall('z_sendmany', params);
  console.log(`📝 Deshield operation ID: ${opid}`);

  const txid = await waitForOperation(opid);
  return txid;
}

/**
 * Wait for async operation to complete
 */
export async function waitForOperation(opid: string, maxWaitTime: number = 300000): Promise<string> {
  const startTime = Date.now();
  const pollInterval = 5000; // 5 seconds

  while (Date.now() - startTime < maxWaitTime) {
    const status = await rpcCall('z_getoperationstatus', [[opid]]);

    if (status && status.length > 0) {
      const op = status[0];

      if (op.status === 'success') {
        return op.result.txid;
      }

      if (op.status === 'failed') {
        throw new Error(`Zcash operation failed: ${op.error?.message || 'Unknown error'}`);
      }

      // Still executing
      console.log(`⏳ Operation ${opid} status: ${op.status}`);
    }

    await sleep(pollInterval);
  }

  throw new Error(`Zcash operation ${opid} timed out after ${maxWaitTime}ms`);
}

/**
 * Get transaction details
 */
export async function getTransaction(txid: string): Promise<any> {
  return await rpcCall('gettransaction', [txid]);
}

/**
 * Get z-address viewing key (for auditing)
 */
export async function getViewingKey(zAddress: string): Promise<string> {
  return await rpcCall('z_exportviewingkey', [zAddress]);
}

/**
 * Export private key for address
 */
export async function exportPrivateKey(address: string): Promise<string> {
  if (address.startsWith('z')) {
    return await rpcCall('z_exportkey', [address]);
  } else {
    return await rpcCall('dumpprivkey', [address]);
  }
}

/**
 * Import private key
 */
export async function importPrivateKey(privateKey: string): Promise<void> {
  if (privateKey.startsWith('secret-extended-key-main') || privateKey.startsWith('zxviews')) {
    await rpcCall('z_importkey', [privateKey]);
  } else {
    await rpcCall('importprivkey', [privateKey]);
  }
}

/**
 * Check if zcashd is ready
 */
export async function isNodeReady(): Promise<boolean> {
  try {
    const info = await rpcCall('getblockchaininfo');
    return info.blocks > 0;
  } catch (error) {
    return false;
  }
}

/**
 * Get blockchain info
 */
export async function getBlockchainInfo(): Promise<any> {
  return await rpcCall('getblockchaininfo');
}

/**
 * Helper: Sleep
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Estimate transaction fee
 */
export async function estimateFee(): Promise<number> {
  // Zcash has a fixed fee of 0.0001 ZEC by default
  return 0.0001;
}

/**
 * Check if address is valid Zcash address
 */
export async function validateAddress(address: string): Promise<boolean> {
  try {
    if (address.startsWith('z')) {
      const result = await rpcCall('z_validateaddress', [address]);
      return result.isvalid;
    } else {
      const result = await rpcCall('validateaddress', [address]);
      return result.isvalid;
    }
  } catch (error) {
    return false;
  }
}
