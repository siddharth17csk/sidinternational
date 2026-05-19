import {
  collection, doc, getDoc, getDocs, query, where,
  updateDoc, addDoc, serverTimestamp, orderBy
} from "firebase/firestore";
import { db } from "./firebaseSetup";
import { hubDb } from "./firebaseHub";
import { signInToHub } from "./hubAuth";
import { initiateInterbankTransfer } from "./hubService";

let _banksCache = null;



// Login: check employee collection first, then user collection
export async function loginUser(username, password) {
  // 1. Try employee (admin) login by email
  const empQ = query(
    collection(db, "employee"),
    where("email", "==", username),
    where("password", "==", password),
    where("isActive", "==", true)
  );
  const empSnap = await getDocs(empQ);
  if (!empSnap.empty) {
    const empDoc = empSnap.docs[0];
    const emp = { employeeId: empDoc.id, ...empDoc.data() };
    await updateDoc(doc(db, "employee", empDoc.id), { lastLoginAt: serverTimestamp() });
    await signInToHub(); // Connect to BMS hub
    return { role: "Admin", user: emp };
  }

  // 2. Try customer login by mobile
  let userSnap;
  const mobileQ = query(
    collection(db, "user"),
    where("mobile", "==", username),
    where("password", "==", password)
  );
  userSnap = await getDocs(mobileQ);

  // 3. If not found by mobile, try by email
  if (userSnap.empty) {
    const emailQ = query(
      collection(db, "user"),
      where("email", "==", username),
      where("password", "==", password)
    );
    userSnap = await getDocs(emailQ);
  }

  if (!userSnap.empty) {
    const userDoc = userSnap.docs[0];
    const userData = { userId: userDoc.id, ...userDoc.data() };

    // Fetch userDetails (kyc, loan info) — stored via addDoc so query by userId field
    const detQ = query(collection(db, "userDetails"), where("userId", "==", userDoc.id));
    const detSnap = await getDocs(detQ);
    if (!detSnap.empty) {
      Object.assign(userData, detSnap.docs[0].data());
    }

    await signInToHub(); // Connect to BMS hub
    return { role: "Customer", user: userData };
  }

  throw new Error("Invalid credentials.");
}

// Register new customer
export async function registerCustomer(formData) {
  const { firstName, lastName, email, mobile, password, aadhar, pan } = formData;

  // Check if mobile already exists
  const existQ = query(collection(db, "user"), where("mobile", "==", mobile));
  const existSnap = await getDocs(existQ);
  if (!existSnap.empty) throw new Error("Mobile number already registered.");

  const accountNumber = `ACC${Math.floor(100000 + Math.random() * 900000)}`;
  const accountId = `ACCTID${Date.now()}`;

  // Write to user collection
  const userRef = await addDoc(collection(db, "user"), {
    firstName, lastName, email, mobile, password,
    accountId, accountNumber,
    accountStatus: "Pending",
    accountType: "Savings",
    balance: 1000,
    createdAt: serverTimestamp(),
  });

  // Write to userDetails collection (include userId for querying later)
  await addDoc(collection(db, "userDetails"), {
    userId: userRef.id,
    aadharNumber: aadhar,
    panNumber: pan,
    kycStatus: "Pending",
    hasLoan: false,
  });

  return { userId: userRef.id, accountNumber };
}



export async function getCustomerProfile(userId) {
  // Read 1: user doc — balance, status, transferLimit
  const userSnap = await getDoc(doc(db, "user", userId));
  if (!userSnap.exists()) throw new Error("User not found.");
  const userData = { userId: userSnap.id, ...userSnap.data() };

  // Read 2: userDetails doc — kyc, pan, aadhaar
  const detQ = query(collection(db, "userDetails"), where("userId", "==", userId));
  const detSnap = await getDocs(detQ);
  if (!detSnap.empty) Object.assign(userData, detSnap.docs[0].data());

  return userData;
}



