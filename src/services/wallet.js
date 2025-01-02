import { DirectSecp256k1Wallet } from '@cosmjs/proto-signing';
import { getSigningJsdClient, jsd } from 'hyperwebjs';
import { SigningCosmWasmClient } from '@cosmjs/cosmwasm-stargate';
import { GasPrice } from '@cosmjs/stargate';
import { initializeSignalProtocol } from './signalEncryption'; // Add this import
import { generateAndStoreKeyPair } from './signalEncryption';



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
      error: error.message
    };
  }
};



export const getWalletLink = async () => {
  try {
    if (!window.keplr) {
      return { success: false, error: 'Keplr extension not found' };
    }

    const offlineSigner = window.keplr.getOfflineSigner(CHAIN_ID);
    const accounts = await offlineSigner.getAccounts();
    
    return {
      success: true,
      data: {
        walletAddress: accounts[0].address
      }
    };
  } catch (error) {
    console.error('Get wallet link error:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

// export const getPublicKey = async (handle) => {
//   try {
//     console.log('Getting public key for handle:', handle);
    
//     // Create query client as shown in the docs
//     const queryClient = await jsd.ClientFactory.createRPCQueryClient({
//       rpcEndpoint: RPC_ENDPOINT
//     });

//     // Query the contract state directly using localState
//     const state = await queryClient.jsd.jsd.localState({ 
//       index: CONTRACT_INDEX, 
//       key: `bluesky/${handle}` // Contract stores keys with this prefix
//     });
    
//     console.log('Query response:', state);

//     if (!state || !state.value) {
//       return { 
//         success: false, 
//         error: `No public key found for handle: ${handle}` 
//       };
//     }

//     return { 
//       success: true, 
//       publicKey: state.value 
//     };
//   } catch (error) {
//     console.error('Error fetching public key:', error);
//     return { 
//       success: false, 
//       error: error.message 
//     };
//   }
// };

export const getPublicKey = async (handle) => {
  try {
    const queryClient = await jsd.ClientFactory.createRPCQueryClient({
      rpcEndpoint: RPC_ENDPOINT
    });

    const state = await queryClient.jsd.jsd.localState({ 
      index: CONTRACT_INDEX, 
      key: `bluesky/${handle}` // Using Bluesky handle
    });
    
    // If no key exists, generate and register one
    if (!state || !state.value) {
      const { success, publicKey, error } = await generateAndStoreKeyPair(handle);
      
      if (!success) {
        throw new Error(error || 'Failed to generate keys');
      }

      // Register the public key with Bluesky handle
      const registrationResult = await registerPublicKey(
        handle,  // Using Bluesky handle instead of wallet address
        publicKey
      );
      
      if (!registrationResult.success) {
        throw new Error('Failed to register public key in contract');
      }

      return { success: true, publicKey };
    }

    return { 
      success: true, 
      publicKey: JSON.parse(state.value) 
    };
  } catch (error) {
    console.error('Error with public key:', error);
    return { success: false, error: error.message };
  }
};



// export const registerPublicKey = async (handle) => {
//   try {
//     if (!window.keplr) {
//       throw new Error("Keplr extension not found");
//     }

//     // First suggest chain
//     await suggestChain();
    
//     // Enable chain
//     await window.keplr.enable(CHAIN_ID);
    
//     // Get the public key from Keplr
//     const key = await window.keplr.getKey(CHAIN_ID);
//     console.log('Got key from Keplr:', key);
    
//     // Convert public key to base64 string
//     const publicKeyString = btoa(String.fromCharCode.apply(null, key.pubKey));
//     console.log('Public key as base64:', publicKeyString);

//     // Get signer
//     const offlineSigner = window.keplr.getOfflineSigner(CHAIN_ID);
//     const accounts = await offlineSigner.getAccounts();
//     const address = accounts[0].address;

//     // Create signing client using hyperwebjs
//     const client = await getSigningJsdClient({
//       rpcEndpoint: RPC_ENDPOINT,
//       signer: offlineSigner,
//       gasPrice: GasPrice.fromString("0.025uhyper")
//     });

//     // Create message using jsd composer
//     const msg = jsd.jsd.MessageComposer.fromPartial.eval({
//       creator: address,
//       index: CONTRACT_INDEX,
//       fnName: "registerBlueskyHandle",
//       arg: JSON.stringify({ 
//         handle, 
//         publicKey: publicKeyString  // Send the base64 string
//       })
//     });

//     const fee = {
//       amount: [{ denom: "uhyper", amount: "100000" }],
//       gas: "550000"
//     };

//     console.log('Broadcasting message:', msg);
//     const result = await client.signAndBroadcast(address, [msg], fee);
//     console.log('Transaction result:', result);

//     return { success: true, result };
//   } catch (error) {
//     console.error('Error registering public key:', error);
//     return { success: false, error: error.message };
//   }
// };
export const registerPublicKey = async (handle, publicKey) => {
  try {
    if (!window.keplr) {
      throw new Error("Keplr extension not found");
    }

    console.log('Registering public key for Bluesky handle:', handle);
    console.log('Public key to register:', publicKey);

    await suggestChain();
    await window.keplr.enable(CHAIN_ID);
    
    const offlineSigner = window.keplr.getOfflineSigner(CHAIN_ID);
    const accounts = await offlineSigner.getAccounts();
    const address = accounts[0].address;

    const client = await getSigningJsdClient({
      rpcEndpoint: RPC_ENDPOINT,
      signer: offlineSigner,
      chainId: CHAIN_ID
    });

    // Create message data with Bluesky handle
    const msgArg = `{"handle":"${handle}","publicKey":"${publicKey}"}`;
    console.log('Message arg:', msgArg);

    const msg = {
      typeUrl: "/jsd.jsd.MsgEval",
      value: {
        creator: address,
        index: CONTRACT_INDEX,
        fnName: "registerBlueskyHandle",
        arg: msgArg
      }
    };

    const fee = {
      amount: [{ denom: "uhyper", amount: "100000" }],
      gas: "550000"
    };

    const result = await client.signAndBroadcast(address, [msg], fee);
    console.log('Transaction result:', result);
    return { success: true, result };
  } catch (error) {
    console.error('Error registering public key:', error);
    return { success: false, error: error.message };
  }
};


// Add query function for public keys
export const queryPublicKey = async (handle) => {
  try {
    const queryClient = await jsd.ClientFactory.createRPCQueryClient({
      rpcEndpoint: RPC_ENDPOINT
    });

    const msg = {
      get_public_key_for_handle: {
        handle
      }
    };

    const result = await queryClient.jsd.jsd.query({ 
      index: CONTRACT_INDEX,
      msg 
    });

    return { success: true, publicKey: result.result };
  } catch (error) {
    console.error('Error querying public key:', error);
    return { success: false, error: error.message };
  }
};
// Update constants at the top of the file
const CHAIN_ID = "hyperweb-1";  // Updated chain ID
const RPC_ENDPOINT = "http://localhost:26657";
const REST_ENDPOINT = "http://localhost:1317";
const CONTRACT_INDEX = "9";

export const suggestChain = async () => {
  try {
    console.log('Suggesting chain with ID:', CHAIN_ID);
    
    await window.keplr.experimentalSuggestChain({
      chainId: CHAIN_ID,
      chainName: "Hyperweb Devnet",
      rpc: RPC_ENDPOINT,
      rest: REST_ENDPOINT,
      bip44: {
        coinType: 118
      },
      bech32Config: {
        bech32PrefixAccAddr: "hyper",
        bech32PrefixAccPub: "hyperpub",
        bech32PrefixValAddr: "hypervaloper",
        bech32PrefixValPub: "hypervaloperpub",
        bech32PrefixConsAddr: "hypervalcons",
        bech32PrefixConsPub: "hypervalconspub"
      },
      currencies: [{
        coinDenom: "HYPER",
        coinMinimalDenom: "uhyper",
        coinDecimals: 6,
        coinGeckoId: "cosmos"
      }],
      feeCurrencies: [{
        coinDenom: "HYPER",
        coinMinimalDenom: "uhyper",
        coinDecimals: 6,
        coinGeckoId: "cosmos",
        gasPriceStep: {
          low: 0,
          average: 0.025,
          high: 0.04
        }
      }],
      stakeCurrency: {
        coinDenom: "HYPER",
        coinMinimalDenom: "uhyper",
        coinDecimals: 6,
        coinGeckoId: "cosmos"
      }
    });
    
    console.log('Chain suggested successfully');
    return { success: true };
  } catch (error) {
    console.error("Failed to suggest chain:", error);
    return { success: false, error: error.message };
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

    const offlineSigner = window.keplr.getOfflineSigner(process.env.CHAIN_ID || "cosmoshub-4");
    const accounts = await offlineSigner.getAccounts();
    return {
      success: true,
      address: accounts[0].address,
      signer: offlineSigner
    };
  } catch (error) {
    console.error("Failed to get Keplr account:", error);
    return {
      success: false,
      error: error.message
    };
  }
};

// Also add debugging to getSigningClient
export const getSigningClient = async () => {
  try {
    console.log('Getting signing client...');
    
    if (!window.keplr) {
      throw new Error("Keplr extension not found");
    }

    console.log('Enabling Keplr for chain:', CHAIN_ID);
    await window.keplr.enable(CHAIN_ID);
    
    console.log('Getting offline signer...');
    const offlineSigner = window.keplr.getOfflineSigner(CHAIN_ID);
    console.log('Offline signer:', offlineSigner);
    
    console.log('Getting accounts...');
    const accounts = await offlineSigner.getAccounts();
    console.log('Accounts:', accounts);
    
    const address = accounts[0].address;
    console.log('Selected address:', address);

    console.log('Creating signing client...');
    const client = await getSigningJsdClient({
      rpcEndpoint: RPC_ENDPOINT,
      signer: offlineSigner
    });
    console.log('Signing client created:', client);

    return { client, address };
  } catch (error) {
    console.error("Failed to get signing client:", error);
    console.error('Error stack:', error.stack);
    throw error;
  }
};


// Helper function to get RPC endpoint
const getRpcEndpoint = async () => {
  // You might want to implement this based on your configuration
  return RPC_ENDPOINT;
};
 