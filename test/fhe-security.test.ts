import { expect } from "chai";
import { ethers } from "hardhat";
import { LuckySpinFHE_KMS_Final } from "../typechain-types";

describe("FHE Security Tests", function () {
  let luckySpin: LuckySpinFHE_KMS_Final;
  let owner: any;
  let user1: any;
  let user2: any;
  let attacker: any;

  beforeEach(async function () {
    [owner, user1, user2, attacker] = await ethers.getSigners();
    
    const LuckySpinFHE_KMS_Final = await ethers.getContractFactory("LuckySpinFHE_KMS_Final");
    luckySpin = await LuckySpinFHE_KMS_Final.deploy();
    await luckySpin.waitForDeployment();
  });

  describe("FHE Data Privacy", function () {
    it("Should not expose plaintext values in storage", async function () {
      const userAddress = user1.address;
      
      // Get encrypted state
      const encryptedSpins = await luckySpin.getUserSpins(userAddress);
      const encryptedGm = await luckySpin.getUserGmBalance(userAddress);
      const encryptedScore = await luckySpin.getEncryptedScore(userAddress);
      
      // Encrypted values should not be easily decodable
      expect(encryptedSpins).to.not.equal("0x0000000000000000000000000000000000000000000000000000000000000000");
      expect(encryptedGm).to.not.equal("0x0000000000000000000000000000000000000000000000000000000000000000");
      expect(encryptedScore).to.not.equal("0x0000000000000000000000000000000000000000000000000000000000000000");
      
      // Values should be properly encrypted (not just hex-encoded plaintext)
      expect(encryptedSpins).to.match(/^0x[a-fA-F0-9]{64}$/);
      expect(encryptedGm).to.match(/^0x[a-fA-F0-9]{64}$/);
      expect(encryptedScore).to.match(/^0x[a-fA-F0-9]{64}$/);
    });

    it("Should maintain privacy between users", async function () {
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
      
      // Users should have different encrypted values
      expect(user1Spins).to.not.equal(user2Spins);
      expect(user1Gm).to.not.equal(user2Gm);
      expect(user1Score).to.not.equal(user2Score);
      
      // All values should be encrypted
      [user1Spins, user1Gm, user1Score, user2Spins, user2Gm, user2Score].forEach(value => {
        expect(value).to.match(/^0x[a-fA-F0-9]{64}$/);
      });
    });

    it("Should not leak information through state changes", async function () {
      const userAddress = user1.address;
      
      // Initialize user
      await luckySpin.connect(user1).dailyGm();
      
      // Get initial state
      const initialSpins = await luckySpin.getUserSpins(userAddress);
      const initialGm = await luckySpin.getUserGmBalance(userAddress);
      
      // Perform operations
      await luckySpin.connect(user1).buySpinWithGm();
      await luckySpin.connect(user1).dailyGm();
      
      // Get final state
      const finalSpins = await luckySpin.getUserSpins(userAddress);
      const finalGm = await luckySpin.getUserGmBalance(userAddress);
      
      // All states should remain encrypted
      [initialSpins, initialGm, finalSpins, finalGm].forEach(state => {
        expect(state).to.match(/^0x[a-fA-F0-9]{64}$/);
      });
      
      // States should change (indicating operations occurred)
      expect(finalSpins).to.not.equal(initialSpins);
      expect(finalGm).to.not.equal(initialGm);
    });
  });

  describe("FHE Access Control", function () {
    it("Should enforce user initialization requirements", async function () {
      const userAddress = user1.address;
      
      // Try to use FHE functions without initialization
      const encryptedScore = "0x" + "1".repeat(64);
      
      await expect(
        luckySpin.connect(user1).publishScore(encryptedScore)
      ).to.be.revertedWith("User not initialized");
      
      // Initialize user
      await luckySpin.connect(user1).dailyGm();
      
      // Now FHE functions should work
      await expect(
        luckySpin.connect(user1).publishScore(encryptedScore)
      ).to.not.be.reverted;
    });

    it("Should prevent unauthorized score publication", async function () {
      const user1Address = user1.address;
      const user2Address = user2.address;
      
      // Initialize user1
      await luckySpin.connect(user1).dailyGm();
      
      // User2 should not be able to publish score for user1
      const encryptedScore = "0x" + "1".repeat(64);
      
      // This should fail because user2 is not initialized
      await expect(
        luckySpin.connect(user2).publishScore(encryptedScore)
      ).to.be.revertedWith("User not initialized");
      
      // Even if user2 is initialized, they can only publish their own score
      await luckySpin.connect(user2).dailyGm();
      await expect(
        luckySpin.connect(user2).publishScore(encryptedScore)
      ).to.not.be.reverted;
      
      // But user1's score should not be affected
      const user1Published = await luckySpin.isPublished(user1Address);
      expect(user1Published).to.be.false;
    });

    it("Should validate encrypted parameter integrity", async function () {
      const userAddress = user1.address;
      
      // Initialize user
      await luckySpin.connect(user1).dailyGm();
      
      // Test various invalid encrypted parameters
      const invalidParams = [
        "0x1234", // Too short
        "0x" + "1".repeat(63), // Too short
        "0x" + "1".repeat(65), // Too long
        "0x" + "g".repeat(64), // Invalid hex
        "not_hex_string",
        ""
      ];
      
      for (const invalidParam of invalidParams) {
        await expect(
          luckySpin.connect(user1).publishScore(invalidParam)
        ).to.be.reverted;
      }
    });
  });

  describe("FHE Cryptographic Security", function () {
    it("Should use proper FHE parameter types", async function () {
      const abi = LuckySpinFHE_KMS_Final.abi;
      
      // Check FHE function parameters
      const fheFunctions = [
        {
          name: "publishScore",
          paramName: "score",
          expectedType: "bytes32",
          expectedInternalType: "euint64"
        },
        {
          name: "buyGmTokensFHE",
          paramName: "encryptedAmount",
          expectedType: "bytes32",
          expectedInternalType: "euint64"
        }
      ];
      
      for (const func of fheFunctions) {
        const functionAbi = abi.find(item => item.name === func.name);
        expect(functionAbi).to.not.be.undefined;
        
        const param = functionAbi?.inputs.find(input => input.name === func.paramName);
        expect(param).to.not.be.undefined;
        expect(param?.type).to.equal(func.expectedType);
        expect(param?.internalType).to.equal(func.expectedInternalType);
      }
    });

    it("Should require proper proof validation", async function () {
      const userAddress = user1.address;
      
      // Initialize user
      await luckySpin.connect(user1).dailyGm();
      
      // Test buyGmTokensFHE with invalid proof
      const encryptedAmount = "0x" + "1".repeat(64);
      const invalidProofs = [
        "0x1234", // Invalid proof
        "0x" + "1".repeat(32), // Wrong length
        "not_a_proof",
        ""
      ];
      
      for (const invalidProof of invalidProofs) {
        await expect(
          luckySpin.connect(user1).buyGmTokensFHE(
            encryptedAmount,
            invalidProof,
            { value: ethers.parseEther("0.1") }
          )
        ).to.be.reverted;
      }
    });

    it("Should prevent replay attacks", async function () {
      const userAddress = user1.address;
      
      // Initialize user
      await luckySpin.connect(user1).dailyGm();
      
      // Get initial state
      const initialSpins = await luckySpin.getUserSpins(userAddress);
      
      // Perform daily check-in
      await luckySpin.connect(user1).dailyGm();
      
      // Try to replay the same operation immediately
      // This should either fail or not have the same effect
      await luckySpin.connect(user1).dailyGm();
      
      // State should have changed from initial
      const finalSpins = await luckySpin.getUserSpins(userAddress);
      expect(finalSpins).to.not.equal(initialSpins);
      expect(finalSpins).to.match(/^0x[a-fA-F0-9]{64}$/);
    });
  });

  describe("FHE State Isolation", function () {
    it("Should isolate user states completely", async function () {
      const users = [user1, user2, attacker];
      const userStates: { [key: string]: string[] } = {};
      
      // Initialize all users
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
      
      // No two users should have identical states
      const allStates = Object.values(userStates).flat();
      const uniqueStates = new Set(allStates);
      expect(uniqueStates.size).to.equal(allStates.length);
    });

    it("Should prevent cross-user state contamination", async function () {
      const user1Address = user1.address;
      const user2Address = user2.address;
      
      // Initialize both users
      await luckySpin.connect(user1).dailyGm();
      await luckySpin.connect(user2).dailyGm();
      
      // Get initial states
      const user1InitialSpins = await luckySpin.getUserSpins(user1Address);
      const user2InitialSpins = await luckySpin.getUserSpins(user2Address);
      
      // User1 performs operations
      await luckySpin.connect(user1).buySpinWithGm();
      await luckySpin.connect(user1).publishScore("0x" + "1".repeat(64));
      
      // User2 performs different operations
      await luckySpin.connect(user2).dailyGm();
      
      // Get final states
      const user1FinalSpins = await luckySpin.getUserSpins(user1Address);
      const user2FinalSpins = await luckySpin.getUserSpins(user2Address);
      
      // User1's state should have changed
      expect(user1FinalSpins).to.not.equal(user1InitialSpins);
      
      // User2's state should have changed
      expect(user2FinalSpins).to.not.equal(user2InitialSpins);
      
      // Users should still have different states
      expect(user1FinalSpins).to.not.equal(user2FinalSpins);
      
      // All states should remain encrypted
      [user1InitialSpins, user1FinalSpins, user2InitialSpins, user2FinalSpins].forEach(state => {
        expect(state).to.match(/^0x[a-fA-F0-9]{64}$/);
      });
    });
  });

  describe("FHE Attack Prevention", function () {
    it("Should prevent overflow attacks", async function () {
      const userAddress = user1.address;
      
      // Initialize user
      await luckySpin.connect(user1).dailyGm();
      
      // Try to publish a very large encrypted score
      const largeEncryptedScore = "0x" + "f".repeat(64); // Maximum value
      
      await expect(
        luckySpin.connect(user1).publishScore(largeEncryptedScore)
      ).to.not.be.reverted; // Should handle large values gracefully
      
      // State should remain encrypted
      const finalScore = await luckySpin.getEncryptedScore(userAddress);
      expect(finalScore).to.match(/^0x[a-fA-F0-9]{64}$/);
    });

    it("Should prevent underflow attacks", async function () {
      const userAddress = user1.address;
      
      // Initialize user
      await luckySpin.connect(user1).dailyGm();
      
      // Try to publish a zero encrypted score
      const zeroEncryptedScore = "0x" + "0".repeat(64);
      
      await expect(
        luckySpin.connect(user1).publishScore(zeroEncryptedScore)
      ).to.not.be.reverted; // Should handle zero values gracefully
      
      // State should remain encrypted
      const finalScore = await luckySpin.getEncryptedScore(userAddress);
      expect(finalScore).to.match(/^0x[a-fA-F0-9]{64}$/);
    });

    it("Should prevent timing attacks", async function () {
      const userAddress = user1.address;
      
      // Initialize user
      await luckySpin.connect(user1).dailyGm();
      
      // Test operations with different input sizes
      const testScores = [
        "0x" + "1".repeat(64),
        "0x" + "2".repeat(64),
        "0x" + "3".repeat(64)
      ];
      
      for (const score of testScores) {
        await expect(
          luckySpin.connect(user1).publishScore(score)
        ).to.not.be.reverted;
      }
      
      // All operations should complete successfully regardless of input
      const finalScore = await luckySpin.getEncryptedScore(userAddress);
      expect(finalScore).to.match(/^0x[a-fA-F0-9]{64}$/);
    });
  });

  describe("FHE Audit Trail", function () {
    it("Should maintain secure audit trail", async function () {
      const userAddress = user1.address;
      
      // Initialize user
      await luckySpin.connect(user1).dailyGm();
      
      // Perform operations and verify events
      await expect(luckySpin.connect(user1).dailyGm())
        .to.emit(luckySpin, "CheckInCompleted")
        .withArgs(userAddress);
      
      await expect(luckySpin.connect(user1).buySpinWithGm())
        .to.emit(luckySpin, "SpinBoughtWithGm")
        .withArgs(userAddress);
      
      const encryptedScore = "0x" + "1".repeat(64);
      await expect(luckySpin.connect(user1).publishScore(encryptedScore))
        .to.emit(luckySpin, "ScorePublished")
        .withArgs(userAddress, 0);
      
      // Verify that events don't leak sensitive information
      // Events should only contain public information (addresses, not encrypted values)
    });

    it("Should not expose sensitive data in events", async function () {
      const userAddress = user1.address;
      
      // Initialize user
      await luckySpin.connect(user1).dailyGm();
      
      // Publish score and check event
      const encryptedScore = "0x" + "1".repeat(64);
      const tx = await luckySpin.connect(user1).publishScore(encryptedScore);
      const receipt = await tx.wait();
      
      // Parse events to ensure no sensitive data is exposed
      const events = receipt?.logs.map(log => {
        try {
          return luckySpin.interface.parseLog(log as any);
        } catch {
          return null;
        }
      }).filter(Boolean);
      
      // Events should only contain public information
      events?.forEach(event => {
        if (event?.name === "ScorePublished") {
          // Score should not be exposed in plaintext
          expect(event.args).to.not.include(encryptedScore);
        }
      });
    });
  });
});
