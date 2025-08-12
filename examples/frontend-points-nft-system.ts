import { ethers } from "ethers";
import { ZAMA_CONFIG } from "../config/zama-config";

// Interface cho Points System
interface PointsConfig {
  checkInPoints: number;
  spinPoints: number;
  gmPoints: number;
  winBonusPoints: number;
  dailyCheckInBonus: number;
  isActive: boolean;
}

interface NFTRewardInfo {
  tokenId: number;
  metadata: string;
  rarity: number;
  isClaimed: boolean;
  winner: string;
  claimedAt: number;
}

// Frontend class để quản lý Points và NFT system
export class PointsNFTFrontend {
  private provider: ethers.Provider;
  private signer: ethers.Signer;
  private contract: ethers.Contract;
  private relayerUrl: string;

  constructor(
    contractAddress: string,
    privateKey: string,
    rpcUrl: string = ZAMA_CONFIG.SEPOLIA_RPC_URL,
    relayerUrl: string = ZAMA_CONFIG.RELAYER_URL
  ) {
    this.provider = new ethers.JsonRpcProvider(rpcUrl);
    this.signer = new ethers.Wallet(privateKey, this.provider);
    this.relayerUrl = relayerUrl;

    // Contract ABI would be imported from artifacts
    const contractABI = []; // Import from artifacts
    this.contract = new ethers.Contract(contractAddress, contractABI, this.signer);
  }

  // ===== POINTS SYSTEM FUNCTIONS =====

  /// @notice Update points configuration (admin only)
  async updatePointsConfig(config: PointsConfig): Promise<void> {
    try {
      console.log("Updating points configuration...");
      
      const tx = await this.contract.updatePointsConfig(
        config.checkInPoints,
        config.spinPoints,
        config.gmPoints,
        config.winBonusPoints,
        config.dailyCheckInBonus
      );
      await tx.wait();
      
      console.log("✅ Points configuration updated successfully!");
    } catch (error) {
      console.error("❌ Failed to update points configuration:", error);
      throw error;
    }
  }

  /// @notice Toggle points system active status
  async togglePointsSystem(): Promise<void> {
    try {
      console.log("Toggling points system...");
      
      const tx = await this.contract.togglePointsSystem();
      await tx.wait();
      
      console.log("✅ Points system toggled successfully!");
    } catch (error) {
      console.error("❌ Failed to toggle points system:", error);
      throw error;
    }
  }

  /// @notice Get current points configuration
  async getPointsConfig(): Promise<PointsConfig> {
    try {
      const [checkInPoints, spinPoints, gmPoints, winBonusPoints, dailyCheckInBonus, isActive] = 
        await this.contract.getPointsConfig();
      
      return {
        checkInPoints: Number(checkInPoints),
        spinPoints: Number(spinPoints),
        gmPoints: Number(gmPoints),
        winBonusPoints: Number(winBonusPoints),
        dailyCheckInBonus: Number(dailyCheckInBonus),
        isActive
      };
    } catch (error) {
      console.error("❌ Failed to get points configuration:", error);
      throw error;
    }
  }

  /// @notice Calculate user points for different actions
  calculateUserPoints(action: string, config: PointsConfig): number {
    switch (action) {
      case "CHECK_IN":
        return config.checkInPoints;
      case "SPIN":
        return config.spinPoints;
      case "GM":
        return config.gmPoints;
      case "WIN_BONUS":
        return config.winBonusPoints;
      case "DAILY_CHECK_IN":
        return config.checkInPoints + config.dailyCheckInBonus;
      default:
        return 0;
    }
  }

  // ===== NFT REWARDS FUNCTIONS =====

  /// @notice Add NFT reward to pool (admin only)
  async addNFTReward(
    poolIndex: number,
    tokenId: number,
    metadata: string,
    rarity: number
  ): Promise<void> {
    try {
      console.log(`Adding NFT reward to pool ${poolIndex}...`);
      
      const tx = await this.contract.addNFTReward(poolIndex, tokenId, metadata, rarity);
      await tx.wait();
      
      console.log("✅ NFT reward added successfully!");
    } catch (error) {
      console.error("❌ Failed to add NFT reward:", error);
      throw error;
    }
  }

  /// @notice Claim NFT reward (user function)
  async claimNFTReward(poolIndex: number): Promise<void> {
    try {
      console.log(`Claiming NFT reward from pool ${poolIndex}...`);
      
      const tx = await this.contract.claimNFTReward(poolIndex);
      await tx.wait();
      
      console.log("✅ NFT reward claimed successfully!");
    } catch (error) {
      console.error("❌ Failed to claim NFT reward:", error);
      throw error;
    }
  }

  /// @notice Get NFT reward info
  async getNFTReward(poolIndex: number): Promise<NFTRewardInfo> {
    try {
      const [tokenId, metadata, rarity, isClaimed, winner, claimedAt] = 
        await this.contract.getNFTReward(poolIndex);
      
      return {
        tokenId: Number(tokenId),
        metadata,
        rarity: Number(rarity),
        isClaimed,
        winner,
        claimedAt: Number(claimedAt)
      };
    } catch (error) {
      console.error("❌ Failed to get NFT reward:", error);
      throw error;
    }
  }

  /// @notice Get total NFTs claimed
  async getTotalNFTsClaimed(): Promise<number> {
    try {
      const total = await this.contract.totalNFTsClaimed();
      return Number(total);
    } catch (error) {
      console.error("❌ Failed to get total NFTs claimed:", error);
      throw error;
    }
  }

