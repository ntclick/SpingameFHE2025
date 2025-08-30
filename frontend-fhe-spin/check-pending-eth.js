const { ethers } = require('ethers');

// Contract address
const CONTRACT_ADDRESS = '0x41d509f262b9A4d7848aB5CD441eDEce5A57cf58';
const TARGET_WALLET = '0xE24546D5Ff7bf460Ebdaa36847e38669996D1a0D';

// ABI đơn giản
const ABI = [
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "",
        "type": "address"
      }
    ],
    "name": "getEncryptedPendingEthWei",
    "outputs": [
      {
        "internalType": "bytes32",
        "name": "",
        "type": "bytes32"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  }
];

async function checkPendingETH() {
  try {
    // Kết nối Sepolia testnet (public RPC)
    const provider = new ethers.JsonRpcProvider('https://rpc.sepolia.org');
    
    // Tạo contract instance (read-only)
    const contract = new ethers.Contract(CONTRACT_ADDRESS, ABI, provider);
    
    console.log('🔍 Checking pending ETH for wallet:', TARGET_WALLET);
    
    // Kiểm tra pending ETH (encrypted)
    const pendingEthEncrypted = await contract.getEncryptedPendingEthWei(TARGET_WALLET);
    console.log('📦 Encrypted pending ETH:', pendingEthEncrypted);
    
    if (pendingEthEncrypted === '0x0000000000000000000000000000000000000000000000000000000000000000') {
      console.log('❌ No pending ETH to withdraw');
      console.log('💡 User needs to win more spins to accumulate pending ETH');
    } else {
      console.log('💰 Found pending ETH!');
      console.log('💡 To withdraw, you need:');
      console.log('   1. Private key of the wallet');
      console.log('   2. Call withdrawAllPendingETH() function');
      console.log('   3. Or use the frontend app to decrypt and withdraw');
    }
    
  } catch (error) {
    console.error('❌ Error checking pending ETH:', error.message);
  }
}

// Chạy script
checkPendingETH();