export async function getAllCustomers() {
  const snap = await getDocs(collection(db, "user"));
  const customers = [];
  for (const d of snap.docs) {
    const userData = { userId: d.id, ...d.data() };
    // Fetch userDetails for kyc — query by userId field
    const detQ = query(collection(db, "userDetails"), where("userId", "==", d.id));
    const detSnap = await getDocs(detQ);
    if (!detSnap.empty) Object.assign(userData, detSnap.docs[0].data());
    customers.push(userData);
  }
  return customers;
}

export async function updateCustomerStatus(userId, accountStatus) {
  await updateDoc(doc(db, "user", userId), { accountStatus });
}

export async function updateTransferLimit(userId, transferLimit) {
  await updateDoc(doc(db, "user", userId), { transferLimit: Number(transferLimit) });
}



export async function getAllLoans() {
  const snap = await getDocs(collection(db, "loan"));
  return snap.docs.map(d => ({ loanId: d.id, ...d.data() }));
}

export async function updateLoanStatus(loanId, status, employeeId) {
  await updateDoc(doc(db, "loan", loanId), {
    status,
    approvedBy: employeeId,
    approvedAt: serverTimestamp(),
  });
  // If approved, credit balance to user
  if (status === "Approved") {
    const loanDoc = await getDoc(doc(db, "loan", loanId));
    const loan = loanDoc.data();
    const userDoc = await getDoc(doc(db, "user", loan.userId));
    if (userDoc.exists()) {
      const newBalance = (userDoc.data().balance || 0) + (loan.loanAmount || 0);
      await updateDoc(doc(db, "user", loan.userId), { balance: newBalance });
    }
    // Mark hasLoan in userDetails
    const detQ = query(collection(db, "userDetails"), where("userId", "==", loan.userId));
    const detSnap = await getDocs(detQ);
    if (!detSnap.empty) {
      await updateDoc(doc(db, "userDetails", detSnap.docs[0].id), { hasLoan: true });
    }
  }
}



export async function getAllBanks() {
  // Return cached — banks rarely change; saves reads on every refreshAll call
  if (_banksCache) return _banksCache;
  const snap = await getDocs(collection(hubDb, "banks"));
  _banksCache = snap.docs.map(d => ({
    bankId:   d.data().bankId || d.id,
    bankName: d.data().bankName,
    ifscCode: (d.data().ifscPrefix || d.data().ifscCode || "") + "0001",
    isActive: !!d.data().isActive && d.data().isActive !== "false",
  }));
  return _banksCache;
}

export async function addBank(bankData) {
  await addDoc(collection(db, "bank"), { ...bankData, isActive: true });
}

export async function updateBank(bankId, updates) {
  await updateDoc(doc(db, "bank", bankId), updates);
}



export async function getAllEmployees() {
  const snap = await getDocs(collection(db, "employee"));
  return snap.docs.map(d => ({ employeeId: d.id, ...d.data() }));
}

export async function addEmployee(empData) {
  await addDoc(collection(db, "employee"), {
    ...empData,
    isActive: true,
    loanAccess: false,
    createAccess: false,
    createdAt: serverTimestamp(),
  });
}

export async function updateEmployee(employeeId, updates) {
  await updateDoc(doc(db, "employee", employeeId), updates);
}



export async function getCustomerTransactions(userId) {
  const q = query(
    collection(db, "transaction"),
    where("userId", "==", userId)
  );
  const snap = await getDocs(q);
  const results = snap.docs.map(d => ({ transactionId: d.id, ...d.data() }));
  // Sort client-side to avoid needing a Firestore composite index
  return results.sort((a, b) => {
    const aTime = a.transactionDate?.toDate?.() ?? new Date(a.transactionDate ?? 0);
    const bTime = b.transactionDate?.toDate?.() ?? new Date(b.transactionDate ?? 0);
    return bTime - aTime;
  });
}



