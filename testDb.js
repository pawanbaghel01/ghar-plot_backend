import mongoose from "mongoose";
import dotenv from "dotenv";
dotenv.config();

mongoose.connect(process.env.MONGO_CONN).then(async () => {
    const Employee = mongoose.model("Employee", new mongoose.Schema({ name: String, adminReminderPopupEnabled: Boolean }, { strict: false, collection: "employees" }));
    const emps = await Employee.find({});
    console.log('Employees popup enabled status:');
    emps.forEach(e => console.log(e.name, e.adminReminderPopupEnabled));
    process.exit(0);
});
