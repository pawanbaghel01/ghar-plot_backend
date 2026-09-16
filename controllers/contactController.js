import Contact from "../models/contactSchema.js";
import nodemailer from "nodemailer";

// Email validation helper
const isValidEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

// Create new inquiry
export const createContact = async (req, res) => {
    try {
        const { full_name, email_address, phone_number, subject, property_type, budget_range, message } = req.body;

        if (!full_name || !email_address || !phone_number || !subject || !message) {
            return res.status(400).json({ message: "Please fill all required fields." });
        }

        if (!isValidEmail(email_address)) {
            return res.status(400).json({ message: "Invalid email address." });
        }

        const newContact = new Contact({
            full_name,
            email_address,
            phone_number,
            subject,
            property_type,
            budget_range,
            message
        });

        await newContact.save();

        // Optional: send email to admin
        const transporter = nodemailer.createTransport({
            service: "gmail",
            auth: {
                user: process.env.EMAIL_USER,
                pass: process.env.EMAIL_PASS
            }
        });

        const mailOptions = {
            from: email_address,
            to: process.env.ADMIN_EMAIL,
            subject: `New Inquiry: ${subject}`,
            html: `
                <h2>New Contact Inquiry</h2>
                <p><strong>Full Name:</strong> ${full_name}</p>
                <p><strong>Email:</strong> ${email_address}</p>
                <p><strong>Phone:</strong> ${phone_number}</p>
                <p><strong>Subject:</strong> ${subject}</p>
                <p><strong>Property Type:</strong> ${property_type || "N/A"}</p>
                <p><strong>Budget Range:</strong> ${budget_range || "N/A"}</p>
                <p><strong>Message:</strong><br>${message}</p>
            `
        };

        await transporter.sendMail(mailOptions);

        res.status(201).json({ message: "Inquiry submitted successfully!" });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Failed to submit inquiry." });
    }
};

// Get all inquiries (admin)
export const getAllContacts = async (req, res) => {
    try {
        const contacts = await Contact.find().sort({ createdAt: -1 });
        res.status(200).json(contacts);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Failed to fetch inquiries." });
    }
};

// Get inquiries of logged-in user
export const getMyContacts = async (req, res) => {
    try {
        const userEmail = req.user.email;
        const contacts = await Contact.find({ email_address: userEmail }).sort({ createdAt: -1 });

        if (contacts.length === 0) {
            return res.status(404).json({ message: "No inquiries found for this user." });
        }

        res.status(200).json(contacts);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Failed to fetch user inquiries." });
    }
};

// Update inquiry by ID (user can only update their own inquiry)
export const updateContact = async (req, res) => {
    try {
        const { id } = req.params;
        const userEmail = req.user.email; // from token
        const updateData = req.body;

        if (updateData.email_address && updateData.email_address !== userEmail) {
            return res.status(403).json({ message: "You cannot change your email address." });
        }

        if (updateData.email_address && !isValidEmail(updateData.email_address)) {
            return res.status(400).json({ message: "Invalid email address." });
        }

        const contact = await Contact.findById(id);

        if (!contact) {
            return res.status(404).json({ message: "Inquiry not found." });
        }

        if (contact.email_address !== userEmail) {
            return res.status(403).json({ message: "You are not allowed to update this inquiry." });
        }

        const updatedContact = await Contact.findByIdAndUpdate(id, updateData, { new: true });
        res.status(200).json({ message: "Inquiry updated successfully!", updatedContact });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Failed to update inquiry." });
    }
};

// Delete inquiry by ID (user can only delete their own inquiry)
export const deleteContact = async (req, res) => {
    try {
        const { id } = req.params;
        const userEmail = req.user.email;

        const contact = await Contact.findById(id);
        if (!contact) {
            return res.status(404).json({ message: "Inquiry not found." });
        }

        if (contact.email_address !== userEmail) {
            return res.status(403).json({ message: "You are not allowed to delete this inquiry." });
        }

        await Contact.findByIdAndDelete(id);
        res.status(200).json({ message: "Inquiry deleted successfully!" });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Failed to delete inquiry." });
    }
};
