import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getUserProfile, getUserPosts, toggleFollow } from '../services/bluesky';

export default function UserProfile() {
  const { handle } = useParams();
  const navigate = useNavigate();
  const { session } = useAuth();
  const [profile, setProfile] = useState(null);
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    loadProfileAndPosts();
  }, [handle]);

  const loadProfileAndPosts = async () => {
    try {
      setLoading(true);
      const [profileResponse, postsResponse] = await Promise.all([
        getUserProfile(handle),
        getUserPosts(handle)
      ]);

      if (profileResponse.success) {
        setProfile(profileResponse.data);
      } else {
        setError('Failed to load profile');
      }

      if (postsResponse.success) {
        setPosts(postsResponse.data);
      }
    } catch (error) {
      console.error('Profile load error:', error);
      setError('An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleFollowToggle = async () => {
    try {
      const response = await toggleFollow(profile.did);
      if (response.success) {
        loadProfileAndPosts();
      }
    } catch (error) {
      console.error('Follow toggle error:', error);
    }
  };

  const handleImageError = (e) => {
    e.target.style.display = 'none';
  };

  const getProxyUrl = (url) => {
    if (!url) return '';
    // Remove any query parameters from the URL
    const baseUrl = url.split('?')[0];
    return `https://images.weserv.nl/?url=${encodeURIComponent(baseUrl)}&default=404`;
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
            <img
              src={getProxyUrl(profile.banner)}
              alt="Profile banner"
              onError={handleImageError}
            />
          </div>
        )}
        <div className="profile-content">
          <div className="profile-header">
            {profile.avatar && (
              <img 
                src={getProxyUrl(profile.avatar)}
                alt={`${profile.displayName || profile.handle}'s avatar`}
                className="profile-avatar"
                onError={handleImageError}
              />
            )}
            <div className="profile-info">
              <div className="profile-name-section">
                <h1 className="profile-name">
                  {profile.displayName || `@${profile.handle}`}
                </h1>
                {session?.handle !== profile.handle && (
                  <button 
                    onClick={handleFollowToggle}
                    className={`btn ${profile.viewer?.following ? 'btn-secondary' : 'btn-primary'}`}
                  >
                    {profile.viewer?.following ? 'Following' : 'Follow'}
                  </button>
                )}
              </div>
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

      <div className="profile-posts">
        <h2 className="posts-header">Posts</h2>
        {posts.map((post) => (
          <div key={post.uri} className="post">
            <div className="post-header">
              <div className="post-author-info">
                <span className="post-time">
                  {new Date(post.record.createdAt).toLocaleString()}
                </span>
              </div>
            </div>
            <p className="post-content">{post.record.text}</p>
            {post.embed?.images && (
              <div className="post-images">
                {post.embed.images.map((image, index) => (
                  <img
                    key={index}
                    src={getProxyUrl(image.thumb)}
                    alt={image.alt || 'Post image'}
                    className="post-image"
                    loading="lazy"
                    onError={handleImageError}
                    onClick={() => window.open(getProxyUrl(image.fullsize), '_blank')}
                  />
                ))}
              </div>
            )}
            <div className="post-actions">
              <span>💬 {post.replyCount || 0}</span>
              <span>🔄 {post.repostCount || 0}</span>
              <span>❤️ {post.likeCount || 0}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
