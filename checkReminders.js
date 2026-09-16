import mongoose from "mongoose";
import dotenv from "dotenv";
import fs from "fs";
dotenv.config();

mongoose.connect(process.env.MONGO_CONN).then(async () => {
    const Reminder = mongoose.model("Reminder", new mongoose.Schema({
        clientName: String,
        title: String,
        reminderDateTime: Date,
        cronFired: Boolean,
        createdAt: Date
    }, { strict: false, collection: "reminders" }));

    const recent = await Reminder.find({}).sort({ createdAt: -1 }).limit(6);
    let out = "Recent reminders:\n";
    recent.forEach(r => {
        out += `- ID: ${r._id}, Name: ${r.clientName}, Title: ${r.title}, Time: ${r.reminderDateTime}, cronFired: ${r.cronFired}, created: ${r.createdAt}\n`;
    });
    fs.writeFileSync('reminders_output.txt', out);
    console.log("Done");
    process.exit(0);
});
