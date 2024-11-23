import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { connectKeplr, getKeplrAccount } from '../services/wallet';
import { 
  storeWalletLink, 
  getWalletLink, 
  removeWalletLink 
} from '../services/encryption';

export default function LinkWallet() {
  const { session } = useAuth();
  const [walletStatus, setWalletStatus] = useState({
    isLinked: false,
    address: null,
    error: null,
    loading: true
  });
  const [message, setMessage] = useState('');

  useEffect(() => {
    checkWalletLink();
  }, []);

  const checkWalletLink = async () => {
    try {
      const result = await getWalletLink();
      if (result.success) {
        setWalletStatus({
          isLinked: true,
          address: result.data.walletAddress,
          error: null,
          loading: false
        });
      } else {
        setWalletStatus({
          isLinked: false,
          address: null,
          error: null,
          loading: false
        });
      }
    } catch (error) {
      setWalletStatus({
        isLinked: false,
        address: null,
        error: error.message,
        loading: false
      });
    }
  };

  const handleLinkWallet = async () => {
    try {
      setMessage('');
      setWalletStatus(prev => ({ ...prev, loading: true }));

      // First connect Keplr
      const keplrResult = await connectKeplr();
      if (!keplrResult.success) {
        throw new Error(keplrResult.error || 'Failed to connect Keplr');
      }

      // Store the wallet link
      const linkResult = await storeWalletLink(
        session.handle,
        keplrResult.data.address
      );

      if (linkResult.success) {
        setWalletStatus({
          isLinked: true,
          address: keplrResult.data.address,
          error: null,
          loading: false
        });
        setMessage('Wallet linked successfully!');
      } else {
        throw new Error(linkResult.error || 'Failed to store wallet link');
      }
    } catch (error) {
      console.error('Link wallet error:', error);
      setWalletStatus(prev => ({
        ...prev,
        error: error.message,
        loading: false
      }));
      setMessage(error.message);
    }
  };

  const handleUnlinkWallet = async () => {
    try {
      setMessage('');
      const result = await removeWalletLink();
      if (result.success) {
        setWalletStatus({
          isLinked: false,
          address: null,
          error: null,
          loading: false
        });
        setMessage('Wallet unlinked successfully');
      } else {
        throw new Error(result.error || 'Failed to unlink wallet');
      }
    } catch (error) {
      console.error('Unlink wallet error:', error);
      setMessage(error.message);
    }
  };

  if (walletStatus.loading) {
    return (
      <div className="wallet-section">
        <p>Loading wallet status...</p>
      </div>
    );
  }

  return (
    <div className="wallet-section">
      <h3 className="wallet-title">Wallet Connection</h3>
      
      {walletStatus.isLinked ? (
        <div className="wallet-info">
          <div className="wallet-status success">
            <span>Connected: {walletStatus.address.slice(0, 8)}...{walletStatus.address.slice(-6)}</span>
          </div>
          <button 
            className="btn btn-secondary"
            onClick={handleUnlinkWallet}
          >
            Unlink Wallet
          </button>
        </div>
      ) : (
        <div className="wallet-info">
          <button 
            className="btn btn-primary"
            onClick={handleLinkWallet}
            disabled={walletStatus.loading}
          >
            {walletStatus.loading ? 'Connecting...' : 'Link Wallet'}
          </button>
        </div>
      )}

      {message && (
        <div className={`message ${walletStatus.error ? 'error' : 'success'}`}>
          {message}
        </div>
      )}

      {walletStatus.error && (
        <div className="error">
          {walletStatus.error}
        </div>
      )}
    </div>
  );
}
