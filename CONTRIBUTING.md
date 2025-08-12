# 🤝 Contributing to Lucky Spin FHEVM Demo

Cảm ơn bạn quan tâm đến việc đóng góp cho dự án! Hướng dẫn này sẽ giúp bạn bắt đầu.

## 📋 Table of Contents

- [Code of Conduct](#code-of-conduct)
- [How Can I Contribute?](#how-can-i-contribute)
- [Development Setup](#development-setup)
- [Coding Standards](#coding-standards)
- [Testing](#testing)
- [Pull Request Process](#pull-request-process)
- [Reporting Bugs](#reporting-bugs)
- [Feature Requests](#feature-requests)

## 📜 Code of Conduct

### Our Pledge
Chúng tôi cam kết tạo ra một môi trường mở và thân thiện cho tất cả mọi người, bất kể tuổi tác, kích thước cơ thể, khuyết tật, dân tộc, đặc điểm giới tính, bản sắc và biểu hiện giới tính, mức độ kinh nghiệm, quốc tịch, ngoại hình cá nhân, chủng tộc, tôn giáo hay bản sắc và định hướng tình dục.

### Our Standards
Ví dụ về hành vi góp phần tạo ra môi trường tích cực:
- Sử dụng ngôn ngữ thân thiện và bao gồm
- Tôn trọng quan điểm và trải nghiệm khác nhau
- Chấp nhận phản hồi mang tính xây dựng một cách duyên dáng
- Tập trung vào những gì tốt nhất cho cộng đồng
- Thể hiện sự đồng cảm với các thành viên cộng đồng khác

## 🎯 How Can I Contribute?

### 🐛 Reporting Bugs
- Sử dụng [GitHub Issues](https://github.com/your-username/gmspin/issues)
- Kiểm tra xem bug đã được báo cáo chưa
- Cung cấp thông tin chi tiết về môi trường và bước tái tạo

### 💡 Suggesting Enhancements
- Mô tả rõ ràng tính năng mong muốn
- Giải thích lý do tại sao tính năng này hữu ích
- Đề xuất cách triển khai nếu có thể

### 🔧 Pull Requests
- Fork repository
- Tạo feature branch
- Thực hiện thay đổi
- Viết tests
- Submit pull request

## 🛠️ Development Setup

### Prerequisites
```bash
# Node.js 18+
node --version

# Git
git --version

# MetaMask (for testing)
```

### Local Development
```bash
# Clone repository
git clone https://github.com/your-username/gmspin.git
cd gmspin

# Install dependencies
npm install
cd frontend-fhe-spin
npm install

# Set up environment
cp .env.example .env
# Edit .env with your configuration

# Start development server
npm start
```

### Smart Contract Development
```bash
# Compile contracts
npx hardhat compile

# Run tests
npx hardhat test

# Deploy to local network
npx hardhat node
npx hardhat run deploy/06b_deploy_kms_final_js.js --network localhost
```

## 📝 Coding Standards

### TypeScript/JavaScript
- Sử dụng **TypeScript** cho tất cả code mới
- Tuân thủ **ESLint** và **Prettier** rules
- Sử dụng **async/await** thay vì promises
- Thêm **JSDoc** comments cho functions phức tạp

```typescript
/**
 * Decrypts encrypted user data from the contract
 * @param account - User's wallet address
 * @returns Promise<UserGameState | null>
 */
async function decryptUserData(account: string): Promise<UserGameState | null> {
  // Implementation
}
```

### Solidity
- Sử dụng **Solidity 0.8.24**
- Tuân thủ **OpenZeppelin** standards
- Thêm **NatSpec** comments
- Sử dụng **SafeMath** (built-in từ Solidity 0.8.0)

```solidity
/**
 * @dev Daily check-in function for users to receive free spins
 * @param user The address of the user checking in
 * @return success Whether the check-in was successful
 */
function dailyGm(address user) external returns (bool success) {
    // Implementation
}
```

### File Naming
- **React Components**: PascalCase (e.g., `SpinWheel.tsx`)
- **Hooks**: camelCase với prefix `use` (e.g., `useUserGameState.ts`)
- **Utilities**: camelCase (e.g., `fheUtils.ts`)
- **Contracts**: PascalCase (e.g., `LuckySpinFHE_KMS_Final.sol`)

### Code Organization
```
src/
├── components/          # React components
├── hooks/              # Custom React hooks
├── utils/              # Utility functions
├── types/              # TypeScript type definitions
├── constants/          # Application constants
└── styles/             # CSS/styling files
```

## 🧪 Testing

### Frontend Testing
```bash
# Run all tests
npm test

# Run tests in watch mode
npm test -- --watch

# Run tests with coverage
npm test -- --coverage
```

### Smart Contract Testing
```bash
# Run all contract tests
npx hardhat test

# Run specific test file
npx hardhat test test/LuckySpinFHE.test.js

# Run tests with gas reporting
REPORT_GAS=true npx hardhat test
```

### Test Structure
```typescript
describe('Spin Functionality', () => {
  beforeEach(async () => {
    // Setup test environment
  });

  it('should allow user to spin when they have spins available', async () => {
    // Test implementation
  });

  it('should reject spin when user has no spins', async () => {
    // Test implementation
  });
});
```

### Integration Testing
```bash
# Test frontend with local contract
npm run test:integration

# Test with Sepolia testnet
npm run test:sepolia
```

## 🔄 Pull Request Process

### Before Submitting
1. **Fork** repository
2. **Create** feature branch: `git checkout -b feature/amazing-feature`
3. **Make** changes following coding standards
4. **Test** thoroughly (unit tests, integration tests)
5. **Update** documentation if needed
6. **Commit** with descriptive messages

### Commit Message Format
```
type(scope): description

[optional body]

[optional footer]
```

**Types:**
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code style changes
- `refactor`: Code refactoring
- `test`: Adding tests
- `chore`: Maintenance tasks

**Examples:**
```
feat(spin): add new spin animation

fix(claim): resolve ETH claim issue

docs(readme): update installation instructions
```

### Pull Request Checklist
- [ ] Code follows project standards
- [ ] Tests pass locally
- [ ] Documentation updated
- [ ] No console.log statements in production code
- [ ] Error handling implemented
- [ ] Performance considered
- [ ] Security implications reviewed

### Review Process
1. **Automated Checks**: CI/CD pipeline runs tests
2. **Code Review**: Maintainers review code
3. **Address Feedback**: Make requested changes
4. **Merge**: Once approved, PR is merged

## 🐛 Reporting Bugs

### Bug Report Template
```markdown
**Bug Description**
Clear and concise description of the bug.

**Steps to Reproduce**
1. Go to '...'
2. Click on '...'
3. Scroll down to '...'
4. See error

**Expected Behavior**
What you expected to happen.

**Actual Behavior**
What actually happened.

**Environment**
- OS: [e.g. Windows 10]
- Browser: [e.g. Chrome 120]
- MetaMask: [e.g. v11.0.0]
- Network: [e.g. Sepolia]

**Additional Context**
Any other context about the problem.
```

### Before Reporting
- [ ] Check existing issues
- [ ] Test on different browsers
- [ ] Clear browser cache
- [ ] Check MetaMask connection
- [ ] Verify network settings

## 💡 Feature Requests

### Feature Request Template
```markdown
**Feature Description**
Clear and concise description of the feature.

**Problem Statement**
What problem does this feature solve?

**Proposed Solution**
How should this feature work?

**Alternative Solutions**
Any alternative solutions considered?

**Additional Context**
Any other context or screenshots.
```

### Feature Evaluation Criteria
- **Impact**: How many users will benefit?
- **Complexity**: How difficult to implement?
- **Maintenance**: Ongoing maintenance requirements?
- **Security**: Security implications?
- **Performance**: Performance impact?

## 📚 Documentation

### Documentation Standards
- Sử dụng **Markdown** format
- Thêm **code examples** khi cần thiết
- Cập nhật **README.md** cho changes lớn
- Thêm **inline comments** cho code phức tạp

### Required Documentation
- **API Documentation**: For new functions
- **User Guides**: For new features
- **Deployment Guides**: For infrastructure changes
- **Troubleshooting**: For common issues

## 🔒 Security

### Security Guidelines
- **Never** commit private keys or secrets
- **Always** validate user inputs
- **Use** secure random number generation
- **Implement** proper access controls
- **Test** for common vulnerabilities

### Security Reporting
- Email: security@yourdomain.com
- **Do not** create public issues for security vulnerabilities
- Provide detailed information about the vulnerability
- Allow time for fix before public disclosure

## 🎉 Recognition

### Contributors
- **Code Contributors**: Listed in GitHub contributors
- **Bug Reporters**: Acknowledged in issue resolution
- **Documentation**: Credited in relevant files
- **Security**: Special recognition for security contributions

### Hall of Fame
- **Top Contributors**: Featured in README
- **Major Features**: Named after contributors
- **Community Awards**: For exceptional contributions

## 📞 Getting Help

### Communication Channels
- **GitHub Issues**: For bugs and feature requests
- **GitHub Discussions**: For questions and ideas
- **Discord**: For real-time chat (if available)
- **Email**: For private matters

### Resources
- [FHEVM Documentation](https://docs.zama.ai/fhevm)
- [React Documentation](https://react.dev)
- [Ethers.js Documentation](https://docs.ethers.org)
- [Hardhat Documentation](https://hardhat.org/docs)

---

**Thank you for contributing to Lucky Spin FHEVM Demo!** 🎰

Your contributions help make this project better for everyone in the community.
