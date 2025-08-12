import { ethers } from "ethers";
import { ZAMA_CONFIG } from "../config/zama-config";

// Interface cho Pool Funding
interface PoolFundingInfo {
  poolIndex: number;
  name: string;
  rewardType: string;
  tokenAddress: string;
  balance: string;
  value: string;
  isActive: boolean;
}

interface TokenInfo {
  symbol: string;
  decimals: number;
  address: string;
}

// Frontend class để quản lý pool funding
export class PoolFundingFrontend {
  private provider: ethers.Provider;
  private signer: ethers.Signer;
  private contract: ethers.Contract;
  private relayerUrl: string;

  // Common token addresses (Sepolia testnet)
  private readonly TOKENS = {
    USDC: {
      symbol: "USDC",
      decimals: 6,
      address: "0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238" // Sepolia USDC
    },
    USDT: {
      symbol: "USDT", 
      decimals: 6,
      address: "0x7169D38820dfd117C3FA1f22a697dBA58d90BA06" // Sepolia USDT
    }
  };

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

  // ===== POOL FUNDING FUNCTIONS =====

  /// @notice Lấy thông tin funding của tất cả pools
  async getAllPoolFundingInfo(): Promise<PoolFundingInfo[]> {
    try {
      const poolCount = await this.contract.poolCount();
      const pools: PoolFundingInfo[] = [];

      for (let i = 0; i < poolCount; i++) {
        const [name, imageUrl, value, rewardType, isActive, maxSpins, currentSpins, winRate, minSpins, tokenAddress, balance] = 
          await this.contract.getPoolReward(i);
        
        const rewardTypeName = this.getRewardTypeName(Number(rewardType));
        
        pools.push({
          poolIndex: i,
          name,
          rewardType: rewardTypeName,
          tokenAddress: tokenAddress,
          balance: ethers.formatEther(balance),
          value: ethers.formatEther(value),
          isActive
        });
      }

      return pools;
    } catch (error) {
      console.error("❌ Failed to get pool funding info:", error);
      throw error;
    }
  }

  /// @notice Nạp ETH vào pool
  async fundPoolWithETH(poolIndex: number, ethAmount: string): Promise<void> {
    try {
      const amountInWei = ethers.parseEther(ethAmount);
      
      console.log(`Funding pool ${poolIndex} with ${ethAmount} ETH...`);
      
      const tx = await this.contract.fundPoolWithETH(poolIndex, { value: amountInWei });
      await tx.wait();
      
      console.log("✅ Pool funded with ETH successfully!");
    } catch (error) {
      console.error("❌ Failed to fund pool with ETH:", error);
      throw error;
    }
  }

  /// @notice Nạp USDC vào pool
  async fundPoolWithUSDC(poolIndex: number, usdcAmount: string): Promise<void> {
    try {
      const tokenAddress = this.TOKENS.USDC.address;
      const amountInWei = ethers.parseUnits(usdcAmount, this.TOKENS.USDC.decimals);
      
      console.log(`Funding pool ${poolIndex} with ${usdcAmount} USDC...`);
      
      // First approve the contract to spend USDC
      const usdcContract = new ethers.Contract(tokenAddress, [
        "function approve(address spender, uint256 amount) external returns (bool)",
        "function transferFrom(address from, address to, uint256 amount) external returns (bool)"
      ], this.signer);
      
      await usdcContract.approve(await this.contract.getAddress(), amountInWei);
      
      const tx = await this.contract.fundPoolWithToken(poolIndex, tokenAddress, amountInWei);
      await tx.wait();
      
      console.log("✅ Pool funded with USDC successfully!");
    } catch (error) {
      console.error("❌ Failed to fund pool with USDC:", error);
      throw error;
    }
  }

