export const config = {
  walletUrl: import.meta.env.VITE_WALLET_URL ?? 'http://localhost:5173/auth',
  audience: import.meta.env.VITE_AUDIENCE ?? window.location.origin,
};
