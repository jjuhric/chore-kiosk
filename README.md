# 📋 Chore Kiosk

A robust, full-stack touchscreen kiosk application designed to run on a Raspberry Pi. This system manages family chores, tracks allowances, and provides a frictionless, QR-code-based login experience for both adult administrators and child users.

---

## ✨ Features

- **Touch-Optimized Interface:** Built with React to provide a seamless, interactive kiosk experience on a Raspberry Pi touchscreen.
- **Frictionless Authentication:** Utilizes QR code scanning (`@yudiel/react-qr-scanner`) for quick, password-less login, generating secure JWTs.
- **Automated Scheduling:** Leverages `node-cron` to automatically assign daily/weekly chores and process recurring tasks.
- **Real-Time Notifications:** Integrated `nodemailer` to send setup QR codes via email and dispatch SMS notifications (e.g., via Verizon gateways) to adult users.
- **Self-Contained Database:** Uses SQLite for lightweight, persistent data storage that requires zero external database infrastructure.
- **Turnkey Deployment:** Fully containerized with Docker Compose, featuring an interactive Bash setup script (`install.sh`) for first-time provisioning.

---

## 🛠 Tech Stack

**Frontend**
- React 19 (Vite)
- TypeScript
- React Router DOM
- Lucide React (Icons)

**Backend**
- Node.js & Express
- TypeScript
- SQLite3
- Node-Cron (Task scheduling)
- Nodemailer (Email/SMS dispatch)
- JSON Web Tokens (JWT) & QRCode (Auth)

**Infrastructure**
- Docker & Docker Compose
- Bash (Interactive provisioning)
- Concurrently (Local dev orchestration)

---

## 🚀 Getting Started (Local Development)

The repository is configured as a monorepo with a root `package.json` to orchestrate both environments simultaneously.

### Prerequisites
- Node.js (v18+)
- npm

### Installation

1. Clone the repository and install all dependencies (root, backend, and frontend):
   ```bash
   npm run install:all

2. Start the development servers concurrently:
    ```bash
    npm run dev
    The backend will be available on http://localhost:3000 and the frontend will run via Vite.

3. Testing - To run Jest test suites across both environments:
    ```bash
    npm run test

📦 Production Deployment (Raspberry Pi)
The system is designed to be deployed as a Dockerized appliance.

Prerequisites
Docker Engine & Docker Compose installed on the target device.

1. Initial Configuration
Run the interactive setup wizard to configure the initial adult administrator and child accounts. This script generates the seed.json file required for the database initialization.

    ```bash
    chmod +x install.sh
    ./install.sh```
    Note: You will be prompted for names, contact info, and device counts. The system defaults to standard family configurations if values are left blank.

2. Environment Variables
    Create a .env file in the root directory to configure the SMTP relay for notifications:
    ```
    Code snippet
    NODE_ENV=production
    EMAIL_USER=your_smtp_email@example.com
    EMAIL_PASS=your_app_specific_password
    ```
3. Spin Up Containers
    Build and start the services in detached mode. The database volume will automatically map to persist your SQLite data.
    ```bash
    docker-compose up -d --build```
    The kiosk interface will now be accessible on port 80 of the Raspberry Pi.

📂 Repository Structure
   ```text
chore-kiosk/
├── backend/                # Node.js/Express API & SQLite DB
│   ├── src/                # Controllers, Routes, Services
│   ├── Dockerfile          # Backend container spec
│   └── package.json        
├── frontend/               # React Kiosk UI
│   ├── src/                # Components, Pages, Assets
│   ├── Dockerfile          # Nginx/React container spec
│   └── package.json        
├── docker-compose.yml      # Multi-container orchestration
├── install.sh              # Interactive seeder script
└── package.json            # Root dev orchestrator
```

📜 License
    ISC