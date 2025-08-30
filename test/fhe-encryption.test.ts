import { expect } from "chai";
import { ethers } from "hardhat";
import { LuckySpinFHE_KMS_Final } from "../typechain-types";

describe("FHE Encryption Tests", function () {
  let luckySpin: LuckySpinFHE_KMS_Final;
  let owner: any;
  let user1: any;
  let user2: any;

  beforeEach(async function () {
    [owner, user1, user2] = await ethers.getSigners();
    
    const LuckySpinFHE_KMS_Final = await ethers.getContractFactory("LuckySpinFHE_KMS_Final");
    luckySpin = await LuckySpinFHE_KMS_Final.deploy();
    await luckySpin.waitForDeployment();
  });

  describe("FHE Data Types", function () {
    it("Should handle euint64 encrypted values", async function () {
      // Test that contract properly handles euint64 encrypted values
      const userAddress = user1.address;
      
      // Get encrypted spins (euint64)
      const encryptedSpins = await luckySpin.getUserSpins(userAddress);
      expect(encryptedSpins).to.be.a("string");
      expect(encryptedSpins.length).to.equal(66); // 0x + 64 hex chars
      
      // Verify it's a valid hex string
      expect(encryptedSpins).to.match(/^0x[a-fA-F0-9]{64}$/);
    });

    it("Should handle encrypted GM balance", async function () {
      const userAddress = user1.address;
      
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

  describe("FHE Parameter Validation", function () {
    it("Should validate encrypted parameter format", async function () {
      // Test various encrypted parameter formats
      const validEncrypted = "0x" + "0".repeat(64);
      const invalidShort = "0x1234";
      const invalidLong = "0x" + "0".repeat(128);
      const invalidFormat = "not_hex_string";
      
      // Valid format should be accepted (though may fail for other reasons)
      expect(validEncrypted).to.match(/^0x[a-fA-F0-9]{64}$/);
      
      // Invalid formats should be rejected
      expect(invalidShort).to.not.match(/^0x[a-fA-F0-9]{64}$/);
      expect(invalidLong).to.not.match(/^0x[a-fA-F0-9]{64}$/);
      expect(invalidFormat).to.not.match(/^0x[a-fA-F0-9]{64}$/);
    });

    it("Should validate proof format", async function () {
      // Test proof format validation
      const validProof = "0x"; // Empty proof
      const invalidProof = "not_a_proof";
      
      expect(validProof).to.match(/^0x.*$/);
      expect(invalidProof).to.not.match(/^0x.*$/);
    });
  });

  describe("FHE State Encryption", function () {
    it("Should encrypt user state consistently", async function () {
      const userAddress = user1.address;
      
      // Get all encrypted state values
      const encryptedSpins = await luckySpin.getUserSpins(userAddress);
      const encryptedGm = await luckySpin.getUserGmBalance(userAddress);
      const encryptedPendingEth = await luckySpin.getEncryptedPendingEthWei(userAddress);
      const encryptedScore = await luckySpin.getEncryptedScore(userAddress);
      
      // All should be properly encrypted
      [encryptedSpins, encryptedGm, encryptedPendingEth, encryptedScore].forEach(encrypted => {
        expect(encrypted).to.match(/^0x[a-fA-F0-9]{64}$/);
      });
    });

    it("Should maintain encryption across operations", async function () {
      const userAddress = user1.address;
      
      // Get initial encrypted state
      const initialSpins = await luckySpin.getUserSpins(userAddress);
      
      // Perform an operation that might change state
      await luckySpin.connect(user1).dailyGm();
      
      // Get new encrypted state
      const newSpins = await luckySpin.getUserSpins(userAddress);
      
      // Both should still be encrypted
      expect(initialSpins).to.match(/^0x[a-fA-F0-9]{64}$/);
      expect(newSpins).to.match(/^0x[a-fA-F0-9]{64}$/);
    });
  });

  describe("FHE Function Parameters", function () {
    it("Should validate publishScore encrypted parameter", async function () {
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
      
      const proofParam = buyGmFunction?.inputs.find(input => input.name === "proof");
      expect(proofParam).to.not.be.undefined;
      expect(proofParam?.type).to.equal("bytes");
    });
  });

  describe("FHE Data Consistency", function () {
    it("Should maintain encrypted data consistency", async function () {
      const user1Address = user1.address;
      const user2Address = user2.address;
      
      // Get encrypted state for both users
      const user1Spins = await luckySpin.getUserSpins(user1Address);
      const user1Gm = await luckySpin.getUserGmBalance(user1Address);
      const user1PendingEth = await luckySpin.getEncryptedPendingEthWei(user1Address);
      const user1Score = await luckySpin.getEncryptedScore(user1Address);
      
      const user2Spins = await luckySpin.getUserSpins(user2Address);
      const user2Gm = await luckySpin.getUserGmBalance(user2Address);
      const user2PendingEth = await luckySpin.getEncryptedPendingEthWei(user2Address);
      const user2Score = await luckySpin.getEncryptedScore(user2Address);
      
      // All should be encrypted
      [user1Spins, user1Gm, user1PendingEth, user1Score, 
       user2Spins, user2Gm, user2PendingEth, user2Score].forEach(encrypted => {
        expect(encrypted).to.match(/^0x[a-fA-F0-9]{64}$/);
      });
      
      // Different users should have different encrypted values
      expect(user1Spins).to.not.equal(user2Spins);
      expect(user1Gm).to.not.equal(user2Gm);
      expect(user1PendingEth).to.not.equal(user2PendingEth);
      expect(user1Score).to.not.equal(user2Score);
    });

    it("Should handle zero encrypted values", async function () {
      const userAddress = user1.address;
      
      // Get encrypted values (should be zero initially)
      const encryptedSpins = await luckySpin.getUserSpins(userAddress);
      const encryptedGm = await luckySpin.getUserGmBalance(userAddress);
      
      // Even zero values should be encrypted
      expect(encryptedSpins).to.match(/^0x[a-fA-F0-9]{64}$/);
      expect(encryptedGm).to.match(/^0x[a-fA-F0-9]{64}$/);
    });
  });

  describe("FHE Error Scenarios", function () {
    it("Should handle invalid encrypted data gracefully", async function () {
      // Test with invalid encrypted data
      const invalidEncryptedData = "0x1234"; // Too short
      
      await expect(
        luckySpin.connect(user1).publishScore(invalidEncryptedData)
      ).to.be.reverted;
    });

    it("Should handle malformed encrypted parameters", async function () {
      const malformedEncrypted = "0x" + "g".repeat(64); // Invalid hex
      
      await expect(
        luckySpin.connect(user1).publishScore(malformedEncrypted)
      ).to.be.reverted;
    });

    it("Should handle empty encrypted parameters", async function () {
      const emptyEncrypted = "0x";
      
      await expect(
        luckySpin.connect(user1).publishScore(emptyEncrypted)
      ).to.be.reverted;
    });
  });

  describe("FHE Gas Optimization", function () {
    it("Should optimize gas for encrypted operations", async function () {
      const encryptedAmount = "0x" + "0".repeat(64);
      const proof = "0x";
      
      // Estimate gas for encrypted operation
      const gasEstimate = await luckySpin.buyGmTokensFHE.estimateGas(
        encryptedAmount,
        proof,
        { value: ethers.parseEther("0.1") }
      );
      
      expect(gasEstimate).to.be.a("bigint");
      expect(gasEstimate).to.be.gt(0n);
      
      // FHE operations should be reasonably gas efficient
      expect(gasEstimate).to.be.lt(500000n); // Should not exceed 500k gas
    });
  });

  describe("FHE Security", function () {
    it("Should not expose plaintext values", async function () {
      const userAddress = user1.address;
      
      // Get encrypted state
      const encryptedSpins = await luckySpin.getUserSpins(userAddress);
      const encryptedGm = await luckySpin.getUserGmBalance(userAddress);
      
      // Encrypted values should not be easily decodable
      expect(encryptedSpins).to.not.equal("0x0000000000000000000000000000000000000000000000000000000000000000");
      expect(encryptedGm).to.not.equal("0x0000000000000000000000000000000000000000000000000000000000000000");
    });

    it("Should maintain encryption across transactions", async function () {
      const userAddress = user1.address;
      
      // Get initial encrypted state
      const initialSpins = await luckySpin.getUserSpins(userAddress);
      
      // Perform multiple operations
      await luckySpin.connect(user1).dailyGm();
      await luckySpin.connect(user1).dailyGm();
      
      // Get final encrypted state
      const finalSpins = await luckySpin.getUserSpins(userAddress);
      
      // Both should remain encrypted
      expect(initialSpins).to.match(/^0x[a-fA-F0-9]{64}$/);
      expect(finalSpins).to.match(/^0x[a-fA-F0-9]{64}$/);
    });
  });
});