  /// @notice Nạp USDT vào pool
  async fundPoolWithUSDT(poolIndex: number, usdtAmount: string): Promise<void> {
    try {
      const tokenAddress = this.TOKENS.USDT.address;
      const amountInWei = ethers.parseUnits(usdtAmount, this.TOKENS.USDT.decimals);
      
      console.log(`Funding pool ${poolIndex} with ${usdtAmount} USDT...`);
      
      // First approve the contract to spend USDT
      const usdtContract = new ethers.Contract(tokenAddress, [
        "function approve(address spender, uint256 amount) external returns (bool)",
        "function transferFrom(address from, address to, uint256 amount) external returns (bool)"
      ], this.signer);
      
      await usdtContract.approve(await this.contract.getAddress(), amountInWei);
      
      const tx = await this.contract.fundPoolWithToken(poolIndex, tokenAddress, amountInWei);
      await tx.wait();
      
      console.log("✅ Pool funded with USDT successfully!");
    } catch (error) {
      console.error("❌ Failed to fund pool with USDT:", error);
      throw error;
    }
  }

  /// @notice Nạp custom token vào pool
  async fundPoolWithCustomToken(poolIndex: number, tokenAddress: string, amount: string, decimals: number = 18): Promise<void> {
    try {
      const amountInWei = ethers.parseUnits(amount, decimals);
      
      console.log(`Funding pool ${poolIndex} with ${amount} tokens (${tokenAddress})...`);
      
      // First approve the contract to spend tokens
      const tokenContract = new ethers.Contract(tokenAddress, [
        "function approve(address spender, uint256 amount) external returns (bool)",
        "function transferFrom(address from, address to, uint256 amount) external returns (bool)"
      ], this.signer);
      
      await tokenContract.approve(await this.contract.getAddress(), amountInWei);
      
      const tx = await this.contract.fundPoolWithToken(poolIndex, tokenAddress, amountInWei);
      await tx.wait();
      
      console.log("✅ Pool funded with custom token successfully!");
    } catch (error) {
      console.error("❌ Failed to fund pool with custom token:", error);
      throw error;
    }
  }

  /// @notice Rút ETH từ pool (admin only)
  async withdrawETHFromPool(poolIndex: number, ethAmount: string): Promise<void> {
    try {
      const amountInWei = ethers.parseEther(ethAmount);
      
      console.log(`Withdrawing ${ethAmount} ETH from pool ${poolIndex}...`);
      
      const tx = await this.contract.withdrawETHFromPool(poolIndex, amountInWei);
      await tx.wait();
      
      console.log("✅ ETH withdrawn from pool successfully!");
    } catch (error) {
      console.error("❌ Failed to withdraw ETH from pool:", error);
      throw error;
    }
  }

  /// @notice Rút token từ pool (admin only)
  async withdrawTokenFromPool(poolIndex: number, amount: string, decimals: number = 18): Promise<void> {
    try {
      const amountInWei = ethers.parseUnits(amount, decimals);
      
      console.log(`Withdrawing ${amount} tokens from pool ${poolIndex}...`);
      
      const tx = await this.contract.withdrawTokenFromPool(poolIndex, amountInWei);
      await tx.wait();
      
      console.log("✅ Tokens withdrawn from pool successfully!");
    } catch (error) {
      console.error("❌ Failed to withdraw tokens from pool:", error);
      throw error;
    }
  }

  /// @notice Lấy balance của pool
  async getPoolBalance(poolIndex: number): Promise<string> {
    try {
      const balance = await this.contract.getPoolBalance(poolIndex);
      return ethers.formatEther(balance);
    } catch (error) {
      console.error("❌ Failed to get pool balance:", error);
      throw error;
    }
  }

  /// @notice Lấy token address của pool
  async getPoolTokenAddress(poolIndex: number): Promise<string> {
    try {
      return await this.contract.getPoolTokenAddress(poolIndex);
    } catch (error) {
      console.error("❌ Failed to get pool token address:", error);
      throw error;
    }
  }

