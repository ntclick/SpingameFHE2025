import { expect } from "chai";
import { ethers } from "hardhat";
import { Contract, ContractFactory } from "ethers";
import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";

describe("LuckySpinFHE_Simple", function () {
  let LuckySpinFHESimple: ContractFactory;
  let luckySpinFHESimple: Contract;
  let owner: HardhatEthersSigner;
  let user1: HardhatEthersSigner;
  let user2: HardhatEthersSigner;

  beforeEach(async function () {
    [owner, user1, user2] = await ethers.getSigners();
    LuckySpinFHESimple = await ethers.getContractFactory("LuckySpinFHE_Simple");
    luckySpinFHESimple = await LuckySpinFHESimple.deploy();
  });

  describe("Pool Management", function () {
    it("Should add pool correctly", async function () {
      await luckySpinFHESimple.addPool("Gold", "gold.png", 1000);
      const poolCount = await luckySpinFHESimple.poolCount();
      expect(poolCount).to.equal(1);

      const [name, imageUrl, value] = await luckySpinFHESimple.getPoolReward(0);
      expect(name).to.equal("Gold");
      expect(imageUrl).to.equal("gold.png");
      expect(value).to.equal(1000);
    });

    it("Should update pool correctly", async function () {
      await luckySpinFHESimple.addPool("Gold", "gold.png", 1000);
      await luckySpinFHESimple.updatePool(0, "Silver", "silver.png", 500);

      const [name, imageUrl, value] = await luckySpinFHESimple.getPoolReward(0);
      expect(name).to.equal("Silver");
      expect(imageUrl).to.equal("silver.png");
      expect(value).to.equal(500);
    });

    it("Should remove pool correctly", async function () {
      await luckySpinFHESimple.addPool("Gold", "gold.png", 1000);
      await luckySpinFHESimple.addPool("Silver", "silver.png", 500);
      
      await luckySpinFHESimple.removePool(0);
      const poolCount = await luckySpinFHESimple.poolCount();
      expect(poolCount).to.equal(1);

      const [name, imageUrl, value] = await luckySpinFHESimple.getPoolReward(0);
      expect(name).to.equal("Silver");
    });
  });

  describe("Check-in", function () {
    it("Should have checkIn function available", async function () {
      // Test that the function exists and can be called
      expect(luckySpinFHESimple.checkIn).to.be.a('function');
    });
  });

  describe("Spin and Claim Reward", function () {
    it("Should have spinAndClaimReward function available", async function () {
      // Test that the function exists and can be called
      expect(luckySpinFHESimple.spinAndClaimReward).to.be.a('function');
    });
  });

  describe("Score Publicity", function () {
    it("Should have makeScorePublic function available", async function () {
      // Test that the function exists and can be called
      expect(luckySpinFHESimple.makeScorePublic).to.be.a('function');
    });
  });

  describe("Leaderboard", function () {
    it("Should allow submitting public scores", async function () {
      await luckySpinFHESimple.submitPublicScore(user1.address, 100);
      await luckySpinFHESimple.submitPublicScore(user2.address, 200);

      const leaderboard = await luckySpinFHESimple.getLeaderboard();
      expect(leaderboard.length).to.equal(2);
      expect(leaderboard[0].user).to.equal(user1.address);
      expect(leaderboard[0].score).to.equal(100);
      expect(leaderboard[1].user).to.equal(user2.address);
      expect(leaderboard[1].score).to.equal(200);
    });

    it("Should return empty leaderboard initially", async function () {
      const leaderboard = await luckySpinFHESimple.getLeaderboard();
      expect(leaderboard.length).to.equal(0);
    });
  });

  describe("Getter Functions", function () {
    it("Should return encrypted user data", async function () {
      const encryptedSpinCount = await luckySpinFHESimple.getEncryptedSpinCount(user1.address);
      const encryptedScore = await luckySpinFHESimple.getEncryptedScore(user1.address);
      const encryptedLastRewardIndex = await luckySpinFHESimple.getEncryptedLastRewardIndex(user1.address);

      // These should return encrypted values (euint8, euint32, euint8)
      expect(encryptedSpinCount).to.exist;
      expect(encryptedScore).to.exist;
      expect(encryptedLastRewardIndex).to.exist;
    });
  });

  describe("Error Handling", function () {
    it("Should revert when updating invalid pool index", async function () {
      await expect(
        luckySpinFHESimple.updatePool(0, "Invalid", "invalid.png", 0)
      ).to.be.revertedWith("Invalid index");
    });

    it("Should revert when removing invalid pool index", async function () {
      await expect(
        luckySpinFHESimple.removePool(0)
      ).to.be.revertedWith("Invalid index");
    });

    it("Should revert when getting invalid pool index", async function () {
      await expect(
        luckySpinFHESimple.getPoolReward(0)
      ).to.be.revertedWith("Invalid index");
    });
  });
}); 