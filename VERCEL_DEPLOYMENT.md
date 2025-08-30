# 🚀 Vercel Deployment Guide - SpingameFHE2025

## 📋 Prerequisites

1. **Vercel Account**: Đăng ký tài khoản tại [vercel.com](https://vercel.com)
2. **GitHub Repository**: Code đã được push lên GitHub
3. **Node.js**: Version 18+ (Vercel sẽ tự động detect)

## 🔧 Deployment Steps

### Method 1: Deploy via Vercel Dashboard (Recommended)

1. **Login to Vercel**
   - Truy cập [vercel.com](https://vercel.com)
   - Đăng nhập bằng GitHub account

2. **Import Project**
   - Click "New Project"
   - Chọn repository `SpingameFHE2025`
   - Vercel sẽ tự động detect framework

3. **Configure Project Settings**
   - **Project Name**: `SpingameFHE2025`
   - **Framework Preset**: `Create React App`
   - **Root Directory**: `./` (root of repository)
   - **Build Command**: `cd frontend-fhe-spin && npm install && npm run build`
   - **Output Directory**: `frontend-fhe-spin/build`

4. **Environment Variables**
   - Vercel sẽ tự động load từ `vercel.json`
   - Hoặc thêm manual trong dashboard:
     ```
     REACT_APP_FHEVM_CONTRACT_ADDRESS=YOUR_CONTRACT_ADDRESS_HERE
     REACT_APP_SEPOLIA_RPC_URL=YOUR_SEPOLIA_RPC_URL_HERE
     REACT_APP_RELAYER_URL=https://relayer.testnet.zama.cloud
     REACT_APP_ETHERSCAN_API_KEY=YOUR_ETHERSCAN_API_KEY_HERE
     ```

5. **Deploy**
   - Click "Deploy"
   - Chờ build process hoàn thành

### Method 2: Deploy via Vercel CLI

1. **Install Vercel CLI**
   ```bash
   npm i -g vercel
   ```

2. **Login to Vercel**
   ```bash
   vercel login
   ```

3. **Deploy**
   ```bash
   vercel --prod
   ```

## 🔧 Configuration Details

### Build Configuration
- **Framework**: Create React App
- **Build Command**: `cd frontend-fhe-spin && npm install && npm run build`
- **Output Directory**: `frontend-fhe-spin/build`
- **Node Version**: 18.x (auto-detected)

### Environment Variables
All required environment variables are configured in `vercel.json`:
- Contract addresses
- RPC endpoints
- API keys
- Chain configurations

### Security Headers
Configured for FHE compatibility:
- `Cross-Origin-Opener-Policy: same-origin`
- `Cross-Origin-Embedder-Policy: require-corp`
- Additional security headers for production

### API Functions
- `api/claim-attestation.js`: Serverless function for ETH claims
- Max duration: 30 seconds
- Automatic scaling

## 🌐 Domain & URLs

After deployment, you'll get:
- **Production URL**: `https://spingamefhe2025.vercel.app`
- **Preview URLs**: For each PR/commit
- **Custom Domain**: Can be configured in Vercel dashboard

## 🔍 Monitoring & Analytics

### Vercel Analytics
- Automatic performance monitoring
- Real-time metrics
- Error tracking

### Function Logs
- View serverless function logs in Vercel dashboard
- Monitor API performance
- Debug issues

## 🚨 Troubleshooting

### Common Issues

1. **Build Failures**
   - Check Node.js version compatibility
   - Verify all dependencies in `package.json`
   - Check build logs in Vercel dashboard

2. **Environment Variables**
   - Ensure all required variables are set
   - Check variable names match exactly
   - Verify no typos in values

3. **FHE SDK Loading Issues**
   - Check CORS headers configuration
   - Verify relayer URL accessibility
   - Check browser console for errors

4. **Contract Connection Issues**
   - Verify contract address is correct
   - Check RPC endpoint availability
   - Ensure MetaMask is connected to Sepolia

### Debug Commands
```bash
# Check build locally
cd frontend-fhe-spin
npm run build

# Test production build
npm run serve

# Check environment variables
echo $REACT_APP_FHEVM_CONTRACT_ADDRESS
```

## 📊 Performance Optimization

### Vercel Optimizations
- Automatic CDN distribution
- Edge caching
- Image optimization
- Code splitting

### FHE-Specific Optimizations
- WASM files cached at edge
- SDK loading optimized
- Minimal bundle size

## 🔄 Continuous Deployment

### Automatic Deployments
- Deploy on every push to `main` branch
- Preview deployments for PRs
- Automatic rollback on failures

### Manual Deployments
```bash
# Deploy to production
vercel --prod

# Deploy to preview
vercel

# Rollback to previous version
vercel rollback
```

## 📞 Support

### Vercel Support
- [Vercel Documentation](https://vercel.com/docs)
- [Vercel Community](https://github.com/vercel/vercel/discussions)

### Project Support
- Check README.md for game instructions
- Review test files for functionality
- Contact project maintainers

---

## 🎯 Quick Deploy Checklist

- [ ] Repository pushed to GitHub
- [ ] `vercel.json` configured correctly
- [ ] Environment variables set
- [ ] Build command tested locally
- [ ] Deploy via Vercel dashboard
- [ ] Test all game functions
- [ ] Verify FHE SDK loading
- [ ] Check contract connectivity
- [ ] Monitor performance metrics

**🎉 Your SpingameFHE2025 is now live on Vercel!**
