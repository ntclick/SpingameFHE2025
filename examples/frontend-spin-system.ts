import { ethers } from "ethers";
import { ZAMA_CONFIG } from "../config/zama-config";

// Interface cho Spin System
interface SpinConfig {
  baseSpinsPerCheckIn: number;
  bonusSpinsPerGM: number;
  maxSpinsPerDay: number;
  unluckySlotCount: number;
  unluckySlotIndices: number[];
  isActive: boolean;
}

// Frontend class để quản lý Spin System
export class SpinSystemFrontend {
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

  // ===== SPIN CONFIGURATION FUNCTIONS =====

  /// @notice Update spin configuration (admin only)
  async updateSpinConfig(config: SpinConfig): Promise<void> {
    try {
      console.log("Updating spin configuration...");
      
      const tx = await this.contract.updateSpinConfig(
        config.baseSpinsPerCheckIn,
        config.bonusSpinsPerGM,
        config.maxSpinsPerDay,
        config.unluckySlotCount
      );
      await tx.wait();
      
      console.log("✅ Spin configuration updated successfully!");
    } catch (error) {
      console.error("❌ Failed to update spin configuration:", error);
      throw error;
    }
  }

  /// @notice Update unlucky slot indices (admin only)
  async updateUnluckySlots(unluckySlotIndices: number[]): Promise<void> {
    try {
      console.log("Updating unlucky slot indices...");
      
      const tx = await this.contract.updateUnluckySlots(unluckySlotIndices);
      await tx.wait();
      
      console.log("✅ Unlucky slot indices updated successfully!");
    } catch (error) {
      console.error("❌ Failed to update unlucky slot indices:", error);
      throw error;
    }
  }

  /// @notice Toggle spin system active status
  async toggleSpinSystem(): Promise<void> {
    try {
      console.log("Toggling spin system...");
      
      const tx = await this.contract.toggleSpinSystem();
      await tx.wait();
      
      console.log("✅ Spin system toggled successfully!");
    } catch (error) {
      console.error("❌ Failed to toggle spin system:", error);
      throw error;
    }
  }

  /// @notice Get current spin configuration
  async getSpinConfig(): Promise<SpinConfig> {
    try {
      const [baseSpinsPerCheckIn, bonusSpinsPerGM, maxSpinsPerDay, unluckySlotCount, unluckySlotIndices, isActive] = 
        await this.contract.getSpinConfig();
      
      return {
        baseSpinsPerCheckIn: Number(baseSpinsPerCheckIn),
        bonusSpinsPerGM: Number(bonusSpinsPerGM),
        maxSpinsPerDay: Number(maxSpinsPerDay),
        unluckySlotCount: Number(unluckySlotCount),
        unluckySlotIndices: unluckySlotIndices.map((index: any) => Number(index)),
        isActive
      };
    } catch (error) {
      console.error("❌ Failed to get spin configuration:", error);
      throw error;
    }
  }

  /// @notice Check if a slot is unlucky
  async isUnluckySlot(slotIndex: number): Promise<boolean> {
    try {
      const isUnlucky = await this.contract.isUnluckySlot(slotIndex);
      return isUnlucky;
    } catch (error) {
      console.error("❌ Failed to check unlucky slot:", error);
      throw error;
    }
  }

  /// @notice Get all unlucky slot indices
  async getUnluckySlots(): Promise<number[]> {
    try {
      const unluckySlots = await this.contract.getUnluckySlots();
      return unluckySlots.map((slot: any) => Number(slot));
    } catch (error) {
      console.error("❌ Failed to get unlucky slots:", error);
      throw error;
    }
  }

  // ===== SPIN CALCULATION FUNCTIONS =====

  /// @notice Calculate spins for different actions
  calculateSpinsForAction(action: string, config: SpinConfig): number {
    switch (action) {
      case "CHECK_IN":
        return config.baseSpinsPerCheckIn;
      case "GM":
        return config.bonusSpinsPerGM;
      case "MAX_PER_DAY":
        return config.maxSpinsPerDay;
      default:
        return 0;
    }
  }

