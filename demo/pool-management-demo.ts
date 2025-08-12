import { ethers } from "hardhat";

async function main() {
  console.log("=== Pool Management Demo ===\n");

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

  // Add initial pools
  console.log("\n3. Adding initial pools...");
  await luckySpinFHE.addPool("Diamond", "diamond.png", ethers.parseEther("0.5"), 0, 1, 100, 10);
  await luckySpinFHE.addPool("Gold", "gold.png", ethers.parseEther("0.1"), 0, 10, 500, 5);
  await luckySpinFHE.addPool("Silver", "silver.png", ethers.parseEther("0.05"), 0, 20, 1000, 3);
  console.log("✅ 3 pools added");

  // Show initial pools
  console.log("\n4. Initial pools:");
  for (let i = 0; i < 3; i++) {
    const [name, imageUrl, value, rewardType, isActive, maxSpins, currentSpins, winRate, minSpins] = 
      await luckySpinFHE.getPoolReward(i);
    console.log(`Pool ${i}: ${name} - ${ethers.formatEther(value)} ETH - ${Number(winRate)/100}% win rate - ${minSpins} min spins`);
  }

  // Test pool management functions
  console.log("\n5. Testing pool management functions...");

  // Update win rates
  console.log("\n5.1. Updating win rates...");
  await luckySpinFHE.updatePoolWinRate(0, 200); // Diamond: 2%
  await luckySpinFHE.updatePoolWinRate(1, 750); // Gold: 7.5%
  await luckySpinFHE.updatePoolWinRate(2, 1500); // Silver: 15%
  console.log("✅ Win rates updated");

  // Update minimum spins
  console.log("\n5.2. Updating minimum spins...");
  await luckySpinFHE.updatePoolMinSpins(0, 15); // Diamond: 15 min spins
  await luckySpinFHE.updatePoolMinSpins(1, 8);  // Gold: 8 min spins
  await luckySpinFHE.updatePoolMinSpins(2, 5);  // Silver: 5 min spins
  console.log("✅ Minimum spins updated");

  // Update reward values
  console.log("\n5.3. Updating reward values...");
  await luckySpinFHE.updatePoolRewardValue(0, ethers.parseEther("0.75")); // Diamond: 0.75 ETH
  await luckySpinFHE.updatePoolRewardValue(1, ethers.parseEther("0.15")); // Gold: 0.15 ETH
  await luckySpinFHE.updatePoolRewardValue(2, ethers.parseEther("0.08")); // Silver: 0.08 ETH
  console.log("✅ Reward values updated");

  // Show updated pools
  console.log("\n6. Updated pools:");
  for (let i = 0; i < 3; i++) {
    const [name, imageUrl, value, rewardType, isActive, maxSpins, currentSpins, winRate, minSpins] = 
      await luckySpinFHE.getPoolReward(i);
    console.log(`Pool ${i}: ${name} - ${ethers.formatEther(value)} ETH - ${Number(winRate)/100}% win rate - ${minSpins} min spins`);
  }

  // Test win rate calculations
  console.log("\n7. Testing win rate calculations:");
  const testSpins = [5, 10, 15, 20];
  
  for (let poolIndex = 0; poolIndex < 3; poolIndex++) {
    console.log(`\nPool ${poolIndex}:`);
    for (const spins of testSpins) {
      const winProbability = await luckySpinFHE.calculateWinRate(poolIndex, spins);
      console.log(`  ${spins} spins: ${Number(winProbability)/100}% win probability`);
    }
  }

  // Test batch update
  console.log("\n8. Testing batch update...");
  
  // Create batch update data
  const batchUpdates = [
    {
      poolIndex: 0,
      newWinRate: 300, // 3%
      newMinSpins: 20,
      newValue: ethers.parseEther("1.0"),
      newActive: true
    },
    {
      poolIndex: 1,
      newWinRate: 1000, // 10%
      newMinSpins: 10,
      newValue: ethers.parseEther("0.2"),
      newActive: true
    },
    {
      poolIndex: 2,
      newWinRate: 2000, // 20%
      newMinSpins: 6,
      newValue: ethers.parseEther("0.1"),
      newActive: true
    }
  ];

  await luckySpinFHE.batchUpdatePools(batchUpdates);
  console.log("✅ Batch update completed");

  // Show final pools
  console.log("\n9. Final pools after batch update:");
  for (let i = 0; i < 3; i++) {
    const [name, imageUrl, value, rewardType, isActive, maxSpins, currentSpins, winRate, minSpins] = 
      await luckySpinFHE.getPoolReward(i);
    console.log(`Pool ${i}: ${name} - ${ethers.formatEther(value)} ETH - ${Number(winRate)/100}% win rate - ${minSpins} min spins`);
  }

  // Test toggle pool active
  console.log("\n10. Testing pool active toggle...");
  await luckySpinFHE.togglePoolActive(1); // Toggle Gold pool
  console.log("✅ Pool 1 active status toggled");

  // Show pool status
  for (let i = 0; i < 3; i++) {
    const [name, imageUrl, value, rewardType, isActive, maxSpins, currentSpins, winRate, minSpins] = 
      await luckySpinFHE.getPoolReward(i);
    console.log(`Pool ${i}: ${name} - Active: ${isActive}`);
  }

  // Get contract balance
  console.log("\n11. Contract balance:");
  const balance = await ethers.provider.getBalance(contractAddress);
  console.log(`Balance: ${ethers.formatEther(balance)} ETH`);

  console.log("\n✅ Pool management demo completed successfully!");
  console.log("\n🎯 Features tested:");
  console.log("- ✅ Update win rates");
  console.log("- ✅ Update minimum spins");
  console.log("- ✅ Update reward values");
  console.log("- ✅ Batch update pools");
  console.log("- ✅ Toggle pool active status");
  console.log("- ✅ Calculate win probabilities");
  console.log("- ✅ Fund contract");
  console.log("- ✅ Get contract balance");

  console.log("\n📝 Frontend Integration:");
  console.log("- Use PoolManagementFrontend class from examples/frontend-pool-management.ts");
  console.log("- Admin can update pools from frontend");
  console.log("- Real-time win rate calculations");
  console.log("- Dynamic pool management");
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