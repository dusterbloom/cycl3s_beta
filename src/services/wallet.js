import { getSigningJsdClient, jsd } from "hyperwebjs";
import { generateAndStoreKeyPair } from "./encryption";


// Update constants at the top of the file
const CHAIN_ID = "hyperweb-1"; // Updated chain ID
const RPC_ENDPOINT = "http://localhost:26657";
const REST_ENDPOINT = "http://localhost:1317";
const CONTRACT_INDEX = "1";


export const connectKeplr = async () => {
  try {
    if (!window.keplr) {
      throw new Error("Keplr extension not found");
    }

    await window.keplr.enable(CHAIN_ID);
    return { success: true };
  } catch (error) {
    console.error("Failed to connect to Keplr:", error);
    return {
      success: false,
      error: error.message,
    };
  }
};

export const getWalletLink = async () => {
  try {
    if (!window.keplr) {
      return { success: false, error: "Keplr extension not found" };
    }

    const offlineSigner = window.keplr.getOfflineSigner(CHAIN_ID);
    const accounts = await offlineSigner.getAccounts();

    return {
      success: true,
      data: {
        walletAddress: accounts[0].address,
      },
    };
  } catch (error) {
    console.error("Get wallet link error:", error);
    return {
      success: false,
      error: error.message,
    };
  }
};


export const registerPublicKey = async (handle, publicKey, keyType = KeyTypes.PERMANENT) => {
  try {
    if (!window.keplr) {
      throw new Error("Keplr extension not found");
    }

    console.log(`Registering ${keyType} key for handle:`, handle);

    await suggestChain();
    await window.keplr.enable(CHAIN_ID);

    const offlineSigner = window.keplr.getOfflineSigner(CHAIN_ID);
    const accounts = await offlineSigner.getAccounts();
    const address = accounts[0].address;

    const client = await getSigningJsdClient({
      rpcEndpoint: RPC_ENDPOINT,
      signer: offlineSigner,
      chainId: CHAIN_ID,
    });

    // Create message data with handle and key type
    const msgArg = JSON.stringify({
      handle,
      publicKey,
      keyType
    });

    const msg = {
      typeUrl: "/jsd.jsd.MsgEval",
      value: {
        creator: address,
        index: CONTRACT_INDEX,
        // Use different function names based on key type
        fnName: "registerBlueskyHandle",
        arg: msgArg,
      },
    };

    const fee = {
      amount: [{ denom: "uhyper", amount: "100000" }],
      gas: "550000",
    };

    console.log("Sending registration transaction:", msg);
    const result = await client.signAndBroadcast(address, [msg], fee);
    console.log("Registration result:", result);

    return { success: true, result, keyType };
  } catch (error) {
    console.error("Error registering public key:", error);
    return { success: false, error: error.message };
  }
};

// Update getPublicKey to include key type information
export const getPublicKey = async (handle, session) => {
  try {
    const queryClient = await jsd.ClientFactory.createRPCQueryClient({
      rpcEndpoint: RPC_ENDPOINT,
    });

    // Check if this is the authenticated user
    const isAuthenticatedUser = session?.handle === handle;
    console.log("Auth check:", { isAuthenticatedUser, sessionHandle: session?.handle, handle });

    const state = await queryClient.jsd.jsd.localState({
      index: CONTRACT_INDEX,
      key: `bluesky/${handle}`,
    });
    console.log("sTATE check:", state);

    if (!state || !state.value) {
      if (!session) {
        throw new Error("Session is required for key operations");
      }

      // Do not register keys here, just return appropriate key type
      return {
        success: true,
        publicKey: state,
        handle: handle
      };
    }

    // Parse existing key data
    let keyData;
    try {
      keyData = JSON.parse(state.value);
    } catch (error) {
      // If parsing fails, assume the value is already a JSON string
      keyData = state;
    }

    return {
      success: true,
      publicKey: state,
      handle: handle
    };
  } catch (error) {
    console.error("Error with public key:", error);
    return { success: false, error: error.message };
  }
};
// Add query function for public keys
export const queryPublicKey = async (handle) => {
  try {
    const queryClient = await jsd.ClientFactory.createRPCQueryClient({
      rpcEndpoint: RPC_ENDPOINT,
    });

    const msg = {
      get_public_key_for_handle: {
        handle,
      },
    };

    const result = await queryClient.jsd.jsd.query({
      index: CONTRACT_INDEX,
      msg,
    });

    return { success: true, publicKey: result.result };
  } catch (error) {
    console.error("Error querying public key:", error);
    return { success: false, error: error.message };
  }
};

