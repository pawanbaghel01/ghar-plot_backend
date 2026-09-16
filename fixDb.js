import mongoose from "mongoose";
import dotenv from "dotenv";
dotenv.config();
mongoose.connect(process.env.MONGO_CONN).then(async () => {
    const Reminder = mongoose.model("Reminder", new mongoose.Schema({ cronFired: Boolean, reminderDateTime: Date }, { strict: false, collection: "reminders" }));
    const res = await Reminder.updateMany(
        { cronFired: { $ne: true }, reminderDateTime: { $lt: new Date(Date.now() - 2 * 60 * 1000) } },
        { $set: { cronFired: true } }
    );
    console.log('Fixed old reminders:', res);
    process.exit(0);
});
