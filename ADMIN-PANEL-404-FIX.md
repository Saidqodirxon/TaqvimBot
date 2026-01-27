# 🔧 Admin Panel 404 Xatosini Tuzatish

## 🎯 Muammo
Admin panelda 404 xatosi - dist build qilingan lekin sahifalar ishlamayapti.

## ✅ Tuzatilgan O'zgarishlar

### 1. **vite.config.js** - Build sozlamalari qo'shildi
```javascript
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    host: true,
  },
  preview: {
    port: 9998,
    host: true,
  },
  build: {
    outDir: "dist",
    assetsDir: "assets",
    rollupOptions: {
      output: {
        manualChunks: undefined,
      },
    },
  },
});
```

### 2. **.env.production** - Production API URL
```env
VITE_API_URL=https://ramazonbot-api.saidqodirxon.uz/api
```

### 3. **nginx/server.main.js** - SPA routing tuzatildi
```javascript
// OLDINGI (xato):
app.get("/*", (req, res) => { ... }

// YANGI (to'g'ri):
app.get("*", (req, res) => { ... }
// Barcha route'lar uchun index.html qaytaradi
```

---

## 🚀 Deploy Komandalar

### Avtomatik Deploy (tavsiya etiladi):
```bash
cd /root/ramazonbot
chmod +x deploy-admin-panel.sh
./deploy-admin-panel.sh
```

### Qo'lda Deploy:
```bash
# 1. Git pull
cd /root/ramazonbot
git pull

# 2. Build admin panel
cd admin-panel
npm run build

# 3. Restart PM2
pm2 restart ramazonbot-admin-9998

# 4. Check logs
pm2 logs ramazonbot-admin-9998 --lines 20
```

---

## 🔍 Debug (agar hali ham 404 bo'lsa)

```bash
cd /root/ramazonbot
chmod +x debug-admin-panel.sh
./debug-admin-panel.sh
```

### Manual Debug:
```bash
# 1. Check PM2 status
pm2 status ramazonbot-admin-9998

# 2. Check port
sudo netstat -tulpn | grep 9998

# 3. Check dist folder
ls -lh /root/ramazonbot/admin-panel/dist/

# 4. Check index.html
cat /root/ramazonbot/admin-panel/dist/index.html

# 5. Test localhost
curl http://localhost:9998

# 6. Check PM2 logs
pm2 logs ramazonbot-admin-9998 --lines 50
```

---

## 🌐 Nginx Konfiguratsiya

Agar nginx orqali ishlayotgan bo'lsa:

**`/etc/nginx/sites-available/ramazonbot-admin`**:
```nginx
server {
    listen 80;
    server_name ramazonbot-admin.saidqodirxon.uz;

    location / {
        proxy_pass http://localhost:9998;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

Qo'llash:
```bash
sudo nginx -t
sudo systemctl reload nginx
```

---

## 🎯 Tekshirish

### 1. Localhost Test:
```bash
curl http://localhost:9998
# Kutilayotgan: HTML content
```

### 2. PM2 Status:
```bash
pm2 status ramazonbot-admin-9998
# Status: online ✅
```

### 3. Browser Test:
- Direct: `http://SERVER_IP:9998`
- Domain: `https://ramazonbot-admin.saidqodirxon.uz`

### 4. React Router Test:
Agar `/login`, `/dashboard`, `/users` sahifalar ishlamasa:
- Bu `nginx/server.main.js` muammosi
- `app.get("*", ...)` ishlatish kerak (biz tuzatdik)

---

## ⚠️ Keng Tarqalgan Xatolar

### Xato 1: `Cannot GET /dashboard`
**Sabab**: Express `/*` o'rniga `*` ishlatishi kerak
**Yechim**: `nginx/server.main.js` tuzatildi ✅

### Xato 2: `404 on refresh`
**Sabab**: SPA routing to'g'ri sozlanmagan
**Yechim**: Barcha route'lar index.html ga yo'naltirildi ✅

### Xato 3: `API 404 errors`
**Sabab**: VITE_API_URL noto'g'ri
**Yechim**: `.env.production` yaratildi ✅

### Xato 4: `Blank page`
**Sabab**: Build muvaffaqiyatsiz yoki dist yo'q
**Yechim**: `npm run build` qayta ishga tushiring

---

## 📊 Kutilgan Natijalar

### Build Output:
```
dist/index.html                   0.46 kB
dist/assets/index-BvUL_3aR.css   69.22 kB
dist/assets/index-BNYQ_VZq.js   453.42 kB
✓ built in 3.96s
```

### PM2 Status:
```
│ ramazonbot-admin-9998 │ online │
```

### Browser:
- ✅ Login page loads
- ✅ Dashboard accessible
- ✅ All routes work
- ✅ No console errors
- ✅ API calls successful

---

## 🆘 Agar Hali Ham Ishlamasa

1. **PM2 to'liq restart**:
```bash
pm2 delete ramazonbot-admin-9998
pm2 start /root/ramazonbot/api/ecosystem.config.js --only ramazonbot-admin-9998
```

2. **Cache tozalash**:
```bash
cd /root/ramazonbot/admin-panel
rm -rf dist node_modules
npm install
npm run build
pm2 restart ramazonbot-admin-9998
```

3. **Nginx restart**:
```bash
sudo systemctl restart nginx
sudo systemctl status nginx
```

4. **Loglarni tekshiring**:
```bash
# PM2 logs
pm2 logs ramazonbot-admin-9998

# Nginx logs
sudo tail -f /var/log/nginx/error.log
```

---

## ✅ Yakuniy Tekshirish

```bash
# 1. Build exists
ls /root/ramazonbot/admin-panel/dist/index.html

# 2. PM2 online
pm2 status | grep admin

# 3. Port listening
sudo netstat -tulpn | grep 9998

# 4. HTTP response
curl -I http://localhost:9998

# 5. Browser works
# Open: https://ramazonbot-admin.saidqodirxon.uz
```

---

**Tuzatildi**: January 28, 2026
**Version**: 2.0
**Status**: ✅ Ready for deployment
