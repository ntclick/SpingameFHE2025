# FHE Compliance Test Suite

Bộ test này được tạo ra để kiểm tra tính tuân thủ FHE (Fully Homomorphic Encryption) của hệ thống spin game. Các test
được viết bằng TypeScript và sử dụng Hardhat framework.

## 📁 Cấu trúc Test Files

### 1. `fhe-compliance.test.ts`

**Mục đích**: Kiểm tra tính tuân thủ FHE cơ bản

- ✅ FHE Contract Deployment
- ✅ FHE Parameter Validation
- ✅ FHE State Management
- ✅ FHE Function Compliance
- ✅ FHE Event Compliance
- ✅ FHE Gas Optimization
- ✅ FHE Security Validation
- ✅ FHE Integration Tests
- ✅ FHE Error Handling

### 2. `fhe-encryption.test.ts`

**Mục đích**: Kiểm tra chức năng mã hóa và giải mã FHE

- ✅ FHE Data Types (euint64)
- ✅ FHE Parameter Validation
- ✅ FHE State Encryption
- ✅ FHE Function Parameters
- ✅ FHE Data Consistency
- ✅ FHE Error Scenarios
- ✅ FHE Gas Optimization
- ✅ FHE Security

### 3. `fhe-integration.test.ts`

**Mục đích**: Kiểm tra tích hợp FHE end-to-end

- ✅ FHE Complete Workflow
- ✅ FHE State Transitions
- ✅ FHE Event Integration
- ✅ FHE Error Recovery
- ✅ FHE Performance
- ✅ FHE Security Integration
- ✅ **FHE Spin Functions** (NEW)
  - ✅ spin() function testing
  - ✅ spinLite() function testing
  - ✅ spinWithEncryptedRandom() function testing
  - ✅ Spin privacy validation
  - ✅ Spin gas optimization

### 4. `fhe-security.test.ts`

**Mục đích**: Kiểm tra bảo mật FHE

- ✅ FHE Data Privacy
- ✅ FHE Access Control
- ✅ FHE Cryptographic Security
- ✅ FHE State Isolation
- ✅ FHE Attack Prevention
- ✅ FHE Audit Trail

### 5. `fhe-performance.test.ts`

**Mục đích**: Kiểm tra hiệu suất FHE

- ✅ FHE Gas Optimization (including spin functions)
- ✅ FHE Memory Efficiency
- ✅ FHE Computational Efficiency
- ✅ FHE Scalability
- ✅ FHE Resource Management
- ✅ FHE Benchmarking

## 🚀 Cách Chạy Tests

### 1. Cài đặt Dependencies

```bash
npm install
```

### 2. Compile Contracts

```bash
npx hardhat compile
```

### 3. Chạy Tất Cả Tests

```bash
npx hardhat test
```

### 4. Chạy Test Cụ Thể

```bash
# Chạy test FHE compliance
npx hardhat test test/fhe-compliance.test.ts

# Chạy test FHE encryption
npx hardhat test test/fhe-encryption.test.ts

# Chạy test FHE integration
npx hardhat test test/fhe-integration.test.ts

# Chạy test FHE security
npx hardhat test test/fhe-security.test.ts

# Chạy test FHE performance
npx hardhat test test/fhe-performance.test.ts
```

### 5. Chạy Test Với Coverage

```bash
npx hardhat coverage
```

### 6. Chạy Test Với Gas Reporter

```bash
REPORT_GAS=true npx hardhat test
```

## 🔍 Các Tiêu Chuẩn FHE Được Kiểm Tra

### 1. **FHE Data Types**

- ✅ `euint64` được sử dụng cho dữ liệu mã hóa
- ✅ `bytes32` được sử dụng cho ABI interface
- ✅ Dữ liệu được mã hóa đúng định dạng

### 2. **FHE Parameter Validation**

- ✅ Tham số mã hóa có độ dài chính xác (64 hex chars)
- ✅ Validation cho các tham số không hợp lệ
- ✅ Proof validation cho các hàm FHE

### 3. **FHE State Management**

