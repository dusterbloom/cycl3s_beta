import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { getMyProfile } from '../services/bluesky';
import { hasStoredKeys, getPublicKeyData, storeKeyPair } from '../services/signalEncryption';
import { initializeKeys } from '../utils/init';

export default function Profile() {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [publicKey, setPublicKey] = useState(null);
  const [copyStatus, setCopyStatus] = useState('');
  const { session } = useAuth();

  

  const loadProfile = async () => {
    try {
      const response = await getMyProfile();
      if (response.success) {
        setProfile(response.data);
      } else {
        setError('Failed to load profile');
      }
    } catch (error) {
      console.error('Profile error:', error);
      setError('An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  const copyPublicKey = async () => {
    try {
      const keyString = JSON.stringify(publicKey);
      await navigator.clipboard.writeText(keyString);
      setCopyStatus('Public key copied!');
      setTimeout(() => setCopyStatus(''), 2000);
    } catch (error) {
      console.error('Copy error:', error);
      setCopyStatus('Failed to copy');
    }
  };

  if (loading) {
    // Add this right before the return statement
    console.log('Rendering Profile with:', {
      profile,
      publicKey,
      error,
      loading
    });
    return (
      <div className="container" style={{ textAlign: 'center', padding: '2rem' }}>
        Loading profile...
      </div>
    );
  }

  if (error) {
    return (
      <div className="container">
        <div className="error">{error}</div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="container">
        <div className="error">Profile not found</div>
      </div>
    );
  }



  return (
    <div className="container">
      <div className="profile-card">
        {profile.banner && (
          <div className="profile-banner">
            <img src={profile.banner} alt="Profile banner" />
          </div>
        )}
        <div className="profile-content">
          <div className="profile-header">
            {profile.avatar && (
              <img
                src={profile.avatar}
                alt={`${profile.displayName || profile.handle}'s avatar`}
                className="profile-avatar"
              />
            )}
            <div className="profile-info">
              <h1 className="profile-name">
                {profile.displayName || `@${profile.handle}`}
              </h1>
              <p className="profile-handle">@{profile.handle}</p>
            </div>
          </div>

          {profile.description && (
            <p className="profile-description">{profile.description}</p>
          )}

          <div className="profile-stats">
            <div className="stat">
              <span className="stat-value">{profile.postsCount || 0}</span>
              <span className="stat-label">Posts</span>
            </div>
            <div className="stat">
              <span className="stat-value">{profile.followersCount || 0}</span>
              <span className="stat-label">Followers</span>
            </div>
            <div className="stat">
              <span className="stat-value">{profile.followsCount || 0}</span>
              <span className="stat-label">Following</span>
            </div>
          </div>

          {/* Add Public Key Section */}
          <div className="profile-encryption">
            <h3>Encryption Public Key</h3>
            {publicKey ? (
              <div className="public-key-container">
                <div className="public-key-info">
                  <p className="public-key-label">Share this key to receive encrypted messages:</p>
                  <code className="public-key-value">
                    {Array.isArray(publicKey)
                      ? publicKey.join(',')
                      : typeof publicKey === 'object'
                        ? JSON.stringify(publicKey, null, 2)
                        : String(publicKey)
                    }
                  </code>
                </div>
                <button
                  className="btn btn-secondary"
                  onClick={copyPublicKey}
                >
                  Copy Full Key
                </button>
                {copyStatus && (
                  <div className={`copy-status ${copyStatus.includes('Failed') ? 'error' : 'success'}`}>
                    {copyStatus}
                  </div>
                )}
              </div>
            ) : (
              <div className="public-key-container">
                <p className="error">No encryption keys found</p>
                <button
                  className="btn btn-primary"
                  onClick={initializeKeys}
                >
                  Generate Keys
                </button>
              </div>
            )}
          </div>

          
        </div>
      </div>
    </div>
  );
}

