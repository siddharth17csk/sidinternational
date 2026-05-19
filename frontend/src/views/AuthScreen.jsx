import React, { useState } from 'react';
import { loginUser, registerCustomer } from '../config/firestoreService';

const VAULT_IMG = 'https://images.unsplash.com/photo-1601597111158-2fceff292cdc?w=800&q=80';

export default function AuthScreen({ onLoginSuccess, onBack }) {
  const [tab, setTab]         = useState(0);
  const [error, setError]     = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  const [loginForm, setLoginForm] = useState({ username: '', password: '' });
  const [regForm, setRegForm]     = useState({
    firstName: '', lastName: '', email: '', mobile: '',
    password: '', confirmPassword: '', aadhar: '', pan: '',
  });

  const handleLoginSubmit = async (e) => {
    e.preventDefault(); setError(''); setLoading(true);
    try {
      const { role, user } = await loginUser(loginForm.username, loginForm.password);
      onLoginSuccess(role, user);
    } catch (err) {
      setError(err.message || 'Authentication refused by the gateway.');
    } finally { setLoading(false); }
  };

  const handleRegisterSubmit = async (e) => {
    e.preventDefault(); setError(''); setSuccess(''); setLoading(true);

    if (regForm.password !== regForm.confirmPassword) {
      setError('Passcodes do not match.'); setLoading(false); return;
    }
    if (!/^\d{12}$/.test(regForm.aadhar)) {
      setError('Aadhaar must be exactly 12 digits.'); setLoading(false); return;
    }
    if (!/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/.test(regForm.pan.toUpperCase())) {
      setError('PAN format invalid (e.g. ABCDE1234F).'); setLoading(false); return;
    }

    try {
      const result = await registerCustomer({ ...regForm, pan: regForm.pan.toUpperCase() });
      setSuccess(`Application submitted! Account No: ${result.accountNumber}. Await admin approval.`);
      setRegForm({ firstName:'', lastName:'', email:'', mobile:'', password:'', confirmPassword:'', aadhar:'', pan:'' });
      setTimeout(() => { setTab(0); setSuccess(''); }, 3000);
    } catch (err) {
      setError(err.message || 'Registration failed. Please try again.');
    } finally { setLoading(false); }
  };

  return (
    <div className="auth-container">
      <div className="auth-split">

        {/* ── Left visual panel ── */}
        <div className="auth-visual">
          <img src={VAULT_IMG} alt="Bank vault" className="auth-visual-img" />
          <div className="auth-visual-overlay">
            <blockquote className="auth-visual-quote">
              "A bank is a place where they lend you an umbrella in fair weather and ask for it back again when it begins to rain."
            </blockquote>
            <div className="auth-visual-attr">— Robert Frost</div>
            <div style={{ marginTop: 20, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {['FDIC Insured', 'RBI Licensed', '256-bit SSL', '2FA Protected'].map(t => (
                <span key={t} className="node-id" style={{ fontSize: 9 }}>{t}</span>
              ))}
            </div>
          </div>
        </div>

        {/* ── Right form panel ── */}
        <div className="auth-box">
          <div className="auth-logo">
            <div className="auth-seal">🏛</div>
            <h1 style={{ fontSize: 18, letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 2 }}>
              First National Vault
            </h1>
            <div className="ornament-line" style={{ fontSize: 9 }}>ANNO DOMINI · MMXXVI</div>
          </div>

          <div className="vintage-tabs" style={{ marginBottom: 20 }}>
            <button className={`vintage-tab${tab===0?' active':''}`}
              onClick={() => { setTab(0); setError(''); setSuccess(''); }}>
              ⚿ Sign In
            </button>
            <button className={`vintage-tab${tab===1?' active':''}`}
              onClick={() => { setTab(1); setError(''); setSuccess(''); }}>
              ✍ Open Account
            </button>
          </div>

          {error   && <div className="alert alert-error">⚠ {error}</div>}
          {success && <div className="alert alert-success">✓ {success}</div>}

          {/* ── LOGIN ── */}
          {tab === 0 && (
            <form onSubmit={handleLoginSubmit}>
              <div className="form-group">
                <label className="vintage-label">Mobile No. / Email</label>
                <div className="input-wrap">
                  <span className="input-icon">📋</span>
                  <input className="vintage-input" type="text" placeholder="Mobile or email"
                    value={loginForm.username}
                    onChange={e => setLoginForm({ ...loginForm, username: e.target.value })} required />
                </div>
              </div>
              <div className="form-group">
                <label className="vintage-label">Secret Passphrase</label>
                <div className="input-wrap">
                  <span className="input-icon">🔑</span>
                  <input className="vintage-input" type="password" placeholder="••••••••••"
                    value={loginForm.password}
                    onChange={e => setLoginForm({ ...loginForm, password: e.target.value })} required />
                </div>
              </div>
              <button type="submit" className="btn-primary" disabled={loading}>
                {loading ? '⟳ Verifying...' : '⚷ Unlock & Enter'}
              </button>
            </form>
          )}

          {/* ── REGISTER ── */}
          {tab === 1 && (
            <form onSubmit={handleRegisterSubmit} style={{ overflowY: 'auto', maxHeight: '50vh', paddingRight: 4 }}>
              <div className="grid-2" style={{ gap: 12 }}>
                <div className="form-group">
                  <label className="vintage-label">First Name</label>
                  <input className="vintage-input" type="text" placeholder="Given name"
                    value={regForm.firstName}
                    onChange={e => setRegForm({ ...regForm, firstName: e.target.value })} required />
                </div>
                <div className="form-group">
                  <label className="vintage-label">Surname</label>
                  <input className="vintage-input" type="text" placeholder="Family name"
                    value={regForm.lastName}
                    onChange={e => setRegForm({ ...regForm, lastName: e.target.value })} required />
                </div>
              </div>
              <div className="form-group">
                <label className="vintage-label">Email Address</label>
                <input className="vintage-input" type="email" placeholder="for notifications"
                  value={regForm.email}
                  onChange={e => setRegForm({ ...regForm, email: e.target.value })} required />
              </div>
              <div className="form-group">
                <label className="vintage-label">Mobile Number</label>
                <input className="vintage-input" type="text" placeholder="10-digit mobile"
                  value={regForm.mobile}
                  onChange={e => setRegForm({ ...regForm, mobile: e.target.value })} required />
              </div>
              <div className="grid-2" style={{ gap: 12 }}>
                <div className="form-group">
                  <label className="vintage-label">Passphrase</label>
                  <input className="vintage-input" type="password" placeholder="Create password"
                    value={regForm.password}
                    onChange={e => setRegForm({ ...regForm, password: e.target.value })} required />
                </div>
                <div className="form-group">
                  <label className="vintage-label">Confirm</label>
                  <input className="vintage-input" type="password" placeholder="Repeat password"
                    value={regForm.confirmPassword}
                    onChange={e => setRegForm({ ...regForm, confirmPassword: e.target.value })} required />
                </div>
              </div>
              <div className="form-group">
                <label className="vintage-label">Aadhaar Number (12 digits)</label>
                <input className="vintage-input" type="text" placeholder="xxxxxxxxxxxx" maxLength={12}
                  value={regForm.aadhar}
                  onChange={e => setRegForm({ ...regForm, aadhar: e.target.value.replace(/\D/g,'') })} required />
              </div>
              <div className="form-group">
                <label className="vintage-label">PAN Number</label>
                <input className="vintage-input" type="text" placeholder="e.g. ABCDE1234F"
                  maxLength={10} style={{ textTransform: 'uppercase' }}
                  value={regForm.pan}
                  onChange={e => setRegForm({ ...regForm, pan: e.target.value.toUpperCase() })} required />
              </div>
              <button type="submit" className="btn-primary"
                style={{ background: 'linear-gradient(180deg,#2a5a2e,#1a3a1e)', borderColor: '#2a5a2e' }}
                disabled={loading}>
                {loading ? '⟳ Submitting...' : '✉ Submit Application'}
              </button>
            </form>
          )}

          {onBack && (
            <div style={{ textAlign: 'center', marginTop: 20 }}>
              <button onClick={onBack}
                style={{ background: 'none', border: 'none', cursor: 'pointer',
                  fontFamily: 'var(--font-stamp)', fontSize: 9, color: 'var(--ink-ghost)', letterSpacing: '0.2em' }}>
                ← Return to Home
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}