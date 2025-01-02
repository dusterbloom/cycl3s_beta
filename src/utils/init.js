// In a separate utility file or service
import { hasStoredKeys, storeKeyPair, getPublicKeyData } from '../services/signalEncryption';
import { registerPublicKey } from '../services/wallet';

export const initializeKeys = async (session, setPublicKey, setError) => {
  // try {
  //   console.log("Checking stored keys:", hasStoredKeys(session));
  //   let publicKey = null;

  //   // Check if the session object is valid
  //   if (!session || !session.handle) {
  //     throw new Error("Invalid session object");
  //   }

  //   if (!hasStoredKeys(session)) {
  //     console.log("No keys found, generating new pair");
  //     const { success, publicKey: newPublicKey } = await storeKeyPair(session);
  //     if (!success) {
  //       throw new Error("Failed to generate encryption keys");
  //     }
  //     publicKey = newPublicKey;
  //   } else {
  //     publicKey = await getPublicKeyData(session.handle);
  //   }
  //   // Register public key in ArchID Registry
  //   const registrationResult = await registerPublicKey(session.handle, publicKey);
  //   if (!registrationResult.success) {
  //     throw new Error(registrationResult.error);
  //   }


  //   console.log('Public key loaded:', publicKey);
  //   setPublicKey(publicKey);
  // } catch (error) {
  //   console.error('Key initialization error:', error);
  //   setError(error.message);
  // }

  try {
    // First ensure we have a connected wallet
    const { success: keplrConnected } = await connectKeplr();
    if (!keplrConnected) {
      throw new Error("Failed to connect to wallet");
    }

    // Get the public key for this handle
    const publicKeyData = await getPublicKeyData(session.handle);
    
    if (!publicKeyData) {
      // If no public key exists, generate and register one
      const { publicKey } = await generateKeyPair(); // Your key generation function
      await registerPublicKey(session.handle, publicKey);
      return publicKey;
    }

    return publicKeyData;
  } catch (error) {
    console.error('Key initialization error:', error);
    throw error;
  }
};

