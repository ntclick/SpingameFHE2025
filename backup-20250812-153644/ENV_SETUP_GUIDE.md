cô# Hướng dẫn thiết lập file .env cho LuckySpinFHE_Complete

## 1. Cấu trúc file .env

File `env.example` đã được tạo với tất cả các biến môi trường cần thiết. Bạn cần:

1. **Sao chép file**: `cp env.example .env`
2. **Cập nhật các giá trị**: Thay thế các placeholder bằng giá trị thực tế

## 2. Các biến môi trường quan trọng

### Network Configuration
```bash
NETWORK=sepolia                    # Mạng testnet (sepolia, goerli, localhost)
RPC_URL=https://sepolia.infura.io/v3/YOUR_INFURA_PROJECT_ID
CHAIN_ID=11155111                 # Chain ID của Sepolia
```

### Private Keys (QUAN TRỌNG - Bảo mật)
```bash
PRIVATE_KEY=your_private_key_here           # Private key chính
ADMIN_PRIVATE_KEY=your_admin_private_key_here
USER1_PRIVATE_KEY=your_user1_private_key_here
USER2_PRIVATE_KEY=your_user2_private_key_here
```

### API Keys
```bash
INFURA_API_KEY=your_infura_api_key_here    # Lấy từ Infura
ETHERSCAN_API_KEY=your_etherscan_api_key_here
```

### FHEVM Configuration
```bash
FHEVM_RPC_URL=https://testnet.fhevm.com
FHEVM_CHAIN_ID=42069
```

## 3. Cách lấy các giá trị cần thiết

### Private Keys
1. **Tạo ví mới** (khuyến nghị cho testnet):
   ```bash
   # Sử dụng Hardhat để tạo account
   npx hardhat node
   # Hoặc sử dụng MetaMask để export private key
   ```

2. **Lấy private key từ MetaMask**:
   - Mở MetaMask
   - Chọn account
   - Account Details > Export Private Key

### Infura API Key
1. Truy cập https://infura.io
2. Tạo project mới
3. Copy Project ID
4. Cập nhật RPC_URL: `https://sepolia.infura.io/v3/YOUR_PROJECT_ID`

### Etherscan API Key
1. Truy cập https://etherscan.io
2. Tạo account và API key
3. Copy API key vào ETHERSCAN_API_KEY

## 4. Cấu hình cho từng môi trường

### Local Development
```bash
NETWORK=localhost
RPC_URL=http://127.0.0.1:8545
CHAIN_ID=31337
PRIVATE_KEY=0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80
```

### Sepolia Testnet
```bash
NETWORK=sepolia
RPC_URL=https://sepolia.infura.io/v3/YOUR_INFURA_PROJECT_ID
CHAIN_ID=11155111
PRIVATE_KEY=your_actual_private_key
```

### FHEVM Testnet
```bash
NETWORK=fhevm
RPC_URL=https://testnet.fhevm.com
CHAIN_ID=42069
PRIVATE_KEY=your_actual_private_key
```

## 5. Token Addresses (Sepolia Testnet)

### USDC (Sepolia)
```bash
USDC_ADDRESS=0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238
```

### USDT (Sepolia)
```bash
USDT_ADDRESS=0xA0b86a33E6441b8c4C8C3C8C3C8C3C8C3C8C3C8C3
```

## 6. Cấu hình Pool và Game

### Pool Configuration
```bash
INITIAL_POOL_BALANCE=1000000000000000000  # 1 ETH (wei)
INITIAL_WIN_RATE=5000                     # 50% (basis points)
INITIAL_MIN_SPINS=1                       # Minimum spins required
```

### Points Configuration
```bash
CHECK_IN_POINTS=10                        # Points for daily check-in
SPIN_POINTS=5                            # Points per spin
GM_POINTS=15                             # Points for GM
WIN_BONUS_POINTS=50                      # Bonus points for winning
DAILY_CHECK_IN_BONUS=25                  # Daily check-in bonus
```

