// ECDH-based encryption service
const encoder = new TextEncoder();
const decoder = new TextDecoder();

// Generate ECDH key pair
export const generateECDHKeyPair = async () => {
  try {
    const keyPair = await crypto.subtle.generateKey(
      {
        name: 'ECDH',
        namedCurve: 'P-256'
      },
      true, // extractable
      ['deriveKey', 'deriveBits'] // usages
    );
    return keyPair;
  } catch (error) {
    console.error('Key pair generation error:', error);
    throw error;
  }
};

// Export public key for sharing
export const exportPublicKey = async (publicKey) => {
  try {
    const exported = await crypto.subtle.exportKey('raw', publicKey);
    return Array.from(new Uint8Array(exported));
  } catch (error) {
    console.error('Public key export error:', error);
    throw error;
  }
};

// Import public key from shared data
export const importPublicKey = async (publicKeyData) => {
  try {
    return await crypto.subtle.importKey(
      'raw',
      new Uint8Array(publicKeyData),
      {
        name: 'ECDH',
        namedCurve: 'P-256'
      },
      true,
      [] // No usages for public key
    );
  } catch (error) {
    console.error('Public key import error:', error);
    throw error;
  }
};

// Generate shared secret using ECDH
const deriveSharedSecret = async (privateKey, publicKey) => {
  try {
    return await crypto.subtle.deriveKey(
      {
        name: 'ECDH',
        public: publicKey
      },
      privateKey,
      {
        name: 'AES-GCM',
        length: 256
      },
      false, // not extractable
      ['encrypt', 'decrypt']
    );
  } catch (error) {
    console.error('Shared secret derivation error:', error);
    throw error;
  }
};

// Store key pair in local storage
export const storeKeyPair = async () => {
  try {
    const keyPair = await generateECDHKeyPair();
    const publicKeyData = await exportPublicKey(keyPair.publicKey);
    
    // Store public key data
    localStorage.setItem('publicKey', JSON.stringify(publicKeyData));
    
    // Store private key (as JWK for better security)
    const privateKeyJwk = await crypto.subtle.exportKey('jwk', keyPair.privateKey);
    localStorage.setItem('privateKey', JSON.stringify(privateKeyJwk));
    
    return {
      success: true,
      publicKeyData
    };
  } catch (error) {
    console.error('Key pair storage error:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

// Get stored private key
const getStoredPrivateKey = async () => {
  try {
    const privateKeyJwk = JSON.parse(localStorage.getItem('privateKey'));
    if (!privateKeyJwk) throw new Error('No private key found');
    
    return await crypto.subtle.importKey(
      'jwk',
      privateKeyJwk,
      {
        name: 'ECDH',
        namedCurve: 'P-256'
      },
      true,
      ['deriveKey', 'deriveBits']
    );
  } catch (error) {
    console.error('Private key retrieval error:', error);
    throw error;
  }
};

// Encrypt message
export const encryptMessage = async (message, receiverPublicKeyData) => {
  try {
    // Get sender's private key
    const senderPrivateKey = await getStoredPrivateKey();
    
    // Import receiver's public key
    const receiverPublicKey = await importPublicKey(receiverPublicKeyData);
    
    // Derive shared secret
    const sharedKey = await deriveSharedSecret(senderPrivateKey, receiverPublicKey);
    
    // Generate IV
    const iv = crypto.getRandomValues(new Uint8Array(12));
    
    // Encrypt the message
    const encodedMessage = encoder.encode(message);
    const encryptedData = await crypto.subtle.encrypt(
      {
        name: 'AES-GCM',
        iv: iv
      },
      sharedKey,
      encodedMessage
    );
    
    // Format the encrypted message
    const encryptedArray = Array.from(new Uint8Array(encryptedData));
    const ivArray = Array.from(iv);
    
    // Convert to base64url to save space
    const base64Data = btoa(JSON.stringify({ 
      iv: ivArray, 
      data: encryptedArray 
    }))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');
    
    return {
      success: true,
      data: base64Data
    };
  } catch (error) {
    console.error('Message encryption error:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

// Decrypt message
export const decryptMessage = async (encryptedData, senderPublicKeyData) => {
  try {
    // Parse the base64url data
    const base64 = encryptedData
      .replace(/-/g, '+')
      .replace(/_/g, '/');
    const paddedBase64 = base64 + '='.repeat((4 - base64.length % 4) % 4);
    const { iv, data } = JSON.parse(atob(paddedBase64));
    
    // Get receiver's private key
    const receiverPrivateKey = await getStoredPrivateKey();
    
    // Import sender's public key
    const senderPublicKey = await importPublicKey(senderPublicKeyData);
    
    // Derive shared secret
    const sharedKey = await deriveSharedSecret(receiverPrivateKey, senderPublicKey);
    
    // Decrypt the message
    const decryptedData = await crypto.subtle.decrypt(
      {
        name: 'AES-GCM',
        iv: new Uint8Array(iv)
      },
      sharedKey,
      new Uint8Array(data)
    );
    
    return {
      success: true,
      data: decoder.decode(decryptedData)
    };
  } catch (error) {
    console.error('Message decryption error:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

// Check if keys are stored
export const hasStoredKeys = () => {
  return localStorage.getItem('privateKey') !== null &&
         localStorage.getItem('publicKey') !== null;
};

// Get public key data
export const getPublicKeyData = () => {
  try {
    return JSON.parse(localStorage.getItem('publicKey'));
  } catch (error) {
    console.error('Public key retrieval error:', error);
    return null;
  }
};
