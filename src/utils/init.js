import { getPublicKeyData, storeKeyPair } from '../services/signalEncryption';


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