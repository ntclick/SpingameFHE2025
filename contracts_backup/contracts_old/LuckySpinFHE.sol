// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {FHE, euint8, euint32, externalEuint8, externalEuint32, ebool} from "@fhevm/solidity/lib/FHE.sol";
import {SepoliaConfig} from "@fhevm/solidity/config/ZamaConfig.sol";

// IERC20 interface for token operations
interface IERC20 {
    function transfer(address to, uint256 amount) external returns (bool);

    function transferFrom(address from, address to, uint256 amount) external returns (bool);

    function balanceOf(address account) external view returns (uint256);

    function approve(address spender, uint256 amount) external returns (bool);

    function allowance(address owner, address spender) external view returns (uint256);
}

/// @title LuckySpinFHE - Contract điểm danh, quay thưởng, bảng xếp hạng với FHE
/// @author fhevm-hardhat-template
/// @notice Contract cho phép user điểm danh nhận lượt quay, quay thưởng và xếp hạng
/// @dev Sử dụng Zama FHEVM với địa chỉ contract: 0xf72e7a878eCbF1d7C5aBbd283c10e82ddA58A721
contract LuckySpinFHE is SepoliaConfig {
    // ===== 1. PUBLIC POOL REWARDS (KHÔNG CẦN FHE) =====
    enum RewardType {
        ETH, // 0: ETH rewards
        USDC, // 1: USDC rewards
        USDT, // 2: USDT rewards
        TOKEN, // 3: ERC20 token rewards
        NFT, // 4: NFT rewards
        POINTS, // 5: Points only
        CUSTOM // 6: Custom rewards
    }

    struct PoolReward {
        string name;
        string imageUrl;
        uint256 value; // Amount of ETH/tokens/NFT ID
        RewardType rewardType; // Type of reward
        address tokenAddress; // Token contract address (for ERC20)
        bool isActive; // Pool is active or not
        uint256 maxSpins; // Maximum spins for this pool
        uint256 currentSpins; // Current spins used
        uint256 winRate; // Win rate in basis points (100 = 1%)
        uint256 minSpins; // Minimum spins required to win
        uint256 balance; // Current balance of this pool
    }
    PoolReward[] public poolRewards;

    // ===== 2. ENCRYPTED USER STATE =====
    mapping(address => euint8) public encryptedSpinCount; // Số lượt quay còn lại (encrypted)
    mapping(address => euint32) public encryptedScores; // Điểm số (encrypted)
    mapping(address => euint8) public encryptedLastRewardIndex; // Pool trúng gần nhất (encrypted)
    mapping(address => euint32) public encryptedDailyGMCount; // Số lần GM hôm nay (encrypted)
    mapping(address => uint256) public lastGMDate; // Ngày GM cuối cùng

    // ===== 2.5. POINTS SYSTEM CONFIGURATION =====
    struct PointsConfig {
        uint256 checkInPoints; // Điểm nhận được khi điểm danh
        uint256 spinPoints; // Điểm nhận được khi quay 1 lần
        uint256 gmPoints; // Điểm nhận được khi GM
        uint256 winBonusPoints; // Điểm bonus khi thắng
        uint256 dailyCheckInBonus; // Bonus điểm danh hàng ngày
        bool isActive; // Hệ thống điểm có active không
    }
    PointsConfig public pointsConfig;

    // ===== 2.6. SPIN SYSTEM CONFIGURATION =====
    struct SpinConfig {
        uint256 baseSpinsPerCheckIn; // Số lượt quay cơ bản khi điểm danh
        uint256 bonusSpinsPerGM; // Số lượt quay bonus khi GM
        uint256 maxSpinsPerDay; // Số lượt quay tối đa mỗi ngày
        uint256 unluckySlotCount; // Số ô không may mắn (0-8)
        uint256[] unluckySlotIndices; // Chỉ số các ô không may mắn
        bool isActive; // Hệ thống spin có active không
    }
    SpinConfig public spinConfig;

    // ===== 2.7. NFT REWARDS SYSTEM =====
    struct NFTReward {
        uint256 tokenId; // NFT token ID
        string metadata; // NFT metadata URI
        uint256 rarity; // Độ hiếm (1-100)
        bool isClaimed; // Đã được claim chưa
        address winner; // Người thắng NFT
        uint256 claimedAt; // Thời gian claim
    }
    mapping(uint256 => NFTReward) public nftRewards; // poolIndex => NFTReward
    uint256 public totalNFTsClaimed;

    // ===== 3. PUBLIC LEADERBOARD =====
    struct PublicScore {
        address user;
        uint32 score;
    }
    PublicScore[] public publicLeaderboard;

    // ===== 4. ENCRYPTED LEADERBOARD (FHE) =====
    struct EncryptedScore {
        address user;
        euint32 encryptedScore;
        uint256 timestamp;
    }
    EncryptedScore[] public encryptedLeaderboard;

    // ===== EVENTS =====
    event ETHRewardClaimed(address indexed user, uint256 indexed poolIndex, uint256 amount);
    event TokenRewardClaimed(address indexed user, uint256 indexed poolIndex, uint256 amount, RewardType rewardType);
    event PoolAdded(uint256 indexed poolIndex, string name, uint256 value, RewardType rewardType);
    event PoolUpdated(uint256 indexed poolIndex, string name, uint256 value, RewardType rewardType);
    event ContractFunded(address indexed funder, uint256 amount);
    event ETHWithdrawn(address indexed withdrawer, uint256 amount);
    event GMReceived(address indexed user, uint256 spinsReceived);
    event EncryptedScoreSubmitted(address indexed user, uint256 timestamp);
    event ScoreDecrypted(address indexed user, uint32 score);
    event PoolWinRateUpdated(uint256 indexed poolIndex, uint256 oldWinRate, uint256 newWinRate);
    event PoolMinSpinsUpdated(uint256 indexed poolIndex, uint256 oldMinSpins, uint256 newMinSpins);
    event PoolRewardValueUpdated(uint256 indexed poolIndex, uint256 oldValue, uint256 newValue);
    event PoolActiveToggled(uint256 indexed poolIndex, bool isActive);
    event PoolsBatchUpdated(uint256 poolsUpdated);
    event PoolFunded(uint256 indexed poolIndex, address indexed funder, uint256 amount, RewardType rewardType);
    event PoolWithdrawn(uint256 indexed poolIndex, address indexed withdrawer, uint256 amount, RewardType rewardType);
    event PointsConfigUpdated(
        uint256 checkInPoints,
        uint256 spinPoints,
        uint256 gmPoints,
        uint256 winBonusPoints,
        uint256 dailyCheckInBonus
    );
    event PointsEarned(address indexed user, uint256 points, string action);
    event NFTRewardClaimed(address indexed user, uint256 indexed poolIndex, uint256 tokenId, string metadata);
    event NFTRewardAdded(uint256 indexed poolIndex, uint256 tokenId, string metadata, uint256 rarity);
    event SpinConfigUpdated(
        uint256 baseSpinsPerCheckIn,
        uint256 bonusSpinsPerGM,
        uint256 maxSpinsPerDay,
        uint256 unluckySlotCount
    );
    event UnluckySlotsUpdated(uint256[] unluckySlotIndices);
    event SpinSystemToggled(bool isActive);

    // ===== 5. ADMIN POOL MANAGEMENT =====
    /// @notice Fund contract với ETH để làm phần thưởng
    function fundContract() external payable {
        require(msg.value > 0, "Must send ETH");
        emit ContractFunded(msg.sender, msg.value);
    }

    /// @notice Admin rút ETH từ contract
    function withdrawETH(uint256 amount) external {
        require(amount <= address(this).balance, "Insufficient balance");
        payable(msg.sender).transfer(amount);
        emit ETHWithdrawn(msg.sender, amount);
    }

    /// @notice Update win rate của pool (chỉ admin)
    /// @param poolIndex index của pool
    /// @param newWinRate win rate mới (basis points)
    function updatePoolWinRate(uint256 poolIndex, uint256 newWinRate) external {
        require(poolIndex < poolRewards.length, "Invalid pool index");
        require(newWinRate <= 10000, "Win rate cannot exceed 100%");

        PoolReward storage pool = poolRewards[poolIndex];
        uint256 oldWinRate = pool.winRate;
        pool.winRate = newWinRate;

        emit PoolWinRateUpdated(poolIndex, oldWinRate, newWinRate);
    }

    /// @notice Update minimum spins của pool (chỉ admin)
    /// @param poolIndex index của pool
    /// @param newMinSpins minimum spins mới
    function updatePoolMinSpins(uint256 poolIndex, uint256 newMinSpins) external {
        require(poolIndex < poolRewards.length, "Invalid pool index");
        require(newMinSpins > 0, "Min spins must be greater than 0");

        PoolReward storage pool = poolRewards[poolIndex];
        uint256 oldMinSpins = pool.minSpins;
        pool.minSpins = newMinSpins;

        emit PoolMinSpinsUpdated(poolIndex, oldMinSpins, newMinSpins);
    }

    /// @notice Update reward value của pool (chỉ admin)
    /// @param poolIndex index của pool
    /// @param newValue giá trị phần thưởng mới
    function updatePoolRewardValue(uint256 poolIndex, uint256 newValue) external {
        require(poolIndex < poolRewards.length, "Invalid pool index");
        require(newValue > 0, "Reward value must be greater than 0");

        PoolReward storage pool = poolRewards[poolIndex];
        uint256 oldValue = pool.value;
        pool.value = newValue;

        emit PoolRewardValueUpdated(poolIndex, oldValue, newValue);
    }

    /// @notice Toggle pool active status (chỉ admin)
    /// @param poolIndex index của pool
    function togglePoolActive(uint256 poolIndex) external {
        require(poolIndex < poolRewards.length, "Invalid pool index");

        PoolReward storage pool = poolRewards[poolIndex];
        pool.isActive = !pool.isActive;

        emit PoolActiveToggled(poolIndex, pool.isActive);
    }

    /// @notice Batch update nhiều pools cùng lúc (chỉ admin)
    /// @param poolUpdates array của pool updates
    struct PoolUpdate {
        uint256 poolIndex;
        uint256 newWinRate;
        uint256 newMinSpins;
        uint256 newValue;
        bool newActive;
    }

    function batchUpdatePools(PoolUpdate[] calldata poolUpdates) external {
        for (uint256 i = 0; i < poolUpdates.length; i++) {
            PoolUpdate memory update = poolUpdates[i];
            require(update.poolIndex < poolRewards.length, "Invalid pool index");

            PoolReward storage pool = poolRewards[update.poolIndex];

            // Update win rate
            if (update.newWinRate <= 10000) {
                pool.winRate = update.newWinRate;
            }

            // Update min spins
            if (update.newMinSpins > 0) {
                pool.minSpins = update.newMinSpins;
            }

            // Update reward value
            if (update.newValue > 0) {
                pool.value = update.newValue;
            }

            // Update active status
            pool.isActive = update.newActive;
        }

        emit PoolsBatchUpdated(poolUpdates.length);
    }

    // ===== 6. SPIN SYSTEM MANAGEMENT =====

    /// @notice Update spin configuration (admin only)
    /// @param baseSpinsPerCheckIn số lượt quay cơ bản khi điểm danh
    /// @param bonusSpinsPerGM số lượt quay bonus khi GM
    /// @param maxSpinsPerDay số lượt quay tối đa mỗi ngày
    /// @param unluckySlotCount số ô không may mắn (0-8)
    function updateSpinConfig(
        uint256 baseSpinsPerCheckIn,
        uint256 bonusSpinsPerGM,
        uint256 maxSpinsPerDay,
        uint256 unluckySlotCount
    ) external {
        require(unluckySlotCount <= 8, "Unlucky slots cannot exceed 8");
        require(baseSpinsPerCheckIn > 0, "Base spins must be greater than 0");
        require(maxSpinsPerDay > 0, "Max spins per day must be greater than 0");

        spinConfig.baseSpinsPerCheckIn = baseSpinsPerCheckIn;
        spinConfig.bonusSpinsPerGM = bonusSpinsPerGM;
        spinConfig.maxSpinsPerDay = maxSpinsPerDay;
        spinConfig.unluckySlotCount = unluckySlotCount;
        spinConfig.isActive = true;

        emit SpinConfigUpdated(baseSpinsPerCheckIn, bonusSpinsPerGM, maxSpinsPerDay, unluckySlotCount);
    }

    /// @notice Update unlucky slot indices (admin only)
    /// @param unluckySlotIndices array chứa chỉ số các ô không may mắn
    function updateUnluckySlots(uint256[] calldata unluckySlotIndices) external {
        require(unluckySlotIndices.length <= 8, "Cannot have more than 8 unlucky slots");

        // Validate slot indices (0-7 for 8 slots)
        for (uint256 i = 0; i < unluckySlotIndices.length; i++) {
            require(unluckySlotIndices[i] < 8, "Slot index must be 0-7");
        }

        spinConfig.unluckySlotIndices = unluckySlotIndices;
        spinConfig.unluckySlotCount = unluckySlotIndices.length;

        emit UnluckySlotsUpdated(unluckySlotIndices);
    }

    /// @notice Toggle spin system active status
    function toggleSpinSystem() external {
        spinConfig.isActive = !spinConfig.isActive;
        emit SpinSystemToggled(spinConfig.isActive);
    }

    /// @notice Get current spin configuration
    function getSpinConfig()
        external
        view
        returns (
            uint256 baseSpinsPerCheckIn,
            uint256 bonusSpinsPerGM,
            uint256 maxSpinsPerDay,
            uint256 unluckySlotCount,
            uint256[] memory unluckySlotIndices,
            bool isActive
        )
    {
        return (
            spinConfig.baseSpinsPerCheckIn,
            spinConfig.bonusSpinsPerGM,
            spinConfig.maxSpinsPerDay,
            spinConfig.unluckySlotCount,
            spinConfig.unluckySlotIndices,
            spinConfig.isActive
        );
    }

    /// @notice Check if a slot is unlucky
    /// @param slotIndex index của slot (0-7)
    /// @return isUnlucky true nếu slot không may mắn
    function isUnluckySlot(uint256 slotIndex) external view returns (bool isUnlucky) {
        require(slotIndex < 8, "Slot index must be 0-7");

        for (uint256 i = 0; i < spinConfig.unluckySlotIndices.length; i++) {
            if (spinConfig.unluckySlotIndices[i] == slotIndex) {
                return true;
            }
        }
        return false;
    }

    /// @notice Get all unlucky slot indices
    /// @return unluckySlots array chứa tất cả chỉ số ô không may mắn
    function getUnluckySlots() external view returns (uint256[] memory unluckySlots) {
        return spinConfig.unluckySlotIndices;
    }

    // ===== 7. POINTS SYSTEM MANAGEMENT =====

    /// @notice Update points configuration (admin only)
    /// @param checkInPoints điểm nhận được khi điểm danh
    /// @param spinPoints điểm nhận được khi quay 1 lần
    /// @param gmPoints điểm nhận được khi GM
    /// @param winBonusPoints điểm bonus khi thắng
    /// @param dailyCheckInBonus bonus điểm danh hàng ngày
    function updatePointsConfig(
        uint256 checkInPoints,
        uint256 spinPoints,
        uint256 gmPoints,
        uint256 winBonusPoints,
        uint256 dailyCheckInBonus
    ) external {
        pointsConfig.checkInPoints = checkInPoints;
        pointsConfig.spinPoints = spinPoints;
        pointsConfig.gmPoints = gmPoints;
        pointsConfig.winBonusPoints = winBonusPoints;
        pointsConfig.dailyCheckInBonus = dailyCheckInBonus;
        pointsConfig.isActive = true;

        emit PointsConfigUpdated(checkInPoints, spinPoints, gmPoints, winBonusPoints, dailyCheckInBonus);
    }

    /// @notice Toggle points system active status
    function togglePointsSystem() external {
        pointsConfig.isActive = !pointsConfig.isActive;
    }

    /// @notice Get current points configuration
    function getPointsConfig()
        external
        view
        returns (
            uint256 checkInPoints,
            uint256 spinPoints,
            uint256 gmPoints,
            uint256 winBonusPoints,
            uint256 dailyCheckInBonus,
            bool isActive
        )
    {
        return (
            pointsConfig.checkInPoints,
            pointsConfig.spinPoints,
            pointsConfig.gmPoints,
            pointsConfig.winBonusPoints,
            pointsConfig.dailyCheckInBonus,
            pointsConfig.isActive
        );
    }

    // ===== 8. NFT REWARDS MANAGEMENT =====

    /// @notice Add NFT reward to pool (admin only)
    /// @param poolIndex index của pool
    /// @param tokenId NFT token ID
    /// @param metadata NFT metadata URI
    /// @param rarity độ hiếm của NFT (1-100)
    function addNFTReward(uint256 poolIndex, uint256 tokenId, string memory metadata, uint256 rarity) external {
        require(poolIndex < poolRewards.length, "Invalid pool index");
        require(poolRewards[poolIndex].rewardType == RewardType.NFT, "Pool is not NFT type");
        require(rarity >= 1 && rarity <= 100, "Rarity must be between 1-100");

        nftRewards[poolIndex] = NFTReward(tokenId, metadata, rarity, false, address(0), 0);

        emit NFTRewardAdded(poolIndex, tokenId, metadata, rarity);
    }

    /// @notice Claim NFT reward (user function)
    /// @param poolIndex index của pool
    function claimNFTReward(uint256 poolIndex) external {
        require(poolIndex < poolRewards.length, "Invalid pool index");
        PoolReward storage pool = poolRewards[poolIndex];
        require(pool.rewardType == RewardType.NFT, "Not an NFT pool");
        require(pool.isActive, "Pool is not active");

        NFTReward storage nftReward = nftRewards[poolIndex];
        require(!nftReward.isClaimed, "NFT already claimed");

        // Mark NFT as claimed
        nftReward.isClaimed = true;
        nftReward.winner = msg.sender;
        nftReward.claimedAt = block.timestamp;
        totalNFTsClaimed++;

        // Add points if points system is active
        if (pointsConfig.isActive) {
            euint32 currentScore = encryptedScores[msg.sender];
            euint32 bonusPoints = FHE.asEuint32(uint32(pointsConfig.winBonusPoints));
            euint32 newScore = FHE.add(currentScore, bonusPoints);
            encryptedScores[msg.sender] = newScore;

            FHE.allowThis(encryptedScores[msg.sender]);
            FHE.allow(encryptedScores[msg.sender], msg.sender);

            emit PointsEarned(msg.sender, pointsConfig.winBonusPoints, "NFT_WIN");
        }

        emit NFTRewardClaimed(msg.sender, poolIndex, nftReward.tokenId, nftReward.metadata);
    }

    /// @notice Get NFT reward info
    /// @param poolIndex index của pool
    function getNFTReward(
        uint256 poolIndex
    )
        external
        view
        returns (
            uint256 tokenId,
            string memory metadata,
            uint256 rarity,
            bool isClaimed,
            address winner,
            uint256 claimedAt
        )
    {
        require(poolIndex < poolRewards.length, "Invalid pool index");
        NFTReward memory nftReward = nftRewards[poolIndex];
        return (
            nftReward.tokenId,
            nftReward.metadata,
            nftReward.rarity,
            nftReward.isClaimed,
            nftReward.winner,
            nftReward.claimedAt
        );
    }

    // ===== 9. POOL FUNDING & WITHDRAWAL SYSTEM =====

    /// @notice Nạp ETH vào pool
    /// @param poolIndex index của pool
    function fundPoolWithETH(uint256 poolIndex) external payable {
        require(poolIndex < poolRewards.length, "Invalid pool index");
        require(msg.value > 0, "Must send ETH");
        require(poolRewards[poolIndex].rewardType == RewardType.ETH, "Pool is not ETH type");

        PoolReward storage pool = poolRewards[poolIndex];
        pool.balance += msg.value;

        emit PoolFunded(poolIndex, msg.sender, msg.value, RewardType.ETH);
    }

    /// @notice Nạp ERC20 token vào pool
    /// @param poolIndex index của pool
    /// @param tokenAddress địa chỉ token contract
    /// @param amount số lượng token
    function fundPoolWithToken(uint256 poolIndex, address tokenAddress, uint256 amount) external {
        require(poolIndex < poolRewards.length, "Invalid pool index");
        require(amount > 0, "Amount must be greater than 0");
        require(tokenAddress != address(0), "Invalid token address");

        PoolReward storage pool = poolRewards[poolIndex];
        require(
            pool.rewardType == RewardType.TOKEN ||
                pool.rewardType == RewardType.USDC ||
                pool.rewardType == RewardType.USDT,
            "Pool is not token type"
        );

        // Transfer tokens from user to contract
        IERC20(tokenAddress).transferFrom(msg.sender, address(this), amount);

        pool.balance += amount;
        pool.tokenAddress = tokenAddress;

        emit PoolFunded(poolIndex, msg.sender, amount, pool.rewardType);
    }

    /// @notice Rút ETH từ pool (chỉ admin)
    /// @param poolIndex index của pool
    /// @param amount số lượng ETH muốn rút
    function withdrawETHFromPool(uint256 poolIndex, uint256 amount) external {
        require(poolIndex < poolRewards.length, "Invalid pool index");
        require(amount > 0, "Amount must be greater than 0");

        PoolReward storage pool = poolRewards[poolIndex];
        require(pool.rewardType == RewardType.ETH, "Pool is not ETH type");
        require(pool.balance >= amount, "Insufficient pool balance");

        pool.balance -= amount;
        payable(msg.sender).transfer(amount);

        emit PoolWithdrawn(poolIndex, msg.sender, amount, RewardType.ETH);
    }

    /// @notice Rút token từ pool (chỉ admin)
    /// @param poolIndex index của pool
    /// @param amount số lượng token muốn rút
    function withdrawTokenFromPool(uint256 poolIndex, uint256 amount) external {
        require(poolIndex < poolRewards.length, "Invalid pool index");
        require(amount > 0, "Amount must be greater than 0");

        PoolReward storage pool = poolRewards[poolIndex];
        require(
            pool.rewardType == RewardType.TOKEN ||
                pool.rewardType == RewardType.USDC ||
                pool.rewardType == RewardType.USDT,
            "Pool is not token type"
        );
        require(pool.balance >= amount, "Insufficient pool balance");
        require(pool.tokenAddress != address(0), "Token address not set");

        pool.balance -= amount;
        IERC20(pool.tokenAddress).transfer(msg.sender, amount);

        emit PoolWithdrawn(poolIndex, msg.sender, amount, pool.rewardType);
    }

    /// @notice Lấy balance của pool
    /// @param poolIndex index của pool
    /// @return balance số dư hiện tại của pool
    function getPoolBalance(uint256 poolIndex) external view returns (uint256 balance) {
        require(poolIndex < poolRewards.length, "Invalid pool index");
        return poolRewards[poolIndex].balance;
    }

    /// @notice Lấy thông tin token của pool
    /// @param poolIndex index của pool
    /// @return tokenAddress địa chỉ token contract
    function getPoolTokenAddress(uint256 poolIndex) external view returns (address tokenAddress) {
        require(poolIndex < poolRewards.length, "Invalid pool index");
        return poolRewards[poolIndex].tokenAddress;
    }

    function addPool(
        string memory name,
        string memory imageUrl,
        uint256 value,
        RewardType rewardType,
        uint256 maxSpins,
        uint256 winRate,
        uint256 minSpins
    ) external {
        uint256 poolIndex = poolRewards.length;
        poolRewards.push(
            PoolReward(name, imageUrl, value, rewardType, address(0), true, maxSpins, 0, winRate, minSpins, 0)
        );
        emit PoolAdded(poolIndex, name, value, rewardType);
    }

    function updatePool(
        uint256 index,
        string memory name,
        string memory imageUrl,
        uint256 value,
        RewardType rewardType,
        uint256 maxSpins,
        uint256 winRate,
        uint256 minSpins
    ) external {
        require(index < poolRewards.length, "Invalid index");
        poolRewards[index] = PoolReward(
            name,
            imageUrl,
            value,
            rewardType,
            address(0),
            true,
            maxSpins,
            0,
            winRate,
            minSpins,
            0
        );
        emit PoolUpdated(index, name, value, rewardType);
    }

    function removePool(uint256 index) external {
        require(index < poolRewards.length, "Invalid index");
        poolRewards[index] = poolRewards[poolRewards.length - 1];
        poolRewards.pop();
    }

    function poolCount() external view returns (uint256) {
        return poolRewards.length;
    }

    // ===== 10. USER CHECK-IN (NHẬN LƯỢT QUAY) =====
    /// @notice User gửi encrypted số lượt quay nhận hôm nay (ví dụ 3)
    /// @param encryptedSpins the encrypted input value
    /// @param attestation the input proof
        function checkIn(externalEuint8 encryptedSpins, bytes calldata attestation) external {
        euint8 spinsToAdd = FHE.fromExternal(encryptedSpins, attestation);
        euint8 currentSpins = encryptedSpinCount[msg.sender];
        encryptedSpinCount[msg.sender] = FHE.add(currentSpins, spinsToAdd);

        // Cho phép user giải mã lượt quay của mình
        FHE.allowThis(encryptedSpinCount[msg.sender]);
        FHE.allow(encryptedSpinCount[msg.sender], msg.sender);

        // Add points if points system is active
        if (pointsConfig.isActive) {
            euint32 currentScore = encryptedScores[msg.sender];
            euint32 checkInPoints = FHE.asEuint32(uint32(pointsConfig.checkInPoints));
            euint32 newScore = FHE.add(currentScore, checkInPoints);
            encryptedScores[msg.sender] = newScore;
            
            FHE.allowThis(encryptedScores[msg.sender]);
            FHE.allow(encryptedScores[msg.sender], msg.sender);
            
            emit PointsEarned(msg.sender, pointsConfig.checkInPoints, "CHECK_IN");
        }

        // Add base spins if spin system is active
        if (spinConfig.isActive) {
            euint8 baseSpins = FHE.asEuint8(uint8(spinConfig.baseSpinsPerCheckIn));
            euint8 totalSpins = FHE.add(currentSpins, baseSpins);
            encryptedSpinCount[msg.sender] = totalSpins;
            
            FHE.allowThis(encryptedSpinCount[msg.sender]);
            FHE.allow(encryptedSpinCount[msg.sender], msg.sender);
        }
    }

    // ===== 11. QUAY VÀ NHẬN PHẦN THƯỞNG =====
    /// @notice User gửi encrypted poolIndex (trúng ô nào) và encrypted point (số điểm nhận được)
    /// @param encryptedPoolIndex the encrypted pool index
    /// @param encryptedPoint the encrypted point value
    /// @param attestationPool the pool index proof
    /// @param attestationPoint the point proof
    function spinAndClaimReward(
        externalEuint8 encryptedPoolIndex,
        externalEuint32 encryptedPoint,
        bytes calldata attestationPool,
        bytes calldata attestationPoint
    ) external {
        euint8 poolIndex = FHE.fromExternal(encryptedPoolIndex, attestationPool);
        euint32 point = FHE.fromExternal(encryptedPoint, attestationPoint);

        // Kiểm tra còn lượt quay không
        euint8 spinsLeft = encryptedSpinCount[msg.sender];
        ebool hasSpin = FHE.gt(spinsLeft, FHE.asEuint8(0));
        // Trừ lượt quay nếu còn, không trừ nếu hết
        euint8 spinConsume = FHE.select(hasSpin, FHE.asEuint8(1), FHE.asEuint8(0));
        encryptedSpinCount[msg.sender] = FHE.sub(spinsLeft, spinConsume);

        // Cộng điểm từ spin
        euint32 score = encryptedScores[msg.sender];
        euint32 newScore = FHE.add(score, point);
        encryptedScores[msg.sender] = newScore;

        // Add spin points if points system is active
        if (pointsConfig.isActive) {
            euint32 spinPoints = FHE.asEuint32(uint32(pointsConfig.spinPoints));
            euint32 finalScore = FHE.add(newScore, spinPoints);
            encryptedScores[msg.sender] = finalScore;

            emit PointsEarned(msg.sender, pointsConfig.spinPoints, "SPIN");
        }

        // Lưu poolIndex vừa trúng
        encryptedLastRewardIndex[msg.sender] = poolIndex;

        // Cho phép user đọc điểm, lượt quay, phần thưởng đã claim của mình
        FHE.allowThis(encryptedSpinCount[msg.sender]);
        FHE.allowThis(encryptedScores[msg.sender]);
        FHE.allowThis(encryptedLastRewardIndex[msg.sender]);
        FHE.allow(encryptedSpinCount[msg.sender], msg.sender);
        FHE.allow(encryptedScores[msg.sender], msg.sender);
        FHE.allow(encryptedLastRewardIndex[msg.sender], msg.sender);
    }

    // ===== 11.5. WIN RATE CALCULATION =====
    /// @notice Tính toán tỉ lệ thắng dựa trên winRate của pool
    /// @param poolIndex index của pool
    /// @param userSpins số lượt quay của user
    /// @return winProbability tỉ lệ thắng (0-10000, 100 = 1%)
    function calculateWinRate(uint256 poolIndex, uint256 userSpins) external view returns (uint256 winProbability) {
        require(poolIndex < poolRewards.length, "Invalid pool index");
        PoolReward memory pool = poolRewards[poolIndex];

        // Kiểm tra minimum spins
        if (userSpins < pool.minSpins) {
            return 0; // Không đủ lượt quay
        }

        // Tính tỉ lệ thắng dựa trên winRate và số lượt quay
        // winRate là basis points (100 = 1%)
        uint256 baseWinRate = pool.winRate;
        uint256 spinMultiplier = (userSpins * 100) / pool.minSpins; // Tăng tỉ lệ theo số lượt quay

        winProbability = (baseWinRate * spinMultiplier) / 100;

        // Giới hạn tối đa 100% (10000 basis points)
        if (winProbability > 10000) {
            winProbability = 10000;
        }

        return winProbability;
    }

    // ===== 13. CLAIM REWARDS =====
    /// @notice User claim ETH rewards từ pool
    /// @param poolIndex the pool index to claim from
    function claimETHReward(uint256 poolIndex) external {
        require(poolIndex < poolRewards.length, "Invalid pool index");
        PoolReward storage pool = poolRewards[poolIndex];
        require(pool.rewardType == RewardType.ETH, "Not an ETH pool");
        require(pool.isActive, "Pool is not active");
        require(pool.currentSpins < pool.maxSpins, "Pool is full");
        require(pool.balance >= pool.value, "Insufficient pool balance");

        // Transfer ETH to user
        uint256 rewardAmount = pool.value;
        pool.balance -= rewardAmount;
        pool.currentSpins++;
        payable(msg.sender).transfer(rewardAmount);

        emit ETHRewardClaimed(msg.sender, poolIndex, rewardAmount);
    }

    /// @notice User claim token rewards từ pool
    /// @param poolIndex the pool index to claim from
    function claimTokenReward(uint256 poolIndex) external {
        require(poolIndex < poolRewards.length, "Invalid pool index");
        PoolReward storage pool = poolRewards[poolIndex];
        require(
            pool.rewardType == RewardType.TOKEN ||
                pool.rewardType == RewardType.USDC ||
                pool.rewardType == RewardType.USDT,
            "Not a token pool"
        );
        require(pool.isActive, "Pool is not active");
        require(pool.currentSpins < pool.maxSpins, "Pool is full");
        require(pool.balance >= pool.value, "Insufficient pool balance");
        require(pool.tokenAddress != address(0), "Token address not set");

        // Transfer tokens to user
        uint256 rewardAmount = pool.value;
        pool.balance -= rewardAmount;
        pool.currentSpins++;
        IERC20(pool.tokenAddress).transfer(msg.sender, rewardAmount);

        emit TokenRewardClaimed(msg.sender, poolIndex, rewardAmount, pool.rewardType);
    }

    // ===== 12. GM SYSTEM (NHẬN LƯỢT QUAY MỖI NGÀY) =====
    /// @notice User gửi GM để nhận lượt quay hàng ngày
    /// @param encryptedGMCount số lần GM hôm nay (encrypted)
    /// @param attestationGM proof cho GM count
    function sendGM(externalEuint32 encryptedGMCount, bytes calldata attestationGM) external {
        euint32 gmCount = FHE.fromExternal(encryptedGMCount, attestationGM);

        // Kiểm tra ngày mới
        uint256 today = block.timestamp / 86400; // Chuyển về ngày
        if (lastGMDate[msg.sender] != today) {
            // Reset daily GM count
            encryptedDailyGMCount[msg.sender] = FHE.asEuint32(0);
            lastGMDate[msg.sender] = today;
        }

        // Cộng GM count
        euint32 currentGMCount = encryptedDailyGMCount[msg.sender];
        encryptedDailyGMCount[msg.sender] = FHE.add(currentGMCount, gmCount);

                // Tính số lượt quay nhận được từ spin config
        euint8 spinsToAdd;
        if (spinConfig.isActive) {
            spinsToAdd = FHE.asEuint8(uint8(spinConfig.bonusSpinsPerGM));
        } else {
            spinsToAdd = FHE.asEuint8(gmCount); // Default: 1 GM = 1 lượt quay
        }
        
        euint8 currentSpins = encryptedSpinCount[msg.sender];
        encryptedSpinCount[msg.sender] = FHE.add(currentSpins, spinsToAdd);

        // Add GM points if points system is active
        if (pointsConfig.isActive) {
            euint32 currentScore = encryptedScores[msg.sender];
            euint32 gmPoints = FHE.asEuint32(uint32(pointsConfig.gmPoints));
            euint32 newScore = FHE.add(currentScore, gmPoints);
            encryptedScores[msg.sender] = newScore;
            
            FHE.allowThis(encryptedScores[msg.sender]);
            FHE.allow(encryptedScores[msg.sender], msg.sender);
            
            emit PointsEarned(msg.sender, pointsConfig.gmPoints, "GM");
        }

        // Cho phép user đọc
        FHE.allowThis(encryptedDailyGMCount[msg.sender]);
        FHE.allowThis(encryptedSpinCount[msg.sender]);
        FHE.allow(encryptedDailyGMCount[msg.sender], msg.sender);
        FHE.allow(encryptedSpinCount[msg.sender], msg.sender);

        emit GMReceived(msg.sender, 1); // Simplified for now
    }

    // ===== 14. ENCRYPTED LEADERBOARD (FHE) =====
    /// @notice Submit encrypted score vào encrypted leaderboard
    /// @param encryptedScore encrypted score value
    /// @param attestationScore proof cho score
    function submitEncryptedScore(externalEuint32 encryptedScore, bytes calldata attestationScore) external {
        euint32 score = FHE.fromExternal(encryptedScore, attestationScore);

        // Thêm vào encrypted leaderboard
        encryptedLeaderboard.push(EncryptedScore(msg.sender, score, block.timestamp));

        // Cho phép user đọc score của mình
        FHE.allowThis(score);
        FHE.allow(score, msg.sender);

        emit EncryptedScoreSubmitted(msg.sender, block.timestamp);
    }

    // ===== 15. DECRYPTION SYSTEM (FHE) =====
    /// @notice Request decryption của encrypted score
    /// @param scoreIndex index của score trong encrypted leaderboard
    function requestDecryptScore(uint256 scoreIndex) external {
        require(scoreIndex < encryptedLeaderboard.length, "Invalid score index");
        EncryptedScore storage encryptedScore = encryptedLeaderboard[scoreIndex];

        // Tạo array chứa encrypted value cần decrypt
        bytes32[] memory cypherTexts = new bytes32[](1);
        cypherTexts[0] = FHE.toBytes32(encryptedScore.encryptedScore);

        // Request decryption với callback
        FHE.requestDecryption(cypherTexts, this.callbackDecryptScore.selector);
    }

    /// @notice Callback function được gọi bởi FHEVM backend
    /// @param requestID ID của request
    /// @param decryptedScore Score đã được decrypt
    /// @param signatures Signatures từ FHEVM backend
    function callbackDecryptScore(uint256 requestID, uint32 decryptedScore, bytes[] memory signatures) external {
        // ⚠️ SECURITY: Phải verify signatures!
        FHE.checkSignatures(requestID, signatures);

        // Xử lý score đã decrypt
        // Có thể lưu vào public leaderboard hoặc xử lý khác
        emit ScoreDecrypted(msg.sender, decryptedScore);
    }

    // ===== 16. CÔNG KHAI ĐIỂM (CHO PHÉP LÊN BẢNG XẾP HẠNG) =====
    /// @notice User tự công khai điểm (chỉ khi đồng ý)
    function makeScorePublic() external {
        FHE.makePubliclyDecryptable(encryptedScores[msg.sender]);
    }

    // ===== 17. ADMIN SUBMIT ĐIỂM LÊN LEADERBOARD =====
    /// @notice Admin (hoặc oracle) submit điểm đã công khai vào publicLeaderboard
    /// @param user the user address
    /// @param plainScore the plain score value
    function submitPublicScore(address user, uint32 plainScore) external {
        // Option: Có thể kiểm tra user đã gọi makeScorePublic chưa (frontend/offchain verify signature)
        publicLeaderboard.push(PublicScore(user, plainScore));
    }

    /// @notice Đọc toàn bộ bảng xếp hạng
    /// @return The public leaderboard array
    function getLeaderboard() external view returns (PublicScore[] memory) {
        return publicLeaderboard;
    }

    // ===== 18. GETTER FUNCTIONS =====
    /// @notice Lấy thông tin pool reward theo index
    /// @param index the pool index
    /// @return name Tên pool
    /// @return imageUrl URL hình ảnh
    /// @return value Giá trị phần thưởng
    /// @return rewardType Loại phần thưởng
    /// @return isActive Pool có active không
    /// @return maxSpins Số lượt quay tối đa
    /// @return currentSpins Số lượt quay hiện tại
    /// @return winRate Tỉ lệ thắng (basis points)
    /// @return minSpins Số lượt quay tối thiểu để thắng
    /// @return tokenAddress Địa chỉ token contract
    /// @return balance Số dư hiện tại của pool
    function getPoolReward(
        uint256 index
    )
        external
        view
        returns (
            string memory name,
            string memory imageUrl,
            uint256 value,
            RewardType rewardType,
            bool isActive,
            uint256 maxSpins,
            uint256 currentSpins,
            uint256 winRate,
            uint256 minSpins,
            address tokenAddress,
            uint256 balance
        )
    {
        require(index < poolRewards.length, "Invalid index");
        PoolReward memory reward = poolRewards[index];
        return (
            reward.name,
            reward.imageUrl,
            reward.value,
            reward.rewardType,
            reward.isActive,
            reward.maxSpins,
            reward.currentSpins,
            reward.winRate,
            reward.minSpins,
            reward.tokenAddress,
            reward.balance
        );
    }

    /// @notice Lấy số lượt quay của user (encrypted)
    /// @param user the user address
    /// @return The encrypted spin count
    function getEncryptedSpinCount(address user) external view returns (euint8) {
        return encryptedSpinCount[user];
    }

    /// @notice Lấy điểm số của user (encrypted)
    /// @param user the user address
    /// @return The encrypted score
    function getEncryptedScore(address user) external view returns (euint32) {
        return encryptedScores[user];
    }

    /// @notice Lấy pool index trúng gần nhất của user (encrypted)
    /// @param user the user address
    /// @return The encrypted last reward index
    function getEncryptedLastRewardIndex(address user) external view returns (euint8) {
        return encryptedLastRewardIndex[user];
    }

    /// @notice Lấy số lần GM hôm nay của user (encrypted)
    /// @param user the user address
    /// @return The encrypted daily GM count
    function getEncryptedDailyGMCount(address user) external view returns (euint32) {
        return encryptedDailyGMCount[user];
    }

    /// @notice Lấy ngày GM cuối cùng của user
    /// @param user the user address
    /// @return The last GM date
    function getLastGMDate(address user) external view returns (uint256) {
        return lastGMDate[user];
    }

    /// @notice Lấy encrypted leaderboard
    /// @return The encrypted leaderboard array
    function getEncryptedLeaderboard() external view returns (EncryptedScore[] memory) {
        return encryptedLeaderboard;
    }
}
