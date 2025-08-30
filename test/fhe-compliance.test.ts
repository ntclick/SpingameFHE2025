import { expect } from "chai";
import { ethers } from "hardhat";
import { LuckySpinFHE_KMS_Final } from "../typechain-types";

describe("FHE Compliance Tests", function () {
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

  describe("FHE Contract Deployment", function () {
    it("Should deploy FHE contract successfully", async function () {
      const address = await luckySpin.getAddress();
      expect(address).to.not.equal(ethers.ZeroAddress);
      
      const code = await ethers.provider.getCode(address);
      expect(code).to.not.equal("0x");
    });

    it("Should have correct FHE contract structure", async function () {
      // Check if contract has FHE-specific functions
      expect(luckySpin.buyGmTokensFHE).to.be.a("function");
      expect(luckySpin.publishScore).to.be.a("function");
      expect(luckySpin.getUserSpins).to.be.a("function");
      expect(luckySpin.getUserGmBalance).to.be.a("function");
    });
  });

  describe("FHE Parameter Validation", function () {
    it("Should validate encrypted parameter types", async function () {
      // Test that FHE functions expect encrypted parameters
      const abi = LuckySpinFHE_KMS_Final.abi;
      
      const publishScoreFunction = abi.find(item => item.name === "publishScore");
      expect(publishScoreFunction).to.not.be.undefined;
      
      const scoreParam = publishScoreFunction?.inputs.find(input => input.name === "score");
      expect(scoreParam).to.not.be.undefined;
      expect(scoreParam?.type).to.equal("bytes32");
      expect(scoreParam?.internalType).to.equal("euint64");
    });

    it("Should validate buyGmTokensFHE encrypted parameters", async function () {
      const abi = LuckySpinFHE_KMS_Final.abi;
      
      const buyGmFunction = abi.find(item => item.name === "buyGmTokensFHE");
      expect(buyGmFunction).to.not.be.undefined;
      
      const amountParam = buyGmFunction?.inputs.find(input => input.name === "encryptedAmount");
      expect(amountParam).to.not.be.undefined;
      expect(amountParam?.type).to.equal("bytes32");
      expect(amountParam?.internalType).to.equal("euint64");
    });
  });

  describe("FHE State Management", function () {
    it("Should store encrypted user state", async function () {
      // Test that user state is stored in encrypted format
      const userAddress = user1.address;
      
      // Get encrypted spins (should be bytes32)
      const encryptedSpins = await luckySpin.getUserSpins(userAddress);
      expect(encryptedSpins).to.be.a("string");
      expect(encryptedSpins).to.match(/^0x[a-fA-F0-9]{64}$/);
      
      // Get encrypted GM balance
      const encryptedGm = await luckySpin.getUserGmBalance(userAddress);
      expect(encryptedGm).to.be.a("string");
      expect(encryptedGm).to.match(/^0x[a-fA-F0-9]{64}$/);
    });

    it("Should handle encrypted pending ETH", async function () {
      const userAddress = user1.address;
      
      const encryptedPendingEth = await luckySpin.getEncryptedPendingEthWei(userAddress);
      expect(encryptedPendingEth).to.be.a("string");
      expect(encryptedPendingEth).to.match(/^0x[a-fA-F0-9]{64}$/);
    });

    it("Should handle encrypted score", async function () {
      const userAddress = user1.address;
      
      const encryptedScore = await luckySpin.getEncryptedScore(userAddress);
      expect(encryptedScore).to.be.a("string");
      expect(encryptedScore).to.match(/^0x[a-fA-F0-9]{64}$/);
    });
  });

  describe("FHE Function Compliance", function () {
    it("Should have proper FHE function signatures", async function () {
      const abi = LuckySpinFHE_KMS_Final.abi;
      
      // Check FHE function signatures
      const fheFunctions = [
        "buyGmTokensFHE",
        "publishScore",
        "unpublishScore"
      ];
      
      fheFunctions.forEach(funcName => {
        const func = abi.find(item => item.name === funcName);
        expect(func).to.not.be.undefined;
        expect(func?.stateMutability).to.not.equal("view");
      });
    });

    it("Should have proper public function signatures", async function () {
      const abi = LuckySpinFHE_KMS_Final.abi;
      
      // Check public function signatures
      const publicFunctions = [
        "dailyGm",
        "buySpinWithGm",
        "spin",
        "spinLite",
        "spinWithEncryptedRandom",
        "requestClaimETH",
        "withdrawPendingETH"
      ];
      
      publicFunctions.forEach(funcName => {
        const func = abi.find(item => item.name === funcName);
        expect(func).to.not.be.undefined;
      });
    });
  });

  describe("FHE Event Compliance", function () {
    it("Should emit FHE-specific events", async function () {
      const abi = LuckySpinFHE_KMS_Final.abi;
      
      // Check for FHE-related events
      const fheEvents = [
        "ScorePublished",
        "GmTokensBoughtFHE",
        "SpinBoughtWithGm",
        "SpinCompleted",
        "SpinOutcome",
        "CheckInCompleted"
      ];
      
      fheEvents.forEach(eventName => {
        const event = abi.find(item => item.type === "event" && item.name === eventName);
        expect(event).to.not.be.undefined;
      });
    });

    it("Should have proper event parameter types", async function () {
      const abi = LuckySpinFHE_KMS_Final.abi;
      
      // Check ScorePublished event
      const scorePublishedEvent = abi.find(item => item.type === "event" && item.name === "ScorePublished");
      expect(scorePublishedEvent).to.not.be.undefined;
      
      const userParam = scorePublishedEvent?.inputs.find(input => input.name === "user");
      expect(userParam).to.not.be.undefined;
      expect(userParam?.type).to.equal("address");
      expect(userParam?.indexed).to.be.true;
    });
  });

  describe("FHE Gas Optimization", function () {
    it("Should have reasonable gas limits for FHE operations", async function () {
      // Test gas estimation for FHE functions
      const encryptedAmount = "0x" + "0".repeat(64); // Mock encrypted amount
      const proof = "0x"; // Mock proof
      
      // Estimate gas for buyGmTokensFHE
      const gasEstimate = await luckySpin.buyGmTokensFHE.estimateGas(
        encryptedAmount,
        proof,
        { value: ethers.parseEther("0.1") }
      );
      
      expect(gasEstimate).to.be.a("bigint");
      expect(gasEstimate).to.be.gt(0n);
      expect(gasEstimate).to.be.lt(1000000n); // Should not exceed 1M gas
    });
  });

  describe("FHE Security Validation", function () {
    it("Should validate user initialization", async function () {
      // Test that users must be initialized before using FHE functions
      const encryptedScore = "0x" + "0".repeat(64);
      
      // Try to publish score without initialization
      await expect(
        luckySpin.connect(user1).publishScore(encryptedScore)
      ).to.be.revertedWith("User not initialized");
    });

    it("Should handle encrypted parameter validation", async function () {
      // Test that invalid encrypted parameters are rejected
      const invalidEncryptedAmount = "0x1234"; // Too short
      
      await expect(
        luckySpin.connect(user1).buyGmTokensFHE(
          invalidEncryptedAmount,
          "0x",
          { value: ethers.parseEther("0.1") }
        )
      ).to.be.reverted;
    });
  });

  describe("FHE Integration Tests", function () {
    it("Should maintain FHE state consistency", async function () {
      // Test that FHE state remains consistent across operations
      const userAddress = user1.address;
      
      // Get initial state
      const initialSpins = await luckySpin.getUserSpins(userAddress);
      const initialGm = await luckySpin.getUserGmBalance(userAddress);
      
      // Perform some operations
      await luckySpin.connect(user1).dailyGm();
      
      // Check that state is still encrypted
      const newSpins = await luckySpin.getUserSpins(userAddress);
      const newGm = await luckySpin.getUserGmBalance(userAddress);
      
      expect(newSpins).to.match(/^0x[a-fA-F0-9]{64}$/);
      expect(newGm).to.match(/^0x[a-fA-F0-9]{64}$/);
    });

    it("Should handle multiple users with FHE", async function () {
      // Test that multiple users can have encrypted state
      const user1Address = user1.address;
      const user2Address = user2.address;
      
      const user1Spins = await luckySpin.getUserSpins(user1Address);
      const user2Spins = await luckySpin.getUserSpins(user2Address);
      
      expect(user1Spins).to.match(/^0x[a-fA-F0-9]{64}$/);
      expect(user2Spins).to.match(/^0x[a-fA-F0-9]{64}$/);
      expect(user1Spins).to.not.equal(user2Spins); // Should be different encrypted values
    });
  });

  describe("FHE Error Handling", function () {
    it("Should handle FHE operation failures gracefully", async function () {
      // Test error handling for FHE operations
      const invalidEncryptedData = "0x" + "1".repeat(63); // Invalid format
      
      await expect(
        luckySpin.connect(user1).publishScore(invalidEncryptedData)
      ).to.be.reverted;
    });

    it("Should validate proof requirements", async function () {
      // Test that FHE functions require proper proofs
      const encryptedAmount = "0x" + "0".repeat(64);
      const invalidProof = "0x1234"; // Invalid proof
      
      await expect(
        luckySpin.connect(user1).buyGmTokensFHE(
          encryptedAmount,
          invalidProof,
          { value: ethers.parseEther("0.1") }
        )
      ).to.be.reverted;
    });
  });
});
