import React, { useState } from 'react';

const IMGS = {
  heroBg:    'https://images.unsplash.com/photo-1541354329998-f4d9a9f9297f?auto=format&fit=crop&w=1400&q=80',
  savings:   'https://images.unsplash.com/photo-1554224155-6726b3ff858f?auto=format&fit=crop&w=600&q=75',
  loans:     'https://images.unsplash.com/photo-1560518883-ce09059eeffa?auto=format&fit=crop&w=600&q=75',
  invest:    'https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?auto=format&fit=crop&w=600&q=75',
  forex:     'https://images.unsplash.com/photo-1580519542036-c47de6196ba5?auto=format&fit=crop&w=600&q=75',
  insurance: 'https://images.unsplash.com/photo-1450101499163-c8848c66ca85?auto=format&fit=crop&w=600&q=75',
  mobile:    'https://images.unsplash.com/photo-1563013544-824ae1b704d3?auto=format&fit=crop&w=600&q=75',
  branch:    'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&w=800&q=75',
  team1:     'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&w=300&q=70',
  team2:     'https://images.unsplash.com/photo-1580489944761-15a19d654956?auto=format&fit=crop&w=300&q=70',
  team3:     'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=300&q=70',
};

// Fallback gradient shown when an image fails to load
const IMG_FALLBACK = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="600" height="400"%3E%3Crect width="600" height="400" fill="%232a2218"/%3E%3Ctext x="50%25" y="50%25" dominant-baseline="middle" text-anchor="middle" fill="%237a6230" font-size="40"%3E🏛%3C/text%3E%3C/svg%3E';

const SERVICES = [
  { img: IMGS.savings,   icon: '🏦', title: 'Savings & Current Accounts', desc: 'Open a zero-balance savings account with 7.2% interest or a feature-rich current account for your business needs.' },
  { img: IMGS.loans,     icon: '🏠', title: 'Home & Personal Loans',      desc: 'Competitive interest rates from 8.75% p.a. Instant pre-approval up to ₹50 Lakhs. Flexible repayment terms up to 30 years.' },
  { img: IMGS.invest,    icon: '📈', title: 'Investments & Mutual Funds',  desc: 'Grow your wealth with curated mutual fund portfolios, SIPs, fixed deposits, and government bonds — all in one dashboard.' },
  { img: IMGS.forex,     icon: '💱', title: 'Forex & Remittance',         desc: 'Best-in-class exchange rates for 50+ currencies. International wire transfers processed in under 2 business hours.' },
  { img: IMGS.insurance, icon: '🛡', title: 'Insurance Services',         desc: 'Life, health, vehicle, and property insurance from India\'s most trusted underwriters. Bundled with your account at no extra cost.' },
  { img: IMGS.mobile,    icon: '📱', title: 'Mobile & Net Banking',       desc: 'Award-winning digital banking platform. Pay bills, transfer funds, and manage investments from anywhere, anytime.' },
];

const WHY_US = [
  { icon: '🔒', title: 'Bank-grade Security',   text: '256-bit SSL encryption, 2FA, biometric login, and 24×7 fraud monitoring protect every transaction.' },
  { icon: '⚡', title: 'Instant Transfers',     text: 'IMPS and UPI transfers settle in under 10 seconds. NEFT processed in 4 hourly batches.' },
  { icon: '🏆', title: '98% Satisfaction',      text: 'Rated #1 in customer satisfaction by BCSBI for five consecutive years, 2020–2024.' },
  { icon: '📞', title: '24×7 Support',          text: 'Dedicated relationship managers and round-the-clock contact centre in 12 languages.' },
];

