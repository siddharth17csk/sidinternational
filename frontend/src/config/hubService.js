import {
  collection, doc, getDocs, getDoc, query, where,
  onSnapshot, runTransaction, updateDoc, setDoc, serverTimestamp
} from "firebase/firestore";
import { db }     from "./firebaseSetup";
import { hubDb }  from "./firebaseHub";

const BANK_ID = import.meta.env.VITE_BANK_ID; 


export const initiateInterbankTransfer = async ({
  senderUserId, toAccountId, toBankId, amountPaise, mode = "neft"
}) => {
  // Fetch sender from private DB
  const senderDoc = await getDoc(doc(db, "user", senderUserId));
  if (!senderDoc.exists()) throw new Error("Sender account not found.");
  const sender = senderDoc.data();

  if (sender.accountStatus !== "Approved") throw new Error("Your account is not approved.");
  if (amountPaise <= 0) throw new Error("Invalid amount.");
  if (amountPaise > (sender.transferLimit || 50000) * 100)
    throw new Error(`Exceeds transfer limit of ₹${sender.transferLimit || 50000}.`);
  if (sender.balance * 100 < amountPaise) throw new Error("Insufficient balance.");

  // Generate transferId BEFORE transaction — used as doc ID in both DBs
  const transferRef = doc(collection(db, "transaction"));
  const transferId  = transferRef.id;

  // ── Phase 1: atomically deduct sender balance in private DB ──
  await runTransaction(db, async (txn) => {
    const freshSnap = await txn.get(doc(db, "user", senderUserId));
    if (freshSnap.data().balance * 100 < amountPaise)
      throw new Error("Insufficient balance.");

    txn.update(doc(db, "user", senderUserId), {
      balance: freshSnap.data().balance - (amountPaise / 100),
    });

    // Write local pending transaction record
    txn.set(transferRef, {
      transactionId:    transferId,
      userId:           senderUserId,
      accountId:        sender.accountId,
      fromAccountNo:    sender.accountNumber,
      toAccountNo:      toAccountId,
      transactionAmount: amountPaise / 100,
      transactionDate:  serverTimestamp(),
      transactionStatus: "Pending",
      type:             "Debit",
      description:      `Interbank Transfer to ${toBankId}`,
      fromBankId:       BANK_ID,
      toBankId,
      mode,
    });
  });

  try {
    await setDoc(doc(hubDb, "interbank_transfers", transferId), {
      transferId,
      fromBankId:    BANK_ID,
      toBankId,
      fromAccountId: senderUserId,
      toAccountId,        
      amount:        amountPaise,
      currency:      "INR",
      mode,
      status:        "pending",
      createdAt:     serverTimestamp(),
      completedAt:   null,
      failureReason: null,
    });
  } catch (hubErr) {
    console.error("[HUB WRITE] Failed:", hubErr.message);
    // Mark local record as failed
    await updateDoc(transferRef, {
      transactionStatus: "Failed",
      failureReason: "Hub write failed: " + hubErr.message,
    });
    throw new Error("Transfer failed — could not reach the hub. Contact support.");
  }

  return transferId;
};


export const startIncomingListener = (onSuccess, onError) => {
  console.log("[LISTENER] Starting incoming listener for bankId:", BANK_ID);

  // ONE where clause only — avoids composite index requirement
  const q = query(
    collection(hubDb, "interbank_transfers"),
    where("toBankId", "==", BANK_ID)
  );

  return onSnapshot(q, async (snapshot) => {
    for (const change of snapshot.docChanges()) {
      if (change.type !== "added" && change.type !== "modified") continue;

      const transfer = { id: change.doc.id, ...change.doc.data() };

      // Filter status in JS — no composite index needed
      if (transfer.status !== "pending") continue;

      console.log("[LISTENER] Processing incoming transfer:", transfer.transferId);
      await processIncoming(transfer).catch(err => {
        console.error("[LISTENER] Failed to process:", err.message);
        onError?.(transfer, err);
      });
    }
  }, err => {
    console.error("[LISTENER] onSnapshot error:", err.code, err.message);
  });
};

