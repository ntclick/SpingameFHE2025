const { ethers } = require("hardhat");

async function main() {
  console.log("🚀 Deploying LuckySpinFHE_KMS_Final contract...");

  const LuckySpinFHE_KMS_Final = await ethers.getContractFactory("LuckySpinFHE_KMS_Final");
  const luckySpinFHE = await LuckySpinFHE_KMS_Final.deploy();
  await luckySpinFHE.waitForDeployment();

  const address = await luckySpinFHE.getAddress();
  console.log("✅ LuckySpinFHE_KMS_Final deployed to:", address);

  // Save deployment info
  const deploymentInfo = {
    contractName: "LuckySpinFHE_KMS_Final",
    address: address,
    network: "sepolia",
    deployedAt: new Date().toISOString(),
    features: [
      "FHE.makePubliclyDecryptable support",
      "Fixed permissions for encryptedPublicScore"
    ]
  };

  console.log("📋 Deployment info:", JSON.stringify(deploymentInfo, null, 2));
  
  return address;
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Deployment failed:", error);
    process.exit(1);
  });
