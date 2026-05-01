# tawjih-chatbot-mobile-app

Mobile chatbot app for the Orientation RAG FastAPI backend.

Install dependencies, then start Expo:

```bash
npm install
npm start
```

For Android emulator, the app defaults to `http://10.0.2.2:8000`.
For iOS simulator, it defaults to `http://localhost:8000`.
For a physical phone, set your computer LAN IP. On this machine right now it appears to be `192.168.1.19`:

```bash
$env:EXPO_PUBLIC_API_BASE_URL="http://192.168.1.19:8000"
npm start
```