const RATES = [
  { product: 'Savings Account',     rate: '7.20% p.a.',  note: 'Up to ₹1 Cr' },
  { product: 'Fixed Deposit (1Yr)', rate: '8.10% p.a.',  note: 'Senior: 8.60%' },
  { product: 'Fixed Deposit (3Yr)', rate: '8.50% p.a.',  note: 'Compounded quarterly' },
  { product: 'Home Loan',           rate: '8.75% p.a.',  note: 'Up to 30 yrs' },
  { product: 'Personal Loan',       rate: '11.99% p.a.', note: 'Up to ₹25L' },
  { product: 'Car Loan',            rate: '9.50% p.a.',  note: 'Up to 7 yrs' },
];

const FAQ = [
  { q: 'How do I open an account?', a: 'Click "Open Account" on the login page, fill in your personal details, Aadhaar, PAN and choose a password. Your application is reviewed by our team within 24 hours.' },
  { q: 'What documents are required?', a: 'You need a valid Aadhaar card (12-digit number), PAN card, a mobile number for OTP verification, and a passport-size photograph uploaded during registration.' },
  { q: 'Is my money safe?', a: 'Deposits are insured up to ₹5 Lakhs per depositor by DICGC under the Banking Regulation Act. Our systems undergo bi-annual third-party security audits.' },
  { q: 'How long does loan approval take?', a: 'Personal loan pre-approval is instant for eligible customers. Full disbursement typically takes 2–5 business days after document verification.' },
];

