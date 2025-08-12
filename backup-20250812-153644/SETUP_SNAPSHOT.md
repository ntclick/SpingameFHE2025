# Current Setup Snapshot (Frontend + FHE)

This document captures the important runtime configuration and UX/perf knobs as of now so you can quickly restore if
anything breaks later.

## Frontend environment and addresses

- Contract address (app): `CONFIG.FHEVM_CONTRACT_ADDRESS`
  - Current default in code: `0xD974B2200fb2723DC2Df33fbCDab52475FC563D5`
- Network (Sepolia)
  - `CONFIG.NETWORK.CHAIN_ID`: `11155111`
  - `CONFIG.NETWORK.RPC_URL`: from `REACT_APP_SEPOLIA_RPC_URL` or default Alchemy URL
- Relayer URL
  - `CONFIG.RELAYER.URL`: `REACT_APP_RELAYER_URL` (prefer) → fallback dev `/relayer` →
    `https://relayer.testnet.zama.cloud`
- Zama system contracts (Sepolia)
  - ACL: `0x687820221192C5B662b25367F70076A37bc79b6c`
  - Decryption verifying address: `0xb6E160B1ff80D67Bfe90A85eE06Ce0A2613607D1`
  - Input verifier: `0xbc91f3daD1A5F19F8390c400196e58073B6a0BC4`
  - KMS verifier: `0x1364cBBf2cDF5032C47d8226a6f6FBD2AFCDacAC`
- Gateway chain id (required by relayer SDK)
  - From `REACT_APP_GATEWAY_CHAIN_ID` (set appropriately, e.g. `55815` for Zama test relayer)

## SDK and proxy

- SDK: UMD global loaded in `index.html` (window.ZamaRelayerSDK)
- `src/hooks/useFheSdk.ts`
  - Calls `sdk.initSDK()` then `sdk.createInstance({...})` with values above
- Dev proxy: `src/setupProxy.js` strips `/relayer` → upstream sees `/v1/...`

## FHE decrypt policy

- User-decrypt only (no publicDecrypt fallback)
- UDSIG cached in localStorage; requested once per session

## UX/performance knobs

- One-time trial spin: on first visit per device/account, auto grant +1 spin via `dailyGm` if `canCheckin` and spins = 0
  - LocalStorage flag: `gmspin:trial:<contract>:<account>` = `1`
- Default buy amount: `0.01` ETH
- After spin: only reload data after `settlePrize` tx confirms (no early reload)
- Keep numbers visible during background refresh (don’t flash "…" after first load)

### Data loading throttle/cache (src/hooks/useUserGameState.ts)

- MIN_RELOAD_INTERVAL_MS: `3000` (was 8000)
- CACHE_TTL_MS: `15000` (was 60000)
- Background refresh scheduled when version unchanged (non-blocking)

## Theme

- Active: Neutral Dark (low eye strain)
  - `src/App.css` design tokens (current):

```css
:root {
  --bg-start: #0f172a; /* slate-900 */
  --bg-end: #111827; /* gray-900 */
  --text-primary: #e5e7eb;
  --text-muted: rgba(229, 231, 235, 0.85);
  --text-dim: rgba(229, 231, 235, 0.6);
  --glass-bg: rgba(255, 255, 255, 0.06);
  --glass-strong: rgba(255, 255, 255, 0.08);
  --glass-panel: rgba(255, 255, 255, 0.06);
  --glass-border: rgba(255, 255, 255, 0.12);
  --btn-border: rgba(255, 255, 255, 0.28);
  --btn-border-weak: rgba(255, 255, 255, 0.22);
}
```

- Previous: Yellow–Black (Zama-themed)

```css
:root {
  --bg-start: #ffd400;
  --bg-end: #ffb300;
  --text-primary: #ffffff;
  --text-muted: rgba(255, 255, 255, 0.9);
  --text-dim: rgba(255, 255, 255, 0.7);
  --glass-bg: rgba(0, 0, 0, 0.28);
  --glass-strong: rgba(0, 0, 0, 0.32);
  --glass-panel: rgba(0, 0, 0, 0.22);
  --glass-border: rgba(0, 0, 0, 0.35);
  --btn-border: rgba(255, 255, 255, 0.6);
  --btn-border-weak: rgba(255, 255, 255, 0.45);
}
```

## How to restore quickly

1. Addresses/Relayer
   - Update `frontend-fhe-spin/src/config.ts` or `.env*`:
     - `REACT_APP_FHEVM_CONTRACT_ADDRESS`
     - `REACT_APP_RELAYER_URL`
     - `REACT_APP_GATEWAY_CHAIN_ID`
     - `REACT_APP_SEPOLIA_RPC_URL`

2. Data throttling
   - In `src/hooks/useUserGameState.ts` you can revert:
     - `MIN_RELOAD_INTERVAL_MS` back to `8000`
     - `CACHE_TTL_MS` back to `60000`

3. Spin flow
   - `src/App.tsx`: reload only after `settlePrize` (current). To revert to earlier eager reload, re-add a
     `reloadUserState()` right after `fheUtils.spin()` resolves.

4. Trial spin
   - Remove the trial logic by deleting the effect that calls `tryGrantTrialSpin` (search for `gmspin:trial:` key) if
     you want to disable.

5. Theme
   - Switch the `:root` token block in `src/App.css` to the previous palette above (or copy from
     `frontend-fhe-spin/src/theme-presets.css`).

This file is meant as a living snapshot; append changes as you tweak the setup.
