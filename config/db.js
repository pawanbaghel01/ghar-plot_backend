import mongoose from "mongoose";
import 'dotenv/config';

const mongo_url = process.env.MONGO_CONN;

const connectdb = async () => {
  try {
    await mongoose.connect(mongo_url, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    console.log("MongoDB connected...");
  } catch (err) {
    console.error("MongoDB connection error:", err);
    process.exit(1); // stop server if not connected
  }
};

export default connectdb;
