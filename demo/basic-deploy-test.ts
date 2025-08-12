import { ethers } from "hardhat";

async function main() {
  console.log("🚀 Basic Deploy Test for LuckySpinFHE_Complete...");

  // Deploy contract
  const LuckySpinFHE_CompleteFactory = await ethers.getContractFactory("LuckySpinFHE_Complete");
  const luckySpinFHE = await LuckySpinFHE_CompleteFactory.deploy();
  await luckySpinFHE.waitForDeployment();

  const contractAddress = await luckySpinFHE.getAddress();
  console.log(`✅ Contract deployed to: ${contractAddress}`);

  // Get signers
  const [owner, user1, user2, user3] = await ethers.getSigners();
  console.log(`👤 Owner: ${owner.address}`);
  console.log(`👤 User1: ${user1.address}`);
  console.log(`👤 User2: ${user2.address}`);
  console.log(`👤 User3: ${user3.address}`);

  // Test basic contract functions
  console.log("\n📦 Testing Basic Functions...");

  // Test adding a pool
  try {
    await luckySpinFHE.addPool(
      "ETH Jackpot",
      "https://example.com/eth.png",
      ethers.parseEther("0.1"),
      0, // ETH
      ethers.ZeroAddress,
      100,
      1000, // 10% win rate
      1,
    );
    console.log("✅ Successfully added ETH pool");
  } catch (error) {
    console.log("❌ Failed to add ETH pool:", error);
  }

  // Test funding pool
  try {
    await luckySpinFHE.fundPoolWithETH(0, { value: ethers.parseEther("1.0") });
    console.log("✅ Successfully funded ETH pool");
  } catch (error) {
    console.log("❌ Failed to fund ETH pool:", error);
  }

  // Test configuration
  try {
    await luckySpinFHE.updatePointsConfig(10, 5, 3, 20, 5);
    console.log("✅ Successfully updated points config");
  } catch (error) {
    console.log("❌ Failed to update points config:", error);
  }

  // Test contract balance
  const contractBalance = await ethers.provider.getBalance(contractAddress);
  console.log(`✅ Contract balance: ${ethers.formatEther(contractBalance)} ETH`);

  // Summary
  console.log("\n🎉 Basic Deploy Test Complete!");
  console.log("=== Summary ===");
  console.log(`Contract Address: ${contractAddress}`);
  console.log(`Owner: ${owner.address}`);
  console.log(`Contract Balance: ${ethers.formatEther(contractBalance)} ETH`);

  console.log("\n=== Add to your .env file ===");
  console.log(`CONTRACT_ADDRESS=${contractAddress}`);

  return {
    contractAddress,
    owner: owner.address,
    contractBalance: ethers.formatEther(contractBalance)
  };
}

main()
  .then((result) => {
    console.log("\n✅ Basic deploy test completed successfully!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("❌ Error during basic deploy test:", error);
    process.exit(1);
  }); 