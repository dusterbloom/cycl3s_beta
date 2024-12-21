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


// Helper function for security event logging
async function logSecurityEvent(event) {
  try {
    const events = JSON.parse(
      localStorage.getItem(KEY_STORAGE_PREFIX + 'security_log') || '[]'
    );
    events.push(event);
    // Keep only last 100 events
    if (events.length > 100) {
      events.shift();
    }
    localStorage.setItem(
      KEY_STORAGE_PREFIX + 'security_log', 
      JSON.stringify(events)
    );
  } catch (error) {
    console.error('Security log error:', error);
  }
}


// Helper function to collect device entropy
async function collectDeviceEntropy() {
  // Initialize entropy array
  const entropy = new Uint8Array(32);
  
  // Collect entropy from various sources
  const sources = [
    navigator.userAgent,
    screen.width.toString(),
    screen.height.toString(),
    new Date().getTime().toString(),
    crypto.getRandomValues(new Uint8Array(16)).toString()
  ];
   // Mix entropy sources
  const sourceData = new TextEncoder().encode(sources.join(''));
  for (let i = 0; i < sourceData.length && i < entropy.length; i++) {
    entropy[i] = sourceData[i];
  }
   // Add cryptographic randomness
  const randomData = crypto.getRandomValues(new Uint8Array(16));
  for (let i = 0; i < randomData.length; i++) {
    entropy[i % entropy.length] ^= randomData[i];
  }
   return entropy;
}


 // Key rotation mechanism
 export const rotateKeys = async (oldVersion) => {
  try {
    // Get old keys if they exist
    const oldKeys = await getStoredKeyPair();
    
    // Generate new key pair
    const newKeyPair = await storeKeyPair();
    
    if (!newKeyPair.success) {
      throw new Error('Failed to generate new keys');
    }
     // If we had old keys, we need to re-encrypt any existing data
    if (oldKeys.success) {
      await reencryptData(oldKeys.privateKey, newKeyPair.privateKey);
    }
     // Log rotation for security audit
    await logSecurityEvent({
      type: 'KEY_ROTATION',
      oldVersion,
      newVersion: KEY_VERSION,
      timestamp: Date.now()
    });
     return {
      success: true,
      publicKey: newKeyPair.publicKey
    };
  } catch (error) {
    console.error('Key rotation error:', error);
    return {
      success: false,
      error: 'Failed to rotate encryption keys'
    };
  }
 ;
 }
 


const KEY_VERSION = '1.0';
 const KEY_STORAGE_PREFIX = 'cycl3_keys_';
 const KEY_ALGORITHM = {
  name: 'ECDH',
  namedCurve: 'P-256'
 
 }

