import { registerPublicKey, getPublicKey  } from '../services/wallet';

const KEY_VERSION = '1.0';
const KEY_STORAGE_PREFIX = 'cycl3_keys_';
const KEY_ALGORITHM = {
  name: 'ECDH',
  namedCurve: 'P-256'
};

const encoder = new TextEncoder();
const decoder = new TextDecoder();

const CHAIN_ID = "hyperweb-1"; // Updated chain ID
const RPC_ENDPOINT = "http://localhost:26657";
const REST_ENDPOINT = "http://localhost:1317";
const CONTRACT_INDEX = "1";


// Generate and store new keypair, plus register on-chain
export const initializeKeys = async (session) => {
  try {
    if (!session?.handle) {
      throw new Error('User must be logged in to initialize keys');
    }

    // Check for existing keys
    const existingKeys = await getStoredKeyPair();
    if (existingKeys.success) {
      return existingKeys;
    }

    // Generate new ECDH keypair
    const keyPair = await crypto.subtle.generateKey(
      KEY_ALGORITHM,
      true,
      ['deriveKey', 'deriveBits']
    );

    // Export keys for storage
    const publicKeyJwk = await crypto.subtle.exportKey('jwk', keyPair.publicKey);
    const privateKeyJwk = await crypto.subtle.exportKey('jwk', keyPair.privateKey);

    // Store locally
    const keyData = {
      version: KEY_VERSION,
      created: Date.now(),
      publicKey: publicKeyJwk,
      privateKey: privateKeyJwk
    };

    localStorage.setItem(
      `${KEY_STORAGE_PREFIX}${session.handle}_keypair`,
      JSON.stringify(keyData)
    );

    // Register public key on-chain
    const registrationResult = await registerPublicKey(
      session.handle, 
      publicKeyJwk
    );

    if (!registrationResult.success) {
      throw new Error('Failed to register public key on-chain');
    }

    return {
      success: true,
      publicKey: keyPair.publicKey,
      privateKey: keyPair.privateKey
    };
  } catch (error) {
    console.error('Key initialization error:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

export const generateAndStoreKeyPair = async (handle) => {
  try {
    // Generate ECDH keypair
    const keyPair = await crypto.subtle.generateKey(
      KEY_ALGORITHM,
      true,
      ['deriveKey', 'deriveBits']
    );

    // Export keys to JWK format
    const publicKeyJwk = await crypto.subtle.exportKey('jwk', keyPair.publicKey);
    const privateKeyJwk = await crypto.subtle.exportKey('jwk', keyPair.privateKey);

    // Store private key locally
    const keyData = {
      version: KEY_VERSION,
      created: Date.now(),
      publicKey: publicKeyJwk,
      privateKey: privateKeyJwk
    };

    localStorage.setItem(
      `${KEY_STORAGE_PREFIX}${handle}_keypair`,
      JSON.stringify(keyData)
    );

    // Convert any BigInt values to strings before stringifying
    const serializedPublicKey = Object.entries(publicKeyJwk).reduce(
      (acc, [key, value]) => {
        acc[key] = typeof value === 'bigint' ? value.toString() : value;
        return acc;
      },
      {}
    );

    // For the contract, send the serialized public key
    const publicKeyString = btoa(JSON.stringify(serializedPublicKey));

    return {
      success: true,
      publicKey: publicKeyString,
    };
  } catch (error) {
    console.error('Key generation error:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

// Retrieve stored keypair
// Update getStoredKeyPair to first check contract registry
export const getStoredKeyPair = async (handle) => {
  try {
    // ALWAYS check contract registry first
    const registryResponse = await getPublicKey(handle);
    if (!registryResponse.success) {
      throw new Error(`No registered keys found for ${handle} on contract`);
    }

    // Get local keys to match against registry
    const storedData = localStorage.getItem(`${KEY_STORAGE_PREFIX}${handle}_keypair`);
    if (!storedData) {
      throw new Error('No matching local keys found');
    }

    const keyData = JSON.parse(storedData);
    const registryKey = JSON.parse(atob(registryResponse.publicKey.value));

    // Verify local public key matches registry
    if (JSON.stringify(keyData.publicKey) !== JSON.stringify(registryKey)) {
      throw new Error('Local keys do not match contract registry');
    }

    // Import keys only after verification
    const publicKey = await crypto.subtle.importKey(
      'jwk',
      keyData.publicKey,
      KEY_ALGORITHM,
      true,
      []
    );

    const privateKey = await crypto.subtle.importKey(
      'jwk',
      keyData.privateKey,
      KEY_ALGORITHM,
      true,
      ['deriveKey', 'deriveBits']
    );

    return {
      success: true,
      publicKey,
      privateKey
    };
  } catch (error) {
    console.error('Key retrieval error:', error);
    return { success: false, error: error.message };
  }
};

export const getKeplrKeys = async (handle) => {
  try {
    if (!window.keplr) {
      throw new Error("Keplr extension not found");
    }

    await window.keplr.enable(CHAIN_ID);
    const offlineSigner = window.keplr.getOfflineSigner(CHAIN_ID);
    const accounts = await offlineSigner.getAccounts();
    
    // Get the encryption key from Keplr
    const encryptionKey = await window.keplr.getKey(CHAIN_ID);
    
    return {
      success: true,
      publicKey: encryptionKey.pubKey,
      address: accounts[0].address,
      handle: handle
    };
  } catch (error) {
    console.error("Failed to get Keplr keys:", error);
    return { success: false, error: error.message };
  }
};

export const encryptMessage = async (message, recipientHandle, senderHandle, session) => {
  try {
    // Get recipient's public key from registry
    const recipientKeyData = await getPublicKey(recipientHandle);
    if (!recipientKeyData?.success || !recipientKeyData.publicKey?.value) {
      throw new Error("Recipient's public key not found");
    }

    // Create minimal message with shortened fields
    const msg = {
      t: message,                    // text
      s: senderHandle.split('.')[0], // shortened sender
      d: Date.now().toString(36)     // base36 timestamp
    };

    // Generate small IV (96 bits = 12 bytes is secure for AES-GCM)
    const iv = crypto.getRandomValues(new Uint8Array(12));

    // Encrypt message
    const msgBytes = new TextEncoder().encode(JSON.stringify(msg));
    const encrypted = await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv },
      await crypto.subtle.importKey(
        'raw',
        new TextEncoder().encode(recipientKeyData.publicKey.value).slice(0, 32),
        { name: 'AES-GCM' },
        false,
        ['encrypt']
      ),
      msgBytes
    );

    // Combine IV and encrypted data into single Uint8Array
    const combined = new Uint8Array([...iv, ...new Uint8Array(encrypted)]);
    
    // Convert to base64url without padding
    const base64url = btoa(String.fromCharCode(...combined))
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');

    return { success: true, data: base64url };
  } catch (error) {
    console.error('Encryption error:', error);
    return { success: false, error: error.message };
  }
};

export const decryptMessage = async (encryptedData, senderPublicKey) => {
  try {
    // Convert base64url to bytes
    const bytes = Uint8Array.from(atob(
      encryptedData.replace(/-/g, '+').replace(/_/g, '/')
    ), c => c.charCodeAt(0));

    // Split IV and encrypted data
    const iv = bytes.slice(0, 12);
    const encrypted = bytes.slice(12);

    // Create decryption key
    const decryptionKey = await crypto.subtle.importKey(
      'raw',
      new TextEncoder().encode(senderPublicKey).slice(0, 32),
      { name: 'AES-GCM' },
      false,
      ['decrypt']
    );

    // Decrypt
    const decrypted = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv },
      decryptionKey,
      encrypted
    );

    const { t: text } = JSON.parse(new TextDecoder().decode(decrypted));
    return { success: true, data: text };
  } catch (error) {
    console.error('Decryption error:', error);
    return { success: false, error: error.message };
  }
};


// Helper function to check for stored keys
export const hasStoredKeys = (handle) => {
  try {
    const keys = localStorage.getItem(`${KEY_STORAGE_PREFIX}${handle}_keypair`);
    return !!keys;
  } catch (error) {
    console.error('Error checking stored keys:', error);
    return false;
  }
};