import mongoose from "mongoose";

const expenseSchema = new mongoose.Schema(
  {
    project: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Project",
      required: true,
    },
    client: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Client",
      required: false,
    },
    businessAssociate: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Employee",
      required: true,
    },
    category: {
      type: String,
      required: true,
      trim: true,
    },
    itemName: {
      type: String,
      trim: true,
      default: "",
    },
    quantity: {
      type: Number,
      default: 1,
    },
    unit: {
      type: String,
      trim: true,
      default: "Pcs",
    },
    unitPrice: {
      type: Number,
      default: 0,
    },
    amount: {
      type: Number,
      required: true,
      min: 0,
    },
    paidTo: {
      type: String,
      required: true,
      trim: true,
    },
    date: {
      type: Date,
      required: true,
    },
    paymentType: {
      type: String,
      required: true,
      enum: [
        "Cash",
        "Credit",
        "Paytm",
        "Googlepay",
        "Phonepay",
        "Online Transfer",
        "Adjustment",
        "Product Upsell",
      ],
      default: "Cash",
    },
    remarks: {
      type: String,
      trim: true,
      default: "",
    },
    receiptImage: {
      type: String,
      default: "",
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Employee",
      required: false,
    },
  },
  { timestamps: true }
);

// Indexes for fast lookup & reporting
expenseSchema.index({ businessAssociate: 1, date: -1 });
expenseSchema.index({ project: 1 });
expenseSchema.index({ client: 1 });
expenseSchema.index({ category: 1 });
expenseSchema.index({ date: -1 });

export default mongoose.model("Expense", expenseSchema);
