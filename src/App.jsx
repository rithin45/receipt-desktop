import { useCallback, useEffect, useMemo, useState } from "react";
import {
  LayoutDashboard,
  ReceiptText,
  Users,
  History,
  Settings,
  Search,
  Plus,
  Printer,
  IndianRupee,
  FileText,
  Wallet,
  ChevronLeft,
  ChevronRight,
  ArrowRight,
  RotateCcw,
  RefreshCw,
  AlertCircle,
} from "lucide-react";
import "./App.css";
import SettingsPage from "./Settings.jsx";

const navigation = [
  { name: "Dashboard", icon: LayoutDashboard },
  { name: "New Receipt", icon: ReceiptText },
  { name: "Transactions", icon: History },
  { name: "Settings", icon: Settings },
];

const money = (value) =>
  new Intl.NumberFormat("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number(value) || 0);

// SQLite CURRENT_TIMESTAMP is stored as UTC text: YYYY-MM-DD HH:mm:ss.
function parseReceiptDate(value) {
  if (!value) return null;
  if (value instanceof Date) return value;

  const text = String(value).trim();
  const normalized = /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(text)
    ? `${text.replace(" ", "T")}Z`
    : text;
  const date = new Date(normalized);
  return Number.isNaN(date.getTime()) ? null : date;
}

function localDateKey(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function formatReceiptDate(value) {
  const date = parseReceiptDate(value);
  return date ? date.toLocaleDateString("en-IN") : "—";
}

function App() {
  const [page, setPage] = useState("Dashboard");
  const [collapsed, setCollapsed] = useState(false);
  const [search, setSearch] = useState("");
  const [receipts, setReceipts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dbError, setDbError] = useState("");

  const refreshReceipts = useCallback(async (query = "") => {
    if (!window.receiptApp?.getReceipts) {
      throw new Error(
        "Electron database API is unavailable. Check electron/preload.cjs and restart the app."
      );
    }

    const savedReceipts = await window.receiptApp.getReceipts(query);
    if (!Array.isArray(savedReceipts)) {
      throw new Error("The database returned an unexpected response.");
    }
    setReceipts(savedReceipts);
    return savedReceipts;
  }, []);

  useEffect(() => {
    let mounted = true;

    async function loadReceipts() {
      setLoading(true);
      try {
        if (!window.receiptApp?.getReceipts) {
          throw new Error(
            "Electron database API is unavailable. Check electron/preload.cjs and restart the app."
          );
        }
        const savedReceipts = await window.receiptApp.getReceipts("");
        if (mounted) {
          setReceipts(Array.isArray(savedReceipts) ? savedReceipts : []);
          setDbError("");
        }
      } catch (error) {
        console.error("Failed to load receipts from SQLite:", error);
        if (mounted) setDbError(error.message || "Failed to load receipts from SQLite.");
      } finally {
        if (mounted) setLoading(false);
      }
    }

    loadReceipts();
    return () => {
      mounted = false;
    };
  }, []);

  const navigate = (name) => {
    setPage(name);
    setSearch("");
    setDbError("");
  };

  const saveReceipt = async (receipt) => {
    if (!window.receiptApp?.createReceipt) {
      throw new Error("Electron database API is unavailable. Cannot save receipt.");
    }

    setSaving(true);
    setDbError("");
    try {
      const savedReceipt = await window.receiptApp.createReceipt(receipt);
      // Re-read from SQLite so the UI always reflects the persisted database record.
      await refreshReceipts("");
      return savedReceipt;
    } catch (error) {
      console.error("Failed to save receipt to SQLite:", error);
      setDbError(error.message || "Failed to save receipt.");
      throw error;
    } finally {
      setSaving(false);
    }
  };

  const filteredReceipts = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return receipts;

    return receipts.filter((receipt) =>
      [
        receipt.invoice,
        receipt.customer,
        receipt.phone,
        receipt.service,
        receipt.paymentMethod,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(query)
    );
  }, [receipts, search]);

  const handleRefresh = async () => {
    setLoading(true);
    try {
      await refreshReceipts("");
      setDbError("");
    } catch (error) {
      console.error("Failed to refresh receipts:", error);
      setDbError(error.message || "Failed to refresh receipts.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={`app ${collapsed ? "is-collapsed" : ""}`}>
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-mark">
            <ReceiptText size={23} />
          </div>
          {!collapsed && (
            <div className="brand-copy">
              <strong>ReceiptPro</strong>
              <span>Desktop Billing</span>
            </div>
          )}
        </div>

        <button
          className="collapse-button"
          onClick={() => setCollapsed((value) => !value)}
          aria-label="Toggle sidebar"
        >
          {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
        </button>

        {!collapsed && <div className="nav-heading">WORKSPACE</div>}

        <nav className="navigation">
          {navigation.map(({ name, icon: Icon }) => (
            <button
              key={name}
              title={name}
              className={`nav-link ${page === name ? "active" : ""}`}
              onClick={() => navigate(name)}
            >
              <Icon size={19} />
              {!collapsed && <span>{name}</span>}
            </button>
          ))}
        </nav>

        <div className="sidebar-footer">
          <div className="connection-card">
            <span className="connection-dot" />
            {!collapsed && (
              <div>
                <strong>Local Workspace</strong>
                <small>{dbError ? "Database issue" : "Local database"}</small>
              </div>
            )}
          </div>
          {!collapsed && <small>ReceiptPro · Version 1.0</small>}
        </div>
      </aside>

      <div className="workspace">
        <header className="topbar">
          <div className="page-title">
            <span className="breadcrumb">
              Workspace <span>/</span> {page}
            </span>
            <h1>{page}</h1>
          </div>

          <div className="header-actions">
            <div className="header-search">
              <Search size={17} />
              <input
                type="search"
                placeholder="Search receipts..."
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                aria-label="Search receipts"
              />
            </div>
            <button
              className="button button-outline"
              onClick={handleRefresh}
              disabled={loading}
              title="Reload receipts from SQLite"
            >
              <RefreshCw size={16} />
              Refresh
            </button>
            <button
              className="button button-primary"
              onClick={() => navigate("New Receipt")}
            >
              <Plus size={18} />
              New Receipt
            </button>
          </div>
        </header>

        <main className="main">
          {dbError && (
            <div className="database-error" role="alert">
              <AlertCircle size={18} />
              <span>{dbError}</span>
              <button className="text-link" onClick={handleRefresh}>Retry</button>
            </div>
          )}

          {loading ? (
            <section className="panel loading-panel">
              <RefreshCw size={20} className="loading-icon" />
              <p>Loading saved receipts from SQLite…</p>
            </section>
          ) : (
            <>
              {page === "Dashboard" && (
                <Dashboard receipts={receipts} navigate={navigate} />
              )}

              {page === "New Receipt" && (
                <NewReceipt
                  onSave={saveReceipt}
                  saving={saving}
                  onDone={() => navigate("Transactions")}
                />
              )}

              {page === "Transactions" && (
                <Transactions
                  receipts={filteredReceipts}
                  search={search}
                  onNew={() => navigate("New Receipt")}
                />
              )}

              {page === "Settings" && (
  <SettingsPage
    receipts={receipts}
    onClearAll={async () => {
      if (!window.receiptApp?.deleteAllReceipts) {
        throw new Error(
          "Delete function is unavailable. Check electron/preload.cjs and electron/main.js."
        );
      }

      const result =
        await window.receiptApp.deleteAllReceipts();

      if (!result?.success) {
        throw new Error(
          result?.message || "Failed to delete receipts."
        );
      }

      await refreshReceipts("");
    }}
  />
)}
            </>
          )}
        </main>

        <footer className="footer">
          <span>ReceiptPro Desktop</span>
          <span className="footer-status">
            <span className="connection-dot" />
            {dbError ? "Database connection issue" : "SQLite · Local data"}
          </span>
        </footer>
      </div>
    </div>
  );
}

function Dashboard({ receipts, navigate }) {
  const todayKey = localDateKey(new Date());

  const todayReceipts = receipts.filter((receipt) => {
    const date = parseReceiptDate(
      receipt.createdAt || receipt.date
    );

    return date ? localDateKey(date) === todayKey : false;
  });

  // All receipts are considered paid in this workflow.
  const collection = todayReceipts.reduce(
    (sum, receipt) => sum + Number(receipt.total || 0),
    0
  );

  const pending = 0;

  const totalBilled = receipts.reduce(
    (sum, receipt) => sum + Number(receipt.total || 0),
    0
  );

  const metrics = [
    {
      title: "Today's Collection",
      value: `₹${money(collection)}`,
      icon: IndianRupee,
      tone: "green",
      caption: `${todayReceipts.length} receipt${
        todayReceipts.length === 1 ? "" : "s"
      } today`,
    },
    {
      title: "Receipts Generated",
      value: String(receipts.length),
      icon: ReceiptText,
      tone: "blue",
      caption: "Saved in SQLite",
    },
    {
      title: "Pending Balance",
      value: `₹${money(pending)}`,
      icon: Wallet,
      tone: "orange",
      caption: "All receipts paid",
    },
    {
      title: "Total Billed",
      value: `₹${money(totalBilled)}`,
      icon: FileText,
      tone: "purple",
      caption: "Across saved receipts",
    },
  ];

  const recentReceipts = [...receipts]
    .sort((a, b) => {
      const aDate =
        parseReceiptDate(a.createdAt || a.date)?.getTime() || 0;

      const bDate =
        parseReceiptDate(b.createdAt || b.date)?.getTime() || 0;

      return (
        bDate - aDate ||
        Number(b.id || 0) - Number(a.id || 0)
      );
    })
    .slice(0, 5);

  return (
    <>
      <div className="welcome">
        <div>
          <h2>Welcome to your workspace</h2>
          <p>
            Manage billing, transactions and receipt printing.
          </p>
        </div>

        <span className="workspace-tag">
          Desktop Application
        </span>
      </div>

      {/* Dashboard Metrics */}
      <div className="metrics-grid">
        {metrics.map(
          ({ title, value, icon: Icon, tone, caption }) => (
            <article className="metric-card" key={title}>
              <div className={`metric-icon ${tone}`}>
                <Icon size={21} />
              </div>

              <p>{title}</p>
              <h3>{value}</h3>

              <span className="metric-caption">
                {caption}
              </span>
            </article>
          )
        )}
      </div>

      {/* Recent Transactions and Quick Actions */}
      <div className="dashboard-grid">
        <section className="panel">
          <div className="panel-header">
            <div>
              <h3>Recent Transactions</h3>
              <p>
                Latest receipts saved in the database
              </p>
            </div>

            <button
              className="text-link"
              onClick={() => navigate("Transactions")}
            >
              View All <ArrowRight size={15} />
            </button>
          </div>

          {recentReceipts.length === 0 ? (
            <div className="empty-transactions">
              <div className="empty-icon">
                <ReceiptText size={27} />
              </div>

              <h3>No transactions yet</h3>

              <p>
                Create your first receipt to see it here.
              </p>

              <button
                className="button button-outline"
                onClick={() => navigate("New Receipt")}
              >
                <Plus size={17} />
                Create First Receipt
              </button>
            </div>
          ) : (
            <div className="table-wrap">
              <table className="receipt-table">
                <thead>
                  <tr>
                    <th>Invoice</th>
                    <th>Customer</th>
                    <th>Total</th>
                    <th>Status</th>
                  </tr>
                </thead>

                <tbody>
                  {recentReceipts.map((receipt) => (
                    <tr
                      key={receipt.invoice || receipt.id}
                    >
                      <td>{receipt.invoice || "—"}</td>

                      <td>
                        {receipt.customer || "Walk-in customer"}
                      </td>

                      <td>
                        ₹{money(receipt.total)}
                      </td>

                      <td>
                        <span className="status-badge status-paid">
                          Paid
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {/* Quick Actions */}
        <section className="panel">
          <div className="panel-header">
            <div>
              <h3>Quick Actions</h3>
              <p>Frequently used tasks</p>
            </div>
          </div>

          <div className="quick-actions">
            <QuickAction
              icon={ReceiptText}
              tone="blue"
              title="Create Receipt"
              description="Generate a new bill"
              onClick={() => navigate("New Receipt")}
            />

            <QuickAction
              icon={History}
              tone="purple"
              title="Transaction History"
              description="View saved invoices"
              onClick={() => navigate("Transactions")}
            />

            <QuickAction
              icon={Printer}
              tone="orange"
              title="Printer Settings"
              description="Configure printer later"
              onClick={() => navigate("Settings")}
            />
          </div>
        </section>
      </div>
    </>
  );
}

function QuickAction({ icon: Icon, tone, title, description, onClick }) {
  return (
    <button className="quick-action" onClick={onClick}>
      <div className={`quick-icon ${tone}`}><Icon size={20} /></div>
      <div className="quick-copy"><strong>{title}</strong><span>{description}</span></div>
      <ChevronRight size={18} />
    </button>
  );
}

function NewReceipt({ onSave, saving, onDone }) {
  const [customer, setCustomer] = useState("");
  const [phone, setPhone] = useState("");
  const [service, setService] = useState("KWA BILL");
  const [amount, setAmount] = useState("0.00");
  const [serviceCharge, setServiceCharge] = useState("0.00");
  const [paymentMethod, setPaymentMethod] = useState("Cash");
  const [error, setError] = useState("");
  const [savedReceipt, setSavedReceipt] = useState(null);
  const [showPostSaveChoices, setShowPostSaveChoices] = useState(false);
  const [actionBusy, setActionBusy] = useState(false);
  const [choiceError, setChoiceError] = useState("");

  const billAmount = Math.max(0, Number(amount) || 0);
  const charge = Math.max(0, Number(serviceCharge) || 0);
  const total = Math.round((billAmount + charge) * 100) / 100;
  const now = new Date();
  const invoice = savedReceipt?.invoice || "Generated when saved";

  const submit = async (event) => {
    event.preventDefault();
    setError("");

    if (!service.trim()) {
      setError("Enter a service or bill name.");
      return;
    }
    if (!Number.isFinite(Number(amount)) || billAmount <= 0) {
      setError("Enter a bill amount greater than zero.");
      return;
    }
    if (!Number.isFinite(Number(serviceCharge)) || charge < 0) {
      setError("Enter a valid service charge.");
      return;
    }

    try {
      const receipt = await onSave({
        customer: customer.trim(),
        phone: phone.trim(),
        service: service.trim(),
        billAmount,
        serviceCharge: charge,
        total,
        // Receipts are issued after payment in this workflow.
        received: total,
        balance: 0,
        paymentMethod,
      });
      setSavedReceipt(receipt);
      setChoiceError("");
      setShowPostSaveChoices(true);
    } catch (saveError) {
      setError(saveError.message || "Could not save receipt.");
    }
  };

  const reset = () => {
    setCustomer("");
    setPhone("");
    setService("KWA BILL");
    setAmount("0.00");
    setServiceCharge("0.00");
    setPaymentMethod("Cash");
    setError("");
    setSavedReceipt(null);
    setShowPostSaveChoices(false);
    setChoiceError("");
  };

  const finishWithoutAction = () => {
    setShowPostSaveChoices(false);
    onDone();
  };

  const handlePrint = async () => {
    setChoiceError("");
    if (!window.receiptApp?.printReceipt) {
      setChoiceError("Printing is unavailable. Check electron/preload.cjs and restart the app.");
      return;
    }
    setActionBusy(true);
    try {
      const result = await window.receiptApp.printReceipt(savedReceipt);
      if (result?.success) {
        setShowPostSaveChoices(false);
        onDone();
      } else if (!result?.cancelled) {
        setChoiceError(result?.message || "The print operation did not complete.");
      }
    } catch (actionError) {
      setChoiceError(actionError.message || "Could not open the printer dialog.");
    } finally {
      setActionBusy(false);
    }
  };

  const handleSavePdf = async () => {
    setChoiceError("");
    if (!window.receiptApp?.saveReceiptPdf) {
      setChoiceError("PDF export is unavailable. Check electron/preload.cjs and restart the app.");
      return;
    }
    setActionBusy(true);
    try {
      const result = await window.receiptApp.saveReceiptPdf(savedReceipt);
      if (result?.success) {
        setShowPostSaveChoices(false);
        onDone();
      } else if (!result?.cancelled) {
        setChoiceError(result?.message || "Could not save the PDF.");
      }
    } catch (actionError) {
      setChoiceError(actionError.message || "Could not save the PDF.");
    } finally {
      setActionBusy(false);
    }
  };

  return (
    <div className="billing-layout">
      <section className="panel billing-panel">
        <div className="panel-header">
          <div>
            <h3>Create New Receipt</h3>
            <p>Enter transaction details below</p>
          </div>
        </div>

        {savedReceipt && !showPostSaveChoices && (
          <div className="save-success" role="status">
            Receipt {savedReceipt.invoice} saved successfully to SQLite.
          </div>
        )}

        <form className="billing-form" onSubmit={submit}>
          <div className="form-section-title">Customer Details</div>

          <div className="form-grid">
            <label className="field">
              Customer Name
              <input
                value={customer}
                onChange={(event) => setCustomer(event.target.value)}
                placeholder="Enter customer name"
              />
            </label>

            <label className="field">
              Phone Number
              <input
                value={phone}
                onChange={(event) => setPhone(event.target.value)}
                inputMode="tel"
                placeholder="Enter phone number"
              />
            </label>
          </div>

          <div className="form-section-title">Transaction Details</div>

          <label className="field">
            Service / Bill Name
            <input
              required
              value={service}
              onChange={(event) => setService(event.target.value)}
              placeholder="e.g. KWA BILL"
            />
          </label>

          <div className="form-grid">
            <label className="field">
              Bill Amount (₹)
              <input
                type="number"
                min="0.01"
                step="0.01"
                required
                value={amount}
                onChange={(event) => setAmount(event.target.value)}
              />
            </label>

            <label className="field">
              Service Charge (₹)
              <input
                type="number"
                min="0"
                step="0.01"
                required
                value={serviceCharge}
                onChange={(event) => setServiceCharge(event.target.value)}
              />
            </label>
          </div>

          <label className="field">
            Payment Method
            <select
              value={paymentMethod}
              onChange={(event) => setPaymentMethod(event.target.value)}
            >
              <option>Cash</option>
              <option>UPI</option>
              <option>Card</option>
              <option>Bank Transfer</option>
            </select>
          </label>

          <div className="amount-summary">
            <div>
              <span>Bill Amount</span>
              <strong>₹{money(billAmount)}</strong>
            </div>
            <div>
              <span>Service Charge</span>
              <strong>₹{money(charge)}</strong>
            </div>
            <div>
              <span>Total Amount</span>
              <strong>₹{money(total)}</strong>
            </div>
          </div>

          {error && <p className="form-error">{error}</p>}

          <div className="form-actions">
            <button
              type="button"
              className="button button-outline"
              onClick={reset}
              disabled={saving}
            >
              <RotateCcw size={16} /> Reset
            </button>

            <button
              type="submit"
              className="button button-primary"
              disabled={saving || showPostSaveChoices}
            >
              <Plus size={17} />
              {saving ? "Saving…" : "Save Receipt"}
            </button>
          </div>
        </form>
      </section>

      <ReceiptPreview
        invoice={invoice}
        customer={customer}
        phone={phone}
        service={service}
        billAmount={billAmount}
        serviceCharge={charge}
        total={total}
        paymentMethod={paymentMethod}
        now={now}
      />

      {showPostSaveChoices && savedReceipt && (
        <div className="receipt-choice-backdrop" role="presentation">
          <section
            className="receipt-choice-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="receipt-choice-title"
          >
            <div className="receipt-choice-icon">
              <ReceiptText size={24} />
            </div>
            <h2 id="receipt-choice-title">Receipt saved successfully</h2>
            <p>
              Receipt <strong>{savedReceipt.invoice}</strong> is saved in SQLite.
              What would you like to do next?
            </p>

            {choiceError && (
              <p className="form-error" role="alert">{choiceError}</p>
            )}

            <div className="receipt-choice-actions">
              <button
                className="button button-primary"
                onClick={handlePrint}
                disabled={actionBusy}
              >
                <Printer size={17} />
                {actionBusy ? "Please wait…" : "Print receipt"}
              </button>

              <button
                className="button button-outline"
                onClick={handleSavePdf}
                disabled={actionBusy}
              >
                <FileText size={17} /> Save as PDF
              </button>

              <button
                className="button button-ghost"
                onClick={finishWithoutAction}
                disabled={actionBusy}
              >
                None — just save
              </button>
            </div>

            <small className="receipt-choice-note">
              Print opens the system printer dialog. PDF opens a file-save dialog.
            </small>
          </section>
        </div>
      )}
    </div>
  );
}

function ReceiptPreview({
  invoice,
  customer,
  phone,
  service,
  billAmount,
  serviceCharge,
  total,
  paymentMethod,
  now,
}) {
  return (
    <section className="panel preview-panel">
      <div className="panel-header">
        <div>
          <h3>Receipt Preview</h3>
          <p>Illustrative receipt preview</p>
        </div>
        <Printer size={19} />
      </div>

      <div className="receipt-paper">
        <div className="receipt-business">Ashraya CSC Pallippuram</div>
        <div className="receipt-center">
          Market Road, Behind St. Antonys Chapel, Angadi, Pallippuram, Kerala
        </div>
        <div className="receipt-center">Ph. No.: 9809412398</div>

        <div className="receipt-rule" />
        <div className="receipt-center receipt-invoice">PAYMENT RECEIPT</div>
        <div className="receipt-rule" />

        <div className="receipt-line">
          <span>Invoice No.</span>
          <span>{invoice}</span>
        </div>
        <div className="receipt-line">
          <span>Date</span>
          <span>{now.toLocaleDateString("en-IN")}</span>
        </div>

        <div className="receipt-rule" />

        <div className="receipt-line">
          <span>Customer</span>
          <span>{customer || "Walk-in"}</span>
        </div>

        {phone && (
          <div className="receipt-line">
            <span>Phone</span>
            <span>{phone}</span>
          </div>
        )}

        <div className="receipt-rule" />

        <div className="receipt-item-heading">
          <span>DESCRIPTION</span>
          <span>AMOUNT</span>
        </div>

        <div className="receipt-line receipt-item">
          <span>{service || "Service"}</span>
          <span>{money(billAmount)}</span>
        </div>

        <div className="receipt-line receipt-item">
          <span>Service Charge</span>
          <span>{money(serviceCharge)}</span>
        </div>

        <div className="receipt-rule" />

        <div className="receipt-line receipt-total">
          <strong>TOTAL</strong>
          <strong>₹{money(total)}</strong>
        </div>

        <div className="receipt-line">
          <span>Payment</span>
          <span>{paymentMethod}</span>
        </div>

        <div className="receipt-rule" />

        <div className="receipt-center receipt-thanks">Thank you!</div>
        <div className="receipt-center">Please keep this receipt.</div>
      </div>

      <p className="preview-note">
        Business details and printer configuration will be added after the receipt workflow is finalized.
      </p>
    </section>
  );
}

function Transactions({ receipts, search, onNew }) {
  const [printingInvoice, setPrintingInvoice] = useState("");

  const handlePrintReceipt = async (receipt) => {
    if (!window.receiptApp?.printReceipt) {
      window.alert(
        "Printing is unavailable. Check electron/preload.cjs and restart ReceiptPro."
      );
      return;
    }

    setPrintingInvoice(receipt.invoice || String(receipt.id));

    try {
      const result = await window.receiptApp.printReceipt(receipt);

      if (!result?.success && !result?.cancelled) {
        window.alert(result?.message || "Could not print this receipt.");
      }
    } catch (error) {
      window.alert(error.message || "Could not open the printer dialog.");
    } finally {
      setPrintingInvoice("");
    }
  };

  return (
    <section className="panel">
      <div className="panel-header">
        <div><h3>Transactions</h3><p>{receipts.length} saved receipt{receipts.length === 1 ? "" : "s"}{search ? " matching your search" : " loaded from SQLite"}</p></div>
        <button className="button button-primary" onClick={onNew}><Plus size={17} /> New Receipt</button>
      </div>

      {receipts.length === 0 ? (
        <div className="empty-transactions">
          <div className="empty-icon"><History size={27} /></div>
          <h3>{search ? "No matching receipts" : "No receipts saved yet"}</h3>
          <p>{search ? "Try another invoice number, customer, phone, service or payment method." : "Create a receipt to see it listed here."}</p>
          {!search && <button className="button button-outline" onClick={onNew}><Plus size={17} /> Create Receipt</button>}
        </div>
      ) : (
        <div className="table-wrap">
          <table className="receipt-table">
            <thead>
              <tr>
                <th>Invoice</th><th>Customer</th><th>Service</th><th>Total</th><th>Received</th><th>Balance</th><th>Payment</th><th>Status</th><th>Date</th><th>Action</th>
              </tr>
            </thead>
            <tbody>
              {receipts.map((receipt) => {
                const isPaid = true;
                return (
                  <tr key={receipt.invoice || receipt.id}>
                    <td>{receipt.invoice || "—"}</td>
                    <td>{receipt.customer || "Walk-in"}</td>
                    <td>{receipt.service || "—"}</td>
                    <td>₹{money(receipt.total)}</td>
                    <td>₹{money(receipt.received)}</td>
                    <td>₹{money(receipt.balance)}</td>
                    <td>{receipt.paymentMethod || "Cash"}</td>
                    <td>
                      <span className="status-badge status-paid">
                        Paid
                      </span>
                    </td>                    
                    <td>{formatReceiptDate(receipt.createdAt || receipt.date)}</td>
                    <td>
                      <button
                        type="button"
                        className="button button-outline transaction-print-button"
                        onClick={() => handlePrintReceipt(receipt)}
                        disabled={printingInvoice === (receipt.invoice || String(receipt.id))}
                        title={`Print receipt ${receipt.invoice || ""}`}
                      >
                        <Printer size={15} />
                        {printingInvoice === (receipt.invoice || String(receipt.id))
                          ? "Printing…"
                          : "Print"}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

function Placeholder({ title, description }) {
  const Icon = title === "Customers" ? Users : Settings;
  return (
    <section className="panel placeholder-panel">
      <div className="empty-icon"><Icon size={28} /></div>
      <h2>{title}</h2>
      <p>{description}</p>
    </section>
  );
}

export default App;
