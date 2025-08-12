### Zama Relayer SDK Initialization – Troubleshooting & Fixes

- **Root cause**: SDK initialization failed due to incorrect config keys and missing WASM init. Error observed: "KMS
  contract address is not valid or empty".
- **Fix summary**:
  - Call `initSDK()` before `createInstance`.
  - Use the documented config keys for Sepolia.
  - Ensure bundler/browser fallbacks for WASM and Node core modules when needed.

### Correct initialization (keys per docs)

```ts
// Keys expected by @zama-fhe/relayer-sdk createInstance
{
  // FHEVM Host chain contracts (Sepolia)
  aclContractAddress: <ACL_CONTRACT_ADDRESS>,
  kmsContractAddress: <KMS_VERIFIER_CONTRACT_ADDRESS>,
  inputVerifierContractAddress: <INPUT_VERIFIER_CONTRACT_ADDRESS>,

  // Gateway (verifying) contracts (Zama testnet)
  verifyingContractAddressDecryption: <DECRYPTION_ADDRESS>,
  verifyingContractAddressInputVerification: <INPUT_VERIFICATION_ADDRESS>,

  // Chain IDs
  chainId: 11155111,         // Sepolia (host)
  gatewayChainId: 55815,     // Zama gateway

  // Network & Relayer
  network: <SEPOLIA_RPC_URL>,
  relayerUrl: <RELAYER_URL>,
}
```

In code we now do:

- `await sdk.initSDK()` to load WASM
- `await sdk.createInstance(instanceConfig)` with the exact keys above

### Bundler/WASM requirements (when applicable)

- If you see `Can't resolve 'tfhe_bg.wasm'`, add a resolve fallback:

```js
resolve: {
  fallback: {
    'tfhe_bg.wasm': require.resolve('tfhe/tfhe_bg.wasm'),
  },
},
```

- For browser fallbacks to Node core modules:

```js
resolve: {
  fallback: {
    buffer: require.resolve('buffer/'),
    crypto: require.resolve('crypto-browserify'),
    stream: require.resolve('stream-browserify'),
    path: require.resolve('path-browserify'),
  },
},
```

- If ESM/SSR bundling is problematic, prefer the web/bundle entry or the UMD/ESM CDN builds.

### Minimal working flows (from docs)

- Web/bundle flow:

```ts
import { initSDK, createInstance, SepoliaConfig } from "@zama-fhe/relayer-sdk/bundle";

await initSDK();
const config = { ...SepoliaConfig, network: window.ethereum };
const instance = await createInstance(config);
```

- npm package (web entry) flow (what we use):

```ts
import * as sdk from "@zama-fhe/relayer-sdk/web";
await sdk.initSDK();
const instance = await sdk.createInstance(instanceConfig);
```

### References

- Web applications:
  [docs.zama.ai – Web applications](https://docs.zama.ai/protocol/relayer-sdk-guides/development-guide/webapp)
- Debugging & bundlers:
  [docs.zama.ai – Debugging](https://docs.zama.ai/protocol/relayer-sdk-guides/development-guide/webpack)
- Initialization & SepoliaConfig:
  [docs.zama.ai – Initialization](https://docs.zama.ai/protocol/relayer-sdk-guides/fhevm-relayer/initialization)

### Checklist

- [x] `initSDK()` called once before `createInstance`
- [x] Using keys: `aclContractAddress`, `kmsContractAddress`, `inputVerifierContractAddress`,
      `verifyingContractAddressDecryption`, `verifyingContractAddressInputVerification`, `chainId`, `gatewayChainId`,
      `network`, `relayerUrl`
- [x] `kmsContractAddress` points to KMS Verifier on Sepolia
- [x] `chainId=11155111`, `gatewayChainId=55815`
- [x] `network` is a valid Sepolia RPC URL
- [x] Relayer URL correct (testnet)
- [x] WASM/ESM bundling handled (if bundling errors appear)

### "Buffer is not defined" – Browser polyfills

- Cause: Node's `Buffer` (and other core modules) aren't available in browsers. The SDK or its deps use them.
- Fix (Webpack/CRA): Add browser fallbacks and ProvidePlugin.

Steps applied in this repo:

1. Installed fallbacks (package.json): `buffer`, `crypto-browserify`, `stream-browserify`, `path-browserify`, `process`,
   `assert`, `util`, `url`.
2. `config-overrides.js` (CRA):

```js
const webpack = require("webpack");
config.resolve.fallback = {
  ...(config.resolve.fallback || {}),
  buffer: require.resolve("buffer/"),
  crypto: require.resolve("crypto-browserify"),
  stream: require.resolve("stream-browserify"),
  util: require.resolve("util/"),
  assert: require.resolve("assert/"),
  url: require.resolve("url/"),
  path: require.resolve("path-browserify"),
};
config.plugins.push(new webpack.ProvidePlugin({ Buffer: ["buffer", "Buffer"], process: ["process"] }));
```

3. Ensure `global` and `process` are defined in `src/index.tsx` (already present).

Refs:

- Debugging: https://docs.zama.ai/protocol/relayer-sdk-guides/development-guide/webpack
- Web applications: https://docs.zama.ai/protocol/relayer-sdk-guides/development-guide/webapp

After changes: reinstall deps and restart dev server.
