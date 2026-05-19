import React, { useEffect, useState } from 'react';
import {
  getAllCustomers, updateCustomerStatus, updateTransferLimit,
  getAllLoans, updateLoanStatus,
  getAllBanks, addBank, updateBank,
  getAllEmployees, addEmployee, updateEmployee
} from '../config/firestoreService';

const ADMIN_ROLES = [
  { key: 'Super Admin',  cls: 'role-super-admin',  icon: '👑', desc: 'Full system access' },
  { key: 'Branch Admin', cls: 'role-branch-admin', icon: '🏛', desc: 'Branch operations' },
  { key: 'Loan Officer', cls: 'role-loan-officer', icon: '📋', desc: 'Loan management' },
  { key: 'Cashier',      cls: 'role-cashier',      icon: '💰', desc: 'Transactions only' },
];

function statusBadge(s) {
  if (s === 'Approved' || s === 'Active' || s === 'Verified')  return <span className="badge badge-success">{s}</span>;
  if (s === 'Rejected' || s === 'Inactive' || s === 'Failed')  return <span className="badge badge-error">{s}</span>;
  return <span className="badge badge-warning">{s || 'Pending'}</span>;
}

function AdminRoleBadge({ role }) {
  const cfg = ADMIN_ROLES.find(r => r.key === role) || ADMIN_ROLES[0];
  return <span className={`role-badge ${cfg.cls}`}>{cfg.icon} {role}</span>;
}

function emailPreview(type, customerName, accountNo) {
  const T = {
    Approved:     { subject: '🎉 Account Approved',       body: `Dear ${customerName},\n\nYour account (${accountNo}) has been approved.\n\nFirst National Vault` },
    Hold:         { subject: '⏸ Account Under Review',    body: `Dear ${customerName},\n\nYour account (${accountNo}) is under review.\n\nFirst National Vault` },
    Rejected:     { subject: '❌ Account Not Approved',   body: `Dear ${customerName},\n\nYour account (${accountNo}) was not approved.\n\nFirst National Vault` },
    LoanApproved: { subject: '✅ Loan Approved',          body: `Dear ${customerName},\n\nYour loan has been approved.\n\nFirst National Vault` },
    LoanRejected: { subject: '❌ Loan Declined',          body: `Dear ${customerName},\n\nYour loan has been declined.\n\nFirst National Vault` },
  };
  return T[type] || T.Approved;
}

