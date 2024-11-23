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
      if (!hasStoredKeys()) {
        try {
          await storeKeyPair();
        } catch (error) {
          console.error('Failed to initialize encryption keys:', error);
          setError('Failed to initialize encryption keys');
        }
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
      const response = await searchUsers(query);
      if (response.success) {
        setSearchResults(response.data);
      }
    } catch (error) {
      console.error('User search error:', error);
    }
  };

  const selectRecipient = (user) => {
    setRecipient(user.handle);
    setShowUserSearch(false);
    setSearchResults([]);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!content.trim()) return;

    setLoading(true);
    setError('');

    try {
      let postContent = content;
      
      if (isEncrypted) {
        if (!recipient) {
          throw new Error('Please select a recipient for encrypted message');
        }

        if (!hasStoredKeys()) {
          throw new Error('Encryption keys not found. Please refresh the page.');
        }

        // In a real app, you would fetch the recipient's public key from a server
        // For now, we'll use our own public key for demonstration
        const recipientPublicKey = getPublicKeyData();
        
        const encrypted = await encryptMessage(content, recipientPublicKey);
        if (!encrypted.success) {
          throw new Error(encrypted.error || 'Encryption failed');
        }

        postContent = `🔒 @${recipient} #e2e ${encrypted.data}`;

        // Check if the final post content is within limits
        if (postContent.length > 300) {
          throw new Error('Encrypted message is too long. Please try a shorter message.');
        }
      }

      const response = await createPost(postContent);
      
      if (response.success) {
        setContent('');
        setIsEncrypted(false);
        setRecipient('');
      } else {
        throw new Error('Failed to create post');
      }
    } catch (error) {
      console.error('Post creation error:', error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

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
            <input
              type="text"
              className="input recipient-input"
              placeholder="Search recipient..."
              value={recipient}
              onChange={(e) => {
                setRecipient(e.target.value);
                handleUserSearch(e.target.value);
                setShowUserSearch(true);
              }}
              onFocus={() => setShowUserSearch(true)}
            />
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
          {recipient && (
            <span className="encryption-recipient">
              to @{recipient}
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
