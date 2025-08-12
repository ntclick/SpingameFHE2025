# Lucky Spin FHE Frontend - Environment Configuration

## Cấu hình môi trường

### Biến môi trường cần thiết

Tạo file `.env.local` trong thư mục `frontend-fhe-spin` với nội dung sau:

```env
# Private Key (for testing purposes)
VITE_PRIVATE_KEY=859b25f164df967d1b6b04b81693a9f53785a6f2b03bf3c6b20796f60ca8d814

# Relayer Configuration
VITE_RELAYER_URL=https://relayer.testnet.zama.cloud

# Network Configuration
VITE_SEPOLIA_RPC_URL=https://eth-sepolia.g.alchemy.com/v2/oppYpzscO7hdTG6hopypG6Opn3Xp7lR_
VITE_CHAIN_ID=11155111

# API Keys
VITE_ETHERSCAN_API_KEY=SMYU9ZMV9DB55ZAFPW5JKN56S52RVBIWX6

# Contract Addresses
VITE_FHEVM_CONTRACT_ADDRESS=0xa70DFA470B27d1Db1612E64c8Fb8c094FB3202E7
VITE_ZAMA_STANDARD_CONTRACT_ADDRESS=0x62c1E5607077dfaB9Fee425a70707b545F565620
VITE_ZAMA_FHEVM_STANDARD_CONTRACT_ADDRESS=0xf72e7a878eCbF1d7C5aBbd283c10e82ddA58A721

# Spin Configuration
VITE_PRICE_PER_SPIN=0.01

# Development Configuration
PORT=4000
```

### Chạy ứng dụng

1. Cài đặt dependencies:
```bash
npm install
```

2. Chạy ứng dụng trên cổng 4000:
```bash
npm start
```

Ứng dụng sẽ chạy tại: http://localhost:4000

### Các tính năng chính

- **Wallet Connection**: Kết nối MetaMask với mạng Sepolia
- **Buy Spins**: Mua lượt quay với giá 0.01 ETH
- **Spin Wheel**: Quay vòng quay với FHE encryption
- **Check In**: Check-in hàng ngày
- **Send GM**: Gửi GM hàng ngày
- **User Decryption**: Giải mã dữ liệu thông qua Relayer

### Cấu hình Contract

- **Main Contract**: LuckySpinFHE với FHE encryption
- **Zama Standard Contract**: Contract chuẩn của Zama
- **Zama FHEVM Standard Contract**: Contract FHEVM chuẩn

### Network Configuration

- **Chain ID**: 11155111 (Sepolia)
- **RPC URL**: Alchemy Sepolia endpoint
- **Relayer**: Zama testnet relayer

### Gas Settings

- **Gas Limit**: 1,000,000
- **Max Fee Per Gas**: 30 gwei
- **Max Priority Fee Per Gas**: 5 gwei 