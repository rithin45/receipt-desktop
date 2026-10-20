import { useState } from "react";
import {
  Settings as SettingsIcon,
  Database,
  ReceiptText,
  ShieldCheck,
  Trash2,
  AlertTriangle,
  CheckCircle2,
  Monitor,
  HardDrive,
} from "lucide-react";

import "./Settings.css";

export default function SettingsPage({
  receipts = [],
  onClearAll,
}) {
  const [showConfirm, setShowConfirm] = useState(false);
  const [confirmText, setConfirmText] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const handleClearAll = async () => {
    if (confirmText !== "DELETE") {
      setError('Type "DELETE" to confirm.');
      return;
    }

    if (typeof onClearAll !== "function") {
      setError("The delete function is not configured.");
      return;
    }

    setDeleting(true);
    setError("");
    setMessage("");

    try {
      await onClearAll();

      setMessage("All receipt records have been deleted.");
      setShowConfirm(false);
      setConfirmText("");
    } catch (err) {
      setError(err.message || "Failed to delete receipt records.");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="settings-page">
      <div className="settings-header">
        <div>
          <div className="settings-eyebrow">
            <SettingsIcon size={15} />
            APPLICATION CONFIGURATION
          </div>

          <h1>Settings</h1>

          <p>
            Manage your ReceiptPro application and local receipt data.
          </p>
        </div>

        <div className="settings-header-icon">
          <SettingsIcon size={25} />
        </div>
      </div>

      {message && (
        <div className="settings-alert settings-alert-success">
          <CheckCircle2 size={19} />
          <span>{message}</span>
          <button
            type="button"
            onClick={() => setMessage("")}
            aria-label="Dismiss message"
          >
            ×
          </button>
        </div>
      )}

      {error && (
        <div className="settings-alert settings-alert-error">
          <AlertTriangle size={19} />
          <span>{error}</span>
          <button
            type="button"
            onClick={() => setError("")}
            aria-label="Dismiss error"
          >
            ×
          </button>
        </div>
      )}

      {/* APPLICATION OVERVIEW */}
      <section className="settings-section">
        <div className="settings-section-heading">
          <div className="settings-section-icon">
            <Monitor size={20} />
          </div>

          <div>
            <h2>Application</h2>
            <p>Application information and current status.</p>
          </div>
        </div>

        <div className="settings-card">
          <div className="settings-info-row">
            <div className="settings-info-label">
              <span className="settings-info-icon">
                <ReceiptText size={18} />
              </span>

              <div>
                <h3>Application name</h3>
                <p>Your receipt management application</p>
              </div>
            </div>

            <span className="settings-value">ReceiptPro</span>
          </div>

          <div className="settings-divider" />

          <div className="settings-info-row">
            <div className="settings-info-label">
              <span className="settings-info-icon">
                <ShieldCheck size={18} />
              </span>

              <div>
                <h3>Application status</h3>
                <p>Receipt management system</p>
              </div>
            </div>

            <span className="settings-status">
              <span />
              Active
            </span>
          </div>
        </div>
      </section>

      {/* DATABASE */}
      <section className="settings-section">
        <div className="settings-section-heading">
          <div className="settings-section-icon">
            <Database size={20} />
          </div>

          <div>
            <h2>Database & Storage</h2>
            <p>Information about your locally stored receipt data.</p>
          </div>
        </div>

        <div className="settings-stats-grid">
          <div className="settings-stat-card">
            <div className="settings-stat-top">
              <span>Total receipts</span>

              <span className="settings-stat-icon">
                <ReceiptText size={19} />
              </span>
            </div>

            <strong>{receipts.length}</strong>

            <p>Currently loaded receipt records</p>
          </div>

          <div className="settings-stat-card">
            <div className="settings-stat-top">
              <span>Storage type</span>

              <span className="settings-stat-icon">
                <HardDrive size={19} />
              </span>
            </div>

            <strong>SQLite</strong>

            <p>Local database on this computer</p>
          </div>
        </div>

        <div className="settings-card settings-storage-card">
          <div className="settings-storage-indicator">
            <Database size={22} />
          </div>

          <div className="settings-storage-content">
            <h3>Local database</h3>

            <p>
              Your receipts are stored in a local SQLite database managed
              by Electron. They remain available when you restart the
              application.
            </p>

            <div className="settings-storage-tags">
              <span>SQLite</span>
              <span>Local storage</span>
              <span>Offline capable</span>
            </div>
          </div>
        </div>
      </section>

      {/* DATA MANAGEMENT */}
      <section className="settings-section">
        <div className="settings-section-heading">
          <div className="settings-section-icon">
            <ShieldCheck size={20} />
          </div>

          <div>
            <h2>Data Management</h2>
            <p>Manage your saved receipt records.</p>
          </div>
        </div>

        <div className="settings-danger-card">
          <div className="settings-danger-icon">
            <Trash2 size={22} />
          </div>

          <div className="settings-danger-content">
            <h3>Clear all receipts</h3>

            <p>
              Permanently delete all saved receipts from the local
              database. This action cannot be undone.
            </p>

            {!showConfirm ? (
              <button
                type="button"
                className="settings-danger-button"
                onClick={() => {
                  setShowConfirm(true);
                  setConfirmText("");
                  setError("");
                  setMessage("");
                }}
                disabled={receipts.length === 0}
              >
                <Trash2 size={16} />
                Clear all receipts
              </button>
            ) : (
              <div className="settings-confirm-box">
                <div className="settings-confirm-warning">
                  <AlertTriangle size={19} />

                  <div>
                    <strong>Are you absolutely sure?</strong>

                    <p>
                      This will permanently delete all receipt records.
                      Your database structure will remain intact.
                    </p>
                  </div>
                </div>

                <label htmlFor="delete-confirmation">
                  Type DELETE to confirm
                </label>

                <input
                  id="delete-confirmation"
                  type="text"
                  value={confirmText}
                  onChange={(event) => {
                    setConfirmText(event.target.value);
                    setError("");
                  }}
                  placeholder="Type DELETE"
                  autoComplete="off"
                  disabled={deleting}
                />

                <div className="settings-confirm-actions">
                  <button
                    type="button"
                    className="settings-cancel-button"
                    onClick={() => {
                      setShowConfirm(false);
                      setConfirmText("");
                      setError("");
                    }}
                    disabled={deleting}
                  >
                    Cancel
                  </button>

                  <button
                    type="button"
                    className="settings-danger-button"
                    onClick={handleClearAll}
                    disabled={deleting || confirmText !== "DELETE"}
                  >
                    <Trash2 size={16} />

                    {deleting
                      ? "Deleting..."
                      : "Confirm deletion"}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <div className="settings-footer">
        <div className="settings-footer-icon">
          <ShieldCheck size={18} />
        </div>

        <div>
          <strong>ReceiptPro Desktop</strong>
          <p>Your receipt data is stored locally on this computer.</p>
        </div>
      </div>
    </div>
  );
}