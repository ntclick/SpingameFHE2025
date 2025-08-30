const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("Spin Functions Tests", function () {
  let luckySpin;
  let owner;
  let user1;
  let user2;

  beforeEach(async function () {
    [owner, user1, user2] = await ethers.getSigners();

    const LuckySpinFHE_KMS_Final = await ethers.getContractFactory("LuckySpinFHE_KMS_Final");
    luckySpin = await LuckySpinFHE_KMS_Final.deploy();
    await luckySpin.waitForDeployment();
  });

  describe("Spin Function Tests", function () {
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
      [initialSpins, initialGm, initialPendingEth, initialScore].forEach((encrypted) => {
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

      [postSpinSpins, postSpinGm, postSpinPendingEth, postSpinScore].forEach((encrypted) => {
        expect(encrypted).to.match(/^0x[a-fA-F0-9]{64}$/);
      });
    });

    it("Should prevent spin without sufficient spins", async function () {
      const userAddress = user1.address;

      // Initialize user but don't buy spins
      await luckySpin.connect(user1).dailyGm();

      // Try to spin without spins - should revert
      await expect(luckySpin.connect(user1).spin()).to.be.reverted;

      await expect(luckySpin.connect(user1).spinLite()).to.be.reverted;

      await expect(luckySpin.connect(user1).spinWithEncryptedRandom()).to.be.reverted;
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
          estimate: () => luckySpin.connect(user1).spin().estimateGas(),
        },
        {
          name: "spinLite",
          estimate: () => luckySpin.connect(user1).spinLite().estimateGas(),
        },
        {
          name: "spinWithEncryptedRandom",
          estimate: () => luckySpin.connect(user1).spinWithEncryptedRandom().estimateGas(),
        },
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
      const users = [user1, user2];

      // Initialize all users and give them spins
      for (const user of users) {
        await luckySpin.connect(user).dailyGm();
        await luckySpin.connect(user).buySpinWithGm();
      }

      // Collect states before spinning
      const preSpinStates = {};
      for (const user of users) {
        const userAddress = user.address;
        preSpinStates[userAddress] = [
          await luckySpin.getUserSpins(userAddress),
          await luckySpin.getUserGmBalance(userAddress),
          await luckySpin.getEncryptedScore(userAddress),
        ];
      }

      // All users perform spins
      for (const user of users) {
        await luckySpin.connect(user).spin();
      }

      // Collect states after spinning
      const postSpinStates = {};
      for (const user of users) {
        const userAddress = user.address;
        postSpinStates[userAddress] = [
          await luckySpin.getUserSpins(userAddress),
          await luckySpin.getUserGmBalance(userAddress),
          await luckySpin.getEncryptedScore(userAddress),
        ];
      }

      // All states should be encrypted
      Object.values(preSpinStates)
        .flat()
        .forEach((state) => {
          expect(state).to.match(/^0x[a-fA-F0-9]{64}$/);
        });

      Object.values(postSpinStates)
        .flat()
        .forEach((state) => {
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
