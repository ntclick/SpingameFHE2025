import { ethers } from "ethers";

// ✅ Configuration sử dụng environment variables từ .env file (REACT_APP prefix)
export const CONFIG = {
  // ✅ FHEVM Contract Configuration - LuckySpinFHE_KMS_Final (Updated with new deployment)
  FHEVM_CONTRACT_ADDRESS: process.env.REACT_APP_FHEVM_CONTRACT_ADDRESS || "0x185ecaFE1f99B3771E230A01bf519971Dd8c395a",

  // ✅ Alternative contract addresses for testing
  ALTERNATIVE_CONTRACT_ADDRESSES: [],

  // ✅ FHEVM System Contract Addresses (Sepolia Testnet)
  FHEVM: {
    EXECUTOR_CONTRACT_ADDRESS: process.env.REACT_APP_EXECUTOR_CONTRACT || "0x848B0066793BcC60346Da1F49049357399B8D595",
    ACL_CONTRACT_ADDRESS: process.env.REACT_APP_ACL_CONTRACT || "0x687820221192C5B662b25367F70076A37bc79b6c",
    HCU_LIMIT_CONTRACT_ADDRESS:
      process.env.REACT_APP_HCU_LIMIT_CONTRACT || "0x594BB474275918AF9609814E68C61B1587c5F838",
    KMS_VERIFIER_CONTRACT_ADDRESS:
      process.env.REACT_APP_KMS_VERIFIER_CONTRACT || "0x1364cBBf2cDF5032C47d8226a6f6FBD2AFCDacAC",
    KMS_CONTRACT_ADDRESS: process.env.REACT_APP_KMS_VERIFIER_CONTRACT || "0x1364cBBf2cDF5032C47d8226a6f6FBD2AFCDacAC", // ✅ Using KMS verifier as KMS
    INPUT_VERIFIER_CONTRACT_ADDRESS:
      process.env.REACT_APP_INPUT_VERIFIER_CONTRACT || "0xbc91f3daD1A5F19F8390c400196e58073B6a0BC4",
    DECRYPTION_ORACLE_CONTRACT_ADDRESS:
      process.env.REACT_APP_DECRYPTION_ORACLE_CONTRACT || "0xa02Cda4Ca3a71D7C46997716F4283aa851C28812",
    DECRYPTION_ADDRESS: process.env.REACT_APP_DECRYPTION_ADDRESS || "0xb6E160B1ff80D67Bfe90A85eE06Ce0A2613607D1",
    INPUT_VERIFICATION_ADDRESS:
      process.env.REACT_APP_INPUT_VERIFICATION_ADDRESS || "0x7048C39f048125eDa9d678AEbaDfB22F7900a29F",
  },

  // ✅ Network Configuration
  NETWORK: {
    CHAIN_ID: parseInt(process.env.REACT_APP_CHAIN_ID || "11155111"),
    GATEWAY_CHAIN_ID: parseInt(process.env.REACT_APP_GATEWAY_CHAIN_ID || "55815"),
    RPC_URL: process.env.REACT_APP_SEPOLIA_RPC_URL || "https://rpc.sepolia.org",
    EXPLORER_URL: `https://sepolia.etherscan.io`,
  },

  // ✅ Relayer Configuration
  RELAYER: {
    URL:
      // Force local proxy for development regardless of env var
      typeof window !== "undefined" && /localhost|127\.0\.0\.1/.test(window.location.hostname)
        ? "/relayer"
        : process.env.REACT_APP_RELAYER_URL || "https://relayer.testnet.zama.cloud",
  },

  // ✅ Backend Aggregator API (for API-first unified state)
  BACKEND_API_URL: process.env.REACT_APP_BACKEND_API_URL || "/api",

  // ✅ Attestor backend (optional) for claim signatures
  ATTESTOR_API_URL: process.env.REACT_APP_ATTESTOR_API_URL || "",

  // ✅ Game Configuration
  SPIN: {
    PRICE_PER_SPIN: parseFloat(process.env.REACT_APP_PRICE_PER_SPIN || "0.01"),
  },

  // ✅ GM Token Configuration
  GM_TOKEN_RATE: 1000, // 1 ETH = 1000 GM tokens (UI preview)

  // ✅ Demo behavior
  DEMO: {
    SLOW_LOAD: String(process.env.REACT_APP_DEMO_SLOW_LOAD || "false").toLowerCase() === "true",
    FHE_WAIT_MS: parseInt(process.env.REACT_APP_DEMO_FHE_WAIT_MS || "300"),
  },

  // ✅ API Keys
  ETHERSCAN_API_KEY: process.env.REACT_APP_ETHERSCAN_API_KEY || "",

  // ✅ Private Key (frontend should not ship a default private key)
  PRIVATE_KEY: process.env.REACT_APP_PRIVATE_KEY || "",

  // ✅ Additional Zama Contract Addresses
  ZAMA_STANDARD_CONTRACT_ADDRESS:
    process.env.REACT_APP_ZAMA_STANDARD_CONTRACT_ADDRESS || "0x62c1E5607077dfaB9Fee425a70707b545F565620",
  ZAMA_FHEVM_STANDARD_CONTRACT_ADDRESS_ALT:
    process.env.REACT_APP_ZAMA_FHEVM_STANDARD_CONTRACT_ADDRESS || "0xf72e7a878eCbF1d7C5aBbd283c10e82ddA58A721",
  // ✅ Strict FHE mode: when false, load fast from public logs first, then overlay FHE when ready
  STRICT_FHE_ONLY: String(process.env.REACT_APP_STRICT_FHE_ONLY || "true").toLowerCase() === "true",
};

