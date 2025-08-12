import { ethers } from "ethers";
import { ZAMA_CONFIG } from "../config/zama-config";

// Interface cho Pool Management
interface PoolConfig {
  poolIndex: number;
  name: string;
  imageUrl: string;
  value: string; // ETH amount
  winRate: number; // Percentage (0-100)
  minSpins: number;
  maxSpins: number;
  isActive: boolean;
}

interface PoolUpdate {
  poolIndex: number;
  newWinRate: number;
  newMinSpins: number;
  newValue: string;
  newActive: boolean;
}

// Frontend class để quản lý pools
export class PoolManagementFrontend {
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

  // ===== POOL MANAGEMENT FUNCTIONS =====

  /// @notice Lấy thông tin tất cả pools
  async getAllPools(): Promise<PoolConfig[]> {
    try {
      const poolCount = await this.contract.poolCount();
      const pools: PoolConfig[] = [];

      for (let i = 0; i < poolCount; i++) {
        const [name, imageUrl, value, rewardType, isActive, maxSpins, currentSpins, winRate, minSpins] = 
          await this.contract.getPoolReward(i);
        
        pools.push({
          poolIndex: i,
          name,
          imageUrl,
          value: ethers.formatEther(value),
          winRate: Number(winRate) / 100, // Convert basis points to percentage
          minSpins: Number(minSpins),
          maxSpins: Number(maxSpins),
          isActive
        });
      }

      return pools;
    } catch (error) {
      console.error("❌ Failed to get pools:", error);
      throw error;
    }
  }

  /// @notice Update win rate của pool
  async updatePoolWinRate(poolIndex: number, newWinRate: number): Promise<void> {
    try {
      // Convert percentage to basis points
      const winRateBasisPoints = Math.round(newWinRate * 100);
      
      console.log(`Updating pool ${poolIndex} win rate to ${newWinRate}% (${winRateBasisPoints} basis points)...`);
      
      const tx = await this.contract.updatePoolWinRate(poolIndex, winRateBasisPoints);
      await tx.wait();
      
      console.log("✅ Pool win rate updated successfully!");
    } catch (error) {
      console.error("❌ Failed to update pool win rate:", error);
      throw error;
    }
  }

  /// @notice Update minimum spins của pool
  async updatePoolMinSpins(poolIndex: number, newMinSpins: number): Promise<void> {
    try {
      console.log(`Updating pool ${poolIndex} min spins to ${newMinSpins}...`);
      
      const tx = await this.contract.updatePoolMinSpins(poolIndex, newMinSpins);
      await tx.wait();
      
      console.log("✅ Pool min spins updated successfully!");
    } catch (error) {
      console.error("❌ Failed to update pool min spins:", error);
      throw error;
    }
  }

  /// @notice Update reward value của pool
  async updatePoolRewardValue(poolIndex: number, newValue: string): Promise<void> {
    try {
      const valueInWei = ethers.parseEther(newValue);
      
      console.log(`Updating pool ${poolIndex} reward value to ${newValue} ETH...`);
      
      const tx = await this.contract.updatePoolRewardValue(poolIndex, valueInWei);
      await tx.wait();
      
      console.log("✅ Pool reward value updated successfully!");
    } catch (error) {
      console.error("❌ Failed to update pool reward value:", error);
      throw error;
    }
  }

  /// @notice Toggle pool active status
  async togglePoolActive(poolIndex: number): Promise<void> {
    try {
      console.log(`Toggling pool ${poolIndex} active status...`);
      
      const tx = await this.contract.togglePoolActive(poolIndex);
      await tx.wait();
      
      console.log("✅ Pool active status toggled successfully!");
    } catch (error) {
      console.error("❌ Failed to toggle pool active status:", error);
      throw error;
    }
  }

  /// @notice Batch update nhiều pools
  async batchUpdatePools(poolUpdates: PoolUpdate[]): Promise<void> {
    try {
      console.log(`Batch updating ${poolUpdates.length} pools...`);
      
      // Convert to contract format
      const contractUpdates = poolUpdates.map(update => ({
        poolIndex: update.poolIndex,
        newWinRate: Math.round(update.newWinRate * 100), // Convert to basis points
        newMinSpins: update.newMinSpins,
        newValue: ethers.parseEther(update.newValue),
        newActive: update.newActive
      }));
      
      const tx = await this.contract.batchUpdatePools(contractUpdates);
      await tx.wait();
      
      console.log("✅ Pools batch updated successfully!");
    } catch (error) {
      console.error("❌ Failed to batch update pools:", error);
      throw error;
    }
  }

