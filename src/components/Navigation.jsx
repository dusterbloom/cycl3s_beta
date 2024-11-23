import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Navigation() {
  const { logout, session } = useAuth();
  
  return (
    <nav className="nav">
      <div className="nav-content">
        <Link to="/" className="logo">cycl3 ♾️</Link>
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
          <Link 
            to={`/profile/${session?.handle}`} 
            className="nav-profile"
          >
            @{session?.handle}
          </Link>
          <Link to="/" className="btn btn-secondary">Feed</Link>
          <Link to="/messages" className="btn btn-secondary">Messages</Link>
          <Link to="/functions" className="btn btn-secondary">Functions</Link>
          <button onClick={logout} className="btn btn-secondary">Logout</button>
        </div>
      </div>
    </nav>
  );
}
