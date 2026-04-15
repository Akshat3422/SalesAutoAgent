# 🔧 SalesAuto - 404 Error Debugging Checklist

## ✅ Quick Diagnostic Test

### 1. **Check ALL services are running**
```bash
# Terminal 1: Django Backend (port 8000)
cd sales
python manage.py runserver 8000

# Terminal 2: Email Service (port 8001)
python email_service.py

# Terminal 3: Frontend (port 3000)
cd frontend
npm start
```

### 2. **Verify URLs in Browser** 
Open each URL in a new browser tab and check response:

| URL | Expected Response | Status |
|-----|-------------------|--------|
| `http://localhost:8000/` | `{"status": "ok"}` | ✓ |
| `http://localhost:8000/api/agent/test/` | `{"status": "ok"}` | ✓ |
| `http://localhost:8001/api/health` | Health check | ✓ |
| `http://localhost:3000/` | Frontend page | ✓ |
| `http://localhost:3000/api/config` | Backend URLs | ✓ |
| `http://localhost:3000/api/diagnostic` | Service status | ✓ |

### 3. **Check Frontend Configuration**

Visit: **http://localhost:3000/api/diagnostic**

Should show:
```json
{
  "frontend": "ok",
  "backend": "ok",
  "emailService": "ok or error",
  "urls": {
    "backend": "http://localhost:8000",
    "emailService": "http://localhost:8001"
  }
}
```

**If backend shows "error":**
- Django backend is NOT running
- Check Terminal 1

---

## 🔍 Frontend Console Debugging

1. Open Frontend: **http://localhost:3000**
2. Press **F12** (Developer Tools)
3. Go to **Console** tab
4. You should see logs like:

```
✓ Config loaded: {backend: "http://localhost:8000", ...}
✓ Backend connected successfully
🔍 Calling: http://localhost:8000/api/agent/trigger/
📡 Response status: 202 Accepted
✓ Pipeline triggered successfully
```

**If you see errors:**
- Check Network tab (F12 → Network)
- Look for the POST request to trigger/
- Check Response tab for error details

---

## 📡 Network Test

### Test Backend is Accessible

In browser console, run:
```javascript
fetch('http://localhost:8000/api/agent/test/')
  .then(r => r.json())
  .then(d => console.log('✓ Backend OK:', d))
  .catch(e => console.error('❌ Backend Error:', e))
```

Should log: `✓ Backend OK: {"status": "ok", "message": "Agent API is accessible"}`

### Test Trigger Endpoint

```javascript
fetch('http://localhost:8000/api/agent/trigger/', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ keyword: 'Test' })
})
  .then(r => r.json())
  .then(d => console.log('✓ Trigger response:', d))
  .catch(e => console.error('❌ Error:', e))
```

---

## 🚨 Common Issues & Solutions

### Issue 1: "Cannot connect to backend"
**Problem:** Backend is not running  
**Solution:** Start Django: `python manage.py runserver 8000`

### Issue 2: 404 on `/api/agent/trigger/`
**Problem:** URL routing issue or Django not loaded  
**Solution:**  
- Verify Django is running
- Check frontend .env file has correct BACKEND_URL
- Try accessing `/api/agent/test/` first

### Issue 3: CORS Error
**Problem:** Browser blocks cross-origin request  
**Solution:** Already fixed in Django settings (`CORS_ALLOW_ALL_ORIGINS`)

### Issue 4: "Pipeline already running"
**Problem:** Previous pipeline is still running  
**Solution:** Wait 30 minutes or restart Django

---

## 📝 Detailed Request/Response Flow

```
Frontend (3000)
    ↓
1. Loads config from /api/config
    → Gets: { backend: "http://localhost:8000", ... }
    ↓
2. Checks health: GET http://localhost:8000/
    → Gets: {"status": "ok"}
    ↓
3. User clicks "Trigger Research"
    ↓
4. POST http://localhost:8000/api/agent/trigger/
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: { keyword: "EdTech India AI" }
    }
    ↓
Django (8000)
    Routes to: /api/agent/ → agent_trigger_view
    ↓
    Response: {"message": "...", "keyword": "..."}
    Status: 202 Accepted
    ↓
Frontend
    Receives 202 → startPolling()
    ✓ Pipeline triggered!
```

---

## ✅ Verification Steps (Do in Order)

1. ✅ **All 3 services running?**
   ```bash
   netstat -ano | findstr "3000\|8000\|8001"
   ```
   Should show 3 listening ports

2. ✅ **Can reach Django root?**
   Visit: http://localhost:8000/

3. ✅ **Can reach test endpoint?**
   Visit: http://localhost:8000/api/agent/test/

4. ✅ **Frontend config loaded?**
   Visit: http://localhost:3000/api/diagnostic

5. ✅ **Check frontend console (F12)**
   Look for: "✓ Config loaded"

6. ✅ **Try trigger (F12 console)**
   ```javascript
   fetch('http://localhost:8000/api/agent/trigger/', {
     method: 'POST',
     headers: { 'Content-Type': 'application/json' },
     body: JSON.stringify({ keyword: 'Test' })
   }).then(r => r.json()).then(console.log)
   ```

---

## 📞 Still Not Working?

Share these details:

1. **Django console output:**
   ```
   What does it show when running?
   Any errors?
   ```

2. **Frontend browser console (F12):**
   ```
   Copy full output including any errors
   ```

3. **Network tab response:**
   ```
   Go to F12 → Network
   Try trigger again
   Click the red/failed request
   Show Response tab content
   ```

4. **Verify .env files:**
   ```
   frontend/.env
   .env (in SalesAuto root)
   ```
