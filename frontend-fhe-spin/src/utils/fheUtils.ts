import { ethers } from "ethers";
import { CONFIG } from "../config";
import { signClaimAttestation } from "./eip712Signer";

// ✅ Import Zama SDK bundle theo tài liệu
import { initSDK, createInstance, SepoliaConfig } from "@zama-fhe/relayer-sdk/bundle";

// ✅ LuckySpinFHE_KMS_Final ABI - FHEVM compatible with KMS callback (Updated)
import LuckySpinFHE_KMS_Final_abi from "../abi/LuckySpinFHE_KMS_Final.json";
const LuckySpinFHE_abi = LuckySpinFHE_KMS_Final_abi.abi;

// ✅ SDK được load từ UMD CDN trong index.html
// Và cũng có thể import trực tiếp từ bundle
// Không cần import thêm - SDK sẽ có sẵn trong window.relayerSDK
// và được truyền vào constructor qua parameter sdk

const SPIN_OUTCOME_SIG = "SpinOutcome(address,uint8,uint256,uint64)";

// Cache type for user-decryption signature/session
type UdsigCache = {
  signature: string;
  start: string;
  durationDays: string;
  contract: string;
  publicKey: string;
  expiresAt: number;
};

// ✅ FHE Utils theo chuẩn FHEVM với ABI chuẩn - PHIÊN BẢN ĐƠN GIẢN
export class FheUtils {
  sdk: any;
  contract: ethers.Contract;
  provider: ethers.BrowserProvider;
  signer: ethers.Signer;
  private cachedKeypair?: { publicKey: string; privateKey: string };
  private cachedUdsig?: UdsigCache;

  // ✅ Thêm throttle global để tránh spam
  private static lastDecryptCall = 0;
  private static readonly DECRYPT_COOLDOWN_MS = 5000; // 5 giây cooldown

  constructor(sdk: any, provider: ethers.BrowserProvider, signer: ethers.Signer) {
    this.sdk = sdk;
    this.provider = provider;
    this.signer = signer;

    // ✅ Validate signer
    if (!signer) {
      throw new Error("Signer is required for FHE Utils initialization");
    }

    // ✅ Validate provider
    if (!provider) {
      throw new Error("Provider is required for FHE Utils initialization");
    }

    // ✅ Use CONFIG for contract address to avoid missing env vars
    const contractAddress = CONFIG.FHEVM_CONTRACT_ADDRESS;
    if (!contractAddress) {
      throw new Error("FHEVM_CONTRACT_ADDRESS missing from CONFIG");
    }

    // ✅ Validate contract address format
    if (!ethers.isAddress(contractAddress)) {
      throw new Error(`Invalid contract address: ${contractAddress}`);
    }

    // ✅ Create contract with additional validation
    try {
      this.contract = new ethers.Contract(contractAddress, LuckySpinFHE_abi, signer);

      // ✅ Verify contract target is set
      if (!this.contract.target) {
        throw new Error("Contract target is null after initialization");
      }
    } catch (error) {
      throw new Error(`Failed to initialize contract: ${error}`);
    }
  }

  // ✅ Thêm method để check throttle
  private static checkThrottle(): boolean {
    const now = Date.now();
    if (now - FheUtils.lastDecryptCall < FheUtils.DECRYPT_COOLDOWN_MS) {
      // Removed debug log for throttle
      return false;
    }
    FheUtils.lastDecryptCall = now;
    return true;
  }

  // ✅ Method to check if contract is properly initialized
  isContractReady(): boolean {
    return !!(this.contract && this.contract.target && this.signer);
  }

  // ✅ Method to get contract address safely
  getContractAddress(): string | null {
    return (this.contract?.target as string) || null;
  }

  // ===== Helpers: cache keypair and EIP-712 user-decrypt authorization =====
  private async ensureKeypairCached(): Promise<{ publicKey: string; privateKey: string }> {
    if (this.cachedKeypair) return this.cachedKeypair;
    try {
      const pub = localStorage.getItem("fhe:keypair:pub");
      const priv = localStorage.getItem("fhe:keypair:priv");
      if (pub && priv) {
        this.cachedKeypair = { publicKey: pub, privateKey: priv };
        return this.cachedKeypair;
      }
    } catch {}
    const kp = await this.sdk.generateKeypair();
    try {
      localStorage.setItem("fhe:keypair:pub", kp.publicKey);
      localStorage.setItem("fhe:keypair:priv", kp.privateKey);
    } catch {}
    this.cachedKeypair = kp;
    return kp;
  }

