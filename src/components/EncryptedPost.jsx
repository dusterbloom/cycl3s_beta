import React, { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import {
  hasStoredKeys as hasKeys,
  getPublicKeyData,
  decryptMessage,
} from "../services/signalEncryption"; // Add this import
import KeySetup from "./KeySetup";

export default function EncryptedPost({ post }) {
  const { session } = useAuth();
  const [decryptedContent, setDecryptedContent] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [showKeySetup, setShowKeySetup] = useState(false);

  // Extract recipient handle from the post text
  const getRecipientHandle = () => {
    const match = post.record.text.match(/🔒 @([a-zA-Z0-9.-]+)/);
    return match ? match[1].toLowerCase() : null;
  };

  // Check if the current user is the recipient
  const isRecipient = () => {
    const recipientHandle = getRecipientHandle();
    // console.log("Checking recipient:", {
    //   recipientHandle,
    //   currentUser: session?.handle,
    //   isMatch: recipientHandle === session?.handle,
    // });
    return recipientHandle === session?.handle;
  };

  // console.log("Post data:", {
  //   text: post.record.text,
  //   session: session,
  //   recipientHandle: getRecipientHandle(),
  //   isRecipient: isRecipient(),
  // });

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
        /🔒 @([a-zA-Z0-9.-]+) #e2e ([A-Za-z0-9+/\-_=]+)/ // Added = to base64 chars
      );
      if (!match) {
        throw new Error("Invalid encrypted message format");
      }
      const [, recipientHandle, encryptedData] = match;

      // // Verify recipient
      // if (recipientHandle.toLowerCase() !== session?.handle.toLowerCase()) {
      //   throw new Error("This message is not encrypted for you");
      // }

      // Get sender's public key
      const senderPublicKey = await getPublicKeyData(post.author.handle);
      if (!senderPublicKey) {
        throw new Error("Unable to retrieve sender's encryption key");
      }

      // console.log("Decryption attempt:", {
      //   sender: post.author.handle,
      //   recipient: recipientHandle,
      //   senderPublicKey,
      //   encryptedData
      // });

      const decrypted = await decryptMessage(encryptedData, senderPublicKey);
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
