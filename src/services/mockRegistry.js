// Mock profile registry simulating smart contract storage
const mockProfiles = new Map();

// Mock wallet keypairs (in reality, these would be in Keplr)
export const mockKeypairs = new Map([
  ['cosmos1abc...', { publicKey: 'pub1', privateKey: 'priv1' }],
  ['cosmos2def...', { publicKey: 'pub2', privateKey: 'priv2' }],
  ['cosmos3ghi...', { publicKey: 'pub3', privateKey: 'priv3' }]
]);

// Initialize some mock profiles
const initializeMockProfiles = () => {
  mockProfiles.set('did:example:alice', {
    did: 'did:example:alice',
    handle: 'alice.bsky.social',
    cosmosAddress: 'cosmos1abc...',
    publicKey: mockKeypairs.get('cosmos1abc...').publicKey,
    socialHandles: {
      bluesky: 'alice.bsky.social'
    }
  });

  mockProfiles.set('did:example:bob', {
    did: 'did:example:bob',
    handle: 'bob.bsky.social',
    cosmosAddress: 'cosmos2def...',
    publicKey: mockKeypairs.get('cosmos2def...').publicKey,
    socialHandles: {
      bluesky: 'bob.bsky.social'
    }
  });
};

// Initialize mock profiles when the module loads
initializeMockProfiles();

export const registerProfile = async (did, handle, cosmosAddress) => {
  try {
    const keypair = mockKeypairs.get(cosmosAddress);
    if (!keypair) throw new Error('Wallet not found');

    const profile = {
      did,
      handle,
      cosmosAddress,
      publicKey: keypair.publicKey,
      socialHandles: {
        bluesky: handle
      }
    };

    mockProfiles.set(did, profile);
    // Also store by cosmos address for easier lookup
    mockProfiles.set(cosmosAddress, profile);

    return {
      success: true,
      data: profile
    };
  } catch (error) {
    console.error('Profile registration error:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

export const getProfile = async (identifier) => {
  try {
    // Search by DID, handle, or cosmos address
    const profile = Array.from(mockProfiles.values()).find(
      p => p.did === identifier || 
          p.handle === identifier || 
          p.cosmosAddress === identifier
    );

    if (!profile) throw new Error('Profile not found');

    return {
      success: true,
      data: profile
    };
  } catch (error) {
    console.error('Get profile error:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

export const getProfileByCosmosAddress = async (cosmosAddress) => {
  try {
    // First check if profile exists
    const profile = Array.from(mockProfiles.values()).find(
      p => p.cosmosAddress === cosmosAddress
    );

    // If no profile exists, create a new one
    if (!profile) {
      const keypair = mockKeypairs.get(cosmosAddress);
      if (!keypair) throw new Error('Wallet not found');

      const newProfile = {
        did: `did:cosmos:${cosmosAddress}`,
        handle: `user-${cosmosAddress.slice(0, 8)}`,
        cosmosAddress,
        publicKey: keypair.publicKey,
        socialHandles: {
          bluesky: `user-${cosmosAddress.slice(0, 8)}.bsky.social`
        }
      };

      mockProfiles.set(cosmosAddress, newProfile);
      return {
        success: true,
        data: newProfile
      };
    }

    return {
      success: true,
      data: profile
    };
  } catch (error) {
    console.error('Get profile error:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

// Helper function to list all profiles (for debugging)
export const listProfiles = () => {
  return Array.from(mockProfiles.values());
};

// Helper function to clear all profiles (for testing)
export const clearProfiles = () => {
  mockProfiles.clear();
  initializeMockProfiles();
};
