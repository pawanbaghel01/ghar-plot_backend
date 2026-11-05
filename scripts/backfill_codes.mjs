import mongoose from "mongoose";
import dotenv from "dotenv";
dotenv.config();

import User from "../models/user.js";
import Employee from "../models/employeeSchema.js";
import Property from "../models/addProps.js";
import Counter from "../models/counterSchema.js";

async function backfill() {
  try {
    await mongoose.connect(process.env.MONGO_CONN);
    console.log("Connected to MongoDB");

    // 1. Backfill Users with clientCode
    const users = await User.find().sort({ createdAt: 1 });
    console.log(`Found ${users.length} users to check/backfill.`);

    let clientIndex = 1;
    for (const user of users) {
      const code = `CL${String(clientIndex).padStart(2, "0")}`;
      await User.findByIdAndUpdate(user._id, { clientCode: code });
      console.log(`Assigned ${code} to user ${user.fullName || user.email}`);
      clientIndex++;
    }

    // Set client counter in Counter collection
    const clientCount = users.length;
    await Counter.findOneAndUpdate(
      { name: "client" },
      { $set: { seq: clientCount } },
      { upsert: true, new: true }
    );
    console.log(`Counter for 'client' set to ${clientCount}`);

    // 2. Backfill Employees with employeeCode
    const employees = await Employee.find().sort({ createdAt: 1 });
    console.log(`Found ${employees.length} employees to check/backfill.`);

    let empIndex = 1;
    for (const emp of employees) {
      const code = `EMP${String(empIndex).padStart(2, "0")}`;
      await Employee.findByIdAndUpdate(emp._id, { employeeCode: code });
      console.log(`Assigned ${code} to employee ${emp.name}`);
      empIndex++;
    }

    // Set employee counter in Counter collection
    const empCount = employees.length;
    await Counter.findOneAndUpdate(
      { name: "employee" },
      { $set: { seq: empCount } },
      { upsert: true, new: true }
    );
    console.log(`Counter for 'employee' set to ${empCount}`);

    // 3. Properties - align customPropertyId for users
    for (let i = 0; i < users.length; i++) {
      const u = users[i];
      const clientCode = `CL${String(i + 1).padStart(2, "0")}`;
      const userProps = await Property.find({ userId: u._id }).sort({ createdAt: 1 });
      let pIndex = 1;
      for (const prop of userProps) {
        const expectedId = `${clientCode}P${pIndex}`;
        console.log(`Updating property ${prop._id} from ${prop.customPropertyId} to ${expectedId}`);
        await Property.findByIdAndUpdate(prop._id, { customPropertyId: expectedId });
        pIndex++;
      }
      await User.findByIdAndUpdate(u._id, { myListingsCount: userProps.length });
    }

    console.log("Migration and backfill completed successfully!");
    process.exit(0);
  } catch (error) {
    console.error("Migration error:", error);
    process.exit(1);
  }
}

backfill();
