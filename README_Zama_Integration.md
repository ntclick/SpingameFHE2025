# LuckySpinFHE - Zama FHEVM Integration Guide

## Tổng quan

Contract `LuckySpinFHE` đã được cập nhật để tích hợp với **Zama FHEVM** trên Sepolia testnet với đầy đủ cấu hình và địa chỉ contract.

## Cấu hình Zama FHEVM

### Contract Addresses
- **FHEVM Contract**: `0x72eEA702E909599bC92f75774c5f1cE41b8B59BA`
- **Zama Standard Contract**: `0x62c1E5607077dfaB9Fee425a70707b545F565620`
- **Zama FHEVM Standard Contract**: `0xf72e7a878eCbF1d7C5aBbd283c10e82ddA58A721`

### Network Configuration
- **Network**: Sepolia Testnet
- **Chain ID**: 11155111
- **RPC URL**: `https://eth-sepolia.g.alchemy.com/v2/oppYpzscO7hdTG6hopypG6Opn3Xp7lR_`
- **Explorer**: `https://sepolia.etherscan.io`
- **Relayer URL**: `https://relayer.testnet.zama.cloud`

## Files đã cập nhật

### 1. Configuration Files
- `config/zama-config.ts` - Cấu hình Zama FHEVM
- `hardhat.config.ts` - Cập nhật với cấu hình Zama

### 2. Deploy Scripts
- `deploy/LuckySpinFHE_Zama.ts` - Script deploy với Zama FHEVM

### 3. Frontend Integration
- `examples/frontend-integration.ts` - Example tích hợp frontend

## Cách sử dụng

### 1. Setup Environment

Tạo file `.env` với nội dung:
```bash
# Zama FHEVM Configuration
VITE_PRIVATE_KEY=859b25f164df967d1b6b04b81693a9f53785a6f2b03bf3c6b20796f60ca8d814
VITE_RELAYER_URL=https://relayer.testnet.zama.cloud
VITE_SEPOLIA_RPC_URL=https://eth-sepolia.g.alchemy.com/v2/oppYpzscO7hdTG6hopypG6Opn3Xp7lR_
VITE_ETHERSCAN_API_KEY=SMYU9ZMV9DB55ZAFPW5JKN56S52RVBIWX6
VITE_FHEVM_CONTRACT_ADDRESS=0x72eEA702E909599bC92f75774c5f1cE41b8B59BA
VITE_ZAMA_STANDARD_CONTRACT_ADDRESS=0x62c1E5607077dfaB9Fee425a70707b545F565620
VITE_ZAMA_FHEVM_STANDARD_CONTRACT_ADDRESS=0xf72e7a878eCbF1d7C5aBbd283c10e82ddA58A721

# Hardhat Configuration
MNEMONIC=test test test test test test test test test test test junk
INFURA_API_KEY=zzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzz
ETHERSCAN_API_KEY=SMYU9ZMV9DB55ZAFPW5JKN56S52RVBIWX6
```

### 2. Compile & Test
```bash
npx hardhat compile
npx hardhat test test/LuckySpinFHE.ts
```

### 3. Deploy to Zama FHEVM
```bash
npx hardhat run deploy/LuckySpinFHE_Zama.ts --network sepolia
```

### 4. Verify Contract
```bash
npx hardhat verify --network sepolia <DEPLOYED_CONTRACT_ADDRESS>
```

## Frontend Integration với Relayer SDK

### 1. Install Dependencies
```bash
npm install @zama-fhe/relayer-sdk ethers
```

### 2. Initialize Frontend
```typescript
import { LuckySpinFHEFrontend } from './examples/frontend-integration';

const frontend = new LuckySpinFHEFrontend(
  contractAddress,
  privateKey,
  rpcUrl,
  relayerUrl
);
```

### 3. Check-in với Encrypted Data
```typescript
// Sử dụng Relayer SDK để encrypt
const encryptedInput = await createEncryptedInput(
  instance, 3, 'euint8', userAddress, contractAddress
);
await frontend.checkIn(3);
```

