import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ethers } from "ethers";
import { CONFIG } from "../config";
// Strict FHE mode: disable all API/event fallbacks and persistent cache across reloads
import { fheUtils, FheUtils } from "../utils/fheUtils";

export type UserGameState = {
  spins: number;
  gm: number;
  pendingEth: number; // in ETH
  lastSlot: number | null;
  score: number;
  version: number;
};

export type EncryptedHandles = {
  spinsEnc: string;
  gmEnc: string;
  pendingEnc: string;
  scoreEnc: string;
};

const ZERO32 = "0x" + "0".repeat(64);

export default function useUserGameState(account: string | null | undefined, enabled: boolean) {
  const ALWAYS_STRICT = CONFIG.STRICT_FHE_ONLY;
  const udsigRequestedRef = useRef<boolean>(false);
  const relayerCooldownUntilRef = useRef<number>(0);
  const lastDecryptedVersionRef = useRef<number>(0);
  const debounceTimerRef = useRef<any>(null);
  const [data, setData] = useState<UserGameState | null>(null);
  const [encryptedHandles, setEncryptedHandles] = useState<EncryptedHandles | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>("");
  const currentVersionRef = useRef<number>(0);
  const lastReloadAtRef = useRef<number>(0);
  const inFlightRef = useRef<Promise<UserGameState | null> | null>(null);
  const usingFallbackRef = useRef<boolean>(false);
  const [usingFallback, setUsingFallback] = useState<boolean>(false);

  // ✅ Fix 1: Chặn double run do React.StrictMode
  const didInitRef = useRef<boolean>(false);

  // ✅ GIẢI PHÁP 1: Cache kết quả decrypt để tránh gọi lại
  const [decryptedCache, setDecryptedCache] = useState<Record<string, bigint>>({});

  // ✅ GIẢI PHÁP 2: Throttling cho auto-refresh - tăng lên 30s thay vì spam
  const MIN_RELOAD_INTERVAL_MS = 30000; // Tăng từ 10s lên 30s
  const CACHE_TTL_MS = 120_000; // 2 phút cache

  // ✅ Thêm throttle cho decrypt calls
  const lastDecryptCallRef = useRef<number>(0);
  const DECRYPT_COOLDOWN_MS = 5000; // 5 giây cooldown

  const keys = useMemo(() => {
    const addr = (account || "").toLowerCase();
    const contract = (CONFIG.FHEVM_CONTRACT_ADDRESS || "").toLowerCase();
    const base = `gmspin:bundle:${contract}:${addr}`;
    return {
      base,
      spins: `${base}:spins`,
      gm: `${base}:gm`,
      pendingEth: `${base}:pendingEth`,
      lastSlot: `${base}:lastSlot`,
      score: `${base}:score`,
      version: `${base}:version`,
      displaySpins: `${base}:display:spins`,
      displayGm: `${base}:display:gm`,
      displayPending: `${base}:display:pendingEth`,
      sessionLoaded: `${base}:sessionLoaded`,
    } as const;
  }, [account]);

  const loadFromCache = useCallback((): UserGameState | null => {
    // ❌ DISABLE CACHE FOR CRYPTO SECURITY
    // Cache local không an toàn cho dự án crypto/FHE
    return null;
  }, [keys]);

  const saveToCache = useCallback(
    (bundle: UserGameState) => {
      // ❌ DISABLE CACHE FOR CRYPTO SECURITY
      // Không lưu FHE data vào localStorage
      return;
    },
    [keys],
  );

  // ✅ GIẢI PHÁP 3: Cache decrypt result để tránh gọi lại cùng handle
  const getDecrypted = useCallback(
    async (handle: string): Promise<bigint> => {
      try {
        if (!handle || typeof handle !== "string" || !handle.startsWith("0x") || handle === ZERO32) return 0n;
        if (!fheUtils) return 0n;

        // ✅ Check cache trước
        if (decryptedCache[handle]) {
          return decryptedCache[handle];
        }

        // ✅ Check cache trước (đã có ở trên rồi)
        // Không cần check cooldown nữa vì đã có retry logic trong decryptEuint64

        const v = await fheUtils.decryptEuint64(handle);
        const result = typeof v === "bigint" ? v : BigInt(v || 0);

        // ✅ Cache kết quả
        setDecryptedCache((prev) => ({ ...prev, [handle]: result }));

        return result;
      } catch (error) {
        return 0n;
      }
    },
    [decryptedCache, fheUtils],
  );

  const globalFetchCache = useRef<Map<string, { data: UserGameState; timestamp: number }>>(new Map());
  const globalFetchPromise = useRef<Promise<UserGameState | null> | null>(null);

  const fetchBundle = useCallback(async (): Promise<UserGameState | null> => {
    if (!enabled || !account || !fheUtils) {
      return null;
    }

    // ✅ Fix 4: Global cache check
    const cacheKey = `${account}-${currentVersionRef.current}`;
    const cached = globalFetchCache.current.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < 30000) {
      // 30 giây cache
      return cached.data;
    }

    // ✅ Fix 4: Single-flight protection
    if (globalFetchPromise.current) {
      return globalFetchPromise.current;
    }

    // ✅ Tạo global promise mới
    globalFetchPromise.current = (async () => {
      try {
        // console.log("🔄 Fetching user data from blockchain for account:", account);
        const c: any = fheUtils.contract;

        // Load tất cả encrypted data cùng lúc
        const [versionBn, spinsEnc, gmEnc, pendingEnc, scoreEnc] = await Promise.all([
          c?.stateVersion?.(account) || 0n,
          c?.getUserSpins?.(account) || "0x" + "0".repeat(64),
          c?.getUserGmBalance?.(account) || "0x" + "0".repeat(64),
          c?.getEncryptedPendingEthWei?.(account) || "0x" + "0".repeat(64),
          c?.getEncryptedScore?.(account) || "0x" + "0".repeat(64),
        ]);

        // console.log("📊 Raw blockchain data:", {
        //   version: versionBn?.toString(),
        //   spinsEnc: spinsEnc?.substring(0, 10) + "...",
        //   gmEnc: gmEnc?.substring(0, 10) + "...",
        //   pendingEnc: pendingEnc?.substring(0, 10) + "...",
        //   scoreEnc: scoreEnc?.substring(0, 10) + "...",
        // });

        // ✅ Store encrypted handles for publishScore
        const handles: EncryptedHandles = {
          spinsEnc,
          gmEnc,
          pendingEnc,
          scoreEnc,
        };
        setEncryptedHandles(handles);

        const version = Number(versionBn?.toString?.() || 0);

        // ✅ CHỈ GỌI BATCH DECRYPT 1 LẦN - KHÔNG FALLBACK
        const contractAddress = c.target as string;
        const handleContractPairs = [
          { handle: spinsEnc, contractAddress },
          { handle: gmEnc, contractAddress },
          { handle: pendingEnc, contractAddress },
          { handle: scoreEnc, contractAddress },
        ];

        let decryptedValues: Record<string, bigint> = {};
        try {
          // console.log("🔐 Starting batch decryption for", handleContractPairs.length, "values");
          decryptedValues = await fheUtils.decryptMultipleValues(handleContractPairs);
          // console.log("✅ Batch decryption completed:", decryptedValues);

          // Cache kết quả
          setDecryptedCache((prev) => ({ ...prev, ...decryptedValues }));
        } catch (e) {
          console.warn("⚠️ Batch decrypt failed, returning zeros:", e);
          // Nếu batch fail, return zeros thay vì fallback individual
          const result = {
            spins: 0,
            gm: 0,
            pendingEth: 0,
            lastSlot: null,
            score: 0,
            version,
          };

          // ✅ Cache kết quả zeros
          globalFetchCache.current.set(cacheKey, { data: result, timestamp: Date.now() });
          return result;
        }

        // Sử dụng kết quả batch
        const spinsB = decryptedValues[spinsEnc] || 0n;
        const gmB = decryptedValues[gmEnc] || 0n;
        const pendingWeiB = decryptedValues[pendingEnc] || 0n;
        const scoreB = decryptedValues[scoreEnc] || 0n;

        const result: UserGameState = {
          spins: Number(spinsB || 0n),
          gm: Number(gmB || 0n),
          pendingEth: Number(ethers.formatEther(pendingWeiB || 0n)),
          lastSlot: null,
          score: Number(scoreB || 0n),
          version,
        };

        // console.log("✅ Final user data result:", result);

        // ✅ Cache kết quả thành công
        globalFetchCache.current.set(cacheKey, { data: result, timestamp: Date.now() });
        return result;
      } catch (error: any) {
        throw error;
      } finally {
        // ✅ Reset global promise
        globalFetchPromise.current = null;
      }
    })();

    return globalFetchPromise.current;
  }, [enabled, account, fheUtils]);

  const reload = useCallback(
    async (force = false, skipThrottle = false): Promise<UserGameState | null> => {
      if (!enabled || !account) return null;

      // ✅ SỬA: Nếu force=true hoặc skipThrottle=true, bỏ qua throttle hoàn toàn
      if (force || skipThrottle) {
        // console.log("🔄 Force reload requested, bypassing throttle");
      } else {
        // ✅ GIẢI PHÁP 5: Throttle để tránh spam - chỉ reload mỗi 30s
        const now = Date.now();
        if (now - lastReloadAtRef.current < MIN_RELOAD_INTERVAL_MS) {
          // console.log(
          //   "⏳ Skipping reload due to throttle (last reload was",
          //   Math.round((now - lastReloadAtRef.current) / 1000),
          //   "seconds ago)",
          // );
          return data;
        }
      }

      if (inFlightRef.current) return inFlightRef.current;
      setLoading(true);
      const p = (async () => {
        try {
          // console.log("🔄 Starting user data reload...");

          // ❌ DISABLE CACHE FOR CRYPTO SECURITY
          // Luôn load từ onchain, không check cache

          const bundle = await fetchBundle();
          if (bundle) {
            // console.log("✅ User data reload completed:", bundle);
            currentVersionRef.current = bundle.version;
            setData(bundle);
            setUsingFallback(usingFallbackRef.current);
            return bundle;
          }
          // console.log("❌ User data reload returned null");
          return null;
        } catch (error) {
          console.error("❌ User data reload failed:", error);
          throw error;
        } finally {
          lastReloadAtRef.current = Date.now();
          inFlightRef.current = null;
          setLoading(false);
          // console.log("🔄 User data reload finished");
        }
      })();
      inFlightRef.current = p;
      return p;
    },
    [enabled, account, data, fetchBundle, MIN_RELOAD_INTERVAL_MS],
  );

  // ✅ AUTO LOAD: Tự động load data khi enabled và account thay đổi
  useEffect(() => {
    if (!enabled || !account) return;

    // console.log("🔄 useUserGameState: Auto-loading data for account:", account);

    // ✅ Tự động load data khi component mount hoặc account thay đổi
    reload(false, false).catch((error) => {
      console.error("❌ Auto-load failed:", error);
    });
  }, [enabled, account, reload]);

  // ✅ REMOVED: Không tự động reload khi có UserStateChanged event
  // Chỉ App.tsx sẽ gọi reload() khi có giao dịch thành công
  useEffect(() => {
    const c = fheUtils?.contract as any;
    if (!enabled || !account || !c) return;

    const handler = (user: string, versionBn: any) => {
      try {
        if (user?.toLowerCase?.() !== account.toLowerCase()) return;
        const v = Number(versionBn?.toString?.() || 0);
        if (v !== currentVersionRef.current) {
          // ✅ Chỉ log, không tự động reload
          // console.log("📢 UserStateChanged detected, but not auto-reloading (controlled by App.tsx)");
        }
      } catch {}
    };

    try {
      c.on("UserStateChanged", handler);
    } catch {}

    return () => {
      try {
        c.off("UserStateChanged", handler);
      } catch {}
    };
  }, [enabled, account]);

  return {
    data,
    encryptedHandles,
    loading,
    error,
    version: data?.version || 0,
    reload,
    usingFallback,
  } as const;
}