  private getDailyBucketStart(nowMs: number): number {
    const secs = Math.floor(nowMs / 1000);
    return Math.floor(secs / 86400) * 86400; // 00:00 UTC
  }

  // ✅ Add in-flight dedupe and simple cooldown to prevent multiple MetaMask popups
  private signatureRequestCache = new Map<
    string,
    Promise<{
      signature: string;
      startTimeStamp: string;
      durationDays: string;
      contracts: string[];
      keypair: { publicKey: string; privateKey: string };
    }>
  >();
  private lastSignatureRequest = 0;
  private readonly SIGNATURE_COOLDOWN_MS = 1000; // 1s cooldown between signature prompts

  private async getUserDecryptAuth(contractAddress: string): Promise<{
    signature: string; // no 0x
    startTimeStamp: string;
    durationDays: string;
    contracts: string[];
    keypair: { publicKey: string; privateKey: string };
  }> {
    const keypair = await this.ensureKeypairCached();
    const now = Date.now();
    const startBucket = this.getDailyBucketStart(now);
    const durationDays = "10";
    const expiresAt = startBucket + parseInt(durationDays, 10) * 86400 - 60; // 60s skew
    const addr = (await this.signer.getAddress()).toLowerCase();

    // Use the same cache key format as getCachedUserDecryptAuth
    const cacheKey = `fhe:udsig:${addr}:${contractAddress}:${keypair.publicKey}`;

    // 1) Return valid cached signature if present
    try {
      const cachedStr = localStorage.getItem(cacheKey);
      if (cachedStr) {
        const cached = JSON.parse(cachedStr) as UdsigCache;
        if (
          cached &&
          cached.contract?.toLowerCase() === contractAddress.toLowerCase() &&
          cached.publicKey === keypair.publicKey &&
          cached.expiresAt &&
          cached.expiresAt > Math.floor(now / 1000)
        ) {
          this.cachedUdsig = cached;
          return {
            signature: cached.signature,
            startTimeStamp: cached.start,
            durationDays: cached.durationDays,
            contracts: [contractAddress],
            keypair,
          };
        }
      }
    } catch {}

    // 2) Throttle prompts a bit to avoid burst of popups
    const delta = now - this.lastSignatureRequest;
    if (delta < this.SIGNATURE_COOLDOWN_MS) {
      await new Promise((r) => setTimeout(r, this.SIGNATURE_COOLDOWN_MS - delta));
    }

    // 3) Dedupe concurrent requests for the same cache key
    if (this.signatureRequestCache.has(cacheKey)) {
      return this.signatureRequestCache.get(cacheKey)!;
    }

    const inflight = (async () => {
      const startTimeStamp = String(startBucket);
      const contracts = [contractAddress];
      const eip712 = await this.sdk.createEIP712(keypair.publicKey, contracts, startTimeStamp, durationDays);
      const sig = await (this.signer as any).signTypedData(
        eip712.domain,
        { UserDecryptRequestVerification: eip712.types.UserDecryptRequestVerification },
        eip712.message,
      );
      const signatureNo0x = String(sig).replace(/^0x/, "");
      const toCache: UdsigCache = {
        signature: signatureNo0x,
        start: startTimeStamp,
        durationDays,
        contract: contractAddress,
        publicKey: keypair.publicKey,
        expiresAt: expiresAt,
      };
      this.cachedUdsig = toCache;
      try {
        localStorage.setItem(cacheKey, JSON.stringify(toCache));
      } catch {}
      this.lastSignatureRequest = Date.now();
      return { signature: signatureNo0x, startTimeStamp, durationDays, contracts, keypair };
    })();

    this.signatureRequestCache.set(cacheKey, inflight);
    try {
      return await inflight;
    } finally {
      // clear shortly after resolve to keep map small, but keep LS cache for reuse
      setTimeout(() => this.signatureRequestCache.delete(cacheKey), 3000);
    }
  }

