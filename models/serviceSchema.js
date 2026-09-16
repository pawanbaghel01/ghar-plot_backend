import mongoose from "mongoose";

const serviceSchema = new mongoose.Schema(
  {
    mainService: { type: String, required: true, unique: true }, // e.g. Cleaning, Plumbing, etc.

    serviceTypes: [
      {
        typeName: { type: String, required: true }, // e.g. Office, Apartment, PG/Hostel, Villa

        // Admin-defined charges
        adminConfig: {
          baseCharges: {
            "1 BHK": { type: Number, default: 0 },
            "2 BHK": { type: Number, default: 0 },
            "3 BHK": { type: Number, default: 0 },
            "4+ BHK": { type: Number, default: 0 },
            Small: { type: Number, default: 0 },
            Medium: { type: Number, default: 0 },
            Large: { type: Number, default: 0 },
            "Single Room": { type: Number, default: 0 },
            "Shared Room": { type: Number, default: 0 },
            "Entire Floor": { type: Number, default: 0 },
          },
          distanceRatePerKm: { type: Number, default: 10 },
        },

        // All user service requests
        requests: [
          {
            userId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },

            propertyDetails: {
              size: String, // Example: "2 BHK", "Medium", "Shared Room"
            },

            address: {
              completeAddress: String,
              city: String,
              pincode: String,
              latitude: Number,
              longitude: Number,
            },

            schedule: {
              date: String,
              timeSlot: String,
            },

            contact: {
              fullName: String,
              phoneNumber: String,
              alternatePhone: String,
              email: String,
              alternateEmail: String,
            },

            specialInstructions: {
              type: String,
              default: "",
            },

            baseCharge: Number,
            distanceCharge: Number,
            totalCharge: Number,
            distanceInKm: Number,

            status: {
              type: String,
              enum: ["pending", "accepted", "completed", "cancelled"],
              default: "pending",
            },

            createdAt: { type: Date, default: Date.now },
          },
        ],
      },
    ],
  },
  { timestamps: true }
);

export default mongoose.model("Service", serviceSchema);
