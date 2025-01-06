import React, { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { createPost } from "../services/bluesky";
import { searchUsers } from "../services/bluesky";
import {
  encryptMessage,
  hasStoredKeys as hasKeys,
  
  generateAndStoreKeyPair
} from "../services/encryption";
import KeySetup from "./KeySetup";

import {
  registerPublicKey,
  getPublicKey as getPublicKeyData,
  getPublicKey
} from "../services/wallet";

export default function CreatePost({ onPostCreated }) {
  const { session, isAuthenticated, validateSession } = useAuth();
  const [content, setContent] = useState("");
  const [isEncrypted, setIsEncrypted] = useState(false);
  const [recipient, setRecipient] = useState(null);
  const [searchResults, setSearchResults] = useState([]);
  const [showUserSearch, setShowUserSearch] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [searchInput, setSearchInput] = useState("");
  const [needsKeySetup, setNeedsKeySetup] = useState(false);
  const [isChecking, setIsChecking] = useState(true);
  const [sender, setSender] = useState(null);

  // Check if keys are set up
  // Update the useEffect hook for checking keys
  useEffect(() => {
    const checkKeys = async () => {
      setIsChecking(true);
      try {
        if (!session?.handle) {
          console.log("No session handle available:", session);
          setNeedsKeySetup(true);
          return;
        }

        // First check if user is registered in contract
        const publicKeyResult = await getPublicKey(session.handle, session);
        console.log("Public key check result:", publicKeyResult);
        setSender(publicKeyResult.publicKey);

        if (!publicKeyResult?.success) {
          setNeedsKeySetup(true);
          return;
        }

        const hasLocalKeys = await hasStoredKeys(session.handle);
        setNeedsKeySetup(!hasLocalKeys);
      } catch (error) {
        console.error("Error checking keys:", error);
        setNeedsKeySetup(true);
      } finally {
        setIsChecking(false);
      }
    };

    if (session?.handle) {
      checkKeys();
    }
  }, [session]);

  // Add session persistence check
  useEffect(() => {
    if (!session?.handle) {
      console.log("Session lost or not initialized");
      setError("Please log in again");
      return;
    }
  }, [session]);

  // Handle encryption toggle
  const handleEncryptionToggle = async () => {
    if (!session?.handle) {
      console.log("No user handle available");
      return;
    }

    // Use hasKeys instead of hasStoredKeys
    const hasLocalKeys = await hasKeys({
      handle: session.handle,
    });

    if (!hasLocalKeys) {
      setNeedsKeySetup(true);
      return;
    }
    setIsEncrypted(!isEncrypted);
  };

  // Handle key setup completion
  const handleKeySetupComplete = () => {
    setNeedsKeySetup(false);
    setIsEncrypted(true);
  };

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
  const selectRecipient = async (user) => {
    try {
      setLoading(true);
      setError("");
  
      // Check if the recipient has a public key registered
      const recipientPublicKey = await getPublicKey(user.handle, session);
      
      if (!recipientPublicKey?.success || !recipientPublicKey?.publicKey?.value) {
        setError(`@${user.handle} needs to set up encryption first`);
        setRecipient(null);
        return;
      }
  
      // Store the recipient with their public key
      setRecipient({
        handle: user.handle,
        publicKey: recipientPublicKey.publicKey
      });
  
      setShowUserSearch(false);
      setSearchResults([]);
      setSearchInput("");
    } catch (error) {
      console.error("Recipient validation error:", error);
      setError(`@${user.handle} needs to set up encryption first`);
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
      if (!session?.handle) {
        throw new Error("Session invalid - please log in again");
      }
  
      let postContent = content;
      if (isEncrypted) {
        if (!recipient?.handle) {
          throw new Error("Please select a valid recipient for encrypted message");
        }
  
        const encrypted = await encryptMessage(
          content,
          recipient.handle,
          session.handle,
          session
        );
  
        if (!encrypted.success) {
          throw new Error(encrypted.error || "Encryption failed");
        }
  
        postContent = String(`🔒 @${recipient.handle} #e2e ${encrypted.data}`);
      }
      console.log("Encrypted preview post content", postContent)
      // Create the post using Bluesky API
      const postResult = await createPost({
        text: postContent.toString(),
        session
      });
  
      if (!postResult.success) {
        throw new Error(postResult.error || "Failed to create post");
      }
  
      // Clear form and notify parent
      setContent("");
      setIsEncrypted(false);
      setRecipient(null);
      setSearchInput("");
      if (onPostCreated) {
        onPostCreated(postResult.data);
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
      {needsKeySetup ? (
        <KeySetup onComplete={handleKeySetupComplete} />
      ) : (
        <>
          <div className="create-post-header">
            <button
              type="button"
              className={`btn-icon ${isEncrypted ? "active" : ""}`}
              // onClick={() => setIsEncrypted(!isEncrypted)}
              onClick={handleEncryptionToggle}
              title={
                isEncrypted
                  ? "Switch to public post"
                  : "Switch to encrypted post"
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
                isEncrypted
                  ? "Write an encrypted message..."
                  : "What's happening?"
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
        </>
      )}
    </form>
  );
}
