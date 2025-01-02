// src/contracts/key-registry/index.js

const initialState = {
  keys: {}
};

function registerKey(state, { publicKey }) {
  const sender = msg.sender;
  
  return {
    ...state,
    keys: {
      ...state.keys,
      [sender]: {
        publicKey,
        timestamp: Date.now()
      }
    }
  };
}

function getKey(state, { address }) {
  return state.keys[address] || null;
}

function updateKey(state, { publicKey }) {
  const sender = msg.sender;
  
  if (!state.keys[sender]) {
    throw new Error("No key registered for this address");
  }

  return {
    ...state,
    keys: {
      ...state.keys,
      [sender]: {
        publicKey,
        timestamp: Date.now()
      }
    }
  };
}

function removeKey(state) {
  const sender = msg.sender;
  
  const newKeys = { ...state.keys };
  delete newKeys[sender];

  return {
    ...state,
    keys: newKeys
  };
}

module.exports = {
  initialState,
  registerKey,
  getKey,
  updateKey,
  removeKey
};