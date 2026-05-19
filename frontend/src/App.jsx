import React, { useState } from 'react';
import AuthScreen    from './views/AuthScreen';
import AdminDashboard from './views/AdminDashboard';
import CustomerPortal from './views/CustomerPortal';
import HomePage      from './views/HomePage';
import './vintage.css';

const TICKER_ITEMS = [
  { label: 'NIFTY 50',         value: '22,419.95 ▲ 0.42%' },
  { label: 'SENSEX',           value: '73,852.10 ▲ 0.38%' },
  { label: 'USD/INR',          value: '₹83.42' },
  { label: 'GOLD (10g)',        value: '₹72,850 ▲ 0.15%' },
  { label: 'REPO RATE',        value: '6.50%' },
  { label: 'FNV STOCK',        value: '₹1,248 ▲ 1.2%' },
  { label: 'HOME LOAN RATE',   value: '8.75% p.a.' },
  { label: 'FD RATE (1YR)',    value: '7.20% p.a.' },
];

function Ticker() {
  const doubled = [...TICKER_ITEMS, ...TICKER_ITEMS];
  return (
    <div className="ticker-bar">
      <div className="ticker-inner">
        {doubled.map((t, i) => (
          <span className="ticker-item" key={i}>
            {t.label} &nbsp;<span>{t.value}</span>
            <span style={{ color: 'var(--gold-dim)', margin: '0 8px' }}>✦</span>
          </span>
        ))}
      </div>
    </div>
  );
}

export default function App() {
  // ── ONLY CHANGE: read saved session on startup ──
  const [page, setPage]               = useState(() => sessionStorage.getItem('page') || 'home');
  const [role, setRole]               = useState(() => sessionStorage.getItem('role') || null);
  const [userSession, setUserSession] = useState(() => {
    const u = sessionStorage.getItem('user');
    return u ? JSON.parse(u) : null;
  });

  const handleLoginSuccess = (userRole, userData) => {
    setRole(userRole);
    setUserSession(userData);
    setPage('dashboard');
    // ── ONLY CHANGE: save session on login ──
    sessionStorage.setItem('role', userRole);
    sessionStorage.setItem('user', JSON.stringify(userData));
    sessionStorage.setItem('page', 'dashboard');
  };

  const handleLogout = () => {
    setRole(null);
    setUserSession(null);
    setPage('home');
    sessionStorage.clear();
  };

  const isLoggedIn = !!role;

  return (
    <div className="vintage-root">
      <div className="film-grain" />
      <div className="vignette" />

      <Ticker />

      {page !== 'auth' && (
        <nav className="main-nav">
          <div className="nav-inner">
            <div className="nav-brand" style={{ cursor: 'pointer' }} onClick={() => !isLoggedIn && setPage('home')}>
              <div className="nav-seal">🏛</div>
              <div>
                <div className="nav-title">Siddharth International Bank</div>
                <div className="nav-sub">since 2005</div>
              </div>
            </div>

            {!isLoggedIn && (
              <div className="nav-links">
                <button className={`nav-link${page==='home'?' active':''}`} onClick={() => setPage('home')}>Home</button>
                <button className="nav-link" onClick={() => { setPage('home'); setTimeout(() => document.getElementById('accounts')?.scrollIntoView({ behavior: 'smooth' }), 100); }}>Accounts</button>
                <button className="nav-link" onClick={() => { setPage('home'); setTimeout(() => document.getElementById('loans')?.scrollIntoView({ behavior: 'smooth' }), 100); }}>Loans</button>
                <button className="nav-link" onClick={() => { setPage('home'); setTimeout(() => document.getElementById('investments')?.scrollIntoView({ behavior: 'smooth' }), 100); }}>Investments</button>
                <button className="nav-link" onClick={() => { setPage('home'); setTimeout(() => document.getElementById('about')?.scrollIntoView({ behavior: 'smooth' }), 100); }}>About</button>
              </div>
            )}

            {isLoggedIn && (
              <div className="nav-links">
                <span className="nav-link active">
                  {role === 'Admin' ? '⚙ Administration' : '⚿ Customer Portal'}
                </span>
              </div>
            )}

            <div className="nav-user">
              {isLoggedIn ? (
                <>
                  <div className="nav-avatar">
                    {userSession?.firstName?.[0] || '?'}
                  </div>
                  <div className="nav-user-info">
                    <span className="nav-user-name">{userSession?.firstName} {userSession?.lastName}</span>
                    <span className="nav-user-role">{role}</span>
                  </div>
                  <button className="btn-danger" onClick={handleLogout} style={{ marginLeft: 8 }}>⏻</button>
                </>
              ) : (
                <button className="btn-primary" style={{ width: 'auto', padding: '9px 20px', fontSize: 10 }}
                  onClick={() => setPage('auth')}>
                  ⚷ Sign In
                </button>
              )}
            </div>
          </div>
        </nav>
      )}

      {page === 'home' && (
        <HomePage onSignIn={() => setPage('auth')} />
      )}

      {page === 'auth' && (
        <AuthScreen onLoginSuccess={handleLoginSuccess} onBack={() => setPage('home')} />
      )}

      {page === 'dashboard' && role === 'Admin' && (
        <AdminDashboard userSession={userSession} onLogout={handleLogout} />
      )}

      {page === 'dashboard' && role === 'Customer' && (
        <CustomerPortal userSession={userSession} onLogout={handleLogout} />
      )}

      {page === 'home' && (
        <footer className="site-footer">
          <div className="footer-inner">
            <div className="footer-top">
              <div>
                <div className="footer-brand-title">Siddharth International Bank</div>
                <div className="footer-brand-text">
                  Established in the tradition of sound banking and fiduciary excellence.
                  Your deposits are safeguarded by the highest standards of financial custody.
                </div>
                <div style={{ marginTop: 16, display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                  <span className="node-id">FDIC INSURED</span>
                  <span className="node-id">RBI LICENSED</span>
                  <span className="node-id">ISO 27001</span>
                </div>
              </div>
              <div>
                <div className="footer-col-title">Services</div>
                {['Savings Account','Current Account','Fixed Deposits','Loans','Investments','Insurance'].map(l => (
                  <a key={l} href="#" className="footer-link">{l}</a>
                ))}
              </div>
              <div>
                <div className="footer-col-title">Support</div>
                {['24×7 Helpline','Branch Locator','ATM Finder','Grievance','FAQ','Contact Us'].map(l => (
                  <a key={l} href="#" className="footer-link">{l}</a>
                ))}
              </div>
              <div>
                <div className="footer-col-title">Legal</div>
                {['Privacy Policy','Terms of Service','Cookie Policy','Compliance','Audit Reports'].map(l => (
                  <a key={l} href="#" className="footer-link">{l}</a>
                ))}
              </div>
            </div>
            <div className="footer-bottom">
              <div className="footer-copy">© MMXXVI First National Vault · All Rights Reserved</div>
              <div className="footer-reg">
                Regulated by Reserve Bank of India · CIN: L65110MH1977GOI019916<br />
                Node: sid_bank_17 · Secured by 256-bit encryption
              </div>
            </div>
          </div>
        </footer>
      )}
    </div>
  );
}