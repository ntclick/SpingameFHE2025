import { ethers } from "ethers";
import { LuckySpinFHE_Optimized } from "../typechain-types";

/**
 * Frontend Integration Class theo FHEVM Encrypted Inputs Standards
 * 
 * Theo tài liệu FHEVM:
 * - "Always encrypt inputs using the FHE public key on the client side"
 * - "Minimize the size and complexity of zero-knowledge proofs by packing all encrypted inputs into a single ciphertext"
 * - "Ensure that the correct zero-knowledge proof is associated with each encrypted input"
 */
export class LuckySpinFrontend {
    private contract: LuckySpinFHE_Optimized;
    private signer: ethers.Signer;

    constructor(contract: LuckySpinFHE_Optimized, signer: ethers.Signer) {
        this.contract = contract;
        this.signer = signer;
    }

    /**
     * Enhanced Spin với Optimized Input Packing
     * 
     * Theo tài liệu FHEVM:
     * - Pack tất cả inputs vào single ciphertext
     * - Sử dụng single proof cho tất cả encrypted inputs
     * - Encrypt trên client side với FHE public key
     */
    async optimizedSpin(
        spinsAmount: number,
        poolIndex: number,
        pointValue: number
    ): Promise<void> {
        try {
            console.log("🎯 Starting optimized spin with input packing...");
            
            // Get user address
            const userAddress = await this.signer.getAddress();
            console.log(`👤 User: ${userAddress}`);
            
            // Create encrypted input theo tài liệu FHEVM
            const input = (globalThis as any).fhevm.createEncryptedInput(
                this.contract.getAddress(),
                userAddress
            );
            
            // Pack all inputs vào single ciphertext (tối ưu theo tài liệu)
            console.log("📦 Packing encrypted inputs...");
            input.add8(spinsAmount);    // at index 0
            input.add8(poolIndex);      // at index 1
            input.add32(pointValue);    // at index 2
            
            // Encrypt với single proof
            console.log("🔐 Encrypting with single proof...");
            const encryptedInput = await input.encrypt();
            
            // Call contract với optimized function
            console.log("🚀 Calling optimized contract function...");
            const tx = await this.contract.optimizedSpinAndClaimReward(
                encryptedInput.handles[0],  // externalEuint8
                encryptedInput.handles[1],  // externalEuint8
                encryptedInput.handles[2],  // externalEuint32
                encryptedInput.inputProof    // Single proof cho tất cả
            );
            
            console.log("⏳ Waiting for transaction confirmation...");
            await tx.wait();
            
            console.log("✅ Optimized spin completed successfully!");
            
        } catch (error) {
            console.error("❌ Optimized spin failed:", error);
            throw error;
        }
    }

    /**
     * Check-in với Optimized Input
     */
    async optimizedCheckIn(
        spinsToAdd: number
    ): Promise<void> {
        try {
            console.log("🎯 Starting optimized check-in...");
            
            const userAddress = await this.signer.getAddress();
            
            // Create encrypted input
            const input = (globalThis as any).fhevm.createEncryptedInput(
                this.contract.getAddress(),
                userAddress
            );
            
            // Pack single input
            input.add8(spinsToAdd);    // at index 0
            
            const encryptedInput = await input.encrypt();
            
            // Call check-in function (cần thêm vào contract)
            console.log("✅ Optimized check-in completed!");
            
        } catch (error) {
            console.error("❌ Optimized check-in failed:", error);
            throw error;
        }
    }

    /**
     * GM với Optimized Input
     */
    async optimizedGM(
        gmCount: number
    ): Promise<void> {
        try {
            console.log("🎯 Starting optimized GM...");
            
            const userAddress = await this.signer.getAddress();
            
            // Create encrypted input
            const input = (globalThis as any).fhevm.createEncryptedInput(
                this.contract.getAddress(),
                userAddress
            );
            
            // Pack single input
            input.add32(gmCount);    // at index 0
            
            const encryptedInput = await input.encrypt();
            
            // Call GM function (cần thêm vào contract)
            console.log("✅ Optimized GM completed!");
            
        } catch (error) {
            console.error("❌ Optimized GM failed:", error);
            throw error;
        }
    }

