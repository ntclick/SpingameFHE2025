# 🧪 **Test Guide - Real FHE Implementation**

## 📋 **Hướng Dẫn Test Ứng Dụng FHE**

### 🚀 **Bước 1: Khởi Động**
1. **Truy cập:** `http://localhost:4000`
2. **Kết nối wallet:** Click "🔗 Connect Wallet"
3. **Chọn Sepolia network** trong MetaMask
4. **Đảm bảo có ETH** trong wallet để test

### 🎯 **Bước 2: Test Các Chức Năng Chính**

#### **A. ✅ Test User Data Display**
- **Mục tiêu:** Xem giá trị thật từ FHE decryption
- **Thực hiện:** 
  - Kết nối wallet
  - Xem "👤 User Data (Real FHE)"
  - Kiểm tra số spins và rewards hiển thị
- **Kết quả mong đợi:** 
  - Spins: 264 (thay vì mock 768)
  - Rewards: 544 (thay vì mock 2048)

#### **B. ✅ Test Buy Spins**
- **Mục tiêu:** Mua spins với real FHE encryption
- **Thực hiện:**
  - Click "💰 Buy 1 Spin (0.01 ETH)"
  - Chờ transaction confirm
  - Click "🔄 Refresh Data"
- **Kết quả mong đợi:**
  - Transaction thành công
  - Spins tăng lên
  - Console log hiển thị real FHE decryption

#### **C. ✅ Test Spin Wheel**
- **Mục tiêu:** Quay với spins thật
- **Thực hiện:**
  - Có ít nhất 1 spin
  - Click "🎰 Spin (X left)"
  - Xem kết quả quay
- **Kết quả mong đợi:**
  - Spins giảm sau khi quay
  - Rewards tăng
  - Console log hiển thị real values

#### **D. ✅ Test GM Function**
- **Mục tiêu:** Test EIP-712 signature với real FHE
- **Thực hiện:**
  - Click "🌅 Say GM (Free Spin)"
  - Chờ signature và transaction
- **Kết quả mong đợi:**
  - Signature verified
  - Free spin được claim
  - Console log hiển thị EIP-712 details

#### **E. ✅ Test FHE Decryption**
- **Mục tiêu:** Test real FHE decryption
- **Thực hiện:**
  - Click "🔓 Test Real FHE Decrypt"
  - Xem console logs
- **Kết quả mong đợi:**
  - Console hiển thị "✅ Real FHE decryption successful: 264"
  - Không còn mock values

### 🔐 **Bước 3: Test ACL Management**

#### **A. ✅ Test Permanent Access**
- **Thực hiện:** Click "🔐 Grant Permanent Access"
- **Kết quả:** Success message

#### **B. ✅ Test Transient Access**
- **Thực hiện:** Click "⚡ Grant Transient Access"
- **Kết quả:** Success message

#### **C. ✅ Test Contract Access**
- **Thực hiện:** Click "🏗️ Grant Contract Access"
- **Kết quả:** Success message

#### **D. ✅ Test Make Public**
- **Thực hiện:** Click "🌐 Make Public"
- **Kết quả:** Success message

#### **E. ✅ Test Get Permissions**
- **Thực hiện:** Click "📋 Get Permissions"
- **Kết quả:** Hiển thị permissions JSON

### 🏆 **Bước 4: Test Advanced Features**

#### **A. ✅ Test Enhanced Spin**
- **Thực hiện:** Click "🚀 Enhanced Spin"
- **Kết quả:** Multiple encrypted inputs được tạo

#### **B. ✅ Test Publish Score**
- **Thực hiện:** Click "🏆 Publish Score"
- **Kết quả:** Score được publish lên leaderboard

#### **C. ✅ Test Demo Decrypt**
- **Thực hiện:** Click "🔓 Demo Decrypt"
- **Kết quả:** Decryption test với sample data

### 📊 **Bước 5: Monitor Console Logs**

#### **✅ Real FHE Decryption Logs:**
```
🔐 Attempting real FHE decryption for: 0x...
✅ Real FHE decryption successful: 264
✅ FHEVM Decrypted value: 264
```

#### **✅ Transaction Logs:**
```
⏳ Transaction sent: 0x...
✅ Transaction confirmed
🔄 Refreshing user data for: 0x...
```

#### **✅ ACL Logs:**
```
🔍 Checking sender access: 0x...
🔍 Spins ACL check: true
🔍 Rewards ACL check: true
```

### 🎯 **Bước 6: Verify Real Values**

#### **✅ Trước (Mock):**
- Spins: 768 (mock)
- Rewards: 2048 (mock)
- Decryption: "🔄 Using fallback mock value"

#### **✅ Sau (Real FHE):**
- Spins: 264 (real)
- Rewards: 544 (real)
- Decryption: "✅ Real FHE decryption successful: 264"

### 🚨 **Bước 7: Error Handling Test**

#### **A. ✅ Test Invalid Ciphertext**
- **Thực hiện:** Test với ciphertext không hợp lệ
- **Kết quả:** Error message hiển thị

#### **B. ✅ Test Empty Ciphertext**
- **Thực hiện:** Test với ciphertext rỗng
- **Kết quả:** Return 0

#### **C. ✅ Test Network Errors**
- **Thực hiện:** Disconnect network
- **Kết quả:** Error handling hoạt động

### 📈 **Bước 8: Performance Test**

#### **A. ✅ Test Decryption Speed**
- **Thực hiện:** Click refresh nhiều lần
- **Kết quả:** Decryption nhanh và consistent

#### **B. ✅ Test Transaction Speed**
- **Thực hiện:** Buy spins nhiều lần
- **Kết quả:** Transactions confirm nhanh

### 🎉 **Kết Quả Mong Đợi**

#### **✅ Thành Công:**
1. **Real FHE Values:** Không còn mock values
2. **Consistent Results:** Tất cả methods trả về cùng kết quả
3. **Fast Performance:** Decryption và transactions nhanh
4. **Good UX:** Giao diện đẹp và responsive
5. **Error Handling:** Xử lý lỗi tốt

#### **❌ Cần Fix:**
1. **SDK Errors:** Nếu có lỗi initialization
2. **Transaction Failures:** Nếu transactions fail
3. **Decryption Errors:** Nếu decryption không hoạt động

### 🔧 **Troubleshooting**

#### **Nếu SDK không khởi tạo:**
1. Refresh page
2. Check network connection
3. Verify contract address

#### **Nếu Transactions fail:**
1. Check MetaMask connection
2. Verify Sepolia network
3. Check ETH balance

#### **Nếu Decryption không hoạt động:**
1. Check console logs
2. Verify ciphertext format
3. Test với sample data

### 🎯 **Test Checklist**

- [ ] **Wallet Connection:** ✅ Connected
- [ ] **User Data Display:** ✅ Real values (264 spins, 544 rewards)
- [ ] **Buy Spins:** ✅ Transaction successful
- [ ] **Spin Wheel:** ✅ Spins decrease, rewards increase
- [ ] **GM Function:** ✅ EIP-712 signature verified
- [ ] **FHE Decryption:** ✅ Real ciphertext parsing
- [ ] **ACL Management:** ✅ All permissions working
- [ ] **Enhanced Spin:** ✅ Multiple encrypted inputs
- [ ] **Publish Score:** ✅ Score published
- [ ] **Error Handling:** ✅ Graceful error handling
- [ ] **Performance:** ✅ Fast and responsive

**Status:** 🎉 **Ready for Real FHE Testing!** 