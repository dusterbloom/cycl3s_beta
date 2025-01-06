import React, { useState } from "react";
import { useAuth } from "../context/AuthContext";
import { createPost, searchUsers } from "../services/bluesky";
import { encryptMessage, hasStoredKeys as hasKeys } from "../services/encryption";
import { getPublicKey } from "../services/wallet";
import KeySetup from "./KeySetup";

export default function CreatePost({ onPostCreated }) {
  const { session } = useAuth();
  const [content, setContent] = useState("");
  const [isEncrypted, setIsEncrypted] = useState(false);
  const [recipient, setRecipient] = useState(null);
  const [searchInput, setSearchInput] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [showUserSearch, setShowUserSearch] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [needsKeySetup, setNeedsKeySetup] = useState(false);

  const handleEncryptionToggle = async () => {
    if (!session?.handle) return;

    const hasLocalKeys = await hasKeys(session.handle);
    if (!hasLocalKeys) {
      setNeedsKeySetup(true);
      return;
    }
    setIsEncrypted(!isEncrypted);
    if (!isEncrypted) {
      setRecipient(null);
      setSearchInput("");
    }
  };

  const handleKeySetupComplete = () => {
    setNeedsKeySetup(false);
    setIsEncrypted(true);
  };

  const handleUserSearch = async (query) => {
    if (!query.trim()) {
      setSearchResults([]);
      setShowUserSearch(false);
      return;
    }

    try {
      const response = await searchUsers(query);
      if (response.success && response.data.length > 0) {
        setSearchResults(response.data);
        setShowUserSearch(true);
      } else {
        setSearchResults([]);
        setShowUserSearch(false);
      }
    } catch (error) {
      console.error("User search error:", error);
      setSearchResults([]);
    }
  };

  const createInviteMessage = (handle) => {
    return `Hey @${handle}! I tried to send you an encrypted message but noticed you haven't set up encryption yet. Check out cycl3.app to get started with encrypted messaging! 🔒`;
  };

  const selectRecipient = async (user) => {
    setRecipient({
      handle: user.handle,
      displayName: user.displayName,
      did: user.did
    });
    setShowUserSearch(false);
    setSearchResults([]);
    setSearchInput(user.handle);
    setError("");
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
          throw new Error("Please select a recipient for encrypted message");
        }

        // Check recipient's encryption status only when actually sending
        const keyCheck = await getPublicKey(recipient.handle, session);
        if (!keyCheck?.success || !keyCheck?.publicKey?.value) {
          setContent(createInviteMessage(recipient.handle));
          setIsEncrypted(false);
          throw new Error(`@${recipient.handle} hasn't set up encryption yet`);
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

        postContent = `🔒 @${recipient.handle} #e2e ${encrypted.data}`;
      }

      const postResult = await createPost({
        text: postContent,
        session,
      });

      if (!postResult.success) {
        throw new Error(postResult.error || "Failed to create post");
      }

      // Clear form only after successful post
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
              onClick={handleEncryptionToggle}
              title={isEncrypted ? "Switch to public post" : "Switch to encrypted post"}
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
                    handleUserSearch(e.target.value);
                  }}
                  disabled={loading}
                />

                {showUserSearch && searchResults.length > 0 && (
                  <div className="recipient-results">
                    {searchResults.map((user) => (
                      <div
                        key={user.did}
                        className="recipient-result"
                        onClick={() => selectRecipient(user)}
                      >
                        <div className="user-info">
                          <span className="recipient-name">
                            {user.displayName || `@${user.handle}`}
                          </span>
                          <span className="recipient-handle">@{user.handle}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          <textarea
            className="input post-input"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder={isEncrypted ? "Write an encrypted message..." : "What's happening?"}
            style={{ minHeight: "100px", resize: "vertical" }}
          />

          {error && <div className="error">{error}</div>}

          {isEncrypted && recipient && (
            <div className="encryption-info">
              <span className="encryption-badge">🔒 End-to-End Encrypted</span>
              <span className="encryption-recipient">
                to @{recipient.handle}
                {recipient.displayName && ` (${recipient.displayName})`}
              </span>
            </div>
          )}

          <button
            type="submit"
            className="btn btn-primary"
            disabled={loading || (isEncrypted && !recipient)}
          >
            {loading ? "Posting..." : "Post"}
          </button>
        </>
      )}
    </form>
  );
}

// import React, { useState, useEffect } from "react";
// import { useAuth } from "../context/AuthContext";
// import { createPost } from "../services/bluesky";
// import { searchUsers } from "../services/bluesky";
// import {
//   encryptMessage,
//   hasStoredKeys as hasKeys,
//   generateAndStoreKeyPair,
// } from "../services/encryption";
// import KeySetup from "./KeySetup";

// import {
//   registerPublicKey,
//   getPublicKey as getPublicKeyData,
//   getPublicKey,
// } from "../services/wallet";

// export default function CreatePost({ onPostCreated }) {
//   const { session, isAuthenticated, validateSession } = useAuth();
//   const [content, setContent] = useState("");
//   const [isEncrypted, setIsEncrypted] = useState(false);
//   const [recipient, setRecipient] = useState(null);
//   const [searchResults, setSearchResults] = useState([]);
//   const [showUserSearch, setShowUserSearch] = useState(false);
//   const [error, setError] = useState("");
//   const [loading, setLoading] = useState(false);
//   const [searchInput, setSearchInput] = useState("");
//   const [needsKeySetup, setNeedsKeySetup] = useState(false);
//   const [isChecking, setIsChecking] = useState(true);
//   const [sender, setSender] = useState(null);
//   const [inviteMode, setInviteMode] = useState(false);

//   // Check if keys are set up
//   // Update the useEffect hook for checking keys
//   useEffect(() => {
//     const checkKeys = async () => {
//       setIsChecking(true);
//       try {
//         if (!session?.handle) {
//           console.log("No session handle available:", session);
//           setNeedsKeySetup(true);
//           return;
//         }

//         // First check if user is registered in contract
//         const publicKeyResult = await getPublicKey(session.handle, session);
//         console.log("Public key check result:", publicKeyResult);
//         setSender(publicKeyResult.publicKey);

//         if (!publicKeyResult?.success) {
//           setNeedsKeySetup(true);
//           return;
//         }

//         const hasLocalKeys = await hasStoredKeys(session.handle);
//         setNeedsKeySetup(!hasLocalKeys);
//       } catch (error) {
//         console.error("Error checking keys:", error);
//         setNeedsKeySetup(true);
//       } finally {
//         setIsChecking(false);
//       }
//     };

//     if (session?.handle) {
//       checkKeys();
//     }
//   }, [session]);

//   // Add session persistence check
//   useEffect(() => {
//     if (!session?.handle) {
//       console.log("Session lost or not initialized");
//       setError("Please log in again");
//       return;
//     }
//   }, [session]);

//   // Handle encryption toggle
//   const handleEncryptionToggle = async () => {
//     if (!session?.handle) {
//       console.log("No user handle available");
//       return;
//     }

//     // Use hasKeys instead of hasStoredKeys
//     const hasLocalKeys = await hasKeys({
//       handle: session.handle,
//     });

//     if (!hasLocalKeys) {
//       setNeedsKeySetup(true);
//       return;
//     }
//     setIsEncrypted(!isEncrypted);
//   };

//   // Handle key setup completion
//   const handleKeySetupComplete = () => {
//     setNeedsKeySetup(false);
//     setIsEncrypted(true);
//   };

//   const handleUserSearch = async (query) => {
//     if (!query.trim()) {
//       setSearchResults([]);
//       setInviteMode(false);
//       setShowUserSearch(false);
//       return;
//     }
  
//     try {
//       setLoading(true);
//       const response = await searchUsers(query);
      
//       if (response.success && response.data.length > 0) {
//         // Get the first matching user
//         const user = response.data[0];
        
//         // Check if user has encryption keys
//         const keyCheck = await getPublicKey(user.handle, session);
        
//         if (!keyCheck?.success) {
//           // User doesn't have encryption - show invite UI
//           setInviteMode(true);
//           setSearchResults([user]); // Keep only this user
//           setShowUserSearch(true);
//           setError(null);
//         } else {
//           // User has encryption - show normal search results
//           setInviteMode(false);
//           setSearchResults(response.data);
//           setShowUserSearch(true);
//         }
//       } else {
//         setSearchResults([]);
//         setShowUserSearch(false);
//       }
//     } catch (error) {
//       console.error("User search error:", error);
//       setSearchResults([]);
//     } finally {
//       setLoading(false);
//     }
//   };
  
  

//   // Add this helper function
//   const createInviteMessage = (handle) => {
//     return `Hey @${handle}! I tried to send you an encrypted message but noticed you haven't set up encryption yet. Check out cycl3.app to get started with encrypted messaging! 🔒`;
//   };

//   const selectRecipient = async (user) => {
//     try {
//       setLoading(true);
//       setError("");

//       // Check if the recipient has a public key registered
//       const recipientPublicKey = await getPublicKey(user.handle, session);

//       if (
//         !recipientPublicKey?.success ||
//         !recipientPublicKey?.publicKey?.value
//       ) {
//         setError(`@${user.handle} hasn't set up encryption yet`);
//         setRecipient(null);
//         return;
//       }

//       // Store the recipient with their public key
//       setRecipient({
//         handle: user.handle,
//         displayName: user.displayName,
//         publicKey: recipientPublicKey.publicKey,
//       });

//       setShowUserSearch(false);
//       setSearchResults([]);
//       setSearchInput("");
//     } catch (error) {
//       console.error("Recipient validation error:", error);
//       setError(`Unable to verify encryption status for @${user.handle}`);
//       setRecipient(null);
//     } finally {
//       setLoading(false);
//     }
//   };

//   const handleSubmit = async (e) => {
//     e.preventDefault();
//     if (!content.trim()) return;

//     setLoading(true);
//     setError("");

//     try {
//       if (!session?.handle) {
//         throw new Error("Session invalid - please log in again");
//       }

//       let postContent = content;
//       if (isEncrypted) {
//         if (!recipient?.handle) {
//           throw new Error(
//             "Please select a valid recipient for encrypted message"
//           );
//         }

//         const encrypted = await encryptMessage(
//           content,
//           recipient.handle,
//           session.handle,
//           session
//         );

//         if (!encrypted.success) {
//           throw new Error(encrypted.error || "Encryption failed");
//         }

//         postContent = String(`🔒 @${recipient.handle} #e2e ${encrypted.data}`);
//       }
//       console.log("Encrypted preview post content", postContent);
//       // Create the post using Bluesky API
//       const postResult = await createPost({
//         text: postContent.toString(),
//         session,
//       });

//       if (!postResult.success) {
//         throw new Error(postResult.error || "Failed to create post");
//       }

//       // Clear form and notify parent
//       setContent("");
//       setIsEncrypted(false);
//       setRecipient(null);
//       setSearchInput("");
//       if (onPostCreated) {
//         onPostCreated(postResult.data);
//       }
//     } catch (error) {
//       console.error("Post creation error:", error);
//       setError(error.message);
//     } finally {
//       setLoading(false);
//     }
//   };

//   return (
//     <form onSubmit={handleSubmit} className="create-post">
//       {needsKeySetup ? (
//         <KeySetup onComplete={handleKeySetupComplete} />
//       ) : (
//         <>
//           <div className="create-post-header">
//             <button
//               type="button"
//               className={`btn-icon ${isEncrypted ? "active" : ""}`}
//               // onClick={() => setIsEncrypted(!isEncrypted)}
//               onClick={handleEncryptionToggle}
//               title={
//                 isEncrypted
//                   ? "Switch to public post"
//                   : "Switch to encrypted post"
//               }
//             >
//               {isEncrypted ? "🔒" : "🌐"}
//             </button>

//             {isEncrypted && (
//               <div className="recipient-selector">
//                 <input
//                   type="text"
//                   className="input recipient-input"
//                   placeholder="Search recipient..."
//                   value={searchInput}
//                   onChange={(e) => {
//                     setSearchInput(e.target.value);
//                     if (e.target.value.trim() === "") {
//                       setShowUserSearch(false);
//                       setSearchResults([]);
//                     } else {
//                       handleUserSearch(e.target.value);
//                       setShowUserSearch(true);
//                     }
//                   }}
//                   onFocus={() => setShowUserSearch(true)}
//                 />

//   {showUserSearch && (
//     <div className="recipient-results">
//       {inviteMode ? (
//         <div className="invite-mode">
//           <div className="invite-user">
//             <div className="user-info">
//               <span className="recipient-name">
//                 {searchResults[0].displayName || `@${searchResults[0].handle}`}
//               </span>
//               <span className="recipient-handle">@{searchResults[0].handle}</span>
//             </div>
//             <span className="encryption-status">❌ No encryption</span>
//           </div>
//           <button
//             className="invite-button"
//             onClick={() => {
//               setContent(createInviteMessage(searchResults[0].handle));
//               setIsEncrypted(false);
//               setShowUserSearch(false);
//               setSearchResults([]);
//               setSearchInput("");
//             }}
//           >
//             Send Invitation
//           </button>
//         </div>
//       ) : (
//         searchResults.map((user) => (
//           <div
//             key={user.did}
//             className="recipient-result"
//             onClick={() => selectRecipient(user)}
//           >
//             <div className="user-info">
//               <span className="recipient-name">
//                 {user.displayName || `@${user.handle}`}
//               </span>
//               <span className="recipient-handle">@{user.handle}</span>
//             </div>
//             <span className="encryption-status">🔒</span>
//           </div>
//         ))
//       )}
//     </div>
//   )}
//               </div>
//             )}
//           </div>

//           <div className="form-group">
//             <textarea
//               className="input post-input"
//               value={content}
//               onChange={(e) => setContent(e.target.value)}
//               placeholder={
//                 isEncrypted
//                   ? "Write an encrypted message..."
//                   : "What's happening?"
//               }
//               style={{ minHeight: "100px", resize: "vertical" }}
//             />
//           </div>

//           {error && (
//             <div className="error" style={{ marginBottom: "1rem" }}>
//               {error}
//             </div>
//           )}

//           {isEncrypted && (
//             <div className="encryption-info">
//               <span className="encryption-badge">🔒 End-to-End Encrypted</span>
//               {recipient?.handle && (
//                 <span className="encryption-recipient">
//                   to @{recipient.handle}
//                   {recipient.displayName && ` (${recipient.displayName})`}
//                 </span>
//               )}
//             </div>
//           )}

//           <div className="create-post-actions">
//             <button
//               type="submit"
//               className="btn btn-primary"
//               disabled={loading || (isEncrypted && !recipient)}
//             >
//               {loading ? "Posting..." : "Post"}
//             </button>
//           </div>
//         </>
//       )}
//     </form>
//   );
// }
