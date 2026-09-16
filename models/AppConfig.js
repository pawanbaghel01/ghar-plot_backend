import mongoose from "mongoose";

const appConfigSchema = new mongoose.Schema(
  {
    
    platform: {
      type: String,
      enum: ["android", "ios"],
      required: true
    },

    latestVersion: {
      type: String,
      default: "1.0.0"
    },

    storeUrl: {
      type: String,
      default: ""
    }
  },
  { timestamps: true }
);

const AppConfig = mongoose.model("AppConfig", appConfigSchema);

export default AppConfig;