- ✅ Trạng thái người dùng được mã hóa hoàn toàn
- ✅ Tính nhất quán của dữ liệu mã hóa
- ✅ Cô lập trạng thái giữa các người dùng

### 4. **FHE Security**

- ✅ Không lộ plaintext values
- ✅ Access control cho các hàm FHE
- ✅ Bảo vệ chống lại các cuộc tấn công
- ✅ Audit trail an toàn

### 5. **FHE Performance**

- ✅ Gas optimization cho các operation FHE
- ✅ Memory efficiency
- ✅ Computational efficiency
- ✅ Scalability

## 📊 Kết Quả Test

### Test Results Format

```
FHE Compliance Tests
  FHE Contract Deployment
    ✓ Should deploy FHE contract successfully
    ✓ Should have correct FHE contract structure
  FHE Parameter Validation
    ✓ Should validate encrypted parameter types
    ✓ Should validate buyGmTokensFHE encrypted parameters
  FHE State Management
    ✓ Should store encrypted user state
    ✓ Should handle encrypted pending ETH
    ✓ Should handle encrypted score
  ...
```

### Gas Usage Report

```
| Contract | Method | Min | Max | Avg | # calls |
|----------|--------|-----|-----|-----|---------|
| LuckySpinFHE_KMS_Final | dailyGm | 45000 | 45000 | 45000 | 1 |
| LuckySpinFHE_KMS_Final | publishScore | 85000 | 85000 | 85000 | 1 |
| LuckySpinFHE_KMS_Final | buySpinWithGm | 65000 | 65000 | 65000 | 1 |
```

## 🛠️ Troubleshooting

### Lỗi Thường Gặp

1. **"User not initialized"**
   - **Nguyên nhân**: Người dùng chưa được khởi tạo
   - **Giải pháp**: Gọi `dailyGm()` trước khi sử dụng các hàm FHE

2. **"Invalid encrypted parameter"**
   - **Nguyên nhân**: Tham số mã hóa không đúng định dạng
   - **Giải pháp**: Đảm bảo tham số có độ dài 64 hex chars

3. **"Gas limit exceeded"**
   - **Nguyên nhân**: Operation FHE tiêu tốn quá nhiều gas
   - **Giải pháp**: Tăng gas limit hoặc optimize operation

### Debug Mode

```bash
# Chạy test với debug logs
DEBUG=true npx hardhat test

# Chạy test với verbose output
npx hardhat test --verbose
```

## 📈 Performance Benchmarks

### Gas Usage Targets

- **dailyGm**: < 50,000 gas
- **buySpinWithGm**: < 70,000 gas
- **publishScore**: < 100,000 gas
- **unpublishScore**: < 30,000 gas
- **requestClaimETH**: < 60,000 gas

### Execution Time Targets

- **Single operation**: < 5 seconds
- **Batch operations**: < 30 seconds
- **Full test suite**: < 2 minutes

## 🔧 Customization

### Thêm Test Cases Mới

1. Tạo file test mới trong thư mục `test/`
2. Import các dependencies cần thiết
3. Viết test cases theo format Mocha/Chai
4. Chạy test để verify

### Modify Test Parameters

```typescript
// Trong test file
const testParams = {
  gasLimit: 500000,
  timeout: 10000,
  retries: 3,
};
```

## 📚 References

- [Zama FHEVM Documentation](https://docs.zama.ai/fhevm/)
- [Hardhat Testing Guide](https://hardhat.org/tutorial/testing-contracts)
- [Chai Assertion Library](https://www.chaijs.com/)
- [Mocha Testing Framework](https://mochajs.org/)

## 🤝 Contributing

Khi thêm test cases mới:

1. Đảm bảo test coverage cho FHE functionality
2. Follow naming conventions
3. Add proper documentation
4. Test trên multiple scenarios
5. Verify gas optimization

---

**Lưu ý**: Các test này được thiết kế để đảm bảo hệ thống tuân thủ đầy đủ các tiêu chuẩn FHE. Chạy đầy đủ test suite
trước khi deploy lên production.
