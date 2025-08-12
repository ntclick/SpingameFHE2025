const { ethers } = require("hardhat");

async function main() {
  console.log("=== Deploying LuckySpinFHE_Simple ===");
  
  // Get the deployer account
  const [deployer] = await ethers.getSigners();
  console.log("Deploying contracts with account:", deployer.address);
  console.log("Account balance:", (await deployer.getBalance()).toString());

  // Deploy the contract
  const LuckySpinFHE = await ethers.getContractFactory("LuckySpinFHE_Simple");
  const luckySpin = await LuckySpinFHE.deploy();
  await luckySpin.waitForDeployment();

  const address = await luckySpin.getAddress();
  console.log("LuckySpinFHE_Simple deployed to:", address);
  
  console.log("\n=== Add to your .env file ===");
  console.log(`REACT_APP_FHEVM_CONTRACT_ADDRESS=${address}`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
