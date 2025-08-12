# 🚀 Deployment Guide

Hướng dẫn chi tiết để deploy Lucky Spin FHEVM Demo lên Sepolia Testnet.

## 📋 Prerequisites

### 1. **Environment Setup**
```bash
# Node.js 18+ required
node --version

# Install Hardhat globally (optional)
npm install -g hardhat

# Install project dependencies
npm install
```

### 2. **Environment Variables**
Tạo file `.env` trong thư mục gốc:
```bash
# Private key for deployment (keep secret!)
PRIVATE_KEY=your_private_key_here

# Infura API key for Sepolia access
INFURA_API_KEY=your_infura_api_key

# Etherscan API key for contract verification
ETHERSCAN_API_KEY=your_etherscan_api_key

# Optional: Custom RPC URL
SEPOLIA_RPC_URL=https://sepolia.infura.io/v3/your_project_id
```

### 3. **Get Sepolia ETH**
- Truy cập [Sepolia Faucet](https://sepoliafaucet.com)
- Nhập địa chỉ ví của bạn
- Nhận test ETH (cần ít nhất 0.1 ETH cho deployment)

## 🔧 Deployment Steps

### Step 1: Compile Contracts
```bash
# Compile all contracts
npx hardhat compile

# Verify compilation success
ls artifacts/contracts/
```

### Step 2: Deploy to Sepolia
```bash
# Deploy using JavaScript script
npx hardhat run deploy/06b_deploy_kms_final_js.js --network sepolia
```

**Expected Output:**
```
🚀 Deploying LuckySpinFHE_KMS_Final contract...
📋 Deploying with account: 0x...
💰 Account balance: 0.5 ETH
⏳ Deploying contract...
✅ LuckySpinFHE_KMS_Final deployed to: 0x561D05BbaE5a2D93791151D02393CcD26d9749a2
🔗 Contract URL: https://sepolia.etherscan.io/address/0x561D05BbaE5a2D93791151D02393CcD26d9749a2
```

### Step 3: Verify Contract (Optional)
```bash
# Verify on Etherscan
npx hardhat verify --network sepolia 0x561D05BbaE5a2D93791151D02393CcD26d9749a2
```

### Step 4: Update Frontend Configuration
Cập nhật `frontend-fhe-spin/src/config.ts`:
```typescript
export const CONFIG = {
  FHEVM_CONTRACT_ADDRESS: "0x561D05BbaE5a2D93791151D02393CcD26d9749a2", // Your deployed address
  // ... other config
};
```

### Step 5: Fund Contract Pool
```bash
# Send ETH to contract for prize pool
npx hardhat run scripts/fund-pool.js --network sepolia
```

## 📊 Contract Verification

### Manual Verification
1. Truy cập [Sepolia Etherscan](https://sepolia.etherscan.io)
2. Tìm địa chỉ contract đã deploy
3. Click "Contract" tab
4. Click "Verify and Publish"
5. Chọn compiler settings:
   - **Compiler Type**: Solidity (Single file)
   - **Compiler Version**: 0.8.24
   - **Optimization**: Enabled (200 runs)
   - **Constructor Arguments**: None (empty)

### Automatic Verification
```bash
# Add to hardhat.config.ts
etherscan: {
  apiKey: process.env.ETHERSCAN_API_KEY,
},
```

## 🔍 Post-Deployment Testing

### 1. **Test Contract Functions**
```bash
# Run deployment tests
npx hardhat test --network sepolia
```

### 2. **Test Frontend Integration**
```bash
cd frontend-fhe-spin
npm start
```

### 3. **Verify Key Functions**
- ✅ Daily check-in works
- ✅ Buy GM tokens works
- ✅ Spin wheel works
- ✅ Claim ETH works
- ✅ Leaderboard works

## 🛠️ Troubleshooting

### Common Issues

#### **1. Insufficient Gas**
```
Error: insufficient funds for gas * price + value
```
**Solution**: Get more Sepolia ETH from faucet

#### **2. Contract Verification Failed**
```
Error: Already Verified
```
**Solution**: Contract already verified, skip this step

#### **3. RPC Connection Issues**
```
Error: could not detect network
```
**Solution**: Check INFURA_API_KEY and network configuration

#### **4. Compilation Errors**
```
Error: Compilation failed
```
**Solution**: 
- Check Solidity version compatibility
- Verify all imports are correct
- Check for syntax errors

### Debug Commands
```bash
# Check network status
npx hardhat console --network sepolia

# Get contract info
const contract = await ethers.getContractAt("LuckySpinFHE_KMS_Final", "0x...");
await contract.stateVersion("0x...");

# Check deployment account
const [deployer] = await ethers.getSigners();
console.log("Deployer:", deployer.address);
```

## 📈 Monitoring

### **Block Explorer**
- [Sepolia Etherscan](https://sepolia.etherscan.io/address/0x561D05BbaE5a2D93791151D02393CcD26d9749a2)

### **Contract Events to Monitor**
- `UserStateChanged` - User data updates
- `SpinOutcome` - Spin results
- `CheckInCompleted` - Daily check-ins
- `GmTokensPurchased` - GM token purchases
- `EthClaimed` - ETH withdrawals

### **Health Checks**
```bash
# Check contract balance
npx hardhat run scripts/check-balance.js --network sepolia

# Check user state
npx hardhat run scripts/check-user-state.js --network sepolia
```

## 🔄 Update Deployment

### **Redeploy Contract**
```bash
# Deploy new version
npx hardhat run deploy/06b_deploy_kms_final_js.js --network sepolia

# Update frontend config
# Update documentation
# Test thoroughly
```

### **Upgrade Strategy**
1. Deploy new contract
2. Test on Sepolia
3. Update frontend configuration
4. Update documentation
5. Notify users of new address

## 📝 Deployment Checklist

- [ ] Environment variables configured
- [ ] Sepolia ETH obtained
- [ ] Contracts compiled successfully
- [ ] Contract deployed to Sepolia
- [ ] Contract verified on Etherscan
- [ ] Frontend config updated
- [ ] Pool funded with ETH
- [ ] All functions tested
- [ ] Documentation updated
- [ ] Team notified

## 🎯 Production Considerations

### **Security**
- Use hardware wallets for deployment
- Multi-signature contracts for production
- Regular security audits
- Emergency pause functionality

### **Scalability**
- Monitor gas usage
- Optimize for HCU efficiency
- Consider layer 2 solutions
- Implement rate limiting

### **Monitoring**
- Set up alerts for contract events
- Monitor pool balances
- Track user activity
- Performance metrics

---

**⚠️ Important**: This is a testnet deployment guide. For mainnet deployment, additional security measures and audits are required.
