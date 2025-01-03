import React, { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import {
  searchUsers,
  createPost,
  getPostsByUser,
  initializeAgent,
} from "../services/api";
import { encryptMessage, decryptMessage, getPublicKeyData } from '../services/signalEncryption';

import EncryptedPost from "./EncryptedPost";

import "../styles/Messages.css";

export default function Messages() {
  const { session } = useAuth();
  const [conversations, setConversations] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [message, setMessage] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Load conversations
  useEffect(() => {
    if (session?.handle) {
      initializeAgent(session); // Add this line
      loadConversations();
    }
  }, [session]);

  const loadConversations = async () => {
    try {
      setLoading(true);
      // Get posts that are encrypted and either sent by or to the current user
      const posts = await getPostsByUser(session.handle);
      const encryptedPosts = posts.filter(
        (post) =>
          post.record.text.startsWith("🔒") &&
          (post.author.handle === session.handle ||
            post.record.text.includes(`@${session.handle}`))
      );

      // Group posts by conversation partner
      const conversationMap = new Map();

      encryptedPosts.forEach((post) => {
        const match = post.record.text.match(/🔒 @([a-zA-Z0-9.-]+)/);
        if (match) {
          const partner =
            match[1] === session.handle ? post.author.handle : match[1];
          if (!conversationMap.has(partner)) {
            conversationMap.set(partner, []);
          }
          conversationMap.get(partner).push(post);
        }
      });

      setConversations(
        Array.from(conversationMap.entries()).map(([partner, messages]) => ({
          partner,
          messages: messages.sort(
            (a, b) => new Date(b.indexedAt) - new Date(a.indexedAt)
          ),
        }))
      );
    } catch (error) {
      console.error("Error loading conversations:", error);
      setError("Failed to load conversations");
    } finally {
      setLoading(false);
    }
  };

  const handleUserSearch = async (query) => {
    if (!query.trim()) return;
    try {
      const results = await searchUsers(query);
      setSearchResults(
        results.filter((user) => user.handle !== session.handle)
      );
    } catch (error) {
      console.error("Search error:", error);
    }
  };

  const selectUser = async (user) => {
    try {
      const publicKey = await getPublicKeyData(user.handle);
      if (!publicKey) {
        throw new Error(`${user.handle} hasn't set up encryption keys yet`);
      }
      setSelectedUser({ ...user, publicKey });
      setSearchInput("");
      setSearchResults([]);
    } catch (error) {
      setError(error.message);
    }
  };

  const sendMessage = async () => {
    if (!message.trim() || !selectedUser) return;

    try {
      setLoading(true);
      const encrypted = await encryptMessage(message, selectedUser.publicKey);
      if (!encrypted.success) {
        throw new Error(encrypted.error || "Encryption failed");
      }

      const postContent = `🔒 @${selectedUser.handle} #e2e ${encrypted.data}`;
      const response = await createPost(postContent);

      if (response.success) {
        setMessage("");
        loadConversations(); // Reload conversations to show new message
      } else {
        throw new Error(response.error || "Failed to send message");
      }
    } catch (error) {
      console.error("Send message error:", error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="messages-container">
      <div className="conversations-list">
        <div className="new-conversation">
          <input
            type="text"
            placeholder="Search users..."
            value={searchInput}
            onChange={(e) => {
              setSearchInput(e.target.value);
              handleUserSearch(e.target.value);
            }}
          />
          {searchResults.length > 0 && (
            <div className="search-results">
              {searchResults.map((user) => (
                <div
                  key={user.did}
                  className="search-result"
                  onClick={() => selectUser(user)}
                >
                  {user.displayName || `@${user.handle}`}
                </div>
              ))}
            </div>
          )}
        </div>

        {conversations.map(({ partner, messages }) => (
          <div
            key={partner}
            className={`conversation ${
              selectedUser?.handle === partner ? "selected" : ""
            }`}
            onClick={() => selectUser({ handle: partner })}
          >
            <div className="conversation-preview">
              <span className="partner-name">@{partner}</span>
              <span className="last-message-time">
                {new Date(messages[0].indexedAt).toLocaleDateString()}
              </span>
            </div>
          </div>
        ))}
      </div>

      {selectedUser && (
        <div className="message-thread">
          <div className="thread-header">
            <h3>{selectedUser.displayName || `@${selectedUser.handle}`}</h3>
          </div>

          <div className="messages-list">
            {conversations
              .find((c) => c.partner === selectedUser.handle)
              ?.messages.map((post) => (
                <div
                  key={post.uri}
                  className={`message ${
                    post.author.handle === session.handle ? "sent" : "received"
                  }`}
                >
                  <EncryptedPost post={post} />
                </div>
              ))}
          </div>

          <div className="message-input">
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Type an encrypted message..."
            />
            <button onClick={sendMessage} disabled={loading || !message.trim()}>
              {loading ? "Sending..." : "Send"}
            </button>
          </div>
        </div>
      )}

      {error && <div className="error-message">{error}</div>}
    </div>
  );
}