export default function AdminDashboard({ userSession, onLogout }) {
  const adminRole = userSession?.role || 'Super Admin';

  const [tab, setTab]             = useState(0);
  const [customers, setCustomers] = useState([]);
  const [loans, setLoans]         = useState([]);
  const [banks, setBanks]         = useState([]);
  const [employees, setEmployees] = useState([]);
  const [emailLog, setEmailLog]   = useState([]);
  const [msg, setMsg]             = useState(null);
  const [limits, setLimits]       = useState({});
  const [loading, setLoading]     = useState(false);

  const [addBankOpen, setAddBankOpen] = useState(false);
  const [addEmpOpen,  setAddEmpOpen]  = useState(false);
  const [emailOpen,   setEmailOpen]   = useState(false);
  const [emailPreviewData, setEmailPreviewData] = useState(null);

  const [newBank, setNewBank] = useState({ bankName:'', ifscCode:'', bankAddress:'', branchName:'', city:'', state:'' });
  const [newEmp,  setNewEmp]  = useState({ firstName:'', lastName:'', email:'', password:'', role:'Branch Admin' });

  const fetchAll = async () => {
    setLoading(true);
    try {
      const [c, l, b, e] = await Promise.all([getAllCustomers(), getAllLoans(), getAllBanks(), getAllEmployees()]);
      setCustomers(c); setLoans(l); setBanks(b); setEmployees(e);
      const lmap = {};
      c.forEach(cu => { lmap[cu.userId] = cu.transferLimit || 50000; });
      setLimits(lmap);
    } catch (err) { flash('error', 'Firestore error: ' + err.message); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchAll(); }, []);

  const flash = (type, text) => { setMsg({ type, text }); setTimeout(() => setMsg(null), 4000); };

  const logEmail = (type, customer) => {
    const preview = emailPreview(type, `${customer.firstName} ${customer.lastName}`, customer.accountNumber);
    setEmailLog(prev => [{ id: Date.now(), type, to: customer.email || customer.mobile,
      customer: `${customer.firstName} ${customer.lastName}`,
      subject: preview.subject, body: preview.body, sentAt: new Date() }, ...prev]);
  };

  const handleStatus = async (customer, action) => {
    try { await updateCustomerStatus(customer.userId, action); logEmail(action, customer); flash('success', `Status → ${action}`); fetchAll(); }
    catch (err) { flash('error', err.message); }
  };

  const handleLimitSave = async (userId) => {
    try { await updateTransferLimit(userId, limits[userId]); flash('success', 'Transfer limit updated.'); fetchAll(); }
    catch (err) { flash('error', err.message); }
  };

  const handleLoanReview = async (loan, action) => {
    const cust = customers.find(c => c.userId === loan.userId);
    try {
      await updateLoanStatus(loan.loanId, action, userSession?.employeeId);
      if (cust) logEmail(action === 'Approved' ? 'LoanApproved' : 'LoanRejected', cust);
      flash('success', `Loan ${action}.`); fetchAll();
    } catch (err) { flash('error', err.message); }
  };

  const handleAddBank = async () => {
    try { await addBank(newBank); flash('success', 'Bank registered.'); setAddBankOpen(false); setNewBank({ bankName:'', ifscCode:'', bankAddress:'', branchName:'', city:'', state:'' }); fetchAll(); }
    catch (err) { flash('error', err.message); }
  };

  const toggleBankActive = async (bank) => {
    try { await updateBank(bank.bankId, { isActive: !bank.isActive }); fetchAll(); }
    catch (err) { flash('error', err.message); }
  };

  const handleAddEmployee = async () => {
    if (!newEmp.firstName || !newEmp.email || !newEmp.password) { flash('error', 'Name, email and password required.'); return; }
    try { await addEmployee(newEmp); flash('success', `Officer ${newEmp.firstName} appointed.`); setAddEmpOpen(false); setNewEmp({ firstName:'', lastName:'', email:'', password:'', role:'Branch Admin' }); fetchAll(); }
    catch (err) { flash('error', err.message); }
  };

  const toggleEmpActive = async (emp) => {
    try { await updateEmployee(emp.employeeId, { isActive: !emp.isActive }); fetchAll(); }
    catch (err) { flash('error', err.message); }
  };

  const stats = [
    { label:'Total Accounts',  value:customers.length,                                             icon:'👤' },
    { label:'Pending Review',  value:customers.filter(c=>c.accountStatus==='Pending').length,       icon:'⏳' },
    { label:'Active Accounts', value:customers.filter(c=>c.accountStatus==='Approved').length,      icon:'✅' },
    { label:'Pending Loans',   value:loans.filter(l=>l.status==='Pending').length,                  icon:'📋' },
    { label:'Bank Nodes',      value:banks.length,                                                  icon:'🏛' },
    { label:'Emails Sent',     value:emailLog.length,                                               icon:'✉' },
  ];

  const TABS = ['Customer Ledger','Loan Registry','Bank Network','Admin Team','Email Log'];

  return (
    <div>
      <div className="dash-header">
        <div>
          <div className="dash-header-title">⚙ Administrative Vault</div>
          <div className="user-badge" style={{ marginTop:4 }}>
            Superintendent: {userSession?.firstName} {userSession?.lastName}
            &nbsp;·&nbsp; <AdminRoleBadge role={adminRole} />
          </div>
        </div>
        <div style={{ display:'flex', alignItems:'center', gap:12 }}>
          {loading && <span style={{ fontFamily:'var(--font-stamp)', fontSize:10, color:'var(--gold)', letterSpacing:'0.15em' }}>⟳ SYNCING FIRESTORE...</span>}
          <span className="node-id">NODE: sid_bank_17</span>
          <button className="btn-danger" onClick={onLogout}>⏻ Exit</button>
        </div>
      </div>

      <div className="page-wrapper">
        {msg && <div className={`alert alert-${msg.type==='success'?'success':'error'}`}>{msg.type==='success'?'✓':'⚠'} {msg.text}</div>}

        <div className="stats-grid">
          {stats.map(s => (
            <div className="stat-card" key={s.label}>
              <span className="stat-icon">{s.icon}</span>
              <div className="stat-value">{s.value}</div>
              <div className="stat-label">{s.label}</div>
            </div>
          ))}
        </div>

        <div className="vintage-tabs">
          {TABS.map((t,i) => (
            <button key={t} className={`vintage-tab${tab===i?' active':''}`} onClick={()=>setTab(i)}>
              {t}
              {t==='Email Log'&&emailLog.length>0&&<span style={{marginLeft:6,background:'var(--rust)',color:'var(--ink)',borderRadius:'50%',width:16,height:16,display:'inline-flex',alignItems:'center',justifyContent:'center',fontSize:9}}>{emailLog.length}</span>}
            </button>
          ))}
        </div>

        {/* TAB 0 — CUSTOMERS */}
        {tab===0&&(
          <div className="vintage-card">
            <div className="card-corner tl"/><div className="card-corner tr"/>
            <div className="card-corner bl"/><div className="card-corner br"/>
            <h3 className="section-title">Customer Account Registry</h3>
            <div className="vintage-table-wrap">
              <table className="vintage-table">
                <thead><tr><th>Name</th><th>Email</th><th>Mobile</th><th>Account No.</th><th>Balance (₹)</th><th>KYC</th><th>Status</th><th>Limit</th><th>Actions</th></tr></thead>
                <tbody>
                  {customers.length===0&&<tr><td colSpan={9} style={{textAlign:'center',color:'var(--ink-ghost)',padding:24}}>— No accounts on record —</td></tr>}
                  {customers.map(c=>(
                    <tr key={c.userId}>
                      <td style={{color:'var(--ink)',fontFamily:'var(--font-display)'}}>{c.firstName} {c.lastName}</td>
                      <td style={{fontSize:11}}>{c.email||'—'}</td>
                      <td className="mono">{c.mobile}</td>
                      <td><span className="node-id">{c.accountNumber}</span></td>
                      <td style={{color:'var(--gold)',fontFamily:'var(--font-display)',fontWeight:700}}>₹{(c.balance||0).toLocaleString('en-IN')}</td>
                      <td>{statusBadge(c.kycStatus||'Pending')}</td>
                      <td>{statusBadge(c.accountStatus)}</td>
                      <td>
                        <div style={{display:'flex',gap:6,alignItems:'center'}}>
                          <input type="number" className="vintage-input" style={{width:90,padding:'5px 8px',fontSize:12}}
                            value={limits[c.userId]||''} onChange={e=>setLimits({...limits,[c.userId]:e.target.value})}/>
                          <button className="btn-warn" style={{padding:'5px 10px',fontSize:9}} onClick={()=>handleLimitSave(c.userId)}>Set</button>
                        </div>
                      </td>
                      <td>
                        <div className="actions">
                          <button className="btn-success" onClick={()=>handleStatus(c,'Approved')}>✓ Approve</button>
                          <button className="btn-warn"    onClick={()=>handleStatus(c,'Hold')}>⏸ Hold</button>
                          <button className="btn-danger"  onClick={()=>handleStatus(c,'Rejected')}>✕ Reject</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 1 — LOANS */}
        {tab===1&&(
          <div className="vintage-card">
            <div className="card-corner tl"/><div className="card-corner tr"/>
            <div className="card-corner bl"/><div className="card-corner br"/>
            <h3 className="section-title">Loan Application Dossiers</h3>
            <div className="vintage-table-wrap">
              <table className="vintage-table">
                <thead><tr><th>Applicant</th><th>Type</th><th>Amount (₹)</th><th>Tenure</th><th>EMI (₹)</th><th>Interest</th><th>Status</th><th>Adjudication</th></tr></thead>
                <tbody>
                  {loans.length===0&&<tr><td colSpan={8} style={{textAlign:'center',color:'var(--ink-ghost)',padding:24}}>— No loan applications filed —</td></tr>}
                  {loans.map(l=>{
                    const cust=customers.find(c=>c.userId===l.userId);
                    return(
                      <tr key={l.loanId}>
                        <td style={{color:'var(--ink)',fontFamily:'var(--font-display)'}}>{cust?`${cust.firstName} ${cust.lastName}`:l.userId}</td>
                        <td>{l.loanType||'Personal'}</td>
                        <td style={{color:'var(--gold)',fontWeight:700}}>₹{(l.loanAmount||0).toLocaleString('en-IN')}</td>
                        <td className="mono">{l.tenure} mo.</td>
                        <td className="mono">₹{(l.emiAmount||0).toLocaleString('en-IN')}</td>
                        <td className="mono">{l.interest}%</td>
                        <td>{statusBadge(l.status)}</td>
                        <td>
                          {l.status==='Pending'?(
                            <div className="actions">
                              <button className="btn-success" onClick={()=>handleLoanReview(l,'Approved')}>✓ Grant</button>
                              <button className="btn-danger"  onClick={()=>handleLoanReview(l,'Rejected')}>✕ Deny</button>
                            </div>
                          ):<span style={{color:'var(--ink-ghost)',fontFamily:'var(--font-stamp)',fontSize:10}}>Filed</span>}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 2 — BANKS */}
        {tab===2&&(
          <div>
            <div style={{display:'flex',justifyContent:'flex-end',marginBottom:16}}>
              <button className="btn-secondary" onClick={()=>setAddBankOpen(true)}>+ Register New Node</button>
            </div>
            <div className="vintage-card">
              <div className="card-corner tl"/><div className="card-corner tr"/>
              <div className="card-corner bl"/><div className="card-corner br"/>
              <h3 className="section-title">Registered Bank Network</h3>
              <div className="vintage-table-wrap">
                <table className="vintage-table">
                  <thead><tr><th>Bank Name</th><th>IFSC</th><th>Branch</th><th>City</th><th>State</th><th>Status</th><th>Operations</th></tr></thead>
                  <tbody>
                    {banks.length===0&&<tr><td colSpan={7} style={{textAlign:'center',color:'var(--ink-ghost)',padding:24}}>— No nodes registered —</td></tr>}
                    {banks.map(b=>(
                      <tr key={b.bankId}>
                        <td style={{color:'var(--ink)',fontFamily:'var(--font-display)'}}>{b.bankName}</td>
                        <td className="mono">{b.ifscCode}</td>
                        <td>{b.branchName||'—'}</td>
                        <td>{b.city||'—'}</td>
                        <td>{b.state||'—'}</td>
                        <td>{statusBadge(b.isActive?'Active':'Inactive')}</td>
                        <td><div className="actions"><button className="btn-warn" onClick={()=>toggleBankActive(b)}>{b.isActive?'⏸ Suspend':'▶ Activate'}</button></div></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* TAB 3 — ADMIN TEAM */}
        {tab===3&&(
          <div>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:16}}>
              <h3 className="section-title" style={{margin:0,border:'none'}}>Administrative Officers</h3>
              {adminRole==='Super Admin'&&<button className="btn-secondary" onClick={()=>setAddEmpOpen(true)}>+ Appoint Officer</button>}
            </div>
            <div className="vintage-card">
              <div className="card-corner tl"/><div className="card-corner tr"/>
              <div className="card-corner bl"/><div className="card-corner br"/>
              <div className="vintage-table-wrap">
                <table className="vintage-table">
                  <thead><tr><th>Name</th><th>Email</th><th>Role</th><th>Loan Access</th><th>Create Access</th><th>Status</th><th>Actions</th></tr></thead>
                  <tbody>
                    {employees.map(emp=>(
                      <tr key={emp.employeeId}>
                        <td style={{color:'var(--ink)',fontFamily:'var(--font-display)'}}>{emp.firstName} {emp.lastName}</td>
                        <td style={{fontSize:11}}>{emp.email}</td>
                        <td><AdminRoleBadge role={emp.role}/></td>
                        <td>{statusBadge(emp.loanAccess?'Active':'Inactive')}</td>
                        <td>{statusBadge(emp.createAccess?'Active':'Inactive')}</td>
                        <td>{statusBadge(emp.isActive?'Active':'Inactive')}</td>
                        <td>{adminRole==='Super Admin'&&<div className="actions"><button className="btn-warn" onClick={()=>toggleEmpActive(emp)}>{emp.isActive?'⏸ Suspend':'▶ Restore'}</button></div>}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* TAB 4 — EMAIL LOG */}
        {tab===4&&(
          <div className="vintage-card">
            <div className="card-corner tl"/><div className="card-corner tr"/>
            <div className="card-corner bl"/><div className="card-corner br"/>
            <h3 className="section-title">Outgoing Correspondence Log</h3>
            {emailLog.length===0
              ?<div style={{textAlign:'center',padding:'32px 0',color:'var(--ink-ghost)',fontFamily:'var(--font-stamp)',fontSize:11}}>— No correspondence dispatched yet —</div>
              :emailLog.map(e=>(
                <div key={e.id} className="notification-item notif-unread" onClick={()=>{setEmailPreviewData(e);setEmailOpen(true);}} style={{cursor:'pointer'}}>
                  <div className={`notif-icon ${e.type.includes('Approved')?'notif-approve':e.type.includes('Rejected')?'notif-reject':'notif-hold'}`}>
                    {e.type.includes('Approved')?'✓':e.type.includes('Rejected')?'✕':'⏸'}
                  </div>
                  <div style={{flex:1}}>
                    <div className="notif-title">{e.subject}</div>
                    <div className="notif-body">To: <span style={{color:'var(--rust-light)'}}>{e.to}</span> · {e.customer}</div>
                    <div className="notif-time">{e.sentAt.toLocaleString('en-IN')} · Click to preview →</div>
                  </div>
                  <span className={`badge ${e.type.includes('Approved')?'badge-success':e.type.includes('Rejected')?'badge-error':'badge-warning'}`}>{e.type}</span>
                </div>
              ))
            }
          </div>
        )}
      </div>

      {/* DIALOG: Add Bank */}
      {addBankOpen&&(
        <div className="vintage-overlay" onClick={e=>e.target===e.currentTarget&&setAddBankOpen(false)}>
          <div className="vintage-dialog">
            <div className="card-corner tl"/><div className="card-corner tr"/>
            <div className="card-corner bl"/><div className="card-corner br"/>
            <h3 className="dialog-title">⊕ Register Bank Node</h3>
            {[['bankName','Bank Name'],['ifscCode','IFSC Code'],['branchName','Branch Name'],['bankAddress','Address'],['city','City'],['state','State']].map(([field,label])=>(
              <div className="form-group" key={field}>
                <label className="vintage-label">{label}</label>
                <input className="vintage-input" value={newBank[field]||''} onChange={e=>setNewBank({...newBank,[field]:e.target.value})}/>
              </div>
            ))}
            <div className="dialog-actions">
              <button className="btn-secondary" onClick={()=>setAddBankOpen(false)}>Cancel</button>
              <button className="btn-primary" style={{width:'auto',padding:'10px 24px'}} onClick={handleAddBank}>✓ Register</button>
            </div>
          </div>
        </div>
      )}

      {/* DIALOG: Add Employee */}
      {addEmpOpen&&(
        <div className="vintage-overlay" onClick={e=>e.target===e.currentTarget&&setAddEmpOpen(false)}>
          <div className="vintage-dialog">
            <div className="card-corner tl"/><div className="card-corner tr"/>
            <div className="card-corner bl"/><div className="card-corner br"/>
            <h3 className="dialog-title">⊕ Appoint Officer</h3>
            {[['firstName','First Name'],['lastName','Last Name'],['email','Email'],['password','Password']].map(([field,label])=>(
              <div className="form-group" key={field}>
                <label className="vintage-label">{label}</label>
                <input className="vintage-input" type={field==='password'?'password':'text'} value={newEmp[field]} onChange={e=>setNewEmp({...newEmp,[field]:e.target.value})}/>
              </div>
            ))}
            <div className="form-group">
              <label className="vintage-label">Role</label>
              <select className="vintage-input" value={newEmp.role} onChange={e=>setNewEmp({...newEmp,role:e.target.value})}>
                {ADMIN_ROLES.filter(r=>r.key!=='Super Admin').map(r=><option key={r.key} value={r.key}>{r.icon} {r.key}</option>)}
              </select>
            </div>
            <div className="dialog-actions">
              <button className="btn-secondary" onClick={()=>setAddEmpOpen(false)}>Cancel</button>
              <button className="btn-primary" style={{width:'auto',padding:'10px 24px'}} onClick={handleAddEmployee}>✓ Appoint</button>
            </div>
          </div>
        </div>
      )}

      {/* DIALOG: Email Preview */}
      {emailOpen&&emailPreviewData&&(
        <div className="vintage-overlay" onClick={e=>e.target===e.currentTarget&&setEmailOpen(false)}>
          <div className="vintage-dialog" style={{maxWidth:560}}>
            <div className="card-corner tl"/><div className="card-corner tr"/>
            <div className="card-corner bl"/><div className="card-corner br"/>
            <h3 className="dialog-title">✉ Email Preview</h3>
            {[['FROM','noreply@firstnationalvault.bank'],['TO',emailPreviewData.to],['SUBJECT',emailPreviewData.subject]].map(([label,val])=>(
              <div key={label} style={{background:'rgba(0,0,0,0.3)',border:'1px solid var(--border-ornate)',padding:16,marginBottom:16}}>
                <div style={{fontFamily:'var(--font-stamp)',fontSize:9,letterSpacing:'0.2em',color:'var(--sepia)',marginBottom:8}}>{label}</div>
                <div style={{fontSize:13,color:'var(--gold)'}}>{val}</div>
              </div>
            ))}
            <div style={{background:'rgba(0,0,0,0.3)',border:'1px solid var(--border-ornate)',padding:16}}>
              <div style={{fontFamily:'var(--font-stamp)',fontSize:9,letterSpacing:'0.2em',color:'var(--sepia)',marginBottom:8}}>BODY</div>
              <pre style={{fontSize:12,color:'var(--ink-faded)',fontFamily:'var(--font-body)',whiteSpace:'pre-wrap',lineHeight:1.7}}>{emailPreviewData.body}</pre>
            </div>
            <div className="dialog-actions">
              <button className="btn-primary" style={{width:'auto',padding:'10px 24px'}} onClick={()=>setEmailOpen(false)}>✓ Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}