  /// @notice Lấy thông tin token
  getTokenInfo(symbol: string): TokenInfo | null {
    return this.TOKENS[symbol as keyof typeof this.TOKENS] || null;
  }

  /// @notice Convert reward type enum to string
  private getRewardTypeName(rewardType: number): string {
    switch (rewardType) {
      case 0: return "ETH";
      case 1: return "USDC";
      case 2: return "USDT";
      case 3: return "TOKEN";
      case 4: return "NFT";
      case 5: return "POINTS";
      case 6: return "CUSTOM";
      default: return "UNKNOWN";
    }
  }

  /// @notice Lấy user token balance
  async getUserTokenBalance(tokenAddress: string, userAddress: string): Promise<string> {
    try {
      const tokenContract = new ethers.Contract(tokenAddress, [
        "function balanceOf(address account) external view returns (uint256)",
        "function decimals() external view returns (uint8)"
      ], this.provider);
      
      const balance = await tokenContract.balanceOf(userAddress);
      const decimals = await tokenContract.decimals();
      
      return ethers.formatUnits(balance, decimals);
    } catch (error) {
      console.error("❌ Failed to get user token balance:", error);
      throw error;
    }
  }
}

// Example usage
export async function examplePoolFunding() {
  console.log("=== Pool Funding Frontend Example ===\n");

  // Configuration
  const contractAddress = "YOUR_DEPLOYED_CONTRACT_ADDRESS";
  const privateKey = ZAMA_CONFIG.PRIVATE_KEY;

  // Initialize frontend
  const poolFunding = new PoolFundingFrontend(contractAddress, privateKey);

  try {
    // 1. Get all pool funding info
    console.log("1. Getting all pool funding info...");
    const pools = await poolFunding.getAllPoolFundingInfo();
    console.log("Pool funding info:", pools);

    // 2. Fund pools with different tokens
    console.log("\n2. Funding pools with different tokens...");
    
    // Fund ETH pool
    await poolFunding.fundPoolWithETH(0, "0.5"); // 0.5 ETH
    
    // Fund USDC pool
    await poolFunding.fundPoolWithUSDC(1, "1000"); // 1000 USDC
    
    // Fund USDT pool
    await poolFunding.fundPoolWithUSDT(2, "500"); // 500 USDT

    // 3. Get updated pool balances
    console.log("\n3. Getting updated pool balances...");
    for (let i = 0; i < pools.length; i++) {
      const balance = await poolFunding.getPoolBalance(i);
      const tokenAddress = await poolFunding.getPoolTokenAddress(i);
      console.log(`Pool ${i} balance: ${balance} (token: ${tokenAddress})`);
    }

    // 4. Get user token balances
    console.log("\n4. Getting user token balances...");
    const userAddress = await poolFunding.signer.getAddress();
    
    const usdcBalance = await poolFunding.getUserTokenBalance(
      poolFunding.getTokenInfo("USDC")!.address, 
      userAddress
    );
    console.log(`User USDC balance: ${usdcBalance} USDC`);
    
    const usdtBalance = await poolFunding.getUserTokenBalance(
      poolFunding.getTokenInfo("USDT")!.address, 
      userAddress
    );
    console.log(`User USDT balance: ${usdtBalance} USDT`);

    // 5. Withdraw from pools (admin only)
    console.log("\n5. Withdrawing from pools...");
    await poolFunding.withdrawETHFromPool(0, "0.1"); // Withdraw 0.1 ETH
    await poolFunding.withdrawTokenFromPool(1, "100", 6); // Withdraw 100 USDC

    // 6. Get final balances
    console.log("\n6. Getting final balances...");
    const finalPools = await poolFunding.getAllPoolFundingInfo();
    console.log("Final pool funding info:", finalPools);

    console.log("\n✅ Pool funding example completed successfully!");

  } catch (error) {
    console.error("❌ Pool funding example failed:", error);
  }
}

// Export for use in other files
export { PoolFundingFrontend }; 