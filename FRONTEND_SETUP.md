# 🚀 SalesAuto - Complete Setup & Run Guide

## Quick Start (All Services)

### 1️⃣ Install Frontend Dependencies
```bash
cd frontend
npm install
cd ..
```

### 2️⃣ Start All Services (Terminal 1)
```bash
# Make sure Django is running
python manage.py runserver 8000
```

### 3️⃣ Start Email Microservice (Terminal 2)
```bash
python email_service.py
```

### 4️⃣ Start Frontend (Terminal 3)
```bash
cd frontend
npm start
```

---

## Service URLs

| Service | URL | Purpose |
|---------|-----|---------|
| **Frontend** | http://localhost:3000 | Main UI |
| **Backend API** | http://localhost:8000 | Django REST APIs |
| **Email Docs** | http://localhost:8001/docs | Email API Documentation |
| **Email Service** | http://localhost:8001 | Email Microservice |

---

## Frontend Features

### 🔍 Research Tab
- Trigger AI-powered lead research
- Real-time pipeline status
- Activity logs

### 📊 Dashboard Tab  
- Metrics (leads, sites crawled, emails)
- Company discoveries
- Crawl status

### ✉️ Approvals Tab
- Review pending emails
- Approve/skip decisions
- Grouped by company

### 📧 Email Tab
- Test email sending
- Direct microservice access
- Response feedback

---

## Architecture

```
┌─────────────────────┐
│   Frontend (3000)   │  ← Main User Interface
│  HTML/CSS/JS        │
└──────────┬──────────┘
           │
    ┌──────┴──────┐
    │             │
┌───▼────────┐  ┌─▼──────────────┐
│ Backend    │  │ Email Service  │
│ (8000)     │  │ (8001)         │
│ Django     │  │ FastAPI        │
│            │  │                │
│ • Research │  │ • Send Email   │
│ • Scrape   │  │ • Bulk Send    │
│ • Approve  │  │ • Health Check │
└────────────┘  └────────────────┘
```

---

## Configuration Files

### `frontend/.env`
```env
FRONTEND_PORT=3000
BACKEND_URL=http://localhost:8000
EMAIL_SERVICE_URL=http://localhost:8001
```

### `frontend/package.json`
```json
{
  "dependencies": {
    "express": "^4.18.2",
    "cors": "^2.8.5",
    "dotenv": "^16.0.3"
  }
}
```

---

## Frontend Structure

```
frontend/
├── server.js                    # Express server
├── package.json                 # Dependencies
├── .env                         # Config
├── public/
│   ├── index.html              # Single Page App
│   ├── css/
│   │   └── style.css           # Light theme (1000+ lines)
│   └── js/
│       └── app.js              # API calls & logic (600+ lines)
└── README.md                    # Frontend docs
```

---

## API Integration

### Backend Endpoints Used
```javascript
POST   /agent/trigger/          // Start pipeline
GET    /agent/status/           // Pipeline status
GET    /agent/approvals/        // Get approvals
POST   /agent/approvals/{id}/approve/
POST   /agent/approvals/{id}/skip/
GET    /companies/              // Get companies
GET    /dashboard/stats/        // Get metrics
```

### Email Service Endpoints
```javascript
POST   /api/send-email          // Send single email
POST   /api/send-bulk           // Send multiple
GET    /api/health              // Health check
GET    /docs                    // Swagger docs
```

---

## Development Notes

### JavaScript Features
- ✅ Async/await for API calls
- ✅ Real-time polling system
- ✅ Dynamic tab navigation
- ✅ Error handling & logging
- ✅ Response formatting

### CSS Features
- ✅ CSS Variables for theming
- ✅ Light color scheme
- ✅ Fully responsive (mobile-first)
- ✅ Smooth animations
- ✅ Professional gradient effects

### Frontend Highlights
- Single HTML file for simple deployement
- No build process needed
- Pure JavaScript (no frameworks)
- 100% Vanilla JS & CSS
- CORS enabled

---

## Troubleshooting

### Frontend won't start
```bash
# Check Node is installed
node --version

# Reinstall dependencies
cd frontend
rm package-lock.json node_modules -rf
npm install
npm start
```

### Cannot connect to backend
```bash
# Check Django is running
python manage.py runserver 8000

# Verify in frontend .env
cat frontend/.env

# Check browser console (F12)
```

### Email not sending
```bash
# Verify Email Service is running
python email_service.py

# Check credentials in .env
GMAIL_ID=<your-email>
PASSWORD=<your-password>

# Test at http://localhost:8001/docs
```

---

## Performance Notes

⚡ **Frontend is optimized for:**
- Fast load time (~100ms)
- Minimal dependencies
- Efficient polling (every 5s, updates every 15s)
- Smart caching on API responses

---

## Next Steps

1. ✅ Start all 3 services
2. ✅ Open http://localhost:3000
3. ✅ Trigger a research pipeline
4. ✅ Watch real-time updates
5. ✅ Approve emails
6. ✅ Send test email

**Enjoy! 🎉**

---

For detailed frontend docs, see: [frontend/README.md](frontend/README.md)
