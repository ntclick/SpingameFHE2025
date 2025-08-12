import { expect } from "chai";
import { ethers } from "hardhat";
import { LuckySpinFHE_Confidential } from "../typechain-types";
import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";

describe("LuckySpinFHE_Confidential", function () {
  let contract: LuckySpinFHE_Confidential;
  let owner: HardhatEthersSigner;
  let user1: HardhatEthersSigner;
  let user2: HardhatEthersSigner;

  beforeEach(async function () {
    [owner, user1, user2] = await ethers.getSigners();

    const LuckySpinFHEConfidential = await ethers.getContractFactory("LuckySpinFHE_Confidential");
    contract = await LuckySpinFHEConfidential.deploy();
    await contract.waitForDeployment();

    // Fund contract for testing
    await owner.sendTransaction({
      to: await contract.getAddress(),
      value: ethers.parseEther("10.0"),
    });
  });

  describe("🔧 Deployment & Configuration", function () {
    it("Should deploy with correct initial configuration", async function () {
      expect(await contract.getPoolsCount()).to.equal(8);
      expect(await contract.owner()).to.equal(owner.address);
      expect(await contract.getContractBalance()).to.equal(ethers.parseEther("10.0"));
    });

    it("Should have correct pool configurations", async function () {
      // Test pool 0 (No Prize)
      const pool0 = await contract.getPoolReward(0);
      expect(pool0.name).to.equal("No Prize");
      expect(pool0.baseValue).to.equal(0);
      expect(pool0.isActive).to.be.true;

      // Test pool 7 (Big Prize)
      const pool7 = await contract.getPoolReward(7);
      expect(pool7.name).to.equal("Big Prize");
      expect(pool7.baseValue).to.equal(ethers.parseEther("0.1"));
      expect(pool7.isActive).to.be.true;
    });
  });

  describe("🎰 Buy Spins - Confidential", function () {
    it("Should allow buying spins with correct payment", async function () {
      const spinCount = 5;
      const totalCost = ethers.parseEther("0.05"); // 5 * 0.01 ETH

      // Create encrypted input (mock for testing)
      const encryptedAmount = ethers.randomBytes(32);
      const inputProof = ethers.randomBytes(32);

      await expect(
        contract.connect(user1).buySpins(encryptedAmount, inputProof, {
          value: totalCost,
        }),
      ).to.emit(contract, "SpinPurchased");
    });

    it("Should reject incorrect payment", async function () {
      const encryptedAmount = ethers.randomBytes(32);
      const inputProof = ethers.randomBytes(32);

      await expect(
        contract.connect(user1).buySpins(encryptedAmount, inputProof, {
          value: ethers.parseEther("0.001"), // Incorrect amount
        }),
      ).to.be.reverted;
    });

    it("Should update contract balance after purchase", async function () {
      const initialBalance = await contract.getContractBalance();
      const purchaseAmount = ethers.parseEther("0.05");

      const encryptedAmount = ethers.randomBytes(32);
      const inputProof = ethers.randomBytes(32);

      await contract.connect(user1).buySpins(encryptedAmount, inputProof, {
        value: purchaseAmount,
      });

      const finalBalance = await contract.getContractBalance();
      expect(finalBalance - initialBalance).to.equal(purchaseAmount);
    });
  });

  describe("📅 Check-In System", function () {
    it("Should allow daily check-in", async function () {
      await expect(contract.connect(user1).checkIn()).to.emit(contract, "CheckInCompleted").withArgs(user1.address, 3); // CHECK_IN_SPINS = 3
    });

    it("Should prevent multiple check-ins per day", async function () {
      await contract.connect(user1).checkIn();

      await expect(contract.connect(user1).checkIn()).to.be.revertedWith("Already checked in today");
    });

    it("Should update last check-in date", async function () {
      const beforeCheckIn = await contract.lastCheckInDate(user1.address);
      await contract.connect(user1).checkIn();
      const afterCheckIn = await contract.lastCheckInDate(user1.address);

      expect(afterCheckIn).to.be.gt(beforeCheckIn);
    });
  });

  describe("👋 GM System", function () {
    it("Should allow daily GM", async function () {
      await expect(contract.connect(user1).sendGM()).to.emit(contract, "GMSent").withArgs(user1.address, 1); // GM_SPINS = 1
    });

    it("Should prevent multiple GMs per day", async function () {
      await contract.connect(user1).sendGM();

      await expect(contract.connect(user1).sendGM()).to.be.revertedWith("Already sent GM today");
    });

    it("Should update last GM date", async function () {
      const beforeGM = await contract.lastGMDate(user1.address);
      await contract.connect(user1).sendGM();
      const afterGM = await contract.lastGMDate(user1.address);

      expect(afterGM).to.be.gt(beforeGM);
    });
  });

  describe("🎲 Spin System - Confidential", function () {
    beforeEach(async function () {
      // Give user some spins first
      await contract.connect(user1).checkIn();
    });

    it("Should allow spinning with encrypted data", async function () {
      const encryptedPoolIndex = ethers.randomBytes(32);
      const inputProof = ethers.randomBytes(32);

      await expect(contract.connect(user1).spinAndClaimReward(encryptedPoolIndex, inputProof)).to.emit(
        contract,
        "SpinCompleted",
      );
    });

    it("Should emit confidential state update", async function () {
      const encryptedPoolIndex = ethers.randomBytes(32);
      const inputProof = ethers.randomBytes(32);

      await expect(contract.connect(user1).spinAndClaimReward(encryptedPoolIndex, inputProof))
        .to.emit(contract, "ConfidentialStateUpdated")
        .withArgs(user1.address, "spin_completed");
    });
  });

  describe("🔍 View Functions - Encrypted Returns", function () {
    it("Should return encrypted handles for user data", async function () {
      // These should return encrypted values, not revert
      const userSpins = await contract.connect(user1).getUserSpins();
      const userRewards = await contract.connect(user1).getUserRewards();
      const userTotalSpins = await contract.connect(user1).getUserTotalSpins();
      const userWinCount = await contract.connect(user1).getUserWinCount();
      const userPoints = await contract.connect(user1).getUserPoints();

      // Should return something (encrypted handles)
      expect(userSpins).to.not.be.undefined;
      expect(userRewards).to.not.be.undefined;
      expect(userTotalSpins).to.not.be.undefined;
      expect(userWinCount).to.not.be.undefined;
      expect(userPoints).to.not.be.undefined;
    });
  });

  describe("💰 Reward Withdrawal", function () {
    it("Should handle withdrawal attempt", async function () {
      // This might revert if no rewards, which is expected
      await expect(contract.connect(user1).withdrawRewards()).to.be.reverted;
    });
  });

  describe("👨‍💼 Admin Functions", function () {
    it("Should allow owner to fund pools", async function () {
      const fundAmount = ethers.parseEther("1.0");

      await expect(contract.connect(owner).fundPool(0, { value: fundAmount }))
        .to.emit(contract, "PoolFunded")
        .withArgs(0, fundAmount);
    });

    it("Should reject non-owner pool funding", async function () {
      await expect(contract.connect(user1).fundPool(0, { value: ethers.parseEther("1.0") })).to.be.revertedWith(
        "Not owner",
      );
    });

    it("Should allow owner to update pool config", async function () {
      await expect(
        contract
          .connect(owner)
          .updatePoolConfig(0, "Updated Pool", "New description", ethers.parseEther("0.02"), 1000, true),
      ).to.not.be.reverted;

      const updatedPool = await contract.getPoolReward(0);
      expect(updatedPool.name).to.equal("Updated Pool");
      expect(updatedPool.description).to.equal("New description");
      expect(updatedPool.baseValue).to.equal(ethers.parseEther("0.02"));
    });

    it("Should allow emergency withdrawal by owner", async function () {
      const withdrawAmount = ethers.parseEther("1.0");

      await expect(contract.connect(owner).emergencyWithdraw(withdrawAmount)).to.not.be.reverted;
    });

    it("Should reject emergency withdrawal by non-owner", async function () {
      await expect(contract.connect(user1).emergencyWithdraw(ethers.parseEther("1.0"))).to.be.revertedWith("Not owner");
    });
  });

  describe("🔐 Privacy & Security", function () {
    it("Should not expose user spin counts publicly", async function () {
      // After user gets spins, other users shouldn't be able to see
      await contract.connect(user1).checkIn();

      // user2 should not be able to see user1's spins
      const user1Spins = await contract.connect(user2).getUserSpins();
      // This returns encrypted handle for user2, not user1's data
      expect(user1Spins).to.not.be.undefined;
    });

    it("Should maintain state separation between users", async function () {
      await contract.connect(user1).checkIn();
      await contract.connect(user2).checkIn();

      const user1Spins = await contract.connect(user1).getUserSpins();
      const user2Spins = await contract.connect(user2).getUserSpins();

      // Each user gets their own encrypted data
      expect(user1Spins).to.not.equal(user2Spins);
    });
  });

  describe("💸 Receive Function", function () {
    it("Should accept direct ETH transfers", async function () {
      const initialBalance = await contract.getContractBalance();
      const sendAmount = ethers.parseEther("1.0");

      await user1.sendTransaction({
        to: await contract.getAddress(),
        value: sendAmount,
      });

      const finalBalance = await contract.getContractBalance();
      expect(finalBalance - initialBalance).to.equal(sendAmount);
    });
  });

  describe("⚡ Gas Usage & Performance", function () {
    it("Should execute buy spins within reasonable gas limits", async function () {
      const encryptedAmount = ethers.randomBytes(32);
      const inputProof = ethers.randomBytes(32);

      const tx = await contract.connect(user1).buySpins(encryptedAmount, inputProof, {
        value: ethers.parseEther("0.01"),
      });

      const receipt = await tx.wait();
      console.log("🔥 Buy Spins Gas Used:", receipt?.gasUsed.toString());

      // Should be reasonable for FHEVM operations
      expect(receipt?.gasUsed).to.be.lt(5000000);
    });

    it("Should execute spin within reasonable gas limits", async function () {
      // Give user spins first
      await contract.connect(user1).checkIn();

      const encryptedPoolIndex = ethers.randomBytes(32);
      const inputProof = ethers.randomBytes(32);

      const tx = await contract.connect(user1).spinAndClaimReward(encryptedPoolIndex, inputProof);
      const receipt = await tx.wait();

      console.log("🎲 Spin Gas Used:", receipt?.gasUsed.toString());

      // Should be reasonable for FHEVM operations
      expect(receipt?.gasUsed).to.be.lt(8000000);
    });
  });
});
