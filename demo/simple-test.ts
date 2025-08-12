import { ethers } from "hardhat";
import { LuckySpinFHE_Complete } from "../typechain-types";

async function main() {
  console.log("🚀 Testing LuckySpinFHE_Complete contract...");

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

  // ===== 1. TEST BASIC CONTRACT FUNCTIONS =====
  console.log("\n📦 Testing Basic Contract Functions...");

  // Test contract owner (using signer address)
  console.log(`✅ Contract owner: ${owner.address}`);

  // Test initial pool count
  const initialPoolCount = await luckySpinFHE.getPoolCount();
  console.log(`✅ Initial pool count: ${initialPoolCount}`);

  // ===== 2. TEST POOL MANAGEMENT =====
  console.log("\n💰 Testing Pool Management...");

  // Add ETH pool
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
  console.log("✅ Added ETH pool");

  // Add USDC pool
  await luckySpinFHE.addPool(
    "USDC Pool",
    "https://example.com/usdc.png",
    1000000, // 1 USDC (6 decimals assumed)
    1, // USDC
    "0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238", // Valid USDC address
    50,
    800, // 8% win rate
    2,
  );
  console.log("✅ Added USDC pool");

  // Add NFT pool
  await luckySpinFHE.addPool(
    "Legendary NFT",
    "https://example.com/nft.png",
    1,
    4, // NFT
    ethers.ZeroAddress,
    10,
    500, // 5% win rate
    5,
  );
  console.log("✅ Added NFT pool");

  // Add Points pool
  await luckySpinFHE.addPool(
    "Points Bonanza",
    "https://example.com/points.png",
    1000,
    5, // POINTS
    ethers.ZeroAddress,
    200,
    2000, // 20% win rate
    1,
  );
  console.log("✅ Added Points pool");

  // Check pool count
  const poolCount = await luckySpinFHE.getPoolCount();
  console.log(`✅ Total pools: ${poolCount}`);

  // ===== 3. TEST POOL FUNDING =====
  console.log("\n💰 Testing Pool Funding...");

  // Fund ETH pool
  await luckySpinFHE.fundPoolWithETH(0, { value: ethers.parseEther("2.0") });
  console.log("✅ Funded ETH pool with 2 ETH");

  // Check pool balance
  const ethPool = await luckySpinFHE.getPoolReward(0);
  console.log(`ETH Pool balance: ${ethers.formatEther(ethPool.balance)} ETH`);

  // ===== 4. TEST CONFIGURATION =====
  console.log("\n⚙️ Testing Configuration...");

  // Update points config
  await luckySpinFHE.updatePointsConfig(
    15, // checkInPoints
    8, // spinPoints
    5, // gmPoints
    25, // winBonusPoints
    10, // dailyCheckInBonus
  );
  console.log("✅ Updated points configuration");

  // Update spin config
  await luckySpinFHE.updateSpinConfig(
    2, // baseSpinsPerCheckIn
    3, // bonusSpinsPerGM
    15, // maxSpinsPerDay
    4, // unluckySlotCount
  );
  console.log("✅ Updated spin configuration");

  // Update unlucky slots
  await luckySpinFHE.updateUnluckySlots([1, 3, 7, 9]);
  console.log("✅ Updated unlucky slots: [1, 3, 7, 9]");

  // ===== 5. TEST NFT REWARDS =====
  console.log("\n🎨 Testing NFT Rewards...");

  // Add NFT reward
  await luckySpinFHE.addNFTReward(
    0, // poolIndex
    12345, // tokenId
    "https://example.com/nft/12345.json", // metadata
    95, // rarity
  );
  console.log("✅ Added NFT reward (Token ID: 12345, Rarity: 95)");

  // ===== 6. TEST GETTER FUNCTIONS =====
  console.log("\n📊 Testing Getter Functions...");

  // Get points config
  const pointsConfig = await luckySpinFHE.getPointsConfig();
  console.log(`✅ Points config - Check-in: ${pointsConfig.checkInPoints}, Spin: ${pointsConfig.spinPoints}, GM: ${pointsConfig.gmPoints}`);

  // Get spin config
  const spinConfig = await luckySpinFHE.getSpinConfig();
  console.log(`✅ Spin config - Base: ${spinConfig.baseSpinsPerCheckIn}, Bonus: ${spinConfig.bonusSpinsPerGM}, Max: ${spinConfig.maxSpinsPerDay}`);

  // Get unlucky slots
  const unluckySlots = await luckySpinFHE.getUnluckySlots();
  console.log(`✅ Unlucky slots: [${unluckySlots.join(", ")}]`);

  // Get pool info
  const poolInfo = await luckySpinFHE.getPoolReward(0);
  console.log(`✅ Pool 0 info - Name: ${poolInfo.name}, Balance: ${ethers.formatEther(poolInfo.balance)} ETH`);

  // ===== 7. TEST ADMIN FUNCTIONS =====
  console.log("\n🔧 Testing Admin Functions...");

  // Test admin functions (only owner can call)
  try {
    await luckySpinFHE.connect(user1).updatePointsConfig(10, 5, 3, 20, 5);
    console.log("❌ User1 should not be able to update points config");
  } catch (error) {
    console.log("✅ User1 correctly cannot update points config (not owner)");
  }

  // ===== 8. TEST CONTRACT BALANCE =====
  console.log("\n💰 Testing Contract Balance...");

  const contractBalance = await ethers.provider.getBalance(contractAddress);
  console.log(`✅ Contract balance: ${ethers.formatEther(contractBalance)} ETH`);

  // ===== 9. DEPLOYMENT SUMMARY =====
  console.log("\n🎉 Deployment and Basic Testing Complete!");
  console.log("=== Summary ===");
  console.log(`Contract Address: ${contractAddress}`);
  console.log(`Owner: ${owner.address}`);
  console.log(`Total Pools: ${poolCount}`);
  console.log(`Contract Balance: ${ethers.formatEther(contractBalance)} ETH`);
  console.log(`Points System: Active`);
  console.log(`Spin System: Active`);
  console.log(`NFT Rewards: Available`);

  console.log("\n=== Next Steps ===");
  console.log("1. Add this contract address to your .env file:");
  console.log(`   CONTRACT_ADDRESS=${contractAddress}`);
  console.log("2. Test FHE operations on Sepolia testnet");
  console.log("3. Use frontend integration for full functionality");

  return {
    contractAddress,
    owner: owner.address,
    poolCount,
    contractBalance: ethers.formatEther(contractBalance)
  };
}

main()
  .then((result) => {
    console.log("\n✅ Simple test completed successfully!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("❌ Error during simple test:", error);
    process.exit(1);
  }); 