  // Cached-only read to avoid prompting wallet automatically
  private async getCachedUserDecryptAuth(contractAddress: string): Promise<{
    signature: string; // no 0x
    startTimeStamp: string;
    durationDays: string;
    contracts: string[];
    keypair: { publicKey: string; privateKey: string };
  } | null> {
    const keypair = await this.ensureKeypairCached();
    const addr = (await this.signer.getAddress()).toLowerCase();
    const now = Date.now();
    const cacheKey = `fhe:udsig:${addr}:${contractAddress}:${keypair.publicKey}`;
    try {
      const cachedStr = localStorage.getItem(cacheKey);
      if (cachedStr) {
        const cached = JSON.parse(cachedStr) as UdsigCache;
        if (
          cached &&
          cached.contract?.toLowerCase() === contractAddress.toLowerCase() &&
          cached.publicKey === keypair.publicKey &&
          cached.expiresAt &&
          cached.expiresAt > Math.floor(now / 1000)
        ) {
          return {
            signature: cached.signature,
            startTimeStamp: cached.start,
            durationDays: cached.durationDays,
            contracts: [contractAddress],
            keypair,
          };
        }
      }
    } catch {}
    return null;
  }

  // Explicit request to authorize user decryption (should be called on user interaction)
  async requestUserDecryptAuthorization(): Promise<boolean> {
    try {
      const addr = await this.signer.getAddress();
      const contractAddress = this.contract.target as string;

      await this.getUserDecryptAuth(contractAddress);
      return true;
    } catch (e) {
      return false;
    }
  }

  async hasCachedDecryptAuth(): Promise<boolean> {
    try {
      const contractAddress = this.contract.target as string;
      const cached = await this.getCachedUserDecryptAuth(contractAddress);
      return !!cached;
    } catch {
      return false;
    }
  }

  // ✅ Tạo encrypted input cho buySpins với ABI chuẩn và EIP-712 signature
  async createBuySpinsInput(amount: number) {
    try {
      if (!this.sdk) throw new Error("SDK not initialized");
      const builder = this.sdk.createEncryptedInput(this.contract.target as string, await this.signer.getAddress());
      builder.add64(BigInt(amount));
      const { handles, inputProof } = await builder.encrypt();
      if (!handles?.length) throw new Error("No handles returned from encrypted input");
      return { handles, inputProof, values: [amount], types: ["u64"] } as any;
    } catch (error) {
      throw error;
    }
  }

  // ✅ Decrypt user spins với ABI chuẩn
  async decryptUserSpins(address: string): Promise<number> {
    try {
      const encryptedSpins = await this.contract.getUserSpins(address);

      // ✅ Sử dụng SDK instance để decrypt
      if (!this.sdk) {
        throw new Error("SDK not initialized");
      }

      // ✅ Validate ciphertext format - kiểm tra kỹ hơn
      if (!encryptedSpins || typeof encryptedSpins !== "string") {
        return 0;
      }

      // ✅ Check if ciphertext is zero/empty/undefined
      if (
        encryptedSpins === "0x0000000000000000000000000000000000000000000000000000000000000000" ||
        encryptedSpins === "0x" ||
        encryptedSpins === "" ||
        encryptedSpins === undefined ||
        encryptedSpins === null
      ) {
        return 0;
      }

      // ✅ Validate hex format
      if (!encryptedSpins.match(/^0x[0-9a-fA-F]+$/)) {
        return 0;
      }

      const v = await this.decryptEuint64(encryptedSpins);
      return Number(v) || 0;
    } catch (error) {
      return 0;
    }
  }

