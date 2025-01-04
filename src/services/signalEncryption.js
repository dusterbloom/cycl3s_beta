import * as SignalProtocol from "@privacyresearch/libsignal-protocol-typescript";
import { getPublicKey as getPublicKeyFromRegistry } from './wallet';


const KEY_VERSION = "1.0";
const KEY_ALGORITHM = {
  name: "ECDH",
  namedCurve: "P-256",
};

const KEY_STORAGE_PREFIX = "cycl3_keys_";



class SignalProtocolStore {
  constructor() {
    this.store = {};
    this.trustedKeys = {};
  }
  async getIdentityKeyPair() {
    const serialized = localStorage.getItem(`${KEY_STORAGE_PREFIX}identityKey`);
    return serialized ? JSON.parse(serialized) : null;
  }
  async getLocalRegistrationId() {
    const id = localStorage.getItem(`${KEY_STORAGE_PREFIX}registrationId`);
    return id ;
  }
  async loadIdentityKey(identifier) {
    const key = await this.getIdentityKeyPair();
    return key?.pubKey;
  }
  async storeIdentityKey(identifier, key) {
    return true; // Return true if successful
  }
  async loadPreKey(keyId) {
    return this.store[`prekey_${keyId}`];
  }
  async storePreKey(keyId, key) {
    this.store[`prekey_${keyId}`] = key;
  }
  async loadSignedPreKey(keyId) {
    return this.store[`signed_prekey_${keyId}`];
  }
  async storeSignedPreKey(keyId, key) {
    this.store[`signed_prekey_${keyId}`] = key;
  }
  async loadSession(identifier) {
    return this.store[`session_${identifier}`];
  }
  async storeSession(identifier, record) {
    this.store[`session_${identifier}`] = record;
  }
  async removeSession(identifier) {
    delete this.store[`session_${identifier}`];
  }



  async saveIdentity(identifier, identityKey) {
    this.trustedKeys[identifier] = identityKey;
  }
  async removeAllSessions(identifier) {
    for (const key in this.store) {
      if (key.startsWith(`session_${identifier}`)) {
        delete this.store[key];
      }
    }
  }
}
const store = new SignalProtocolStore();

export const initializeSignalProtocol = async (userId) => {
  try {
    const existingIdentityKey = await store.getIdentityKeyPair();
    let publicKeyBundle;

    if (existingIdentityKey) {
      console.log("Using existing identity key");
      const registrationId = await store.getLocalRegistrationId();
      
      // Get existing public key bundle from localStorage
      const existingBundle = localStorage.getItem(
        `${KEY_STORAGE_PREFIX}${userId}_publicKey`
      );
      
      if (existingBundle) {
        publicKeyBundle = JSON.parse(existingBundle);
      } else {
        // Recreate bundle from existing identity key
        publicKeyBundle = {
          registrationId: parseInt(registrationId),
          identityPubKey: existingIdentityKey.pubKey,
          // You might want to regenerate these if needed
          signedPreKey: existingIdentityKey.signedPreKey,
          preKey: existingIdentityKey.preKey
        };
      }
    } else {
      // Generate new keys
      const identityKeyPair = await SignalProtocol.KeyHelper.generateIdentityKeyPair();
      const registrationId = SignalProtocol.KeyHelper.generateRegistrationId();
      console.log("Generated new registration id:", registrationId);

      // Generate prekeys
      const preKeyId = Math.floor(Math.random() * 16777215 + 1);
      const preKey = await SignalProtocol.KeyHelper.generatePreKey(preKeyId);
      const signedPreKeyId = Math.floor(Math.random() * 16777215 + 1);
      const signedPreKey = await SignalProtocol.KeyHelper.generateSignedPreKey(
        identityKeyPair,
        signedPreKeyId
      );
    
      // Store keys
      await store.storePreKey(preKeyId, preKey.keyPair);
      await store.storeSignedPreKey(signedPreKeyId, signedPreKey.keyPair);
      await store.storeIdentityKey(userId, identityKeyPair);

      localStorage.setItem(
        `${KEY_STORAGE_PREFIX}identityKey`,
        JSON.stringify(identityKeyPair)
      );
      localStorage.setItem(
        `${KEY_STORAGE_PREFIX}registrationId`,
        registrationId.toString()
      );

      // Create public key bundle
      publicKeyBundle = {
        registrationId,
        identityPubKey: identityKeyPair.pubKey,
        signedPreKey: {
          keyId: signedPreKeyId,
          publicKey: signedPreKey.keyPair.pubKey,
          signature: signedPreKey.signature,
        },
        preKey: {
          keyId: preKeyId,
          publicKey: preKey.keyPair.pubKey,
        },
      };

      localStorage.setItem(
        `${KEY_STORAGE_PREFIX}${userId}_publicKey`,
        JSON.stringify(publicKeyBundle)
      );
    }

    return {
      success: true,
      publicKey: publicKeyBundle,
    };
  } catch (error) {
    console.error("Signal initialization error:", error);
    return {
      success: false,
      error: error.message,
    };
  }
};

