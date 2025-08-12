import { ethers } from "hardhat";

async function main() {
  console.log("=== LuckySpinFHE Simple Demo ===\n");

  // Deploy contract
  console.log("1. Deploying LuckySpinFHE contract...");
  const LuckySpinFHE = await ethers.getContractFactory("LuckySpinFHE");
  const luckySpinFHE = await LuckySpinFHE.deploy();
  await luckySpinFHE.waitForDeployment();
  const contractAddress = await luckySpinFHE.getAddress();
  console.log(`Contract deployed to: ${contractAddress}\n`);

  // Get signers
  const [owner, user1, user2, user3] = await ethers.getSigners();

  // Add pool rewards
  console.log("2. Adding pool rewards...");
  await luckySpinFHE.addPool("Gold", "gold.png", 1000);
  await luckySpinFHE.addPool("Silver", "silver.png", 500);
  await luckySpinFHE.addPool("Bronze", "bronze.png", 100);
  await luckySpinFHE.addPool("Copper", "copper.png", 50);
  console.log("Added 4 pool rewards\n");

  // Show pool rewards
  console.log("3. Pool rewards:");
  const poolCount = await luckySpinFHE.poolCount();
  for (let i = 0; i < poolCount; i++) {
    const [name, imageUrl, value] = await luckySpinFHE.getPoolReward(i);
    console.log(`  Pool ${i}: ${name} - ${imageUrl} - Value: ${value}`);
  }
  console.log();

  // Submit scores to leaderboard
  console.log("4. Submitting scores to leaderboard...");
  await luckySpinFHE.submitPublicScore(user1.address, 150);
  await luckySpinFHE.submitPublicScore(user2.address, 200);
  await luckySpinFHE.submitPublicScore(user3.address, 100);
  console.log("✓ Scores submitted\n");

  // Show leaderboard
  console.log("5. Leaderboard:");
  const leaderboard = await luckySpinFHE.getLeaderboard();
  leaderboard.forEach((entry: any, index: number) => {
    console.log(`  ${index + 1}. ${entry.user} - Score: ${entry.score}`);
  });
  console.log();

  // Show encrypted user data (these will be default encrypted values)
  console.log("6. Encrypted user data (default values):");
  const encryptedSpinCount1 = await luckySpinFHE.getEncryptedSpinCount(user1.address);
  const encryptedScore1 = await luckySpinFHE.getEncryptedScore(user1.address);
  const encryptedLastRewardIndex1 = await luckySpinFHE.getEncryptedLastRewardIndex(user1.address);
  
  console.log(`User 1 encrypted spin count: ${encryptedSpinCount1}`);
  console.log(`User 1 encrypted score: ${encryptedScore1}`);
  console.log(`User 1 encrypted last reward index: ${encryptedLastRewardIndex1}`);
  console.log();

  // Test pool management
  console.log("7. Testing pool management...");
  await luckySpinFHE.updatePool(0, "Diamond", "diamond.png", 2000);
  const [updatedName, updatedImage, updatedValue] = await luckySpinFHE.getPoolReward(0);
  console.log(`Updated Pool 0: ${updatedName} - ${updatedImage} - Value: ${updatedValue}`);
  console.log();

  console.log("=== Demo completed successfully! ===");
  console.log("\nContract features demonstrated:");
  console.log("✓ Pool management (add, update, get)");
  console.log("✓ Leaderboard submission and retrieval");
  console.log("✓ Encrypted user data storage");
  console.log("✓ Public data access");
  console.log("\nNote: FHE functions (checkIn, spinAndClaimReward, makeScorePublic)");
  console.log("require proper encrypted data from Relayer SDK in real implementation.");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  }); 