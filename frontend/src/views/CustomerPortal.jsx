import React, { useState, useEffect, useCallback } from 'react';
import {
  getCustomerTransactions, getCustomerLoans, applyForLoan,
  executeTransfer, getAllBanks, getKycStatus, getNotifications, markNotifRead,
  getCustomerProfile
} from '../config/firestoreService';
import { startIncomingListener, startStatusListener } from '../config/hubService';

function statusBadge(s) {
  const map = {
    Approved:'badge-success', Settled:'badge-success', Credit:'badge-success', Verified:'badge-success',
    Rejected:'badge-error', Failed:'badge-error', Debit:'badge-error',
    Pending:'badge-warning', Dispatched:'badge-warning', Hold:'badge-warning',
  };
  return <span className={`badge ${map[s]||'badge-default'}`}>{s}</span>;
}

export default function CustomerPortal({ userSession, onLogout }) {
  const [tab, setTab]       = useState(0);
  const [userData, setUserData] = useState(userSession || {});

  const [hubBanks, setHubBanks]         = useState([]);
  const [transferForm, setTransferForm] = useState({ receiverAccount:'', amount:'', targetBankId:'' });
  const [transferMsg, setTransferMsg]   = useState(null);
  const [transferring, setTransferring] = useState(false);

  const [loanForm, setLoanForm] = useState({ amount:'', months:'', loanType:'Personal', purpose:'' });
  const [loanMsg, setLoanMsg]   = useState(null);
  const [loans, setLoans]       = useState([]);

  const [transactions, setTransactions] = useState([]);
  const [kycDocs, setKycDocs]           = useState([]);
  const [notifs, setNotifs]             = useState([]);

  const user = userData;

  const refreshAll = useCallback(async () => {
    if (!user.userId) return;
    try {
      const [txRes, lnRes, bRes, kycRes, notifRes, freshUser] = await Promise.all([
        getCustomerTransactions(user.userId),
        getCustomerLoans(user.userId),
        getAllBanks(),
        getKycStatus(user.userId),
        getNotifications(user.userId),
        getCustomerProfile(user.userId),  // 2 reads: fetches latest balance from DB
      ]);
      setTransactions(txRes);
      setLoans(lnRes);
      setHubBanks(bRes);
      setKycDocs(kycRes);
      setNotifs(notifRes);
      setUserData(freshUser);             // updates displayed balance accurately
    } catch (err) { console.error('Refresh error:', err); }
  }, [user.userId]);

  useEffect(() => { refreshAll(); }, [refreshAll]);

  // Start hub listeners once on mount — cleans up on logout/unmount
  useEffect(() => {
    if (!user.userId) return;

    // Listens for incoming transfers from other banks → credits our user's balance
    const unsubIncoming = startIncomingListener(
      () => refreshAll(),
      (transfer, err) => console.error('[INCOMING] Failed:', transfer, err)
    );

    // Listens for status updates on transfers we sent → updates Pending → Settled/Failed
    const unsubStatus = startStatusListener(
      () => refreshAll()
    );

    return () => {
      unsubIncoming?.();
      unsubStatus?.();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user.userId]);

  const handleTransfer = async (e) => {
    e.preventDefault(); setTransferMsg(null); setTransferring(true);
    try {
      const msg = await executeTransfer({
        senderUserId:    user.userId,
        receiverAccountNo: transferForm.receiverAccount,
        amount:          parseFloat(transferForm.amount),
        targetBankId:    transferForm.targetBankId || 'sid_bank_17',
      });
      setTransferMsg({ type:'success', text: msg });
      // Update local balance
      setUserData(prev => ({ ...prev, balance: prev.balance - parseFloat(transferForm.amount) }));
      setTransferForm({ receiverAccount:'', amount:'', targetBankId:'' });
      await refreshAll();
    } catch (err) {
      setTransferMsg({ type:'error', text: err.message || 'Transfer failed.' });
    } finally { setTransferring(false); }
  };

  const handleLoanApply = async (e) => {
    e.preventDefault(); setLoanMsg(null);
    try {
      await applyForLoan({
        userId:     user.userId,
        accountId:  user.accountId,
        loanAmount: parseFloat(loanForm.amount),
        loanType:   loanForm.loanType,
        tenure:     parseInt(loanForm.months),
        purpose:    loanForm.purpose,
      });
      setLoanMsg({ type:'success', text:'Loan application submitted. Await admin approval.' });
      setLoanForm({ amount:'', months:'', loanType:'Personal', purpose:'' });
      await refreshAll();
    } catch (err) {
      setLoanMsg({ type:'error', text: err.message || 'Application failed.' });
    }
  };

  const handleMarkRead = async (notifId) => {
    await markNotifRead(notifId);
    setNotifs(prev => prev.map(n => n.notifId === notifId ? { ...n, isRead: true } : n));
  };

  const unreadCount = notifs.filter(n => !n.isRead).length;
  const hasLoan = loans.some(l => l.status === 'Approved');
  const kycStatus = user.kycStatus || 'Pending';

  const TABS = ['§ Portfolio', '⇄ Transfer', '✦ Loans', '⊟ Ledger', `🔔 Alerts${unreadCount>0?` (${unreadCount})`:''}`];

  return (
    <div>
      <div className="dash-header">
        <div>
          <div className="dash-header-title">⚿ Customer Vault — {user.firstName} {user.lastName}</div>
          <div className="user-badge">
            <span className="node-id">{user.accountNumber}</span>
            &nbsp;·&nbsp;{user.accountStatus}
            &nbsp;·&nbsp;KYC: {kycStatus}
          </div>
        </div>
        <div style={{ display:'flex', alignItems:'center', gap:12 }}>
          <span className="node-id">NODE: sid_bank_17</span>
          <button className="btn-danger" onClick={onLogout}>⏻ Exit</button>
        </div>
      </div>

      <div className="page-wrapper">
        <div className="vintage-tabs">
          {TABS.map((t,i) => (
            <button key={i} className={`vintage-tab${tab===i?' active':''}`} onClick={()=>setTab(i)}>{t}</button>
          ))}
        </div>

        {/* TAB 0 — PORTFOLIO */}
        {tab===0&&(
          <div>
            <div className="balance-hero vintage-card" style={{ marginBottom:20 }}>
              <div className="card-corner tl"/><div className="card-corner tr"/>
              <div className="card-corner bl"/><div className="card-corner br"/>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', flexWrap:'wrap', gap:16 }}>
                <div>
                  <div style={{ fontFamily:'var(--font-stamp)', fontSize:10, letterSpacing:'0.3em', color:'var(--sepia)', textTransform:'uppercase', marginBottom:8 }}>Available Balance</div>
                  <div className="balance-amount">₹ {(user.balance||0).toLocaleString('en-IN')}</div>
                  <div style={{ fontFamily:'var(--font-stamp)', fontSize:11, color:'var(--ink-faded)', marginTop:6, letterSpacing:'0.15em' }}>{user.accountNumber}</div>
                </div>
                <div style={{ textAlign:'right' }}>
                  <div style={{ fontFamily:'var(--font-stamp)', fontSize:9, color:'var(--sepia)', letterSpacing:'0.25em', textTransform:'uppercase', marginBottom:4 }}>Transfer Limit</div>
                  <div style={{ fontFamily:'var(--font-display)', fontSize:22, color:'var(--gold)' }}>₹ {(user.transferLimit||50000).toLocaleString('en-IN')}</div>
                </div>
              </div>
            </div>

            <div className="grid-3">
              {[
                ['Account Status',  statusBadge(user.accountStatus)],
                ['Account Type',    <span className="mono">{user.accountType||'Savings'}</span>],
                ['KYC Status',      statusBadge(kycStatus)],
                ['Has Active Loan', <span className="mono">{hasLoan?'Yes':'No'}</span>],
                ['Mobile',          <span className="mono">{user.mobile}</span>],
                ['Email',           <span style={{fontSize:12}}>{user.email||'—'}</span>],
                ['Aadhaar (last4)', <span className="mono">****{user.aadharNumber?.slice(-4)||'—'}</span>],
                ['PAN',             <span className="mono">{user.panNumber||'—'}</span>],
                ['Account No.',     <span className="node-id">{user.accountNumber}</span>],
              ].map(([label,val])=>(
                <div className="vintage-card" key={label} style={{ padding:16 }}>
                  <div className="card-corner tl"/><div className="card-corner tr"/>
                  <div className="card-corner bl"/><div className="card-corner br"/>
                  <div style={{ fontFamily:'var(--font-stamp)', fontSize:9, letterSpacing:'0.25em', color:'var(--sepia)', textTransform:'uppercase', marginBottom:8 }}>{label}</div>
                  <div style={{ color:'var(--ink)' }}>{val}</div>
                </div>
              ))}
            </div>

            {/* KYC Documents */}
            {kycDocs.length>0&&(
              <div className="vintage-card" style={{ marginTop:20 }}>
                <div className="card-corner tl"/><div className="card-corner tr"/>
                <div className="card-corner bl"/><div className="card-corner br"/>
                <h3 className="section-title">KYC Documents</h3>
                <div className="vintage-table-wrap">
                  <table className="vintage-table">
                    <thead><tr><th>Document Type</th><th>KYC ID</th><th>Status</th><th>Verified By</th></tr></thead>
                    <tbody>
                      {kycDocs.map(k=>(
                        <tr key={k.kycId}>
                          <td>{k.docType}</td>
                          <td className="mono">{k.kycId}</td>
                          <td>{statusBadge(k.status)}</td>
                          <td>{k.verifiedBy||'—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB 1 — TRANSFER */}
        {tab===1&&(
          <div className="grid-2">
            <div className="vintage-card transfer-panel">
              <div className="card-corner tl"/><div className="card-corner tr"/>
              <div className="card-corner bl"/><div className="card-corner br"/>
              <h3 className="section-title">Fund Dispatch</h3>

              {user.accountStatus!=='Approved'&&(
                <div className="alert alert-error" style={{ marginBottom:16 }}>
                  ⚠ Account must be <strong>Approved</strong> before transfers.
                </div>
              )}

              {transferMsg&&(
                <div className={`alert alert-${transferMsg.type==='success'?'success':'error'}`} style={{ marginBottom:16 }}>
                  {transferMsg.type==='success'?'✓':'⚠'} {transferMsg.text}
                </div>
              )}

              <form onSubmit={handleTransfer}>
                <div className="form-group">
                  <label className="vintage-label">Destination Bank Node</label>
                  <select className="vintage-input" value={transferForm.targetBankId}
                    onChange={e=>setTransferForm({...transferForm,targetBankId:e.target.value})} required>
                    <option value="">— Select target bank —</option>
                    <option value="sid_bank_17">⊕ Sid Bank (Internal — No Fee)</option>
                    {hubBanks.filter(b=>
                      b.isActive &&
                      b.bankName !== 'Siddharth International Bank'
                    ).map(b=>(
                      <option key={b.bankId} value={b.bankId}>{b.bankName} ({b.ifscCode})</option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label className="vintage-label">Beneficiary Account Number</label>
                  <input className="vintage-input" type="text" placeholder="e.g. ACC504697"
                    value={transferForm.receiverAccount}
                    onChange={e=>setTransferForm({...transferForm,receiverAccount:e.target.value})} required/>
                </div>
                <div className="form-group">
                  <label className="vintage-label">Amount (₹ INR)</label>
                  <input className="vintage-input" type="number" min="1" max={user.transferLimit||50000} step="0.01" placeholder="0.00"
                    value={transferForm.amount}
                    onChange={e=>setTransferForm({...transferForm,amount:e.target.value})} required/>
                  <div style={{ marginTop:4, fontFamily:'var(--font-stamp)', fontSize:10, color:'var(--ink-ghost)', letterSpacing:'0.1em' }}>
                    Limit: ₹{(user.transferLimit||50000).toLocaleString('en-IN')} per transaction
                  </div>
                </div>
                <button type="submit" className="btn-primary"
                  disabled={transferring||user.accountStatus!=='Approved'}>
                  {transferring?'⟳ Authorising...':'⇄ Execute Transfer'}
                </button>
              </form>
            </div>

            <div className="vintage-card">
              <div className="card-corner tl"/><div className="card-corner tr"/>
              <div className="card-corner bl"/><div className="card-corner br"/>
              <h3 className="section-title">Active Hub Nodes</h3>
              {hubBanks.filter(b=>b.isActive).map(b=>(
                <div key={b.bankId} style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'10px 14px', background:'rgba(0,0,0,0.3)', border:'1px solid var(--border-ornate)', marginBottom:8 }}>
                  <div>
                    <div style={{ fontFamily:'var(--font-display)', fontSize:14, color:'var(--gold)' }}>{b.bankName}</div>
                    <div className="mono" style={{ fontSize:11 }}>{b.ifscCode}</div>
                  </div>
                  <span className="badge badge-success">● ACTIVE</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 2 — LOANS */}
        {tab===2&&(
          <div className="grid-2">
            <div className="vintage-card">
              <div className="card-corner tl"/><div className="card-corner tr"/>
              <div className="card-corner bl"/><div className="card-corner br"/>
              <h3 className="section-title">Apply for Credit</h3>
              {loanMsg&&(
                <div className={`alert alert-${loanMsg.type==='success'?'success':'error'}`} style={{ marginBottom:16 }}>
                  {loanMsg.type==='success'?'✓':'⚠'} {loanMsg.text}
                </div>
              )}
              <form onSubmit={handleLoanApply}>
                <div className="form-group">
                  <label className="vintage-label">Loan Type</label>
                  <select className="vintage-input" value={loanForm.loanType}
                    onChange={e=>setLoanForm({...loanForm,loanType:e.target.value})}>
                    {['Personal','Home','Vehicle','Education','Business'].map(t=><option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label className="vintage-label">Loan Amount (₹ INR)</label>
                  <input className="vintage-input" type="number" min="1000" placeholder="e.g. 50000"
                    value={loanForm.amount} onChange={e=>setLoanForm({...loanForm,amount:e.target.value})} required/>
                </div>
                <div className="form-group">
                  <label className="vintage-label">Repayment Term (Months)</label>
                  <input className="vintage-input" type="number" min="1" max="360" placeholder="e.g. 12"
                    value={loanForm.months} onChange={e=>setLoanForm({...loanForm,months:e.target.value})} required/>
                  {loanForm.amount&&loanForm.months&&(
                    <div style={{ marginTop:6, fontFamily:'var(--font-stamp)', fontSize:10, color:'var(--gold)', letterSpacing:'0.1em' }}>
                      Est. EMI: ₹{Math.round((parseFloat(loanForm.amount)*(8.5/1200))/(1-Math.pow(1+8.5/1200,-parseInt(loanForm.months)))).toLocaleString('en-IN')} /mo @ 8.5% p.a.
                    </div>
                  )}
                </div>
                <div className="form-group">
                  <label className="vintage-label">Purpose / Collateral Note</label>
                  <textarea className="vintage-input" rows={3} placeholder="State the purpose of the loan..."
                    style={{ resize:'vertical' }}
                    value={loanForm.purpose} onChange={e=>setLoanForm({...loanForm,purpose:e.target.value})} required/>
                </div>
                <button type="submit" className="btn-primary"
                  style={{ background:'linear-gradient(180deg,#2a5a2e,#1a3a1e)', borderColor:'#2a5a2e' }}>
                  ✉ Submit Application
                </button>
              </form>
            </div>

            <div className="vintage-card">
              <div className="card-corner tl"/><div className="card-corner tr"/>
              <div className="card-corner bl"/><div className="card-corner br"/>
              <h3 className="section-title">My Loan Dossiers</h3>
              {loans.length===0
                ?<div style={{ color:'var(--ink-ghost)', fontFamily:'var(--font-stamp)', fontSize:11, letterSpacing:'0.1em' }}>— No loan applications on file —</div>
                :<div className="vintage-table-wrap">
                  <table className="vintage-table">
                    <thead><tr><th>Type</th><th>Amount</th><th>Tenure</th><th>EMI</th><th>Due Date</th><th>Status</th></tr></thead>
                    <tbody>
                      {loans.map(l=>(
                        <tr key={l.loanId}>
                          <td>{l.loanType||'Personal'}</td>
                          <td style={{ color:'var(--gold)' }}>₹{(l.loanAmount||0).toLocaleString('en-IN')}</td>
                          <td className="mono">{l.tenure} mo.</td>
                          <td className="mono">₹{(l.emiAmount||0).toLocaleString('en-IN')}</td>
                          <td className="mono" style={{ fontSize:11 }}>{l.dueDate?new Date(l.dueDate).toLocaleDateString('en-IN'):'—'}</td>
                          <td>{statusBadge(l.status)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              }
            </div>
          </div>
        )}

        {/* TAB 3 — LEDGER */}
        {tab===3&&(
          <div className="vintage-card">
            <div className="card-corner tl"/><div className="card-corner tr"/>
            <div className="card-corner bl"/><div className="card-corner br"/>
            <h3 className="section-title">Transaction Ledger</h3>
            {transactions.length===0
              ?<div style={{ color:'var(--ink-ghost)', fontFamily:'var(--font-stamp)', fontSize:11, letterSpacing:'0.1em', textAlign:'center', padding:'20px 0' }}>— No transactions recorded —</div>
              :<div className="vintage-table-wrap">
                <table className="vintage-table">
                  <thead><tr><th>Type</th><th>Amount (₹)</th><th>To / From</th><th>Description</th><th>Date</th><th>Status</th></tr></thead>
                  <tbody>
                    {transactions.map(t=>(
                      <tr key={t.transactionId}>
                        <td>{statusBadge(t.type)}</td>
                        <td style={{ color:t.type==='Credit'?'#a8d8aa':'#e8a8a8', fontFamily:'var(--font-display)', fontWeight:700 }}>
                          {t.type==='Credit'?'+':'-'}₹{(t.transactionAmount||0).toLocaleString('en-IN')}
                        </td>
                        <td className="mono">{t.toAccountNo||t.fromAccountNo||'—'}</td>
                        <td style={{ maxWidth:180, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', fontSize:12 }}>{t.description||'—'}</td>
                        <td className="mono" style={{ fontSize:11 }}>
                          {t.transactionDate?.toDate?t.transactionDate.toDate().toLocaleDateString('en-IN'):t.transactionDate?new Date(t.transactionDate).toLocaleDateString('en-IN'):'—'}
                        </td>
                        <td>{statusBadge(t.transactionStatus)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            }
          </div>
        )}

        {/* TAB 4 — NOTIFICATIONS */}
        {tab===4&&(
          <div className="vintage-card">
            <div className="card-corner tl"/><div className="card-corner tr"/>
            <div className="card-corner bl"/><div className="card-corner br"/>
            <h3 className="section-title">Transfer Alerts & Notifications</h3>
            {notifs.length===0
              ?<div style={{ color:'var(--ink-ghost)', fontFamily:'var(--font-stamp)', fontSize:11, letterSpacing:'0.1em', textAlign:'center', padding:'20px 0' }}>— No notifications —</div>
              :notifs.map(n=>(
                <div key={n.notifId} className={`notification-item${n.isRead?'':' notif-unread'}`}
                  style={{ cursor: n.isRead?'default':'pointer' }}
                  onClick={()=>!n.isRead&&handleMarkRead(n.notifId)}>
                  <div className="notif-icon notif-approve">🔔</div>
                  <div style={{ flex:1 }}>
                    <div className="notif-title">{n.type}</div>
                    <div className="notif-body">{n.message}</div>
                    <div className="notif-time">
                      {n.createdAt?.toDate?n.createdAt.toDate().toLocaleString('en-IN'):new Date(n.createdAt).toLocaleString('en-IN')}
                      {!n.isRead&&<span style={{ marginLeft:8, color:'var(--rust-light)', fontFamily:'var(--font-stamp)', fontSize:9 }}>· Click to mark read</span>}
                    </div>
                  </div>
                  {!n.isRead&&<span className="badge badge-warning">NEW</span>}
                </div>
              ))
            }
          </div>
        )}
      </div>
    </div>
  );
}