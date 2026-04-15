# SalesAuto Frontend

Modern, lightweight frontend for SalesAuto - AI-Powered Lead Research & Outreach Platform

## Project Structure

```
frontend/
├── server.js              # Express.js server
├── package.json           # Node dependencies
├── .env                   # Environment config
├── public/
│   ├── index.html        # Main HTML file
│   ├── css/
│   │   └── style.css     # Light & modern styling
│   └── js/
│       └── app.js        # Main app logic & API calls
└── README.md             # This file
```

## Features

- ✅ **Modern UI** - Light colors, clean design
- ✅ **Responsive** - Works on desktop, tablet, mobile
- ✅ **Dynamic Tabs** - Research, Dashboard, Approvals, Email
- ✅ **Real-time Status** - Live pipeline polling
- ✅ **Full API Integration** - All backend APIs integrated
- ✅ **Email Testing** - Test email microservice
- ✅ **Dark/Light** - Easy theme switching

## Installation

### Prerequisites
- Node.js 14+ 
- npm or yarn

### Setup

1. Navigate to frontend directory:
```bash
cd frontend
```

2. Install dependencies:
```bash
npm install
```

3. Configure environment (.env already set):
```env
FRONTEND_PORT=3000
BACKEND_URL=http://localhost:8000
EMAIL_SERVICE_URL=http://localhost:8001
```

## Running the Frontend

```bash
npm start
```

The frontend will be available at: **http://localhost:3000**

## Available Tabs

### 🔍 Research
- Trigger AI pipeline with custom keyword
- Watch real-time pipeline status
- View activity logs

### 📊 Dashboard
- See metrics (leads, sites crawled, emails sent, replies)
- View discovered companies
- Track crawl status

### ✉️ Approvals
- Review drafted emails
- Approve or skip emails
- Send approved outreach

### 📧 Email
- Test email microservice
- Send emails directly from UI
- View response status

## API Configuration

The frontend automatically connects to:
- **Backend**: http://localhost:8000 (Django API)
- **Email Service**: http://localhost:8001 (FastAPI Email Microservice)

Modify `.env` to change these addresses.

## Development

### File Structure
- `server.js` - Express server & routing
- `public/index.html` - Main HTML (single page app)
- `public/css/style.css` - All styling (light theme)
- `public/js/app.js` - All JavaScript logic

### Key Functions
- `triggerPipeline()` - Start research
- `startPolling()` - Poll pipeline status
- `fetchStats()` - Get dashboard metrics
- `fetchCompanies()` - Get discovered companies
- `fetchApprovals()` - Get pending approvals
- `sendTestEmail()` - Send test email

## Styling

Uses custom CSS variables for theming:
```css
--primary: #2563eb          /* Blue *)
--secondary: #7c3aed        /* Purple */
--success: #16a34a          /* Green */
--danger: #dc2626           /* Red */
```

All light & modern with professional appearance.

## Troubleshooting

**Cannot connect to backend?**
- Make sure Django is running on port 8000
- Check `BACKEND_URL` in `.env`
- Check browser console for CORS errors

**Email not sending?**
- Verify Email Microservice is running on port 8001
- Check `.env` in SalesAuto root for SMTP credentials
- Check Email Service docs at http://localhost:8001/docs

**Styling issues?**
- Clear browser cache (Ctrl+Shift+Delete)
- Check browser console for CSS errors
- Verify `style.css` is loaded

## Browser Support

- Chrome/Chromium 90+
- Firefox 88+
- Safari 14+
- Edge 90+

## License

MIT

## Support

For issues, check:
1. Backend logs: `sales/agent/agent_execution.log`
2. Browser console (F12)
3. Network tab to see API responses

---

**SalesAuto Frontend** | Built with Express.js, Vanilla JS, & Modern CSS
