import React from "react";
import "./PendingTransaction.css";

export interface PendingTransactionProps {
  isVisible: boolean;
  status: "pending" | "success" | "error";
  message: string;
  hash?: string;
  onClose: () => void;
}

const PendingTransaction: React.FC<PendingTransactionProps> = ({ isVisible, status, message, hash, onClose }) => {
  if (!isVisible) return null;

  const getStatusIcon = () => {
    switch (status) {
      case "pending":
        return "⏳";
      case "success":
        return "✅";
      case "error":
        return "❌";
      default:
        return "⏳";
    }
  };

  const getStatusClass = () => {
    switch (status) {
      case "pending":
        return "pending";
      case "success":
        return "success";
      case "error":
        return "error";
      default:
        return "pending";
    }
  };

  return (
    <div className={`pending-transaction ${getStatusClass()}`}>
      <div className="pending-content">
        <div className="pending-header">
          <span className="status-icon">{getStatusIcon()}</span>
          <span className="status-text">
            {status === "pending" && "⏳ Transaction processing..."}
            {status === "success" && "✅ Transaction successful!"}
            {status === "error" && "❌ Transaction failed!"}
          </span>
          <button className="close-btn" onClick={onClose}>
            ✕
          </button>
        </div>
        <div className="pending-message">{message}</div>
        {hash && (
          <div className="transaction-hash">
            <span>Hash: </span>
            <a
              href={`https://sepolia.etherscan.io/tx/${hash}`}
              target="_blank"
              rel="noopener noreferrer"
              className="hash-link"
            >
              {hash.slice(0, 10)}...{hash.slice(-8)}
            </a>
          </div>
        )}
        {status === "pending" && (
          <div className="loading-spinner">
            <div className="spinner"></div>
          </div>
        )}
      </div>
    </div>
  );
};

export default PendingTransaction;
