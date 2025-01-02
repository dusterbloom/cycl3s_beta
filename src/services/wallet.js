import { DirectSecp256k1Wallet } from '@cosmjs/proto-signing';
import { getSigningJsdClient, jsd } from 'hyperwebjs';
import { SigningCosmWasmClient } from '@cosmjs/cosmwasm-stargate';
import { GasPrice } from '@cosmjs/stargate';

// Constants - hardcoded for development
const CHAIN_ID = "hyperweb";
const RPC_ENDPOINT = "http://localhost:26657";
const CONTRACT_INDEX = "9";

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

export const suggestChain = async () => {
  try {
    await window.keplr.experimentalSuggestChain({
      chainId: CHAIN_ID,
      chainName: "Hyperweb",
      rpc: RPC_ENDPOINT,
      rest: "http://localhost:1317",
      bip44: {
        coinType: 118,
      },
      bech32Config: {
        bech32PrefixAccAddr: "hyper",
        bech32PrefixAccPub: "cosmospub",
        bech32PrefixValAddr: "cosmosvaloper",
        bech32PrefixValPub: "cosmosvaloperpub",
        bech32PrefixConsAddr: "cosmosvalcons",
        bech32PrefixConsPub: "cosmosvalconspub",
      },
      currencies: [{
        coinDenom: "HYPER",
        coinMinimalDenom: "uhyper",
        coinDecimals: 6,
        coinGeckoId: "cosmos",
      }],
      feeCurrencies: [{
        coinDenom: "HYPER",
        coinMinimalDenom: "uhyper",
        coinDecimals: 6,
        coinGeckoId: "cosmos",
      }],
      stakeCurrency: {
        coinDenom: "HYPER",
        coinMinimalDenom: "uhyper",
        coinDecimals: 6,
        coinGeckoId: "cosmos",
      },
      gasPriceStep: {
        low: 0.01,
        average: 0.025,
        high: 0.04,
      },
    });
    return { success: true };
  } catch (error) {
    console.error("Failed to suggest chain:", error);
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

export const getPublicKey = async (handle) => {
  try {
    console.log('Getting public key for handle:', handle);
    
    // Create query client as shown in the docs
    const queryClient = await jsd.ClientFactory.createRPCQueryClient({
      rpcEndpoint: RPC_ENDPOINT
    });

    // Query the contract state directly using localState
    const state = await queryClient.jsd.jsd.localState({ 
      index: CONTRACT_INDEX, 
      key: `bluesky/${handle}` // Contract stores keys with this prefix
    });
    
    console.log('Query response:', state);

    if (!state || !state.value) {
      return { 
        success: false, 
        error: `No public key found for handle: ${handle}` 
      };
    }

    return { 
      success: true, 
      publicKey: state.value 
    };
  } catch (error) {
    console.error('Error fetching public key:', error);
    return { 
      success: false, 
      error: error.message 
    };
  }
};

export const registerPublicKey = async (handle, publicKey) => {
  try {
    const { client, address } = await getSigningClient();

    // Create message as shown in the docs
    const msg = jsd.jsd.MessageComposer.fromPartial.eval({
      creator: address,
      index: CONTRACT_INDEX,
      fnName: "registerBlueskyHandle",
      arg: JSON.stringify({ 
        handle, 
        publicKey 
      })
    });

    const fee = { 
      amount: [{ denom: "uhyper", amount: "100000" }],
      gas: "550000"
    };

    const result = await client.signAndBroadcast(address, [msg], fee);
    return { success: true, result };
  } catch (error) {
    console.error('Error registering public key:', error);
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

// Keep existing Keplr functions
// export const connectKeplr = async () => {
//   try {
//     if (!window.keplr) {
//       throw new Error("Keplr extension not found");
//     }

//     await window.keplr.enable(process.env.CHAIN_ID || "hyperweb");
//     return { success: true };
//   } catch (error) {
//     console.error("Failed to connect to Keplr:", error);
//     return {
//       success: false,
//       error: error.message
//     };
//   }
// };

// Helper function to get RPC endpoint
const getRpcEndpoint = async () => {
  // You might want to implement this based on your configuration
  return RPC_ENDPOINT;
};

// // src/services/wallet.js

// import {
//   SigningCosmWasmClient,
//   CosmWasmClient,
// } from '@cosmjs/cosmwasm-stargate';
// import { GasPrice } from '@cosmjs/stargate';

// const RPC_ENDPOINT = 'https://archway-rpc.polkachu.com'; // Replace with actual RPC endpoint
// const CONTRACT_ADDRESS = 'archway1275jwjpktae4y4y0cdq274a2m0jnpekhttnfuljm6n59wnpyd62qppqxq0'; // Replace with the actual ArchID contract address
// const CHAIN_ID = 'archway-1'; // Replace with the actual chain ID

// // Function to get a SigningCosmWasmClient
// export const getSigningClient = async () => {
//   if (!window.keplr) {
//     throw new Error('Keplr extension not found');
//   }

//   await window.keplr.enable(CHAIN_ID);

//   const offlineSigner = window.getOfflineSigner(CHAIN_ID);
//   const accounts = await offlineSigner.getAccounts();

//   const client = await SigningCosmWasmClient.connectWithSigner(
//     RPC_ENDPOINT,
//     offlineSigner,
//     { gasPrice: GasPrice.fromString('0.025uarch') } // Adjust the gas price and denom
//   );

//   return { client, address: accounts[0].address };
// };

// // Function to register public key
// export const registerPublicKey = async (username, publicKey) => {
//   try {
//     const { client, address } = await getSigningClient();

//     const executeMsg = {
//       register_identity: {
//         identity: username,
//         data: { public_key: publicKey },
//       },
//     };

//     const result = await client.execute(
//       address,
//       CONTRACT_ADDRESS,
//       executeMsg,
//       'auto',
//       'Register public key'
//     );

//     console.log('Public key registered:', result);
//     return { success: true, result };
//   } catch (error) {
//     console.error('Error registering public key:', error);
//     return { success: false, error: error.message };
//   }
// };

// // Function to get public key
// export const getPublicKey = async (username) => {
//   try {
//     const client = await CosmWasmClient.connect(RPC_ENDPOINT);

//     const query = {
//       get_identity: { identity: username },
//     };

//     const result = await client.queryContractSmart(CONTRACT_ADDRESS, query);

//     if (result && result.data && result.data.public_key) {
//       return { success: true, publicKey: result.data.public_key };
//     } else {
//       throw new Error('Public key not found');
//     }
//   } catch (error) {
//     console.error('Error fetching public key:', error);
//     return { success: false, error: error.message };
//   }
// };


// export const connectKeplr = async () => {
//   try {
//     // Check if Keplr is installed
//     if (!window.keplr) {
//       throw new Error('Please install Keplr extension');
//     }

//     // Enable the chain
//     await window.keplr.enable(CHAIN_ID);

//     // Get the offlineSigner
//     const offlineSigner = window.keplr.getOfflineSigner(CHAIN_ID);

//     // Get user's address
//     const accounts = await offlineSigner.getAccounts();
//     const address = accounts[0].address;

//     return {
//       success: true,
//       data: {
//         address,
//         signer: offlineSigner
//       }
//     };
//   } catch (error) {
//     console.error('Keplr connection error:', error);
//     return {
//       success: false,
//       error: error.message
//     };
//   }
// };

// export const getKeplrAccount = async () => {
//   try {
//     if (!window.keplr) {
//       throw new Error('Keplr not found');
//     }

//     const key = await window.keplr.getKey(CHAIN_ID);
//     return {
//       success: true,
//       data: {
//         address: key.bech32Address,
//         pubKey: key.pubKey,
//         name: key.name
//       }
//     };
//   } catch (error) {
//     console.error('Get account error:', error);
//     return {
//       success: false,
//       error: error.message
//     };
//   }
// };

// export const suggestChain = async () => {
//   try {
//     await window.keplr.experimentalSuggestChain({
//       chainId: CHAIN_ID,
//       chainName: CHAIN_NAME,
//       rpc: 'https://rpc-cosmoshub.keplr.app',
//       rest: 'https://lcd-cosmoshub.keplr.app',
//       bip44: {
//         coinType: 118,
//       },
//       bech32Config: {
//         bech32PrefixAccAddr: 'cosmos',
//         bech32PrefixAccPub: 'cosmospub',
//         bech32PrefixValAddr: 'cosmosvaloper',
//         bech32PrefixValPub: 'cosmosvaloperpub',
//         bech32PrefixConsAddr: 'cosmosvalcons',
//         bech32PrefixConsPub: 'cosmosvalconspub'
//       },
//       currencies: [{
//         coinDenom: 'ATOM',
//         coinMinimalDenom: 'uatom',
//         coinDecimals: 6,
//         coinGeckoId: 'cosmos'
//       }],
//       feeCurrencies: [{
//         coinDenom: 'ATOM',
//         coinMinimalDenom: 'uatom',
//         coinDecimals: 6,
//         coinGeckoId: 'cosmos'
//       }],
//       stakeCurrency: {
//         coinDenom: 'ATOM',
//         coinMinimalDenom: 'uatom',
//         coinDecimals: 6,
//         coinGeckoId: 'cosmos'
//       },
//       gasPriceStep: {
//         low: 0.01,
//         average: 0.025,
//         high: 0.04
//       }
//     });

//     return { success: true };
//   } catch (error) {
//     console.error('Suggest chain error:', error);
//     return {
//       success: false,
//       error: error.message
//     };
//   }
// };