  /// @notice Tính toán win probability cho user
  async calculateUserWinProbability(poolIndex: number, userSpins: number): Promise<number> {
    try {
      const winProbability = await this.contract.calculateWinRate(poolIndex, userSpins);
      return Number(winProbability) / 100; // Convert basis points to percentage
    } catch (error) {
      console.error("❌ Failed to calculate win probability:", error);
      throw error;
    }
  }

  /// @notice Fund contract với ETH
  async fundContract(ethAmount: string): Promise<void> {
    try {
      const amountInWei = ethers.parseEther(ethAmount);
      
      console.log(`Funding contract with ${ethAmount} ETH...`);
      
      const tx = await this.contract.fundContract({ value: amountInWei });
      await tx.wait();
      
      console.log("✅ Contract funded successfully!");
    } catch (error) {
      console.error("❌ Failed to fund contract:", error);
      throw error;
    }
  }

  /// @notice Lấy contract balance
  async getContractBalance(): Promise<string> {
    try {
      const balance = await this.provider.getBalance(await this.contract.getAddress());
      return ethers.formatEther(balance);
    } catch (error) {
      console.error("❌ Failed to get contract balance:", error);
      throw error;
    }
  }
}

// Example usage
export async function examplePoolManagement() {
  console.log("=== Pool Management Frontend Example ===\n");

  // Configuration
  const contractAddress = "YOUR_DEPLOYED_CONTRACT_ADDRESS";
  const privateKey = ZAMA_CONFIG.PRIVATE_KEY;

  // Initialize frontend
  const poolManager = new PoolManagementFrontend(contractAddress, privateKey);

  try {
    // 1. Get all pools
    console.log("1. Getting all pools...");
    const pools = await poolManager.getAllPools();
    console.log("Current pools:", pools);

    // 2. Update win rates
    console.log("\n2. Updating win rates...");
    await poolManager.updatePoolWinRate(0, 2.5); // Diamond Pool: 2.5%
    await poolManager.updatePoolWinRate(1, 7.5);  // Gold Pool: 7.5%
    await poolManager.updatePoolWinRate(2, 15.0); // Silver Pool: 15%

    // 3. Update minimum spins
    console.log("\n3. Updating minimum spins...");
    await poolManager.updatePoolMinSpins(0, 15); // Diamond Pool: 15 min spins
    await poolManager.updatePoolMinSpins(1, 8);  // Gold Pool: 8 min spins

    // 4. Update reward values
    console.log("\n4. Updating reward values...");
    await poolManager.updatePoolRewardValue(0, "0.75"); // Diamond Pool: 0.75 ETH
    await poolManager.updatePoolRewardValue(1, "0.15"); // Gold Pool: 0.15 ETH

    // 5. Batch update multiple pools
    console.log("\n5. Batch updating pools...");
    const batchUpdates: PoolUpdate[] = [
      {
        poolIndex: 2,
        newWinRate: 12.5,
        newMinSpins: 4,
        newValue: "0.06",
        newActive: true
      },
      {
        poolIndex: 3,
        newWinRate: 25.0,
        newMinSpins: 3,
        newValue: "0.025",
        newActive: true
      }
    ];
    await poolManager.batchUpdatePools(batchUpdates);

    // 6. Calculate win probabilities
    console.log("\n6. Calculating win probabilities...");
    const userSpins = 10;
    for (let i = 0; i < pools.length; i++) {
      const winProb = await poolManager.calculateUserWinProbability(i, userSpins);
      console.log(`Pool ${i} win probability with ${userSpins} spins: ${winProb.toFixed(2)}%`);
    }

    // 7. Get updated pools
    console.log("\n7. Getting updated pools...");
    const updatedPools = await poolManager.getAllPools();
    console.log("Updated pools:", updatedPools);

    // 8. Fund contract
    console.log("\n8. Funding contract...");
    await poolManager.fundContract("1.0"); // Fund 1 ETH

    // 9. Get contract balance
    console.log("\n9. Getting contract balance...");
    const balance = await poolManager.getContractBalance();
    console.log(`Contract balance: ${balance} ETH`);

    console.log("\n✅ Pool management example completed successfully!");

  } catch (error) {
    console.error("❌ Pool management example failed:", error);
  }
}

// Export for use in other files
export { PoolManagementFrontend }; 