// export const initializeKeys = async (session, setPublicKey, setError) => {
//     try {
//       console.log("Checking stored keys:", hasStoredKeys(session));
//       let publicKey = null;
  
//       // Check if the session object is valid
//       if (!session || !session.handle) {
//         throw new Error("Invalid session object");
//       }
  
//       if (!hasStoredKeys(session)) {
//         console.log("No keys found, generating new pair");
//         const { success, publicKey: newPublicKey } = await storeKeyPair(session);
//         if (!success) {
//           throw new Error("Failed to generate encryption keys");
//         }
//         publicKey = newPublicKey;
//       } else {
//         publicKey = await getPublicKeyData(session.handle);
//       }
  
//       console.log('Public key loaded:', publicKey);
//       setPublicKey(publicKey);
//     } catch (error) {
//       console.error('Key initialization error:', error);
//       setError(error.message);
//     }
//   };


export const getPublicKeyData = async (handle) => {
  try {
    if (!handle) {
      console.log('No handle provided to getPublicKeyData');
      return null;
    }

    console.log('Getting public key data for handle:', handle);
    const response = await getPublicKeyFromRegistry(handle);
    
    if (!response.success) {
      console.log('No public key found in contract for handle:', handle);
      return null;
    }

    return {
      success: true,
      publicKey: response.publicKey
    };
  } catch (error) {
    console.error("Error getting public key:", error);
    return null;
  }
};

// Encryption function
export const encryptMessage = async (message, recipientPublicKey) => {
  try {
    // Generate a random 256-bit (32 bytes) key for AES-256-GCM
    const encryptionKey = await crypto.subtle.generateKey(
      {
        name: "AES-GCM",
        length: 256  // Explicitly set to 256 bits
      },
      true,
      ["encrypt"]
    );

    // Generate a random 12-byte IV
    const iv = crypto.getRandomValues(new Uint8Array(12));

    // Encrypt the message
    const encoder = new TextEncoder();
    const ciphertext = await crypto.subtle.encrypt(
      {
        name: "AES-GCM",
        iv: iv
      },
      encryptionKey,
      encoder.encode(message)
    );

    // Export the encryption key
    const rawKey = await crypto.subtle.exportKey('raw', encryptionKey);

    // Combine key + IV + ciphertext
    const combined = new Uint8Array(rawKey.byteLength + iv.byteLength + ciphertext.byteLength);
    combined.set(new Uint8Array(rawKey), 0);
    combined.set(iv, rawKey.byteLength);
    combined.set(new Uint8Array(ciphertext), rawKey.byteLength + iv.byteLength);

    // Convert to base64
    const encryptedBase64 = btoa(String.fromCharCode.apply(null, combined));

    return {
      success: true,
      data: encryptedBase64
    };
  } catch (error) {
    console.error("Encryption error:", error);
    return {
      success: false,
      error: error.message
    };
  }
};

// Decryption function
export const decryptMessage = async (encryptedData) => {
  try {
    // Decode base64
    const combined = Uint8Array.from(atob(encryptedData), c => c.charCodeAt(0));

    // Split the combined data
    const rawKey = combined.slice(0, 32); // 256-bit key = 32 bytes
    const iv = combined.slice(32, 44); // 12 bytes IV
    const ciphertext = combined.slice(44); // Rest is ciphertext

    // Import the encryption key
    const decryptionKey = await crypto.subtle.importKey(
      'raw',
      rawKey,
      {
        name: 'AES-GCM',
        length: 256  // Explicitly set to 256 bits
      },
      false,
      ['decrypt']
    );

    // Decrypt
    const decrypted = await crypto.subtle.decrypt(
      {
        name: 'AES-GCM',
        iv: iv
      },
      decryptionKey,
      ciphertext
    );

    // Decode the result
    const decoder = new TextDecoder();
    return {
      success: true,
      data: decoder.decode(decrypted)
    };
  } catch (error) {
    console.error('Message decryption error:', error);
    return {
      success: false,
      error: 'Failed to decrypt message'
    };
  }
};