  // ===== POINTS CALCULATION EXAMPLES =====

  /// @notice Calculate points for user actions
  async calculateUserActionPoints(userAddress: string, action: string): Promise<number> {
    try {
      const config = await this.getPointsConfig();
      
      if (!config.isActive) {
        return 0;
      }
      
      return this.calculateUserPoints(action, config);
    } catch (error) {
      console.error("❌ Failed to calculate user action points:", error);
      throw error;
    }
  }

  /// @notice Get user score (encrypted)
  async getUserScore(userAddress: string): Promise<string> {
    try {
      const score = await this.contract.getEncryptedScore(userAddress);
      return score.toString();
    } catch (error) {
      console.error("❌ Failed to get user score:", error);
      throw error;
    }
  }

  // ===== LEADERBOARD FUNCTIONS =====

  /// @notice Get public leaderboard
  async getLeaderboard(): Promise<Array<{user: string, score: number}>> {
    try {
      const leaderboard = await this.contract.getLeaderboard();
      
      return leaderboard.map((entry: any) => ({
        user: entry.user,
        score: Number(entry.score)
      }));
    } catch (error) {
      console.error("❌ Failed to get leaderboard:", error);
      throw error;
    }
  }

  /// @notice Submit public score (admin function)
  async submitPublicScore(userAddress: string, score: number): Promise<void> {
    try {
      console.log(`Submitting public score for ${userAddress}: ${score}`);
      
      const tx = await this.contract.submitPublicScore(userAddress, score);
      await tx.wait();
      
      console.log("✅ Public score submitted successfully!");
    } catch (error) {
      console.error("❌ Failed to submit public score:", error);
      throw error;
    }
  }
}

// Example usage
export async function examplePointsNFTSystem() {
  console.log("=== Points & NFT System Frontend Example ===\n");

  // Configuration
  const contractAddress = "YOUR_DEPLOYED_CONTRACT_ADDRESS";
  const privateKey = ZAMA_CONFIG.PRIVATE_KEY;

  // Initialize frontend
  const pointsNFT = new PointsNFTFrontend(contractAddress, privateKey);

  try {
    // 1. Get current points configuration
    console.log("1. Getting current points configuration...");
    const currentConfig = await pointsNFT.getPointsConfig();
    console.log("Current points config:", currentConfig);

    // 2. Update points configuration
    console.log("\n2. Updating points configuration...");
    const newConfig: PointsConfig = {
      checkInPoints: 10,      // 10 points for check-in
      spinPoints: 5,          // 5 points for each spin
      gmPoints: 3,            // 3 points for GM
      winBonusPoints: 50,     // 50 bonus points for winning
      dailyCheckInBonus: 5,   // 5 bonus points for daily check-in
      isActive: true
    };
    await pointsNFT.updatePointsConfig(newConfig);

    // 3. Calculate points for different actions
    console.log("\n3. Calculating points for different actions...");
    const actions = ["CHECK_IN", "SPIN", "GM", "WIN_BONUS", "DAILY_CHECK_IN"];
    
    for (const action of actions) {
      const points = pointsNFT.calculateUserPoints(action, newConfig);
      console.log(`${action}: ${points} points`);
    }

    // 4. Add NFT rewards to pools
    console.log("\n4. Adding NFT rewards to pools...");
    
    // Add rare NFT to pool 0
    await pointsNFT.addNFTReward(0, 1, "ipfs://QmRareNFT1", 95);
    
    // Add common NFT to pool 1
    await pointsNFT.addNFTReward(1, 2, "ipfs://QmCommonNFT1", 30);
    
    // Add epic NFT to pool 2
    await pointsNFT.addNFTReward(2, 3, "ipfs://QmEpicNFT1", 80);

    // 5. Get NFT reward info
    console.log("\n5. Getting NFT reward info...");
    for (let i = 0; i < 3; i++) {
      try {
        const nftInfo = await pointsNFT.getNFTReward(i);
        console.log(`Pool ${i} NFT:`, nftInfo);
      } catch (error) {
        console.log(`Pool ${i}: No NFT reward`);
      }
    }

    // 6. Simulate NFT claim
    console.log("\n6. Simulating NFT claim...");
    try {
      await pointsNFT.claimNFTReward(0);
      console.log("✅ NFT claimed successfully!");
    } catch (error) {
      console.log("❌ NFT claim failed (expected if not eligible)");
    }

    // 7. Get total NFTs claimed
    console.log("\n7. Getting total NFTs claimed...");
    const totalClaimed = await pointsNFT.getTotalNFTsClaimed();
    console.log(`Total NFTs claimed: ${totalClaimed}`);

    // 8. Get leaderboard
    console.log("\n8. Getting leaderboard...");
    const leaderboard = await pointsNFT.getLeaderboard();
    console.log("Leaderboard:", leaderboard);

    // 9. Calculate user action points
    console.log("\n9. Calculating user action points...");
    const userAddress = await pointsNFT.signer.getAddress();
    
    for (const action of actions) {
      const points = await pointsNFT.calculateUserActionPoints(userAddress, action);
      console.log(`${action} points for ${userAddress}: ${points}`);
    }

    // 10. Get updated points configuration
    console.log("\n10. Getting updated points configuration...");
    const updatedConfig = await pointsNFT.getPointsConfig();
    console.log("Updated points config:", updatedConfig);

    console.log("\n✅ Points & NFT system example completed successfully!");

  } catch (error) {
    console.error("❌ Points & NFT system example failed:", error);
  }
}

// Export for use in other files
export { PointsNFTFrontend }; 