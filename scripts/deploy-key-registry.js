// scripts/deploy-key-registry.js

const fs = require('fs');
const path = require('path');
const { getSigningJsdClient, jsd } = require('hyperwebjs');

async function deployContract() {
  try {
    const client = await getSigningJsdClient({
      rpcEndpoint: "http://localhost:26657",
    });

    const address = await client.getAddress();
    
    // Read the bundled contract
    const contractCode = fs.readFileSync(
      path.join(__dirname, '../dist/contracts/key-registry.js'), 
      'utf8'
    );

    // Deploy the contract
    const msg = jsd.jsd.MessageComposer.fromPartial.instantiate({
      creator: address,
      code: contractCode,
    });

    const fee = { 
      amount: [{ denom: 'token', amount: '100000' }], 
      gas: '550000' 
    };

    const result = await client.signAndBroadcast(address, [msg], fee);
    
    // Get the contract index
    const contractIndex = jsd.jsd.MsgInstantiateResponse
      .fromProtoMsg(result.msgResponses[0]).index;
    
    console.log('Contract deployed with index:', contractIndex);
    
    // Save the contract index to a file
    fs.writeFileSync(
      path.join(__dirname, '../contract-index.json'),
      JSON.stringify({ contractIndex })
    );

  } catch (error) {
    console.error('Deployment failed:', error);
  }
}

deployContract();