export const hasStoredKeys = async (session) => {
  try {
    // Wait for session to be fully loaded
    if (!session?.user?.handle) {
      console.log('Session not fully loaded:', {
        session,
        user: session?.user,
        handle: session?.user?.handle
      });
      return false;
    }

    const handle = session.user.handle;
    console.log('Checking stored keys for handle:', handle);

    // Check local storage first
    const localKeys = localStorage.getItem(
      `${KEY_STORAGE_PREFIX}${handle}_publicKey`
    );

    if (!localKeys) {
      console.log('No local keys found for handle:', handle);
      return false;
    }

    // Only check contract if we have local keys
    const contractKeys = await queryPublicKey(handle);
    console.log('Contract query response:', contractKeys);

    return contractKeys?.success;
  } catch (error) {
    console.error("Error checking stored keys:", error);
    return false;
  }
};

export const generateAndStoreKeyPair = async (handle) => {
  try {
    // Generate ECDH keypair
    const keyPair = await crypto.subtle.generateKey(
      {
        name: "ECDH",
        namedCurve: "P-256",
      },
      true,
      ["deriveKey", "deriveBits"]
    );

    // Export keys to JWK format
    const publicKey = await crypto.subtle.exportKey("jwk", keyPair.publicKey);
    const privateKey = await crypto.subtle.exportKey("jwk", keyPair.privateKey);

    // Store private key locally
    localStorage.setItem(
      `${KEY_STORAGE_PREFIX}${handle}_privateKey`,
      JSON.stringify({
        privateKey,
        created: Date.now(),
        version: KEY_VERSION
      })
    );

    // Convert any BigInt values to strings before stringifying
    const serializedPublicKey = Object.entries(publicKey).reduce((acc, [key, value]) => {
      acc[key] = typeof value === 'bigint' ? value.toString() : value;
      return acc;
    }, {});

    // For the contract, send the serialized public key
    const publicKeyString = btoa(JSON.stringify(serializedPublicKey));

    return {
      success: true,
      publicKey: publicKeyString
    };
  } catch (error) {
    console.error("Key generation error:", error);
    return {
      success: false,
      error: error.message
    };
  }
};

// Key storage functions
export const storeKeyPair = async (keyPair) => {
  try {
    // Export private key to JWK format
    const privateKeyJwk = await crypto.subtle.exportKey('jwk', keyPair.privateKey);
    const publicKeyJwk = await crypto.subtle.exportKey('jwk', keyPair.publicKey);
    
    // Store both keys
    localStorage.setItem('cycl3_private_key', JSON.stringify(privateKeyJwk));
    localStorage.setItem('cycl3_public_key', JSON.stringify(publicKeyJwk));
    
    return { success: true };
  } catch (error) {
    console.error('Error storing keypair:', error);
    return { success: false, error: error.message };
  }
};

export const getStoredKeyPair = async () => {
  try {
    // Get stored keys
    const privateKeyStr = localStorage.getItem('cycl3_private_key');
    const publicKeyStr = localStorage.getItem('cycl3_public_key');
    
    if (!privateKeyStr || !publicKeyStr) {
      throw new Error('No encryption keys found');
    }

    // Parse stored keys
    const privateKeyJwk = JSON.parse(privateKeyStr);
    const publicKeyJwk = JSON.parse(publicKeyStr);

    // Import keys back to CryptoKey format
    const privateKey = await crypto.subtle.importKey(
      'jwk',
      privateKeyJwk,
      {
        name: 'ECDH',
        namedCurve: 'P-256'
      },
      true,
      ['deriveKey', 'deriveBits']
    );

    const publicKey = await crypto.subtle.importKey(
      'jwk',
      publicKeyJwk,
      {
        name: 'ECDH',
        namedCurve: 'P-256'
      },
      true,
      []
    );

    return {
      success: true,
      privateKey,
      publicKey
    };
  } catch (error) {
    console.error('Key retrieval error:', error);
    return { success: false, error: error.message };
  }
};
