import { ethers } from "ethers";
import { LuckySpinFHE_Complete } from "../typechain-types";

/**
 * Frontend Integration cho LuckySpinFHE_Complete
 * Tích hợp hoàn chỉnh với tất cả tính năng: encrypted inputs, pool management, leaderboard
 */

// Interfaces
interface PointsConfig {
  checkInPoints: bigint;
  spinPoints: bigint;
  gmPoints: bigint;
  winBonusPoints: bigint;
  dailyCheckInBonus: bigint;
  isActive: boolean;
}

interface SpinConfig {
  baseSpinsPerCheckIn: bigint;
  bonusSpinsPerGM: bigint;
  maxSpinsPerDay: bigint;
  unluckySlotCount: bigint;
  unluckySlotIndices: bigint[];
  isActive: boolean;
}

interface PoolReward {
  name: string;
  imageUrl: string;
  value: bigint;
  rewardType: bigint;
  tokenAddress: string;
  isActive: boolean;
  maxSpins: bigint;
  currentSpins: bigint;
  winRate: bigint;
  minSpins: bigint;
  balance: bigint;
}

interface NFTReward {
  tokenId: bigint;
  metadata: string;
  rarity: bigint;
  isClaimed: boolean;
  winner: string;
  claimedAt: bigint;
}

interface PublicScore {
  user: string;
  score: number;
}

interface UserStats {
  totalSpinsPurchased: number;
  totalETHSpent: string;
  publicScore: number;
  lastCheckIn: Date | null;
  lastGM: Date | null;
}

/**
 * Frontend Class cho LuckySpinFHE_Complete
 */
export class LuckySpinCompleteFrontend {
  private contract: LuckySpinFHE_Complete;
  private provider: ethers.Provider;
  private signer: ethers.Signer;

  constructor(contractAddress: string, provider: ethers.Provider, signer: ethers.Signer) {
    this.provider = provider;
    this.signer = signer;
    // Assume contract ABI is available
    this.contract = new ethers.Contract(contractAddress, [], signer) as LuckySpinFHE_Complete;
  }

  // ===== USER ACTIONS =====

  /**
   * Mua lượt quay bằng ETH (không refund)
   */
  async buySpins(spins: number): Promise<ethers.TransactionResponse> {
    const pricePerSpin = ethers.parseEther("0.01");
    const totalCost = pricePerSpin * BigInt(spins);

    console.log(`💰 Buying ${spins} spins for ${ethers.formatEther(totalCost)} ETH`);
    console.log("⚠️ Warning: ETH is non-refundable!");

    return await this.contract.buySpins(spins, { value: totalCost });
  }

  /**
   * Điểm danh hàng ngày
   */
  async checkIn(): Promise<ethers.TransactionResponse> {
    console.log("📅 Checking in for daily rewards...");
    return await this.contract.checkIn();
  }

  /**
   * Gửi GM hàng ngày
   */
  async sendGM(): Promise<ethers.TransactionResponse> {
    console.log("👋 Sending daily GM...");
    return await this.contract.sendGM();
  }

  /**
   * Quay và nhận thưởng với encrypted input
   * Lưu ý: Trong thực tế cần sử dụng fhevm library để encrypt
   */
  async spinAndClaimReward(poolIndex: number): Promise<ethers.TransactionResponse> {
    console.log(`🎰 Spinning for pool ${poolIndex}...`);
    console.log("Note: This requires FHEVM encryption library for encrypted inputs");

    // Placeholder - trong thực tế cần:
    // 1. Import fhevm library
    // 2. Encrypt poolIndex: const encryptedPoolIndex = await fhevm.encrypt8(poolIndex)
    // 3. Generate proof: const proof = encryptedPoolIndex.getProof()
    // 4. Call: this.contract.spinAndClaimReward(encryptedPoolIndex.handle, proof)

    throw new Error("Encrypted input required - integrate with FHEVM library");
  }

  /**
   * Yêu cầu công khai điểm số
   */
  async makeScorePublic(): Promise<ethers.TransactionResponse> {
    console.log("🔓 Requesting score decryption...");
    return await this.contract.makeScorePublic();
  }

  /**
   * Claim NFT reward
   */
  async claimNFTReward(poolIndex: number): Promise<ethers.TransactionResponse> {
    console.log(`🎨 Claiming NFT from pool ${poolIndex}...`);
    return await this.contract.claimNFTReward(poolIndex);
  }

  // ===== POOL MANAGEMENT =====

  /**
   * Lấy thông tin tất cả pools
   */
  async getAllPools(): Promise<PoolReward[]> {
    const poolsCount = await this.contract.getPoolsCount();
    const pools: PoolReward[] = [];

    for (let i = 0; i < Number(poolsCount); i++) {
      const pool = await this.contract.getPoolReward(i);
      pools.push(pool);
    }

    return pools;
  }

  /**
   * Lấy thông tin pool cụ thể
   */
  async getPoolInfo(poolIndex: number): Promise<PoolReward> {
    return await this.contract.getPoolReward(poolIndex);
  }

