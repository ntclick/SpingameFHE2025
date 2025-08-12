# LuckySpinFHE - Contract Điểm Danh, Quay Thưởng, Bảng Xếp Hạng với FHE

## Tổng quan

Contract `LuckySpinFHE` được xây dựng theo chuẩn Zama FHEVM, cho phép:
- **Điểm danh**: User nhận lượt quay mỗi ngày
- **Quay thưởng**: User quay và nhận điểm/ phần thưởng
- **Bảng xếp hạng**: Hiển thị điểm số công khai của các user

## Tính năng chính

### 1. Quản lý Pool Rewards (Public)
- Thêm/sửa/xóa các pool phần thưởng
- Mỗi pool có: tên, hình ảnh, giá trị
- Dữ liệu public, không cần mã hóa

### 2. Điểm danh (Encrypted)
- User gửi encrypted số lượt quay nhận được
- Contract cộng vào encryptedSpinCount
- User có thể giải mã lượt quay của mình

### 3. Quay thưởng (Encrypted)
- User gửi encrypted poolIndex và điểm số
- Contract kiểm tra còn lượt quay không
- Trừ lượt quay, cộng điểm, lưu pool trúng
- User có thể giải mã điểm, lượt quay, pool trúng

### 4. Công khai điểm (User tự chọn)
- User chủ động gọi makeScorePublic()
- Điểm được công khai cho tất cả
- Chỉ user mới quyết định công khai điểm

### 5. Bảng xếp hạng (Public)
- Admin submit điểm đã công khai
- Hiển thị leaderboard public
- Chỉ điểm đã công khai mới được đưa lên

## Cấu trúc Contract

```solidity
contract LuckySpinFHE is SepoliaConfig {
    // Public data
    PoolReward[] public poolRewards;
    PublicScore[] public publicLeaderboard;
    
    // Encrypted user data
    mapping(address => euint8) public encryptedSpinCount;
    mapping(address => euint32) public encryptedScores;
    mapping(address => euint8) public encryptedLastRewardIndex;
}
```

## Cách sử dụng

### 1. Deploy contract
```bash
npx hardhat lucky-spin:deploy
```

### 2. Thêm pool rewards
```bash
npx hardhat lucky-spin:add-pool --contract <ADDRESS> --name "Gold" --image "gold.png" --value 1000
```

### 3. Xem danh sách pools
```bash
npx hardhat lucky-spin:get-pools --contract <ADDRESS>
```

### 4. Simulate check-in (với mock data)
```bash
npx hardhat lucky-spin:check-in --contract <ADDRESS>
```

### 5. Simulate spin (với mock data)
```bash
npx hardhat lucky-spin:spin --contract <ADDRESS>
```

### 6. Công khai điểm
```bash
npx hardhat lucky-spin:make-public --contract <ADDRESS>
```

### 7. Submit điểm lên leaderboard
```bash
npx hardhat lucky-spin:submit-score --contract <ADDRESS> --user <USER_ADDRESS> --score 100
```

### 8. Xem leaderboard
```bash
npx hardhat lucky-spin:get-leaderboard --contract <ADDRESS>
```

## Test

```bash
npx hardhat test test/LuckySpinFHE.ts
```

## Compile

```bash
npx hardhat compile
```

## Deploy với script

```bash
npx hardhat run deploy/LuckySpinFHE.ts --network sepolia
```

## Luồng hoạt động thực tế

### Frontend Integration

1. **Check-in hàng ngày:**
```javascript
// Encrypt số lượt quay (e.g. 3) bằng Relayer SDK
const encryptedInput = await createEncryptedInput(
  instance, 3, 'euint8', userAddress, contractAddress
);
await contract.checkIn(encryptedInput.value, encryptedInput.attestation);
```

2. **Quay thưởng:**
```javascript
// Frontend random poolIndex và tính điểm
const poolIndex = randomPoolIndex();
const point = calculateRewardPoint(poolIndex);

// Encrypt và gửi lên contract
const encryptedPool = await createEncryptedInput(instance, poolIndex, 'euint8', userAddress, contractAddress);
const encryptedPoint = await createEncryptedInput(instance, point, 'euint32', userAddress, contractAddress);

await contract.spinAndClaimReward(
  encryptedPool.value, encryptedPoint.value,
  encryptedPool.attestation, encryptedPoint.attestation
);
```

3. **Công khai điểm:**
```javascript
await contract.makeScorePublic();
// Gọi Relayer SDK để publicDecrypt và verify signature
```

4. **Submit lên leaderboard:**
```javascript
// Sau khi verify signature từ Relayer
await contract.submitPublicScore(user, plainScore);
```

## Bảo mật FHE

- ✅ Tất cả dữ liệu user đều encrypted (euint8, euint32)
- ✅ Chỉ dùng FHE operations (FHE.add, FHE.sub, FHE.gt, FHE.select)
- ✅ Không xử lý random/tính điểm trong contract
- ✅ User tự quyết định công khai điểm
- ✅ Chỉ điểm đã công khai mới lên leaderboard
- ✅ Cấp quyền access đúng (FHE.allow, FHE.makePubliclyDecryptable)

## Checklist chuẩn FHEVM

- [x] Import FHE đúng chuẩn
- [x] Không xử lý random/tính điểm trong contract
- [x] Mọi phép toán trên dữ liệu riêng đều dùng encrypted type & FHE ops
- [x] Không dùng view/pure function thao tác FHE
- [x] Cấp quyền access FHE đúng
- [x] Public leaderboard chỉ gồm user đã tự chọn công khai điểm
- [x] Quản trị pool chỉ owner, không cần FHE 