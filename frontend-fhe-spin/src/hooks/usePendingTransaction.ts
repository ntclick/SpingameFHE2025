import { useState, useCallback } from "react";

export interface PendingTransactionState {
  isVisible: boolean;
  status: "pending" | "success" | "error";
  message: string;
  hash?: string;
}

export const usePendingTransaction = () => {
  const [pendingState, setPendingState] = useState<PendingTransactionState>({
    isVisible: false,
    status: "pending",
    message: "",
    hash: undefined,
  });

  const showPending = useCallback((message: string) => {
    setPendingState({
      isVisible: true,
      status: "pending",
      message,
      hash: undefined,
    });
  }, []);

  const showSuccess = useCallback((message: string, hash?: string) => {
    setPendingState({
      isVisible: true,
      status: "success",
      message,
      hash,
    });
  }, []);

  const showError = useCallback((message: string, hash?: string) => {
    setPendingState({
      isVisible: true,
      status: "error",
      message,
      hash,
    });
  }, []);

  const hidePending = useCallback(() => {
    setPendingState((prev) => ({
      ...prev,
      isVisible: false,
    }));
  }, []);

  const updateHash = useCallback((hash: string) => {
    setPendingState((prev) => ({
      ...prev,
      hash,
    }));
  }, []);

  return {
    pendingState,
    showPending,
    showSuccess,
    showError,
    hidePending,
    updateHash,
  };
};
