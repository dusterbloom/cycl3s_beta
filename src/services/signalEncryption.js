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

export const getPublicKeyData = async (username) => {
    try {
        const response = await getPublicKeyFromRegistry(username);
        if (!response.success) {
          throw new Error(response.error || 'Failed to retrieve public key');
        }
    
        const publicKeyData = response.publicKey;
    
        // Parse the public key data as needed for your encryption library
        const parsedData = JSON.parse(publicKeyData);
    
        return parsedData;
  } catch (error) {
    console.error("Error getting public key:", error);
    return null;
  }
};

export const encryptMessage = async (message, recipientKey) => {
  try {
    const registrationId = recipientKey.registrationId
      ? recipientKey.registrationId.toString()
      : null;

    if (!registrationId) {
      throw new Error("Invalid recipient key: registrationId is missing");
    }

    const address = new SignalProtocol.SignalProtocolAddress(registrationId, 1);
    const sessionBuilder = new SignalProtocol.SessionBuilder(store, address);
    await sessionBuilder.processPreKey(recipientKey);
    const sessionCipher = new SignalProtocol.SessionCipher(store, address);
    const plaintext = new TextEncoder().encode(message).buffer;
    const ciphertext = await sessionCipher.encrypt(plaintext);

    return {
      success: true,
      data: btoa(
        JSON.stringify({
          type: ciphertext.type,
          body: Array.from(new Uint8Array(ciphertext.body)),
        })
      ),
    };
  } catch (error) {
    console.error("Encryption error:", error);
    return {
      success: false,
      error: error.message,
    };
  }
};

export const decryptMessage = async (encryptedMessage, senderKey) => {
  try {
    const address = new SignalProtocol.SignalProtocolAddress(
      senderKey.registrationId.toString(),
      1
    );
    const sessionCipher = new SignalProtocol.SessionCipher(store, address);
    const { type, body } = JSON.parse(atob(encryptedMessage));

    let plaintext;
    if (type === 3) {
      // PreKeyWhisperMessage
      plaintext = await sessionCipher.decryptPreKeyWhisperMessage(
        new Uint8Array(body).buffer,
        "binary"
      );
    } else if (type === 1) {
      // WhisperMessage
      plaintext = await sessionCipher.decryptWhisperMessage(
        new Uint8Array(body).buffer,
        "binary"
      );
    } else {
      throw new Error("Unknown message type");
    }
    return {
      success: true,
      data: new TextDecoder().decode(new Uint8Array(plaintext)),
    };
  } catch (error) {
    console.error("Decryption error:", error);
    return {
      success: false,
      error: error.message,
    };
  }
};
export const hasStoredKeys = (session) => {
  try {
    const publicKeyData = localStorage.getItem(
      `${KEY_STORAGE_PREFIX}${session.handle}_publicKey`
    );
    return !!publicKeyData;
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
// Store key pair with encryption
export const storeKeyPair = async (session) => {
    const registrationId = localStorage.getItem(`${KEY_STORAGE_PREFIX}registrationId`);


  try {

    // Generate ECDH keypair
    const keyPair = await crypto.subtle.generateKey(
      {
        name: "ECDH",
        namedCurve: "P-256",
      },
      true, // extractable
      ["deriveKey", "deriveBits"]
    );
    // Export keys to JWK format
    // Export keys
    const publicKey = await crypto.subtle.exportKey("jwk", keyPair.publicKey);
    const privateKey = await crypto.subtle.exportKey("jwk", keyPair.privateKey);
    // Store key data
    const keyData = {
      version: KEY_VERSION,
      created: Date.now(),
      publicKey,
      privateKey,
      registrationId: registrationId ? parseInt(registrationId, 10) : null,

    };
    localStorage.setItem(
      `${KEY_STORAGE_PREFIX}${session.handle}_publicKey`,
      JSON.stringify(keyData.publicKey)
    );
    return {
      success: true,
      publicKey,
    };
  } catch (error) {
    console.error("Key generation error:", error);
    return {
      success: false,
      error: "Failed to generate encryption keys",
    };
  }
};
// Get stored key pair
export const getStoredKeyPair = async () => {
  try {
    const storedData = localStorage.getItem(`${KEY_STORAGE_PREFIX}keypair`);
    if (!storedData) {
      throw new Error("No encryption keys found");
    }
    const { publicKey: publicKeyJwk, privateKey: privateKeyJwk } =
      JSON.parse(storedData);
    // Import keys
    const publicKey = await crypto.subtle.importKey(
      "jwk",
      publicKeyJwk,
      KEY_ALGORITHM,
      true,
      []
    );
    const privateKey = await crypto.subtle.importKey(
      "jwk",
      privateKeyJwk,
      KEY_ALGORITHM,
      true,
      ["deriveKey", "deriveBits"]
    );
    return {
      success: true,
      publicKey,
      privateKey,
    };
  } catch (error) {
    console.error("Key retrieval error:", error);
    return {
      success: false,
      error: "Failed to retrieve encryption keys",
    };
  }
};
