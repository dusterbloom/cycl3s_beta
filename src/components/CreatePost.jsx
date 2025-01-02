import React, { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { createPost } from "../services/bluesky";
import { searchUsers } from "../services/bluesky";
import { registerPublicKey } from '../services/wallet';

import { encryptMessage,  hasStoredKeys,
  storeKeyPair,
  getPublicKeyData, initializeSignalProtocol } from "../services/signalEncryption"; // Add this import


export default function CreatePost() {
  const { session } = useAuth();
  const [content, setContent] = useState("");
  const [isEncrypted, setIsEncrypted] = useState(false);
  const [recipient, setRecipient] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [showUserSearch, setShowUserSearch] = useState(false);
  const [error, setError] = useState("");  // Define setError using useState
  const [loading, setLoading] = useState(false);
  const [publicKey, setPublicKey] = useState(null);
  const [searchInput, setSearchInput] = useState("");
  
  // Check for keys on component mount
  // useEffect(() => {
  //   const initializeKeys = async () => {
  //     try {
  //       await initializeKeys(session, setPublicKey, setError);
  //     } catch (error) {
  //       console.error("Key initialization error:", error);
  //       setError("Failed to initialize encryption keys. Please refresh the page.");
  //     }
  //   };

  //   initializeKeys();
  // }, [session]);


  const handleUserSearch = async (query) => {
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }
    try {
      setRecipient(null); // Clear current recipient when searching
      const response = await searchUsers(query);
      if (response.success && showUserSearch) {
        setSearchResults(response.data);
      }
    } catch (error) {
      console.error("User search error:", error);
    }
  };

  // const selectRecipient = async (user) => {
  //   try {
  //     setLoading(true);
  //     setError("");

  //     // Verify recipient's public key availability
  //     const recipientPublicKey = await getPublicKeyData(user.handle);
  //     if (!recipientPublicKey) {
  //       throw new Error(`${user.handle} hasn't set up encryption keys yet`);
  //     }

    
  //     setRecipient({
  //       handle: user.handle,
  //       displayName: user.displayName,
  //       publicKey: response,
  //     });

  //         // Store recipient's public key in localStorage
  //   // localStorage.setItem(`cycl3_keys_recipient_${user.handle}`, JSON.stringify(recipientPublicKey));

  //     setShowUserSearch(false);
  //     setSearchResults([]);
  //     setSearchInput(""); // Clear search input after selection
  //   } catch (error) {
  //     console.error("Recipient validation error:", error);
  //     setError(error.message);
  //     setRecipient(null); // Clear recipient on error
  //   } finally {
  //     setLoading(false);
  //   }
  // };
  
  const selectRecipient = async (user) => {
    try {
      setLoading(true);
      setError("");
  
      // Verify recipient's public key availability
      const recipientPublicKey = await getPublicKeyData(user.handle);
      if (!recipientPublicKey) {
        throw new Error(`${user.handle} hasn't set up encryption keys yet`);
      }
  
      // Store the recipient with their public key
      setRecipient({
        handle: user.handle,
        displayName: user.displayName,
        publicKey: recipientPublicKey  // Store the actual public key
      });
  
      setShowUserSearch(false);
      setSearchResults([]);
      setSearchInput("");
    } catch (error) {
      console.error("Recipient validation error:", error);
      setError(error.message);
      setRecipient(null);
    } finally {
      setLoading(false);
    }
  };
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!content.trim()) return;
  
    setLoading(true);
    setError("");
  
    try {
      let postContent = content;
  
      if (isEncrypted) {
        if (!recipient?.handle) {
          throw new Error("Please select a valid recipient for encrypted message");
        }
  
        // Make sure we have the recipient's public key
        if (!recipient.publicKey) {
          const recipientPublicKey = await getPublicKeyData(recipient.handle);
          if (!recipientPublicKey) {
            throw new Error(`${recipient.handle} hasn't set up encryption keys yet`);
          }
          recipient.publicKey = recipientPublicKey;
        }
  
        console.log('Encrypting message with recipient key:', recipient.publicKey);
  
        const encrypted = await encryptMessage(content, recipient.publicKey);
        if (!encrypted.success) {
          throw new Error(encrypted.error || "Encryption failed");
        }
  
        postContent = `🔒 @${recipient.handle} #e2e ${encrypted.data}`;
      }
  
      const response = await createPost(postContent);
      if (response.success) {
        setContent("");
        setRecipient(null);  // Clear recipient after successful post
        setIsEncrypted(false);  // Reset encryption state
      } else {
        throw new Error(response.error || "Failed to create post");
      }
    } catch (error) {
      console.error("Post creation error:", error);
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
          className={`btn-icon ${isEncrypted ? "active" : ""}`}
          onClick={() => setIsEncrypted(!isEncrypted)}
          title={
            isEncrypted ? "Switch to public post" : "Switch to encrypted post"
          }
        >
          {isEncrypted ? "🔒" : "🌐"}
        </button>

        {isEncrypted && (
          <div className="recipient-selector">
            <input
              type="text"
              className="input recipient-input"
              placeholder="Search recipient..."
              value={searchInput}
              onChange={(e) => {
                setSearchInput(e.target.value);
                if (e.target.value.trim() === "") {
                  setShowUserSearch(false);
                  setSearchResults([]);
                } else {
                  handleUserSearch(e.target.value);
                  setShowUserSearch(true);
                }
              }}
              onFocus={() => setShowUserSearch(true)}
            />

            {showUserSearch && searchResults.length > 0 && (
              <div className="recipient-results">
                {searchResults.map((user) => (
                  <div
                    key={user.did}
                    className="recipient-result"
                    onClick={() => selectRecipient(user)}
                  >
                    <span className="recipient-name">
                      {user.displayName || `@${user.handle}`}
                    </span>
                    <span className="recipient-handle">@{user.handle}</span>
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
          placeholder={
            isEncrypted ? "Write an encrypted message..." : "What's happening?"
          }
          style={{ minHeight: "100px", resize: "vertical" }}
        />
      </div>

      {error && (
        <div className="error" style={{ marginBottom: "1rem" }}>
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
          {loading ? "Posting..." : "Post"}
        </button>
      </div>
    </form>
  );
}