  // ✅ Decrypt user rewards với ABI chuẩn
  async decryptUserRewards(address: string): Promise<number> {
    try {
      const encryptedRewards = await this.contract.getUserRewards(address);

      // ✅ Sử dụng SDK instance để decrypt
      if (!this.sdk) {
        throw new Error("SDK not initialized");
      }

      // ✅ Validate ciphertext format - kiểm tra kỹ hơn
      if (!encryptedRewards || typeof encryptedRewards !== "string") {
        return 0;
      }

      // ✅ Check if ciphertext is zero/empty/undefined
      if (
        encryptedRewards === "0x0000000000000000000000000000000000000000000000000000000000000000" ||
        encryptedRewards === "0x" ||
        encryptedRewards === "" ||
        encryptedRewards === undefined ||
        encryptedRewards === null
      ) {
        return 0;
      }

      // ✅ Validate hex format
      if (!encryptedRewards.match(/^0x[0-9a-fA-F]+$/)) {
        return 0;
      }

      const contractAddress = this.contract.target as string;
      const cachedAuth = await this.getCachedUserDecryptAuth(contractAddress);
      if (!cachedAuth) {
        // Do not trigger wallet; return 0 until user explicitly authorizes
        return 0;
      }
      const pairs = [{ handle: encryptedRewards, contractAddress }];
      const result = await this.sdk.userDecrypt(
        pairs,
        cachedAuth.keypair.privateKey,
        cachedAuth.keypair.publicKey,
        cachedAuth.signature,
        cachedAuth.contracts,
        await this.signer.getAddress(),
        cachedAuth.startTimeStamp,
        cachedAuth.durationDays,
      );
      const val = result?.[encryptedRewards];
      const n =
        typeof val === "bigint"
          ? val
          : typeof val === "number"
            ? BigInt(val)
            : typeof val === "string" && /^\d+$/.test(val)
              ? BigInt(val)
              : 0n;
      const asNum = n <= BigInt(Number.MAX_SAFE_INTEGER) ? Number(n) : 0;
      return asNum;
    } catch (error) {
      return 0;
    }
  }

  // ✅ Decrypt user GM balance
  async decryptUserGm(address: string): Promise<number> {
    try {
      const encryptedGm = await this.contract.getUserGmBalance(address);
      if (!encryptedGm || typeof encryptedGm !== "string" || !encryptedGm.startsWith("0x")) return 0;
      const v = await this.decryptEuint64(encryptedGm);
      return Number(v) || 0;
    } catch {
      return 0;
    }
  }

  // ✅ Decrypt euint64 - Sử dụng withRelayerGate
  async decryptEuint64(ciphertext: string): Promise<bigint> {
    // ✅ Validate input
    if (!this.sdk) throw new Error("SDK not initialized");
    if (!ciphertext || typeof ciphertext !== "string" || !ciphertext.startsWith("0x")) return 0n;
    if (ciphertext === "0x" + "0".repeat(64)) return 0n;

    return withRelayerGate(async () => {
      // ✅ Thử decrypt với cached auth trước
      try {
        const contractAddress = this.contract.target as string;
        const cachedAuth = await this.getCachedUserDecryptAuth(contractAddress);
        if (cachedAuth) {
          const handleContractPairs = [{ handle: ciphertext, contractAddress }];
          const result = await this.sdk.userDecrypt(
            handleContractPairs,
            cachedAuth.keypair.privateKey,
            cachedAuth.keypair.publicKey,
            cachedAuth.signature,
            cachedAuth.contracts,
            await this.signer.getAddress(),
            cachedAuth.startTimeStamp,
            cachedAuth.durationDays,
          );
          const val = result?.[ciphertext];
          if (typeof val === "bigint") return val;
          if (typeof val === "number") return BigInt(val);
          if (typeof val === "string" && /^\d+$/.test(val)) return BigInt(val);
        }
      } catch (e: any) {
        console.error("❌ Cached auth decrypt failed:", e);
      }

      // ✅ Fallback: thử tạo auth mới nếu không có cached
      try {
        const contractAddress = this.contract.target as string;
        const auth = await this.getUserDecryptAuth(contractAddress);
        const handleContractPairs = [{ handle: ciphertext, contractAddress }];
        const result = await this.sdk.userDecrypt(
          handleContractPairs,
          auth.keypair.privateKey,
          auth.keypair.publicKey,
          auth.signature,
          auth.contracts,
          await this.signer.getAddress(),
          auth.startTimeStamp,
          auth.durationDays,
        );
        const val = result?.[ciphertext];
        if (typeof val === "bigint") return val;
        if (typeof val === "number") return BigInt(val);
        if (typeof val === "string" && /^\d+$/.test(val)) return BigInt(val);
      } catch (e: any) {
        console.error("❌ Decrypt failed:", e);
      }

      // Return 0 if all decrypt attempts fail
      return 0n;
    });
  }

