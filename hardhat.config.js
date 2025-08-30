// require("@fhevm/hardhat-plugin");
require("@nomicfoundation/hardhat-toolbox");
require("@nomicfoundation/hardhat-chai-matchers");
require("@nomicfoundation/hardhat-ethers");
require("@nomicfoundation/hardhat-verify");
require("@typechain/hardhat");
require("hardhat-deploy");
require("hardhat-gas-reporter");
require("solidity-coverage");
require("dotenv").config();

// Get environment variables
const VITE_PRIVATE_KEY = process.env.REACT_APP_PRIVATE_KEY;
const VITE_SEPOLIA_RPC_URL = process.env.REACT_APP_SEPOLIA_RPC_URL;

module.exports = {
  defaultNetwork: "hardhat",
  namedAccounts: {
    deployer: 0,
  },
  etherscan: {
    apiKey: {
      sepolia: process.env.REACT_APP_ETHERSCAN_API_KEY,
    },
  },
  gasReporter: {
    currency: "USD",
    enabled: process.env.REPORT_GAS ? true : false,
    excludeContracts: [],
  },
  networks: {
    hardhat: {
      accounts: {
        mnemonic: "test test test test test test test test test test test junk",
      },
      chainId: 31337,
    },
    sepolia: {
      accounts: VITE_PRIVATE_KEY ? [VITE_PRIVATE_KEY] : [],
      chainId: 11155111,
      url: VITE_SEPOLIA_RPC_URL || "YOUR_SEPOLIA_RPC_URL_HERE",
      gasPrice: 100000000, // 0.1 gwei
    },
  },
  paths: {
    artifacts: "./artifacts",
    cache: "./cache",
    sources: "./contracts",
    tests: "./test",
  },
  solidity: {
    version: "0.8.24",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200,
      },
    },
  },
  typechain: {
    outDir: "types",
    target: "ethers-v6",
  },
};
