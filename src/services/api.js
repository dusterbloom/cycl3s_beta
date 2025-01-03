import { BskyAgent } from '@atproto/api';

const agent = new BskyAgent({
  service: 'https://bsky.social'
});

// Initialize agent with session
export const initializeAgent = (session) => {
  if (session?.accessJwt) {
    agent.session = session;
  }
};

export const getPostsByUser = async (handle) => {
  try {
    if (!agent.session) {
      throw new Error('Not authenticated');
    }

    // First get the user's DID
    const profile = await agent.getProfile({ actor: handle });
    if (!profile.success) {
      throw new Error('Failed to get user profile');
    }

    // Then get their posts
    const response = await agent.getAuthorFeed({
      actor: profile.data.did,
      limit: 50
    });

    return response.data.feed.map(item => item.post);
  } catch (error) {
    console.error('Get posts error:', error);
    throw error;
  }
};


export const searchUsers = async (query) => {
  try {
    const response = await agent.searchActors({ term: query, limit: 10 });
    if (!response.success) {
      throw new Error('Search failed');
    }
    return response.data.actors;
  } catch (error) {
    console.error('User search error:', error);
    throw error;
  }
};

export const createPost = async (text) => {
  try {
    if (!agent.session) {
      throw new Error('Not authenticated');
    }

    const response = await agent.post({
      text: text,
      createdAt: new Date().toISOString()
    });

    return {
      success: true,
      data: response
    };
  } catch (error) {
    console.error('Create post error:', error);
    return {
      success: false,
      error: error.message
    };
  }
};