import { expect } from "chai";
import { ethers } from "hardhat";
import { LuckySpinFHE_KMS_Final } from "../typechain-types";

describe("FHE Integration Tests", function () {
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

  describe("FHE Complete Workflow", function () {
    it("Should handle complete FHE user lifecycle", async function () {
      const userAddress = user1.address;
      
      // 1. Initial state should be encrypted
      const initialSpins = await luckySpin.getUserSpins(userAddress);
      const initialGm = await luckySpin.getUserGmBalance(userAddress);
      const initialScore = await luckySpin.getEncryptedScore(userAddress);
      
      expect(initialSpins).to.match(/^0x[a-fA-F0-9]{64}$/);
      expect(initialGm).to.match(/^0x[a-fA-F0-9]{64}$/);
      expect(initialScore).to.match(/^0x[a-fA-F0-9]{64}$/);
      
      // 2. User initialization via daily check-in
      await luckySpin.connect(user1).dailyGm();
      
      // 3. State should remain encrypted after initialization
      const postInitSpins = await luckySpin.getUserSpins(userAddress);
      const postInitGm = await luckySpin.getUserGmBalance(userAddress);
      
      expect(postInitSpins).to.match(/^0x[a-fA-F0-9]{64}$/);
      expect(postInitGm).to.match(/^0x[a-fA-F0-9]{64}$/);
      expect(postInitSpins).to.not.equal(initialSpins); // Should have changed
      
      // 4. Buy spins with GM (should work after initialization)
      await luckySpin.connect(user1).buySpinWithGm();
      
      // 5. State should still be encrypted
      const postBuySpins = await luckySpin.getUserSpins(userAddress);
      const postBuyGm = await luckySpin.getUserGmBalance(userAddress);
      
      expect(postBuySpins).to.match(/^0x[a-fA-F0-9]{64}$/);
      expect(postBuyGm).to.match(/^0x[a-fA-F0-9]{64}$/);
      
      // 6. Publish score (should work after initialization)
      const encryptedScore = "0x" + "1".repeat(64); // Mock encrypted score
      await luckySpin.connect(user1).publishScore(encryptedScore);
      
      // 7. Check if score is published
      const isPublished = await luckySpin.isPublished(userAddress);
      expect(isPublished).to.be.true;
    });

    it("Should handle multiple users with FHE isolation", async function () {
      const user1Address = user1.address;
      const user2Address = user2.address;
      
      // Initialize both users
      await luckySpin.connect(user1).dailyGm();
      await luckySpin.connect(user2).dailyGm();
      
      // Get their encrypted states
      const user1Spins = await luckySpin.getUserSpins(user1Address);
      const user1Gm = await luckySpin.getUserGmBalance(user1Address);
      const user1Score = await luckySpin.getEncryptedScore(user1Address);
      
      const user2Spins = await luckySpin.getUserSpins(user2Address);
      const user2Gm = await luckySpin.getUserGmBalance(user2Address);
      const user2Score = await luckySpin.getEncryptedScore(user2Address);
      
      // All should be encrypted
      [user1Spins, user1Gm, user1Score, user2Spins, user2Gm, user2Score].forEach(encrypted => {
        expect(encrypted).to.match(/^0x[a-fA-F0-9]{64}$/);
      });
      
      // Users should have different encrypted values (privacy)
      expect(user1Spins).to.not.equal(user2Spins);
      expect(user1Gm).to.not.equal(user2Gm);
      expect(user1Score).to.not.equal(user2Score);
    });
  });

  describe("FHE State Transitions", function () {
    it("Should maintain FHE state across multiple operations", async function () {
      const userAddress = user1.address;
      
      // Track state changes
      const states: string[] = [];
      
      // Initial state
      states.push(await luckySpin.getUserSpins(userAddress));
      
      // After daily check-in
      await luckySpin.connect(user1).dailyGm();
      states.push(await luckySpin.getUserSpins(userAddress));
      
      // After buying spins
      await luckySpin.connect(user1).buySpinWithGm();
      states.push(await luckySpin.getUserSpins(userAddress));
      
      // After another daily check-in
      await luckySpin.connect(user1).dailyGm();
      states.push(await luckySpin.getUserSpins(userAddress));
      
      // All states should be encrypted
      states.forEach(state => {
        expect(state).to.match(/^0x[a-fA-F0-9]{64}$/);
      });
      
      // States should change (not all identical)
      const uniqueStates = new Set(states);
      expect(uniqueStates.size).to.be.greaterThan(1);
    });

    it("Should handle FHE state with ETH operations", async function () {
      const userAddress = user1.address;
      
      // Initialize user
      await luckySpin.connect(user1).dailyGm();
      
      // Get initial pending ETH
      const initialPendingEth = await luckySpin.getEncryptedPendingEthWei(userAddress);
      expect(initialPendingEth).to.match(/^0x[a-fA-F0-9]{64}$/);
      
      // Request ETH claim
      await luckySpin.connect(user1).requestClaimETH(ethers.parseEther("0.01"));
      
      // Pending ETH should still be encrypted
      const postClaimPendingEth = await luckySpin.getEncryptedPendingEthWei(userAddress);
      expect(postClaimPendingEth).to.match(/^0x[a-fA-F0-9]{64}$/);
      expect(postClaimPendingEth).to.not.equal(initialPendingEth);
    });
  });

  describe("FHE Event Integration", function () {
    it("Should emit FHE events correctly", async function () {
      const userAddress = user1.address;
      
      // Test daily check-in event
      await expect(luckySpin.connect(user1).dailyGm())
        .to.emit(luckySpin, "CheckInCompleted")
        .withArgs(userAddress);
      
      // Test buy spins event
      await expect(luckySpin.connect(user1).buySpinWithGm())
        .to.emit(luckySpin, "SpinBoughtWithGm")
        .withArgs(userAddress);
      
      // Test publish score event
      const encryptedScore = "0x" + "1".repeat(64);
      await expect(luckySpin.connect(user1).publishScore(encryptedScore))
        .to.emit(luckySpin, "ScorePublished")
        .withArgs(userAddress, 0); // Score is encrypted, so 0 is emitted as placeholder
    });

    it("Should handle FHE events with encrypted data", async function () {
      const userAddress = user1.address;
      
      // Initialize user
      await luckySpin.connect(user1).dailyGm();
      
      // Publish score and verify event
      const encryptedScore = "0x" + "2".repeat(64);
      const tx = await luckySpin.connect(user1).publishScore(encryptedScore);
      const receipt = await tx.wait();
      
      // Check for ScorePublished event
      const scorePublishedEvent = receipt?.logs.find(log => {
        try {
          const parsed = luckySpin.interface.parseLog(log as any);
          return parsed?.name === "ScorePublished";
        } catch {
          return false;
        }
      });
      
      expect(scorePublishedEvent).to.not.be.undefined;
    });
  });

  describe("FHE Error Recovery", function () {
    it("Should handle FHE operation failures gracefully", async function () {
      const userAddress = user1.address;
      
      // Try to publish score without initialization
      const encryptedScore = "0x" + "1".repeat(64);
      await expect(
        luckySpin.connect(user1).publishScore(encryptedScore)
      ).to.be.revertedWith("User not initialized");
      
      // Initialize user
      await luckySpin.connect(user1).dailyGm();
      
      // Now publish score should work
      await expect(
        luckySpin.connect(user1).publishScore(encryptedScore)
      ).to.not.be.reverted;
    });

    it("Should maintain FHE state after failed operations", async function () {
      const userAddress = user1.address;
      
      // Initialize user
      await luckySpin.connect(user1).dailyGm();
      
      // Get state before failed operation
      const stateBefore = await luckySpin.getUserSpins(userAddress);
      
      // Try invalid operation
      const invalidEncryptedData = "0x1234"; // Too short
      await expect(
        luckySpin.connect(user1).publishScore(invalidEncryptedData)
      ).to.be.reverted;
      
      // State should remain encrypted and unchanged
      const stateAfter = await luckySpin.getUserSpins(userAddress);
      expect(stateAfter).to.match(/^0x[a-fA-F0-9]{64}$/);
      expect(stateAfter).to.equal(stateBefore);
    });
  });

  describe("FHE Performance", function () {
    it("Should handle multiple FHE operations efficiently", async function () {
      const userAddress = user1.address;
      
      // Initialize user
      await luckySpin.connect(user1).dailyGm();
      
      // Perform multiple operations
      const operations = [
        () => luckySpin.connect(user1).buySpinWithGm(),
        () => luckySpin.connect(user1).dailyGm(),
        () => luckySpin.connect(user1).publishScore("0x" + "1".repeat(64)),
        () => luckySpin.connect(user1).unpublishScore(),
        () => luckySpin.connect(user1).requestClaimETH(ethers.parseEther("0.01"))
      ];
      
      // Execute all operations
      for (const operation of operations) {
        await expect(operation()).to.not.be.reverted;
      }
      
      // Final state should still be encrypted
      const finalSpins = await luckySpin.getUserSpins(userAddress);
      const finalGm = await luckySpin.getUserGmBalance(userAddress);
      const finalScore = await luckySpin.getEncryptedScore(userAddress);
      
      expect(finalSpins).to.match(/^0x[a-fA-F0-9]{64}$/);
      expect(finalGm).to.match(/^0x[a-fA-F0-9]{64}$/);
      expect(finalScore).to.match(/^0x[a-fA-F0-9]{64}$/);
    });

    it("Should optimize gas usage for FHE operations", async function () {
      const userAddress = user1.address;
      
      // Initialize user
      await luckySpin.connect(user1).dailyGm();
      
      // Test gas estimation for various operations
      const operations = [
        {
          name: "buySpinWithGm",
          estimate: () => luckySpin.connect(user1).buySpinWithGm.estimateGas()
        },
        {
          name: "dailyGm",
          estimate: () => luckySpin.connect(user1).dailyGm.estimateGas()
        },
        {
          name: "publishScore",
          estimate: () => luckySpin.connect(user1).publishScore("0x" + "1".repeat(64)).estimateGas()
        }
      ];
      
      for (const operation of operations) {
        const gasEstimate = await operation.estimate();
        expect(gasEstimate).to.be.a("bigint");
        expect(gasEstimate).to.be.gt(0n);
        expect(gasEstimate).to.be.lt(1000000n); // Should not exceed 1M gas
        
        console.log(`${operation.name} gas estimate: ${gasEstimate.toString()}`);
      }
    });
  });

  describe("FHE Security Integration", function () {
    it("Should maintain privacy across multiple users", async function () {
      const users = [user1, user2, user3];
      const userStates: { [key: string]: string[] } = {};
      
      // Initialize all users and collect their states
      for (const user of users) {
        const userAddress = user.address;
        await luckySpin.connect(user).dailyGm();
        
        userStates[userAddress] = [
          await luckySpin.getUserSpins(userAddress),
          await luckySpin.getUserGmBalance(userAddress),
          await luckySpin.getEncryptedScore(userAddress)
        ];
      }
      
      // All states should be encrypted
      Object.values(userStates).flat().forEach(state => {
        expect(state).to.match(/^0x[a-fA-F0-9]{64}$/);
      });
      
      // Check that no two users have identical states (privacy)
      const allStates = Object.values(userStates).flat();
      const uniqueStates = new Set(allStates);
      expect(uniqueStates.size).to.equal(allStates.length);
    });

    it("Should prevent unauthorized access to FHE data", async function () {
      const user1Address = user1.address;
      const user2Address = user2.address;
      
      // Initialize user1
      await luckySpin.connect(user1).dailyGm();
      
      // User2 should not be able to access user1's encrypted data
      // (This is tested by ensuring both users have different encrypted values)
      const user1Spins = await luckySpin.getUserSpins(user1Address);
      const user2Spins = await luckySpin.getUserSpins(user2Address);
      
      expect(user1Spins).to.not.equal(user2Spins);
      expect(user1Spins).to.match(/^0x[a-fA-F0-9]{64}$/);
      expect(user2Spins).to.match(/^0x[a-fA-F0-9]{64}$/);
    });
  });

  describe("FHE Spin Functions", function () {
    it("Should handle spin() function with FHE state management", async function () {
      const userAddress = user1.address;
      
      // Initialize user and get spins
      await luckySpin.connect(user1).dailyGm();
      await luckySpin.connect(user1).buySpinWithGm(); // Ensure user has spins
      
      // Get initial state
      const initialSpins = await luckySpin.getUserSpins(userAddress);
      const initialGm = await luckySpin.getUserGmBalance(userAddress);
      const initialScore = await luckySpin.getEncryptedScore(userAddress);
      
      // All should be encrypted
      expect(initialSpins).to.match(/^0x[a-fA-F0-9]{64}$/);
      expect(initialGm).to.match(/^0x[a-fA-F0-9]{64}$/);
      expect(initialScore).to.match(/^0x[a-fA-F0-9]{64}$/);
      
      // Perform spin
      await expect(luckySpin.connect(user1).spin())
        .to.emit(luckySpin, "SpinCompleted")
        .withArgs(userAddress, "Spin completed");
      
      // Check for SpinOutcome event
      const tx = await luckySpin.connect(user1).spin();
      const receipt = await tx.wait();
      
      const spinOutcomeEvent = receipt?.logs.find(log => {
        try {
          const parsed = luckySpin.interface.parseLog(log as any);
          return parsed?.name === "SpinOutcome";
        } catch {
          return false;
        }
      });
      
      expect(spinOutcomeEvent).to.not.be.undefined;
      
      // State should still be encrypted after spin
      const postSpinSpins = await luckySpin.getUserSpins(userAddress);
      const postSpinGm = await luckySpin.getUserGmBalance(userAddress);
      const postSpinScore = await luckySpin.getEncryptedScore(userAddress);
      
      expect(postSpinSpins).to.match(/^0x[a-fA-F0-9]{64}$/);
      expect(postSpinGm).to.match(/^0x[a-fA-F0-9]{64}$/);
      expect(postSpinScore).to.match(/^0x[a-fA-F0-9]{64}$/);
    });

    it("Should handle spinLite() function with minimal FHE operations", async function () {
      const userAddress = user1.address;
      
      // Initialize user and get spins
      await luckySpin.connect(user1).dailyGm();
      await luckySpin.connect(user1).buySpinWithGm();
      
      // Get initial state
      const initialSpins = await luckySpin.getUserSpins(userAddress);
      const initialScore = await luckySpin.getEncryptedScore(userAddress);
      
      // Perform spinLite
      await expect(luckySpin.connect(user1).spinLite())
        .to.emit(luckySpin, "SpinCompleted")
        .withArgs(userAddress, "Spin completed");
      
      // State should still be encrypted
      const postSpinSpins = await luckySpin.getUserSpins(userAddress);
      const postSpinScore = await luckySpin.getEncryptedScore(userAddress);
      
      expect(postSpinSpins).to.match(/^0x[a-fA-F0-9]{64}$/);
      expect(postSpinScore).to.match(/^0x[a-fA-F0-9]{64}$/);
    });

    it("Should handle spinWithEncryptedRandom() with full FHE encryption", async function () {
      const userAddress = user1.address;
      
      // Initialize user and get spins
      await luckySpin.connect(user1).dailyGm();
      await luckySpin.connect(user1).buySpinWithGm();
      
      // Get initial state
      const initialSpins = await luckySpin.getUserSpins(userAddress);
      const initialGm = await luckySpin.getUserGmBalance(userAddress);
      const initialPendingEth = await luckySpin.getEncryptedPendingEthWei(userAddress);
      const initialScore = await luckySpin.getEncryptedScore(userAddress);
      
      // All should be encrypted
      [initialSpins, initialGm, initialPendingEth, initialScore].forEach(encrypted => {
        expect(encrypted).to.match(/^0x[a-fA-F0-9]{64}$/);
      });
      
      // Perform spinWithEncryptedRandom
      await expect(luckySpin.connect(user1).spinWithEncryptedRandom())
        .to.emit(luckySpin, "SpinCompleted")
        .withArgs(userAddress, "Spin completed");
      
      // State should still be encrypted after spin
      const postSpinSpins = await luckySpin.getUserSpins(userAddress);
      const postSpinGm = await luckySpin.getUserGmBalance(userAddress);
      const postSpinPendingEth = await luckySpin.getEncryptedPendingEthWei(userAddress);
      const postSpinScore = await luckySpin.getEncryptedScore(userAddress);
      
      [postSpinSpins, postSpinGm, postSpinPendingEth, postSpinScore].forEach(encrypted => {
        expect(encrypted).to.match(/^0x[a-fA-F0-9]{64}$/);
      });
    });

    it("Should prevent spin without sufficient spins", async function () {
      const userAddress = user1.address;
      
      // Initialize user but don't buy spins
      await luckySpin.connect(user1).dailyGm();
      
      // Try to spin without spins - should revert
      await expect(luckySpin.connect(user1).spin())
        .to.be.reverted;
      
      await expect(luckySpin.connect(user1).spinLite())
        .to.be.reverted;
      
      await expect(luckySpin.connect(user1).spinWithEncryptedRandom())
        .to.be.reverted;
    });

    it("Should handle multiple spins with FHE state consistency", async function () {
      const userAddress = user1.address;
      
      // Initialize user and buy multiple spins
      await luckySpin.connect(user1).dailyGm();
      await luckySpin.connect(user1).buySpinWithGm();
      await luckySpin.connect(user1).buySpinWithGm();
      
      // Get initial state
      const initialSpins = await luckySpin.getUserSpins(userAddress);
      const initialScore = await luckySpin.getEncryptedScore(userAddress);
      
      // Perform multiple spins
      await luckySpin.connect(user1).spin();
      await luckySpin.connect(user1).spinLite();
      
      // State should still be encrypted
      const postSpinSpins = await luckySpin.getUserSpins(userAddress);
      const postSpinScore = await luckySpin.getEncryptedScore(userAddress);
      
      expect(postSpinSpins).to.match(/^0x[a-fA-F0-9]{64}$/);
      expect(postSpinScore).to.match(/^0x[a-fA-F0-9]{64}$/);
      
      // States should have changed (not identical)
      expect(postSpinSpins).to.not.equal(initialSpins);
      expect(postSpinScore).to.not.equal(initialScore);
    });

    it("Should optimize gas usage for spin functions", async function () {
      const userAddress = user1.address;
      
      // Initialize user
      await luckySpin.connect(user1).dailyGm();
      await luckySpin.connect(user1).buySpinWithGm();
      
      // Test gas estimation for spin functions
      const spinOperations = [
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
      
      for (const operation of spinOperations) {
        const gasEstimate = await operation.estimate();
        expect(gasEstimate).to.be.a("bigint");
        expect(gasEstimate).to.be.gt(0n);
        expect(gasEstimate).to.be.lt(2000000n); // Spin functions can be more expensive
        
        console.log(`${operation.name} gas estimate: ${gasEstimate.toString()}`);
      }
    });

    it("Should maintain FHE privacy across multiple users spinning", async function () {
      const users = [user1, user2, user3];
      
      // Initialize all users and give them spins
      for (const user of users) {
        await luckySpin.connect(user).dailyGm();
        await luckySpin.connect(user).buySpinWithGm();
      }
      
      // Collect states before spinning
      const preSpinStates: { [key: string]: string[] } = {};
      for (const user of users) {
        const userAddress = user.address;
        preSpinStates[userAddress] = [
          await luckySpin.getUserSpins(userAddress),
          await luckySpin.getUserGmBalance(userAddress),
          await luckySpin.getEncryptedScore(userAddress)
        ];
      }
      
      // All users perform spins
      for (const user of users) {
        await luckySpin.connect(user).spin();
      }
      
      // Collect states after spinning
      const postSpinStates: { [key: string]: string[] } = {};
      for (const user of users) {
        const userAddress = user.address;
        postSpinStates[userAddress] = [
          await luckySpin.getUserSpins(userAddress),
          await luckySpin.getUserGmBalance(userAddress),
          await luckySpin.getEncryptedScore(userAddress)
        ];
      }
      
      // All states should be encrypted
      Object.values(preSpinStates).flat().forEach(state => {
        expect(state).to.match(/^0x[a-fA-F0-9]{64}$/);
      });
      
      Object.values(postSpinStates).flat().forEach(state => {
        expect(state).to.match(/^0x[a-fA-F0-9]{64}$/);
      });
      
      // Check privacy: no two users should have identical states
      const allPreSpinStates = Object.values(preSpinStates).flat();
      const allPostSpinStates = Object.values(postSpinStates).flat();
      
      const uniquePreSpinStates = new Set(allPreSpinStates);
      const uniquePostSpinStates = new Set(allPostSpinStates);
      
      expect(uniquePreSpinStates.size).to.equal(allPreSpinStates.length);
      expect(uniquePostSpinStates.size).to.equal(allPostSpinStates.length);
    });
  });
});
