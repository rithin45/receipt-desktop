import { app, BrowserWindow, ipcMain, dialog } from "electron";
import path from "node:path";
import fs from "node:fs/promises";
import { fileURLToPath } from "node:url";

import {
  initializeDatabase,
  createReceipt,
  getReceipts,
  deleteAllReceipts,
} from "./database.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const isDevelopment = !app.isPackaged;

// ==========================================
// APPLICATION WINDOW
// ==========================================

function createWindow() {
  const mainWindow = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 900,
    minHeight: 650,
    title: "ReceiptPro",
    backgroundColor: "#f7f9fc",

    webPreferences: {
      preload: path.join(__dirname, "preload.cjs"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });

  if (isDevelopment) {
    mainWindow.loadURL("http://127.0.0.1:5173");
  } else {
    mainWindow.loadFile(
      path.join(__dirname, "../dist/index.html")
    );
  }
}

// ==========================================
// HTML ESCAPING
// ==========================================

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

// ==========================================
// CURRENCY FORMATTING
// ==========================================

function formatMoney(value) {
  return new Intl.NumberFormat("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number(value) || 0);
}

// ==========================================
// DATE FORMATTING
// ==========================================

function formatReceiptDate(receipt) {
  if (!receipt.createdAt) {
    return new Date().toLocaleDateString("en-IN");
  }

  const dateValue = String(receipt.createdAt);

  const parsedDate = new Date(
    dateValue.includes("T")
      ? dateValue
      : dateValue.replace(" ", "T") +
        (dateValue.includes("Z") ? "" : "Z")
  );

  if (Number.isNaN(parsedDate.getTime())) {
    return new Date().toLocaleDateString("en-IN");
  }

  return parsedDate.toLocaleDateString("en-IN");
}

// ==========================================
// RECEIPT HTML TEMPLATE
// ==========================================

function receiptHtml(receipt) {
  const invoice = escapeHtml(receipt.invoice || "");
  const customer = escapeHtml(receipt.customer || "Walk-in");
  const customerPhone = escapeHtml(receipt.phone || "");
  const service = escapeHtml(receipt.service || "Service");
  const paymentMethod = escapeHtml(receipt.paymentMethod || "Cash");

  const total = Number(receipt.total) || 0;
  const serviceCharge = Math.max(
    0,
    Number(receipt.serviceCharge) || 0
  );

  // Support older receipts that do not have these fields.
  const billAmount =
    receipt.billAmount !== undefined &&
    receipt.billAmount !== null &&
    receipt.billAmount !== ""
      ? Number(receipt.billAmount) || 0
      : Math.max(0, total - serviceCharge);

  const date = escapeHtml(formatReceiptDate(receipt));

  // ==========================================
  // BUSINESS DETAILS
  // ==========================================

  const businessName = escapeHtml(
    receipt.businessName || "Ashraya CSC Pallippuram"
  );

  const businessAddress = escapeHtml(
    receipt.businessAddress ||
      "Market Road, Behind St. Antonys Chapel, Angadi, Pallippuram, Kerala"
  );

  const businessPhone = escapeHtml(
    receipt.businessPhone || "9809412398"
  );

  const businessEmail = escapeHtml(receipt.businessEmail || "");

  // ==========================================
  // RECEIPT TEMPLATE
  // ==========================================

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">

  <meta
    name="viewport"
    content="width=device-width, initial-scale=1.0"
  >

  <title>${invoice} - ReceiptPro</title>

  <style>
    * {
      box-sizing: border-box;
    }

    @page {
      margin: 3mm;
    }

    html,
    body {
      margin: 0;
      padding: 0;
      width: 100%;
    }

    body {
      background: #ffffff;
      color: #111111;
      font-family: "Courier New", Courier, monospace;
      font-size: 9pt;
      line-height: 1.3;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }

    .receipt {
      width: 72mm;
      max-width: 100%;
      margin: 0 auto;
      padding: 3mm 2mm 4mm;
      background: #ffffff;
    }

    .business-header {
      text-align: center;
      margin-bottom: 8px;
    }

    .business-name {
      font-size: 11pt;
      font-weight: bold;
      line-height: 1.25;
      margin-bottom: 5px;
      overflow-wrap: anywhere;
    }

    .business-address {
      font-size: 8.5pt;
      line-height: 1.3;
      overflow-wrap: anywhere;
    }

    .business-phone {
      font-size: 9pt;
      margin-top: 3px;
    }

    .business-email {
      font-size: 8pt;
      margin-top: 3px;
      overflow-wrap: anywhere;
    }

    .separator {
      width: 100%;
      border-top: 1px dashed #777777;
      margin: 7px 0;
    }

    .receipt-title {
      text-align: center;
      font-size: 10pt;
      font-weight: bold;
      margin: 7px 0;
    }

    .invoice-details {
      margin-top: 7px;
      margin-bottom: 7px;
    }

    .invoice-row {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      gap: 5px;
      margin: 3px 0;
    }

    .invoice-row .label {
      flex: 0 0 auto;
    }

    .invoice-row .value {
      text-align: right;
      overflow-wrap: anywhere;
      word-break: break-word;
    }

    .customer-name {
      font-size: 9pt;
      margin: 4px 0;
      overflow-wrap: anywhere;
    }

    .customer-phone {
      font-size: 8.5pt;
      margin: 4px 0;
    }

    .items-header {
      display: grid;
      grid-template-columns: 5mm minmax(0, 1fr) 16mm;
      gap: 1mm;
      align-items: start;
      font-weight: bold;
    }

    .items-header .item-heading {
      grid-column: 2;
    }

    .items-header .amount-heading {
      text-align: right;
    }

    .item-row {
      display: grid;
      grid-template-columns: 5mm minmax(0, 1fr) 16mm;
      gap: 1mm;
      align-items: start;
      margin-top: 5px;
      margin-bottom: 5px;
    }

    .item-number {
      text-align: left;
    }

    .item-description {
      overflow-wrap: anywhere;
      word-break: break-word;
    }

    .item-amount {
      text-align: right;
      overflow-wrap: anywhere;
    }

    .totals {
      margin-top: 5px;
      margin-bottom: 7px;
    }

    .total-row {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      gap: 5px;
      margin: 3px 0;
    }

    .total-label {
      padding-left: 12mm;
    }

    .total-value {
      text-align: right;
      white-space: nowrap;
    }

    .grand-total {
      font-weight: bold;
    }

    .payment-row {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      gap: 5px;
      margin-top: 5px;
    }

    .payment-value {
      text-align: right;
      overflow-wrap: anywhere;
    }

    .receipt-footer {
      text-align: center;
      font-size: 8.5pt;
      margin-top: 12px;
      line-height: 1.5;
      overflow-wrap: anywhere;
    }

    .thank-you {
      font-weight: bold;
      margin-bottom: 3px;
    }

    @media print {
      html,
      body {
        margin: 0;
        padding: 0;
      }

      .receipt {
        width: 72mm;
        max-width: none;
        margin: 0;
        padding: 2mm;
      }
    }
  </style>
</head>

<body>
  <main class="receipt">

    <header class="business-header">
      <div class="business-name">
        ${businessName}
      </div>

      <div class="business-address">
        ${businessAddress}
      </div>

      <div class="business-phone">
        Ph. No.: ${businessPhone}
      </div>

      ${
        businessEmail
          ? `
            <div class="business-email">
              Email: ${businessEmail}
            </div>
          `
          : ""
      }
    </header>

    <div class="separator"></div>

    <div class="receipt-title">
      PAYMENT RECEIPT
    </div>

    <div class="separator"></div>

    <section class="invoice-details">
      <div class="invoice-row">
        <span class="label">Invoice No.</span>
        <span class="value">${invoice}</span>
      </div>

      <div class="invoice-row">
        <span class="label">Date</span>
        <span class="value">${date}</span>
      </div>
    </section>

    <div class="separator"></div>

    <section class="customer-details">
      <div class="customer-name">
        Customer: ${customer}
      </div>

      ${
        customerPhone
          ? `
            <div class="customer-phone">
              Phone: ${customerPhone}
            </div>
          `
          : ""
      }
    </section>

    <div class="separator"></div>

    <section class="items">
      <div class="items-header">
        <span>#</span>
        <span class="item-heading">DESCRIPTION</span>
        <span class="amount-heading">AMOUNT</span>
      </div>

      <div class="item-row">
        <span class="item-number">1</span>

        <div class="item-description">
          ${service}
        </div>

        <span class="item-amount">
          ${formatMoney(billAmount)}
        </span>
      </div>
    </section>

    <div class="separator"></div>

    <section class="totals">
      <div class="total-row">
        <span class="total-label">Service Charge</span>
        <span class="total-value">
          ₹${formatMoney(serviceCharge)}
        </span>
      </div>

      <div class="total-row grand-total">
        <span>TOTAL</span>
        <span class="total-value">
          ₹${formatMoney(total)}
        </span>
      </div>
    </section>

    <div class="payment-row">
      <span>Payment</span>
      <span class="payment-value">${paymentMethod}</span>
    </div>

    <div class="separator"></div>

    <footer class="receipt-footer">
      <div class="thank-you">Thank you!</div>
      <div>Please keep this receipt.</div>
    </footer>

  </main>
</body>
</html>
`;
}

// ==========================================
// CREATE HIDDEN RECEIPT WINDOW
// ==========================================

async function createReceiptWindow(receipt) {
  const parent =
    BrowserWindow.getFocusedWindow() ||
    BrowserWindow.getAllWindows()[0];

  const printWindow = new BrowserWindow({
    width: 500,
    height: 800,
    show: false,

    ...(parent ? { parent } : {}),

    autoHideMenuBar: true,

    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });

  try {
    const html = receiptHtml(receipt);

    await printWindow.loadURL(
      `data:text/html;charset=utf-8,${encodeURIComponent(html)}`
    );

    return printWindow;
  } catch (error) {
    if (!printWindow.isDestroyed()) {
      printWindow.close();
    }

    throw error;
  }
}

// ==========================================
// REGISTER IPC HANDLERS
// ==========================================

app.whenReady().then(() => {
  initializeDatabase();

  ipcMain.handle(
    "receipts:create",
    (_event, data) => createReceipt(data)
  );

  ipcMain.handle(
    "receipts:list",
    (_event, search) => getReceipts(search)
  );

  ipcMain.handle(
  "receipts:delete-all-once",
  () => deleteAllReceipts()
);

  // ========================================
  // PRINT RECEIPT
  // ========================================

  ipcMain.handle(
    "receipts:print",
    async (_event, receipt) => {
      let printWindow;

      try {
        if (!receipt || !receipt.invoice) {
          throw new Error(
            "A saved receipt is required to print."
          );
        }

        printWindow = await createReceiptWindow(receipt);

        return await new Promise((resolve) => {
          printWindow.webContents.print(
            {
              silent: false,
              printBackground: true,
            },
            (success, failureReason) => {
              if (
                printWindow &&
                !printWindow.isDestroyed()
              ) {
                printWindow.close();
              }

              if (success) {
                resolve({ success: true });
              } else {
                resolve({
                  success: false,
                  cancelled: true,
                  message:
                    failureReason ||
                    "Printing was cancelled or not completed.",
                });
              }
            }
          );
        });
      } catch (error) {
        if (
          printWindow &&
          !printWindow.isDestroyed()
        ) {
          printWindow.close();
        }

        return {
          success: false,
          message:
            error.message || "Could not print the receipt.",
        };
      }
    }
  );

  // ========================================
  // SAVE RECEIPT AS PDF
  // ========================================

  ipcMain.handle(
    "receipts:save-pdf",
    async (_event, receipt) => {
      let printWindow;

      try {
        if (!receipt || !receipt.invoice) {
          throw new Error(
            "A saved receipt is required to export PDF."
          );
        }

        const parent =
          BrowserWindow.getFocusedWindow() ||
          BrowserWindow.getAllWindows()[0];

        const options = {
          title: "Save receipt as PDF",

          defaultPath: `${
            String(receipt.invoice).replace(
              /[^a-zA-Z0-9_-]/g,
              "_"
            )
          }.pdf`,

          buttonLabel: "Save PDF",

          filters: [
            {
              name: "PDF document",
              extensions: ["pdf"],
            },
          ],
        };

        const result = parent
          ? await dialog.showSaveDialog(parent, options)
          : await dialog.showSaveDialog(options);

        if (result.canceled || !result.filePath) {
          return {
            success: false,
            cancelled: true,
          };
        }

        printWindow = await createReceiptWindow(receipt);

        const pdf =
          await printWindow.webContents.printToPDF({
            printBackground: true,
            pageSize: "A4",
            marginsType: 1,
            preferCSSPageSize: true,
          });

        await fs.writeFile(result.filePath, pdf);

        if (!printWindow.isDestroyed()) {
          printWindow.close();
        }

        return {
          success: true,
          filePath: result.filePath,
        };
      } catch (error) {
        if (
          printWindow &&
          !printWindow.isDestroyed()
        ) {
          printWindow.close();
        }

        return {
          success: false,
          message:
            error.message || "Could not save the PDF.",
        };
      }
    }
  );

  // ========================================
  // APPLICATION LIFECYCLE
  // ========================================

  createWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

// ==========================================
// CLOSE APPLICATION
// ==========================================

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});