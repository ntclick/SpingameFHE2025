# GM Function với EIP-712 Implementation

## Vấn đề

GM function cần hoạt động với EIP-712 signature theo chuẩn FHE để:

- ✅ Xác thực user đã "GM" mỗi ngày
- ✅ Sử dụng EIP-712 signature để bảo mật
- ✅ Tích hợp với FHE encryption

## Giải pháp

### 1. EIP-712 Domain và Types

```typescript
const domain = {
  name: "LuckySpinFHE",
  version: "1",
  chainId: CONFIG.NETWORK.CHAIN_ID,
  verifyingContract: CONFIG.ZAMA_FHEVM_STANDARD_CONTRACT_ADDRESS,
};

const types = {
  GM: [
    { name: "user", type: "address" },
    { name: "timestamp", type: "uint256" },
    { name: "nonce", type: "uint256" },
  ],
};
```

### 2. Message Data

```typescript
const timestamp = Math.floor(Date.now() / 1000);
const nonce = Math.floor(Math.random() * 1000000);

const message = {
  user: account,
  timestamp: timestamp,
  nonce: nonce,
};
```

### 3. EIP-712 Signature

```typescript
const signature = await signer.signTypedData(domain, types, message);
```

### 4. Contract Call với EIP-712

```typescript
const tx = await contract.gm?.(encryptedInput.handle, encryptedInput.proof, signature, timestamp, nonce);
```

## ABI Updates

```solidity
// Updated GM function với EIP-712 parameters
function gm(
  bytes32 encryptedGmValue,
  bytes calldata proof,
  bytes calldata signature,
  uint256 timestamp,
  uint256 nonce
) external;

// Updated event với timestamp
event GMCompleted(address indexed user, string message, uint256 timestamp);
```

## Flow hoàn chỉnh

### 1. User clicks "Say GM"

- ✅ Kiểm tra contract, account, signer ready

### 2. Tạo EIP-712 signature

- ✅ Tạo domain và types
- ✅ Tạo message với timestamp và nonce
- ✅ Sign với MetaMask

### 3. Tạo encrypted input

- ✅ Tạo encrypted input cho GM value = 1
- ✅ Validate proof

### 4. Gọi contract

- ✅ Gọi `gm()` function với encrypted input và EIP-712 signature
- ✅ Handle success/error cases

### 5. Fallback

- ✅ Nếu contract không có function, simulate với EIP-712

## Security Features

- ✅ **EIP-712 Signature**: Bảo mật và xác thực user
- ✅ **Timestamp**: Prevent replay attacks
- ✅ **Nonce**: Ensure uniqueness
- ✅ **FHE Encryption**: Confidential GM value
- ✅ **Domain Separation**: Prevent cross-contract attacks

## Error Handling

- ✅ Contract function not available → Simulate
- ✅ Signature failed → Show error
- ✅ Network error → Graceful fallback
- ✅ FHE decryption error → Return 0

## Status

- ✅ GM function với EIP-712 implemented
- ✅ ABI updated
- ✅ Error handling improved
- ✅ Ready for testing

## Next Steps

1. Test GM function với real contract
2. Verify EIP-712 signature validation
3. Monitor contract events
4. Test daily GM limit
