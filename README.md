# Ghar-Plot Backend

Node.js & Express REST API and WebSocket backend for the Ghar-Plot property management platform.

## Features
- User & Admin Authentication (JWT, Google OAuth)
- Real-time Chat & Notifications via Socket.io & Firebase Cloud Messaging (FCM)
- Property Management (Buy, Sell, Rent, Revenue)
- Lead & Employee Management
- Automated Cron Reminders & Alerts
- Payment Integration with Razorpay
- Geocoding with OpenCage
- SMS integration with Twilio & Renflair

## Deployment on Render
1. Create a new **Web Service** on [Render](https://render.com).
2. Connect your GitHub repository: `https://github.com/pawanbaghel01/ghar-plot_backend`.
3. Set the following settings:
   - **Environment**: `Node`
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
4. Add the required environment variables in Render's **Environment** tab (see `.env.example`).
5. (Optional) For Firebase FCM notifications, either:
   - Add `FIREBASE_SERVICE_ACCOUNT` as an environment variable with the JSON string content of your service account.
   - Or upload `serviceAccountKey.json` under Render's **Secret Files**.

## Local Development
```bash
# Install dependencies
npm install

# Start the server
npm start
```
