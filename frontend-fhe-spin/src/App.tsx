import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ethers } from "ethers";
import "./App.css";
import { SpinWheel } from "./components/SpinWheel";
import { Toast } from "./components/Toast";
import NetworkWarning from "./components/NetworkWarning";
import TypingButton from "./components/TypingButton";
import "./components/NetworkWarning.css";
import "./components/TypingButton.css";
import useToast from "./hooks/useToast";
import { CONFIG, WHEEL_SLOTS, SLOT_TO_DISPLAY_INDEX } from "./config";
import useFheSdk from "./hooks/useFheSdk";
import useUserGameState from "./hooks/useUserGameState";
import { initializeFheUtils, fheUtils } from "./utils/fheUtils";
import { useNetworkCheck, switchToSepolia } from "./utils/networkUtils";
import PendingTransaction from "./components/PendingTransaction";
import { usePendingTransaction } from "./hooks/usePendingTransaction";

type TxState = "idle" | "pending" | "success" | "error";

const App: React.FC = () => {
  const { sdk, isReady, setSignerAndProvider } = useFheSdk();

  const [provider, setProvider] = useState<ethers.BrowserProvider | null>(null);
  const [signer, setSigner] = useState<ethers.Signer | null>(null);
  const [account, setAccount] = useState<string>("");
  const [connected, setConnected] = useState(false);

  const [availableSpins, setAvailableSpins] = useState<number>(0);
  // Optional: track decrypted spins from chain (informational)
  // note: removed unused on-chain spins state to keep lints clean
  const [gmBalance, setGmBalance] = useState<number>(0);
  const [ethWalletBalance, setEthWalletBalance] = useState<number>(0);
  const [ethBalance, setEthBalance] = useState<number>(0); // pending ETH (decrypted)
  const [claimAmount, setClaimAmount] = useState<string>("");
  const [publishedScore, setPublishedScore] = useState<number>(0);
  const [lastSlot, setLastSlot] = useState<number | null>(null);
  const [leaderboard, setLeaderboard] = useState<{ address: string; score: number; isDecrypted?: boolean }[]>([]);
  const [canCheckin, setCanCheckin] = useState<boolean>(false);
  const [isCheckinLoading, setIsCheckinLoading] = useState<boolean>(true);
  const [nextResetUtc, setNextResetUtc] = useState<string>("");
  const [checkinCountdown, setCheckinCountdown] = useState<string>("");

  const [isSpinning, setIsSpinning] = useState(false);
  const [spinResult, setSpinResult] = useState<string>("Buy spins to start playing!");
  const [spinMessage, setSpinMessage] = useState<string>("Purchase spins with GM Tokens to begin");
  const [showRecentSpin, setShowRecentSpin] = useState<boolean>(false);
  const [txStatus, setTxStatus] = useState<TxState>("idle");
  const [errorMessage, setErrorMessage] = useState<string>("");
  const [targetSlotIndex, setTargetSlotIndex] = useState<number | null>(null);
  // Store parsed on-chain spin outcome until wheel animation completes
  const pendingResultRef = useRef<{ slot: number; gmDelta: number } | null>(null);
  // Ensure we only request UDSIG once per session
  const udsigRequestedRef = useRef<boolean>(false);
  // Ensure trial spin is only attempted once per device/account
  const trialGrantedRef = useRef<boolean>(false);

  // Removed debug logging for isSpinning state changes

  // Toasts must be declared once (here) before callbacks use push/update/remove
  const { toasts, push, update, remove } = useToast();

  // Pending transaction hook
  const { pendingState, showPending, showSuccess, showError, hidePending, updateHash } = usePendingTransaction();

  // Network check hook
  const { isCorrectNetwork, currentNetwork, isChecking, checkNetwork } = useNetworkCheck(provider);

  // header tools removed; keep codebase minimal for performance

  // header tools removed

  // header tools removed

  const repairPrivateState = useCallback(async () => {
    try {
      requireReady();

      // Try checkIn() when available (Simple contract)
      try {
        if (typeof (fheUtils as any)?.contract?.checkIn === "function") {
          const tx = await (fheUtils as any).contract.checkIn();
          await tx.wait();
          push("success", "✅ Check-in completed successfully!", 10000);
          return;
        }
      } catch (e: any) {}

      // Fallback to buying 1 spin (more expensive but guaranteed to work)
      try {
        const tx = await (fheUtils as any).buySpinWithGm(1);
        await tx.wait();
        push("success", "✅ Bought 1 spin to repair state successfully!", 10000);
      } catch (e: any) {
        throw new Error("Both repair methods failed. Please try manual check-in or buy spins.");
      }
    } catch (error) {
      throw error;
    }
  }, [push]);

  const [buyEthAmount, setBuyEthAmount] = useState<string>("0.01");
  const [isBuySpinsOpen, setIsBuySpinsOpen] = useState(false);
  const [spinsAmount, setSpinsAmount] = useState<number>(1);
  const [isBuyingSpins, setIsBuyingSpins] = useState<boolean>(false);
  // Loading flags for on-chain data groups
  const [spinsLoading, setSpinsLoading] = useState<boolean>(true);
  const [gmLoading, setGmLoading] = useState<boolean>(true);
  const [pendingEthLoading, setPendingEthLoading] = useState<boolean>(true);
  const [scoreLoading, setScoreLoading] = useState<boolean>(true);
  // Cache last FHE decrypted spins (informational only)
  const [lastSpinsFhe, setLastSpinsFhe] = useState<number>(0); // eslint-disable-line @typescript-eslint/no-unused-vars
  // Cache helpers removed in unified bundle mode

  // Network warning state
  const [showNetworkWarning, setShowNetworkWarning] = useState<boolean>(false);

  // const pricePerSpinEth = useMemo(() => CONFIG.SPIN.PRICE_PER_SPIN || 0.01, []);
  const maxSpinsAvailable = useMemo(() => Math.floor((gmBalance || 0) / 10), [gmBalance]);

  // Persist optimistic values per user+contract to survive reloads
  // storagePrefix removed in strict on-chain mode

  // Persisted getters removed in strict on-chain mode

  // Persisted setters removed in strict on-chain mode

  const requireReady = useCallback(() => {
    // TỐI ƯU: Chỉ check điều kiện tối thiểu để tăng tốc
    if (!connected || !account) throw new Error("Wallet not connected");
    if (!fheUtils) throw new Error("FHE Utils not initialized");
    if (!isCorrectNetwork) throw new Error("Please switch to Sepolia network");
    // TỐI ƯU: Bỏ sdk/isReady check để tăng tốc response
  }, [connected, account, fheUtils, isCorrectNetwork]);

  // Unified FHE bundle state (load once/session, decrypt all fields together, refresh on stateVersion)
  const {
    data: userData,
    encryptedHandles,
    loading: userDataLoading,
    error: userDataError,
    reload: reloadUserState,
    usingFallback,
  } = useUserGameState(account, connected && !!fheUtils);

  // removed duplicate UDSIG request effect to avoid relayer spam

  // Reflect unified data into existing UI states (and loading flags)
  useEffect(() => {
    if (!userDataLoading) {
      setSpinsLoading(false);
      setGmLoading(false);
      setPendingEthLoading(false);
      setScoreLoading(false);
    } else {
      setSpinsLoading(true);
      setGmLoading(true);
      setPendingEthLoading(true);
      setScoreLoading(true);
    }
  }, [userDataLoading]);

  // Detect if contract supports KMS request/callback claim flow
  const hasKmsRequest = useMemo(() => {
    try {
      const c: any = (fheUtils as any)?.contract;
      return typeof c?.requestPendingEthDecryption === "function" || typeof c?.requestClaimDecryption === "function";
    } catch {
      return false;
    }
  }, [fheUtils]);

  useEffect(() => {
    if (!userData) return;
    setAvailableSpins(userData.spins || 0);
    setLastSpinsFhe(userData.spins || 0);
    setGmBalance(userData.gm || 0);
    setEthBalance(userData.pendingEth || 0);
    setLastSlot(userData.lastSlot == null ? null : Number(userData.lastSlot));
    setPublishedScore(userData.score || 0);
  }, [userData]);

  // Tối ưu: Kết nối ví nhanh hơn
  const connectWallet = useCallback(async () => {
    try {
      if (!window.ethereum) {
        push("error", "MetaMask not found. Please install MetaMask.", 4000);
        return;
      }

      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const address = await signer.getAddress();

      setProvider(provider);
      setSigner(signer);
      setAccount(address);
      setConnected(true);

      // Tối ưu: Set SDK ngay lập tức để không chờ
      setSignerAndProvider(provider, signer);

      // Tối ưu: Load balance song song với SDK init
      Promise.all([
        provider.getBalance(address).then((balance) => setEthWalletBalance(Number(ethers.formatEther(balance)))),
        // Load user data sau khi SDK ready - TỐI ƯU: Giảm delay
        new Promise((resolve) => {
          const checkSDK = () => {
            if (isReady) {
              reloadUserState(true, true);
              resolve(true);
            } else {
              setTimeout(checkSDK, 50); // Giảm từ 100ms xuống 50ms
            }
          };
          checkSDK();
        }),
      ]).catch((e) => {
        console.error("🟥 connectWallet: post-init error", e);
      });
    } catch (error: any) {
      console.error("Wallet connection error:", error);
      push("error", error?.message || "Failed to connect wallet", 4000);
    }
  }, [push, setSignerAndProvider, isReady, reloadUserState]);

  // Handle network switching
  const handleSwitchNetwork = useCallback(async () => {
    try {
      const success = await switchToSepolia();
      if (success) {
        setShowNetworkWarning(false);
        push("success", "✅ Successfully switched to Sepolia network", 10000);
        // Reload page to refresh all states
        setTimeout(() => {
          window.location.reload();
        }, 1000);
      } else {
        push("error", "Failed to switch network", 4000);
      }
    } catch (error: any) {
      console.error("Network switch error:", error);
      push("error", error?.message || "Failed to switch network", 4000);
    }
  }, [push]);

  const disconnectWallet = useCallback(() => {
    setConnected(false);
    setProvider(null);
    setSigner(null);
    setAccount("");
    setTxStatus("idle");
    setErrorMessage("");
  }, [account, publishedScore]);

  useEffect(() => {
    if (sdk && isReady && provider && signer) {
      try {
        initializeFheUtils(sdk, provider, signer);
      } catch (e) {
        console.error("❌ App: fheUtils initialization failed", e);
        // Show error to user
        push("error", "Failed to initialize FHE system. Please refresh the page.", 5000);
      }
    }
  }, [sdk, isReady, provider, signer, push]);

  // Request user-decrypt authorization once per session after SDK/utils are ready
  useEffect(() => {
    (async () => {
      try {
        if (!connected || !sdk || !isReady || !fheUtils || udsigRequestedRef.current) return;
        udsigRequestedRef.current = true;

        const ok = await (fheUtils as any).requestUserDecryptAuthorization();
        if (ok) {
          try {
            await (reloadUserState as any)?.(true, true);
          } catch (e) {
            console.error("❌ App: Failed to reload user state after authorization:", e);
          }
        } else {
        }
      } catch (e) {
        console.error("❌ App: User-decrypt authorization error:", e);
      }
    })();
  }, [connected, sdk, isReady, fheUtils, reloadUserState]);

  // Check network and show warning if not on Sepolia
  useEffect(() => {
    if (connected && !isChecking && !isCorrectNetwork) {
      setShowNetworkWarning(true);
    } else if (connected && isCorrectNetwork) {
      setShowNetworkWarning(false);
    }
  }, [connected, isChecking, isCorrectNetwork]);

  // One-time trial spin flagging; will be executed after handleDailyGm is defined
  const tryGrantTrialSpin = useCallback(() => {
    try {
      if (!connected || !account) return;
      if (txStatus === "pending") return;
      const key = `gmspin:trial:${(CONFIG.FHEVM_CONTRACT_ADDRESS || "").toLowerCase()}:${account.toLowerCase()}`;
      if (trialGrantedRef.current) return;
      if (localStorage.getItem(key) === "1") return;
      const spinsNow = Number.isFinite(availableSpins) ? availableSpins : userData?.spins || 0;
      if (!userDataLoading && spinsNow <= 0 && canCheckin) {
        trialGrantedRef.current = true;
        return key;
      }
    } catch {}
    return null as string | null;
  }, [connected, account, txStatus, availableSpins, userData, userDataLoading, canCheckin]);

  // Eager connect: if the site is already authorized in the wallet, load account on first visit without prompting
  useEffect(() => {
    const anyWindow = window as any;
    if (!anyWindow?.ethereum) return;
    let cancelled = false;
    (async () => {
      try {
        const browserProvider = new ethers.BrowserProvider(anyWindow.ethereum);
        const accounts: string[] = await anyWindow.ethereum.request({ method: "eth_accounts" });
        if (cancelled) return;
        if (accounts && accounts.length > 0) {
          const acc = accounts[0];
          const s = await browserProvider.getSigner();
          setProvider(browserProvider);
          setSigner(s);
          setAccount(acc);
          setConnected(true);
          setSignerAndProvider(browserProvider, s);
        }
      } catch (e) {}
    })();
    const onAccounts = (accs: string[]) => {
      if (!accs || accs.length === 0) {
        setConnected(false);
        setAccount("");
        setSigner(null);
        setProvider(null);
        return;
      }
      // reload signer/provider
      (async () => {
        try {
          const browserProvider = new ethers.BrowserProvider(anyWindow.ethereum);
          const s = await browserProvider.getSigner();
          setProvider(browserProvider);
          setSigner(s);
          setAccount(accs[0]);
          setConnected(true);
          setSignerAndProvider(browserProvider, s);
        } catch {}
      })();
    };
    const onChainChanged = () => {
      // force a light refresh to keep provider state consistent
      try {
        window.location.reload();
      } catch {}
    };
    try {
      anyWindow.ethereum.on?.("accountsChanged", onAccounts);
      anyWindow.ethereum.on?.("chainChanged", onChainChanged);
    } catch {}
    return () => {
      cancelled = true;
      try {
        anyWindow.ethereum.removeListener?.("accountsChanged", onAccounts);
        anyWindow.ethereum.removeListener?.("chainChanged", onChainChanged);
      } catch {}
    };
  }, [setSignerAndProvider]);

  useEffect(() => {
    const load = async () => {
      try {
        if (!provider || !account) return;
        const bal = await provider.getBalance(account);
        setEthWalletBalance(Number(ethers.formatEther(bal)));
      } catch {}
    };
    load();
  }, [provider, account]);

  // moved scheduleRefresh earlier to satisfy hook order

  // Subscribe to on-chain CheckInCompleted events (debug/logging)
  useEffect(() => {
    const c = (fheUtils as any)?.contract;
    if (!c || !account) return;
    const handler = (user: string, timestamp: any) => {
      try {
        if (user?.toLowerCase?.() === account.toLowerCase()) {
          const ts = Number(timestamp?.toString?.() || timestamp);

          // no auto refresh during session
        }
      } catch {}
    };
    try {
      c.on("CheckInCompleted", handler);
    } catch {}
    return () => {
      try {
        c.off("CheckInCompleted", handler);
      } catch {}
    };
  }, [account]);

  // Load on-chain check-in state (UTC day) and compute next reset time
  useEffect(() => {
    let cancelled = false;
    const loadCheckin = async () => {
      setIsCheckinLoading(true);
      try {
        if (!connected || !isReady || !fheUtils || !account) {
          if (!cancelled) setCanCheckin(false);
          return;
        }
        if (typeof (fheUtils as any)?.contract?.lastCheckInDay !== "function") return;
        const lastDay: bigint = await (fheUtils as any).contract.lastCheckInDay(account);
        const nowSec = Math.floor(Date.now() / 1000);
        const nowDay = Math.floor(nowSec / (24 * 60 * 60));
        if (!cancelled) setCanCheckin(nowDay > Number(lastDay));
        const nextResetSec = (nowDay + 1) * 24 * 60 * 60; // next 00:00 UTC
        const d = new Date(nextResetSec * 1000).toISOString().replace(".000Z", "Z");
        if (!cancelled) setNextResetUtc(d);
      } catch {
        if (!cancelled) setCanCheckin(false);
      } finally {
        if (!cancelled) setIsCheckinLoading(false);
      }
    };
    loadCheckin();
    return () => {
      cancelled = true;
    };
  }, [connected, account, isReady]);

  // Run countdown whenever nextResetUtc is known and user has already checked in
  useEffect(() => {
    if (!nextResetUtc || canCheckin) {
      setCheckinCountdown("");
      return;
    }
    const nextResetSec = Math.floor(new Date(nextResetUtc).getTime() / 1000);
    const updateCountdown = () => {
      const remain = nextResetSec - Math.floor(Date.now() / 1000);
      if (remain <= 0) {
        setCheckinCountdown("00:00:00");
        return;
      }
      const h = Math.floor(remain / 3600)
        .toString()
        .padStart(2, "0");
      const m = Math.floor((remain % 3600) / 60)
        .toString()
        .padStart(2, "0");
      const s = Math.floor(remain % 60)
        .toString()
        .padStart(2, "0");
      setCheckinCountdown(`${h}:${m}:${s}`);
    };
    updateCountdown();
    const id = setInterval(updateCountdown, 1000);
    return () => clearInterval(id);
  }, [nextResetUtc, canCheckin]);

  const refreshUserData = useCallback(async () => {
    try {
      // ✅ Không skip throttle để tránh spam
      await reloadUserState(true, false);
    } catch (error) {
      console.error("❌ refreshUserData failed:", error);
    }
  }, [reloadUserState]);

  // ✅ GIẢI PHÁP: useEffect với dependency đúng - chỉ load khi cần thiết
  useEffect(() => {
    if (!connected || !sdk || !isReady || !account) return;

    // Add error handling for the initial load
    const loadData = async () => {
      try {
        await refreshUserData();
      } catch (error) {
        // Handle error silently
      }
    };

    loadData();
    // ✅ Không gọi scheduleRefresh() để tránh load liên tục
  }, [connected, sdk, isReady, account, refreshUserData]); // ✅ Dependency đúng

  // Listen ErrorChanged and show friendly message
  useEffect(() => {
    const c = (fheUtils as any)?.contract;
    if (!connected || !c || !account) return;
    const handler = async (user: string) => {
      if (user?.toLowerCase?.() !== account?.toLowerCase?.()) return;
      try {
        const res = await c.getLastError(account);
        const encCode: string = res?.[0];
        const ts: bigint = res?.[1];
        let codeNum = 0;
        if (encCode && typeof encCode === "string" && encCode.startsWith("0x")) {
          const code = await (fheUtils as any).decryptEuint64(encCode);
          codeNum = Number(code);
        }
        const map: Record<number, string> = {
          1: "Not enough GM to buy spin",
          2: "Already checked in today",
          3: "No spins available",
        };
        const when = ts ? new Date(Number(ts) * 1000).toISOString() : "";
        const msg = (map[codeNum] || (codeNum ? `FHE error code: ${codeNum}` : "")) + (when ? ` at ${when}` : "");
        if (msg) setSpinMessage(msg);
        setTimeout(() => {
          try {
            (reloadUserState as any)?.();
          } catch {}
        }, 300);
      } catch {}
    };
    try {
      c.on("ErrorChanged", handler);
    } catch {}
    return () => {
      try {
        c.off("ErrorChanged", handler);
      } catch {}
    };
  }, [connected, account, reloadUserState]);

  // Remove extra event-driven reloads; rely on stateVersion in useUserGameState
  useEffect(() => {
    return () => {};
  }, []);

  // Remove block polling in this mode

  // Load leaderboard (public only) - load ngay khi app khởi động, không cần kết nối ví
  const loadLeaderboard = useCallback(async () => {
    try {
      // ✅ SỬA: Sử dụng RPC URL từ .env thay vì hardcode
      const rpc = process.env.REACT_APP_SEPOLIA_RPC_URL || "YOUR_SEPOLIA_RPC_URL_HERE";

      const roProvider = new ethers.JsonRpcProvider(rpc);
      const abi = [
        {
          inputs: [
            { internalType: "uint256", name: "offset", type: "uint256" },
            { internalType: "uint256", name: "limit", type: "uint256" },
          ],
          name: "getEncryptedPublishedRange",
          outputs: [
            { internalType: "address[]", name: "addrs", type: "address[]" },
            { internalType: "euint64[]", name: "encryptedScores", type: "bytes32[]" },
          ],
          stateMutability: "view",
          type: "function",
        },
        {
          inputs: [
            { internalType: "uint256", name: "offset", type: "uint256" },
            { internalType: "uint256", name: "limit", type: "uint256" },
          ],
          name: "getPublishedRange",
          outputs: [
            { internalType: "address[]", name: "addrs", type: "address[]" },
            { internalType: "uint256[]", name: "scores", type: "uint256[]" },
          ],
          stateMutability: "view",
          type: "function",
        },
      ];
      const c = new ethers.Contract(CONFIG.FHEVM_CONTRACT_ADDRESS, abi, roProvider);

      // Removed debug logs for leaderboard loading

      try {
        const [addrs, encryptedScores] = await c.getEncryptedPublishedRange(0, 20);

        // ✅ FIXED: Use publicDecrypt for published scores (they are publicly decryptable)
        let items: { address: string; score: number; isDecrypted?: boolean }[] = [];

        if (addrs?.length > 0 && encryptedScores?.length > 0) {
          try {
            // Use public decryption for all encrypted scores (they are published)
            const handles = encryptedScores.filter(
              (score: string) =>
                score && score !== "0x0000000000000000000000000000000000000000000000000000000000000000",
            );

            if (handles.length > 0) {
              // ✅ FIXED: Use SDK instance from fheUtils
              const sdkInstance = (fheUtils as any)?.sdk;

              // ✅ FIXED: Try to decrypt all published scores using publicDecrypt (they are publicly decryptable)
              let decryptedScores: any = {};

              // ✅ IMPROVED: Wait for SDK to be ready before attempting decryption
              // ✅ FIXED: Try userDecrypt first if user is connected, then publicDecrypt as fallback
              if (connected && account && signer && sdkInstance && typeof sdkInstance.userDecrypt === "function") {
                try {
                  // ✅ FIXED: Convert handles to proper format for userDecrypt
                  const formattedHandles = handles.map((handle: string) => {
                    // Ensure handle is a proper string format
                    if (typeof handle === "string" && handle.startsWith("0x")) {
                      return handle;
                    }
                    return String(handle);
                  });

                  const userDecrypted = await sdkInstance.userDecrypt({ handles: formattedHandles, signer });
                  decryptedScores = userDecrypted || {};
                } catch (userDecryptError: any) {
                  // ✅ FALLBACK: Try publicDecrypt if userDecrypt fails
                  if (typeof sdkInstance.publicDecrypt === "function") {
                    try {
                      const formattedHandles = handles.map((handle: string) => {
                        if (typeof handle === "string" && handle.startsWith("0x")) {
                          return handle;
                        }
                        return String(handle);
                      });
                      const publicDecrypted = await sdkInstance.publicDecrypt(formattedHandles);
                      decryptedScores = publicDecrypted || {};
                    } catch (publicDecryptError) {
                      // Silent fallback
                    }
                  }
                }
              } else {
                // ✅ FALLBACK: Try publicDecrypt if user is not connected
                if (sdkInstance && typeof sdkInstance.publicDecrypt === "function") {
                  try {
                    const formattedHandles = handles.map((handle: string) => {
                      if (typeof handle === "string" && handle.startsWith("0x")) {
                        return handle;
                      }
                      return String(handle);
                    });
                    const publicDecrypted = await sdkInstance.publicDecrypt(formattedHandles);
                    decryptedScores = publicDecrypted || {};
                  } catch (publicDecryptError: any) {
                    // Silent fallback
                  }
                }
              }

              // ✅ FIXED: Show all published scores (they are publicly visible)
              items = (addrs || []).map((a: string, i: number) => {
                const encryptedScore = encryptedScores[i];
                const score = Number(decryptedScores[encryptedScore] || 0);
                const isDecrypted = decryptedScores[encryptedScore] !== undefined;

                return {
                  address: a,
                  score: score,
                  isDecrypted: isDecrypted,
                };
              });
            } else {
              items = (addrs || []).map((a: string) => ({
                address: a,
                score: 0,
                isDecrypted: false,
              }));
            }
          } catch (decryptError) {
            // Fallback to zero scores
            items = (addrs || []).map((a: string) => ({
              address: a,
              score: 0,
              isDecrypted: false,
            }));
          }
        }

        // Nếu user đã kết nối ví, cập nhật score của họ nếu cần
        if (account) {
          const ix = items.findIndex(
            (it: { address: string; score: number; isDecrypted?: boolean }) =>
              it.address?.toLowerCase?.() === account.toLowerCase(),
          );
          if (ix >= 0 && Number.isFinite(publishedScore)) {
            items[ix].score = Math.max(items[ix].score || 0, publishedScore || 0);
            items[ix].isDecrypted = true; // User's own score is always decrypted
          }
        }

        items.sort(
          (
            a: { address: string; score: number; isDecrypted?: boolean },
            b: { address: string; score: number; isDecrypted?: boolean },
          ) => b.score - a.score,
        );

        setLeaderboard(items);
      } catch (callError: any) {
        // ✅ Kiểm tra nếu là CORS error
        if (callError.message?.includes("CORS") || callError.message?.includes("Access-Control-Allow-Origin")) {
          console.warn("⚠️ CORS error detected, trying alternative RPC...");

          // Thử với RPC khác nếu có
          const fallbackRpc = "https://eth-sepolia.g.alchemy.com/v2/demo";
          try {
            console.log("🔄 Trying fallback RPC:", fallbackRpc);
            const fallbackProvider = new ethers.JsonRpcProvider(fallbackRpc);
            const fallbackContract = new ethers.Contract(CONFIG.FHEVM_CONTRACT_ADDRESS, abi, fallbackProvider);
            const [addrs, encryptedScores] = await fallbackContract.getEncryptedPublishedRange(0, 20);

            // ✅ UPDATED: Use userDecrypt for fallback too
            let items: { address: string; score: number; isDecrypted?: boolean }[] = [];

            if (addrs?.length > 0 && encryptedScores?.length > 0) {
              try {
                const handles = encryptedScores.filter(
                  (score: string) =>
                    score && score !== "0x0000000000000000000000000000000000000000000000000000000000000000",
                );

                if (handles.length > 0) {
                  // ✅ UPDATED: Use userDecrypt for fallback too
                  const sdkInstance = (fheUtils as any)?.sdk;
                  let decryptedScores: any = {};
                  if (sdkInstance && typeof sdkInstance.userDecrypt === "function" && signer && connected) {
                    try {
                      // Only decrypt scores that belong to the current user
                      const userHandles = handles.filter((handle: string, index: number) => {
                        const addr = addrs[index];
                        return addr?.toLowerCase() === account?.toLowerCase();
                      });

                      if (userHandles.length > 0) {
                        const userDecrypted = await sdkInstance.userDecrypt({ handles: userHandles, signer });
                        decryptedScores = userDecrypted || {};
                      } else {
                        decryptedScores = {};
                      }
                    } catch (userDecryptError) {
                      decryptedScores = {};
                    }
                  } else {
                    decryptedScores = {};
                  }

                  // ✅ UPDATED: Only show scores that user can decrypt (their own scores)
                  items = (addrs || []).map((a: string, i: number) => {
                    const isCurrentUser = a?.toLowerCase() === account?.toLowerCase();
                    const score = isCurrentUser ? Number(decryptedScores[encryptedScores[i]] || 0) : 0;
                    return {
                      address: a,
                      score: score,
                      isDecrypted: isCurrentUser && decryptedScores[encryptedScores[i]] !== undefined,
                    };
                  });
                } else {
                  items = (addrs || []).map((a: string) => ({
                    address: a,
                    score: 0,
                    isDecrypted: false,
                  }));
                }
              } catch (decryptError) {
                items = (addrs || []).map((a: string) => ({
                  address: a,
                  score: 0,
                  isDecrypted: false,
                }));
              }
            }

            items.sort(
              (
                a: { address: string; score: number; isDecrypted?: boolean },
                b: { address: string; score: number; isDecrypted?: boolean },
              ) => b.score - a.score,
            );
            setLeaderboard(items);
            return;
          } catch (fallbackError) {
            // Fallback RPC failed
          }
        }

        // Set empty array to show "No public scores" message
        setLeaderboard([]);
      }
    } catch (error) {
      // Set empty array to show "No public scores" message
      setLeaderboard([]);
    }
  }, [account, publishedScore, connected, signer, fheUtils]);

  // ✅ IMPROVED: Load leaderboard only when SDK is fully ready
  useEffect(() => {
    // Wait for SDK to be completely ready
    if (fheUtils && (fheUtils as any)?.sdk && isReady) {
      loadLeaderboard();
    }

    // Set up interval để refresh leaderboard mỗi 30 giây (only when SDK ready)
    const interval = setInterval(() => {
      if (fheUtils && (fheUtils as any)?.sdk && isReady) {
        loadLeaderboard();
      }
    }, 30000);

    return () => clearInterval(interval);
  }, [loadLeaderboard, fheUtils, isReady]);

  // Realtime leaderboard: refresh on publish/unpublish events
  useEffect(() => {
    const c = (fheUtils as any)?.contract;
    if (!c) return;

    // Xóa event listeners không tồn tại trong contract
    // const onPublished = (_user: string) => {
    //   try {
    //     loadLeaderboard();
    //   } catch {}
    // };
    // const onUnpublished = (_user: string) => {
    //   try {
    //     loadLeaderboard();
    //   } catch {}
    // };
    // try {
    //   c.on("ScorePublished", onPublished);
    //   c.on("ScoreUnpublished", onUnpublished);
    // } catch {}
    // return () => {
    //   try {
    //     c.off("ScorePublished", onPublished);
    //     c.off("ScoreUnpublished", onUnpublished);
    //   } catch {}
    // };
  }, [loadLeaderboard]);

  const handleBuyGmTokens = useCallback(async () => {
    try {
      // ✅ SỬA: Kiểm tra đang processing không
      if (txStatus === "pending") {
        push("error", "Please wait for current transaction to complete", 3000);
        return;
      }

      // TỐI ƯU: Set pending ngay lập tức khi click
      setTxStatus("pending");

      // TỐI ƯU: Bỏ debug logs và pre-checks để tăng tốc
      requireReady();
      if (!buyEthAmount) throw new Error("Enter ETH amount");
      const rate = CONFIG.GM_TOKEN_RATE || 1000;
      const gmAmount = Math.floor(Number(buyEthAmount) * rate);
      if (!Number.isFinite(gmAmount) || gmAmount <= 0) throw new Error("Amount must be > 0");

      // TỐI ƯU: Hiển thị toast ngay lập tức
      const toastId = push("pending", "💰 Preparing transaction...");

      // TỐI ƯU: Bỏ retry logic, chỉ thử 1 lần
      if (!sdk) throw new Error("SDK not ready");

      // TỐI ƯU: Pre-encrypt để tăng tốc
      update(toastId, "pending", "🔐 Encrypting input...", 1000);

      // TỐI ƯU: Pre-warm SDK để tăng tốc encryption
      let handles: any[], inputProof: any;
      try {
        const builder = (sdk as any).createEncryptedInput(CONFIG.FHEVM_CONTRACT_ADDRESS, account);
        builder.add64(BigInt(gmAmount));
        const result = await builder.encrypt();
        handles = result.handles;
        inputProof = result.inputProof;
        if (!handles?.length || !inputProof) throw new Error("Relayer returned empty proof");
      } catch (encryptError) {
        // TỐI ƯU: Retry encryption nếu fail
        console.warn("⚠️ First encryption attempt failed, retrying...", encryptError);
        const builder = (sdk as any).createEncryptedInput(CONFIG.FHEVM_CONTRACT_ADDRESS, account);
        builder.add64(BigInt(gmAmount));
        const result = await builder.encrypt();
        handles = result.handles;
        inputProof = result.inputProof;
        if (!handles?.length || !inputProof) throw new Error("Relayer returned empty proof");
      }

      // TỐI ƯU: Fixed gas config thay vì fee calculation
      // SỬA: Gửi ETH vào pool qua trường value
      update(toastId, "pending", "📤 Submitting transaction...", 1000);
      const tx = await (fheUtils as any).contract.buyGmTokensFHE(handles[0], inputProof, {
        gasLimit: 900_000,
        maxPriorityFeePerGas: ethers.parseUnits("2", "gwei"),
        maxFeePerGas: ethers.parseUnits("50", "gwei"),
        value: ethers.parseEther(String(buyEthAmount)),
      });

      await tx.wait();
      setTxStatus("idle"); // ✅ SỬA: Reset về idle thay vì success
      setSpinMessage("GM Tokens purchased (FHE)");
      update(toastId, "success", "✅ GM Tokens purchased successfully!", 10000);

      // SỬA: Không reload ngay lập tức, để dữ liệu chính xác sau khi có kết quả vòng quay
      // setTimeout(() => {
      //   try {
      //     (reloadUserState as any)?.(true, true);
      //   } catch {}
      // }, 100);
    } catch (e: any) {
      setTxStatus("error");
      setErrorMessage(e?.reason || e?.shortMessage || e?.message || String(e));
    } finally {
      // ✅ SỬA: Đảm bảo reset txStatus
      setTimeout(() => {
        setTxStatus("idle");
      }, 100);
    }
  }, [requireReady, buyEthAmount, account, sdk, push, update, reloadUserState, txStatus]);

  // Removed confirmBuySpins (ETH path not supported)

  const handleDailyGm = useCallback(async () => {
    try {
      // ✅ SỬA: Kiểm tra đang processing không
      if (txStatus === "pending") {
        push("error", "Please wait for current transaction to complete", 3000);
        return;
      }

      // TỐI ƯU: Set pending ngay lập tức khi click
      setTxStatus("pending");

      requireReady();
      const toastId = push("pending", "☀️ Submitting Daily Check-in...");
      // Strict contract: compute eligibility via lastCheckInDay (UTC day bucket)
      let canCheckin = true;
      try {
        if (typeof (fheUtils as any)?.contract?.lastCheckInDay !== "function") return;
        const lastDay: bigint = await (fheUtils as any).contract.lastCheckInDay(account);
        const nowDay = BigInt(Math.floor(Date.now() / 1000 / (24 * 60 * 60)));
        canCheckin = nowDay > lastDay;
      } catch {}
      if (!canCheckin) throw new Error("Already checked in today");
      // Preflight estimateGas; fallback to a generous cap to avoid OOG reverts on FHE ops
      let gasLimit: any = 2_000_000;
      try {
        const est: bigint = await (fheUtils as any).contract.estimateGas.dailyGm();
        const mul = (value: bigint, num: bigint, den: bigint) => (value * num) / den;
        const withBuffer = mul(est, 15n, 10n);
        const cap = 2_500_000n;
        gasLimit = withBuffer > cap ? cap : withBuffer;
      } catch {}

      const fee = await provider!.getFeeData();
      const priority = ((fee.maxPriorityFeePerGas || 2n * 10n ** 9n) * 13n) / 10n; // +30%
      const base = fee.maxFeePerGas || 20n * 10n ** 9n;
      const maxFee = base + priority;

      const tx = await (fheUtils as any).contract.dailyGm({
        gasLimit,
        maxPriorityFeePerGas: priority,
        maxFeePerGas: maxFee,
      });

      const receipt = await tx.wait();

      try {
        const parsed = receipt.logs
          .map((log: any) => {
            try {
              return (fheUtils as any).contract.interface.parseLog(log);
            } catch {
              return null;
            }
          })
          .filter(Boolean);
        const evt = parsed.find((p: any) => p?.name === "CheckInCompleted");
        if (evt) {
          const ts = Number(evt.args?.timestamp?.toString?.() || 0);
        }
      } catch {}
      setTxStatus("idle"); // ✅ SỬA: Reset về idle thay vì success
      setSpinMessage("Daily GM successful!");
      update(toastId, "success", "✅ Daily check-in successful (+1 spin)", 10000);
      setCanCheckin(false);
      try {
        const nowSec = Math.floor(Date.now() / 1000);
        const nowDay = Math.floor(nowSec / (24 * 60 * 60));
        const nextResetSec = (nowDay + 1) * 24 * 60 * 60;
        const d = new Date(nextResetSec * 1000).toISOString().replace(".000Z", "Z");
        setNextResetUtc(d);
      } catch {}
      // SỬA: Không reload ngay lập tức, để dữ liệu chính xác sau khi có kết quả vòng quay
      // setTimeout(() => {
      //   try {
      //     (reloadUserState as any)?.(true, true);
      //   } catch {}
      // }, 300);
    } catch (e: any) {
      console.error("🟥 handleDailyGm: error", e);
      setTxStatus("error");
      setErrorMessage(e?.reason || e?.shortMessage || e?.message || String(e));
    } finally {
      // ✅ SỬA: Đảm bảo reset txStatus
      setTimeout(() => {
        setTxStatus("idle");
      }, 100);
    }
  }, [requireReady, account, push, update, reloadUserState, txStatus]);

  // Execute trial after handleDailyGm is available
  useEffect(() => {
    const key = tryGrantTrialSpin();
    if (key) {
      (async () => {
        try {
          await handleDailyGm();
          localStorage.setItem(key, "1");
        } catch {
          // ignore
        }
      })();
    }
  }, [tryGrantTrialSpin, handleDailyGm]);

  // ✅ Kiểm tra HCU limit trước khi spin
  const checkHCULimit = useCallback(async () => {
    try {
      // Kiểm tra xem có thể gọi function đơn giản không
      const testTx = await (fheUtils as any).contract.stateVersion(account);
      return true; // Nếu gọi được stateVersion thì HCU OK
    } catch (error: any) {
      console.error("HCU check failed:", error);
      return false;
    }
  }, [account, fheUtils]);

  // ✅ Cải thiện: Sử dụng encrypted random spin thay vì public randomness
  const handleSpinWithEncryptedRandom = useCallback(async () => {
    if (!account || !fheUtils || !isReady) {
      push("error", "Please connect wallet and ensure FHE SDK is ready", 3000);
      return;
    }

    // ✅ SỬA: Kiểm tra đang processing không
    if (txStatus === "pending") {
      push("error", "Please wait for current transaction to complete", 3000);
      return;
    }

    console.log("🎯 handleSpinWithEncryptedRandom started");

    // ✅ Reset targetSlotIndex để đảm bảo vòng quay không dùng giá trị cũ
    setTargetSlotIndex(null);
    setIsSpinning(false);

    try {
      // ✅ Hiển thị pending khi bắt đầu
      showPending("🎯 Spinning with encrypted randomness...");

      // ✅ Sử dụng function spin đơn giản từ contract
      const tx = await (fheUtils as any).contract.spin({
        gasLimit: 800_000,
        maxFeePerGas: ethers.parseUnits("50", "gwei"),
      });

      console.log("🎯 Transaction sent:", tx.hash);

      // ✅ Cập nhật hash ngay khi có transaction
      updateHash(tx.hash);

      // ✅ Đợi transaction và parse events
      const receipt = await tx.wait();
      console.log("🎯 Transaction receipt:", receipt);

      // ✅ Ẩn pending notification sau khi transaction hoàn thành
      hidePending();

      // ✅ Tìm SpinOutcome event trong transaction logs
      const contract = (fheUtils as any).contract;
      console.log("🎯 Looking for SpinOutcome event in", receipt.logs.length, "logs");

      const spinOutcomeEvent = receipt.logs.find((log: any) => {
        try {
          const parsedLog = contract.interface.parseLog(log);
          console.log("🎯 Parsed log:", parsedLog.name, parsedLog.args);
          // ✅ Sửa logic tìm event - chỉ cần tên event, không cần check args[0]
          return parsedLog.name === "SpinOutcome";
        } catch (error) {
          console.log("🎯 Failed to parse log:", error);
          return false;
        }
      });

      if (spinOutcomeEvent) {
        // ✅ Parse event data
        const parsedLog = contract.interface.parseLog(spinOutcomeEvent);
        console.log("🎯 SpinOutcome event found:", parsedLog);
        console.log("🎯 Event args:", parsedLog.args);

        const slot = Number(parsedLog.args[1]); // slot index
        const prizeWei = BigInt(parsedLog.args[2]); // prize in wei
        const gmDelta = Number(parsedLog.args[3]); // GM tokens won

        console.log("🎯 Contract event found:", { slot, prizeWei, gmDelta });

        // ✅ Lưu kết quả để hiển thị sau khi vòng quay xong
        let resultMessage = "Spin completed!";
        if (slot === 0) resultMessage = `🎉 Won 0.1 ETH!`;
        else if (slot === 1) resultMessage = `🎉 Won 0.01 ETH!`;
        else if (slot >= 2 && slot <= 4) resultMessage = "😔 Miss - Try again!";
        else if (slot === 5) resultMessage = `🎉 Won ${gmDelta} GM tokens!`;
        else if (slot === 6) resultMessage = `🎉 Won ${gmDelta} GM tokens!`;
        else if (slot === 7) resultMessage = `🎉 Won ${gmDelta} GM tokens!`;

        console.log("🎯 Prize result message:", resultMessage);

        // ✅ Lưu kết quả để hiển thị sau khi vòng quay xong
        setSpinResult(resultMessage);
        console.log("🎯 Set spinResult to:", resultMessage);
        setSpinMessage("Spin complete");
        setLastSlot(slot);

        // ✅ Bắt đầu animation vòng quay với slot đúng từ contract
        console.log("🎯 Starting wheel animation with slot:", slot);
        const displayIndex = SLOT_TO_DISPLAY_INDEX[slot];
        console.log("🎯 Contract slot", slot, "-> Display index", displayIndex);
        setTargetSlotIndex(displayIndex);
        setIsSpinning(true);

        // ✅ Apply prize bằng cách gọi settlePrize
        try {
          console.log("🎯 Calling settlePrize for slot:", slot);
          const settleTx = await (fheUtils as any).contract.settlePrize(slot, {
            gasLimit: 500_000,
            maxFeePerGas: ethers.parseUnits("50", "gwei"),
          });
          await settleTx.wait();
          console.log("🎯 settlePrize completed successfully");
        } catch (settleError: any) {
          console.error("🎯 settlePrize failed:", settleError);
          // Không block UI nếu settlePrize fail
        }
      } else {
        console.log("🎯 No contract event found, using random spin");
        console.log("🎯 All logs:", receipt.logs);
        // ✅ Nếu không có event, quay random
        setSpinResult("Spin completed with encrypted randomness! 🎉");
        console.log("🎯 Set spinResult to (no event):", "Spin completed with encrypted randomness! 🎉");
        setSpinMessage("Spin complete");
        setLastSlot(null);

        setTargetSlotIndex(null);
        setIsSpinning(true);
      }

      await refreshUserData();
    } catch (error: any) {
      console.error("Spin with encrypted random failed:", error);
      hidePending(); // Ẩn pending nếu lỗi
      showError(`Spin failed: ${error.message}`);
      push("error", `Spin failed: ${error.message}`, 5000);
    } finally {
      // ✅ SỬA: Đảm bảo reset txStatus
      setTimeout(() => {
        setTxStatus("idle");
      }, 100);
    }
  }, [account, fheUtils, isReady, push, refreshUserData, showPending, hidePending, showError, updateHash, txStatus]);

  // replaced by inline handler with support for custom amount

  // Unlock flow removed in this mode

  const gmPreview = useMemo(() => {
    const v = Number(buyEthAmount || 0);
    const rate = CONFIG.GM_TOKEN_RATE || 1000;
    return Math.floor(v * rate);
  }, [buyEthAmount]);

  const handleClaimETH = useCallback(async () => {
    try {
      // ✅ SỬA: Kiểm tra đang processing không
      if (txStatus === "pending") {
        push("error", "Please wait for current transaction to complete", 3000);
        return;
      }

      // TỐI ƯU: Set pending ngay lập tức khi click
      setTxStatus("pending");

      requireReady();

      // KIỂM TRA: User có pending ETH không
      const userPendingEthWei = await (fheUtils as any).contract.getEncryptedPendingEthWei(account);
      const userPendingEth = await fheUtils!.decryptEuint64(userPendingEthWei);
      const userPendingEthNumber = Number(ethers.formatEther(userPendingEth));

      if (userPendingEthNumber <= 0) {
        push("error", "No pending ETH available to claim", 3000);
        setTxStatus("idle");
        return;
      }

      let amountWei: bigint;
      let claimAmountNumber: number;

      // Nếu có nhập amount thì claim theo amount, không thì claim tất cả
      if (claimAmount && parseFloat(claimAmount) > 0) {
        claimAmountNumber = parseFloat(claimAmount);
        amountWei = ethers.parseEther(claimAmount);

        // Kiểm tra user có đủ pending ETH không
        if (userPendingEthNumber < claimAmountNumber) {
          push("error", `Insufficient pending ETH. Available: ${userPendingEthNumber.toFixed(4)} ETH`, 3000);
          setTxStatus("idle");
          return;
        }
      } else {
        // Claim tất cả pending ETH
        claimAmountNumber = userPendingEthNumber;
        amountWei = userPendingEth;
      }

      // KIỂM TRA: Contract có đủ ETH để trả không
      const contractBalance = await provider!.getBalance((fheUtils as any).contract.target);
      if (contractBalance < amountWei) {
        push("error", `Contract balance insufficient. Available: ${ethers.formatEther(contractBalance)} ETH`, 3000);
        setTxStatus("idle");
        return;
      }

      const toastId = push("pending", `💰 Claiming ${claimAmountNumber.toFixed(6)} ETH...`);

      // Sử dụng withdrawAllPendingETH nếu claim tất cả, không thì withdrawPendingETH
      let claimTx;
      if (!claimAmount || parseFloat(claimAmount) <= 0) {
        claimTx = await (fheUtils as any).contract.withdrawAllPendingETH({
          gasLimit: 300_000,
          maxFeePerGas: ethers.parseUnits("50", "gwei"),
          maxPriorityFeePerGas: ethers.parseUnits("2", "gwei"),
        });
      } else {
        claimTx = await (fheUtils as any).contract.withdrawPendingETH(amountWei, {
          gasLimit: 300_000,
          maxFeePerGas: ethers.parseUnits("50", "gwei"),
          maxPriorityFeePerGas: ethers.parseUnits("2", "gwei"),
        });
      }

      await claimTx.wait();
      setTxStatus("idle");
      update(toastId, "success", "✅ ETH claimed successfully!", 10000);
      setClaimAmount("");

      // ✅ Reload user data để cập nhật balance
      try {
        (reloadUserState as any)?.(true, true);
      } catch {}
    } catch (e: any) {
      setTxStatus("error");
      const msg = e?.reason || e?.shortMessage || e?.message || String(e);
      setErrorMessage(msg);
      push("error", msg, 5000);
    } finally {
      // ✅ SỬA: Đảm bảo reset txStatus
      setTimeout(() => {
        setTxStatus("idle");
      }, 100);
    }
  }, [requireReady, claimAmount, account, push, update, reloadUserState, txStatus]);

  return (
    <div className="container" style={{ padding: 16 }}>
      {(usingFallback || userDataError?.includes("ACL_PERMISSION_DENIED")) && (
        <div
          style={{
            marginBottom: 10,
            padding: 8,
            borderRadius: 8,
            background: userDataError?.includes("ACL_PERMISSION_DENIED")
              ? "rgba(220,53,69,0.15)"
              : "rgba(255,165,0,0.15)",
            color: userDataError?.includes("ACL_PERMISSION_DENIED") ? "#f8d7da" : "#ffcc80",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 8,
          }}
        >
          <span>
            {userDataError?.includes("ACL_PERMISSION_DENIED")
              ? "Access denied - You need to perform daily check-in or buy spins to access private data"
              : "Private data temporarily unavailable (relayer 500 error or ACL issue)."}
            <br />
            <small>
              {userDataError?.includes("ACL_PERMISSION_DENIED")
                ? "Try: 1) Check ACL → 2) Daily check-in → 3) Buy spins"
                : "Try: 1) Check ACL → 2) Clear decrypt auth → 3) Wait 15 seconds → 4) Retry private data"}
            </small>
          </span>
          <div style={{ display: "flex", gap: 8 }}>
            <TypingButton
              className="btn btn-secondary"
              onClick={() => reloadUserState(false, true)}
              disabled={userDataLoading || txStatus === "pending"}
              typingSpeed={25}
            >
              {userDataLoading || txStatus === "pending" ? "⏳ Loading..." : "🔄 Retry private data"}
            </TypingButton>
          </div>
        </div>
      )}
      <div className="header">
        <h1>🎰 Lucky Spin FHEVM Demo</h1>
        <p>Secure, verifiable spinning wheel with confidential rewards</p>
        <p className="powered-by">Powered by Zama FHEVM</p>
        <p style={{ marginTop: 8, opacity: 0.85 }}>
          Author:{" "}
          <a href="https://x.com/trungkts29" target="_blank" rel="noreferrer">
            @trungkts29
          </a>
        </p>
      </div>

      <div className="sidebar">
        <div className="card">
          <h3>💰 Buy GM Tokens</h3>
          <div className="status-item">
            <span>Exchange Rate:</span>
            <span className="status-value">1 ETH = {CONFIG.GM_TOKEN_RATE} GM</span>
          </div>
          <div className="status-item">
            <span>Your ETH:</span>
            <span className="status-value">{ethWalletBalance.toFixed(4)}</span>
          </div>
          <div style={{ margin: "15px 0" }}>
            <label style={{ display: "block", marginBottom: 10, fontWeight: 600 }}>Amount to buy:</label>
            <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
              <input
                type="number"
                placeholder="0.01"
                min={0.001}
                step={0.001}
                value={buyEthAmount}
                onChange={(e) => setBuyEthAmount(e.target.value)}
                style={{
                  flex: 1,
                  padding: 10,
                  border: "none",
                  borderRadius: 8,
                  background: "rgba(255,255,255,0.1)",
                  color: "white",
                }}
              />
              <span style={{ color: "rgba(255,255,255,0.8)", fontSize: "0.9rem" }}>ETH</span>
            </div>
            <div style={{ marginTop: 5, fontSize: "0.8rem", color: "rgba(255,255,255,0.6)" }}>
              = {isNaN(gmPreview) ? 0 : gmPreview} GM Tokens
            </div>
          </div>
          <TypingButton
            className="btn btn-primary"
            onClick={handleBuyGmTokens}
            disabled={!connected || !isReady || !isCorrectNetwork || txStatus === "pending"}
            typingSpeed={25}
          >
            {txStatus === "pending" ? "⏳ Processing..." : "💰 Buy GM Tokens"}
          </TypingButton>
        </div>

        <div className="card">
          <h3>💳 Wallet Connection</h3>
          <div className="status-item">
            <span className={`btn ${connected ? "connected" : "disconnected"}`}>
              {connected ? "✅ Connected" : "❌ Not Connected"}
            </span>
          </div>
          {connected && (
            <>
              <div className="player-address" style={{ wordBreak: "break-all", margin: "10px 0" }}>
                {account}
              </div>
              <div className="status-item" style={{ marginTop: "8px" }}>
                <span className={`btn ${isCorrectNetwork ? "connected" : "disconnected"}`}>
                  {isChecking ? "⏳ Checking..." : isCorrectNetwork ? "✅ Sepolia Network" : "❌ Wrong Network"}
                </span>
              </div>
            </>
          )}
          {!connected ? (
            <TypingButton
              className="btn btn-primary"
              onClick={connectWallet}
              disabled={txStatus === "pending"}
              typingSpeed={30}
            >
              {txStatus === "pending" ? "⏳ Connecting..." : "🔗 Connect Wallet"}
            </TypingButton>
          ) : (
            <TypingButton
              className="btn btn-danger"
              onClick={disconnectWallet}
              disabled={txStatus === "pending"}
              typingSpeed={30}
            >
              {txStatus === "pending" ? "⏳ Disconnecting..." : "❌ Disconnect"}
            </TypingButton>
          )}
        </div>

        <div className="card">
          <h3>🎁 Daily Check-in</h3>
          {isCheckinLoading ? (
            <button className="btn btn-secondary" disabled title="Loading status...">
              ⏳ Loading...
            </button>
          ) : canCheckin ? (
            <TypingButton
              className="btn btn-primary"
              onClick={handleDailyGm}
              disabled={!connected || !isReady || !isCorrectNetwork || txStatus === "pending"}
              title="Check-in to receive +1 spin"
              typingSpeed={20}
            >
              {txStatus === "pending" ? "⏳ Processing..." : "☀️ Daily Check-in (+1 Spin)"}
            </TypingButton>
          ) : (
            <div>
              <button className="btn btn-secondary" disabled title={`Next reset: ${nextResetUtc}`}>
                ✅ Checked in (resets 00:00 UTC)
              </button>
              <div style={{ marginTop: 4, fontSize: "0.8rem", opacity: 0.7 }}>
                Next reset: {nextResetUtc}
                {checkinCountdown ? <span className="countdown">{checkinCountdown}</span> : ""}
              </div>
              <button
                className="btn btn-secondary"
                style={{ marginTop: 8 }}
                onClick={async () => {
                  try {
                    // TỐI ƯU: Set pending ngay lập tức khi click
                    setTxStatus("pending");

                    requireReady();
                    const res = await (fheUtils as any).contract.getLastError(account);
                    const encCode: string = res?.[0];
                    const ts: bigint = res?.[1];
                    let msg = "";
                    if (encCode && typeof encCode === "string" && encCode.startsWith("0x")) {
                      const code = Number(await (fheUtils as any).decryptEuint64(encCode));
                      const map: Record<number, string> = {
                        1: "Not enough GM to buy spin",
                        2: "Already checked in today",
                        3: "No spins available",
                      };
                      msg = map[code] || `FHE error code: ${code}`;
                    }
                    const when = ts ? new Date(Number(ts) * 1000).toISOString() : "";
                    setSpinMessage(msg ? `${msg}${when ? ` at ${when}` : ""}` : "");
                  } catch {}
                }}
              >
                {txStatus === "pending" ? "⏳ Loading..." : "ℹ️ View last error"}
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="main-content">
        <div className="spin-wheel-container">
          <div className="stats-grid">
            <div className="stat-item">
              <div className="stat-value" style={{ color: "#2196F3" }}>
                {spinsLoading ? <span style={{ animation: "pulse 1.5s infinite" }}>...</span> : availableSpins}
              </div>
              <div className="stat-label">Available Spins</div>
            </div>
            <div className="stat-item">
              <div className="stat-value" style={{ color: "#ffd700" }}>
                {gmLoading ? <span style={{ animation: "pulse 1.5s infinite" }}>...</span> : gmBalance}
              </div>
              <div className="stat-label">GM Tokens</div>
            </div>
            <div className="stat-item">
              <div className="stat-value" style={{ color: "#4CAF50" }}>
                {scoreLoading ? <span style={{ animation: "pulse 1.5s infinite" }}>...</span> : publishedScore}
              </div>
              <div className="stat-label">Total Score</div>
            </div>
          </div>

          {/* Nút refresh nhỏ */}
          <div className="refresh-container">
            <button
              className="refresh-button"
              title="Refresh data"
              aria-label="Refresh user data"
              onClick={() => {
                if (!userDataLoading) {
                  reloadUserState(true, true);
                }
              }}
              disabled={userDataLoading || txStatus === "pending"}
            >
              {userDataLoading ? <span style={{ animation: "spin 1s linear infinite" }}>⏳</span> : "⟳"}
            </button>
            <span className={`refresh-text ${userDataLoading ? "loading" : ""}`}>
              {userDataLoading ? "Loading..." : "Tap to refresh"}
            </span>
          </div>

          {/* Sync buttons removed for privacy-clean UI */}

          <SpinWheel
            isSpinning={isSpinning}
            onSpinComplete={(result) => {
              console.log("🎯 onSpinComplete called with result:", result);
              console.log("🎯 spinResult state:", spinResult);
              console.log(
                "🎯 spinResult !== 'Buy spins to start playing!':",
                spinResult !== "Buy spins to start playing!",
              );

              // ✅ Reset spinning state
              setIsSpinning(false);
              setTargetSlotIndex(null);

              // ✅ Hiển thị thông báo phần thưởng từ contract (KHÔNG phải từ vòng quay)
              if (spinResult && spinResult !== "Buy spins to start playing!") {
                console.log("🎯 Showing success notification:", spinResult);
                push("success", "🎯 " + spinResult, 10000);
                setShowRecentSpin(true); // Hiển thị kết quả
              } else {
                console.log("🎯 No spinResult to show notification");
                console.log("🎯 spinResult value:", spinResult);
              }

              // ✅ Reload user data to get updated balances
              reloadUserState(true, true).catch((err) => {
                console.error("❌ Reload failed:", err);
              });

              // ✅ Reload leaderboard after user data is updated
              setTimeout(() => {
                try {
                  loadLeaderboard();
                } catch {}
              }, 1000);
            }}
            onSpin={handleSpinWithEncryptedRandom}
            slots={WHEEL_SLOTS}
            canSpin={
              connected &&
              isReady &&
              txStatus !== "pending" &&
              !userDataLoading &&
              (availableSpins || 0) > 0 &&
              !isSpinning
            }
            targetSlotIndex={targetSlotIndex}
            onBlockedSpin={() => {
              // SỬA: Kiểm tra các trường hợp khác nhau để hiển thị thông báo phù hợp
              if (txStatus === "pending") {
                push("error", "Please wait for current transaction to complete", 3000);
                return;
              }
              if (!Number.isFinite(availableSpins) || availableSpins <= 0) {
                push("error", "No spins available. Please buy spins with GM.", 3000);
                setSpinsAmount(1);
                setIsBuySpinsOpen(true);
                setTxStatus("idle");
                return;
              }
              if (isSpinning) {
                push("error", "Wheel is currently spinning, please wait", 3000);
                return;
              }
              if (!connected) {
                push("error", "Please connect your wallet first", 3000);
                return;
              }
              if (!isReady) {
                push("error", "System is initializing, please wait", 3000);
                return;
              }
              push("error", "Cannot spin at this time", 3000);
            }}
          />

          <div className="spin-section">
            <h4>🎮 SPIN WHEEL</h4>
            <TypingButton
              className="btn btn-primary"
              onClick={() => {
                setSpinsAmount(1);
                setIsBuySpinsOpen(true);
                setTxStatus("idle");
              }}
              disabled={!connected || !isCorrectNetwork || isBuyingSpins || txStatus === "pending"}
              typingSpeed={20}
            >
              {txStatus === "pending" ? "⏳ Processing..." : "🔥 Buy Spins (GM)"}
            </TypingButton>
          </div>

          {showRecentSpin && (
            <div className="result-display show">
              <div className="result-title">🎰 Spin Result</div>
              <div className="result-prize">{spinResult}</div>
              <div className="result-message">{spinMessage}</div>
              {txStatus === "error" && <div style={{ color: "#f88" }}>{errorMessage}</div>}
            </div>
          )}
          {/* Removed Last slot display for cleaner UI */}
        </div>
      </div>

      <div className="sidebar">
        <div className="card">
          <h3>🔐 Your Balance</h3>
          <div className="balance-item">
            <span>GMToken Balance:</span>
            <span className="balance-value gm">{gmBalance}</span>
          </div>
          <div className="balance-item">
            <span>Pending ETH:</span>
            <span className="balance-value eth">{pendingEthLoading ? "…" : ethBalance.toFixed(6)}</span>
          </div>

          <div className="balance-item" style={{ gap: 8, alignItems: "center", marginTop: 8 }}>
            <input
              type="number"
              placeholder="Amount to claim"
              min={0}
              step={0.000001}
              value={claimAmount}
              onChange={(e) => setClaimAmount(e.target.value)}
              style={{
                flex: 1,
                padding: 8,
                borderRadius: 6,
                border: "none",
                background: "rgba(255,255,255,0.1)",
                color: "white",
              }}
            />
            <button
              className="btn btn-secondary"
              onClick={() => setClaimAmount(ethBalance > 0 ? String(ethBalance) : "")}
              disabled={ethBalance <= 0 || txStatus === "pending"}
            >
              MAX
            </button>
          </div>
          <div style={{ marginTop: 8 }}>
            <TypingButton
              className="btn btn-primary"
              onClick={handleClaimETH}
              title="Claim ETH from pending balance"
              disabled={!connected || !isReady || !isCorrectNetwork || txStatus === "pending" || ethBalance <= 0}
              typingSpeed={25}
              style={{ width: "100%" }}
            >
              {txStatus === "pending" ? "⏳ Claiming..." : "💰 Claim ETH"}
            </TypingButton>
          </div>
          {/* Unlock button removed */}
        </div>

        <div className="card">
          <h3 style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <span>🏆 Leaderboard</span>
            <div style={{ display: "flex", gap: 8 }}>
              <TypingButton
                className="btn btn-secondary"
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 18,
                  padding: 0,
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 16,
                }}
                title="Test Contract"
                aria-label="Test contract"
                onClick={async () => {
                  try {
                    console.log("🧪 Testing contract functions...");

                    // Test basic contract functions
                    const contract = (fheUtils as any)?.contract;
                    if (!contract) {
                      console.error("❌ No contract available");
                      return;
                    }

                    // Test 1: Check if contract is deployed
                    const owner = await contract.owner();
                    console.log("✅ Contract owner:", owner);

                    // Test 2: Check if user is initialized
                    const isInit = await contract.isInitialized(account);
                    console.log("✅ User initialized:", isInit);

                    // Test 3: Check if score is published
                    const isPublished = await contract.isScorePublished(account);
                    console.log("✅ Score published:", isPublished);

                    // Test 4: Try to get encrypted score
                    try {
                      const score = await contract.getEncryptedScore(account);
                      console.log("✅ Encrypted score:", score);
                    } catch (e) {
                      console.warn("⚠️ Could not get encrypted score:", e);
                    }

                    // Test 5: Check if publishScore function exists
                    try {
                      const hasPublishScore = typeof contract.publishScore === "function";
                      console.log("✅ publishScore function exists:", hasPublishScore);

                      if (hasPublishScore) {
                        // Test 6: Try to estimate gas for publishScore
                        try {
                          const zeroScore = "0x0000000000000000000000000000000000000000000000000000000000000000";
                          const gasEstimate = await contract.publishScore.estimateGas(zeroScore);
                          console.log("✅ publishScore gas estimate:", gasEstimate.toString());
                        } catch (gasError) {
                          console.warn("⚠️ publishScore gas estimate failed:", gasError);
                        }
                      }
                    } catch (e) {
                      console.warn("⚠️ Could not check publishScore function:", e);
                    }

                    push("success", "✅ Contract test completed - check console", 10000);
                  } catch (e) {
                    console.error("❌ Contract test failed:", e);
                    push("error", "Contract test failed", 3000);
                  }
                }}
                disabled={txStatus === "pending"}
                typingSpeed={15}
              >
                {txStatus === "pending" ? "⏳" : "🧪"}
              </TypingButton>
              <TypingButton
                className="btn btn-secondary"
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 18,
                  padding: 0,
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 16,
                }}
                title="Refresh"
                aria-label="Refresh leaderboard"
                onClick={loadLeaderboard}
                disabled={txStatus === "pending"}
                typingSpeed={15}
              >
                {txStatus === "pending" ? "⏳" : "🔄"}
              </TypingButton>
              <TypingButton
                className="btn btn-secondary"
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 18,
                  padding: 0,
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 16,
                }}
                title="Publish score"
                aria-label="Publish score"
                onClick={async () => {
                  try {
                    // ✅ SỬA: Kiểm tra đang processing không
                    if (txStatus === "pending") {
                      push("error", "Please wait for current transaction to complete", 3000);
                      return;
                    }

                    // ✅ FIXED: Kiểm tra FHE Utils đã sẵn sàng chưa
                    if (!fheUtils) {
                      push("error", "System is still initializing, please wait a moment", 3000);
                      return;
                    }

                    // TỐI ƯU: Set pending ngay lập tức khi click
                    setTxStatus("pending");

                    requireReady();
                    const toastId = push("pending", "📢 Publishing encrypted score...");

                    // ✅ FIXED: Try to publish score (even if 0)
                    let encryptedScore;
                    if (
                      encryptedHandles?.scoreEnc &&
                      encryptedHandles.scoreEnc !== "0x0000000000000000000000000000000000000000000000000000000000000000"
                    ) {
                      encryptedScore = encryptedHandles.scoreEnc;
                    } else {
                      // Create a new encrypted score using FHE SDK
                      try {
                        const currentScore = userData?.score || 0;
                        // Use SDK to create encrypted input
                        const builder = fheUtils.sdk.createEncryptedInput(
                          fheUtils.contract.target as string,
                          await fheUtils.signer.getAddress(),
                        );
                        builder.addEuint64("score", currentScore);
                        const { handles } = await builder.encrypt();
                        encryptedScore = handles[0];
                      } catch (encryptError) {
                        encryptedScore = "0x0000000000000000000000000000000000000000000000000000000000000000";
                      }
                    }

                    // ✅ FIXED: Try different approaches to call publishScore
                    let tx;
                    try {
                      // Method 1: Direct call without estimateGas
                      if (!(fheUtils as any)?.contract?.publishScore) {
                        throw new Error("publishScore function not found on contract");
                      }
                      tx = await (fheUtils as any).contract.publishScore(encryptedScore, {
                        gasLimit: 500_000,
                        maxFeePerGas: ethers.parseUnits("50", "gwei"),
                      });
                    } catch (directError) {
                      // Method 2: Try with different gas settings
                      try {
                        tx = await (fheUtils as any).contract.publishScore(encryptedScore, {
                          gasLimit: 1_000_000,
                          maxFeePerGas: ethers.parseUnits("100", "gwei"),
                        });
                      } catch (highGasError) {
                        // Method 3: Try with zero score
                        try {
                          const zeroScore = "0x0000000000000000000000000000000000000000000000000000000000000000";
                          tx = await (fheUtils as any).contract.publishScore(zeroScore, {
                            gasLimit: 500_000,
                            maxFeePerGas: ethers.parseUnits("50", "gwei"),
                          });
                        } catch (zeroError) {
                          throw new Error("Contract function not available - please check contract deployment");
                        }
                      }
                    }
                    await tx.wait();
                    update(toastId, "success", "✅ Score published to leaderboard successfully!", 10000);
                    setTxStatus("idle"); // ✅ SỬA: Reset txStatus về idle
                    loadLeaderboard();
                  } catch (e: any) {
                    setTxStatus("error"); // ✅ SỬA: Set error status nếu fail
                    console.error("Publish score error:", e);

                    // ✅ IMPROVED: Better error handling
                    let errorMsg = "Publish failed";
                    if (e?.message?.includes("FHE Utils not initialized")) {
                      errorMsg = "System is still initializing, please wait a moment";
                    } else if (
                      e?.message?.includes("execution reverted") ||
                      e?.message?.includes("missing revert data")
                    ) {
                      errorMsg =
                        "Account not initialized - please perform any action first (buy GM tokens, daily check-in, or buy spins)";
                    } else if (e?.message?.includes("missing revert data")) {
                      errorMsg = "Transaction failed - please try again";
                    } else {
                      errorMsg = "Publish failed - please try again";
                    }

                    push("error", errorMsg, 4000);
                  } finally {
                    // ✅ SỬA: Đảm bảo reset txStatus
                    setTimeout(() => {
                      setTxStatus("idle");
                    }, 100);
                  }
                }}
                disabled={!connected || !isCorrectNetwork || !fheUtils || txStatus === "pending"}
                typingSpeed={15}
              >
                {txStatus === "pending" ? "⏳" : "📢"}
              </TypingButton>
              <TypingButton
                className="btn btn-danger"
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 18,
                  padding: 0,
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 16,
                }}
                title="Unpublish score"
                aria-label="Unpublish score"
                onClick={async () => {
                  try {
                    // ✅ SỬA: Kiểm tra đang processing không
                    if (txStatus === "pending") {
                      push("error", "Please wait for current transaction to complete", 3000);
                      return;
                    }

                    // TỐI ƯU: Set pending ngay lập tức khi click
                    setTxStatus("pending");

                    requireReady();
                    const toastId = push("pending", "🙈 Unpublishing score...");
                    const tx = await (fheUtils as any).contract.unpublishScore();
                    await tx.wait();
                    update(toastId, "success", "✅ Score unpublished successfully!", 10000);
                    setTxStatus("idle"); // ✅ SỬA: Reset txStatus về idle
                    loadLeaderboard();
                  } catch (e) {
                    setTxStatus("error"); // ✅ SỬA: Set error status nếu fail
                    push("error", "Unpublish failed", 3000);
                  }
                }}
                disabled={!connected || !isCorrectNetwork || !fheUtils || txStatus === "pending"}
                typingSpeed={15}
              >
                {txStatus === "pending" ? "⏳" : "🙈"}
              </TypingButton>
            </div>
          </h3>

          <div style={{ maxHeight: 300, overflowY: "auto", borderRadius: 8, background: "rgba(255,255,255,0.06)" }}>
            {/* Debug info */}
            <div
              style={{ padding: 8, fontSize: "0.8rem", opacity: 0.6, borderBottom: "1px solid rgba(255,255,255,0.1)" }}
            >
              📊 Leaderboard: {leaderboard.length} entries | Contract: {CONFIG.FHEVM_CONTRACT_ADDRESS?.slice(0, 10)}...
              {txStatus === "pending" && (
                <button
                  onClick={() => setTxStatus("idle")}
                  style={{
                    marginLeft: 8,
                    padding: "2px 6px",
                    fontSize: "0.7rem",
                    background: "rgba(255,0,0,0.2)",
                    border: "1px solid rgba(255,0,0,0.3)",
                    borderRadius: 4,
                    color: "white",
                    cursor: "pointer",
                  }}
                  title="Reset stuck transaction status"
                >
                  🔄 Reset
                </button>
              )}
            </div>

            {leaderboard.length === 0 ? (
              <div style={{ padding: 12, opacity: 0.7 }}>
                No public scores
                <br />
                <small style={{ opacity: 0.5 }}>
                  Click 🧪 to test loading
                  {gmBalance === 0 && (
                    <>
                      <br />
                      <span style={{ color: "#FFD700" }}>
                        💡 New contract: Buy GM tokens first to initialize your account
                      </span>
                    </>
                  )}
                  {gmBalance === 0 && publishedScore > 0 && (
                    <>
                      <br />
                      <span style={{ color: "#FF6B6B" }}>
                        ⚠️ You have a score but need to initialize your account first
                      </span>
                    </>
                  )}
                  {gmBalance === 0 && publishedScore > 0 && (
                    <>
                      <br />
                      <span style={{ color: "#4CAF50", fontWeight: "bold" }}>
                        ✅ Solution: Initialize your account first, then publish score
                      </span>
                      <br />
                      <div style={{ marginTop: 8, display: "flex", gap: 8, flexWrap: "wrap" }}>
                        <button
                          className="btn btn-primary"
                          style={{
                            fontSize: "0.8rem",
                            padding: "4px 8px",
                            background: "rgba(76,175,80,0.2)",
                            border: "1px solid rgba(76,175,80,0.5)",
                          }}
                          onClick={() => {
                            setBuyEthAmount("0.001"); // Set minimum amount
                            // Scroll to buy GM tokens section
                            document.querySelector(".card h3")?.scrollIntoView({ behavior: "smooth" });
                          }}
                        >
                          💰 Buy GM Tokens (0.001 ETH)
                        </button>
                        <button
                          className="btn btn-secondary"
                          style={{
                            fontSize: "0.8rem",
                            padding: "4px 8px",
                            background: "rgba(33,150,243,0.2)",
                            border: "1px solid rgba(33,150,243,0.5)",
                          }}
                          onClick={() => {
                            // Scroll to daily check-in section
                            document.querySelectorAll(".card h3")[2]?.scrollIntoView({ behavior: "smooth" });
                          }}
                        >
                          ☀️ Daily Check-in
                        </button>
                      </div>
                    </>
                  )}
                  {gmBalance > 0 && publishedScore > 0 && (
                    <>
                      <br />
                      <span style={{ color: "#FF6B6B", fontWeight: "bold" }}>
                        ⚠️ Public decrypt failed - scores may not be properly published
                      </span>
                      <br />
                      <span style={{ color: "#4CAF50", fontWeight: "bold" }}>
                        ✅ Solution: Click 📢 to publish your score first
                      </span>
                    </>
                  )}
                </small>
              </div>
            ) : (
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr style={{ position: "sticky", top: 0, background: "rgba(0,0,0,0.25)" }}>
                    <th style={{ textAlign: "center", width: 56, padding: "10px 12px", fontWeight: 600 }}>Rank</th>
                    <th style={{ textAlign: "left", padding: "10px 12px", fontWeight: 600 }}>Player</th>
                    <th style={{ textAlign: "right", padding: "10px 12px", fontWeight: 600 }}>Score</th>
                  </tr>
                </thead>
                <tbody>
                  {leaderboard.map((item, idx) => {
                    const isMe = item.address?.toLowerCase?.() === account?.toLowerCase?.();
                    const rank = idx + 1;
                    const medal = rank === 1 ? "🥇" : rank === 2 ? "🥈" : rank === 3 ? "🥉" : null;
                    const rowBg = isMe ? "rgba(76,175,80,0.15)" : rank <= 3 ? "rgba(255,215,0,0.10)" : "transparent";
                    // Leaderboard only contains published entries → show short address
                    const display = `${item.address.slice(0, 6)}…${item.address.slice(-4)}`;
                    const badgeStyle: React.CSSProperties = {
                      display: "inline-flex",
                      alignItems: "center",
                      justifyContent: "center",
                      width: 32,
                      height: 32,
                      borderRadius: 16,
                      fontWeight: 700,
                      background: medal ? "transparent" : "rgba(255,255,255,0.1)",
                    };
                    return (
                      <tr key={item.address + idx} style={{ background: rowBg }}>
                        <td style={{ padding: "10px 12px", textAlign: "center" }}>
                          {medal ? (
                            <span style={{ fontSize: 18 }}>{medal}</span>
                          ) : (
                            <span style={badgeStyle}>{rank}</span>
                          )}
                        </td>
                        <td style={{ padding: "10px 12px", fontFamily: "monospace" }} title={item.address}>
                          {isMe ? "You" : display}
                        </td>
                        <td style={{ padding: "10px 12px", textAlign: "right", fontWeight: 600 }}>
                          {item.isDecrypted ? (
                            <span style={{ color: "#4CAF50" }}>{item.score}</span>
                          ) : (
                            <span style={{ color: "rgba(255,255,255,0.5)", fontStyle: "italic" }}>🔒 Private</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>

      {isBuySpinsOpen && (
        <div
          className="modal"
          onClick={(e) => {
            if (!isBuyingSpins && e.currentTarget === e.target) setIsBuySpinsOpen(false);
          }}
        >
          <div className="modal-content">
            <span
              className="close-btn"
              onClick={() => {
                if (!isBuyingSpins) setIsBuySpinsOpen(false);
              }}
            >
              &times;
            </span>
            <h3>🔥 Buy Spins (use GM)</h3>
            <div className="input-group">
              <label>Number of Spins:</label>
              <div className="input-row">
                <input
                  type="number"
                  placeholder="1"
                  min={1}
                  step={1}
                  value={spinsAmount}
                  onChange={(e) => setSpinsAmount(Math.max(1, Number(e.target.value)))}
                />
                <button className="btn-max" onClick={() => setSpinsAmount(Math.max(1, maxSpinsAvailable))}>
                  MAX
                </button>
              </div>
              <div className="info-text">Cost: {spinsAmount * 10} GM</div>
            </div>
            <div className="modal-buttons">
              <TypingButton
                className="btn btn-secondary"
                onClick={() => setIsBuySpinsOpen(false)}
                disabled={isBuyingSpins || txStatus === "pending"}
                typingSpeed={20}
              >
                Cancel
              </TypingButton>
              <TypingButton
                className="btn btn-primary"
                onClick={async () => {
                  try {
                    // ✅ SỬA: Kiểm tra đang processing không
                    if (txStatus === "pending") {
                      push("error", "Please wait for current transaction to complete", 3000);
                      return;
                    }

                    requireReady();
                    const requiredGm = spinsAmount * 10;
                    if ((gmBalance || 0) < requiredGm) {
                      throw new Error(`Not enough GM (need ${requiredGm})`);
                    }
                    if (!spinsAmount || spinsAmount < 1) throw new Error("Invalid spins amount");

                    showPending(`🔥 Buying ${spinsAmount} spins with GM...`);
                    setIsBuyingSpins(true);
                    setTxStatus("pending");

                    await fheUtils!.buySpinWithGm(spinsAmount);

                    showSuccess(`✅ Successfully bought ${spinsAmount} spins!`);
                    setTxStatus("idle"); // ✅ SỬA: Reset về idle thay vì success
                    setSpinMessage(`Bought ${spinsAmount} spin(s) with GM`);
                    setIsBuySpinsOpen(false);

                    // Strict: do not update local balances; reload from on-chain only
                    setTimeout(
                      () => {
                        try {
                          (reloadUserState as any)?.(true, true);
                        } catch {}
                      },
                      (CONFIG as any).DEMO?.FHE_WAIT_MS ? Number((CONFIG as any).DEMO?.FHE_WAIT_MS) : 300,
                    );
                  } catch (e: any) {
                    setTxStatus("error");
                    setErrorMessage(e?.message || String(e));
                    showError(`❌ Failed to buy spins: ${e?.message || String(e)}`);
                  } finally {
                    setIsBuyingSpins(false);
                  }
                }}
                disabled={!connected || !isReady || !isCorrectNetwork || txStatus === "pending" || isBuyingSpins}
                typingSpeed={20}
              >
                {isBuyingSpins || txStatus === "pending" ? "Pending..." : "🔥 Buy Spins"}
              </TypingButton>
            </div>
          </div>
        </div>
      )}

      {/* Network Warning Modal */}
      {showNetworkWarning && (
        <NetworkWarning
          currentNetwork={currentNetwork}
          onSwitchNetwork={handleSwitchNetwork}
          onClose={() => setShowNetworkWarning(false)}
        />
      )}

      {/* Pending Transaction Modal */}
      <PendingTransaction
        isVisible={pendingState.isVisible}
        status={pendingState.status}
        message={pendingState.message}
        hash={pendingState.hash}
        onClose={hidePending}
      />

      <Toast toasts={toasts} onRemove={remove} />
    </div>
  );
};

export default App;
