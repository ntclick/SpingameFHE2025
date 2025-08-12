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

/// @title LuckySpinFHE_Enhanced - Contract điểm danh, quay thưởng, bảng xếp hạng với FHE (Enhanced)
/// @author fhevm-hardhat-template
/// @notice Contract cho phép user điểm danh nhận lượt quay, quay thưởng và xếp hạng với FHEVM standards
/// @dev Sử dụng Zama FHEVM với enhanced features: transient access, validation, random generation
contract LuckySpinFHE_Enhanced is SepoliaConfig {
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

    // ===== 5. ENHANCED FHE FEATURES =====
    // Random seed for enhanced spin logic
    uint256 private randomSeed;

    // Access control tracking
    mapping(address => mapping(bytes32 => bool)) private transientAccess;

    // Error tracking for FHE operations
    mapping(address => uint256) public fheOperationErrors;

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

    // Enhanced FHE events
    event TransientAccessGranted(address indexed user, bytes32 indexed ciphertext);
    event TransientAccessRevoked(address indexed user, bytes32 indexed ciphertext);
    event FHEOperationError(address indexed user, uint256 errorCode);
    event RandomSpinGenerated(address indexed user, uint256 randomValue);

    // ===== 6. ENHANCED ACCESS CONTROL =====

    /// @notice Validate user access to encrypted data
    /// @param user the user address
    /// @param dataType the type of data to validate
    function validateUserAccess(address user, string memory dataType) internal view {
        if (keccak256(abi.encodePacked(dataType)) == keccak256(abi.encodePacked("scores"))) {
            require(FHE.isSenderAllowed(encryptedScores[user]), "Access denied to scores");
        } else if (keccak256(abi.encodePacked(dataType)) == keccak256(abi.encodePacked("spins"))) {
            require(FHE.isSenderAllowed(encryptedSpinCount[user]), "Access denied to spins");
        } else if (keccak256(abi.encodePacked(dataType)) == keccak256(abi.encodePacked("gm"))) {
            require(FHE.isSenderAllowed(encryptedDailyGMCount[user]), "Access denied to GM count");
        }
    }

    /// @notice Grant transient access for temporary operations
    /// @param user the user address
    /// @param dataType the type of data to grant access to
    function grantTransientAccess(address user, string memory dataType) internal {
        bytes32 accessKey = keccak256(abi.encodePacked(user, dataType));
        transientAccess[user][accessKey] = true;

        if (keccak256(abi.encodePacked(dataType)) == keccak256(abi.encodePacked("scores"))) {
            FHE.allowTransient(encryptedScores[user], user);
        } else if (keccak256(abi.encodePacked(dataType)) == keccak256(abi.encodePacked("spins"))) {
            FHE.allowTransient(encryptedSpinCount[user], user);
        } else if (keccak256(abi.encodePacked(dataType)) == keccak256(abi.encodePacked("gm"))) {
            FHE.allowTransient(encryptedDailyGMCount[user], user);
        }

        emit TransientAccessGranted(user, accessKey);
    }

    /// @notice Revoke transient access after operation
    /// @param user the user address
    /// @param dataType the type of data to revoke access from
    function revokeTransientAccess(address user, string memory dataType) internal {
        bytes32 accessKey = keccak256(abi.encodePacked(user, dataType));
        transientAccess[user][accessKey] = false;
        emit TransientAccessRevoked(user, accessKey);
    }

    // ===== 7. ENHANCED RANDOM GENERATION =====

    /// @notice Generate random encrypted value for spin logic
    /// @return random encrypted value
    function generateRandomSpin() internal returns (euint8) {
        // Update random seed with modern block properties
        randomSeed = uint256(
            keccak256(
                abi.encodePacked(
                    randomSeed,
                    block.timestamp,
                    block.prevrandao, // Use prevrandao instead of difficulty
                    msg.sender
                )
            )
        );

        // Generate random encrypted value
        euint8 randomValue = FHE.randEuint8();

        emit RandomSpinGenerated(msg.sender, uint256(randomSeed));
        return randomValue;
    }

    /// @notice Enhanced spin logic with random generation
    /// @param encryptedSpins encrypted spins to use
    /// @param attestation attestation for encrypted spins
    /// @param encryptedPoolIndex encrypted pool index
    /// @param attestationPool attestation for pool index
    /// @param encryptedPoint encrypted point to add
    /// @param attestationPoint attestation for point
    function enhancedSpinAndClaimReward(
        externalEuint8 encryptedSpins,
        bytes calldata attestation,
        externalEuint8 encryptedPoolIndex,
        bytes calldata attestationPool,
        externalEuint32 encryptedPoint,
        bytes calldata attestationPoint
    ) external {
        // Validate access
        validateUserAccess(msg.sender, "spins");

        // Grant transient access for this operation
        grantTransientAccess(msg.sender, "spins");
        grantTransientAccess(msg.sender, "scores");

        // Convert external data to internal encrypted types
        euint8 spinsToAdd = FHE.fromExternal(encryptedSpins, attestation);
        euint8 poolIndex = FHE.fromExternal(encryptedPoolIndex, attestationPool);
        euint32 point = FHE.fromExternal(encryptedPoint, attestationPoint);

        // Enhanced spin logic with random generation
        euint8 randomSpin = generateRandomSpin();

        // Get current spins
        euint8 spinsLeft = encryptedSpinCount[msg.sender];
        ebool hasSpin = FHE.gt(spinsLeft, FHE.asEuint8(0));

        // Enhanced spin consumption logic with random factor
        euint8 spinConsume = FHE.select(hasSpin, FHE.asEuint8(1), FHE.asEuint8(0));

        // Apply random factor to spin consumption
        euint8 randomFactor = FHE.and(randomSpin, FHE.asEuint8(0x03)); // 0-3
        spinConsume = FHE.add(spinConsume, randomFactor);

        // Update spins
        encryptedSpinCount[msg.sender] = FHE.sub(spinsLeft, spinConsume);

        // Update scores with enhanced logic
        euint32 score = encryptedScores[msg.sender];
        euint32 newScore = FHE.add(score, point);

        // Add spin points if points system is active
        if (pointsConfig.isActive) {
            euint32 spinPoints = FHE.asEuint32(uint32(pointsConfig.spinPoints));
            euint32 finalScore = FHE.add(newScore, spinPoints);
            encryptedScores[msg.sender] = finalScore;
        } else {
            encryptedScores[msg.sender] = newScore;
        }

        // Update last reward index
        encryptedLastRewardIndex[msg.sender] = poolIndex;

        // Grant persistent access
        FHE.allowThis(encryptedSpinCount[msg.sender]);
        FHE.allowThis(encryptedScores[msg.sender]);
        FHE.allowThis(encryptedLastRewardIndex[msg.sender]);
        FHE.allow(encryptedSpinCount[msg.sender], msg.sender);
        FHE.allow(encryptedScores[msg.sender], msg.sender);
        FHE.allow(encryptedLastRewardIndex[msg.sender], msg.sender);

        // Revoke transient access
        revokeTransientAccess(msg.sender, "spins");
        revokeTransientAccess(msg.sender, "scores");
    }

    // ===== 8. ENHANCED BITWISE OPERATIONS =====

    /// @notice Advanced spin logic with bitwise operations
    /// @param encryptedSpins encrypted spins to process
    /// @param attestation attestation for encrypted spins
    function advancedSpinLogic(externalEuint8 encryptedSpins, bytes calldata attestation) external {
        validateUserAccess(msg.sender, "spins");
        grantTransientAccess(msg.sender, "spins");

        // Convert external data to internal encrypted types
        euint8 spins = FHE.fromExternal(encryptedSpins, attestation);

        // Advanced bitwise operations
        euint8 lowerBits = FHE.and(spins, FHE.asEuint8(0x0F)); // Get lower 4 bits
        euint8 upperBits = FHE.shr(spins, FHE.asEuint8(4)); // Get upper 4 bits
        euint8 shifted = FHE.shl(spins, FHE.asEuint8(1)); // Shift left
        euint8 rotated = FHE.rotl(spins, FHE.asEuint8(2)); // Rotate left by 2

        // Combine operations
        euint8 result = FHE.xor(lowerBits, upperBits);
        result = FHE.add(result, shifted);
        result = FHE.xor(result, rotated);

        // Update spins with advanced logic
        encryptedSpinCount[msg.sender] = result;

        // Grant persistent access
        FHE.allowThis(encryptedSpinCount[msg.sender]);
        FHE.allow(encryptedSpinCount[msg.sender], msg.sender);

        revokeTransientAccess(msg.sender, "spins");
    }

    // ===== 9. ENHANCED ERROR HANDLING =====

    /// @notice Safe FHE operation with comprehensive error handling
    /// @param operation the operation to perform
    /// @param encryptedData encrypted data for operation
    /// @param attestation attestation for encrypted data
    function safeFHEOperation(
        string memory operation,
        externalEuint8 encryptedData,
        bytes calldata attestation
    ) external returns (bool success) {
        // Convert external data to internal encrypted types
        euint8 data = FHE.fromExternal(encryptedData, attestation);

        if (keccak256(abi.encodePacked(operation)) == keccak256(abi.encodePacked("checkin"))) {
            // Safe check-in operation
            euint8 currentSpins = encryptedSpinCount[msg.sender];
            euint8 newSpins = FHE.add(currentSpins, data);
            encryptedSpinCount[msg.sender] = newSpins;

            FHE.allowThis(encryptedSpinCount[msg.sender]);
            FHE.allow(encryptedSpinCount[msg.sender], msg.sender);

            success = true;
        } else if (keccak256(abi.encodePacked(operation)) == keccak256(abi.encodePacked("gm"))) {
            // Safe GM operation
            euint32 currentGM = encryptedDailyGMCount[msg.sender];
            euint32 newGM = FHE.add(currentGM, FHE.asEuint32(1)); // Use fixed value for GM increment
            encryptedDailyGMCount[msg.sender] = newGM;

            FHE.allowThis(encryptedDailyGMCount[msg.sender]);
            FHE.allow(encryptedDailyGMCount[msg.sender], msg.sender);

            success = true;
        } else {
            success = false;
        }
    }

    // ===== 10. LEGACY FUNCTIONS (Maintained for compatibility) =====

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

    /// @notice Add new pool reward
    /// @param name pool name
    /// @param imageUrl pool image URL
    /// @param value pool value
    /// @param rewardType type of reward
    /// @param maxSpins maximum spins
    /// @param winRate win rate in basis points
    /// @param minSpins minimum spins required
    function addPool(
        string memory name,
        string memory imageUrl,
        uint256 value,
        RewardType rewardType,
        uint256 maxSpins,
        uint256 winRate,
        uint256 minSpins
    ) external {
        poolRewards.push(
            PoolReward(
                name,
                imageUrl,
                value,
                rewardType,
                address(0), // tokenAddress
                true, // isActive
                maxSpins,
                0, // currentSpins
                winRate,
                minSpins,
                0 // balance
            )
        );

        emit PoolAdded(poolRewards.length - 1, name, value, rewardType);
    }

    /// @notice Update points configuration
    /// @param checkInPoints points for check-in
    /// @param spinPoints points for spin
    /// @param gmPoints points for GM
    /// @param winBonusPoints bonus points for winning
    /// @param dailyCheckInBonus daily check-in bonus
    function updatePointsConfig(
        uint256 checkInPoints,
        uint256 spinPoints,
        uint256 gmPoints,
        uint256 winBonusPoints,
        uint256 dailyCheckInBonus
    ) external {
        pointsConfig = PointsConfig(checkInPoints, spinPoints, gmPoints, winBonusPoints, dailyCheckInBonus, true);

        emit PointsConfigUpdated(checkInPoints, spinPoints, gmPoints, winBonusPoints, dailyCheckInBonus);
    }

    /// @notice Update spin configuration
    /// @param baseSpinsPerCheckIn base spins per check-in
    /// @param bonusSpinsPerGM bonus spins per GM
    /// @param maxSpinsPerDay max spins per day
    /// @param unluckySlotCount unlucky slot count
    function updateSpinConfig(
        uint256 baseSpinsPerCheckIn,
        uint256 bonusSpinsPerGM,
        uint256 maxSpinsPerDay,
        uint256 unluckySlotCount
    ) external {
        spinConfig = SpinConfig(
            baseSpinsPerCheckIn,
            bonusSpinsPerGM,
            maxSpinsPerDay,
            unluckySlotCount,
            new uint256[](0), // unluckySlotIndices
            true
        );

        emit SpinConfigUpdated(baseSpinsPerCheckIn, bonusSpinsPerGM, maxSpinsPerDay, unluckySlotCount);
    }

    // ===== 11. ENHANCED GETTER FUNCTIONS =====

    /// @notice Get FHE operation error count for user
    /// @param user the user address
    /// @return error count
    function getFHEOperationErrors(address user) external view returns (uint256) {
        return fheOperationErrors[user];
    }

    /// @notice Check if user has transient access
    /// @param user the user address
    /// @param dataType the data type
    /// @return has access
    function hasTransientAccess(address user, string memory dataType) external view returns (bool) {
        bytes32 accessKey = keccak256(abi.encodePacked(user, dataType));
        return transientAccess[user][accessKey];
    }

    /// @notice Get random seed (for debugging)
    /// @return current random seed
    function getRandomSeed() external view returns (uint256) {
        return randomSeed;
    }

    /// @notice Get points configuration
    /// @return points configuration
    function getPointsConfig() external view returns (PointsConfig memory) {
        return pointsConfig;
    }

    /// @notice Get spin configuration
    /// @return spin configuration
    function getSpinConfig() external view returns (SpinConfig memory) {
        return spinConfig;
    }

    /// @notice Get pool reward by index
    /// @param index pool index
    /// @return pool reward
    function getPoolReward(uint256 index) external view returns (PoolReward memory) {
        require(index < poolRewards.length, "Invalid index");
        return poolRewards[index];
    }
}