  /**
   * Fund pool bằng ETH
   */
  async fundPool(poolIndex: number, amount: string): Promise<ethers.TransactionResponse> {
    console.log(`💰 Funding pool ${poolIndex} with ${amount} ETH`);
    return await this.contract.fundPoolWithETH(poolIndex, {
      value: ethers.parseEther(amount),
    });
  }

  /**
   * Admin withdraw từ pool
   */
  async withdrawFromPool(poolIndex: number, amount: string): Promise<ethers.TransactionResponse> {
    console.log(`💸 Withdrawing ${amount} ETH from pool ${poolIndex}`);
    return await this.contract.withdrawFromPool(poolIndex, ethers.parseEther(amount));
  }

  // ===== NFT MANAGEMENT =====

  /**
   * Add NFT reward
   */
  async addNFTReward(
    poolIndex: number,
    tokenId: number,
    metadata: string,
    rarity: number,
  ): Promise<ethers.TransactionResponse> {
    console.log(`🎨 Adding NFT reward to pool ${poolIndex}`);
    return await this.contract.addNFTReward(poolIndex, tokenId, metadata, rarity);
  }

  /**
   * Lấy thông tin NFT reward
   */
  async getNFTReward(poolIndex: number): Promise<NFTReward> {
    return await this.contract.getNFTReward(poolIndex);
  }

  /**
   * Lấy tổng số NFT đã được claim
   */
  async getTotalNFTsClaimed(): Promise<bigint> {
    return await this.contract.totalNFTsClaimed();
  }

  // ===== CONFIGURATION =====

  /**
   * Lấy config điểm số
   */
  async getPointsConfig(): Promise<PointsConfig> {
    return await this.contract.getPointsConfig();
  }

  /**
   * Lấy config spin
   */
  async getSpinConfig(): Promise<SpinConfig> {
    return await this.contract.getSpinConfig();
  }

  /**
   * Cập nhật config điểm số (admin)
   */
  async updatePointsConfig(
    checkInPoints: number,
    spinPoints: number,
    gmPoints: number,
    winBonusPoints: number,
    dailyCheckInBonus: number,
  ): Promise<ethers.TransactionResponse> {
    console.log("⚙️ Updating points configuration...");
    return await this.contract.updatePointsConfig(
      checkInPoints,
      spinPoints,
      gmPoints,
      winBonusPoints,
      dailyCheckInBonus,
    );
  }

  /**
   * Cập nhật config spin (admin)
   */
  async updateSpinConfig(
    baseSpinsPerCheckIn: number,
    bonusSpinsPerGM: number,
    maxSpinsPerDay: number,
    unluckySlotCount: number,
  ): Promise<ethers.TransactionResponse> {
    console.log("⚙️ Updating spin configuration...");
    return await this.contract.updateSpinConfig(baseSpinsPerCheckIn, bonusSpinsPerGM, maxSpinsPerDay, unluckySlotCount);
  }

  /**
   * Cập nhật unlucky slots
   */
  async updateUnluckySlots(indices: number[]): Promise<ethers.TransactionResponse> {
    console.log("⚙️ Updating unlucky slots...");
    return await this.contract.updateUnluckySlots(indices);
  }

  // ===== LEADERBOARD =====

  /**
   * Lấy public leaderboard
   */
  async getPublicLeaderboard(): Promise<PublicScore[]> {
    const length = await this.contract.getPublicLeaderboardLength();
    const leaderboard: PublicScore[] = [];

    for (let i = 0; i < Number(length); i++) {
      const entry = await this.contract.publicLeaderboard(i);
      leaderboard.push({
        user: entry.user,
        score: Number(entry.score),
      });
    }

    // Sort by score descending
    return leaderboard.sort((a, b) => b.score - a.score);
  }

  /**
   * Lấy encrypted leaderboard length
   */
  async getEncryptedLeaderboardLength(): Promise<number> {
    const length = await this.contract.getEncryptedLeaderboardLength();
    return Number(length);
  }

  // ===== UTILITY FUNCTIONS =====

  /**
   * Kiểm tra slot có unlucky không
   */
  async isUnluckySlot(slotIndex: number): Promise<boolean> {
    return await this.contract.isUnluckySlot(slotIndex);
  }

  /**
   * Lấy danh sách unlucky slots
   */
  async getUnluckySlots(): Promise<number[]> {
    const slots = await this.contract.getUnluckySlots();
    return slots.map((s) => Number(s));
  }

  /**
   * Lấy contract balance
   */
  async getContractBalance(): Promise<string> {
    const balance = await this.contract.getContractBalance();
    return ethers.formatEther(balance);
  }

  /**
   * Kiểm tra user có transient access không
   */
  async hasTransientAccess(userAddress: string, dataType: string): Promise<boolean> {
    return await this.contract.hasTransientAccess(userAddress, dataType);
  }

  /**
   * Lấy last error của user
   */
  async getLastError(userAddress: string): Promise<any> {
    return await this.contract.getLastError(userAddress);
  }

  // ===== EVENTS MONITORING =====