  // ✅ Decrypt multiple values - Sử dụng withRelayerGate và chạy tuần tự
  async decryptMultipleValues(
    handleContractPairs: Array<{ handle: string; contractAddress: string }>,
  ): Promise<Record<string, bigint>> {
    if (!this.sdk) throw new Error("SDK not initialized");
    if (!this.contract?.target) {
      // Try to reinitialize contract if target is null
      try {
        const contractAddress = CONFIG.FHEVM_CONTRACT_ADDRESS;
        if (!contractAddress) {
          throw new Error("FHEVM_CONTRACT_ADDRESS missing from CONFIG");
        }
        this.contract = new ethers.Contract(contractAddress, LuckySpinFHE_abi, this.signer);
        if (!this.contract?.target) {
          throw new Error("Contract reinitialization failed");
        }
      } catch (error) {
        throw new Error(`Contract not initialized and reinitialization failed: ${error}`);
      }
    }
    if (!handleContractPairs.length) return {};

    return withRelayerGate(async () => {
      const address = await this.signer.getAddress();
      const contractAddress = this.contract.target as string;

      if (!contractAddress) {
        throw new Error("Contract target is null - contract not properly initialized");
      }

      const cachedAuth = await this.getCachedUserDecryptAuth(contractAddress);

      if (!cachedAuth) {
        return {};
      }

      try {
        // ✅ Sử dụng BATCH DECRYPT thực sự - gọi tất cả handles cùng lúc
        // Removed debug log for batch decrypt

        const result = await this.sdk.userDecrypt(
          handleContractPairs, // Gửi tất cả handles cùng lúc
          cachedAuth.keypair.privateKey,
          cachedAuth.keypair.publicKey,
          cachedAuth.signature,
          cachedAuth.contracts,
          address,
          cachedAuth.startTimeStamp,
          cachedAuth.durationDays,
        );

        // ✅ Process tất cả results cùng lúc
        const bigintResult: Record<string, bigint> = {};

        for (const pair of handleContractPairs) {
          const value = result?.[pair.handle];
          if (typeof value === "bigint") {
            bigintResult[pair.handle] = value;
          } else if (typeof value === "number") {
            bigintResult[pair.handle] = BigInt(value);
          } else if (typeof value === "string" && /^\d+$/.test(value)) {
            bigintResult[pair.handle] = BigInt(value);
          } else {
            bigintResult[pair.handle] = 0n;
          }
        }

        // Removed debug log for batch decrypt success
        return bigintResult;
      } catch (e: any) {
        const msg = String(e?.message || "").toLowerCase();
        console.error("❌ decryptMultipleValues: Error", e?.message);

        if (msg.includes("500") || msg.includes("internal server error")) {
          // Clear UDSIG cache on 500 error - likely expired or invalid
          this.cachedUdsig = undefined;
          localStorage.removeItem("fhe_udsig");
        }

        return {};
      }
    });
  }

  async decryptPendingEth(address: string): Promise<number> {
    try {
      const ct = await (this.contract as any).getEncryptedPendingEthWei(address);
      if (!ct || typeof ct !== "string" || !ct.startsWith("0x")) return 0;
      const wei = await this.decryptEuint64(ct);
      return Number(ethers.formatEther(wei));
    } catch {
      return 0;
    }
  }

  // ✅ Buy spins với FHE và ABI chuẩn
  async buySpins(amount: number, ethValue: string) {
    try {
      const encrypted = await this.createBuySpinsInput(amount);

      const tx = await this.contract.buySpins(encrypted.handles[0], encrypted.inputProof, {
        value: ethers.parseEther(ethValue),
      });

      const receipt = await tx.wait();

      return receipt;
    } catch (error) {
      console.error("❌ Error buying spins:", error);
      throw error;
    }
  }

