import { ethers } from "ethers";

async function testContractConnection() {
  console.log("🧪 Testing Contract Connection...");

  try {
    // ✅ Use correct contract address
    const contractAddress = "0x94ACAB20461CD03475543dFBBAe3276A09bC8e8e";
    const contractABI = [
      "function dailyGm(bytes32 encryptedGmValue, bytes proof) external",
      "function buyGmTokens(bytes32 encryptedAmount, bytes proof) external payable",
      "function buySpins(bytes32 encryptedAmount, bytes proof) external payable",
      "function canGmToday(address user) external view returns (bool)",
      "function getLastGmTime(address user) external view returns (uint256)",
      "function getTimeUntilNextGm(address user) external view returns (uint256)",
      "function getUserSpins(address user) external view returns (bytes32)",
      "function getUserRewards(address user) external view returns (bytes32)",
      "function getContractBalance() external view returns (uint256)",
      "function GM_TOKEN_RATE() external view returns (uint256)",
      "function SPIN_PRICE() external view returns (uint256)",
      "event DailyGmCompleted(address indexed user, uint256 timestamp)",
      "event GmTokensBought(address indexed user, uint256 amount)",
      "event SpinPurchased(address indexed user, uint256 timestamp)",
    ];

    // ✅ Create provider and contract instance
    const provider = new ethers.JsonRpcProvider("https://eth-sepolia.g.alchemy.com/v2/oppYpzscO7hdTG6hopypG6Opn3Xp7lR_");
    const contract = new ethers.Contract(contractAddress, contractABI, provider);

    console.log("📋 Contract Address:", contractAddress);

    // ✅ Test basic contract functions
    console.log("\n🔍 Testing Contract Functions...");
    
    const gmTokenRate = await contract.GM_TOKEN_RATE();
    console.log("✅ GM Token Rate:", gmTokenRate.toString());

    const spinPrice = await contract.SPIN_PRICE();
    console.log("✅ Spin Price:", ethers.formatEther(spinPrice), "ETH");

    // ✅ Test with a sample address
    const testAddress = "0xE24546D5Ff7bf460Ebdaa36847e38669996D1a0D";
    const canGmToday = await contract.canGmToday(testAddress);
    console.log("✅ Can GM today for", testAddress + ":", canGmToday);

    const lastGmTime = await contract.getLastGmTime(testAddress);
    console.log("✅ Last GM time for", testAddress + ":", lastGmTime.toString());

    const timeUntilNextGm = await contract.getTimeUntilNextGm(testAddress);
    console.log("✅ Time until next GM for", testAddress + ":", timeUntilNextGm.toString(), "seconds");

    console.log("\n🎯 Contract connection test completed successfully!");
    console.log("✅ Contract is accessible and functions are working");

  } catch (error) {
    console.error("❌ Contract connection test failed:", error);
  }
}

testContractConnection()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
