import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { 
  decryptMessage, 
  hasStoredKeys, 
  getPublicKeyData 
} from '../services/encryption';

export default function EncryptedPost({ post }) {
  const { session } = useAuth();
  const [decryptedContent, setDecryptedContent] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  // Extract recipient handle from the post text
  const getRecipientHandle = () => {
    const match = post.record.text.match(/🔒 @(\w+)/);
    return match ? match[1] : null;
  };

  // Check if the current user is the recipient
  const isRecipient = () => {
    const recipientHandle = getRecipientHandle();
    return recipientHandle && session?.handle === recipientHandle;
  };


  const handleDecrypt = async () => {
    setoading(true);
   setError(null);
   
   try {
     if (!hasStoredKeys()) {
       throw new Error('Encryption keys not found. Please refresh the page.');
     }
      // Extract encrypted data from post
     const match = post.record.text.match(/🔒 @(\w+) #e2e ([\w-]+)/);
     if (!match) {
       throw new Error('Invalid encrypted message format');
     }
      const [, recipientHandle, encryptedData] = match;
      // Verify recipient
     if (recipientHandle !== session?.handle) {
       throw new Error('This message is not encrypted for you');
     }
      // Get sender's public key
     const senderPublicKey = await getPublicKeyData(post.author.handle);
     if (!senderPublicKey) {
       throw new Error('Unable to retrieve sender\'s encryption key');
     }
      const decrypted = await decryptMessage(encryptedData);
     if (decrypted.success) {
       setDecryptedContent(decrypted.data);
     } else {
       throw new Error(decrypted.error || 'Unable to decrypt message');
     }
   } catch (error) {
     console.error('Decryption error:', error);
     setError(error.message);
   } finally {
     setLoading(false);
   }
  ;

  }
  return (
    <div className="encrypted-post">
      <div className="encrypted-post-header">
        <span className="encrypted-badge">🔒 Encrypted Message</span>
        {getRecipientHandle() && (
          <span className="encrypted-recipient">
            To: @{getRecipientHandle()}
          </span>
        )}
      </div>
      
      {!decryptedContent && !error && (
        <div className="encrypted-content-locked">
          {isRecipient() ? (
            <>
              <p>This message is encrypted for you.</p>
              <button 
                className="btn btn-primary"
                onClick={handleDecrypt}
                disabled={loading}
              >
                {loading ? 'Decrypting...' : 'Decrypt Message'}
              </button>
            </>
          ) : (
            <p>This message is encrypted for @{getRecipientHandle()}</p>
          )}
        </div>
      )}

      {decryptedContent && (
        <div className="encrypted-content-unlocked">
          <p>{decryptedContent}</p>
        </div>
      )}

      {error && (
        <div className="error">
          {error}
        </div>
      )}

      <div className="post-meta">
        <div className="post-meta-item">
          <span className="post-meta-label">From:</span>
          <span className="post-meta-value">@{post.author.handle}</span>
        </div>
        <div className="post-meta-item">
          <span className="post-meta-label">Time:</span>
          <span className="post-meta-value">
            {new Date(post.record.createdAt).toLocaleString()}
          </span>
        </div>
        {post.author.displayName && (
          <div className="post-meta-item">
            <span className="post-meta-value">{post.author.displayName}</span>
          </div>
        )}
      </div>
    </div>
  );
}