export const suggestChain = async () => {
  try {
    console.log("Suggesting chain with ID:", CHAIN_ID);

    await window.keplr.experimentalSuggestChain({
      chainId: CHAIN_ID,
      chainName: "Hyperweb Devnet",
      rpc: RPC_ENDPOINT,
      rest: REST_ENDPOINT,
      bip44: {
        coinType: 118,
      },
      bech32Config: {
        bech32PrefixAccAddr: "hyper",
        bech32PrefixAccPub: "hyperpub",
        bech32PrefixValAddr: "hypervaloper",
        bech32PrefixValPub: "hypervaloperpub",
        bech32PrefixConsAddr: "hypervalcons",
        bech32PrefixConsPub: "hypervalconspub",
      },
      currencies: [
        {
          coinDenom: "HYPER",
          coinMinimalDenom: "uhyper",
          coinDecimals: 6,
          coinGeckoId: "cosmos",
        },
      ],
      feeCurrencies: [
        {
          coinDenom: "HYPER",
          coinMinimalDenom: "uhyper",
          coinDecimals: 6,
          coinGeckoId: "cosmos",
          gasPriceStep: {
            low: 0,
            average: 0.025,
            high: 0.04,
          },
        },
      ],
      stakeCurrency: {
        coinDenom: "HYPER",
        coinMinimalDenom: "uhyper",
        coinDecimals: 6,
        coinGeckoId: "cosmos",
      },
    });

    console.log("Chain suggested successfully");
    return { success: true };
  } catch (error) {
    console.error("Failed to suggest chain:", error);
    return { success: false, error: error.message };
  }
};

export const removeWalletLink = async () => {
  try {
    if (!window.keplr) {
      return { success: false, error: "Keplr extension not found" };
    }

    // Clear any stored wallet data
    localStorage.removeItem('keplr_session');
    
    // Disconnect from Keplr (if possible)
    if (window.keplr.disconnect) {
      await window.keplr.disconnect();
    }

    return { success: true };
  } catch (error) {
    console.error("Failed to remove wallet link:", error);
    return {
      success: false,
      error: error.message,
    };
  }
};

// Get the current wallet's address
const getCurrentAddress = async () => {
  if (!window.keplr) {
    throw new Error("Keplr extension not found");
  }
  const offlineSigner = window.keplr.getOfflineSigner(CHAIN_ID);
  const accounts = await offlineSigner.getAccounts();
  return accounts[0].address;
};

export const getKeplrAccount = async () => {
  try {
    if (!window.keplr) {
      throw new Error("Keplr extension not found");
    }

    const offlineSigner = window.keplr.getOfflineSigner(
      process.env.CHAIN_ID || "cosmoshub-4"
    );
    const accounts = await offlineSigner.getAccounts();
    return {
      success: true,
      address: accounts[0].address,
      signer: offlineSigner,
    };
  } catch (error) {
    console.error("Failed to get Keplr account:", error);
    return {
      success: false,
      error: error.message,
    };
  }
};

// Also add debugging to getSigningClient
export const getSigningClient = async () => {
  try {
    console.log("Getting signing client...");

    if (!window.keplr) {
      throw new Error("Keplr extension not found");
    }

    console.log("Enabling Keplr for chain:", CHAIN_ID);
    await window.keplr.enable(CHAIN_ID);

    console.log("Getting offline signer...");
    const offlineSigner = window.keplr.getOfflineSigner(CHAIN_ID);
    console.log("Offline signer:", offlineSigner);

    console.log("Getting accounts...");
    const accounts = await offlineSigner.getAccounts();
    console.log("Accounts:", accounts);

    const address = accounts[0].address;
    console.log("Selected address:", address);

    console.log("Creating signing client...");
    const client = await getSigningJsdClient({
      rpcEndpoint: RPC_ENDPOINT,
      signer: offlineSigner,
    });
    console.log("Signing client created:", client);

    return { client, address };
  } catch (error) {
    console.error("Failed to get signing client:", error);
    console.error("Error stack:", error.stack);
    throw error;
  }
};

// Helper function to get RPC endpoint
const getRpcEndpoint = async () => {
  // You might want to implement this based on your configuration
  return RPC_ENDPOINT;
};
