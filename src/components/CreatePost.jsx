import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { createPost } from '../services/bluesky';
import { searchUsers } from '../services/bluesky';
import { 
  encryptMessage, 
  hasStoredKeys, 
  storeKeyPair,
  getPublicKeyData
} from '../services/encryption';

export default function CreatePost() {
  const { session } = useAuth();
  const [content, setContent] = useState('');
  const [isEncrypted, setIsEncrypted] = useState(false);
  const [recipient, setRecipient] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [showUserSearch, setShowUserSearch] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Check for keys on component mount
  useEffect(() => {
    const initializeKeys = async () => {
      try {
        if (!hasStoredKeys()) {
          const result = await storeKeyPair();
          if (!result.success) {
            throw new Error(result.error || 'Failed to initialize encryption keys');
          }
        }
      } catch (error) {
        console.error('Key initialization error:', error);
        setError('Failed to initialize encryption keys. Please refresh the page.');
      }
    };

    initializeKeys();
  }, []);

  const handleUserSearch = async (query) => {
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }
     try {
      setRecipient(null); // Clear current recipient when searching
      const response = await searchUsers(query);
      if (response.success) {
        setSearchResults(response.data);
      }
    } catch (error) {
      console.error('User search error:', error);
    }
  };

  const selectRecipient = async (user) => {
      try {
        setLoading(true);
        setError('');
        
        // Verify recipient's public key availability
        const recipientPublicKey = await getPublicKeyData(user.handle);
        if (!recipientPublicKey) {
          throw new Error(`${user.handle} hasn't set up encryption keys yet`);
        }
        
        // Store recipient data including their public key
        setRecipient({
          handle: user.handle,
          displayName: user.displayName,
          publicKey: recipientPublicKey
        });
        
        setShowUserSearch(false);
        setSearchResults([]);
      } catch (error) {
        console.error('Recipient validation error:', error);
        setError(error.message);
        setRecipient(null); // Clear recipient on error
      } finally {
        setLoading(false);
      };
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!content.trim()) return;
     setLoading(true);
    setError('');
    try {
      let postContent = content;
      
      if (isEncrypted) {
        if (!recipient?.handle || !recipient?.publicKey) {
          throw new Error('Please select a valid recipient for encrypted message');
        }
        
        // Check message length before encryption
        if (content.length > 100) {
          throw new Error('Encrypted messages must be under 100 characters due to encryption overhead.');
        }
        
        if (!hasStoredKeys()) {
          throw new Error('Encryption keys not found. Please refresh the page.');
        }
        
        // Use pre-validated recipient public key
        const encrypted = await encryptMessage(content, recipient.publicKey);
        if (!encrypted.success) {
          throw new Error(encrypted.error || 'Encryption failed');
        }
        
        postContent = `🔒 @${recipient.handle} #e2e ${encrypted.data}`;
      }
      
      // Final length check
      if (postContent.length > 300) {
        throw new Error('Message too long for Bluesky. Please try a shorter message.');
      }
      
      const response = await createPost(postContent);
      
      if (response.success) {
        setContent('');
        setIsEncrypted(false);
        setRecipient(null);
      } else {
        throw new Error('Failed to create post');
      }
    } catch (error) {
      console.error('Post creation error:', error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="create-post">
      <div className="create-post-header">
        <button
          type="button"
          className={`btn-icon ${isEncrypted ? 'active' : ''}`}
          onClick={() => setIsEncrypted(!isEncrypted)}
          title={isEncrypted ? 'Switch to public post' : 'Switch to encrypted post'}
        >
          {isEncrypted ? '🔒' : '🌐'}
        </button>
        
        {isEncrypted && (
          <div className="recipient-selector">
    <input  type="text"
 className="input recipient-input"
 placeholder="Search recipient..."
 value={recipient?.handle || ''} // Only use the handle for display
 onChange={(e) => {
   handleUserSearch(e.target.value);
   setShowUserSearch(true);
 }}
 onFocus={() => setShowUserSearch(true)}
>
</input>

            
            {showUserSearch && searchResults.length > 0 && (
              <div className="recipient-results">
                {searchResults.map(user => (
                  <div
                    key={user.did}
                    className="recipient-result"
                    onClick={() => selectRecipient(user)}
                  >
                    <span className="recipient-name">
                      {user.displayName || `@${user.handle}`}
                    </span>
                    <span className="recipient-handle">
                      @{user.handle}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      <div className="form-group">
        <textarea
          className="input post-input"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder={isEncrypted ? 'Write an encrypted message...' : "What's happening?"}
          style={{ minHeight: '100px', resize: 'vertical' }}
        />
      </div>

      {error && (
        <div className="error" style={{ marginBottom: '1rem' }}>
          {error}
        </div>
      )}

      {isEncrypted && (
         <div className="encryption-info">
         <span className="encryption-badge">🔒 End-to-End Encrypted</span>
         {recipient?.handle && (
           <span className="encryption-recipient">
             to @{recipient.handle}
             {recipient.displayName && ` (${recipient.displayName})`}
           </span>
         )}
       </div>
      )}

      <div className="create-post-actions">
        <button 
          type="submit" 
          className="btn btn-primary"
          disabled={loading || (isEncrypted && !recipient)}
        >
          {loading ? 'Posting...' : 'Post'}
        </button>
      </div>
    </form>
  );
}
