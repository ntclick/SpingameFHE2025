// Zama FHEVM Configuration
export const ZAMA_CONFIG = {
  // Relayer Configuration
  RELAYER_URL: "https://relayer.testnet.zama.cloud",
  
  // RPC Configuration
  SEPOLIA_RPC_URL: "YOUR_SEPOLIA_RPC_URL_HERE",
  
  // Contract Addresses
  FHEVM_CONTRACT_ADDRESS: "YOUR_FHEVM_CONTRACT_ADDRESS_HERE",
  ZAMA_STANDARD_CONTRACT_ADDRESS: "YOUR_ZAMA_STANDARD_CONTRACT_ADDRESS_HERE",
  ZAMA_FHEVM_STANDARD_CONTRACT_ADDRESS: "YOUR_ZAMA_FHEVM_STANDARD_CONTRACT_ADDRESS_HERE",
  
  // API Keys
  ETHERSCAN_API_KEY: "YOUR_ETHERSCAN_API_KEY_HERE",
  
  // Private Key (for testing only - should be in .env in production)
  PRIVATE_KEY: "YOUR_PRIVATE_KEY_HERE"
};

// Network Configuration
export const NETWORK_CONFIG = {
  sepolia: {
    chainId: 11155111,
    rpcUrl: ZAMA_CONFIG.SEPOLIA_RPC_URL,
    explorer: "https://sepolia.etherscan.io",
    contracts: {
      fhevm: ZAMA_CONFIG.FHEVM_CONTRACT_ADDRESS,
      zamaStandard: ZAMA_CONFIG.ZAMA_STANDARD_CONTRACT_ADDRESS,
      zamaFHEVMStandard: ZAMA_CONFIG.ZAMA_FHEVM_STANDARD_CONTRACT_ADDRESS
    }
  }
};

// Hardhat Configuration
export const HARDHAT_CONFIG = {
  mnemonic: "test test test test test test test test test test test junk",
  infuraApiKey: "YOUR_INFURA_API_KEY_HERE",
  etherscanApiKey: ZAMA_CONFIG.ETHERSCAN_API_KEY
}; 