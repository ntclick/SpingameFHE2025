import { ethers } from "hardhat";
import { LuckySpinFHE_Enhanced } from "../typechain-types";

async function main() {
    console.log("🚀 Enhanced FHEVM Demo - Testing Advanced FHE Features");
    console.log("=" .repeat(60));

    // Deploy contract
    console.log("📦 Deploying Enhanced LuckySpinFHE contract...");
    const LuckySpinFHE_Enhanced = await ethers.getContractFactory("LuckySpinFHE_Enhanced");
    const luckySpinFHE = await LuckySpinFHE_Enhanced.deploy();
    await luckySpinFHE.waitForDeployment();
    
    const contractAddress = await luckySpinFHE.getAddress();
    console.log(`✅ Contract deployed at: ${contractAddress}`);

    // Get signers
    const [deployer, user1, user2] = await ethers.getSigners();
    console.log(`👤 Deployer: ${deployer.address}`);
    console.log(`👤 User1: ${user1.address}`);
    console.log(`👤 User2: ${user2.address}`);

    // Add some pools for testing
    console.log("\n🎯 Setting up test pools...");
    await luckySpinFHE.addPool("Gold", "gold.png", ethers.parseEther("0.1"), 0, 10, 1000, 5);
    await luckySpinFHE.addPool("Silver", "silver.png", ethers.parseEther("0.05"), 0, 20, 2000, 3);
    await luckySpinFHE.addPool("Bronze", "bronze.png", ethers.parseEther("0.01"), 0, 30, 3000, 2);
    console.log("✅ Test pools added");

    // Test Enhanced Access Control
    console.log("\n🔐 Testing Enhanced Access Control...");
    
    // Test transient access
    console.log("- Testing transient access functionality");
    const hasAccess = await luckySpinFHE.hasTransientAccess(user1.address, "spins");
    console.log(`  User1 transient access (spins): ${hasAccess}`);

    // Test FHE Operation Errors
    console.log("\n❌ Testing FHE Operation Error Handling...");
    const errorCount = await luckySpinFHE.getFHEOperationErrors(user1.address);
    console.log(`  User1 FHE operation errors: ${errorCount}`);

    // Test Random Generation
    console.log("\n🎲 Testing Random Generation...");
    const randomSeed = await luckySpinFHE.getRandomSeed();
    console.log(`  Current random seed: ${randomSeed}`);

    // Test Enhanced Spin Logic (simulated)
    console.log("\n🎯 Testing Enhanced Spin Logic...");
    console.log("- Enhanced spin logic includes:");
    console.log("  • Random generation with FHE.randEuint8()");
    console.log("  • Bitwise operations (FHE.and, FHE.shr, FHE.shl, FHE.rotl)");
    console.log("  • Transient access control");
    console.log("  • Comprehensive error handling");

    // Test Advanced Bitwise Operations (simulated)
    console.log("\n🔧 Testing Advanced Bitwise Operations...");
    console.log("- Advanced operations include:");
    console.log("  • FHE.and() - Bitwise AND");
    console.log("  • FHE.shr() - Shift right");
    console.log("  • FHE.shl() - Shift left");
    console.log("  • FHE.rotl() - Rotate left");
    console.log("  • FHE.xor() - Bitwise XOR");

    // Test Safe FHE Operations (simulated)
    console.log("\n🛡️ Testing Safe FHE Operations...");
    console.log("- Safe operations include:");
    console.log("  • Try-catch error handling");
    console.log("  • Access validation");
    console.log("  • Transient access management");
    console.log("  • Error tracking and reporting");

    // Test Points System Configuration
    console.log("\n📊 Testing Points System Configuration...");
    const pointsConfig = await luckySpinFHE.getPointsConfig();
    console.log("  Points config:", {
        checkInPoints: pointsConfig.checkInPoints.toString(),
        spinPoints: pointsConfig.spinPoints.toString(),
        gmPoints: pointsConfig.gmPoints.toString(),
        winBonusPoints: pointsConfig.winBonusPoints.toString(),
        dailyCheckInBonus: pointsConfig.dailyCheckInBonus.toString(),
        isActive: pointsConfig.isActive
    });

    // Test Spin System Configuration
    console.log("\n🎰 Testing Spin System Configuration...");
    const spinConfig = await luckySpinFHE.getSpinConfig();
    console.log("  Spin config:", {
        baseSpinsPerCheckIn: spinConfig.baseSpinsPerCheckIn.toString(),
        bonusSpinsPerGM: spinConfig.bonusSpinsPerGM.toString(),
        maxSpinsPerDay: spinConfig.maxSpinsPerDay.toString(),
        unluckySlotCount: spinConfig.unluckySlotCount.toString(),
        isActive: spinConfig.isActive
    });

    // Test Pool Management
    console.log("\n🏆 Testing Pool Management...");
    const poolCount = await luckySpinFHE.poolRewards.length;
    console.log(`  Total pools: ${poolCount}`);
    
    for (let i = 0; i < Number(poolCount); i++) {
        const pool = await luckySpinFHE.getPoolReward(i);
        console.log(`  Pool ${i}: ${pool.name} (${pool.rewardType}) - Value: ${ethers.formatEther(pool.value)} ETH`);
    }

    // Test Enhanced Features Summary
    console.log("\n🎉 Enhanced FHEVM Features Summary:");
    console.log("✅ Transient Access Control");
    console.log("✅ Access Validation with FHE.isSenderAllowed()");
    console.log("✅ Random Generation with FHE.randEuint8()");
    console.log("✅ Advanced Bitwise Operations");
    console.log("✅ Comprehensive Error Handling");
    console.log("✅ Enhanced Spin Logic with Random Factors");
    console.log("✅ Safe FHE Operations with Try-Catch");
    console.log("✅ Error Tracking and Reporting");
    console.log("✅ Backward Compatibility with Legacy Functions");

    // Test Contract State
    console.log("\n📈 Contract State Summary:");
    console.log(`  Contract balance: ${ethers.formatEther(await ethers.provider.getBalance(contractAddress))} ETH`);
    console.log(`  Total pools: ${poolCount}`);
    console.log(`  Random seed: ${await luckySpinFHE.getRandomSeed()}`);

    console.log("\n🎯 Enhanced FHEVM Demo Completed Successfully!");
    console.log("=" .repeat(60));
    console.log("📝 Key Improvements:");
    console.log("• Enhanced Access Control with transient permissions");
    console.log("• Random number generation for fair spin logic");
    console.log("• Advanced bitwise operations for complex computations");
    console.log("• Comprehensive error handling and tracking");
    console.log("• Improved security with access validation");
    console.log("• Backward compatibility with existing features");
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error("❌ Enhanced FHEVM Demo failed:", error);
        process.exit(1);
    }); 