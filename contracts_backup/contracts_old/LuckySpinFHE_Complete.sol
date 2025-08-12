// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {
    FHE,
    euint8,
    euint32,
    euint64,
    externalEuint8,
    externalEuint32,
    externalEuint64,
    ebool,
    eaddress
} from "@fhevm/solidity/lib/FHE.sol";
import {SepoliaConfig} from "@fhevm/solidity/config/ZamaConfig.sol";

// IERC20 interface for token operations
interface IERC20 {
    function transfer(address to, uint256 amount) external returns (bool);

    function transferFrom(address from, address to, uint256 amount) external returns (bool);

    function balanceOf(address account) external view returns (uint256);

    function approve(address spender, uint256 amount) external returns (bool);

    function allowance(address owner, address spender) external view returns (uint256);
}

/// @title LuckySpinFHE_Complete - Contract hoàn chỉnh tuân thủ FHEVM Standards
/// @author FHEVM Team
/// @notice Contract Lucky Spin với tất cả tính năng: Điểm danh, Quay thưởng, Bảng xếp hạng, NFT, Points
/// @dev Tuân thủ hoàn toàn FHEVM: encrypted data, no refund, pool funding system
contract LuckySpinFHE_Complete is SepoliaConfig {
    // ===== 1. POOL REWARDS SYSTEM =====
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
        string name; // Tên pool
        string imageUrl; // URL hình ảnh
        uint256 value; // Giá trị thưởng (wei cho ETH, amount cho token)
        RewardType rewardType; // Loại thưởng
        address tokenAddress; // Địa chỉ token (cho ERC20)
        bool isActive; // Pool có hoạt động không
        uint256 maxSpins; // Số lượt quay tối đa
        uint256 currentSpins; // Số lượt đã quay
        uint256 winRate; // Tỉ lệ thắng (basis points: 100 = 1%)
        uint256 minSpins; // Số lượt quay tối thiểu để được thưởng
        uint256 balance; // Số dư hiện tại của pool
    }
    PoolReward[] public poolRewards;

    // ===== 2. ENCRYPTED USER STATE (FHEVM) =====
    mapping(address => euint8) public encryptedSpinCount; // Số lượt quay còn lại (encrypted)
    mapping(address => euint32) public encryptedScores; // Điểm số (encrypted)
    mapping(address => euint8) public encryptedLastRewardIndex; // Pool trúng gần nhất (encrypted)
    mapping(address => euint32) public encryptedDailyGMCount; // Số lần GM hôm nay (encrypted)
    mapping(address => uint256) public lastGMDate; // Ngày GM cuối cùng (public)
    mapping(address => uint256) public lastCheckInDate; // Ngày check-in cuối cùng (public)

    // ===== 3. POINTS SYSTEM =====
    struct PointsConfig {
        uint256 checkInPoints; // Điểm nhận được khi điểm danh
        uint256 spinPoints; // Điểm nhận được khi quay 1 lần
        uint256 gmPoints; // Điểm nhận được khi GM
        uint256 winBonusPoints; // Điểm bonus khi thắng
        uint256 dailyCheckInBonus; // Bonus điểm danh hàng ngày
        bool isActive; // Hệ thống điểm có active không
    }
    PointsConfig public pointsConfig;

    // ===== 4. SPIN SYSTEM CONFIGURATION =====
    struct SpinConfig {
        uint256 baseSpinsPerCheckIn; // Số lượt quay cơ bản khi điểm danh
        uint256 bonusSpinsPerGM; // Số lượt quay bonus khi GM
        uint256 maxSpinsPerDay; // Số lượt quay tối đa mỗi ngày
        uint256 unluckySlotCount; // Số ô không may mắn (0-8)
        uint256[] unluckySlotIndices; // Chỉ số các ô không may mắn
        bool isActive; // Hệ thống spin có active không
    }
    SpinConfig public spinConfig;

    // ===== 5. NFT REWARDS SYSTEM =====
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

    // ===== 6. LEADERBOARD SYSTEMS =====
    struct PublicScore {
        address user;
        uint32 score;
    }
    PublicScore[] public publicLeaderboard;

    struct EncryptedScore {
        address user;
        euint32 encryptedScore;
        uint256 timestamp;
    }
    EncryptedScore[] public encryptedLeaderboard;

    // ===== 7. ENHANCED DECRYPTION SYSTEM =====
    uint256 private latestRequestId;
    mapping(uint256 => bool) private decryptionPending;
    mapping(uint256 => bytes32) private processedRequests;
    mapping(uint256 => address) private requestUser;
    mapping(uint256 => uint256) private requestTimestamp;

    struct DecryptionError {
        uint256 requestId;
        uint256 errorCode;
        string errorMessage;
        uint256 timestamp;
    }
    mapping(uint256 => DecryptionError) private decryptionErrors;

    // ===== 8. ENHANCED ERROR HANDLING =====
    struct LastError {
        uint256 errorCode;
        string errorMessage;
        uint256 timestamp;
        address user;
    }
    mapping(address => LastError) private userLastErrors;

    // Error codes
    uint256 private constant ERROR_INVALID_PROOF = 1;
    uint256 private constant ERROR_DECRYPTION_FAILED = 2;
    uint256 private constant ERROR_ACCESS_DENIED = 3;
    uint256 private constant ERROR_INVALID_INPUT = 4;
    uint256 private constant ERROR_REPLAY_ATTACK = 5;
    uint256 private constant ERROR_INSUFFICIENT_SPINS = 6;
    uint256 private constant ERROR_POOL_INACTIVE = 7;

    // ===== 9. ACCESS CONTROL & RANDOM =====
    uint256 private randomSeed;
    mapping(address => mapping(bytes32 => bool)) private transientAccess;

    // ===== 10. LEADERBOARD DECRYPTION =====
    mapping(address => uint256) public lastScoreRequestId;

    // ===== EVENTS =====
    // Basic events
    event SpinPurchased(address indexed user, uint256 spins, uint256 amount);
    event SpinResult(address indexed user, uint256 poolIndex, bool isWin, uint256 reward);
    event CheckInCompleted(address indexed user, uint256 spinsReceived, uint256 pointsReceived);
    event GMReceived(address indexed user, uint256 spinsReceived, uint256 pointsReceived);
    event ETHRewardClaimed(address indexed user, uint256 indexed poolIndex, uint256 amount);
    event TokenRewardClaimed(address indexed user, uint256 indexed poolIndex, uint256 amount, RewardType rewardType);

    // Pool events
    event PoolAdded(uint256 indexed poolIndex, string name, uint256 value, RewardType rewardType);
    event PoolUpdated(uint256 indexed poolIndex, string name, uint256 value, RewardType rewardType);
    event PoolFunded(uint256 indexed poolIndex, address indexed funder, uint256 amount, RewardType rewardType);
    event PoolWithdrawn(uint256 indexed poolIndex, address indexed withdrawer, uint256 amount, RewardType rewardType);

    // Configuration events
    event PointsConfigUpdated(
        uint256 checkInPoints,
        uint256 spinPoints,
        uint256 gmPoints,
        uint256 winBonusPoints,
        uint256 dailyCheckInBonus
    );
    event SpinConfigUpdated(
        uint256 baseSpinsPerCheckIn,
        uint256 bonusSpinsPerGM,
        uint256 maxSpinsPerDay,
        uint256 unluckySlotCount
    );
    event UnluckySlotsUpdated(uint256[] unluckySlotIndices);

    // NFT events
    event NFTRewardAdded(uint256 indexed poolIndex, uint256 tokenId, string metadata, uint256 rarity);
    event NFTRewardClaimed(address indexed user, uint256 indexed poolIndex, uint256 tokenId, string metadata);

    // Leaderboard events
    event EncryptedScoreUpdated(address indexed user, uint256 timestamp);
    event ScoreDecryptionRequested(address indexed user, uint256 requestId);
    event ScoreDecrypted(address indexed user, uint32 score);
    event PublicScoreAdded(address indexed user, uint32 score);

    // FHE events
    event TransientAccessGranted(address indexed user, bytes32 indexed accessKey);
    event TransientAccessRevoked(address indexed user, bytes32 indexed accessKey);
    event RandomSpinGenerated(address indexed user, uint256 randomValue);
    event FHEOperationError(address indexed user, uint256 errorCode, string errorMessage);

    // Decryption events
    event DecryptionRequested(uint256 indexed requestId, address indexed user, uint256 valueCount);
    event DecryptionCompleted(uint256 indexed requestId, address indexed user, uint256 valueCount);
    event DecryptionErrorOccurred(uint256 indexed requestId, uint256 errorCode, string errorMessage);
    event ReplayProtectionTriggered(uint256 indexed requestId, address indexed user);

    // ===== CONTRACT CONSTRUCTOR =====
    constructor() {
        // Initialize default configurations
        pointsConfig = PointsConfig({
            checkInPoints: 10,
            spinPoints: 5,
            gmPoints: 3,
            winBonusPoints: 20,
            dailyCheckInBonus: 5,
            isActive: true
        });

        spinConfig = SpinConfig({
            baseSpinsPerCheckIn: 2,
            bonusSpinsPerGM: 1,
            maxSpinsPerDay: 10,
            unluckySlotCount: 2,
            unluckySlotIndices: new uint256[](0),
            isActive: true
        });

        // Initialize random seed
        randomSeed = uint256(keccak256(abi.encodePacked(block.timestamp, block.prevrandao, msg.sender)));
    }

    // ===== MUA LƯỢT QUAY (KHÔNG REFUND) =====
    /// @notice Mua lượt quay bằng ETH, không hoàn lại khi thua
    /// @param spins Số lượt quay muốn mua
    function buySpins(uint256 spins) external payable {
        require(spins > 0, "Must buy at least 1 spin");
        require(spins <= 100, "Cannot buy more than 100 spins at once");

        uint256 pricePerSpin = 0.01 ether;
        uint256 totalCost = pricePerSpin * spins;
        require(msg.value == totalCost, "Incorrect ETH sent");

        // Cộng lượt quay cho user (encrypted)
        euint8 currentSpins = encryptedSpinCount[msg.sender];
        euint8 spinsToAdd = FHE.asEuint8(uint8(spins));
        encryptedSpinCount[msg.sender] = FHE.add(currentSpins, spinsToAdd);

        // Grant access
        FHE.allowThis(encryptedSpinCount[msg.sender]);
        FHE.allow(encryptedSpinCount[msg.sender], msg.sender);

        emit SpinPurchased(msg.sender, spins, msg.value);
    }

    // ===== ĐIỂM DANH HÀNG NGÀY =====
    /// @notice Điểm danh hàng ngày để nhận lượt quay và điểm
    function checkIn() external {
        require(block.timestamp >= lastCheckInDate[msg.sender] + 1 days, "Already checked in today");

        lastCheckInDate[msg.sender] = block.timestamp;

        // Thêm lượt quay từ check-in
        uint256 spinsToAdd = spinConfig.isActive ? spinConfig.baseSpinsPerCheckIn : 2;
        euint8 currentSpins = encryptedSpinCount[msg.sender];
        euint8 newSpins = FHE.add(currentSpins, FHE.asEuint8(uint8(spinsToAdd)));
        encryptedSpinCount[msg.sender] = newSpins;

        // Thêm điểm từ check-in
        uint256 pointsToAdd = 0;
        if (pointsConfig.isActive) {
            pointsToAdd = pointsConfig.checkInPoints;
            // Bonus nếu check-in liên tiếp
            if (lastCheckInDate[msg.sender] - 1 days == lastCheckInDate[msg.sender]) {
                pointsToAdd += pointsConfig.dailyCheckInBonus;
            }

            euint32 currentScore = encryptedScores[msg.sender];
            euint32 newScore = FHE.add(currentScore, FHE.asEuint32(uint32(pointsToAdd)));
            encryptedScores[msg.sender] = newScore;
            FHE.allowThis(encryptedScores[msg.sender]);
            FHE.allow(encryptedScores[msg.sender], msg.sender);
        }

        // Grant access for spins
        FHE.allowThis(encryptedSpinCount[msg.sender]);
        FHE.allow(encryptedSpinCount[msg.sender], msg.sender);

        emit CheckInCompleted(msg.sender, spinsToAdd, pointsToAdd);
    }

    // ===== GM HÀNG NGÀY =====
    /// @notice Gửi GM để nhận lượt quay và điểm bonus
    function sendGM() external {
        require(block.timestamp >= lastGMDate[msg.sender] + 1 days, "Already sent GM today");

        lastGMDate[msg.sender] = block.timestamp;

        // Cập nhật GM count (encrypted)
        euint32 currentGMCount = encryptedDailyGMCount[msg.sender];
        euint32 newGMCount = FHE.add(currentGMCount, FHE.asEuint32(1));
        encryptedDailyGMCount[msg.sender] = newGMCount;

        // Thêm lượt quay từ GM
        uint256 spinsToAdd = spinConfig.isActive ? spinConfig.bonusSpinsPerGM : 1;
        euint8 currentSpins = encryptedSpinCount[msg.sender];
        euint8 newSpins = FHE.add(currentSpins, FHE.asEuint8(uint8(spinsToAdd)));
        encryptedSpinCount[msg.sender] = newSpins;

        // Thêm điểm từ GM
        uint256 pointsToAdd = 0;
        if (pointsConfig.isActive) {
            pointsToAdd = pointsConfig.gmPoints;
            euint32 currentScore = encryptedScores[msg.sender];
            euint32 newScore = FHE.add(currentScore, FHE.asEuint32(uint32(pointsToAdd)));
            encryptedScores[msg.sender] = newScore;
            FHE.allowThis(encryptedScores[msg.sender]);
            FHE.allow(encryptedScores[msg.sender], msg.sender);
        }

        // Grant access
        FHE.allowThis(encryptedDailyGMCount[msg.sender]);
        FHE.allow(encryptedDailyGMCount[msg.sender], msg.sender);
        FHE.allowThis(encryptedSpinCount[msg.sender]);
        FHE.allow(encryptedSpinCount[msg.sender], msg.sender);

        emit GMReceived(msg.sender, spinsToAdd, pointsToAdd);
    }

    // ===== QUAY VÀ NHẬN THƯỞNG (CORE FUNCTION) =====
    /// @notice Quay và nhận thưởng với encrypted inputs
    /// @param encryptedPoolIndex Pool index (encrypted)
    /// @param inputProof Proof cho encrypted input
    function spinAndClaimReward(externalEuint8 encryptedPoolIndex, bytes calldata inputProof) external {
        // Validate user access
        _validateUserAccess(msg.sender, "spins");

        // Convert external input
        euint8 poolIndex = FHE.fromExternal(encryptedPoolIndex, inputProof);

        // Grant transient access
        _grantTransientAccess(msg.sender, "spins");
        _grantTransientAccess(msg.sender, "scores");

        // Execute spin logic
        bool success = _doSpinAndClaimReward(poolIndex);

        if (!success) {
            _setLastError(msg.sender, ERROR_INSUFFICIENT_SPINS, "Spin operation failed");
            return;
        }

        // Grant persistent access
        FHE.allowThis(encryptedSpinCount[msg.sender]);
        FHE.allowThis(encryptedScores[msg.sender]);
        FHE.allowThis(encryptedLastRewardIndex[msg.sender]);
        FHE.allow(encryptedSpinCount[msg.sender], msg.sender);
        FHE.allow(encryptedScores[msg.sender], msg.sender);
        FHE.allow(encryptedLastRewardIndex[msg.sender], msg.sender);

        // Revoke transient access
        _revokeTransientAccess(msg.sender, "spins");
        _revokeTransientAccess(msg.sender, "scores");
    }

    /// @notice Internal spin logic với FHE operations
    /// @param poolIndex Pool index (encrypted)
    /// @return success Operation success
    function _doSpinAndClaimReward(euint8 poolIndex) internal returns (bool) {
        // Generate random spin
        euint8 randomSpin = _generateRandomSpin();

        // Get current spins
        euint8 spinsLeft = encryptedSpinCount[msg.sender];
        ebool hasSpin = FHE.gt(spinsLeft, FHE.asEuint8(0));

        // Spin consumption logic với FHE.select
        euint8 spinConsume = FHE.select(hasSpin, FHE.asEuint8(1), FHE.asEuint8(0));

        // Apply random factor to spin consumption
        euint8 randomFactor = FHE.and(randomSpin, FHE.asEuint8(0x03)); // 0-3
        spinConsume = FHE.add(spinConsume, randomFactor);

        // Update spins count
        encryptedSpinCount[msg.sender] = FHE.sub(spinsLeft, spinConsume);

        // Determine win/loss (simplified - in production would use more complex logic)
        ebool isWinner = FHE.lt(randomSpin, FHE.asEuint8(128)); // 50% win rate simplified

        // Update scores with conditional logic
        euint32 currentScore = encryptedScores[msg.sender];
        euint32 basePoints = pointsConfig.isActive ? FHE.asEuint32(uint32(pointsConfig.spinPoints)) : FHE.asEuint32(0);
        euint32 bonusPoints = pointsConfig.isActive
            ? FHE.asEuint32(uint32(pointsConfig.winBonusPoints))
            : FHE.asEuint32(0);

        euint32 pointsToAdd = FHE.select(isWinner, FHE.add(basePoints, bonusPoints), basePoints);
        encryptedScores[msg.sender] = FHE.add(currentScore, pointsToAdd);

        // Update last reward index
        encryptedLastRewardIndex[msg.sender] = poolIndex;

        // Add to encrypted leaderboard
        encryptedLeaderboard.push(
            EncryptedScore({user: msg.sender, encryptedScore: encryptedScores[msg.sender], timestamp: block.timestamp})
        );

        emit EncryptedScoreUpdated(msg.sender, block.timestamp);

        return true;
    }

    // ===== LEADERBOARD DECRYPTION SYSTEM =====
    /// @notice User yêu cầu công khai điểm số của mình
    function makeScorePublic() external {
        euint32 encryptedScore = encryptedScores[msg.sender];
        bytes32[] memory ctsHandles = new bytes32[](1);
        ctsHandles[0] = FHE.toBytes32(encryptedScore);

        latestRequestId++;
        uint256 requestId = latestRequestId;

        // Store request info
        decryptionPending[requestId] = true;
        requestUser[requestId] = msg.sender;
        requestTimestamp[requestId] = block.timestamp;
        lastScoreRequestId[msg.sender] = requestId;

        // Request decryption
        FHE.requestDecryption(ctsHandles, this.scoreDecryptionCallback.selector);

        emit ScoreDecryptionRequested(msg.sender, requestId);
    }

    /// @notice Callback cho score decryption
    /// @param requestId Request identifier
    /// @param decryptedScore Decrypted score
    /// @param signatures KMS signatures
    function scoreDecryptionCallback(uint256 requestId, uint32 decryptedScore, bytes[] memory signatures) public {
        require(decryptionPending[requestId], "Request not pending");

        // Validate signatures
        FHE.checkSignatures(requestId, signatures);

        // Get user from request
        address user = requestUser[requestId];
        require(user != address(0), "Invalid user");

        // Replay protection
        bytes32 signaturesHash = keccak256(abi.encode(signatures));
        bytes32 requestHash = keccak256(abi.encodePacked(requestId, decryptedScore, signaturesHash));
        require(processedRequests[requestId] == bytes32(0), "Request already processed");
        processedRequests[requestId] = requestHash;

        // Add to public leaderboard
        publicLeaderboard.push(PublicScore({user: user, score: decryptedScore}));

        // Clear pending status
        decryptionPending[requestId] = false;

        emit ScoreDecrypted(user, decryptedScore);
        emit PublicScoreAdded(user, decryptedScore);
    }

    // ===== POOL MANAGEMENT =====
    /// @notice Add new reward pool
    function addPool(
        string memory name,
        string memory imageUrl,
        uint256 value,
        RewardType rewardType,
        address tokenAddress,
        uint256 maxSpins,
        uint256 winRate,
        uint256 minSpins
    ) external {
        poolRewards.push(
            PoolReward({
                name: name,
                imageUrl: imageUrl,
                value: value,
                rewardType: rewardType,
                tokenAddress: tokenAddress,
                isActive: true,
                maxSpins: maxSpins,
                currentSpins: 0,
                winRate: winRate,
                minSpins: minSpins,
                balance: 0
            })
        );

        emit PoolAdded(poolRewards.length - 1, name, value, rewardType);
    }

    /// @notice Fund pool with ETH
    /// @param poolIndex Pool index to fund
    function fundPoolWithETH(uint256 poolIndex) external payable {
        require(poolIndex < poolRewards.length, "Invalid pool index");
        require(msg.value > 0, "Must send ETH");

        poolRewards[poolIndex].balance += msg.value;

        emit PoolFunded(poolIndex, msg.sender, msg.value, RewardType.ETH);
    }

    /// @notice Admin withdraw from pool
    /// @param poolIndex Pool index
    /// @param amount Amount to withdraw
    function withdrawFromPool(uint256 poolIndex, uint256 amount) external {
        require(poolIndex < poolRewards.length, "Invalid pool index");
        require(amount <= poolRewards[poolIndex].balance, "Insufficient pool balance");

        poolRewards[poolIndex].balance -= amount;

        if (poolRewards[poolIndex].rewardType == RewardType.ETH) {
            payable(msg.sender).transfer(amount);
        }

        emit PoolWithdrawn(poolIndex, msg.sender, amount, poolRewards[poolIndex].rewardType);
    }

    // ===== NFT REWARDS SYSTEM =====
    /// @notice Add NFT reward to pool
    function addNFTReward(uint256 poolIndex, uint256 tokenId, string memory metadata, uint256 rarity) external {
        require(poolIndex < poolRewards.length, "Invalid pool index");
        require(poolRewards[poolIndex].rewardType == RewardType.NFT, "Pool is not NFT type");

        nftRewards[poolIndex] = NFTReward({
            tokenId: tokenId,
            metadata: metadata,
            rarity: rarity,
            isClaimed: false,
            winner: address(0),
            claimedAt: 0
        });

        emit NFTRewardAdded(poolIndex, tokenId, metadata, rarity);
    }

    /// @notice Claim NFT reward
    function claimNFTReward(uint256 poolIndex) external {
        require(poolIndex < poolRewards.length, "Invalid pool index");
        require(poolRewards[poolIndex].rewardType == RewardType.NFT, "Pool is not NFT type");
        require(!nftRewards[poolIndex].isClaimed, "NFT already claimed");

        nftRewards[poolIndex].isClaimed = true;
        nftRewards[poolIndex].winner = msg.sender;
        nftRewards[poolIndex].claimedAt = block.timestamp;
        totalNFTsClaimed++;

        emit NFTRewardClaimed(msg.sender, poolIndex, nftRewards[poolIndex].tokenId, nftRewards[poolIndex].metadata);
    }

    // ===== CONFIGURATION FUNCTIONS =====
    /// @notice Update points configuration
    function updatePointsConfig(
        uint256 checkInPoints,
        uint256 spinPoints,
        uint256 gmPoints,
        uint256 winBonusPoints,
        uint256 dailyCheckInBonus
    ) external {
        pointsConfig = PointsConfig({
            checkInPoints: checkInPoints,
            spinPoints: spinPoints,
            gmPoints: gmPoints,
            winBonusPoints: winBonusPoints,
            dailyCheckInBonus: dailyCheckInBonus,
            isActive: true
        });

        emit PointsConfigUpdated(checkInPoints, spinPoints, gmPoints, winBonusPoints, dailyCheckInBonus);
    }

    /// @notice Update spin configuration
    function updateSpinConfig(
        uint256 baseSpinsPerCheckIn,
        uint256 bonusSpinsPerGM,
        uint256 maxSpinsPerDay,
        uint256 unluckySlotCount
    ) external {
        spinConfig = SpinConfig({
            baseSpinsPerCheckIn: baseSpinsPerCheckIn,
            bonusSpinsPerGM: bonusSpinsPerGM,
            maxSpinsPerDay: maxSpinsPerDay,
            unluckySlotCount: unluckySlotCount,
            unluckySlotIndices: new uint256[](0),
            isActive: true
        });

        emit SpinConfigUpdated(baseSpinsPerCheckIn, bonusSpinsPerGM, maxSpinsPerDay, unluckySlotCount);
    }

    /// @notice Update unlucky slots
    function updateUnluckySlots(uint256[] memory indices) external {
        require(indices.length <= 8, "Too many unlucky slots");

        spinConfig.unluckySlotIndices = indices;
        spinConfig.unluckySlotCount = indices.length;

        emit UnluckySlotsUpdated(indices);
    }

    // ===== INTERNAL HELPER FUNCTIONS =====
    /// @notice Validate user access to encrypted data
    function _validateUserAccess(address user, string memory dataType) internal view {
        bytes32 typeHash = keccak256(abi.encodePacked(dataType));

        if (typeHash == keccak256(abi.encodePacked("scores"))) {
            require(FHE.isSenderAllowed(encryptedScores[user]), "Access denied to scores");
        } else if (typeHash == keccak256(abi.encodePacked("spins"))) {
            require(FHE.isSenderAllowed(encryptedSpinCount[user]), "Access denied to spins");
        } else if (typeHash == keccak256(abi.encodePacked("gm"))) {
            require(FHE.isSenderAllowed(encryptedDailyGMCount[user]), "Access denied to GM count");
        }
    }

    /// @notice Grant transient access for temporary operations
    function _grantTransientAccess(address user, string memory dataType) internal {
        bytes32 accessKey = keccak256(abi.encodePacked(user, dataType));
        transientAccess[user][accessKey] = true;

        bytes32 typeHash = keccak256(abi.encodePacked(dataType));

        if (typeHash == keccak256(abi.encodePacked("scores"))) {
            FHE.allowTransient(encryptedScores[user], user);
        } else if (typeHash == keccak256(abi.encodePacked("spins"))) {
            FHE.allowTransient(encryptedSpinCount[user], user);
        } else if (typeHash == keccak256(abi.encodePacked("gm"))) {
            FHE.allowTransient(encryptedDailyGMCount[user], user);
        }

        emit TransientAccessGranted(user, accessKey);
    }

    /// @notice Revoke transient access after operation
    function _revokeTransientAccess(address user, string memory dataType) internal {
        bytes32 accessKey = keccak256(abi.encodePacked(user, dataType));
        transientAccess[user][accessKey] = false;

        emit TransientAccessRevoked(user, accessKey);
    }

    /// @notice Generate random encrypted value for spin logic
    function _generateRandomSpin() internal returns (euint8) {
        // Update random seed with modern block properties
        randomSeed = uint256(keccak256(abi.encodePacked(randomSeed, block.timestamp, block.prevrandao, msg.sender)));

        // Generate random encrypted value
        euint8 randomValue = FHE.randEuint8();

        emit RandomSpinGenerated(msg.sender, randomSeed);
        return randomValue;
    }

    /// @notice Set last error for user
    function _setLastError(address user, uint256 errorCode, string memory errorMessage) internal {
        userLastErrors[user] = LastError({
            errorCode: errorCode,
            errorMessage: errorMessage,
            timestamp: block.timestamp,
            user: user
        });

        emit FHEOperationError(user, errorCode, errorMessage);
    }

    // ===== GETTER FUNCTIONS =====
    /// @notice Get points configuration
    function getPointsConfig() external view returns (PointsConfig memory) {
        return pointsConfig;
    }

    /// @notice Get spin configuration
    function getSpinConfig() external view returns (SpinConfig memory) {
        return spinConfig;
    }

    /// @notice Get pool reward by index
    function getPoolReward(uint256 index) external view returns (PoolReward memory) {
        require(index < poolRewards.length, "Invalid index");
        return poolRewards[index];
    }

    /// @notice Get NFT reward info
    function getNFTReward(uint256 poolIndex) external view returns (NFTReward memory) {
        return nftRewards[poolIndex];
    }

    /// @notice Get public leaderboard length
    function getPublicLeaderboardLength() external view returns (uint256) {
        return publicLeaderboard.length;
    }

    /// @notice Get encrypted leaderboard length
    function getEncryptedLeaderboardLength() external view returns (uint256) {
        return encryptedLeaderboard.length;
    }

    /// @notice Get last error for user
    function getLastError(address user) external view returns (LastError memory) {
        return userLastErrors[user];
    }

    /// @notice Check if user has transient access
    function hasTransientAccess(address user, string memory dataType) external view returns (bool) {
        bytes32 accessKey = keccak256(abi.encodePacked(user, dataType));
        return transientAccess[user][accessKey];
    }

    /// @notice Get contract ETH balance
    function getContractBalance() external view returns (uint256) {
        return address(this).balance;
    }

    /// @notice Check if decryption is pending
    function isDecryptionPending(uint256 requestId) external view returns (bool) {
        return decryptionPending[requestId];
    }

    /// @notice Get latest request ID
    function getLatestRequestId() external view returns (uint256) {
        return latestRequestId;
    }

    /// @notice Get pools count
    function getPoolsCount() external view returns (uint256) {
        return poolRewards.length;
    }

    /// @notice Check if unlucky slot
    function isUnluckySlot(uint256 slotIndex) external view returns (bool) {
        for (uint256 i = 0; i < spinConfig.unluckySlotIndices.length; i++) {
            if (spinConfig.unluckySlotIndices[i] == slotIndex) {
                return true;
            }
        }
        return false;
    }

    /// @notice Get unlucky slots
    function getUnluckySlots() external view returns (uint256[] memory) {
        return spinConfig.unluckySlotIndices;
    }

    // ===== EMERGENCY & ADMIN FUNCTIONS =====
    /// @notice Emergency function to fund contract
    receive() external payable {
        emit PoolFunded(0, msg.sender, msg.value, RewardType.ETH);
    }

    /// @notice Fallback function
    fallback() external payable {
        revert("Function not found");
    }
}
