import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { getMyProfile } from '../services/bluesky';
import LinkWallet from './LinkWallet';

export default function Profile() {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const { session } = useAuth();

  useEffect(() => {
    loadProfile();
  }, []);

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

  if (loading) {
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
        </div>
      </div>

      {/* Add LinkWallet component here */}
      <LinkWallet />
    </div>
  );
}