  /**
   * Lắng nghe event SpinPurchased
   */
  onSpinPurchased(callback: (user: string, spins: number, amount: string) => void) {
    this.contract.on("SpinPurchased", (user, spins, amount) => {
      callback(user, Number(spins), ethers.formatEther(amount));
    });
  }

  /**
   * Lắng nghe event SpinResult
   */
  onSpinResult(callback: (user: string, poolIndex: number, isWin: boolean, reward: string) => void) {
    this.contract.on("SpinResult", (user, poolIndex, isWin, reward) => {
      callback(user, Number(poolIndex), isWin, ethers.formatEther(reward));
    });
  }

  /**
   * Lắng nghe event CheckInCompleted
   */
  onCheckInCompleted(callback: (user: string, spinsReceived: number, pointsReceived: number) => void) {
    this.contract.on("CheckInCompleted", (user, spinsReceived, pointsReceived) => {
      callback(user, Number(spinsReceived), Number(pointsReceived));
    });
  }

  /**
   * Lắng nghe event GMReceived
   */
  onGMReceived(callback: (user: string, spinsReceived: number, pointsReceived: number) => void) {
    this.contract.on("GMReceived", (user, spinsReceived, pointsReceived) => {
      callback(user, Number(spinsReceived), Number(pointsReceived));
    });
  }

  /**
   * Lắng nghe event ScoreDecrypted
   */
  onScoreDecrypted(callback: (user: string, score: number) => void) {
    this.contract.on("ScoreDecrypted", (user, score) => {
      callback(user, Number(score));
    });
  }

  /**
   * Lắng nghe event NFTRewardClaimed
   */
  onNFTRewardClaimed(callback: (user: string, poolIndex: number, tokenId: number, metadata: string) => void) {
    this.contract.on("NFTRewardClaimed", (user, poolIndex, tokenId, metadata) => {
      callback(user, Number(poolIndex), Number(tokenId), metadata);
    });
  }

  // ===== HELPER METHODS =====

  /**
   * Tính toán tổng chi phí mua spins
   */
  calculateSpinCost(spins: number): string {
    const pricePerSpin = ethers.parseEther("0.01");
    const totalCost = pricePerSpin * BigInt(spins);
    return ethers.formatEther(totalCost);
  }

  /**
   * Validate số lượng spins
   */
  validateSpinAmount(spins: number): { valid: boolean; error?: string } {
    if (spins <= 0) {
      return { valid: false, error: "Must buy at least 1 spin" };
    }
    if (spins > 100) {
      return { valid: false, error: "Cannot buy more than 100 spins at once" };
    }
    return { valid: true };
  }

  /**
   * Format reward type
   */
  formatRewardType(rewardType: bigint): string {
    const types = ["ETH", "USDC", "USDT", "TOKEN", "NFT", "POINTS", "CUSTOM"];
    return types[Number(rewardType)] || "UNKNOWN";
  }

  /**
   * Tính win rate phần trăm
   */
  formatWinRate(winRate: bigint): string {
    const percentage = Number(winRate) / 100;
    return `${percentage}%`;
  }

  /**
   * Kiểm tra có thể check-in không
   */
  async canCheckIn(userAddress: string): Promise<boolean> {
    // Logic kiểm tra last check-in date
    // Cần implement thêm getter function trong contract
    return true; // Placeholder
  }

  /**
   * Kiểm tra có thể send GM không
   */
  async canSendGM(userAddress: string): Promise<boolean> {
    // Logic kiểm tra last GM date
    // Cần implement thêm getter function trong contract
    return true; // Placeholder
  }

  /**
   * Disconnect event listeners
   */
  disconnect() {
    this.contract.removeAllListeners();
  }
}

/**
 * Example Usage
 */
export async function exampleUsage() {
  // Setup
  const provider = new ethers.JsonRpcProvider("http://localhost:8545");
  const signer = await provider.getSigner();
  const contractAddress = "0x..."; // Contract address

  const frontend = new LuckySpinCompleteFrontend(contractAddress, provider, signer);

  // Mua spins
  const validation = frontend.validateSpinAmount(5);
  if (validation.valid) {
    const cost = frontend.calculateSpinCost(5);
    console.log(`Cost: ${cost} ETH`);

    await frontend.buySpins(5);
  }

  // Check-in
  if (await frontend.canCheckIn(await signer.getAddress())) {
    await frontend.checkIn();
  }

  // Lấy pools
  const pools = await frontend.getAllPools();
  console.log("Available pools:", pools.length);

  // Lấy leaderboard
  const leaderboard = await frontend.getPublicLeaderboard();
  console.log("Top 10 players:", leaderboard.slice(0, 10));

  // Monitor events
  frontend.onSpinPurchased((user, spins, amount) => {
    console.log(`${user} bought ${spins} spins for ${amount} ETH`);
  });

  frontend.onCheckInCompleted((user, spins, points) => {
    console.log(`${user} checked in: +${spins} spins, +${points} points`);
  });

  // Cleanup
  // frontend.disconnect();
}

// Export cho sử dụng
export default LuckySpinCompleteFrontend;
