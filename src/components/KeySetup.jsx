import React, { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import {
  generateAndStoreKeyPair,
  hasStoredKeys,
} from "../services/encryption";
import {
  registerPublicKey,
  queryPublicKey,
  getPublicKey,
} from "../services/wallet";

export default function KeySetup({ onComplete }) {
  const { session, isAuthenticated, validateSession } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    const checkExistingKeys = async () => {
      try {
        // Validate session before proceeding
        if (!validateSession()) {
          setError("Session expired. Please log in again.");
          setLoading(false);
          return;
        }

        console.log("Current session state:", session);
        if (!isAuthenticated || !session?.handle) {
          console.log("No authenticated session:", {
            isAuthenticated,
            session,
          });
          setError("Please log in again");
          setLoading(false);
          return;
        }

        // First check if user is registered in contract
        const publicKeyResult = await getPublicKey(session.handle, session);
        console.log("Public key check:", publicKeyResult);

        if (publicKeyResult?.success && publicKeyResult.publicKey) {
          setSuccess(true);
          if (onComplete) onComplete();
          return;
        }

        // If not found in contract, check local storage
        const hasKeys = await hasStoredKeys(session.handle);
        if (hasKeys) {
          // Keys exist locally but not in contract - need to register
          setError(
            "Keys found locally but not registered. Please click Setup to complete registration."
          );
        }
      } catch (error) {
        console.error("Error checking keys:", error);
        setError("Failed to check existing keys");
      } finally {
        setLoading(false);
      }
    };

    checkExistingKeys();
  }, [session, isAuthenticated, validateSession]);

  const handleSetupKeys = async () => {
    setLoading(true);
    setError("");

    try {
      if (!session?.handle) {
        throw new Error("No user handle available");
      }

      console.log("Setting up keys for handle:", session.handle);

      // Generate new keypair
      const keyResult = await generateAndStoreKeyPair(session.handle);
      if (!keyResult.success) {
        throw new Error(keyResult.error || "Failed to generate keys");
      }

      console.log("Generated keys:", keyResult);

      // Register public key on-chain
      const registrationResult = await registerPublicKey(
        session.handle,
        keyResult.publicKey
      );
      if (!registrationResult.success) {
        throw new Error(
          registrationResult.error || "Failed to register public key"
        );
      }

      console.log("Registration result:", registrationResult);

      setSuccess(true);
      if (onComplete) onComplete();
    } catch (error) {
      console.error("Key setup error:", error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div>Checking encryption setup...</div>;
  }

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
      <p>
        To send or receive encrypted messages, you need to set up your
        encryption keys first.
      </p>

      {error && <div className="error">{error}</div>}

      <button
        className="btn btn-primary"
        onClick={handleSetupKeys}
        disabled={loading}
      >
        {loading ? "Setting up..." : "Setup Encryption Keys"}
      </button>
    </div>
  );
}
