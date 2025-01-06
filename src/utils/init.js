import {  generateAndStoreKeyPair as storeKeyPair } from '../services/encryption';
import { jsd } from "hyperwebjs";

import { registerPublicKey, getPublicKey as getPublicKeyData, } from '../services/wallet';




// Add getPublicKey function
export const getPublicKey = async (handle, session) => {
  try {
    const queryClient = await jsd.ClientFactory.createRPCQueryClient({
      rpcEndpoint: RPC_ENDPOINT,
    });

    const isAuthenticatedUser = session?.handle === handle;
    console.log("Auth check:", { isAuthenticatedUser, sessionHandle: session?.handle, handle });

    const state = await queryClient.jsd.jsd.localState({
      index: CONTRACT_INDEX,
      key: `bluesky/${handle}`,
    });
    console.log("State check:", state);

    if (!state || !state.value) {
      if (!session) {
        throw new Error("Session is required for key operations");
      }

      return {
        success: true,
        publicKey: state,
        handle: handle
      };
    }

    let keyData;
    try {
      keyData = JSON.parse(state.value);
    } catch (error) {
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

export const initializeKeys = async (session, setPublicKey, setError) => {
  try {
    if (!session?.handle) {
      throw new Error('User must be logged in to initialize keys');
    }

    // Check for existing keys
    const existingKeys = localStorage.getItem('cycl3_private_key');
    if (existingKeys) {
      const publicKey = await getPublicKeyData(session.handle);
      setPublicKey(publicKey);
      return { success: true };
    }

    // Generate new ECDH key pair
    const keyPair = await crypto.subtle.generateKey(
      {
        name: 'ECDH',
        namedCurve: 'P-256'
      },
      true,
      ['deriveKey', 'deriveBits']
    );

    // Store the keys
    await storeKeyPair(keyPair);

    // Export public key for display
    const publicKeyJwk = await crypto.subtle.exportKey('jwk', keyPair.publicKey);
    setPublicKey(publicKeyJwk);

    return { success: true };
  } catch (error) {
    console.error('Key initialization error:', error);
    setError('Failed to initialize encryption keys');
    return { success: false, error: error.message };
  }
};