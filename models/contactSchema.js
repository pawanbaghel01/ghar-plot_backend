import mongoose from "mongoose";

const contactSchema = new mongoose.Schema(
    {
        full_name: { type: String, required: true },
        email_address: { type: String, required: true },
        phone_number: { type: String, required: true },
        subject: { type: String, required: true },
        property_type: { type: String, default: null },
        budget_range: { type: String, default: null },
        message: { type: String, required: true }
    },
    { timestamps: true } // Adds createdAt and updatedAt automatically
);

export default mongoose.model("contact", contactSchema);