export default function HomePage({ onSignIn }) {
  const [openFaq, setOpenFaq] = useState(null);

  return (
    <div>
     
      <section id="home" className="hero-banner">
        <img src={IMGS.heroBg} alt="" className="hero-bg-img" onError={e => { e.target.onerror = null; e.target.style.display = 'none'; }} />
        <div className="hero-overlay" />
        <div className="hero-content">
          <div>
            <div className="hero-eyebrow">Since 1947 · Trusted by millions</div>
            <h1 className="hero-title">
              Banking Built<br />on Trust &amp;<br />Tradition
            </h1>
            <p className="hero-subtitle">
              A full-service institution offering savings, loans, investments, and
              interbank transfers — secured by century-old fiduciary principles and
              modern encryption technology.
            </p>
            <div className="hero-cta-group">
              <button
                className="btn-primary"
                style={{ width: 'auto', padding: '14px 32px', fontSize: 12 }}
                onClick={onSignIn}>
                ⚷ Open / Sign In
              </button>

            </div>
          </div>

          <div className="hero-stats">
            {[
              { num: '2.4M+',   label: 'Active Accounts' },
              { num: '₹8,200Cr', label: 'Assets Under Custody' },
              { num: '247',     label: 'Branch Network' },
              { num: '99.97%',  label: 'Uptime SLA' },
            ].map(s => (
              <div className="hero-stat-card" key={s.label}>
                <span className="hero-stat-num">{s.num}</span>
                <span className="hero-stat-label">{s.label}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <div className="page-wrapper">

        
        <div id="accounts" className="ornament-line" style={{ margin: '32px 0 40px' }}>
          PRODUCTS &amp; SERVICES
        </div>

      
        <section className="services-section" style={{ paddingTop: 0 }}>
          <div className="services-grid">
            {SERVICES.map(s => (
              <div className="service-card" key={s.title}>
                <img src={s.img} alt={s.title} className="service-card-img" loading="lazy" onError={e => { e.target.onerror = null; e.target.src = IMG_FALLBACK; }} />
                <div className="service-card-body">
                  <span className="service-card-icon">{s.icon}</span>
                  <div className="service-card-title">{s.title}</div>
                  <div className="service-card-desc">{s.desc}</div>

                </div>
              </div>
            ))}
          </div>
        </section>

        
        <div id="loans" className="ornament-line" style={{ margin: '40px 0' }}>CURRENT INTEREST RATES</div>

        <div className="vintage-card" style={{ marginBottom: 40 }}>
          <div className="card-corner tl"/><div className="card-corner tr"/>
          <div className="card-corner bl"/><div className="card-corner br"/>
          <h3 className="section-title">Rate Card — Effective 1 May 2026</h3>
          <div className="vintage-table-wrap">
            <table className="vintage-table">
              <thead>
                <tr>
                  <th>Product</th>
                  <th>Rate</th>
                  <th>Note</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {RATES.map(r => (
                  <tr key={r.product}>
                    <td style={{ color: 'var(--ink)', fontFamily: 'var(--font-display)' }}>{r.product}</td>
                    <td style={{ color: 'var(--gold)', fontFamily: 'var(--font-display)', fontWeight: 700 }}>{r.rate}</td>
                    <td style={{ fontFamily: 'var(--font-stamp)', fontSize: 10, letterSpacing: '0.1em' }}>{r.note}</td>
                    <td>
                      <button className="btn-secondary" style={{ padding: '4px 12px', fontSize: 9 }}
                        onClick={onSignIn}>Apply</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div style={{ marginTop: 12, fontFamily: 'var(--font-stamp)', fontSize: 9, color: 'var(--ink-ghost)', letterSpacing: '0.15em' }}>
            * RATES ARE SUBJECT TO CHANGE WITHOUT PRIOR NOTICE. T&amp;C APPLY. ALL RATES PER ANNUM.
          </div>
        </div>

       
        <div id="investments" className="ornament-line" style={{ margin: '40px 0' }}>WHY Siddharth international bank</div>

        <div className="grid-2" style={{ marginBottom: 40 }}>
          {WHY_US.map(w => (
            <div className="info-card info-gold" key={w.title}>
              <div className="info-card-icon">{w.icon}</div>
              <div>
                <div className="info-card-title">{w.title}</div>
                <div className="info-card-text">{w.text}</div>
              </div>
            </div>
          ))}
        </div>

     
        <div style={{ position: 'relative', overflow: 'hidden', marginBottom: 40, borderRadius: 2, border: '1px solid var(--border-ornate)' }}>
          <img src={IMGS.branch} alt="First National Vault Headquarters"
            style={{ width: '100%', height: 280, objectFit: 'cover', opacity: 0.4, filter: 'sepia(60%) brightness(0.6)', display: 'block' }}
            onError={e => { e.target.onerror = null; e.target.src = IMG_FALLBACK; }} />
          <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: 40, background: 'linear-gradient(90deg, rgba(10,8,5,0.9) 40%, transparent 100%)' }}>
            <div className="hero-eyebrow" style={{ marginBottom: 12 }}>Our Legacy</div>
            <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 28, color: 'var(--gold-bright)', marginBottom: 12 }}>
              77 Years of Financial Excellence
            </h2>
            <p style={{ color: 'var(--ink-faded)', fontSize: 14, maxWidth: 480, lineHeight: 1.7 }}>
              From a single branch in 1947 to a nationwide network, Siddharth International Bank has
              been the trusted custodian of India's savings, dreams, and aspirations.
            </p>
            <div style={{ marginTop: 20 }}>
              <button className="btn-secondary" onClick={onSignIn}>⚷ Join Us Today</button>
            </div>
          </div>
        </div>

        <div id="about" className="ornament-line" style={{ margin: '40px 0' }}>LEADERSHIP BOARD</div>

        <div className="grid-3" style={{ marginBottom: 40 }}>
          {[
            { name: 'Rajesh Venkataraman', title: 'Managing Director & CEO',    tenure: 'Since 2018' },
            { name: 'Priya Subramaniam',   title: 'Chief Financial Officer',    tenure: 'Since 2020' },
            { name: 'Arun Kumar Pillai',   title: 'Chief Technology Officer',   tenure: 'Since 2019' },
          ].map(p => (
            <div className="vintage-card" key={p.name} style={{ textAlign: 'center', padding: '24px 20px' }}>
              <div className="card-corner tl"/><div className="card-corner tr"/>
              <div className="card-corner bl"/><div className="card-corner br"/>
              <div style={{ width: 72, height: 72, borderRadius: '50%', border: '2px solid var(--gold-dim)', marginBottom: 14, margin: '0 auto 14px', background: 'rgba(201,168,76,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 26, color: 'var(--gold)' }}>
                {p.name[0]}
              </div>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: 15, color: 'var(--gold)', marginBottom: 4 }}>{p.name}</div>
              <div style={{ fontFamily: 'var(--font-stamp)', fontSize: 9, letterSpacing: '0.2em', color: 'var(--sepia)', textTransform: 'uppercase', marginBottom: 4 }}>{p.title}</div>
              <div style={{ fontFamily: 'var(--font-stamp)', fontSize: 9, color: 'var(--ink-ghost)', letterSpacing: '0.1em' }}>{p.tenure}</div>
            </div>
          ))}
        </div>

       
        <div className="ornament-line" style={{ margin: '40px 0' }}>FREQUENTLY ASKED QUESTIONS</div>

        <div className="vintage-card" style={{ marginBottom: 40 }}>
          <div className="card-corner tl"/><div className="card-corner tr"/>
          <div className="card-corner bl"/><div className="card-corner br"/>
          <h3 className="section-title">Customer Queries</h3>
          {FAQ.map((f, i) => (
            <div key={i} style={{ borderBottom: i < FAQ.length - 1 ? '1px solid rgba(74,58,32,0.4)' : 'none' }}>
              <button
                onClick={() => setOpenFaq(openFaq === i ? null : i)}
                style={{
                  width: '100%', background: 'none', border: 'none', cursor: 'pointer',
                  padding: '16px 0', display: 'flex', justifyContent: 'space-between',
                  alignItems: 'center', color: 'var(--gold)', fontFamily: 'var(--font-display)', fontSize: 14,
                  textAlign: 'left', gap: 12,
                }}>
                <span>{f.q}</span>
                <span style={{ color: 'var(--gold-dim)', fontSize: 18, flexShrink: 0 }}>
                  {openFaq === i ? '−' : '+'}
                </span>
              </button>
              {openFaq === i && (
                <div style={{ paddingBottom: 16, color: 'var(--ink-faded)', fontSize: 13, lineHeight: 1.7 }}>
                  {f.a}
                </div>
              )}
            </div>
          ))}
        </div>

      
        <div style={{
          background: 'linear-gradient(135deg, #2a1a08 0%, #1a1208 100%)',
          border: '1px solid var(--gold-dim)', padding: '40px 32px',
          textAlign: 'center', marginBottom: 40, position: 'relative', overflow: 'hidden',
        }}>
          {/* decorative circles */}
          <div style={{ position: 'absolute', top: -50, right: -50, width: 200, height: 200, borderRadius: '50%', border: '1px solid rgba(201,168,76,0.08)' }} />
          <div style={{ position: 'absolute', bottom: -40, left: -40, width: 160, height: 160, borderRadius: '50%', border: '1px solid rgba(196,98,45,0.1)' }} />
          <div style={{ position: 'relative', zIndex: 1 }}>
            <div style={{ fontFamily: 'var(--font-stamp)', fontSize: 9, letterSpacing: '0.4em', color: 'var(--rust-light)', textTransform: 'uppercase', marginBottom: 12 }}>
              Begin Your Journey
            </div>
            <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 28, color: 'var(--gold-bright)', marginBottom: 12 }}>
              Open Your Account Today
            </h2>
            <p style={{ color: 'var(--ink-faded)', fontSize: 14, maxWidth: 460, margin: '0 auto 24px', lineHeight: 1.7 }}>
              100% digital onboarding. Get your account number in minutes.
              Initial deposit of just ₹1,000. No hidden charges.
            </p>
            <button className="btn-primary" style={{ width: 'auto', padding: '14px 40px', fontSize: 12 }}
              onClick={onSignIn}>
              ✍ Open Account Free
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}