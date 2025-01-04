import React, { useState } from 'react';
import { generateKeyPair, hasKeys } from '../services/encryption';
import { registerPublicKey } from '../services/wallet';

export default function KeySetup({ onComplete }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleSetupKeys = async () => {
    setLoading(true);
    setError('');
    
    try {
      // Generate new keypair
      const keyResult = await generateKeyPair();
      if (!keyResult.success) {
        throw new Error(keyResult.error || 'Failed to generate keys');
      }

      // Register public key on-chain
      const registrationResult = await registerPublicKey(keyResult.publicKey);
      if (!registrationResult.success) {
        throw new Error(registrationResult.error || 'Failed to register public key');
      }

      setSuccess(true);
      if (onComplete) onComplete();
    } catch (error) {
      console.error('Key setup error:', error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="key-setup success">
        <h3>🎉 Encryption Setup Complete!</h3>
        <p>You can now send and receive encrypted messages.</p>
      </div>
    );
  }

  return (
    <div className="key-setup">
      <h3>Setup Encryption Keys</h3>
      <p>To send or receive encrypted messages, you need to set up your encryption keys first.</p>
      
      {error && <div className="error">{error}</div>}
      
      <button 
        className="btn btn-primary"
        onClick={handleSetupKeys}
        disabled={loading}
      >
        {loading ? 'Setting up...' : 'Setup Encryption Keys'}
      </button>
    </div>
  );
}