// Helper function to export public key
async function exportPublicKey(publicKey) {
 try {
   return await crypto.subtle.exportKey('jwk', publicKey);
 } catch (error) {
   console.error('Public key export error:', error);
   return null;
 }
}
// Get public key data for sharing
export const getPublicKeyData = async () => {
  try {
    const storedData = localStorage.getItem(`${KEY_STORAGE_PREFIX}keypair`);
    if (!storedData) {
      throw new Error('No encryption keys found');
    }
     const { publicKey } = JSON.parse(storedData);
    return publicKey;
  } catch (error) {
    console.error('Public key retrieval error:', error);
    return 

;
}
}
// Check for stored keys
export const hasStoredKeys = () => {
  try {
    const keys = localStorage.getItem(`${KEY_STORAGE_PREFIX}keypair`);
    return !!keys;
  } catch (error) {
    console.error('Error checking stored keys:', error);
    return false;
  }
;
}
// Store key pair with encryption
export const storeKeyPair = async () => {
 try {
   // Generate ECDH keypair
   const keyPair = await crypto.subtle.generateKey(
     {
       name: 'ECDH',
       namedCurve: 'P-256'
     },
     true, // extractable
     ['deriveKey', 'deriveBits']
   );
    // Export keys to JWK format
      // Export keys
      const publicKey = await crypto.subtle.exportKey('jwk', keyPair.publicKey);
      const privateKey = await crypto.subtle.exportKey('jwk', keyPair.privateKey);
    // Store key data
    const keyData = {
      version: KEY_VERSION,
      created: Date.now(),
      publicKey,
      privateKey
    };
     localStorage.setItem(
      `${KEY_STORAGE_PREFIX}keypair`,
      JSON.stringify(keyData)
    );
     return {
      success: true,
      publicKey
    };
  } catch (error) {
    console.error('Key generation error:', error);
    return {
      success: false,
      error: 'Failed to generate encryption keys'
    };
  }
;}
// Get stored key pair
export const getStoredKeyPair = async () => {
  try {
    const storedData = localStorage.getItem(`${KEY_STORAGE_PREFIX}keypair`);
    if (!storedData) {
      throw new Error('No encryption keys found');
    }
     const { publicKey: publicKeyJwk, privateKey: privateKeyJwk } = JSON.parse(storedData);
     // Import keys
    const publicKey = await crypto.subtle.importKey(
      'jwk',
      publicKeyJwk,
      KEY_ALGORITHM,
      true,
      []
    );
     const privateKey = await crypto.subtle.importKey(
      'jwk',
      privateKeyJwk,
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
    return {
      success: false,
      error: 'Failed to retrieve encryption keys'
    };
  }
;
}
// Constants for encrypted data types
const ENCRYPTED_ATA_TYPES = {
  MESSAGE: 'message',
  WALLET_LINK: 'wallet_link',
  PROFILE_DATA: 'profile_data'
};
 // Re-encrypt data during key rotation
export async function reencryptData(oldPrivateKey, newPrivateKey) {
  try {
    // Start performance measurement
    const startTime = performance.now();
    
    // Get all encrypted data from storage
    const encryptedItems = await getAllEncryptedData();
    
    // Track progress
    let processedItems = 0;
    const totalItems = encryptedItems.length;
    
    // Process each encrypted item
    const results = await Promise.allSettled(
      encryptedItems.map(async (item) => {
        try {
          // Decrypt with old key
          const decrypted = await decryptWithKey(item.data, oldPrivateKey);
          
          // Re-encrypt with new key
          const reencrypted = await encryptWithKey(decrypted, newPrivateKey);
          
          // Store re-encrypted data
          await storeEncryptedData(item.id, item.type, reencrypted);
          
          // Update progress
          processedItems++;
          await updateRotationProgress(processedItems, totalItems);
          
          return { success: true, id: item.id };
        } catch (error) {
          return { 
            success: false, 
            id: item.id, 
            error: error.message 
          };
        }
      })
    );
    
    // Calculate statistics
    const stats = calculateRotationStats(results);
    
    // Log rotation event
    await logSecurityEvent({
      type: 'DATA_REENCRYPTION',
      timestamp: Date.now(),
      duration: performance.now() - startTime,
      stats
    });
    
    // Return results
    return {
      success: stats.failureCount === 0,
      stats,
      errors: results
        .filter(r => r.status === 'rejected' || !r.value.success)
        .map(r => r.reason || r.value.error)
    };
  } catch (error) {
    console.error('Data re-encryption error:', error);
    throw new Error('Failed to re-encrypt data during key rotation');
  }
}

 // Helper function to get all encrypted data
export async function getAllEncryptedData() {
  const encryptedData = [];
  
  // Scan localStorage for encrypted items
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key.startsWith(KEY_STORAGE_PREFIX)) {
      try {
        const data = JSON.parse(localStorage.getItem(key));
        if (data.encrypted) {
          encryptedData.push({
            id: key.replace(KEY_STORAGE_PREFIX, ''),
            type: data.type,
            data: data.data
          });
        }
      } catch (error) {
        console.warn(`Failed to parse item ${key}:`, error);
      }
    }
  }
  
  return encryptedData;
}
 // Helper function to store re-encrypted data
export async function storeEncryptedData(id, type, data) {
  localStorage.setItem(
    KEY_STORAGE_PREFIX + id,
    JSON.stringify({
      encrypted: true,
      type,
      data,
      updatedAt: Date.now()
    })
  );
}

 // Helper function to update rotation progress
export async function updateRotationProgress(current, total) {
  localStorage.setItem(
    KEY_STORAGE_PREFIX + 'rotation_progress',
    JSON.stringify({
      current,
      total,
      timestamp: Date.now()
    })
  );
}
 // Helper function to calculate rotation statistics
 function calculateRotationStats(results) {
  return results.reduce((stats, result) => {
    if (result.status === 'fulfilled' && result.value.success) {
      stats.successCount++;
    } else {
      stats.failureCount++;
    }
    return stats;
  }, { successCount: 0, failureCount: 0 });
}
 // Decrypt data with specific key
export async function decryptWithKey(encryptedData, privateKey) {
  const { iv, data } = encryptedData;
  
  // Derive decryption key
  const decryptionKey = await crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: new Uint8Array(iv),
      iterations: 100000,
      hash: 'SHA-256'
    },
    privateKey,
    { name: 'AES-GCM', length: 256 },
    false,
    ['decrypt']
  );
  
  // Decrypt data
  const decrypted = await crypto.subtle.decrypt(
    {
      name: 'AES-GCM',
      iv: new Uint8Array(iv)
    },
    decryptionKey,
    new Uint8Array(data)
  );
  
  return new TextDecoder().decode(decrypted);
}
 // Encrypt data with specific key
export async function encryptWithKey(data, publicKey) {
  // Generate IV
  const iv = crypto.getRandomValues(new Uint8Array(12));
  
  // Derive encryption key
  const encryptionKey = await crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: iv,
      iterations: 100000,
      hash: 'SHA-256'
    },
    publicKey,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt']
  );
  
  // Encrypt data
  const encrypted = await crypto.subtle.encrypt(
    {
      name: 'AES-GCM',
      iv: iv
    },
    encryptionKey,
    new TextEncoder().encode(data)
  );
  
  return {
    iv: Array.from(iv),
    data: Array.from(new Uint8Array(encrypted))
  };

}