  // ✅ Spin với FHE và decrypt result - TỐI ƯU
  async spin(): Promise<string> {
    try {
      // TỐI ƯU: Bỏ gas estimation để tăng tốc
      const overrides: any = {
        gasLimit: 1_500_000n,
        maxFeePerGas: ethers.parseUnits("30", "gwei"),
        maxPriorityFeePerGas: ethers.parseUnits("1", "gwei"),
      };

      // Quay kiểu 2 bước: spinLite → settlePrize (giảm HCU, ổn định hơn)
      const tx = await (this.contract as any).spinLite(overrides);

      // TỐI ƯU: Chỉ dùng receipt parsing để tăng tốc
      const user = await this.signer.getAddress();
      const receipt = await tx.wait();

      // Parse result từ receipt
      const topic = ethers.id(SPIN_OUTCOME_SIG);
      const log = receipt.logs.find((l: any) => l.topics?.[0] === topic);
      if (log) {
        const decoded = this.contract.interface.parseLog(log);
        const slot = Number(decoded?.args?.slot || 0);
        const gmDelta = Number(decoded?.args?.gmDelta || 0);
        return JSON.stringify({ slotIndex: slot, gmDelta });
      }
      return "";
    } catch (error) {
      console.error("❌ Error in FHE spin:", error);
      try {
        const anyErr: any = error as any;
        const r = anyErr?.receipt;
        if (r && r.status === 0 && (!Array.isArray(r.logs) || r.logs.length === 0)) {
          const enriched = new Error("HCU_LIMIT_EXCEEDED: FHE operation budget exceeded. Please wait and retry.");
          (enriched as any).code = "HCU_LIMIT";
          throw enriched;
        }
      } catch {}
      throw error;
    }
  }

  // ✅ Buy spins using GM (10 GM per spin) by calling contract N times
  async buySpinWithGm(spins: number): Promise<void> {
    if (spins <= 0) return;
    const fn = (this.contract as any).buySpinWithGmBatch || (this.contract as any).buySpinWithGm;
    const arg = (this.contract as any).buySpinWithGmBatch ? [spins] : [];
    const tx = await fn.apply(this.contract, [...arg, { gasLimit: 1_200_000 }]);

    await tx.wait();
  }

  // ===== Claim ETH via attestation (strict FHE) =====
  async claimPendingEth(desiredEth?: string): Promise<void> {
    const user = await this.signer.getAddress();
    const pendingCt = await (this.contract as any).getEncryptedPendingEthWei(user);
    if (!pendingCt || typeof pendingCt !== "string" || !pendingCt.startsWith("0x")) {
      throw new Error("No pending ETH ciphertext");
    }
    const pendingWei = await this.decryptEuint64(pendingCt);
    if (pendingWei <= 0n) throw new Error("No pending ETH to claim");

    // Determine claim amount
    let claimWei: bigint = pendingWei;
    if (desiredEth && desiredEth.trim() !== "") {
      const desiredWei = ethers.parseEther(desiredEth.trim());
      if (desiredWei <= 0n) throw new Error("Claim amount must be > 0");
      if (desiredWei > pendingWei) throw new Error("Amount exceeds pending ETH");
      claimWei = desiredWei;
    }

    // KMS Callback: request claim and wait for callback
    const tx = await (this.contract as any).requestClaimETH(claimWei);
    await tx.wait();
  }

  // ✅ Map reward amount to slot result
  static mapRewardToSlot(reward: number): string {
    const slotMapping: Record<number | string, string> = {
      0: "Miss",
      50: "Bronze",
      100: "Silver",
      200: "Gold",
      0.01: "Try Again",
      0.001: "Micro GM",
    };

    return slotMapping[reward] || "Unknown";
  }

  // ✅ Refresh user data với FHE
  async refreshUserData(
    address: string,
  ): Promise<{ spins: number; pendingEth: number; gm: number; lastError?: number; lastErrorAt?: number }> {
    try {
      // Use bundle getter to reduce roundtrips and decrypt in one go when possible
      let spins = 0;
      let gm = 0;
      let pendingEth = 0;
      try {
        const bundle = await (this.contract as any).getEncryptedUserBundle(address);
        const ctSpins = bundle?.spins || bundle?.[0];
        const ctGm = bundle?.gm || bundle?.[1];
        const ctPending = bundle?.pendingEthWei || bundle?.[2];
        const dec = await Promise.all([
          this.decryptEuint64(String(ctSpins || "0x")),
          this.decryptEuint64(String(ctGm || "0x")),
          this.decryptEuint64(String(ctPending || "0x")),
        ]);
        spins = Number(dec[0] || 0);
        gm = Number(dec[1] || 0);
        pendingEth = Number(ethers.formatEther(dec[2] || 0n));
      } catch {
        // Fallback to separate decrypts
        const [s, g, p] = await Promise.all([
          this.decryptUserSpins(address),
          this.decryptUserGm(address),
          this.decryptPendingEth(address),
        ]);
        spins = s;
        gm = g;
        pendingEth = p;
      }

      // Try read last encrypted error (optional)
      let lastError: number | undefined;
      let lastErrorAt: number | undefined;
      try {
        const res = await (this.contract as any).getLastError(address);
        const encCode: string = res?.[0];
        const ts: bigint = res?.[1];
        if (encCode && typeof encCode === "string" && encCode.startsWith("0x")) {
          const code = await this.decryptEuint64(encCode);
          lastError = Number(code);
        }
        if (typeof ts !== "undefined") lastErrorAt = Number(ts?.toString?.() || 0);
      } catch {}

      return { spins, pendingEth, gm, lastError, lastErrorAt } as any;
    } catch (error) {
      throw error;
    }
  }

