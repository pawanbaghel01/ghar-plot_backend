import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Notification from './models/notificationModel.js';
import fs from 'fs';

dotenv.config();

mongoose.connect(process.env.MONGO_CONN, { useNewUrlParser: true, useUnifiedTopology: true })
    .then(async () => {
        const notifs = await Notification.find().sort({ createdAt: -1 }).limit(8);
        fs.writeFileSync('notifs_utf8.json', JSON.stringify(notifs, null, 2), 'utf8');
        process.exit(0);
    })
    .catch(err => {
        fs.writeFileSync('notifs_err_utf8.txt', String(err), 'utf8');
        process.exit(1);
    });