const processIncoming = async (transfer) => {
  const { transferId, fromBankId, fromAccountId, toAccountId, amount } = transfer;

  const hubRef   = doc(hubDb, "interbank_transfers", transferId);
  const localRef = doc(db, "transaction", transferId); // use transferId as doc ID (duplicate guard)

  // Find recipient by account NUMBER in our "user" collection
  const q    = query(collection(db, "user"), where("accountNumber", "==", toAccountId));
  const snap = await getDocs(q);

  if (snap.empty) {
    await updateDoc(hubRef, {
      status:        "failed",
      failureReason: `Account ${toAccountId} not found in Sid Bank`,
      completedAt:   serverTimestamp(),
    });
    return;
  }

  const recipientDoc = snap.docs[0];
  const recipient    = recipientDoc.data();
  const recipientRef = doc(db, "user", recipientDoc.id);

  try {
    await runTransaction(db, async (txn) => {
      const toSnap    = await txn.get(recipientRef);
      const localSnap = await txn.get(localRef);

      // Duplicate guard — already processed? skip silently
      if (localSnap.exists()) throw new Error("DUPLICATE");
      if (!toSnap.exists())   throw new Error("Recipient account not found.");

      const amountRupees = amount / 100;

      txn.update(recipientRef, {
        balance: toSnap.data().balance + amountRupees,
      });

      txn.set(localRef, {
        transactionId:    transferId,
        userId:           recipientDoc.id,
        accountId:        recipient.accountId,
        fromAccountNo:    fromAccountId,
        toAccountNo:      toAccountId,
        transactionAmount: amountRupees,
        transactionDate:  serverTimestamp(),
        transactionStatus: "Settled",
        type:             "Credit",
        description:      `Interbank Transfer from ${fromBankId}`,
        fromBankId,
        toBankId:         BANK_ID,
        mode:             transfer.mode,
      });
    });

    // Mark as completed in hub
    await updateDoc(hubRef, {
      status:      "completed",
      completedAt: serverTimestamp(),
    });

    console.log("[LISTENER] Transfer completed:", transferId);

  } catch (err) {
    if (err.message === "DUPLICATE") {
      console.log("[LISTENER] Duplicate skipped:", transferId);
      return;
    }
    await updateDoc(hubRef, {
      status:        "failed",
      failureReason: err.message,
      completedAt:   serverTimestamp(),
    });
  }
};


export const startStatusListener = (onStatusChange) => {
  const q = query(
    collection(hubDb, "interbank_transfers"),
    where("fromBankId", "==", BANK_ID)
  );

  return onSnapshot(q, async (snapshot) => {
    for (const change of snapshot.docChanges()) {
      if (change.type !== "added" && change.type !== "modified") continue;

      const transfer = { id: change.doc.id, ...change.doc.data() };
      if (transfer.status === "pending") continue; // not done yet

      // Update our local transaction record
      const localRef  = doc(db, "transaction", transfer.transferId ?? transfer.id);
      const localSnap = await getDoc(localRef);

      if (localSnap.exists() && localSnap.data().type === "Debit") {
        await updateDoc(localRef, {
          transactionStatus: transfer.status === "completed" ? "Settled" : "Failed",
          failureReason:     transfer.failureReason ?? null,
        });
        onStatusChange?.(transfer);
      }
    }
  });
};


export const registerBankOnHub = async () => {
  await setDoc(doc(hubDb, "banks", BANK_ID), {
    bankId:    BANK_ID,
    bankName:  import.meta.env.VITE_BANK_NAME  || "Sid Bank International",
    ifscPrefix: (import.meta.env.VITE_IFSC_CODE || "SIDB0001").slice(0, 4),
    isActive:  true,
    updatedAt: serverTimestamp(),
  });
  console.log("[HUB] Bank registered on hub:", BANK_ID);
};


export const registerAccountOnHub = async (userId, accountNumber) => {
  const masked = "••••" + accountNumber.slice(-4);
  await setDoc(doc(hubDb, "public_accounts", userId), {
    accountId:            userId,
    bankId:               BANK_ID,
    maskedAccountNumber:  masked,
    ifscCode:             import.meta.env.VITE_IFSC_CODE || "SIDB0001",
    isActive:             true,
    registeredAt:         serverTimestamp(),
  });
  console.log("[HUB] Account registered on hub:", masked);
};