// ✅ Wheel slots configuration với layout xen kẽ đẹp mắt
export const WHEEL_SLOTS: Array<{
  id: number;
  name: string;
  value: number;
  type: "eth" | "gm";
  color: string;
}> = [
  // Layout xen kẽ: 0.1 ETH → Empty → 0.01 ETH → 5 GM → Empty → 15 GM → Empty → 30 GM
  { id: 0, name: "ETH", value: 0.1, type: "eth", color: "#1E90FF" }, // 0.1 ETH (1% chance)
  { id: 1, name: "Empty", value: 0, type: "gm", color: "#FF6347" }, // Empty (14% chance)
  { id: 2, name: "ETH", value: 0.01, type: "eth", color: "#00BFFF" }, // 0.01 ETH (1% chance)
  { id: 3, name: "Empty", value: 0, type: "gm", color: "#ADFF2F" }, // Empty (14% chance)
  { id: 4, name: "Empty", value: 0, type: "gm", color: "#FFA500" }, // Empty (14% chance)
  { id: 5, name: "GM", value: 5, type: "gm", color: "#FFD700" }, // +5 GM (14% chance)
  { id: 6, name: "GM", value: 15, type: "gm", color: "#FF8C00" }, // +15 GM (14% chance)
  { id: 7, name: "GM", value: 30, type: "gm", color: "#32CD32" }, // +30 GM (14% chance)
];

// Mapping từ contract slot (0..7) -> display index (0..7) cho layout xen kẽ
// Contract: 0->0.1 ETH, 1->0.01 ETH, 2-4->Empty, 5->5 GM, 6->15 GM, 7->30 GM
// Display: 0.1 ETH → Empty → 0.01 ETH → Empty → Empty → 5 GM → 15 GM → 30 GM
export const SLOT_TO_DISPLAY_INDEX: number[] = [0, 2, 1, 3, 4, 5, 6, 7];

// Compute mapping từ contract slot (0..7) -> display index dựa trên WHEEL_SLOTS content
export function computeSlotMapping(slots = WHEEL_SLOTS): number[] {
  const findIndex = (predicate: (s: any) => boolean): number => slots.findIndex(predicate);

  // Tìm index của từng loại phần thưởng trong WHEEL_SLOTS
  const idxEth01 = findIndex((s) => s.name === "ETH" && s.value === 0.1); // 0.1 ETH
  const idxEth001 = findIndex((s) => s.name === "ETH" && s.value === 0.01); // 0.01 ETH
  const idxGm5 = findIndex((s) => s.name === "GM" && s.value === 5); // 5 GM
  const idxGm15 = findIndex((s) => s.name === "GM" && s.value === 15); // 15 GM
  const idxGm30 = findIndex((s) => s.name === "GM" && s.value === 30); // 30 GM

  // Tìm các slot Empty
  const emptyIdxs = slots
    .map((s, i) => ({ s, i }))
    .filter(({ s }) => s.name === "Empty")
    .map(({ i }) => i);
  const [idxEmpty1, idxEmpty2, idxEmpty3] = emptyIdxs;

  const map: number[] = [];
  // Contract slot 0 (0.1 ETH) -> Display index 0
  map[0] = idxEth01;
  // Contract slot 1 (0.01 ETH) -> Display index 2
  map[1] = idxEth001;
  // Contract slot 2 (Empty) -> Display index 1
  map[2] = idxEmpty1 ?? -1;
  // Contract slot 3 (Empty) -> Display index 3
  map[3] = idxEmpty2 ?? -1;
  // Contract slot 4 (Empty) -> Display index 4
  map[4] = idxEmpty3 ?? -1;
  // Contract slot 5 (5 GM) -> Display index 5
  map[5] = idxGm5;
  // Contract slot 6 (15 GM) -> Display index 6
  map[6] = idxGm15;
  // Contract slot 7 (30 GM) -> Display index 7
  map[7] = idxGm30;

  return map.map((v, i) => (typeof v === "number" && v >= 0 ? v : i));
}

// Production: avoid logging sensitive environment variables