  /// @notice Get user spin count (encrypted)
  async getUserSpinCount(userAddress: string): Promise<string> {
    try {
      const spinCount = await this.contract.getEncryptedSpinCount(userAddress);
      return spinCount.toString();
    } catch (error) {
      console.error("❌ Failed to get user spin count:", error);
      throw error;
    }
  }

  // ===== SPIN SYSTEM EXAMPLES =====

  /// @notice Example spin configuration setup
  async setupSpinSystem(): Promise<void> {
    try {
      console.log("Setting up spin system...");

      // 1. Configure basic spin settings
      const spinConfig: SpinConfig = {
        baseSpinsPerCheckIn: 3,    // 3 spins per check-in
        bonusSpinsPerGM: 1,        // 1 bonus spin per GM
        maxSpinsPerDay: 10,        // Max 10 spins per day
        unluckySlotCount: 2,       // 2 unlucky slots
        unluckySlotIndices: [2, 5], // Slots 2 and 5 are unlucky
        isActive: true
      };

      await this.updateSpinConfig(spinConfig);

      // 2. Set unlucky slots
      await this.updateUnluckySlots([2, 5]);

      console.log("✅ Spin system setup completed!");
    } catch (error) {
      console.error("❌ Failed to setup spin system:", error);
      throw error;
    }
  }

  /// @notice Example spin calculation
  async demonstrateSpinCalculations(): Promise<void> {
    try {
      console.log("Demonstrating spin calculations...");

      const config = await this.getSpinConfig();
      
      console.log("\n📊 Spin Configuration:");
      console.log(`- Base spins per check-in: ${config.baseSpinsPerCheckIn}`);
      console.log(`- Bonus spins per GM: ${config.bonusSpinsPerGM}`);
      console.log(`- Max spins per day: ${config.maxSpinsPerDay}`);
      console.log(`- Unlucky slot count: ${config.unluckySlotCount}`);
      console.log(`- Unlucky slots: ${config.unluckySlotIndices.join(', ')}`);

      // Check unlucky slots
      console.log("\n🎯 Unlucky Slot Check:");
      for (let i = 0; i < 8; i++) {
        const isUnlucky = await this.isUnluckySlot(i);
        console.log(`Slot ${i}: ${isUnlucky ? '❌ Unlucky' : '✅ Lucky'}`);
      }

      // Calculate example spins
      console.log("\n🔄 Spin Calculations:");
      const actions = ["CHECK_IN", "GM", "MAX_PER_DAY"];
      
      for (const action of actions) {
        const spins = this.calculateSpinsForAction(action, config);
        console.log(`${action}: ${spins} spins`);
      }

    } catch (error) {
      console.error("❌ Failed to demonstrate spin calculations:", error);
      throw error;
    }
  }

  // ===== SPIN SYSTEM VALIDATION =====

  /// @notice Validate spin configuration
  validateSpinConfig(config: SpinConfig): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (config.baseSpinsPerCheckIn <= 0) {
      errors.push("Base spins per check-in must be greater than 0");
    }

    if (config.maxSpinsPerDay <= 0) {
      errors.push("Max spins per day must be greater than 0");
    }

    if (config.unluckySlotCount > 8) {
      errors.push("Unlucky slot count cannot exceed 8");
    }

    if (config.unluckySlotIndices.length > 8) {
      errors.push("Cannot have more than 8 unlucky slots");
    }

    // Check for duplicate slot indices
    const uniqueSlots = new Set(config.unluckySlotIndices);
    if (uniqueSlots.size !== config.unluckySlotIndices.length) {
      errors.push("Duplicate slot indices found");
    }