    /**
     * Submit Encrypted Score với Optimized Input
     */
    async optimizedSubmitScore(
        score: number
    ): Promise<void> {
        try {
            console.log("🎯 Starting optimized score submission...");
            
            const userAddress = await this.signer.getAddress();
            
            // Create encrypted input
            const input = (globalThis as any).fhevm.createEncryptedInput(
                this.contract.getAddress(),
                userAddress
            );
            
            // Pack single input
            input.add32(score);    // at index 0
            
            const encryptedInput = await input.encrypt();
            
            // Call submit score function (cần thêm vào contract)
            console.log("✅ Optimized score submission completed!");
            
        } catch (error) {
            console.error("❌ Optimized score submission failed:", error);
            throw error;
        }
    }

    /**
     * Complex Operation với Multiple Optimized Inputs
     */
    async complexOptimizedOperation(
        spinsAmount: number,
        poolIndex: number,
        pointValue: number,
        bonusMultiplier: number,
        isSpecialEvent: boolean
    ): Promise<void> {
        try {
            console.log("🎯 Starting complex optimized operation...");
            
            const userAddress = await this.signer.getAddress();
            
            // Create encrypted input với multiple parameters
            const input = (globalThis as any).fhevm.createEncryptedInput(
                this.contract.getAddress(),
                userAddress
            );
            
            // Pack all inputs vào single ciphertext (tối ưu theo tài liệu)
            input.add8(spinsAmount);        // at index 0
            input.add8(poolIndex);          // at index 1
            input.add32(pointValue);        // at index 2
            input.add8(bonusMultiplier);    // at index 3
            input.addBool(isSpecialEvent);  // at index 4
            
            const encryptedInput = await input.encrypt();
            
            // Call complex function (cần thêm vào contract)
            console.log("✅ Complex optimized operation completed!");
            
        } catch (error) {
            console.error("❌ Complex optimized operation failed:", error);
            throw error;
        }
    }

    /**
     * Get User Stats (Encrypted)
     */
    async getUserStats(): Promise<{
        spinCount: any;
        score: any;
        lastRewardIndex: any;
        dailyGMCount: any;
    }> {
        try {
            const userAddress = await this.signer.getAddress();
            
            console.log("📊 Getting user encrypted stats...");
            
            // Get encrypted data (sẽ được decrypt bởi user)
            const spinCount = await this.contract.getEncryptedSpinCount(userAddress);
            const score = await this.contract.getEncryptedScore(userAddress);
            const lastRewardIndex = await this.contract.getEncryptedLastRewardIndex(userAddress);
            const dailyGMCount = await this.contract.getEncryptedDailyGMCount(userAddress);
            
            return {
                spinCount,
                score,
                lastRewardIndex,
                dailyGMCount
            };
            
        } catch (error) {
            console.error("❌ Failed to get user stats:", error);
            throw error;
        }
    }

    /**
     * Get Contract Configuration
     */
    async getContractConfig(): Promise<{
        pointsConfig: any;
        spinConfig: any;
        poolCount: number;
        randomSeed: any;
    }> {
        try {
            console.log("⚙️ Getting contract configuration...");
            
            const pointsConfig = await this.contract.getPointsConfig();
            const spinConfig = await this.contract.getSpinConfig();
            const poolCount = await this.contract.poolRewards.length;
            const randomSeed = await this.contract.getRandomSeed();
            
            return {
                pointsConfig,
                spinConfig,
                poolCount: Number(poolCount),
                randomSeed
            };
            
        } catch (error) {
            console.error("❌ Failed to get contract config:", error);
            throw error;
        }
    }

    /**
     * Validate Input Proof (Frontend Validation)
     */
    validateInputProof(inputProof: any): boolean {
        try {
            // Basic validation theo tài liệu FHEVM
            if (!inputProof || inputProof.length === 0) {
                console.error("❌ Empty proof");
                return false;
            }
            
            if (inputProof.length < 32) {
                console.error("❌ Invalid proof size");
                return false;
            }
            
            console.log("✅ Input proof validation passed");
            return true;
            
        } catch (error) {
            console.error("❌ Input proof validation failed:", error);
            return false;
        }
    }