  // ✅ Public decryption for published scores
  async publicDecryptScores(handles: string[]): Promise<Record<string, bigint>> {
    try {
      if (!this.sdk) {
        console.error("❌ SDK not available for public decryption");
        return {};
      }

      // console.log("🔐 Attempting public decryption for", handles.length, "handles");
      // console.log("🔍 DEBUG: SDK structure:", this.sdk);
      // console.log("🔍 DEBUG: SDK methods:", Object.keys(this.sdk || {}));

      // Filter out invalid handles
      const validHandles = handles.filter(
        (handle) =>
          handle &&
          typeof handle === "string" &&
          handle.startsWith("0x") &&
          handle !== "0x0000000000000000000000000000000000000000000000000000000000000000",
      );

      if (validHandles.length === 0) {
        // console.log("🔐 No valid handles to decrypt");
        return {};
      }

      // console.log("🔐 Valid handles for public decryption:", validHandles);

      // Try multiple approaches to find publicDecrypt
      const approaches = [
        // Approach 1: Direct sdk.publicDecrypt
        () => this.sdk.publicDecrypt,
        // Approach 2: sdk.instance.publicDecrypt
        () => this.sdk.instance?.publicDecrypt,
        // Approach 3: sdk.relayer.publicDecrypt
        () => this.sdk.relayer?.publicDecrypt,
        // Approach 4: sdk.decrypt.publicDecrypt
        () => this.sdk.decrypt?.publicDecrypt,
        // Approach 5: Check if sdk is the instance itself
        () => this.sdk,
      ];

      for (let i = 0; i < approaches.length; i++) {
        try {
          const publicDecryptFn = approaches[i]();
          // console.log(`🔍 Trying approach ${i + 1}:`, typeof publicDecryptFn);

          if (publicDecryptFn && typeof publicDecryptFn.publicDecrypt === "function") {
            // console.log(`🔐 Using approach ${i + 1} for public decryption`);
            const result = await publicDecryptFn.publicDecrypt(validHandles);
            // console.log("🔐 Public decryption result:", result);

            // Convert result to bigint format
            const bigintResult: Record<string, bigint> = {};
            for (const handle of validHandles) {
              const value = result?.[handle];
              if (typeof value === "bigint") {
                bigintResult[handle] = value;
              } else if (typeof value === "number") {
                bigintResult[handle] = BigInt(value);
              } else if (typeof value === "string" && /^\d+$/.test(value)) {
                bigintResult[handle] = BigInt(value);
              } else {
                bigintResult[handle] = 0n;
              }
            }

            return bigintResult;
          }
        } catch (error: any) {
          // console.log(`❌ Approach ${i + 1} failed:`, error.message);
        }
      }

      console.error("❌ All public decryption approaches failed");
      return {};
    } catch (error: any) {
      console.error("❌ Error in publicDecryptScores:", error);
      return {};
    }
  }