const compressEncryptedData = (iv, ciphertext, senderKey) => {
  // Use a more compact format
  const compressed = {
    i: btoa(String.fromCharCode(...iv)).replace(/=/g, ''), // iv without padding
    c: btoa(String.fromCharCode(...new Uint8Array(ciphertext))).replace(/=/g, ''), // ciphertext
    s: senderKey.x // Only x coordinate is needed for ECDH
  };
  return btoa(JSON.stringify(compressed)).replace(/=/g, '');
}

// Encrypt message
export const encryptMessage = async (message, recipient) => {
  try {
       // Early length check (rough estimate)
   if (message.length > 100) {
    throw new Error('Message too long. Please keep it under 100 characters.');
  }
 
    // Get sender's keypair
    const keyPair = await getStoredKeyPair();
    if (!keyPair.success) {
      throw new Error('Failed to retrieve sender keys');
    }
     // Get recipient's public key
    const recipientPublicKey = await getPublicKeyData(recipient);
    if (!recipientPublicKey) {
      throw new Error('Failed to retrieve recipient\'s public key');
    }
     // Export sender's public key to JWK
    const senderPublicKeyJwk = await crypto.subtle.exportKey('jwk', keyPair.publicKey);
     // Import recipient's public key
    const recipientKey = await crypto.subtle.importKey(
      'jwk',
      recipientPublicKey,
      KEY_ALGORITHM,
      true,
      []
    );
     // Derive shared secret
    const sharedSecret = await crypto.subtle.deriveBits(
      {
        name: 'ECDH',
        public: recipientKey
      },
      keyPair.privateKey,
      256
    );
     // Generate encryption key
    const encryptionKey = await crypto.subtle.importKey(
      'raw',
      sharedSecret,
      { name: 'AES-GCM' },
      false,
      ['encrypt']
    );
     // Generate IV
    const iv = crypto.getRandomValues(new Uint8Array(12));
     // Encrypt message
    const ciphertext = await crypto.subtle.encrypt(
      {
        name: 'AES-GCM',
        iv: iv
      },
      encryptionKey,
      encoder.encode(message)
    );
    const compressedData = compressEncryptedData(iv, ciphertext, senderPublicKeyJwk);
// Final length check including prefix
const finalMessage = `🔒 @${recipient} #e2e ${compressedData}`;
if (finalMessage.length > 300) {
  throw new Error('Encrypted message too long. Please try a shorter message.');
}
 return {
  success: true,
  data: compressedData
};
} catch (error) {
console.error('Message encryption error:', error);
return {
  success: false,
  error: error.message || 'Failed to encrypt message'
};
}
 ;
}




export const decryptMessage = async (encryptedData) => {
  try {
  const keyPair = await getStoredKeyPair();
  if (!keyPair.success) {
    throw new Error('Failed to retrieve decryption keys');
  }
   // Parse compressed encrypted data
  const { i: iv, c: ciphertext, s: senderKeyParts } = JSON.parse(atob(encryptedData));
   // Reconstruct sender's public key JWK
  const [x, y] = senderKeyParts.split('.');
  const senderPublicKeyJwk = {
    kty: 'EC',
    crv: 'P-256',
    x: x,
    y: y,
    ext: true
  };
   // Import sender's public key
  const senderPublicKey = await crypto.subtle.importKey(
    'jwk',
    senderPublicKeyJwk,
    {
      name: 'ECDH',
      namedCurve: 'P-256'
    },
    true,
    []
  );
   // Derive shared secret
  const sharedSecret = await crypto.subtle.deriveBits(
    {
      name: 'ECDH',
      public: senderPublicKey
    },
    keyPair.privateKey,
    256
  );
   // Generate decryption key
  const decryptionKey = await crypto.subtle.importKey(
    'raw',
    sharedSecret,
    { name: 'AES-GCM' },
    false,
    ['decrypt']
  );
   // Decrypt the message
  const decrypted = await crypto.subtle.decrypt(
    {
      name: 'AES-GCM',
      iv: new Uint8Array(iv)
    },
    decryptionKey,
    new Uint8Array(ciphertext)
  );
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
}
// Store wallet link in encrypted format
export const storeWalletLink = async (walletLink) => {
  try {
    // Store encrypted wallet link in localStorage
    localStorage.setItem('walletLink', walletLink);
    return {
      success: true
    };
  } catch (error) {
    console.error('Wallet link storage error:', error);
    return {
      success: false,
      error: error.message
    };
  }
};



// Get stored wallet link
export const getWalletLink = () => {
  try {
    return localStorage.getItem('walletLink');
  } catch (error) {
    console.error('Wallet link retrieval error:', error);
    return null;
  }
};

// Remove stored wallet link
export const removeWalletLink = () => {
  try {
    localStorage.removeItem('walletLink');
    return {
      success: true
    };
  } catch (error) {
    console.error('Wallet link removal error:', error);
    return {
      success: false,
      error: error.message
    };
  }
};
