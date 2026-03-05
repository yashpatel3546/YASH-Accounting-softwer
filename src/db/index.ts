import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import { v4 as uuidv4 } from 'uuid';

const dbPath = path.resolve('erp.db');
const db = new Database(dbPath);
db.pragma('foreign_keys = ON');

// Initialize database schema
export function initDb() {
  // Drop existing tables to migrate to Tally structure
  // In a real app, we would use migrations, but for this overhaul we reset
  db.exec(`
    DROP TABLE IF EXISTS invoice_items;
    DROP TABLE IF EXISTS invoices;
    DROP TABLE IF EXISTS transactions;
    DROP TABLE IF EXISTS customers;
    
    DROP TABLE IF EXISTS voucher_entries;
    DROP TABLE IF EXISTS vouchers;
    DROP TABLE IF EXISTS ledgers;
    DROP TABLE IF EXISTS groups;
  `);

  db.exec(`
    CREATE TABLE groups (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL UNIQUE,
      nature TEXT CHECK(nature IN ('Assets', 'Liabilities', 'Income', 'Expenses')) NOT NULL,
      parent_id TEXT
    );

    CREATE TABLE ledgers (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL UNIQUE,
      group_id TEXT NOT NULL,
      opening_balance REAL DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(group_id) REFERENCES groups(id)
    );

    CREATE TABLE vouchers (
      id TEXT PRIMARY KEY,
      voucher_number TEXT NOT NULL,
      date TEXT NOT NULL,
      type TEXT CHECK(type IN ('Payment', 'Receipt', 'Contra', 'Journal', 'Sales', 'Purchase')) NOT NULL,
      narration TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE voucher_entries (
      id TEXT PRIMARY KEY,
      voucher_id TEXT NOT NULL,
      ledger_id TEXT NOT NULL,
      amount REAL NOT NULL,
      type TEXT CHECK(type IN ('Dr', 'Cr')) NOT NULL,
      FOREIGN KEY(voucher_id) REFERENCES vouchers(id) ON DELETE CASCADE,
      FOREIGN KEY(ledger_id) REFERENCES ledgers(id)
    );
  `);

  // Seed Default Groups (Tally Standard)
  const groupCount = db.prepare('SELECT COUNT(*) as count FROM groups').get() as { count: number };
  
  if (groupCount.count === 0) {
    console.log('Seeding Tally Groups...');
    
    const insertGroup = db.prepare('INSERT INTO groups (id, name, nature) VALUES (?, ?, ?)');
    
    // Primary Groups
    const capitalId = uuidv4(); insertGroup.run(capitalId, 'Capital Account', 'Liabilities');
    const currentAssetsId = uuidv4(); insertGroup.run(currentAssetsId, 'Current Assets', 'Assets');
    const currentLiabilitiesId = uuidv4(); insertGroup.run(currentLiabilitiesId, 'Current Liabilities', 'Liabilities');
    const salesId = uuidv4(); insertGroup.run(salesId, 'Sales Accounts', 'Income');
    const purchaseId = uuidv4(); insertGroup.run(purchaseId, 'Purchase Accounts', 'Expenses');
    const directExpId = uuidv4(); insertGroup.run(directExpId, 'Direct Expenses', 'Expenses');
    const indirectExpId = uuidv4(); insertGroup.run(indirectExpId, 'Indirect Expenses', 'Expenses');
    const indirectIncId = uuidv4(); insertGroup.run(indirectIncId, 'Indirect Incomes', 'Income');
    const bankId = uuidv4(); insertGroup.run(bankId, 'Bank Accounts', 'Assets');
    const cashId = uuidv4(); insertGroup.run(cashId, 'Cash-in-Hand', 'Assets');
    const sundryDebtorsId = uuidv4(); insertGroup.run(sundryDebtorsId, 'Sundry Debtors', 'Assets');
    const sundryCreditorsId = uuidv4(); insertGroup.run(sundryCreditorsId, 'Sundry Creditors', 'Liabilities');

    // Seed Default Ledgers
    const insertLedger = db.prepare('INSERT INTO ledgers (id, name, group_id) VALUES (?, ?, ?)');
    
    const cashLedgerId = uuidv4(); insertLedger.run(cashLedgerId, 'Cash', cashId);
    const bankLedgerId = uuidv4(); insertLedger.run(bankLedgerId, 'HDFC Bank', bankId);
    const salesLedgerId = uuidv4(); insertLedger.run(salesLedgerId, 'Sales', salesId);
    const purchaseLedgerId = uuidv4(); insertLedger.run(purchaseLedgerId, 'Purchase', purchaseId);
    
    // Sample Party Ledgers
    insertLedger.run(uuidv4(), 'Acme Corp (Customer)', sundryDebtorsId);
    insertLedger.run(uuidv4(), 'Global Tech (Vendor)', sundryCreditorsId);
    insertLedger.run(uuidv4(), 'Office Rent', indirectExpId);
    insertLedger.run(uuidv4(), 'Electricity Charges', indirectExpId);

    console.log('Database seeded with Tally structure successfully');
  }

  console.log('Database initialized successfully');
}

export default db;
