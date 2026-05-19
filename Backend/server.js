const express = require('express');
const cors = require('cors');
const nodemailer = require('nodemailer');

const app = express();
app.use(cors());
app.use(express.json());

// ================================================================
// IN-MEMORY DATA STORES
// ================================================================
let users = [];        // Customer accounts
let transactions = []; // All transactions
let loans = [];        // All loan applications
let banks = [          // Bank registry (Admin manages)
  { bankId: 'sid_bank_17', bankName: 'Sid Bank International', ifsc: 'SIDB0001', address: 'Chennai, Tamil Nadu', isActive: true },
  { bankId: 'alpha_bank_99', bankName: 'Alpha Bank', ifsc: 'ALPH0001', address: 'Mumbai, Maharashtra', isActive: true },
  { bankId: 'omega_bank_24', bankName: 'Omega Bank', ifsc: 'OMEG0001', address: 'Bangalore, Karnataka', isActive: true },
];

// ================================================================
// EMAIL SETUP (Nodemailer — using Gmail or Ethereal test account)
// Replace with your real Gmail + App Password in production
// ================================================================
const transporter = nodemailer.createTransport({
  host: 'smtp.ethereal.email', // Replace with 'smtp.gmail.com' for real email
  port: 587,
  auth: {
    user: process.env.MAIL_USER || 'your@gmail.com',
    pass: process.env.MAIL_PASS || 'your_app_password'
  }
});

const sendEmail = async (to, subject, html) => {
  try {
    await transporter.sendMail({
      from: '"Sid Bank" <noreply@sidbank.com>',
      to,
      subject,
      html
    });
    console.log(`Email sent to ${to}: ${subject}`);
  } catch (err) {
    console.error('Email send failed:', err.message);
    // Don't crash server on email failure
  }
};

// ================================================================
// AUTH ENDPOINTS
// ================================================================

// Customer Registration
app.post('/api/auth/register', (req, res) => {
  const { firstName, lastName, mobile, password, aadhar, pan } = req.body;
  if (!firstName || !mobile || !password || !aadhar || !pan) {
    return res.status(400).json({ error: 'All fields are required.' });
  }
  if (users.find(u => u.mobile === mobile)) {
    return res.status(400).json({ error: 'Mobile number already registered.' });
  }

  const accountNumber = `ACC${Math.floor(100000 + Math.random() * 900000)}`;
  const newUser = {
    userId: mobile,
    firstName, lastName, mobile, password, aadhar, pan,
    accountNumber,
    accountStatus: 'Pending',
    transferLimit: 50000,
    balance: 1000
  };
  users.push(newUser);

  res.status(201).json({ message: `Registration submitted! Account No: ${accountNumber}. Await admin approval.`, accountNumber });
});

// Login
app.post('/api/auth/login', (req, res) => {
  const { username, password } = req.body;
  const user = users.find(u => u.userId === username && u.password === password);
  if (!user) return res.status(401).json({ error: 'Invalid credentials.' });
  res.json({ role: 'Customer', user });
});

// ================================================================
// ADMIN ENDPOINTS
// ================================================================

// Get all customers
app.get('/api/admin/customers', (req, res) => {
  res.json(users);
});

// Approve / Hold / Reject
app.post('/api/admin/review', async (req, res) => {
  const { userId, action } = req.body;
  const user = users.find(u => u.userId === userId);
  if (!user) return res.status(404).json({ error: 'Customer not found.' });

  user.accountStatus = action;

  // Send email notification based on action
  const emailMap = {
    Approved: {
      subject: '🎉 Your Sid Bank Account is Approved!',
      html: `<h2>Hello ${user.firstName},</h2><p>Your account <b>${user.accountNumber}</b> has been <b style="color:green">approved</b>. You can now log in and start banking!</p>`
    },
    Hold: {
      subject: '⏳ Your Account is On Hold',
      html: `<h2>Hello ${user.firstName},</h2><p>Your account is currently <b style="color:orange">on hold</b> pending further verification. Our team will contact you shortly.</p>`
    },
    Rejected: {
      subject: '❌ Account Application Update',
      html: `<h2>Hello ${user.firstName},</h2><p>Unfortunately, your account application has been <b style="color:red">rejected</b>. Please contact support for more information.</p>`
    }
  };

  if (emailMap[action] && user.email) {
    await sendEmail(user.email, emailMap[action].subject, emailMap[action].html);
  }

  res.json({ message: `Account status updated to ${action}.` });
});

// Update transfer limit
app.post('/api/admin/update-limit', (req, res) => {
  const { userId, newLimit } = req.body;
  const user = users.find(u => u.userId === userId);
  if (!user) return res.status(404).json({ error: 'Customer not found.' });
  user.transferLimit = Number(newLimit);
  res.json({ message: `Transfer limit updated to ₹${newLimit}.` });
});

// Get all loans (admin view)
app.get('/api/admin/loans', (req, res) => {
  res.json(loans);
});

