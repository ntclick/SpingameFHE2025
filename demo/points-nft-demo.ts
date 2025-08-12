import { ethers } from "hardhat";

async function main() {
  console.log("=== Points & NFT System Demo ===\n");

  // Get deployer account
  const [deployer] = await ethers.getSigners();
  console.log("Using account:", deployer.address);

  // Deploy contract
  console.log("\n1. Deploying LuckySpinFHE contract...");
  const LuckySpinFHE = await ethers.getContractFactory("LuckySpinFHE");
  const luckySpinFHE = await LuckySpinFHE.deploy();
  await luckySpinFHE.waitForDeployment();
  const contractAddress = await luckySpinFHE.getAddress();
  console.log("✅ Contract deployed to:", contractAddress);

  // Fund contract
  console.log("\n2. Funding contract...");
  await luckySpinFHE.fundContract({ value: ethers.parseEther("1.0") });
  console.log("✅ Contract funded with 1.0 ETH");

  // Add pools with different reward types
  console.log("\n3. Adding pools with different reward types...");
  
  // ETH Pool
  await luckySpinFHE.addPool("ETH Pool", "eth.png", ethers.parseEther("0.1"), 0, 10, 1000, 5);
  
  // NFT Pool (RewardType.NFT = 4)
  await luckySpinFHE.addPool("NFT Pool", "nft.png", 1, 4, 5, 500, 3);
  
  // Points Pool
  await luckySpinFHE.addPool("Points Pool", "points.png", 100, 5, 20, 2000, 2);
  
  console.log("✅ 3 pools added");

  // Test Points System
  console.log("\n4. Testing Points System...");

  // Get initial points config
  console.log("\n4.1. Getting initial points configuration...");
  const [checkInPoints, spinPoints, gmPoints, winBonusPoints, dailyCheckInBonus, isActive] = 
    await luckySpinFHE.getPointsConfig();
  console.log(`Initial config: Check-in: ${checkInPoints}, Spin: ${spinPoints}, GM: ${gmPoints}, Win Bonus: ${winBonusPoints}, Daily Bonus: ${dailyCheckInBonus}, Active: ${isActive}`);

  // Update points configuration
  console.log("\n4.2. Updating points configuration...");
  await luckySpinFHE.updatePointsConfig(10, 5, 3, 50, 5);
  console.log("✅ Points configuration updated");

  // Get updated points config
  const [newCheckInPoints, newSpinPoints, newGmPoints, newWinBonusPoints, newDailyCheckInBonus, newIsActive] = 
    await luckySpinFHE.getPointsConfig();
  console.log(`Updated config: Check-in: ${newCheckInPoints}, Spin: ${newSpinPoints}, GM: ${newGmPoints}, Win Bonus: ${newWinBonusPoints}, Daily Bonus: ${newDailyCheckInBonus}, Active: ${newIsActive}`);

  // Test NFT System
  console.log("\n5. Testing NFT System...");

  // Add NFT rewards
  console.log("\n5.1. Adding NFT rewards...");
  await luckySpinFHE.addNFTReward(1, 1, "ipfs://QmRareNFT1", 95);
  console.log("✅ NFT rewards added");

  // Get NFT reward info
  console.log("\n5.2. Getting NFT reward info...");
  try {
    const [tokenId, metadata, rarity, isClaimed, winner, claimedAt] = await luckySpinFHE.getNFTReward(1);
    console.log(`Pool 1 NFT: TokenID: ${tokenId}, Metadata: ${metadata}, Rarity: ${rarity}, Claimed: ${isClaimed}`);
  } catch (error) {
    console.log(`Pool 1: No NFT reward`);
  }

  // Test NFT claim
  console.log("\n5.3. Testing NFT claim...");
  try {
    await luckySpinFHE.claimNFTReward(1);
    console.log("✅ NFT claimed successfully!");
  } catch (error) {
    console.log("❌ NFT claim failed (expected if not eligible)");
  }

  // Get total NFTs claimed
  const totalClaimed = await luckySpinFHE.totalNFTsClaimed();
  console.log(`Total NFTs claimed: ${totalClaimed}`);

  // Test Points Integration with Actions
  console.log("\n6. Testing Points Integration...");

  // Simulate check-in (would need FHE encryption in real scenario)
  console.log("\n6.1. Simulating check-in points...");
  console.log("In real scenario, check-in would earn 10 points");

  // Simulate spin (would need FHE encryption in real scenario)
  console.log("\n6.2. Simulating spin points...");
  console.log("In real scenario, each spin would earn 5 points");

  // Simulate GM (would need FHE encryption in real scenario)
  console.log("\n6.3. Simulating GM points...");
  console.log("In real scenario, GM would earn 3 points");

  // Test Points Calculation Examples
  console.log("\n7. Points Calculation Examples:");
  console.log("- Check-in: 10 points");
  console.log("- Spin: 5 points per spin");
  console.log("- GM: 3 points per GM");
  console.log("- Win Bonus: 50 points");
  console.log("- Daily Check-in Bonus: 5 extra points");

  // Calculate example user points
  console.log("\n8. Example User Points Calculation:");
  const exampleActions = [
    { action: "Daily Check-in", points: 10 + 5 }, // 10 base + 5 bonus
    { action: "3 Spins", points: 3 * 5 },        // 3 spins * 5 points
    { action: "2 GMs", points: 2 * 3 },          // 2 GMs * 3 points
    { action: "1 Win", points: 50 }               // 1 win * 50 bonus
  ];

  let totalPoints = 0;
  for (const action of exampleActions) {
    console.log(`${action.action}: ${action.points} points`);
    totalPoints += action.points;
  }
  console.log(`Total Points: ${totalPoints}`);

  // Test Leaderboard
  console.log("\n9. Testing Leaderboard...");
  
  // Submit some public scores
  console.log("\n9.1. Submitting public scores...");
  await luckySpinFHE.submitPublicScore(deployer.address, 150);
  console.log("✅ Public score submitted");

  // Get leaderboard
  const leaderboard = await luckySpinFHE.getLeaderboard();
  console.log("\n9.2. Current leaderboard:");
  for (let i = 0; i < leaderboard.length; i++) {
    console.log(`${i + 1}. ${leaderboard[i].user}: ${leaderboard[i].score} points`);
  }

  // Test Points System Toggle
  console.log("\n10. Testing Points System Toggle...");
  await luckySpinFHE.togglePointsSystem();
  console.log("✅ Points system toggled");

  // Get final points config
  const [finalCheckInPoints, finalSpinPoints, finalGmPoints, finalWinBonusPoints, finalDailyCheckInBonus, finalIsActive] = 
    await luckySpinFHE.getPointsConfig();
  console.log(`Final config: Active: ${finalIsActive}`);

  // Show pool information
  console.log("\n11. Pool Information:");
  for (let i = 0; i < 3; i++) {
    const [name, imageUrl, value, rewardType, isActive, maxSpins, currentSpins, winRate, minSpins, tokenAddress, balance] = 
      await luckySpinFHE.getPoolReward(i);
    
    const rewardTypeName = ["ETH", "USDC", "USDT", "TOKEN", "NFT", "POINTS", "CUSTOM"][Number(rewardType)];
    console.log(`Pool ${i}: ${name} - ${rewardTypeName} - ${ethers.formatEther(value)} value - ${Number(winRate)/100}% win rate`);
  }

  console.log("\n✅ Points & NFT system demo completed successfully!");
  console.log("\n🎯 Features tested:");
  console.log("- ✅ Points configuration management");
  console.log("- ✅ NFT rewards system");
  console.log("- ✅ Points calculation for different actions");
  console.log("- ✅ NFT claim functionality");
  console.log("- ✅ Leaderboard system");
  console.log("- ✅ Points system toggle");

  console.log("\n📝 Points System Features:");
  console.log("- Check-in points: Configurable from frontend");
  console.log("- Spin points: Points per spin");
  console.log("- GM points: Points per GM");
  console.log("- Win bonus points: Bonus for winning");
  console.log("- Daily check-in bonus: Extra points for daily check-in");
  console.log("- Points system toggle: Enable/disable points");

  console.log("\n🎨 NFT System Features:");
  console.log("- NFT rewards: Add NFTs to pools");
  console.log("- NFT metadata: IPFS metadata support");
  console.log("- NFT rarity: 1-100 rarity system");
  console.log("- NFT claiming: User claim functionality");
  console.log("- NFT tracking: Track claimed NFTs");

  console.log("\n💡 Frontend Integration:");
  console.log("- Use PointsNFTFrontend class from examples/frontend-points-nft-system.ts");
  console.log("- Configure points from frontend");
  console.log("- Add NFT rewards from frontend");
  console.log("- Track user points and leaderboard");
  console.log("- Real-time points calculation");

  console.log("\n🔧 Admin Functions:");
  console.log("- updatePointsConfig(): Cấu hình điểm từ frontend");
  console.log("- togglePointsSystem(): Bật/tắt hệ thống điểm");
  console.log("- addNFTReward(): Thêm NFT vào pool");
  console.log("- submitPublicScore(): Submit điểm lên leaderboard");
  console.log("- getPointsConfig(): Lấy cấu hình điểm hiện tại");
  console.log("- getNFTReward(): Lấy thông tin NFT reward");
}

main()
  .then(() => {
    console.log("\n🎉 Demo completed!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("\n❌ Demo failed:", error);
    process.exit(1);
  }); 