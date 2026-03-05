import express from 'express';
import { createServer as createViteServer } from 'vite';
import cors from 'cors';
import { v4 as uuidv4 } from 'uuid';
import db, { initDb } from './src/db/index.ts';

// Initialize DB
initDb();

const app = express();
const PORT = 3000;

app.use(express.json());
app.use(cors());

// --- API Routes ---

// Dashboard Stats
app.get('/api/stats', (req, res) => {
  try {
    // Calculate Total Income (Credit entries in Income groups)
    // We need to join voucher_entries -> ledgers -> groups
    const incomeStmt = db.prepare(`
      SELECT SUM(ve.amount) as total
      FROM voucher_entries ve
      JOIN ledgers l ON ve.ledger_id = l.id
      JOIN groups g ON l.group_id = g.id
      WHERE g.nature = 'Income' AND ve.type = 'Cr'
    `);
    const incomeResult = incomeStmt.get() as { total: number };
    const totalIncome = incomeResult?.total || 0;

    // Calculate Total Expenses (Debit entries in Expense groups)
    const expenseStmt = db.prepare(`
      SELECT SUM(ve.amount) as total
      FROM voucher_entries ve
      JOIN ledgers l ON ve.ledger_id = l.id
      JOIN groups g ON l.group_id = g.id
      WHERE g.nature = 'Expenses' AND ve.type = 'Dr'
    `);
    const expenseResult = expenseStmt.get() as { total: number };
    const totalExpenses = expenseResult?.total || 0;

    // Net Profit
    const netProfit = totalIncome - totalExpenses;

    // Count Vouchers
    const countStmt = db.prepare('SELECT COUNT(*) as count FROM vouchers');
    const countResult = countStmt.get() as { count: number };

    res.json({
      totalIncome,
      totalExpenses,
      netProfit,
      totalVouchers: countResult?.count || 0
    });
  } catch (error) {
    console.error('Stats Error:', error);
    res.status(500).json({ error: 'Failed to fetch stats' });
  }
});

// --- Masters: Groups ---
app.get('/api/groups', (req, res) => {
  try {
    const groups = db.prepare('SELECT * FROM groups ORDER BY name ASC').all();
    res.json(groups);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch groups' });
  }
});

// --- Masters: Ledgers ---
app.get('/api/ledgers', (req, res) => {
  try {
    const ledgers = db.prepare(`
      SELECT l.*, g.name as group_name 
      FROM ledgers l
      JOIN groups g ON l.group_id = g.id
      ORDER BY l.name ASC
    `).all();
    res.json(ledgers);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch ledgers' });
  }
});

app.post('/api/ledgers', (req, res) => {
  const { name, group_id, opening_balance } = req.body;
  const id = uuidv4();
  try {
    const stmt = db.prepare('INSERT INTO ledgers (id, name, group_id, opening_balance) VALUES (?, ?, ?, ?)');
    stmt.run(id, name, group_id, opening_balance || 0);
    res.json({ id, ...req.body });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to create ledger' });
  }
});

app.delete('/api/ledgers/:id', (req, res) => {
  const { id } = req.params;
  try {
    // Check if used in vouchers
    const usage = db.prepare('SELECT COUNT(*) as count FROM voucher_entries WHERE ledger_id = ?').get(id) as { count: number };
    if (usage.count > 0) {
      return res.status(400).json({ error: 'Cannot delete ledger used in vouchers' });
    }
    db.prepare('DELETE FROM ledgers WHERE id = ?').run(id);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete ledger' });
  }
});

app.put('/api/ledgers/:id', (req, res) => {
  const { id } = req.params;
  const { name, group_id, opening_balance } = req.body;
  try {
    db.prepare('UPDATE ledgers SET name = ?, group_id = ?, opening_balance = ? WHERE id = ?')
      .run(name, group_id, opening_balance || 0, id);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update ledger' });
  }
});

// --- Vouchers ---
app.get('/api/vouchers', (req, res) => {
  try {
    const vouchers = db.prepare('SELECT * FROM vouchers ORDER BY date DESC, created_at DESC').all();
    
    // Fetch entries for each voucher (N+1 problem, but acceptable for small scale SQLite)
    // Better approach: Fetch all entries and map in JS, or use a JSON group concat if supported well
    const vouchersWithEntries = vouchers.map((v: any) => {
      const entries = db.prepare(`
        SELECT ve.*, l.name as ledger_name 
        FROM voucher_entries ve
        JOIN ledgers l ON ve.ledger_id = l.id
        WHERE ve.voucher_id = ?
      `).all(v.id);
      return { ...v, entries };
    });

    res.json(vouchersWithEntries);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch vouchers' });
  }
});

app.post('/api/vouchers', (req, res) => {
  const { date, type, voucher_number, narration, entries } = req.body;
  const id = uuidv4();

  const createVoucher = db.transaction(() => {
    db.prepare(`
      INSERT INTO vouchers (id, voucher_number, date, type, narration)
      VALUES (?, ?, ?, ?, ?)
    `).run(id, voucher_number, date, type, narration);

    const entryStmt = db.prepare(`
      INSERT INTO voucher_entries (id, voucher_id, ledger_id, amount, type)
      VALUES (?, ?, ?, ?, ?)
    `);

    entries.forEach((entry: any) => {
      entryStmt.run(uuidv4(), id, entry.ledger_id, entry.amount, entry.type);
    });
  });

  try {
    createVoucher();
    res.json({ success: true, id });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to create voucher' });
  }
});

app.put('/api/vouchers/:id', (req, res) => {
  const { id } = req.params;
  const { date, type, voucher_number, narration, entries } = req.body;

  const updateVoucher = db.transaction(() => {
    // Update Voucher Details
    db.prepare(`
      UPDATE vouchers 
      SET date = ?, type = ?, voucher_number = ?, narration = ?
      WHERE id = ?
    `).run(date, type, voucher_number, narration, id);

    // Delete existing entries
    db.prepare('DELETE FROM voucher_entries WHERE voucher_id = ?').run(id);

    // Insert new entries
    const entryStmt = db.prepare(`
      INSERT INTO voucher_entries (id, voucher_id, ledger_id, amount, type)
      VALUES (?, ?, ?, ?, ?)
    `);

    entries.forEach((entry: any) => {
      entryStmt.run(uuidv4(), id, entry.ledger_id, entry.amount, entry.type);
    });
  });

  try {
    updateVoucher();
    res.json({ success: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to update voucher' });
  }
});

app.delete('/api/vouchers/:id', (req, res) => {
  const { id } = req.params;
  try {
    db.prepare('DELETE FROM vouchers WHERE id = ?').run(id);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete voucher' });
  }
});

// --- Reports ---
app.get('/api/reports/trial-balance', (req, res) => {
  try {
    const report = db.prepare(`
      SELECT 
        l.id, 
        l.name, 
        g.name as group_name,
        g.nature as group_nature,
        l.opening_balance,
        COALESCE(SUM(CASE WHEN ve.type = 'Dr' THEN ve.amount ELSE 0 END), 0) as total_debit,
        COALESCE(SUM(CASE WHEN ve.type = 'Cr' THEN ve.amount ELSE 0 END), 0) as total_credit
      FROM ledgers l
      JOIN groups g ON l.group_id = g.id
      LEFT JOIN voucher_entries ve ON l.id = ve.ledger_id
      GROUP BY l.id
      ORDER BY g.name, l.name
    `).all();
    res.json(report);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch trial balance' });
  }
});

// --- Vite Middleware ---
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static('dist'));
    app.get('*', (req, res) => {
       res.sendFile('index.html', { root: 'dist' });
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