  // ✅ Public decryption using HTTP endpoint (alternative approach)
  async publicDecryptViaHTTP(handles: string[]): Promise<Record<string, bigint>> {
    try {
      // console.log("🌐 Attempting public decryption via HTTP endpoint");

      // Filter out invalid handles
      const validHandles = handles.filter(
        (handle) =>
          handle &&
          typeof handle === "string" &&
          handle.startsWith("0x") &&
          handle !== "0x0000000000000000000000000000000000000000000000000000000000000000",
      );

      if (validHandles.length === 0) {
        // console.log("🌐 No valid handles for HTTP public decryption");
        return {};
      }

      // console.log("🌐 Valid handles for HTTP public decryption:", validHandles);

      // Use Relayer HTTP endpoint for public decryption via proxy
      const relayerUrl = CONFIG.RELAYER.URL;
      const response = await fetch(`${relayerUrl}/public-decrypt`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          handles: validHandles,
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();
      // console.log("🌐 HTTP public decryption result:", result);

      // Convert result to bigint format
      const bigintResult: Record<string, bigint> = {};
      for (const handle of validHandles) {
        const value = result?.[handle];
        if (typeof value === "bigint") {
          bigintResult[handle] = value;
        } else if (typeof value === "number") {
          bigintResult[handle] = BigInt(value);
        } else if (typeof value === "string" && /^\d+$/.test(value)) {
          bigintResult[handle] = BigInt(value);
        } else {
          bigintResult[handle] = 0n;
        }
      }

      return bigintResult;
    } catch (error: any) {
      console.error("❌ HTTP public decryption failed:", error);
      return {};
    }
  }
}

// ✅ Export singleton instance
export let fheUtils: FheUtils | null = null;

export const initializeFheUtils = (sdk: any, provider: ethers.BrowserProvider, signer: ethers.Signer) => {
  try {
    // Initialize singleton without logging
    fheUtils = new FheUtils(sdk, provider, signer);

    return fheUtils;
  } catch (error) {
    throw error;
  }
};

// Keypair management functions
export const exportKeypair = (): string => {
  const pub = localStorage.getItem("fhe:keypair:pub");
  const priv = localStorage.getItem("fhe:keypair:priv");

  if (!pub || !priv) {
    throw new Error("No keypair found to export");
  }

  const keypair = { publicKey: pub, privateKey: priv };
  return JSON.stringify(keypair, null, 2);
};

export const importKeypair = (keypairJson: string): boolean => {
  try {
    const keypair = JSON.parse(keypairJson);

    if (!keypair.publicKey || !keypair.privateKey) {
      throw new Error("Invalid keypair format");
    }

    localStorage.setItem("fhe:keypair:pub", keypair.publicKey);
    localStorage.setItem("fhe:keypair:priv", keypair.privateKey);

    // Clear UDSIG when importing new keypair
    clearUserDecryptAuth();

    return true;
  } catch (error) {
    return false;
  }
};

export const clearUserDecryptAuth = (): void => {
  localStorage.removeItem("fhe:udsig");
  localStorage.removeItem("fhe:udsig:timestamp");
};

export const hasKeypair = (): boolean => {
  const pub = localStorage.getItem("fhe:keypair:pub");
  const priv = localStorage.getItem("fhe:keypair:priv");
  return !!(pub && priv);
};

export const clearKeypair = (): void => {
  localStorage.removeItem("fhe:keypair:pub");
  localStorage.removeItem("fhe:keypair:priv");
  clearUserDecryptAuth();
};

// ✅ Fix 2: Thêm "cổng" gọi relayer (queue + backoff)
let lastCall = 0;

async function withRelayerGate<T>(fn: () => Promise<T>): Promise<T> {
  // giãn cách tối thiểu giữa 2 lần gọi
  const now = Date.now();
  const delta = now - lastCall;
  const MIN_SPACING_MS = 3000; // Tăng lên 3 giây
  if (delta < MIN_SPACING_MS) {
    await new Promise((r) => setTimeout(r, MIN_SPACING_MS - delta));
  }

  // retry với backoff khi 429
  let attempt = 0;
  const MAX_RETRY = 3;
  while (true) {
    try {
      const res = await fn();
      lastCall = Date.now();
      return res;
    } catch (e: any) {
      const is429 = e?.status === 429 || /429|Too Many Requests|rate limit/i.test(String(e?.message || e));
      attempt++;
      if (!is429 || attempt > MAX_RETRY) throw e;
      const backoff = 1000 * Math.pow(2, attempt - 1); // 1s, 2s, 4s
      // Removed debug log for retry attempt
      await new Promise((r) => setTimeout(r, backoff));
    }
  }
}
