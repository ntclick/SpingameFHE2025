const { ethers } = require('ethers');

// Contract address và ABI
const CONTRACT_ADDRESS = '0x41d509f262b9A4d7848aB5CD441eDEce5A57cf58';
const TARGET_WALLET = '0xE24546D5Ff7bf460Ebdaa36847e38669996D1a0D';

// ABI cho withdraw functions
const ABI = [
  {
    "inputs": [],
    "name": "withdrawAllPendingETH",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "amountWei",
        "type": "uint256"
      }
    ],
    "name": "withdrawPendingETH",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
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

async function withdrawETH() {
  try {
    // Kết nối Sepolia testnet
    const provider = new ethers.JsonRpcProvider('https://sepolia.infura.io/v3/YOUR_INFURA_KEY');
    
    // Private key của ví (cần thay thế)
    const privateKey = 'YOUR_PRIVATE_KEY_HERE';
    const wallet = new ethers.Wallet(privateKey, provider);
    
    // Tạo contract instance
    const contract = new ethers.Contract(CONTRACT_ADDRESS, ABI, wallet);
    
    console.log('🔍 Checking pending ETH for wallet:', TARGET_WALLET);
    
    // Kiểm tra pending ETH (encrypted)
    const pendingEthEncrypted = await contract.getEncryptedPendingEthWei(TARGET_WALLET);
    console.log('📦 Encrypted pending ETH:', pendingEthEncrypted);
    
    if (pendingEthEncrypted === '0x0000000000000000000000000000000000000000000000000000000000000000') {
      console.log('❌ No pending ETH to withdraw');
      return;
    }
    
    console.log('💰 Found pending ETH, attempting to withdraw...');
    
    // Rút tất cả pending ETH
    const tx = await contract.withdrawAllPendingETH();
    console.log('📝 Transaction hash:', tx.hash);
    
    // Chờ transaction được confirm
    const receipt = await tx.wait();
    console.log('✅ Transaction confirmed in block:', receipt.blockNumber);
    
    console.log('🎉 ETH successfully withdrawn to wallet:', TARGET_WALLET);
    
  } catch (error) {
    console.error('❌ Error withdrawing ETH:', error.message);
  }
}

// Chạy script
withdrawETH();
