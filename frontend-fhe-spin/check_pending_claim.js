const { ethers } = require('ethers');

// Contract address
const CONTRACT_ADDRESS = '0x41d509f262b9A4d7848aB5CD441eDEce5A57cf58';
const TARGET_WALLET = '0xE24546D5Ff7bf460Ebdaa36847e38669996D1a0D';

// ABI cho các hàm cần thiết
const ABI = [
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "",
        "type": "address"
      }
    ],
    "name": "hasPendingClaim",
    "outputs": [
      {
        "internalType": "bool",
        "name": "",
        "type": "bool"
      }
    ],
    "stateMutability": "view",
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
    "name": "getClaimRequest",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "amountWei",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "timestamp",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
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

async function checkPendingClaim() {
  try {
    // Kết nối Sepolia testnet (public RPC)
    const provider = new ethers.JsonRpcProvider('https://rpc.sepolia.org');

    // Tạo contract instance (read-only)
    const contract = new ethers.Contract(CONTRACT_ADDRESS, ABI, provider);

    console.log('🔍 Checking pending claim status for wallet:', TARGET_WALLET);

    // Kiểm tra có pending claim không
    const hasPending = await contract.hasPendingClaim(TARGET_WALLET);
    console.log('📋 Has pending claim:', hasPending);

    if (hasPending) {
      // Lấy thông tin claim request
      const claimRequest = await contract.getClaimRequest(TARGET_WALLET);
      console.log('📋 Claim request details:');
      console.log('   Amount (Wei):', claimRequest.amountWei.toString());
      console.log('   Amount (ETH):', ethers.formatEther(claimRequest.amountWei));
      console.log('   Timestamp:', new Date(Number(claimRequest.timestamp) * 1000).toISOString());
      
      console.log('\n⚠️  VẤN ĐỀ: Có pending claim đang chờ xử lý!');
      console.log('💡 Giải pháp:');
      console.log('   1. Đợi claim được xử lý tự động');
      console.log('   2. Hoặc liên hệ admin để cancel claim');
      console.log('   3. Hoặc thử lại sau khi claim được settle');
    } else {
      // Kiểm tra pending ETH
      const pendingEthEncrypted = await contract.getEncryptedPendingEthWei(TARGET_WALLET);
      console.log('📦 Encrypted pending ETH:', pendingEthEncrypted);

      if (pendingEthEncrypted === '0x0000000000000000000000000000000000000000000000000000000000000000') {
        console.log('❌ No pending ETH to withdraw');
        console.log('💡 User needs to win more spins to accumulate pending ETH');
      } else {
        console.log('💰 Found pending ETH!');
        console.log('✅ No pending claim - can withdraw normally');
        console.log('💡 To withdraw, you need:');
        console.log('   1. Private key of the wallet');
        console.log('   2. Call withdrawAllPendingETH() function');
        console.log('   3. Or use the frontend app to decrypt and withdraw');
      }
    }

  } catch (error) {
    console.error('❌ Error checking pending claim:', error.message);
  }
}

// Chạy script
checkPendingClaim();
