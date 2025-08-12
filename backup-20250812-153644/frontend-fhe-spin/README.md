# 🎰 Lucky Spin FHE Frontend

Frontend React cho vòng quay may mắn sử dụng Fully Homomorphic Encryption (FHE) trên FHEVM.

## 🚀 Tính năng

- **🔐 FHE Encryption**: Mã hóa dữ liệu quay số theo chuẩn FHE
- **🎯 Vòng quay 8 ô**: 2 ô không thưởng, 1 ô 0.1 ETH, 1 ô NFT, 4 ô 0.01 ETH
- **💰 Mua lượt quay**: 0.01 ETH/lượt
- **📅 Điểm danh hàng ngày**: Nhận lượt quay miễn phí
- **👋 GM hàng ngày**: Nhận bonus lượt quay
- **🎨 Giao diện đẹp**: Responsive design với gradient và animation
- **🔒 Bảo mật**: Sử dụng biến môi trường cho thông tin nhạy cảm

## 🛠️ Cài đặt

```bash
# Cài đặt dependencies
npm install

# Tạo file .env từ .env.example
cp .env.example .env

# Cập nhật thông tin trong file .env
# REACT_APP_CONTRACT_ADDRESS=your_contract_address
# REACT_APP_SEPOLIA_RPC_URL=your_rpc_url

# Chạy development server
npm start
```

## 📋 Yêu cầu

- Node.js 16+
- MetaMask hoặc wallet tương thích
- Sepolia testnet ETH
- Contract LuckySpinFHE_Complete.sol đã được deploy

## ⚙️ Cấu hình

### 1. Tạo file .env

Tạo file `.env` trong thư mục `frontend-fhe-spin` với nội dung:

```env
# Contract Configuration
REACT_APP_CONTRACT_ADDRESS=0xa70DFA470B27d1Db1612E64c8Fb8c094FB3202E7

# Network Configuration
REACT_APP_SEPOLIA_RPC_URL=https://eth-sepolia.g.alchemy.com/v2/YOUR_ALCHEMY_KEY
REACT_APP_CHAIN_ID=11155111

# FHEVM Configuration
REACT_APP_RELAYER_URL=https://relayer.testnet.zama.cloud

# Spin Configuration
REACT_APP_PRICE_PER_SPIN=0.01
```

### 2. Cập nhật thông tin

- **REACT_APP_CONTRACT_ADDRESS**: Địa chỉ contract đã deploy
- **REACT_APP_SEPOLIA_RPC_URL**: RPC URL cho Sepolia testnet
- **REACT_APP_CHAIN_ID**: Chain ID của Sepolia (11155111)

### 3. Kết nối wallet

Kết nối MetaMask với Sepolia testnet

## 🔧 Cấu trúc Project

```
src/
├── App.tsx              # Component chính
├── App.css              # Styling
├── config.ts            # Cấu hình contract và network (sử dụng env vars)
└── react-app-env.d.ts  # TypeScript declarations
```

## 🎮 Cách sử dụng

1. **Kết nối Wallet**: Click "Connect Wallet" để kết nối MetaMask
2. **Mua lượt quay**: Click "Buy Spins" để mua lượt quay (0.01 ETH/lượt)
3. **Điểm danh**: Click "Check In" để nhận lượt quay miễn phí hàng ngày
4. **Gửi GM**: Click "Send GM" để nhận bonus lượt quay
5. **Quay số**: Click "Spin" để quay vòng quay may mắn

## 🔐 FHE Integration

Frontend sử dụng `@zama-fhe/relayer-sdk` để:

- **Khởi tạo FHE instance**: `initSDK()` và `createInstance()`
- **Mã hóa dữ liệu**: `encrypt8()` cho pool index
- **Tạo input proof**: `generateInputProof()` cho verification
- **Gọi contract**: `spinAndClaimReward()` với encrypted data

## 🎯 Vòng quay

Vòng quay gồm 8 ô với phân bố phần thưởng:

- **2 ô**: Không thưởng
- **1 ô**: 0.1 ETH
- **1 ô**: NFT
- **4 ô**: 0.01 ETH

## 🔒 Bảo mật

- **Biến môi trường**: Sử dụng `process.env.REACT_APP_*` cho thông tin nhạy cảm
- **Contract address**: Được lưu trong biến môi trường
- **RPC URL**: Không hardcode trong code
- **API Keys**: Được bảo vệ qua biến môi trường

## 🚨 Lưu ý

- Cần có Sepolia testnet ETH để test
- Contract phải được deploy trước khi sử dụng
- FHE encryption cần thời gian để xử lý
- Đảm bảo MetaMask kết nối đúng network (Sepolia)
- **KHÔNG commit file .env** vào git repository

## 🔄 Development

```bash
# Chạy development server
npm start

# Build production
npm run build

# Test
npm test
```

## 📝 TODO

- [x] Deploy contract và cập nhật address
- [x] Sử dụng biến môi trường cho bảo mật
- [ ] Test FHE encryption với contract thật
- [ ] Thêm animation vòng quay
- [ ] Hiển thị lịch sử quay số
- [ ] Thêm sound effects
- [ ] Optimize performance

## 🤝 Contributing

1. Fork project
2. Tạo feature branch
3. Commit changes
4. Push to branch
5. Tạo Pull Request

## 📄 License

MIT License