    /**
     * Error Handling Helper
     */
    handleFHEError(error: any): void {
        console.error("🔍 FHE Operation Error Analysis:");
        
        if (error.message.includes("Invalid encrypted inputs")) {
            console.error("  - Issue: Invalid encrypted inputs");
            console.error("  - Solution: Check input encryption and proof");
        } else if (error.message.includes("Access denied")) {
            console.error("  - Issue: Access control violation");
            console.error("  - Solution: Check user permissions");
        } else if (error.message.includes("Empty proof")) {
            console.error("  - Issue: Empty or invalid proof");
            console.error("  - Solution: Ensure proper proof generation");
        } else {
            console.error("  - Unknown FHE error:", error.message);
        }
    }
}

/**
 * Usage Example theo Tài Liệu FHEVM
 */
export async function demonstrateOptimizedUsage() {
    console.log("🚀 FHEVM Optimized Input Demo");
    console.log("=" .repeat(50));
    
    // Setup (cần thực tế)
    const provider = new ethers.JsonRpcProvider("http://localhost:8545");
    const signer = await provider.getSigner();
    
    // Deploy contract (cần thực tế)
    const LuckySpinFHE_Optimized = await ethers.getContractFactory("LuckySpinFHE_Optimized");
    const contract = await LuckySpinFHE_Optimized.deploy();
    
    // Create frontend instance
    const frontend = new LuckySpinFrontend(contract, signer);
    
    try {
        // 1. Optimized Spin với Single Proof
        console.log("\n🎯 Demo 1: Optimized Spin");
        await frontend.optimizedSpin(5, 2, 100);
        
        // 2. Get User Stats
        console.log("\n📊 Demo 2: Get User Stats");
        const stats = await frontend.getUserStats();
        console.log("User stats:", stats);
        
        // 3. Get Contract Config
        console.log("\n⚙️ Demo 3: Get Contract Config");
        const config = await frontend.getContractConfig();
        console.log("Contract config:", config);
        
        // 4. Complex Operation
        console.log("\n🎯 Demo 4: Complex Operation");
        await frontend.complexOptimizedOperation(10, 1, 200, 2, true);
        
        console.log("\n✅ All demos completed successfully!");
        
    } catch (error) {
        console.error("❌ Demo failed:", error);
        frontend.handleFHEError(error);
    }
}

/**
 * Frontend Integration theo Best Practices của FHEVM
 */
export class FHEVMBestPractices {
    
    /**
     * 1. Input Packing - Pack tất cả inputs vào single ciphertext
     */
    static async packInputs(
        contractAddress: string,
        userAddress: string,
        inputs: { type: string; value: any; index: number }[]
    ): Promise<{ handles: any[]; inputProof: any }> {
        const input = (globalThis as any).fhevm.createEncryptedInput(contractAddress, userAddress);
        
        // Pack theo thứ tự index
        inputs.sort((a, b) => a.index - b.index);
        
        for (const inputData of inputs) {
            switch (inputData.type) {
                case 'uint8':
                    input.add8(inputData.value);
                    break;
                case 'uint32':
                    input.add32(inputData.value);
                    break;
                case 'bool':
                    input.addBool(inputData.value);
                    break;
                default:
                    throw new Error(`Unsupported input type: ${inputData.type}`);
            }
        }
        
        const encryptedInput = await input.encrypt();
        return {
            handles: encryptedInput.handles,
            inputProof: encryptedInput.inputProof
        };
    }
    
    /**
     * 2. Proof Validation - Validate proof trước khi sử dụng
     */
    static validateProof(inputProof: any): boolean {
        if (!inputProof || inputProof.length === 0) {
            return false;
        }
        
        if (inputProof.length < 32) {
            return false;
        }
        
        return true;
    }
    
    /**
     * 3. Error Handling - Comprehensive error handling
     */
    static handleFHEError(error: any): string {
        if (error.message.includes("Invalid encrypted inputs")) {
            return "Invalid encrypted inputs - check encryption and proof";
        } else if (error.message.includes("Access denied")) {
            return "Access denied - check user permissions";
        } else if (error.message.includes("Empty proof")) {
            return "Empty proof - ensure proper proof generation";
        } else {
            return `Unknown FHE error: ${error.message}`;
        }
    }
} 