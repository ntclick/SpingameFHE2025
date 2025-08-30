import { useCallback, useRef, useState } from "react";
import { fheUtils } from "../utils/fheUtils";

// ✅ Hook để cache kết quả decrypt và tránh gọi lại
export function useDecryptCache() {
  const [cache, setCache] = useState<Record<string, bigint>>({});
  const [loading, setLoading] = useState<Record<string, boolean>>({});
  const loadingPromises = useRef<Record<string, Promise<bigint>>>({});

  // ✅ Decrypt với cache - tránh gọi lại cùng handle
  const decryptWithCache = useCallback(
    async (handle: string): Promise<bigint> => {
      try {
        if (!handle || typeof handle !== "string" || !handle.startsWith("0x")) {
          return 0n;
        }

        // ✅ Check cache trước
        if (cache[handle]) {
          console.log("✅ Using cached decrypt for:", handle.substring(0, 20) + "...");
          return cache[handle];
        }

        // ✅ Check if already loading or promise exists
        if (loading[handle] || loadingPromises.current[handle] !== undefined) {
          console.log("⏳ Decrypt already in progress for:", handle.substring(0, 20) + "...");
          return loadingPromises.current[handle] !== undefined ? loadingPromises.current[handle]! : 0n;
        }

        // ✅ Start new decrypt
        setLoading((prev) => ({ ...prev, [handle]: true }));

        const decryptPromise = (async () => {
          try {
            if (!fheUtils) return 0n;

            const result = await fheUtils.decryptEuint64(handle);
            const bigintResult = typeof result === "bigint" ? result : BigInt(result || 0);

            // ✅ Cache kết quả
            setCache((prev) => ({ ...prev, [handle]: bigintResult }));
            console.log("✅ Cached new decrypt result for:", handle.substring(0, 20) + "...");

            return bigintResult;
          } catch (error) {
            console.error("❌ Decrypt failed for:", handle.substring(0, 20) + "...", error);
            return 0n;
          } finally {
            setLoading((prev) => ({ ...prev, [handle]: false }));
            delete loadingPromises.current[handle];
          }
        })();

        loadingPromises.current[handle] = decryptPromise;
        return decryptPromise;
      } catch (error) {
        console.error("❌ decryptWithCache error:", error);
        return 0n;
      }
    },
    [cache, loading],
  );

  // ✅ Batch decrypt với cache
  const batchDecryptWithCache = useCallback(
    async (handles: string[]): Promise<Record<string, bigint>> => {
      try {
        if (!fheUtils || !handles.length) return {};

        // ✅ Filter out cached handles
        const uncachedHandles = handles.filter((handle) => !cache[handle]);
        const cachedResults: Record<string, bigint> = {};

        // ✅ Get cached results
        handles.forEach((handle) => {
          if (cache[handle]) {
            cachedResults[handle] = cache[handle];
          }
        });

        // ✅ If all cached, return immediately
        if (uncachedHandles.length === 0) {
          console.log("✅ All handles cached, returning immediately");
          return cachedResults;
        }

        // ✅ Batch decrypt uncached handles
        console.log("🔄 Batch decrypting", uncachedHandles.length, "uncached handles...");

        const contractAddress = fheUtils.contract.target as string;
        const handleContractPairs = uncachedHandles.map((handle) => ({
          handle,
          contractAddress,
        }));

        try {
          const batchResults = await fheUtils.decryptMultipleValues(handleContractPairs);

          // ✅ Cache batch results
          setCache((prev) => ({ ...prev, ...batchResults }));

          // ✅ Combine cached and batch results
          const allResults = { ...cachedResults, ...batchResults };
          console.log("✅ Batch decrypt completed, cached", Object.keys(batchResults).length, "results");

          return allResults;
        } catch (error) {
          console.warn("⚠️ Batch decrypt failed, falling back to individual:", error);

          // ✅ Fallback to individual decrypt
          const individualResults: Record<string, bigint> = { ...cachedResults };

          for (const handle of uncachedHandles) {
            try {
              const result = await decryptWithCache(handle);
              individualResults[handle] = result;
            } catch (e) {
              console.warn("⚠️ Individual decrypt failed for:", handle.substring(0, 20) + "...");
              individualResults[handle] = 0n;
            }
          }

          return individualResults;
        }
      } catch (error) {
        console.error("❌ batchDecryptWithCache error:", error);
        return {};
      }
    },
    [cache, decryptWithCache],
  );

  // ✅ Clear cache
  const clearCache = useCallback(() => {
    setCache({});
    setLoading({});
    loadingPromises.current = {};
    console.log("🧹 Decrypt cache cleared");
  }, []);

  // ✅ Clear specific handle from cache
  const clearHandle = useCallback((handle: string) => {
    setCache((prev) => {
      const newCache = { ...prev };
      delete newCache[handle];
      return newCache;
    });
    setLoading((prev) => {
      const newLoading = { ...prev };
      delete newLoading[handle];
      return newLoading;
    });
    delete loadingPromises.current[handle];
    console.log("🧹 Cleared handle from cache:", handle.substring(0, 20) + "...");
  }, []);

  return {
    decryptWithCache,
    batchDecryptWithCache,
    clearCache,
    clearHandle,
    cache,
    loading,
    cacheSize: Object.keys(cache).length,
  };
}