// Approve / Reject a loan
app.post('/api/admin/loan-review', async (req, res) => {
  const { loanId, action } = req.body; // action: 'Approved' | 'Rejected'
  const loan = loans.find(l => l.loanId === loanId);
  if (!loan) return res.status(404).json({ error: 'Loan not found.' });

  loan.status = action;

  // If approved, credit balance
  if (action === 'Approved') {
    const user = users.find(u => u.userId === loan.userId);
    if (user) user.balance += loan.amount;
  }

  res.json({ message: `Loan ${action}.` });
});

// ── Bank Management ──────────────────────────────────────────────

// Get all banks
app.get('/api/admin/banks', (req, res) => {
  res.json(banks);
});

// Add a new bank
app.post('/api/admin/banks', (req, res) => {
  const { bankId, bankName, ifsc, address } = req.body;
  if (!bankId || !bankName || !ifsc) {
    return res.status(400).json({ error: 'bankId, bankName and ifsc are required.' });
  }
  if (banks.find(b => b.bankId === bankId)) {
    return res.status(400).json({ error: 'Bank ID already exists.' });
  }
  const bank = { bankId, bankName, ifsc, address: address || '', isActive: true };
  banks.push(bank);
  res.status(201).json({ message: 'Bank added.', bank });
});

// Update bank
app.put('/api/admin/banks/:bankId', (req, res) => {
  const bank = banks.find(b => b.bankId === req.params.bankId);
  if (!bank) return res.status(404).json({ error: 'Bank not found.' });
  const { bankName, ifsc, address, isActive } = req.body;
  if (bankName !== undefined) bank.bankName = bankName;
  if (ifsc !== undefined) bank.ifsc = ifsc;
  if (address !== undefined) bank.address = address;
  if (isActive !== undefined) bank.isActive = isActive;
  res.json({ message: 'Bank updated.', bank });
});

// Delete bank
app.delete('/api/admin/banks/:bankId', (req, res) => {
  const idx = banks.findIndex(b => b.bankId === req.params.bankId);
  if (idx === -1) return res.status(404).json({ error: 'Bank not found.' });
  banks.splice(idx, 1);
  res.json({ message: 'Bank removed.' });
});

// ================================================================
// CUSTOMER ENDPOINTS
// ================================================================

// Money Transfer
app.post('/api/customer/transfer', (req, res) => {
  const { senderUserId, receiverAccount, amount, targetBankId } = req.body;

  const sender = users.find(u => u.userId === senderUserId);
  if (!sender) return res.status(404).json({ error: 'Sender account not found.' });
  if (sender.accountStatus !== 'Approved') return res.status(403).json({ error: 'Your account is not approved yet.' });
  if (amount <= 0) return res.status(400).json({ error: 'Invalid amount.' });
  if (amount > sender.transferLimit) return res.status(400).json({ error: `Amount exceeds transfer limit of ₹${sender.transferLimit}.` });
  if (sender.balance < amount) return res.status(400).json({ error: 'Insufficient balance.' });

  const isIntrabank = targetBankId === 'sid_bank_17';
  let receiver = null;

  if (isIntrabank) {
    receiver = users.find(u => u.accountNumber === receiverAccount);
    if (!receiver) return res.status(404).json({ error: 'Receiver account not found in Sid Bank.' });
    if (receiver.accountStatus !== 'Approved') return res.status(400).json({ error: 'Receiver account is not active.' });
    receiver.balance += amount;
  }

  // Deduct from sender
  sender.balance -= amount;

  const txn = {
    txnId: `TXN${Date.now()}`,
    type: isIntrabank ? 'Intrabank Transfer' : 'Interbank Transfer',
    fromAccount: sender.accountNumber,
    toAccount: receiverAccount,
    userId: senderUserId,
    amount,
    targetBankId,
    status: isIntrabank ? 'Settled' : 'Dispatched',
    date: new Date().toISOString()
  };
  transactions.push(txn);

  const msg = isIntrabank
    ? `₹${amount} transferred to ${receiverAccount} successfully.`
    : `₹${amount} dispatched to ${receiverAccount} at ${targetBankId}.`;

  res.json({ message: msg, transaction: txn });
});

// Get customer transactions
app.get('/api/customer/transactions/:userId', (req, res) => {
  const userTxns = transactions.filter(t => t.userId === req.params.userId);
  res.json(userTxns.reverse()); // latest first
});

// Apply for loan
app.post('/api/customer/loan', (req, res) => {
  const { userId, amount, months, purpose } = req.body;
  if (!userId || !amount || !months || !purpose) {
    return res.status(400).json({ error: 'All loan fields required.' });
  }
  const user = users.find(u => u.userId === userId);
  if (!user) return res.status(404).json({ error: 'User not found.' });
  if (user.accountStatus !== 'Approved') return res.status(403).json({ error: 'Account must be approved to apply.' });

  const loan = {
    loanId: `LOAN${Date.now()}`,
    userId, amount, months, purpose,
    status: 'Pending',
    appliedAt: new Date().toISOString()
  };
  loans.push(loan);
  res.status(201).json({ message: 'Loan application submitted. Await admin approval.', loan });
});

// Get customer loans
app.get('/api/customer/loans/:userId', (req, res) => {
  const userLoans = loans.filter(l => l.userId === req.params.userId);
  res.json(userLoans);
});

// ================================================================
// START
// ================================================================
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`✅ Server running at http://localhost:${PORT}`));