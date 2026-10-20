import Database from "better-sqlite3";
import { app } from "electron";
import path from "node:path";
import fs from "node:fs";

let db;

export function initializeDatabase() {
  if (db) return db;

  const dataDirectory = app.getPath("userData");

  fs.mkdirSync(dataDirectory, { recursive: true });

  const databasePath = path.join(dataDirectory, "receiptpro.db");

  db = new Database(databasePath);

  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");

  db.exec(`
    CREATE TABLE IF NOT EXISTS receipts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      invoice_number TEXT NOT NULL UNIQUE,
      customer_name TEXT NOT NULL DEFAULT '',
      phone TEXT NOT NULL DEFAULT '',
      service_name TEXT NOT NULL,
      total_amount INTEGER NOT NULL,
      received_amount INTEGER NOT NULL DEFAULT 0,
      balance_amount INTEGER NOT NULL DEFAULT 0,
      payment_method TEXT NOT NULL DEFAULT 'Cash',
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE INDEX IF NOT EXISTS idx_receipts_created_at
    ON receipts(created_at);

    CREATE INDEX IF NOT EXISTS idx_receipts_customer
    ON receipts(customer_name);
  `);

  // Add new columns safely for existing databases.
  const columns = db
    .prepare("PRAGMA table_info(receipts)")
    .all()
    .map((column) => column.name);

  if (!columns.includes("bill_amount")) {
    db.exec(`
      ALTER TABLE receipts
      ADD COLUMN bill_amount INTEGER NOT NULL DEFAULT 0
    `);

    // Existing receipts had no separate service charge.
    db.exec(`
      UPDATE receipts
      SET bill_amount = total_amount
      WHERE bill_amount = 0
    `);
  }

  if (!columns.includes("service_charge")) {
    db.exec(`
      ALTER TABLE receipts
      ADD COLUMN service_charge INTEGER NOT NULL DEFAULT 0
    `);
  }

  return db;
}

export function createReceipt(data) {
  const database = initializeDatabase();

  const customer = String(data.customer ?? "").trim();
  const phone = String(data.phone ?? "").trim();
  const service = String(data.service ?? "").trim();
  const paymentMethod = String(data.paymentMethod ?? "Cash").trim();

  const totalAmount = Number(data.total);
  const billAmountValue =
    data.billAmount !== undefined && data.billAmount !== null
      ? Number(data.billAmount)
      : totalAmount;

  const serviceChargeValue =
    data.serviceCharge !== undefined && data.serviceCharge !== null
      ? Number(data.serviceCharge)
      : 0;

  if (!service) {
    throw new Error("Service name is required.");
  }

  if (
    !Number.isFinite(billAmountValue) ||
    billAmountValue <= 0
  ) {
    throw new Error("Enter a valid bill amount.");
  }

  if (
    !Number.isFinite(serviceChargeValue) ||
    serviceChargeValue < 0
  ) {
    throw new Error("Enter a valid service charge.");
  }

  const billAmount = Math.round(billAmountValue * 100);
  const serviceCharge = Math.round(serviceChargeValue * 100);
  const total = billAmount + serviceCharge;

  if (!Number.isSafeInteger(total) || total <= 0) {
    throw new Error("Enter a valid total amount.");
  }

  // Every receipt is issued after payment has been received.
  const received = total;
  const balance = 0;

  const insertReceipt = database.prepare(`
    INSERT INTO receipts (
      invoice_number,
      customer_name,
      phone,
      service_name,
      total_amount,
      received_amount,
      balance_amount,
      payment_method,
      bill_amount,
      service_charge
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const transaction = database.transaction(() => {
    const nextId = database
      .prepare(
        "SELECT COALESCE(MAX(id), 0) + 1 AS next_id FROM receipts"
      )
      .get().next_id;

    const invoiceNumber = `RP-${String(nextId).padStart(6, "0")}`;

    insertReceipt.run(
      invoiceNumber,
      customer,
      phone,
      service,
      total,
      received,
      balance,
      paymentMethod || "Cash",
      billAmount,
      serviceCharge
    );

    return getReceiptByInvoice(invoiceNumber);
  });

  return transaction();
}

export function getReceiptByInvoice(invoiceNumber) {
  const database = initializeDatabase();

  const row = database
    .prepare("SELECT * FROM receipts WHERE invoice_number = ?")
    .get(invoiceNumber);

  return row ? formatReceipt(row) : null;
}

export function getReceipts(search = "") {
  const database = initializeDatabase();
  const query = String(search ?? "").trim();

  const rows = database
    .prepare(`
      SELECT *
      FROM receipts
      WHERE invoice_number LIKE ?
         OR customer_name LIKE ?
         OR service_name LIKE ?
      ORDER BY id DESC
      LIMIT 500
    `)
    .all(`%${query}%`, `%${query}%`, `%${query}%`);

  return rows.map(formatReceipt);
}

function formatReceipt(row) {
  const total = row.total_amount / 100;

  const billAmount =
    row.bill_amount !== undefined && row.bill_amount !== null
      ? row.bill_amount / 100
      : total;

  const serviceCharge =
    row.service_charge !== undefined && row.service_charge !== null
      ? row.service_charge / 100
      : 0;

  return {
    id: row.id,
    invoice: row.invoice_number,
    customer: row.customer_name,
    phone: row.phone,
    service: row.service_name,
    billAmount,
    serviceCharge,
    total,
    received: row.received_amount / 100,
    balance: row.balance_amount / 100,
    paymentMethod: row.payment_method,
    createdAt: row.created_at,
    status: "Paid",
  };
}


export function deleteAllReceipts() {
  const database = initializeDatabase();

  const transaction = database.transaction(() => {
    database.exec("DELETE FROM receipts");

    database
      .prepare("DELETE FROM sqlite_sequence WHERE name = ?")
      .run("receipts");
  });

  transaction();

  return {
    success: true,
    message: "All receipts deleted successfully.",
  };
}