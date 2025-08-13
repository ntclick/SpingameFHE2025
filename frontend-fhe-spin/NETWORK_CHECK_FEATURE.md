# Network Check Feature

## Tổng quan

Tính năng kiểm tra mạng tự động đã được thêm vào ứng dụng để đảm bảo người dùng chỉ có thể sử dụng ứng dụng khi đang kết
nối với mạng Sepolia Testnet.

## Tính năng chính

### 1. Kiểm tra mạng tự động

- Tự động kiểm tra xem wallet có đang kết nối với mạng Sepolia (Chain ID: 11155111) không
- Hiển thị trạng thái mạng trong phần Wallet Connection
- Cập nhật real-time khi người dùng chuyển mạng

### 2. Network Warning Modal

- Hiển thị modal cảnh báo khi người dùng không ở mạng Sepolia
- Cung cấp nút "Switch to Sepolia" để chuyển mạng tự động
- Hỗ trợ thêm mạng Sepolia vào MetaMask nếu chưa có

### 3. Disable các chức năng

- Tất cả các button tương tác với smart contract sẽ bị disable khi không ở mạng Sepolia
- Bao gồm: Buy GM Tokens, Daily Check-in, Buy Spins, Claim ETH, Publish/Unpublish Score

## Các file đã thêm/sửa đổi

### Files mới:

- `src/utils/networkUtils.ts` - Utility functions cho network checking
- `src/components/NetworkWarning.tsx` - Component hiển thị warning modal
- `src/components/NetworkWarning.css` - CSS cho warning modal

### Files đã sửa:

- `src/App.tsx` - Tích hợp network checking và warning modal

## Cách hoạt động

### 1. Kiểm tra mạng

```typescript
const { isCorrectNetwork, currentNetwork, isChecking } = useNetworkCheck(provider);
```

### 2. Hiển thị warning

```typescript
useEffect(() => {
  if (connected && !isChecking && !isCorrectNetwork) {
    setShowNetworkWarning(true);
  } else if (connected && isCorrectNetwork) {
    setShowNetworkWarning(false);
  }
}, [connected, isChecking, isCorrectNetwork]);
```

### 3. Chuyển mạng

```typescript
const handleSwitchNetwork = useCallback(async () => {
  const success = await switchToSepolia();
  if (success) {
    setShowNetworkWarning(false);
    push("success", "Successfully switched to Sepolia network", 3000);
    setTimeout(() => {
      window.location.reload();
    }, 1000);
  }
}, [push]);
```

## Cấu hình mạng Sepolia

```typescript
export const SEPOLIA_NETWORK: NetworkInfo = {
  chainId: 11155111,
  chainIdHex: "0xaa36a7",
  name: "Sepolia Testnet",
  rpcUrl: CONFIG.NETWORK.RPC_URL,
  explorerUrl: CONFIG.NETWORK.EXPLORER_URL,
  nativeCurrency: {
    name: "Sepolia Ether",
    symbol: "ETH",
    decimals: 18,
  },
};
```

## Lợi ích

1. **Bảo mật**: Ngăn người dùng thực hiện giao dịch trên mạng sai
2. **UX tốt hơn**: Thông báo rõ ràng và hướng dẫn chuyển mạng
3. **Tự động hóa**: Tự động chuyển mạng và reload ứng dụng
4. **Responsive**: Hoạt động tốt trên cả desktop và mobile

## Testing

Để test tính năng này:

1. Kết nối wallet với mạng khác (ví dụ: Ethereum Mainnet)
2. Kiểm tra xem warning modal có hiển thị không
3. Click "Switch to Sepolia" và kiểm tra xem có chuyển mạng thành công không
4. Kiểm tra xem các button có bị disable khi không ở mạng Sepolia không
