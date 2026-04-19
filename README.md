# Ready-Mix Concrete (RMC) Billing & Dispatch System

A full-stack, state-operated web application for managing the complete lifecycle of Ready-Mix Concrete operations—from client acquisition and order entry to dispatch, batchsheet generation, invoicing, and payment tracking.

## Architecture

*   **Frontend**: React (Vite), TailwindCSS, React Query, Zustand
*   **Backend**: Node.js, Express, MongoDB (Mongoose), pdfmake, pdfkit
*   **Authentication**: Custom JWT-based Role-Based Access Control (RBAC)

## User Roles & Responsibilities

The system is strictly governed by a 4-tier Role-Based Access Control (RBAC) model. Each user operates within their defined scope of responsibilities:

### Level 1 (L1) — System Admin
*   **Function**: Operational Oversight & System Configuration.
*   **Capabilities**:
    *   Full dashboard visibility across operations.
    *   Configure global **Company Settings** (Name, GSTIN, Registered Address, etc.) which automatically reflect on all outgoing printed PDFs.
    *   Manage data retention (exclusive ability to permanently purge old dispatch and batchsheet records). *Note: The Client Master database is strictly append-only and cannot be deleted by anyone, including L1.*

### Level 2 (L2) — Manager / Supervisor
*   **Function**: Approval Authority & Administration.
*   **Capabilities**:
    *   **Manage Clients**: Add clients, complete KYC, and approve credit status.
    *   **Sales Orders**: Create overarching Sales Orders against which L3 Sales can book individual daily orders.
    *   **Order Approvals**: Approve daily orders submitted by L3.
    *   **Sale Authorisation**: Final approval required for dispatches before L4 can generate official Invoices.
    *   **Payments**: Record payments against specific invoices or client accounts.

### Level 3 (L3) — Sales Representative
*   **Function**: Customer Interfacing & Order Entry.
*   **Capabilities**:
    *   Submit **New Orders** on behalf of verified clients.
    *   Negotiate rates within pre-approved boundaries.
    *   Track the live pipeline status of their submitted orders (Pending → Approved → Dispatched → Sale Auth. → Invoiced).

### Level 4 (L4) — Plant / Dispatch Operator
*   **Function**: Operations Execution & Fulfillment.
*   **Capabilities**:
    *   **Dispatch**: Fill dispatch forms (specify vehicle number and exact loaded quantity) for APPROVED orders.
    *   **Batchsheets**: Generate operational batchsheet PDFs (Mix Design / Dosage) utilizing customizable templates.
    *   **Invoicing**: Generate the final, official Delivery Challan / Tax Invoices. Heavily engineered to support **Offline Generation** (utilizing reserved invoice number blocks and IndexedDB syncing when the plant loses internet).

---

## The Operational Workflow (End-to-End)

The lifecycle of an operation enforces strict data movement and approval handoffs:

1.  **L3 Submits Order:** Sales user submits an order linked to a Client, Site, Quality (Grade), and an overarching L2 Sales Order. (Status: `PENDING`)
2.  **L2 Approves Order:** Management reviews and approves the negotiated rate and requirements. (Status: `APPROVED`)
3.  **L4 Dispatches Concrete:** Plant sees the approved order, fills the dispatch log with vehicle details, and the truck leaves the plant. (Order Status: `DISPATCHED` | Dispatch Status: `dispatched`)
4.  **L2 Authorises Sale:** Management verifies the dispatch logs and authorizes the finance conversion. (Order Status: `SALE_AUTHORIZED` | Dispatch Status: `sale_authorized`)
5.  **L4 Generates Invoice:** Plant operators print the final Delivery Challan PDF utilizing the company info configured by L1. (Dispatch Status: `invoiced`)
6.  **L2 Records Payment:** Payments are marked directly against the finalized invoice or logged against the Client account.

---

## Setup & Local Development

### 1. Prerequisites
*   Node.js (v18+ recommended)
*   MongoDB Instance (Local or Atlas URI)

### 2. Environment Configuration
Create a `.env` file in the `/server` directory:
```env
PORT=5000
MONGODB_URI=mongodb://localhost:27017/rmc_billing
JWT_SECRET=your_super_secret_key_here
FRONTEND_URL=http://localhost:5173
```

### 3. Installation
**Install Backend Dependencies**
```bash
cd server
npm install
```

**Install Frontend Dependencies**
```bash
cd client
npm install
```

### 4. Database Seeding
To initialize the system with the default Roles, Concrete Grades, Batchsheet Templates, and mock User Accounts:
```bash
cd server
npm run seed
```
**Default Credentials:** The active password for all seeded accounts is `ChangeMe@123`

### 5. Running the Application
You need two terminals to run the system concurrently.

**Terminal 1 (Backend API):**
```bash
cd server
npm run dev
```

**Terminal 2 (Frontend React App):**
```bash
cd client
npm run dev
```

The app will be accessible by default at `http://localhost:5173`.
