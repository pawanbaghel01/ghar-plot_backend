// import mongoose from "mongoose";

// const propertySchema = new mongoose.Schema({
//   userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
//   propertyLocation: {
//     type: String,
//     required: true,
//   },
//   geoLocation: {
//     type: {
//       type: String,
//       enum: ["Point"],
//       default: "Point",
//     },
//     coordinates: {
//       type: [Number], // [longitude, latitude]
//       default: [0, 0],
//     },
//   },
//   areaDetails: {
//     type: Number,
//     required: true,
//   },
//   availability: {
//     type: String,
//     enum: ["Ready to Move", "Under Construction"],
//     required: true,
//   },
//   price: {
//     type: Number,
//     required: true,
//   },
//   description: {
//     type: String,
//     required: true,
//   },
//   photosAndVideo: {
//     type: [String],
//     default: [],
//   },
//   furnishingStatus: {
//     type: String,
//     enum: ["Furnished", "Semi-Furnished", "Unfurnished"],
//     required: true,
//   },
//   parking: {
//     type: String,
//     enum: ["Available", "Not Available"],
//     required: true,
//   },
//   purpose: {
//     type: String,
//     enum: ["Sell", "Rent/Lease", "Paying Guest"],
//     required: true,
//   },
//   propertyType: {
//     type: String,
//     enum: ["Residential", "Commercial"],
//     required: true,
//   },
//   commercialType: {
//     type: String,
//     enum: ["office", "shop", "warehouse"],
//     required: function () {
//       return this.propertyType === "Commercial";
//     },
//   },
//   residentialType: {
//     type: String,
//     enum: ["apartment", "villa", "plot"],
//     required: function () {
//       return this.propertyType === "Residential";
//     },
//   },
//   contactNumber: {
//     type: String,
//     required: true,
//   },

//   visitCount: {
//     type: Number,
//     default: 0,
//   },
//   visitedBy: [
//     {
//       userId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
//       visitedAt: { type: Date, default: Date.now },
//     },
//   ],

//   postedDate: {
//     type: Date,
//     default: Date.now,
//   },
//   // Sold status
//   isSold: { type: Boolean, default: false },
// });

// // Geospatial index
// propertySchema.index({ geoLocation: "2dsphere" });

// const Property = mongoose.model("Property", propertySchema);
// export default Property;

import mongoose from "mongoose";

const propertySchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User" }, // **CHANGED: Removed 'required: true'**
    adminId: { type: mongoose.Schema.Types.ObjectId, ref: "Admin" }, // **NEW FIELD**
    isPostedByAdmin: { type: Boolean, default: false },
    // Custom ID for tracking (NEW)
    customPropertyId: {
        type: String,
        unique: true, 
        required: true,
    },
    
    // Basic Details
    propertyLocation: { type: String, required: true },
    geoLocation: {
        type: { type: String, enum: ["Point"], default: "Point" },
        coordinates: { type: [Number], default: [0, 0] }, // [longitude, latitude]
    },
    areaDetails: { type: Number, required: true }, // in Sq.Ft

    // Property Size (NEW)
    bedrooms: { 
        type: Number, 
        required: true,
        min: 1, 
    },
    bathrooms: { 
        type: Number, 
        required: true,
        min: 1, 
    },
    balconies: { 
        type: Number, 
        enum: [0, 1, 2, 3],
        required: function () {
            // Plot/Commercial के लिए balcony ज़रूरी नहीं
            return !(this.residentialType === "Plot" || this.propertyType === "Commercial");
        },
    },

    // Building Details (NEW)
    floorNumber: { 
        type: Number, 
        required: function () {
            // Plot के लिए floor ज़रूरी नहीं
            return this.residentialType !== "Plot";
        },
    },
    totalFloors: { 
        type: Number, 
        required: function () {
            // Plot के लिए floor ज़रूरी नहीं
            return this.residentialType !== "Plot";
        },
    },
    
    // Other Details
    facingDirection: { 
        type: String, 
        enum: ["North", "South", "East", "West"], 
        required: true 
    },
    availability: {
        type: String,
        enum: ["Ready to Move", "Under Construction"],
        required: true,
    },
    price: { type: Number, required: true },
    description: { type: String, required: true },
    photosAndVideo: { type: [String], default: [] },
    furnishingStatus: {
        type: String,
        enum: ["Furnished", "Semi-Furnished", "Unfurnished"],
        required: true,
    },
    parking: {
        type: String,
        enum: ["Available", "Not Available"],
        required: true,
    },

    // Purpose-Based Fields
    purpose: {
        type: String,
        enum: ["Sell", "Rent/Lease", "Paying Guest"],
        required: true,
    },
    
    // Rent/Lease & PG Fields (NEW/UPDATED)
    noticePeriod: {
        type: String,
        enum: ["15 Days", "1 Month", "2 Months"],
        required: function () {
            return this.purpose === "Rent/Lease" || this.purpose === "Paying Guest";
        },
    },
    foodIncluded: {
        type: String,
        enum: ["Yes", "No", "Optional"],
        required: function () {
            return this.purpose === "Paying Guest";
        },
    },
    
    // PG Specific Fields (NEW)
    pgType: {
        type: String,
        enum: ["Boys PG", "Girls PG", "Co-living"],
        required: function () {
            return this.purpose === "Paying Guest";
        },
    },
    sharingType: {
        type: String,
        enum: ["Single Room", "Double Sharing", "Triple Sharing"],
        required: function () {
            return this.purpose === "Paying Guest";
        },
    },
    
    // Property Type
    propertyType: {
        type: String,
        enum: ["Residential", "Commercial"],
        required: true,
    },
    commercialType: {
        type: String,
        enum: ["office", "shop", "warehouse"],
        required: function () {
            return this.propertyType === "Commercial";
        },
    },
    residentialType: {
        type: String,
        enum: ["Apartment", "Villa", "Plot"],
        required: function () {
            return this.propertyType === "Residential";
        },
    },

    
    
    // Contact & Stats
    contactNumber: { type: String, required: true },
    visitCount: { type: Number, default: 0 },
    visitedBy: [
        {
            userId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
            visitedAt: { type: Date, default: Date.now },
        },
    ],
    postedDate: { type: Date, default: Date.now },
    isSold: { type: Boolean, default: false },
});

// Geospatial index
propertySchema.index({ geoLocation: "2dsphere" });

const Property = mongoose.model("Property", propertySchema);
export default Property;