    // Check slot indices are within valid range
    for (const slotIndex of config.unluckySlotIndices) {
      if (slotIndex >= 8) {
        errors.push(`Slot index ${slotIndex} must be 0-7`);
      }
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  // ===== SPIN SYSTEM PRESETS =====

  /// @notice Get preset spin configurations
  getSpinPresets(): { [key: string]: SpinConfig } {
    return {
      "beginner": {
        baseSpinsPerCheckIn: 2,
        bonusSpinsPerGM: 1,
        maxSpinsPerDay: 5,
        unluckySlotCount: 1,
        unluckySlotIndices: [3],
        isActive: true
      },
      "normal": {
        baseSpinsPerCheckIn: 3,
        bonusSpinsPerGM: 1,
        maxSpinsPerDay: 10,
        unluckySlotCount: 2,
        unluckySlotIndices: [2, 5],
        isActive: true
      },
      "advanced": {
        baseSpinsPerCheckIn: 5,
        bonusSpinsPerGM: 2,
        maxSpinsPerDay: 15,
        unluckySlotCount: 3,
        unluckySlotIndices: [1, 4, 6],
        isActive: true
      },
      "expert": {
        baseSpinsPerCheckIn: 8,
        bonusSpinsPerGM: 3,
        maxSpinsPerDay: 20,
        unluckySlotCount: 4,
        unluckySlotIndices: [0, 2, 4, 7],
        isActive: true
      }
    };
  }

  /// @notice Apply preset configuration
  async applyPreset(presetName: string): Promise<void> {
    try {
      const presets = this.getSpinPresets();
      const preset = presets[presetName];
      
      if (!preset) {
        throw new Error(`Preset "${presetName}" not found`);
      }

      console.log(`Applying ${presetName} preset...`);
      
      await this.updateSpinConfig(preset);
      await this.updateUnluckySlots(preset.unluckySlotIndices);
      
      console.log(`✅ ${presetName} preset applied successfully!`);
    } catch (error) {
      console.error(`❌ Failed to apply ${presetName} preset:`, error);
      throw error;
    }
  }
}

// Example usage
export async function exampleSpinSystem() {
  console.log("=== Spin System Frontend Example ===\n");

  // Configuration
  const contractAddress = "YOUR_DEPLOYED_CONTRACT_ADDRESS";
  const privateKey = ZAMA_CONFIG.PRIVATE_KEY;

  // Initialize frontend
  const spinSystem = new SpinSystemFrontend(contractAddress, privateKey);

  try {
    // 1. Setup spin system
    console.log("1. Setting up spin system...");
    await spinSystem.setupSpinSystem();

    // 2. Get current configuration
    console.log("\n2. Getting current spin configuration...");
    const config = await spinSystem.getSpinConfig();
    console.log("Current config:", config);

    // 3. Demonstrate spin calculations
    console.log("\n3. Demonstrating spin calculations...");
    await spinSystem.demonstrateSpinCalculations();

    // 4. Apply different presets
    console.log("\n4. Applying different presets...");
    const presets = ["beginner", "normal", "advanced", "expert"];
    
    for (const preset of presets) {
      try {
        await spinSystem.applyPreset(preset);
        console.log(`✅ ${preset} preset applied`);
      } catch (error) {
        console.log(`❌ Failed to apply ${preset} preset`);
      }
    }

    // 5. Validate configuration
    console.log("\n5. Validating configuration...");
    const validation = spinSystem.validateSpinConfig(config);
    
    if (validation.isValid) {
      console.log("✅ Configuration is valid");
    } else {
      console.log("❌ Configuration has errors:");
      validation.errors.forEach(error => console.log(`- ${error}`));
    }

    // 6. Get unlucky slots
    console.log("\n6. Getting unlucky slots...");
    const unluckySlots = await spinSystem.getUnluckySlots();
    console.log("Unlucky slots:", unluckySlots);

    // 7. Check specific slots
    console.log("\n7. Checking specific slots...");
    for (let i = 0; i < 8; i++) {
      const isUnlucky = await spinSystem.isUnluckySlot(i);
      console.log(`Slot ${i}: ${isUnlucky ? '❌ Unlucky' : '✅ Lucky'}`);
    }

    console.log("\n✅ Spin system example completed successfully!");

  } catch (error) {
    console.error("❌ Spin system example failed:", error);
  }
}

// Export for use in other files
export { SpinSystemFrontend }; 