const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("LuckySpinFHE_Advanced", function () {
  let luckySpin;
  let owner;
  let user1;
  let user2;
  let kmsNode1;
  let kmsNode2;
  let kmsNode3;

  beforeEach(async function () {
    [owner, user1, user2, kmsNode1, kmsNode2, kmsNode3] = await ethers.getSigners();
    
    const LuckySpinFHE_Advanced = await ethers.getContractFactory("LuckySpinFHE_Advanced");
    luckySpin = await LuckySpinFHE_Advanced.deploy();
    await luckySpin.waitForDeployment();
  });

  describe("Deployment", function () {
    it("Should deploy successfully", async function () {
      const address = await luckySpin.getAddress();
      expect(address).to.not.equal(ethers.ZeroAddress);
      
      const code = await ethers.provider.getCode(address);
      expect(code).to.not.equal("0x");
    });

    it("Should set correct owner", async function () {
      expect(await luckySpin.owner()).to.equal(owner.address);
    });

    it("Should have correct constants", async function () {
      expect(await luckySpin.GM_TOKEN_RATE()).to.equal(1000);
      expect(await luckySpin.SECONDS_PER_DAY()).to.equal(24 * 60 * 60);
      expect(await luckySpin.SPIN_COST_GM()).to.equal(10);
      expect(await luckySpin.BATCH_SIZE_LIMIT()).to.equal(50);
    });
  });

  describe("KMS Network Management", function () {
    it("Should register KMS node with sufficient stake", async function () {
      const stake = ethers.parseEther("1000");
      
      await expect(luckySpin.connect(kmsNode1).registerKMSNode({ value: stake }))
        .to.emit(luckySpin, "KMSNodeRegistered")
        .withArgs(kmsNode1.address, stake);
      
      const [isAuthorized, nodeStake] = await luckySpin.getKMSNodeInfo(kmsNode1.address);
      expect(isAuthorized).to.be.true;
      expect(nodeStake).to.equal(stake);
    });

    it("Should reject KMS registration with insufficient stake", async function () {
      const insufficientStake = ethers.parseEther("500");
      
      await expect(
        luckySpin.connect(kmsNode1).registerKMSNode({ value: insufficientStake })
      ).to.be.revertedWith("Insufficient stake");
    });

    it("Should allow KMS node to unregister and withdraw stake", async function () {
      const stake = ethers.parseEther("1000");
      await luckySpin.connect(kmsNode1).registerKMSNode({ value: stake });
      
      const balanceBefore = await ethers.provider.getBalance(kmsNode1.address);
      
      await expect(luckySpin.connect(kmsNode1).unregisterKMSNode())
        .to.emit(luckySpin, "KMSNodeUnregistered")
        .withArgs(kmsNode1.address, stake);
      
      const balanceAfter = await ethers.provider.getBalance(kmsNode1.address);
      expect(balanceAfter).to.be.gt(balanceBefore);
      
      const [isAuthorized, nodeStake] = await luckySpin.getKMSNodeInfo(kmsNode1.address);
      expect(isAuthorized).to.be.false;
      expect(nodeStake).to.equal(0);
    });
  });

  describe("Threshold Decryption", function () {
    beforeEach(async function () {
      // Register KMS nodes
      const stake = ethers.parseEther("1000");
      await luckySpin.connect(kmsNode1).registerKMSNode({ value: stake });
      await luckySpin.connect(kmsNode2).registerKMSNode({ value: stake });
      await luckySpin.connect(kmsNode3).registerKMSNode({ value: stake });
    });

    it("Should request threshold decryption", async function () {
      const decryptors = [kmsNode1.address, kmsNode2.address, kmsNode3.address];
      const threshold = 2;
      
      // Mock encrypted amount (in real scenario this would be FHE encrypted)
      const encryptedAmount = ethers.parseEther("0.1");
      
      await expect(
        luckySpin.connect(user1).requestThresholdDecryption(
          encryptedAmount,
          threshold,
          decryptors
        )
      ).to.emit(luckySpin, "ThresholdDecryptionRequested")
        .withArgs(user1.address, 0, threshold, decryptors);
    });

    it("Should reject threshold decryption with invalid threshold", async function () {
      const decryptors = [kmsNode1.address, kmsNode2.address];
      const invalidThreshold = 3; // More than available decryptors
      
      const encryptedAmount = ethers.parseEther("0.1");
      
      await expect(
        luckySpin.connect(user1).requestThresholdDecryption(
          encryptedAmount,
          invalidThreshold,
          decryptors
        )
      ).to.be.revertedWith("Invalid threshold");
    });

    it("Should reject threshold decryption with insufficient decryptors", async function () {
      const decryptors = [kmsNode1.address]; // Only 1 decryptor
      const threshold = 1;
      
      const encryptedAmount = ethers.parseEther("0.1");
      
      await expect(
        luckySpin.connect(user1).requestThresholdDecryption(
          encryptedAmount,
          threshold,
          decryptors
        )
      ).to.be.revertedWith("Need at least 3 decryptors");
    });
  });

  describe("ZK Proof Verification", function () {
    it("Should verify ZK proof", async function () {
      const proofHash = ethers.keccak256(ethers.toUtf8Bytes("test_proof"));
      const publicInputs = ethers.keccak256(ethers.toUtf8Bytes("public_inputs"));
      const proof = ethers.toUtf8Bytes("proof_data");
      
      await expect(
        luckySpin.connect(user1).verifyZKProof(proofHash, publicInputs, proof)
      ).to.emit(luckySpin, "ZKProofVerified")
        .withArgs(user1.address, proofHash, true);
      
      const [storedPublicInputs, timestamp, isValid] = await luckySpin.getZKProof(proofHash);
      expect(storedPublicInputs).to.equal(publicInputs);
      expect(isValid).to.be.true;
    });

    it("Should reject invalid ZK proof", async function () {
      const proofHash = ethers.ZeroHash; // Invalid hash
      const publicInputs = ethers.keccak256(ethers.toUtf8Bytes("public_inputs"));
      const proof = ethers.toUtf8Bytes(""); // Empty proof
      
      await expect(
        luckySpin.connect(user1).verifyZKProof(proofHash, publicInputs, proof)
      ).to.emit(luckySpin, "ZKProofVerified")
        .withArgs(user1.address, proofHash, false);
    });
  });

  describe("Batch Processing", function () {
    it("Should process batch spins", async function () {
      // First buy some GM tokens
      await luckySpin.connect(user1).buyGmTokens({ value: ethers.parseEther("0.1") });
      
      const spinCounts = [5, 3, 2]; // 10 total spins
      const encryptedBalances = [
        ethers.parseEther("1000"), // Mock encrypted balances
        ethers.parseEther("1000"),
        ethers.parseEther("1000")
      ];
      const batchProof = ethers.keccak256(ethers.toUtf8Bytes("batch_proof"));
      
      await expect(
        luckySpin.connect(user1).processBatchSpins(spinCounts, encryptedBalances, batchProof)
      ).to.emit(luckySpin, "BatchSpinProcessed")
        .withArgs(user1.address, 0, 10, 100); // 10 spins, 100 GM cost
    });

    it("Should reject batch with too many spins", async function () {
      const spinCounts = Array(51).fill(1); // 51 spins (over limit)
      const encryptedBalances = Array(51).fill(ethers.parseEther("1000"));
      const batchProof = ethers.keccak256(ethers.toUtf8Bytes("batch_proof"));
      
      await expect(
        luckySpin.connect(user1).processBatchSpins(spinCounts, encryptedBalances, batchProof)
      ).to.be.revertedWith("Batch too large");
    });

    it("Should reject batch with mismatched arrays", async function () {
      const spinCounts = [5, 3];
      const encryptedBalances = [ethers.parseEther("1000")]; // Only 1 balance
      const batchProof = ethers.keccak256(ethers.toUtf8Bytes("batch_proof"));
      
      await expect(
        luckySpin.connect(user1).processBatchSpins(spinCounts, encryptedBalances, batchProof)
      ).to.be.revertedWith("Length mismatch");
    });
  });

  describe("Legacy Functions", function () {
    it("Should buy GM tokens", async function () {
      const ethAmount = ethers.parseEther("0.1");
      const expectedGM = 100; // 0.1 ETH * 1000 rate
      
      await expect(luckySpin.connect(user1).buyGmTokens({ value: ethAmount }))
        .to.emit(luckySpin, "GmTokensBought")
        .withArgs(user1.address, expectedGM);
    });

    it("Should buy spins with GM", async function () {
      // First buy GM tokens
      await luckySpin.connect(user1).buyGmTokens({ value: ethers.parseEther("0.1") });
      
      await expect(luckySpin.connect(user1).buySpinWithGm())
        .to.emit(luckySpin, "SpinBoughtWithGm")
        .withArgs(user1.address, 1);
    });

    it("Should process single spin", async function () {
      // First buy GM tokens and spins
      await luckySpin.connect(user1).buyGmTokens({ value: ethers.parseEther("0.1") });
      await luckySpin.connect(user1).buySpinWithGm();
      
      await expect(luckySpin.connect(user1).spin())
        .to.emit(luckySpin, "SpinOutcome");
    });
  });

  describe("Statistics and View Functions", function () {
    it("Should return correct statistics", async function () {
      const [totalSpins, totalGM, kmsNodes, totalStake] = await luckySpin.getStats();
      
      expect(totalSpins).to.equal(0);
      expect(totalGM).to.equal(0);
      expect(kmsNodes).to.equal(0);
      expect(totalStake).to.equal(0);
    });

    it("Should return KMS network info", async function () {
      const stake = ethers.parseEther("1000");
      await luckySpin.connect(kmsNode1).registerKMSNode({ value: stake });
      
      const [isAuthorized, nodeStake] = await luckySpin.getKMSNodeInfo(kmsNode1.address);
      expect(isAuthorized).to.be.true;
      expect(nodeStake).to.equal(stake);
      
      const totalStake = await luckySpin.getTotalKMSStake();
      expect(totalStake).to.equal(stake);
    });
  });

  describe("Admin Functions", function () {
    it("Should allow owner to update owner", async function () {
      await expect(luckySpin.connect(owner).updateOwner(user1.address))
        .to.not.be.reverted;
      
      // Verify ownership transfer
      expect(await luckySpin.owner()).to.equal(user1.address);
    });

    it("Should reject non-owner from updating owner", async function () {
      await expect(
        luckySpin.connect(user1).updateOwner(user2.address)
      ).to.be.revertedWith("Only owner");
    });

    it("Should allow owner to emergency withdraw", async function () {
      // Send some ETH to contract
      await user1.sendTransaction({
        to: await luckySpin.getAddress(),
        value: ethers.parseEther("1")
      });
      
      const balanceBefore = await ethers.provider.getBalance(owner.address);
      
      await expect(luckySpin.connect(owner).emergencyWithdraw())
        .to.not.be.reverted;
      
      const balanceAfter = await ethers.provider.getBalance(owner.address);
      expect(balanceAfter).to.be.gt(balanceBefore);
    });
  });

  describe("Error Handling", function () {
    it("Should handle insufficient GM for spins", async function () {
      // Try to buy spins without GM
      await expect(luckySpin.connect(user1).buySpinWithGm())
        .to.emit(luckySpin, "ErrorChanged")
        .withArgs(user1.address);
    });

    it("Should handle insufficient spins", async function () {
      // Try to spin without spins
      await expect(luckySpin.connect(user1).spin())
        .to.emit(luckySpin, "ErrorChanged")
        .withArgs(user1.address);
    });
  });
});
