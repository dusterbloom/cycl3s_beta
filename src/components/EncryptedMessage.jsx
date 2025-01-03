 import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { decryptMessage } from '../services/signalEncryption';

export function EncryptedMessage({ post }) {
  const { session } = useAuth();
  const [decryptedContent, setDecryptedContent] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleDecrypt = async () => {
    setLoading(true);
    setError(null);
    try {
      const match = post.record.text.match(/🔒 @([a-zA-Z0-9.-]+) #e2e ([A-Za-z0-9+/\-_=]+)/);
      if (!match) {
        throw new Error('Invalid encrypted message format');
      }
      const [, recipientHandle, encryptedData] = match;
      
      const decrypted = await decryptMessage(encryptedData);
      if (!decrypted.success) {
        throw new Error(decrypted.error || 'Unable to decrypt message');
      }
      
      setDecryptedContent(decrypted.data);
    } catch (error) {
      console.error('Decryption error:', error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="encrypted-message">
      {!decryptedContent && !error && (
        <div className="encrypted-content-locked">
          <button
            className="decrypt-button"
            onClick={handleDecrypt}
            disabled={loading}
          >
            {loading ? 'Decrypting...' : 'Decrypt Message'}
          </button>
        </div>
      )}
      {decryptedContent && (
        <div className="encrypted-content-unlocked">
          <p>{decryptedContent}</p>
        </div>
      )}
      {error && <div className="error-message">{error}</div>}
    </div>
  );
}