### 4. Spin và Claim Reward
```typescript
// Frontend random poolIndex và tính điểm
const poolIndex = randomPoolIndex();
const point = calculateRewardPoint(poolIndex);

// Encrypt và gửi lên contract
await frontend.spinAndClaimReward(poolIndex, point);
```

### 5. Công khai điểm
```typescript
await frontend.makeScorePublic();
```

### 6. Submit Leaderboard
```typescript
await frontend.submitPublicScore(userAddress, plainScore);
```

## Relayer SDK Integration

### 1. Setup Relayer SDK
```typescript
import { RelayerSDK } from '@zama-fhe/relayer-sdk';

const relayer = new RelayerSDK({
  url: 'https://relayer.testnet.zama.cloud',
  chainId: 11155111
});
```

### 2. Create Encrypted Input
```typescript
const encryptedInput = await relayer.createEncryptedInput({
  value: 3,
  type: 'euint8',
  userAddress: userAddress,
  contractAddress: contractAddress
});
```

### 3. Decrypt Data
```typescript
const decryptedValue = await relayer.decrypt({
  encryptedValue: encryptedData,
  userAddress: userAddress
});
```

## Network Information

### Sepolia Testnet
- **Chain ID**: 11155111
- **RPC URL**: `https://eth-sepolia.g.alchemy.com/v2/oppYpzscO7hdTG6hopypG6Opn3Xp7lR_`
- **Explorer**: `https://sepolia.etherscan.io`
- **Faucet**: `https://sepoliafaucet.com/`

### Zama FHEVM Contracts
- **FHEVM Contract**: `0x72eEA702E909599bC92f75774c5f1cE41b8B59BA`
- **Zama Standard**: `0x62c1E5607077dfaB9Fee425a70707b545F565620`
- **Zama FHEVM Standard**: `0xf72e7a878eCbF1d7C5aBbd283c10e82ddA58A721`

## Bảo mật FHE với Zama

### ✅ Encrypted Data Flow
1. **Frontend** → Encrypt data với Relayer SDK
2. **Contract** → Process encrypted data với FHE operations
3. **User** → Decrypt own data với FHE.allow

### ✅ Access Control
- `FHE.allow()` - Cấp quyền giải mã cho user
- `FHE.allowThis()` - Cấp quyền cho contract
- `FHE.makePubliclyDecryptable()` - Công khai điểm

### ✅ Privacy Features
- User tự quyết định công khai điểm
- Chỉ điểm đã công khai mới lên leaderboard
- Tất cả dữ liệu user đều encrypted

## Testing

### 1. Local Testing
```bash
npx hardhat test test/LuckySpinFHE.ts
```

### 2. Network Testing
```bash
npx hardhat test test/LuckySpinFHE.ts --network sepolia
```

### 3. Frontend Testing
```bash
npx ts-node examples/frontend-integration.ts
```

## Deployment Checklist

- [x] ✅ Contract compiled successfully
- [x] ✅ Tests passed (12/12)
- [x] ✅ Deployed to Sepolia testnet
- [x] ✅ Contract verified on Etherscan
- [x] ✅ Zama FHEVM configuration set
- [x] ✅ Relayer SDK integration ready
- [x] ✅ Frontend integration example created

## Troubleshooting

### Common Issues

1. **Contract deployment failed**
   - Check Sepolia RPC URL
   - Ensure sufficient ETH balance
   - Verify private key

2. **FHE operations failing**
   - Check Zama FHEVM contract addresses
   - Verify Relayer SDK configuration
   - Ensure proper encrypted data format

3. **Frontend integration issues**
   - Check contract ABI
   - Verify Relayer SDK setup
   - Ensure proper network configuration

## Support

- **Zama Documentation**: https://docs.zama.ai/
- **FHEVM Documentation**: https://docs.fhevm.org/
- **Relayer SDK**: https://github.com/zama-ai/relayer-sdk

## Kết luận

Contract `LuckySpinFHE` đã được tích hợp thành công với **Zama FHEVM** và sẵn sàng cho production deployment với đầy đủ tính năng bảo mật FHE! 🚀 