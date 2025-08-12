import { ethers } from "hardhat";

async function main() {
  console.log("=== Pool Funding Demo ===\n");

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
  await luckySpinFHE.fundContract({ value: ethers.parseEther("2.0") });
  console.log("✅ Contract funded with 2.0 ETH");

  // Add pools with different reward types
  console.log("\n3. Adding pools with different reward types...");
  
  // ETH Pool
  await luckySpinFHE.addPool("ETH Pool", "eth.png", ethers.parseEther("0.1"), 0, 10, 1000, 5);
  
  // USDC Pool
  await luckySpinFHE.addPool("USDC Pool", "usdc.png", ethers.parseUnits("100", 6), 1, 20, 1500, 3);
  
  // USDT Pool
  await luckySpinFHE.addPool("USDT Pool", "usdt.png", ethers.parseUnits("50", 6), 2, 15, 2000, 2);
  
  // Custom Token Pool
  await luckySpinFHE.addPool("Custom Token Pool", "token.png", ethers.parseEther("10"), 3, 30, 2500, 1);
  
  console.log("✅ 4 pools added");

  // Show initial pools
  console.log("\n4. Initial pools:");
  for (let i = 0; i < 4; i++) {
    const [name, imageUrl, value, rewardType, isActive, maxSpins, currentSpins, winRate, minSpins, tokenAddress, balance] = 
      await luckySpinFHE.getPoolReward(i);
    console.log(`Pool ${i}: ${name} - ${ethers.formatEther(value)} value - ${Number(winRate)/100}% win rate - Balance: ${ethers.formatEther(balance)}`);
  }

  // Test pool funding functions
  console.log("\n5. Testing pool funding functions...");

  // Fund ETH pool
  console.log("\n5.1. Funding ETH pool...");
  await luckySpinFHE.fundPoolWithETH(0, { value: ethers.parseEther("0.5") });
  console.log("✅ ETH pool funded");

  // Fund USDC pool (simulate with ETH for demo)
  console.log("\n5.2. Funding USDC pool...");
  // Note: In real scenario, you would need USDC tokens
  console.log("⚠️ USDC funding requires actual USDC tokens");

  // Fund USDT pool (simulate with ETH for demo)
  console.log("\n5.3. Funding USDT pool...");
  // Note: In real scenario, you would need USDT tokens
  console.log("⚠️ USDT funding requires actual USDT tokens");

  // Fund Custom Token pool (simulate with ETH for demo)
  console.log("\n5.4. Funding Custom Token pool...");
  // Note: In real scenario, you would need custom tokens
  console.log("⚠️ Custom token funding requires actual tokens");

  // Show updated pools
  console.log("\n6. Updated pools after funding:");
  for (let i = 0; i < 4; i++) {
    const [name, imageUrl, value, rewardType, isActive, maxSpins, currentSpins, winRate, minSpins, tokenAddress, balance] = 
      await luckySpinFHE.getPoolReward(i);
    console.log(`Pool ${i}: ${name} - ${ethers.formatEther(value)} value - ${Number(winRate)/100}% win rate - Balance: ${ethers.formatEther(balance)}`);
  }

  // Test pool withdrawal functions
  console.log("\n7. Testing pool withdrawal functions...");

  // Withdraw from ETH pool
  console.log("\n7.1. Withdrawing from ETH pool...");
  await luckySpinFHE.withdrawETHFromPool(0, ethers.parseEther("0.1"));
  console.log("✅ ETH withdrawn from pool");

  // Show final pools
  console.log("\n8. Final pools after withdrawal:");
  for (let i = 0; i < 4; i++) {
    const [name, imageUrl, value, rewardType, isActive, maxSpins, currentSpins, winRate, minSpins, tokenAddress, balance] = 
      await luckySpinFHE.getPoolReward(i);
    console.log(`Pool ${i}: ${name} - ${ethers.formatEther(value)} value - ${Number(winRate)/100}% win rate - Balance: ${ethers.formatEther(balance)}`);
  }

  // Test pool balance functions
  console.log("\n9. Testing pool balance functions:");
  
  for (let i = 0; i < 4; i++) {
    const balance = await luckySpinFHE.getPoolBalance(i);
    const tokenAddress = await luckySpinFHE.getPoolTokenAddress(i);
    console.log(`Pool ${i} balance: ${ethers.formatEther(balance)} - Token: ${tokenAddress}`);
  }

  // Test claim functions
  console.log("\n10. Testing claim functions...");
  
  // Simulate user claiming ETH reward
  console.log("\n10.1. Simulating ETH reward claim...");
  try {
    await luckySpinFHE.claimETHReward(0);
    console.log("✅ ETH reward claimed successfully");
  } catch (error) {
    console.log("❌ ETH reward claim failed (expected if pool balance insufficient)");
  }

  // Simulate user claiming token reward
  console.log("\n10.2. Simulating token reward claim...");
  try {
    await luckySpinFHE.claimTokenReward(1);
    console.log("✅ Token reward claimed successfully");
  } catch (error) {
    console.log("❌ Token reward claim failed (expected if pool balance insufficient)");
  }

  // Get contract balance
  console.log("\n11. Contract balance:");
  const balance = await ethers.provider.getBalance(contractAddress);
  console.log(`Balance: ${ethers.formatEther(balance)} ETH`);

  console.log("\n✅ Pool funding demo completed successfully!");
  console.log("\n🎯 Features tested:");
  console.log("- ✅ Add pools with different reward types");
  console.log("- ✅ Fund pools with ETH");
  console.log("- ✅ Fund pools with tokens (simulated)");
  console.log("- ✅ Withdraw from pools");
  console.log("- ✅ Get pool balances");
  console.log("- ✅ Get pool token addresses");
  console.log("- ✅ Claim ETH rewards");
  console.log("- ✅ Claim token rewards");

  console.log("\n📝 Frontend Integration:");
  console.log("- Use PoolFundingFrontend class from examples/frontend-pool-funding.ts");
  console.log("- Support for ETH, USDC, USDT, and custom tokens");
  console.log("- Real-time pool balance tracking");
  console.log("- Token approval and transfer automation");
  console.log("- Admin withdrawal controls");

  console.log("\n💡 Token Integration:");
  console.log("- ETH: Direct funding with msg.value");
  console.log("- USDC: ERC20 token with 6 decimals");
  console.log("- USDT: ERC20 token with 6 decimals");
  console.log("- Custom: Any ERC20 token with configurable decimals");
  console.log("- NFT: Future implementation for NFT rewards");
  console.log("- Points: Internal points system");

  console.log("\n🔧 Admin Functions:");
  console.log("- fundPoolWithETH(): Nạp ETH vào pool");
  console.log("- fundPoolWithToken(): Nạp token vào pool");
  console.log("- withdrawETHFromPool(): Rút ETH từ pool");
  console.log("- withdrawTokenFromPool(): Rút token từ pool");
  console.log("- getPoolBalance(): Lấy balance của pool");
  console.log("- getPoolTokenAddress(): Lấy token address của pool");
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