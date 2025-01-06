import React, { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import {
  hasStoredKeys as hasKeys,
  decryptMessage,
} from "../services/encryption"; // Add this import
import KeySetup from "./KeySetup";
import { registerPublicKey, getPublicKey as getPublicKeyData, } from '../services/wallet';


export default function EncryptedPost({ post }) {
  const { session, isAuthenticated, validateSession } = useAuth();
  const [decryptedContent, setDecryptedContent] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [showKeySetup, setShowKeySetup] = useState(false);


  const canDecrypt = () => {
    const recipientHandle = getRecipientHandle();
    return (
      recipientHandle === session?.handle ||
      post.author.handle === session?.handle
    );
  };

  // Handle decrypt button click
  const handleDecryptClick = () => {
    if (!hasKeys()) {
      setShowKeySetup(true);
      return;
    }
    handleDecrypt();
  };

  // Handle key setup completion
  const handleKeySetupComplete = () => {
    setShowKeySetup(false);
    handleDecrypt();
  };

  
  const handleDecrypt = async () => {
    setLoading(true);
    setError(null);
    try {
      // Extract encrypted data from post
      const match = post.record.text.match(
        /🔒 @([a-zA-Z0-9.-]+) #e2e ([A-Za-z0-9+/\-_]+)/ // Updated regex to match format
      );
      if (!match) {
        throw new Error("Invalid encrypted message format");
      }
      const [, recipientHandle, encryptedData] = match;
  
      // Get sender's public key
      const senderKeyData = await getPublicKeyData(post.author.handle);
      if (!senderKeyData?.success) {
        throw new Error("Unable to retrieve sender's encryption key");
      }
  
      const decrypted = await decryptMessage(
        encryptedData,
        senderKeyData.publicKey.value // Pass the value directly
      );
      
      if (!decrypted.success) {
        throw new Error(decrypted.error || "Unable to decrypt message");
      }
  
      setDecryptedContent(decrypted.data);
    } catch (error) {
      console.error("Decryption error:", error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };
  
  // Also update the recipient handle extraction
  const getRecipientHandle = () => {
    const match = post.record.text.match(/🔒 @([a-zA-Z0-9.-]+) #e2e/);
    return match ? match[1].toLowerCase() : null;
  };

  return (
    <div className="encrypted-post">
      {showKeySetup ? (
        <KeySetup onComplete={handleKeySetupComplete} />
      ) : (
        <>
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
              {canDecrypt() ? (
                <>
                  <p>
                    {post.author.handle === session?.handle
                      ? "You sent this encrypted message"
                      : "This message is encrypted for you"}
                  </p>
                  <button
                    className="btn btn-primary"
                    onClick={handleDecryptClick}
                    disabled={loading}
                  >
                    {loading ? "Decrypting..." : "Decrypt Message"}
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

          {error && <div className="error">{error}</div>}
        </>
      )}
    </div>
  );
}