### Spin Configuration
```bash
BASE_SPINS_PER_CHECK_IN=1                # Base spins per check-in
BONUS_SPINS_PER_GM=2                     # Bonus spins per GM
MAX_SPINS_PER_DAY=10                     # Maximum spins per day
UNLUCKY_SLOT_COUNT=3                     # Number of unlucky slots
```

## 7. Bảo mật

### ⚠️ QUAN TRỌNG: Bảo vệ Private Keys
1. **KHÔNG BAO GIỜ** commit file `.env` vào git
2. Thêm `.env` vào `.gitignore`
3. Chỉ sử dụng private keys có ít ETH cho testnet
4. Không sử dụng private keys chính cho testnet

### .gitignore
```bash
# Thêm vào .gitignore
.env
.env.local
.env.*.local
```

## 8. Kiểm tra cấu hình

### Test kết nối
```bash
# Test kết nối RPC
npx hardhat run --network sepolia scripts/test-connection.js

# Test private key
npx hardhat run --network sepolia scripts/test-wallet.js
```

### Deploy contract
```bash
# Deploy với cấu hình .env
npx hardhat run --network sepolia deploy/deploy.ts
```

## 9. Troubleshooting

### Lỗi thường gặp

1. **"Invalid private key"**:
   - Kiểm tra format private key (64 ký tự hex)
   - Đảm bảo không có "0x" prefix

2. **"Network not found"**:
   - Kiểm tra `hardhat.config.ts`
   - Đảm bảo network được định nghĩa

3. **"Insufficient funds"**:
   - Nạp ETH vào wallet testnet
   - Sử dụng Sepolia faucet

4. **"Gas estimation failed"**:
   - Tăng GAS_LIMIT
   - Kiểm tra contract code

## 10. Scripts hữu ích

### Test Connection
```javascript
// scripts/test-connection.js
const { ethers } = require("hardhat");

async function main() {
  const provider = ethers.provider;
  const network = await provider.getNetwork();
  console.log("Network:", network.name);
  console.log("Chain ID:", network.chainId);
  
  const balance = await provider.getBalance(process.env.PRIVATE_KEY);
  console.log("Balance:", ethers.utils.formatEther(balance), "ETH");
}

main().catch(console.error);
```

### Test Wallet
```javascript
// scripts/test-wallet.js
const { ethers } = require("hardhat");

async function main() {
  const wallet = new ethers.Wallet(process.env.PRIVATE_KEY);
  console.log("Wallet address:", wallet.address);
  
  const provider = ethers.provider;
  const balance = await provider.getBalance(wallet.address);
  console.log("Balance:", ethers.utils.formatEther(balance), "ETH");
}

main().catch(console.error);
```

## 11. Cập nhật hardhat.config.ts

Đảm bảo `hardhat.config.ts` sử dụng các biến môi trường:

```typescript
import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";
import * as dotenv from "dotenv";

dotenv.config();

const config: HardhatUserConfig = {
  solidity: "0.8.20",
  networks: {
    sepolia: {
      url: process.env.RPC_URL || "",
      accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : [],
      chainId: parseInt(process.env.CHAIN_ID || "11155111"),
    },
    fhevm: {
      url: process.env.FHEVM_RPC_URL || "",
      accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : [],
      chainId: parseInt(process.env.FHEVM_CHAIN_ID || "42069"),
    },
  },
  etherscan: {
    apiKey: process.env.ETHERSCAN_API_KEY,
  },
};

export default config;
```

## 12. Kết luận

Sau khi cấu hình xong file `.env`:

1. **Test kết nối**: `npx hardhat run scripts/test-connection.js`
2. **Deploy contract**: `npx hardhat run deploy/deploy.ts`
3. **Test demo**: `npx hardhat run demo/complete-fhevm-demo.ts`

Đảm bảo tất cả private keys được bảo mật và chỉ sử dụng cho mục đích testing! 