export async function executeTransfer({ senderUserId, receiverAccountNo, amount, targetBankId }) {
  // Fetch sender
  const senderDoc = await getDoc(doc(db, "user", senderUserId));
  if (!senderDoc.exists()) throw new Error("Sender account not found.");
  const sender = senderDoc.data();

  if (sender.accountStatus !== "Approved") throw new Error("Your account is not approved.");
  if (amount <= 0) throw new Error("Invalid amount.");
  if (amount > (sender.transferLimit || 50000)) throw new Error(`Exceeds transfer limit of ₹${sender.transferLimit || 50000}.`);
  if (sender.balance < amount) throw new Error("Insufficient balance.");

  const isIntrabank = targetBankId === "sid_bank_17";

  if (isIntrabank) {
    const recQ = query(collection(db, "user"), where("accountNumber", "==", receiverAccountNo));
    const recSnap = await getDocs(recQ);
    if (recSnap.empty) throw new Error("Receiver account not found in Sid Bank.");
    const recDoc = recSnap.docs[0];
    const receiver = recDoc.data();

    await updateDoc(doc(db, "user", senderUserId), { balance: sender.balance - amount });
    await updateDoc(doc(db, "user", recDoc.id), { balance: (receiver.balance || 0) + amount });

    await addDoc(collection(db, "transaction"), {
      userId: senderUserId,
      accountId: sender.accountId,
      fromAccountNo: sender.accountNumber,
      toAccountNo: receiverAccountNo,
      transactionAmount: amount,
      transactionDate: serverTimestamp(),
      transactionStatus: "Settled",
      type: "Debit",
      description: "Intrabank Transfer",
    });

    await addDoc(collection(db, "transaction"), {
      userId: recDoc.id,
      accountId: receiver.accountId,
      fromAccountNo: sender.accountNumber,
      toAccountNo: receiverAccountNo,
      transactionAmount: amount,
      transactionDate: serverTimestamp(),
      transactionStatus: "Settled",
      type: "Credit",
      description: "Intrabank Transfer",
    });

    return `₹${amount} transferred to ${receiverAccountNo} successfully.`;
  } else {
    // ── Interbank: route through BMS hub ──────────────────────
    await initiateInterbankTransfer({
      senderUserId,
      toAccountId:  receiverAccountNo,
      toBankId:     targetBankId,
      amountPaise:  Math.round(amount * 100),
      mode:         "neft",
    });

    return `₹${amount} dispatched to ${receiverAccountNo} at ${targetBankId} via BMS hub.`;
  }
}



export async function getCustomerLoans(userId) {
  const q = query(collection(db, "loan"), where("userId", "==", userId));
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ loanId: d.id, ...d.data() }));
}

export async function applyForLoan({ userId, accountId, loanAmount, loanType, tenure, purpose }) {
  const detQ = query(collection(db, "userDetails"), where("userId", "==", userId));
  const detSnap = await getDocs(detQ);
  if (!detSnap.empty && detSnap.docs[0].data().hasLoan) {
    throw new Error("You already have an active loan.");
  }

  const interest = 8.5;
  const emiAmount = Math.round((loanAmount * (interest / 1200)) /
    (1 - Math.pow(1 + interest / 1200, -tenure)));

  const dueDate = new Date();
  dueDate.setMonth(dueDate.getMonth() + 1);

  await addDoc(collection(db, "loan"), {
    userId, accountId,
    loanAmount, loanType: loanType || "Personal",
    tenure, emiAmount,
    interest,
    status: "Pending",
    approvedBy: null,
    approvedAt: null,
    createdAt: serverTimestamp(),
    dueDate: dueDate.toISOString(),
    purpose: purpose || "",
  });
}


export async function getKycStatus(userId) {
  const q = query(collection(db, "kycUser"), where("userId", "==", userId));
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ kycId: d.id, ...d.data() }));
}



export async function getNotifications(userId) {
  const q = query(
    collection(db, "transferNotif"),
    where("userId", "==", userId)
  );
  const snap = await getDocs(q);
  const results = snap.docs.map(d => ({ notifId: d.id, ...d.data() }));
  // Sort client-side to avoid needing a Firestore composite index
  return results.sort((a, b) => {
    const aTime = a.createdAt?.toDate?.() ?? new Date(a.createdAt ?? 0);
    const bTime = b.createdAt?.toDate?.() ?? new Date(b.createdAt ?? 0);
    return bTime - aTime;
  });
}

export async function markNotifRead(notifId) {
  await updateDoc(doc(db, "transferNotif", notifId), { isRead: true });
}