/// <reference types="react-scripts" />

declare global {
  interface Window {
    ethereum?: {
      request: (args: { method: string; params?: any[] }) => Promise<any>;
      on: (eventName: string, handler: (...args: any[]) => void) => void;
      removeListener: (eventName: string, handler: (...args: any[]) => void) => void;
      isMetaMask?: boolean;
    };
    // ✅ UMD CDN SDK - theo tài liệu Zama
    relayerSDK?: any;
    ZamaRelayerSDK?: any;
  }
}

export {};
