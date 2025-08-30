const { ethers } = require('ethers');

// Contract address
const CONTRACT_ADDRESS = '0x41d509f262b9A4d7848aB5CD441eDEce5A57cf58';

// ABI cho các functions cần test
const ABI = [
  {
    "inputs": [],
    "name": "spin",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "spinLite",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "dailyGm",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "uint64",
        "name": "count",
        "type": "uint64"
      }
    ],
    "name": "buySpinWithGmBatch",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "uint8",
        "name": "slot",
        "type": "uint8"
      }
    ],
    "name": "settlePrize",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  }
];

async function estimateHCU(contract, functionName, args = []) {
  try {
    console.log(`\n🔍 Estimating HCU for ${functionName}...`);
    
    const est = await contract[functionName].estimateGas(...args);
    console.log(`   Gas estimate: ${est.toString()}`);
    
    // Rough HCU estimation: HCU ≈ gas usage / 100
    const estimatedHCU = Number(est) / 100;
    const percentageOfLimit = (estimatedHCU / 20_000_000) * 100;
    
    console.log(`   Estimated HCU: ${estimatedHCU.toLocaleString()}`);
    console.log(`   % of HCU limit: ${percentageOfLimit.toFixed(2)}%`);
    
    // Status indicators
    let status = "✅ Safe";
    if (percentageOfLimit > 90) status = "🚨 Critical";
    else if (percentageOfLimit > 75) status = "⚠️ Warning";
    else if (percentageOfLimit > 50) status = "🟡 Medium";
    
    console.log(`   Status: ${status}`);
    
    return {
      functionName,
      gasEstimate: est.toString(),
      estimatedHCU,
      percentageOfLimit,
      status
    };
  } catch (error) {
    console.error(`   ❌ Failed to estimate ${functionName}:`, error.message);
    return {
      functionName,
      error: error.message,
      status: "❌ Failed"
    };
  }
}

async function checkHCUUsage() {
  try {
    console.log('🔍 Checking HCU Usage for LuckySpinFHE Contract');
    console.log('================================================');
    
    // Connect to Sepolia
    const provider = new ethers.JsonRpcProvider('https://rpc.sepolia.org');
    const contract = new ethers.Contract(CONTRACT_ADDRESS, ABI, provider);
    
    // Test wallet (read-only)
    const testWallet = ethers.Wallet.createRandom().connect(provider);
    
    console.log(`Contract: ${CONTRACT_ADDRESS}`);
    console.log(`Network: Sepolia`);
    console.log(`HCU Limit: 20,000,000 per transaction`);
    console.log(`HCU Depth Limit: 5,000,000 per transaction`);
    
    // Test different functions
    const functions = [
      { name: 'spin', args: [] },
      { name: 'spinLite', args: [] },
      { name: 'dailyGm', args: [] },
      { name: 'buySpinWithGmBatch', args: [1] },
      { name: 'settlePrize', args: [0] }
    ];
    
    const results = [];
    
    for (const func of functions) {
      const result = await estimateHCU(contract, func.name, func.args);
      results.push(result);
    }
    
    // Summary
    console.log('\n📊 HCU Usage Summary');
    console.log('====================');
    
    const table = results.map(r => {
      if (r.error) {
        return `${r.functionName.padEnd(20)} | ❌ Failed: ${r.error}`;
      }
      return `${r.functionName.padEnd(20)} | ${r.estimatedHCU.toLocaleString().padStart(10)} HCU | ${r.percentageOfLimit.toFixed(2).padStart(6)}% | ${r.status}`;
    });
    
    console.log('Function'.padEnd(20) + ' | ' + 'HCU Usage'.padStart(10) + ' | ' + '% Limit'.padStart(6) + ' | Status');
    console.log('-'.repeat(60));
    table.forEach(row => console.log(row));
    
    // Recommendations
    console.log('\n💡 Recommendations:');
    console.log('==================');
    
    const highHCUFunctions = results.filter(r => r.percentageOfLimit > 50);
    if (highHCUFunctions.length > 0) {
      console.log('⚠️ High HCU functions detected:');
      highHCUFunctions.forEach(f => {
        console.log(`   - ${f.functionName}: ${f.estimatedHCU.toLocaleString()} HCU (${f.percentageOfLimit.toFixed(2)}%)`);
      });
      console.log('\n🔧 Consider optimizing:');
      console.log('   1. Reduce nested FHE.select() operations');
      console.log('   2. Batch FHE.allow() calls');
      console.log('   3. Use spinLite() + settlePrize() pattern');
    } else {
      console.log('✅ All functions are within safe HCU limits');
    }
    
    // Check for potential depth issues
    console.log('\n🔍 Depth Analysis:');
    console.log('==================');
    console.log('Functions with nested FHE.select() operations:');
    console.log('   - spinWithEncryptedRandom() (commented out) - 7 levels nested');
    console.log('   - Risk: May exceed 5,000,000 HCU depth limit');
    console.log('   - Recommendation: Flatten nested operations');
    
  } catch (error) {
    console.error('❌ Error checking HCU usage:', error.message);
  }
}

// Run the analysis
checkHCUUsage().catch(console.error);
