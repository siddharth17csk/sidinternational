# Siddharth International Bank

A full-stack banking management system built using React and Firebase Firestore.  
This project was designed to simulate how a modern digital banking platform works internally for both customers and bank administrators.

The application includes customer onboarding, authentication, banking transactions, loan management, KYC verification, notifications, and an administrative dashboard — all connected with Firestore as the backend database. :contentReference[oaicite:0]{index=0}


# Project Overview

The system is divided into two major sides:

- Customer Portal
- Admin Dashboard

Customers can create accounts, manage funds, transfer money, apply for loans, and track their banking activity.

Admins can monitor customers, approve accounts, manage loans, register banks, handle employees, and supervise the entire banking workflow.

The UI was designed with a vintage banking aesthetic to give the platform a premium institutional appearance. :contentReference[oaicite:1]{index=1}



# Main Features

## Customer Features

- Customer Registration
- Secure Login System
- KYC Verification
- Account Dashboard
- Fund Transfers
- Transaction History
- Loan Applications
- Notifications & Alerts
- Profile Management

Implemented mainly inside the customer portal component. :contentReference[oaicite:2]{index=2}


## Admin Features

- Approve or Reject Customer Accounts
- Review Loan Applications
- Manage Bank Nodes
- Add Employees
- Control Transfer Limits
- Monitor Customer Records
- View Email Logs
- Manage Employee Permissions

Implemented inside the administrative dashboard. :contentReference[oaicite:3]{index=3}

# Application Flow

## 1. Landing Page

When the application starts, users first enter the homepage.

The homepage introduces the bank, its services, current interest rates, leadership board, and financial products. It acts as the public-facing portal of the banking system. :contentReference[oaicite:4]{index=4}

Users can:

- Explore banking services
- Read about loans and investments
- View financial information
- Navigate to authentication


## 2. Authentication System

After clicking sign in, the user enters the authentication page.

The authentication module supports:

- Customer Login
- New Account Registration

During registration:

- Aadhaar validation is performed
- PAN validation is performed
- Password confirmation is checked
- Customer account data is stored in Firestore

After successful registration, a new account number is generated and the customer waits for admin approval. :contentReference[oaicite:5]{index=5}


## 3. Customer Portal

Once a customer logs in successfully, they are redirected to the customer dashboard.

The customer dashboard contains multiple sections:

### Portfolio

Displays:

- Account balance
- Account status
- KYC status
- Transfer limit
- Account information



### Transfer System

Customers can:

- Transfer money internally
- Transfer funds to external banks
- Select bank nodes
- View transfer status

Real-time listeners update transaction activity dynamically. :contentReference[oaicite:6]{index=6}


### Loan System

Customers can apply for:

- Personal Loans
- Home Loans
- Vehicle Loans
- Education Loans
- Business Loans

The system automatically estimates EMI values before submission.



### Transaction Ledger

Every transfer and banking operation is recorded in Firestore and displayed inside the ledger section.



### Notifications

Customers receive alerts regarding:

- Transfers
- Loan approvals
- Loan rejections
- Account updates

Unread notifications are highlighted dynamically.

---

# Admin Dashboard Flow

Admins enter a completely separate control panel after login.

The dashboard is divided into multiple management sections.

---

## Customer Registry

Admins can:

- Approve customer accounts
- Reject accounts
- Put accounts on hold
- Modify transfer limits

Every account action updates Firestore instantly. :contentReference[oaicite:7]{index=7}

---

## Loan Registry

Loan applications submitted by customers appear inside the admin loan section.

Admins can:

- Approve loans
- Reject loans
- Review EMI information
- Monitor loan history

---

## Bank Network

The system supports multi-bank architecture.

Admins can:

- Register new banks
- Activate or suspend bank nodes
- Manage IFSC-based routing

---

## Employee Management

Super admins can:

- Add employees
- Assign admin roles
- Grant permissions
- Suspend employees

Roles include:

- Super Admin
- Branch Admin
- Loan Officer
- Cashier

---

## Email Logs

The system keeps track of outgoing notifications and email-style updates generated during approvals or rejections.

---

# Firestore Database Structure

The project uses Firebase Firestore as the backend database.

Collections include:

- employee
- auditLog
- user
- userDetails
- kycUser
- loan
- bankTransfer
- transferNotif
- transaction
- bank

These collections work together to simulate a real banking infrastructure.

---

# Technologies Used

## Frontend

- React.js
- JSX
- CSS
- Responsive UI Design

---

## Backend / Database

- Firebase Firestore
- Firebase Authentication Logic
- Real-time Firestore Listeners



# Session Management

The application stores session data using browser session storage.

This allows users to remain logged in during refreshes until logout occurs. :contentReference[oaicite:8]{index=8}


# Future Improvements

Some future enhancements that can be added:

- OTP Authentication
- AI Fraud Detection
- PDF Statement Downloads
- Razorpay / Stripe Integration
- Biometric Authentication
- Real Email Service
- Advanced Analytics Dashboard
- Mobile Application

---

# Conclusion

This project was built to replicate the workflow of a real banking management platform while keeping the experience modern, interactive, and visually unique.

It demonstrates how banking systems manage customer onboarding, authentication, transactions, loans, employee administration, and bank-to-bank operations using React and Firebase.

The goal of the project was not only to build a working banking application, but also to understand how large-scale financial systems organize data, permissions, workflows, and customer operations internally.