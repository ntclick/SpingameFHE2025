import { expect } from "chai";
import { ethers } from "hardhat";
import { LuckySpinFHE_KMS_Final } from "../typechain-types";

describe("FHE Performance Tests", function () {
  let luckySpin: LuckySpinFHE_KMS_Final;
  let owner: any;
  let user1: any;
  let user2: any;
  let user3: any;

  beforeEach(async function () {
    [owner, user1, user2, user3] = await ethers.getSigners();
    
    const LuckySpinFHE_KMS_Final = await ethers.getContractFactory("LuckySpinFHE_KMS_Final");
    luckySpin = await LuckySpinFHE_KMS_Final.deploy();
    await luckySpin.waitForDeployment();
  });

  describe("FHE Gas Optimization", function () {
    it("Should optimize gas for basic FHE operations", async function () {
      const userAddress = user1.address;
      
      // Initialize user and give spins for spin functions
      await luckySpin.connect(user1).dailyGm();
      await luckySpin.connect(user1).buySpinWithGm();
      
      // Test gas estimation for various operations
      const operations = [
        {
          name: "dailyGm",
          estimate: () => luckySpin.connect(user1).dailyGm.estimateGas()
        },
        {
          name: "buySpinWithGm",
          estimate: () => luckySpin.connect(user1).buySpinWithGm.estimateGas()
        },
        {
          name: "publishScore",
          estimate: () => luckySpin.connect(user1).publishScore("0x" + "1".repeat(64)).estimateGas()
        },
        {
          name: "unpublishScore",
          estimate: () => luckySpin.connect(user1).unpublishScore.estimateGas()
        },
        {
          name: "requestClaimETH",
          estimate: () => luckySpin.connect(user1).requestClaimETH(ethers.parseEther("0.01")).estimateGas()
        },
        {
          name: "spin",
          estimate: () => luckySpin.connect(user1).spin().estimateGas()
        },
        {
          name: "spinLite",
          estimate: () => luckySpin.connect(user1).spinLite().estimateGas()
        },
        {
          name: "spinWithEncryptedRandom",
          estimate: () => luckySpin.connect(user1).spinWithEncryptedRandom().estimateGas()
        }
      ];
      
      for (const operation of operations) {
        const gasEstimate = await operation.estimate();
        expect(gasEstimate).to.be.a("bigint");
        expect(gasEstimate).to.be.gt(0n);
        
        // FHE operations should be reasonably gas efficient
        expect(gasEstimate).to.be.lt(500000n); // Should not exceed 500k gas
        
        console.log(`${operation.name} gas estimate: ${gasEstimate.toString()}`);
      }
    });

    it("Should optimize gas for FHE parameter validation", async function () {
      const userAddress = user1.address;
      
      // Initialize user
      await luckySpin.connect(user1).dailyGm();
      
      // Test gas for different encrypted parameter sizes
      const testScores = [
        "0x" + "0".repeat(64), // Zero score
        "0x" + "1".repeat(64), // Small score
        "0x" + "f".repeat(64)  // Large score
      ];
      
      for (const score of testScores) {
        const gasEstimate = await luckySpin.connect(user1).publishScore(score).estimateGas();
        expect(gasEstimate).to.be.a("bigint");
        expect(gasEstimate).to.be.gt(0n);
        expect(gasEstimate).to.be.lt(500000n);
        
        console.log(`publishScore(${score.slice(0, 10)}...) gas: ${gasEstimate.toString()}`);
      }
    });

    it("Should optimize gas for batch operations", async function () {
      const users = [user1, user2, user3];
      
      // Initialize all users
      for (const user of users) {
        await luckySpin.connect(user).dailyGm();
      }
      
      // Test gas for multiple users performing operations
      const operations = [];
      
      for (const user of users) {
        operations.push(
          luckySpin.connect(user).buySpinWithGm(),
          luckySpin.connect(user).publishScore("0x" + "1".repeat(64))
        );
      }
      
      // Execute operations and measure gas
      for (const operation of operations) {
        const tx = await operation;
        const receipt = await tx.wait();
        
        expect(receipt?.gasUsed).to.be.a("bigint");
        expect(receipt?.gasUsed).to.be.gt(0n);
        expect(receipt?.gasUsed).to.be.lt(500000n);
        
        console.log(`Operation gas used: ${receipt?.gasUsed.toString()}`);
      }
    });
  });

  describe("FHE Memory Efficiency", function () {
    it("Should handle large numbers of users efficiently", async function () {
      const users = [user1, user2, user3];
      
      // Initialize multiple users
      for (const user of users) {
        await luckySpin.connect(user).dailyGm();
      }
      
      // Test that contract can handle multiple user states
      for (const user of users) {
        const userAddress = user.address;
        
        const spins = await luckySpin.getUserSpins(userAddress);
        const gm = await luckySpin.getUserGmBalance(userAddress);
        const score = await luckySpin.getEncryptedScore(userAddress);
        
        // All states should be encrypted and accessible
        expect(spins).to.match(/^0x[a-fA-F0-9]{64}$/);
        expect(gm).to.match(/^0x[a-fA-F0-9]{64}$/);
        expect(score).to.match(/^0x[a-fA-F0-9]{64}$/);
      }
    });

    it("Should optimize storage for encrypted data", async function () {
      const userAddress = user1.address;
      
      // Initialize user
      await luckySpin.connect(user1).dailyGm();
      
      // Get storage slots for encrypted data
      const spins = await luckySpin.getUserSpins(userAddress);
      const gm = await luckySpin.getUserGmBalance(userAddress);
      const score = await luckySpin.getEncryptedScore(userAddress);
      const pendingEth = await luckySpin.getEncryptedPendingEthWei(userAddress);
      
      // All encrypted data should be exactly 32 bytes (256 bits)
      expect(spins.length).to.equal(66); // 0x + 64 hex chars
      expect(gm.length).to.equal(66);
      expect(score.length).to.equal(66);
      expect(pendingEth.length).to.equal(66);
      
      // Verify they're all valid hex strings
      [spins, gm, score, pendingEth].forEach(data => {
        expect(data).to.match(/^0x[a-fA-F0-9]{64}$/);
      });
    });
  });

  describe("FHE Computational Efficiency", function () {
    it("Should handle rapid successive operations", async function () {
      const userAddress = user1.address;
      
      // Initialize user
      await luckySpin.connect(user1).dailyGm();
      
      // Perform rapid successive operations
      const operations = [
        () => luckySpin.connect(user1).buySpinWithGm(),
        () => luckySpin.connect(user1).dailyGm(),
        () => luckySpin.connect(user1).publishScore("0x" + "1".repeat(64)),
        () => luckySpin.connect(user1).unpublishScore(),
        () => luckySpin.connect(user1).requestClaimETH(ethers.parseEther("0.01"))
      ];
      
      // Execute all operations rapidly
      for (const operation of operations) {
        await expect(operation()).to.not.be.reverted;
      }
      
      // Final state should be consistent
      const finalSpins = await luckySpin.getUserSpins(userAddress);
      const finalGm = await luckySpin.getUserGmBalance(userAddress);
      const finalScore = await luckySpin.getEncryptedScore(userAddress);
      
      expect(finalSpins).to.match(/^0x[a-fA-F0-9]{64}$/);
      expect(finalGm).to.match(/^0x[a-fA-F0-9]{64}$/);
      expect(finalScore).to.match(/^0x[a-fA-F0-9]{64}$/);
    });

    it("Should optimize computation for FHE operations", async function () {
      const userAddress = user1.address;
      
      // Initialize user
      await luckySpin.connect(user1).dailyGm();
      
      // Test computation efficiency with different operation sequences
      const testSequences = [
        // Sequence 1: Basic operations
        [
          () => luckySpin.connect(user1).buySpinWithGm(),
          () => luckySpin.connect(user1).publishScore("0x" + "1".repeat(64))
        ],
        // Sequence 2: Multiple state changes
        [
          () => luckySpin.connect(user1).dailyGm(),
          () => luckySpin.connect(user1).buySpinWithGm(),
          () => luckySpin.connect(user1).requestClaimETH(ethers.parseEther("0.01"))
        ],
        // Sequence 3: Score operations
        [
          () => luckySpin.connect(user1).publishScore("0x" + "2".repeat(64)),
          () => luckySpin.connect(user1).unpublishScore(),
          () => luckySpin.connect(user1).publishScore("0x" + "3".repeat(64))
        ]
      ];
      
      for (let i = 0; i < testSequences.length; i++) {
        const sequence = testSequences[i];
        console.log(`Testing sequence ${i + 1}...`);
        
        for (const operation of sequence) {
          const startTime = Date.now();
          await expect(operation()).to.not.be.reverted;
          const endTime = Date.now();
          
          const duration = endTime - startTime;
          console.log(`Operation completed in ${duration}ms`);
          
          // Operations should complete within reasonable time
          expect(duration).to.be.lt(10000); // Should complete within 10 seconds
        }
      }
    });
  });

  describe("FHE Scalability", function () {
    it("Should scale with multiple concurrent users", async function () {
      const users = [user1, user2, user3];
      
      // Initialize all users concurrently
      const initPromises = users.map(user => luckySpin.connect(user).dailyGm());
      await Promise.all(initPromises);
      
      // Perform operations concurrently
      const operationPromises = users.map(user => 
        luckySpin.connect(user).buySpinWithGm()
      );
      await Promise.all(operationPromises);
      
      // Verify all users have encrypted states
      for (const user of users) {
        const userAddress = user.address;
        const spins = await luckySpin.getUserSpins(userAddress);
        const gm = await luckySpin.getUserGmBalance(userAddress);
        
        expect(spins).to.match(/^0x[a-fA-F0-9]{64}$/);
        expect(gm).to.match(/^0x[a-fA-F0-9]{64}$/);
      }
    });

    it("Should handle large transaction volumes", async function () {
      const userAddress = user1.address;
      
      // Initialize user
      await luckySpin.connect(user1).dailyGm();
      
      // Perform many operations in sequence
      const operations = [];
      for (let i = 0; i < 10; i++) {
        operations.push(
          luckySpin.connect(user1).buySpinWithGm(),
          luckySpin.connect(user1).publishScore("0x" + i.toString().repeat(64))
        );
      }
      
      // Execute all operations
      for (const operation of operations) {
        await expect(operation()).to.not.be.reverted;
      }
      
      // Final state should be consistent
      const finalSpins = await luckySpin.getUserSpins(userAddress);
      const finalScore = await luckySpin.getEncryptedScore(userAddress);
      
      expect(finalSpins).to.match(/^0x[a-fA-F0-9]{64}$/);
      expect(finalScore).to.match(/^0x[a-fA-F0-9]{64}$/);
    });
  });

  describe("FHE Resource Management", function () {
    it("Should manage gas limits efficiently", async function () {
      const userAddress = user1.address;
      
      // Initialize user
      await luckySpin.connect(user1).dailyGm();
      
      // Test gas estimation with different gas limits
      const gasLimits = [100000, 200000, 500000, 1000000];
      
      for (const gasLimit of gasLimits) {
        const gasEstimate = await luckySpin.connect(user1).buySpinWithGm().estimateGas();
        
        expect(gasEstimate).to.be.a("bigint");
        expect(gasEstimate).to.be.gt(0n);
        
        // Gas estimate should be reasonable
        expect(gasEstimate).to.be.lt(BigInt(gasLimit));
        
        console.log(`Gas limit ${gasLimit}: estimate ${gasEstimate.toString()}`);
      }
    });

    it("Should optimize storage costs", async function () {
      const userAddress = user1.address;
      
      // Initialize user
      await luckySpin.connect(user1).dailyGm();
      
      // Get initial storage state
      const initialSpins = await luckySpin.getUserSpins(userAddress);
      
      // Perform operations that modify state
      await luckySpin.connect(user1).buySpinWithGm();
      await luckySpin.connect(user1).publishScore("0x" + "1".repeat(64));
      
      // Get final storage state
      const finalSpins = await luckySpin.getUserSpins(userAddress);
      const finalScore = await luckySpin.getEncryptedScore(userAddress);
      
      // All storage should remain encrypted and consistent
      expect(initialSpins).to.match(/^0x[a-fA-F0-9]{64}$/);
      expect(finalSpins).to.match(/^0x[a-fA-F0-9]{64}$/);
      expect(finalScore).to.match(/^0x[a-fA-F0-9]{64}$/);
      
      // Storage should be efficient (all values exactly 32 bytes)
      expect(initialSpins.length).to.equal(66);
      expect(finalSpins.length).to.equal(66);
      expect(finalScore.length).to.equal(66);
    });
  });

  describe("FHE Benchmarking", function () {
    it("Should benchmark FHE operation performance", async function () {
      const userAddress = user1.address;
      
      // Initialize user
      await luckySpin.connect(user1).dailyGm();
      
      // Benchmark different operations
      const benchmarks = [
        {
          name: "dailyGm",
          operation: () => luckySpin.connect(user1).dailyGm()
        },
        {
          name: "buySpinWithGm",
          operation: () => luckySpin.connect(user1).buySpinWithGm()
        },
        {
          name: "publishScore",
          operation: () => luckySpin.connect(user1).publishScore("0x" + "1".repeat(64))
        },
        {
          name: "unpublishScore",
          operation: () => luckySpin.connect(user1).unpublishScore()
        }
      ];
      
      for (const benchmark of benchmarks) {
        console.log(`\nBenchmarking ${benchmark.name}...`);
        
        // Measure gas estimation
        const gasEstimate = await benchmark.operation().estimateGas();
        console.log(`Gas estimate: ${gasEstimate.toString()}`);
        
        // Measure execution time
        const startTime = Date.now();
        const tx = await benchmark.operation();
        const receipt = await tx.wait();
        const endTime = Date.now();
        
        const executionTime = endTime - startTime;
        const gasUsed = receipt?.gasUsed || 0n;
        
        console.log(`Execution time: ${executionTime}ms`);
        console.log(`Gas used: ${gasUsed.toString()}`);
        console.log(`Gas efficiency: ${gasUsed.toString()} / ${gasEstimate.toString()}`);
        
        // Performance assertions
        expect(gasEstimate).to.be.gt(0n);
        expect(gasEstimate).to.be.lt(500000n);
        expect(executionTime).to.be.lt(10000); // Should complete within 10 seconds
      }
    });

    it("Should compare FHE vs non-FHE operation costs", async function () {
      const userAddress = user1.address;
      
      // Initialize user
      await luckySpin.connect(user1).dailyGm();
      
      // Compare gas costs for different operation types
      const operations = [
        {
          name: "dailyGm (public)",
          operation: () => luckySpin.connect(user1).dailyGm()
        },
        {
          name: "buySpinWithGm (public)",
          operation: () => luckySpin.connect(user1).buySpinWithGm()
        },
        {
          name: "publishScore (FHE)",
          operation: () => luckySpin.connect(user1).publishScore("0x" + "1".repeat(64))
        },
        {
          name: "unpublishScore (public)",
          operation: () => luckySpin.connect(user1).unpublishScore()
        }
      ];
      
      console.log("\nGas Cost Comparison:");
      for (const op of operations) {
        const gasEstimate = await op.operation().estimateGas();
        console.log(`${op.name}: ${gasEstimate.toString()} gas`);
        
        expect(gasEstimate).to.be.gt(0n);
        expect(gasEstimate).to.be.lt(1000000n);
      }
    });
  });
});
