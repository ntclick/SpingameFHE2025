import { task } from "hardhat/config";
import { HardhatRuntimeEnvironment } from "hardhat/types";

task("lucky-spin:deploy", "Deploy LuckySpinFHE contract").setAction(
  async (taskArgs, hre: HardhatRuntimeEnvironment) => {
    const { ethers } = hre;

    const LuckySpinFHE = await ethers.getContractFactory("LuckySpinFHE");
    const luckySpinFHE = await LuckySpinFHE.deploy();
    await luckySpinFHE.waitForDeployment();

    const address = await luckySpinFHE.getAddress();

    return address;
  },
);

task("lucky-spin:add-pool", "Add a new pool reward")
  .addParam("contract", "Contract address")
  .addParam("name", "Pool name")
  .addParam("image", "Image URL")
  .addParam("value", "Reward value")
  .setAction(async (taskArgs, hre: HardhatRuntimeEnvironment) => {
    const { ethers } = hre;

    const LuckySpinFHE = await ethers.getContractFactory("LuckySpinFHE");
    const luckySpinFHE = LuckySpinFHE.attach(taskArgs.contract);

    await luckySpinFHE.addPool(taskArgs.name, taskArgs.image, taskArgs.value);

    const poolCount = await luckySpinFHE.poolCount();
  });

task("lucky-spin:get-pools", "Get all pool rewards")
  .addParam("contract", "Contract address")
  .setAction(async (taskArgs, hre: HardhatRuntimeEnvironment) => {
    const { ethers } = hre;

    const LuckySpinFHE = await ethers.getContractFactory("LuckySpinFHE");
    const luckySpinFHE = LuckySpinFHE.attach(taskArgs.contract);

    const poolCount = await luckySpinFHE.poolCount();

    for (let i = 0; i < poolCount; i++) {
      const [name, imageUrl, value] = await luckySpinFHE.getPoolReward(i);
    }
  });

task("lucky-spin:submit-score", "Submit a public score to leaderboard")
  .addParam("contract", "Contract address")
  .addParam("user", "User address")
  .addParam("score", "Score value")
  .setAction(async (taskArgs, hre: HardhatRuntimeEnvironment) => {
    const { ethers } = hre;

    const LuckySpinFHE = await ethers.getContractFactory("LuckySpinFHE");
    const luckySpinFHE = LuckySpinFHE.attach(taskArgs.contract);

    await luckySpinFHE.submitPublicScore(taskArgs.user, taskArgs.score);
  });

task("lucky-spin:get-leaderboard", "Get leaderboard")
  .addParam("contract", "Contract address")
  .setAction(async (taskArgs, hre: HardhatRuntimeEnvironment) => {
    const { ethers } = hre;

    const LuckySpinFHE = await ethers.getContractFactory("LuckySpinFHE");
    const luckySpinFHE = LuckySpinFHE.attach(taskArgs.contract);

    const leaderboard = await luckySpinFHE.getLeaderboard();

    leaderboard.forEach((entry: any, index: number) => {});
  });

task("lucky-spin:check-in", "Simulate user check-in (with mock encrypted data)")
  .addParam("contract", "Contract address")
  .setAction(async (taskArgs, hre: HardhatRuntimeEnvironment) => {
    const { ethers } = hre;

    const LuckySpinFHE = await ethers.getContractFactory("LuckySpinFHE");
    const luckySpinFHE = LuckySpinFHE.attach(taskArgs.contract);

    // Mock encrypted data for testing (32 bytes format)
    const encryptedSpins = "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef";
    const attestation = "0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890";

    await luckySpinFHE.checkIn(encryptedSpins, attestation);
  });

task("lucky-spin:spin", "Simulate user spin (with mock encrypted data)")
  .addParam("contract", "Contract address")
  .setAction(async (taskArgs, hre: HardhatRuntimeEnvironment) => {
    const { ethers } = hre;

    const LuckySpinFHE = await ethers.getContractFactory("LuckySpinFHE");
    const luckySpinFHE = LuckySpinFHE.attach(taskArgs.contract);

    // Mock encrypted data for testing (32 bytes format)
    const encryptedPoolIndex = "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef";
    const encryptedPoint = "0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890";
    const attestationPool = "0x1111111111111111111111111111111111111111111111111111111111111111";
    const attestationPoint = "0x2222222222222222222222222222222222222222222222222222222222222222";

    await luckySpinFHE.spinAndClaimReward(encryptedPoolIndex, encryptedPoint, attestationPool, attestationPoint);
  });

task("lucky-spin:make-public", "Make user score public")
  .addParam("contract", "Contract address")
  .setAction(async (taskArgs, hre: HardhatRuntimeEnvironment) => {
    const { ethers } = hre;

    const LuckySpinFHE = await ethers.getContractFactory("LuckySpinFHE");
    const luckySpinFHE = LuckySpinFHE.attach(taskArgs.contract);

    await luckySpinFHE.makeScorePublic();


  });
