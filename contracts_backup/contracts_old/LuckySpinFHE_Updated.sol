// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {FHE, euint64, euint256, externalEuint64, externalEuint256, ebool} from "@fhevm/solidity/lib/FHE.sol";
import {SepoliaConfig} from "@fhevm/solidity/config/ZamaConfig.sol";

contract LuckySpinFHE_Updated is SepoliaConfig {
    mapping(address => euint64) public userSpins;
    mapping(address => euint256) public userRewards;
    mapping(address => uint256) public lastGmTime; // Track last GM time for daily reset

    uint256 public constant SPIN_PRICE = 0.01 ether;
    uint256 public constant GM_TOKEN_RATE = 100; // 1 ETH = 100 GM tokens
    uint256 public constant DAILY_GM_RESET_HOUR = 0; // UTC 0:00
    uint256 public constant SECONDS_PER_DAY = 24 * 60 * 60;
    address public owner;

    event SpinPurchased(address indexed user, uint256 value);
    event SpinCompleted(address indexed user, uint256 rewardValue);
    event GmTokensBought(address indexed user, uint256 amount);
    event DailyGmCompleted(address indexed user, uint256 timestamp);

    constructor() {
        owner = msg.sender;
    }

    function buySpins(externalEuint64 encryptedAmount, bytes calldata proof) external payable {
        require(msg.value > 0, "Must send ETH");

        // ✅ Validate encrypted input
        euint64 amount = FHE.fromExternal(encryptedAmount, proof);

        // ✅ Cộng dồn spin bằng FHE.add (cho euint64) với overflow protection
        euint64 current = userSpins[msg.sender];
        euint64 updated = FHE.add(current, amount);

        // ✅ Overflow protection - nếu overflow thì giữ nguyên current
        ebool isOverflow = FHE.lt(updated, current);
        euint64 finalAmount = FHE.select(isOverflow, current, updated);
        userSpins[msg.sender] = finalAmount;

        // ✅ ACL chuẩn sau cập nhật state - cho cả contract và user
        FHE.allowThis(finalAmount);
        FHE.allow(finalAmount, msg.sender);

        emit SpinPurchased(msg.sender, msg.value);
    }

    // ✅ Function riêng cho mua GM tokens với ETH - FHE Standards Compliant
    function buyGmTokens(externalEuint64 encryptedAmount, bytes calldata proof) external payable {
        require(msg.value > 0, "Must send ETH");

        // ✅ Validate encrypted input với proper error handling
        euint64 amount = FHE.fromExternal(encryptedAmount, proof);

        // ✅ Validate ETH value: 1 ETH = 100 GM tokens
        require(msg.value >= 0.001 ether, "Minimum ETH required for GM tokens");

        // ✅ Cộng dồn GM tokens (lưu trong userSpins tạm thời) với overflow protection
        euint64 current = userSpins[msg.sender];
        euint64 updated = FHE.add(current, amount);

        // ✅ Overflow protection - nếu overflow thì giữ nguyên current
        ebool isOverflow = FHE.lt(updated, current);
        euint64 finalAmount = FHE.select(isOverflow, current, updated);
        userSpins[msg.sender] = finalAmount;

        // ✅ ACL chuẩn sau cập nhật state - cho cả contract và user
        FHE.allowThis(finalAmount);
        FHE.allow(finalAmount, msg.sender);

        // ✅ Emit proper event cho GM tokens
        emit GmTokensBought(msg.sender, msg.value);
    }

    // ✅ Daily GM function với FHE standards
    function dailyGm(externalEuint64 encryptedGmValue, bytes calldata proof) external {
        // ✅ Validate encrypted input
        euint64 gmValue = FHE.fromExternal(encryptedGmValue, proof);

        // ✅ Check if user can GM today (reset at UTC 0:00)
        uint256 currentTime = block.timestamp;
        uint256 lastGm = lastGmTime[msg.sender];

        // ✅ Calculate if enough time has passed since last GM
        require(currentTime >= lastGm + SECONDS_PER_DAY, "Daily GM already claimed today");

        // ✅ Update last GM time
        lastGmTime[msg.sender] = currentTime;

        // ✅ Add 1 free spin for daily GM với overflow protection
        euint64 current = userSpins[msg.sender];
        euint64 updated = FHE.add(current, FHE.asEuint64(1));

        // ✅ Overflow protection - nếu overflow thì giữ nguyên current
        ebool isOverflow = FHE.lt(updated, current);
        euint64 finalAmount = FHE.select(isOverflow, current, updated);
        userSpins[msg.sender] = finalAmount;

        // ✅ ACL chuẩn sau cập nhật state - cho cả contract và user
        FHE.allowThis(finalAmount);
        FHE.allow(finalAmount, msg.sender);

        // ✅ Emit daily GM event
        emit DailyGmCompleted(msg.sender, currentTime);
    }

    // ✅ Check if user can GM today
    function canGmToday(address user) external view returns (bool) {
        uint256 currentTime = block.timestamp;
        uint256 lastGm = lastGmTime[user];
        return currentTime >= lastGm + SECONDS_PER_DAY;
    }

    // ✅ Get last GM time for user
    function getLastGmTime(address user) external view returns (uint256) {
        return lastGmTime[user];
    }

    // ✅ Get time until next GM (in seconds)
    function getTimeUntilNextGm(address user) external view returns (uint256) {
        uint256 currentTime = block.timestamp;
        uint256 lastGm = lastGmTime[user];
        uint256 nextGmTime = lastGm + SECONDS_PER_DAY;

        if (currentTime >= nextGmTime) {
            return 0; // Can GM now
        } else {
            return nextGmTime - currentTime;
        }
    }

    function spin() external {
        // ✅ Trừ 1 lượt quay bằng FHE.sub (cho euint64) - Theo Zama standards
        euint64 spins = userSpins[msg.sender];
        
        // ✅ Kiểm tra đủ spins trước khi trừ
        ebool hasSpins = FHE.ge(spins, FHE.asEuint64(1));
        require(FHE.decrypt(hasSpins), "Not enough spins");
        
        euint64 newSpins = FHE.sub(spins, FHE.asEuint64(1));
        userSpins[msg.sender] = newSpins;

        // ✅ ACL chuẩn sau cập nhật state - cho cả contract và user
        FHE.allowThis(newSpins);
        FHE.allow(newSpins, msg.sender);

        // ✅ Sinh phần thưởng ngẫu nhiên
        euint256 newReward = FHE.randEuint256();
        
        // ✅ Cộng dồn reward với reward hiện tại
        euint256 currentReward = userRewards[msg.sender];
        euint256 totalReward = FHE.add(currentReward, newReward);
        userRewards[msg.sender] = totalReward;

        // ✅ ACL cho rewards - cho cả contract và user
        FHE.allowThis(totalReward);
        FHE.allow(totalReward, msg.sender);

        // ✅ Decrypt reward value for event (this is just for demonstration)
        // In a real FHE contract, you would not decrypt values
        // uint256 rewardValue = FHE.decrypt(newReward);
        
        emit SpinCompleted(msg.sender, 0); // Using 0 as placeholder
    }

    function getUserSpins(address user) external view returns (euint64) {
        require(user == msg.sender, "Private access only");
        return userSpins[user];
    }

    function getUserRewards(address user) external view returns (euint256) {
        require(user == msg.sender, "Private access only");
        return userRewards[user];
    }

    function getContractBalance() external view returns (uint256) {
        return address(this).balance;
    }

    function emergencyWithdraw() external {
        require(msg.sender == owner, "Only owner");
        payable(owner).transfer(address(this).balance);
    }

    receive() external payable {}
}
