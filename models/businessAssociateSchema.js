import mongoose from "mongoose";

const PAYMENT_TYPES = [
  "Cash",
  "Credit",
  "Paytm",
  "Googlepay",
  "Phonepay",
  "Online Transfer",
  "Adjustment",
  "Product Upsell",
];

// Sub-schema for each transaction entry (supports "Add More" rows)
const transactionEntrySchema = new mongoose.Schema(
  {
    receivedFrom: {
      type: String,
      required: true,
      trim: true,
    },
    receivedAmount: {
      type: Number,
      required: true,
      min: [0, "Received amount cannot be negative"],
    },
    type: {
      type: String,
      enum: PAYMENT_TYPES,
      required: true,
    },
    date: {
      type: Date,
      required: true,
    },
  },
  { _id: true }
);

const businessAssociateSchema = new mongoose.Schema(
  {
    // Link to Employee who is the Business Associate
    employee: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Employee",
      required: true,
    },

    // Opening Balance for this associate's ledger entry
    openingBalance: {
      type: Number,
      default: 0,
      min: [0, "Opening balance cannot be negative"],
    },

    // Date of the ledger/transaction record
    date: {
      type: Date,
      required: true,
    },

    // Multiple transaction rows (from "Add More" feature)
    transactions: {
      type: [transactionEntrySchema],
      default: [],
    },

    // Computed running balance (openingBalance + sum of receivedAmount)
    totalReceived: {
      type: Number,
      default: 0,
    },

    // Who created this record
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Employee",
      required: false,
    },

    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true, // adds createdAt and updatedAt automatically
  }
);

// Auto-calculate totalReceived before saving
businessAssociateSchema.pre("save", function (next) {
  this.totalReceived =
    this.transactions.reduce((sum, t) => sum + (t.receivedAmount || 0), 0) +
    (this.openingBalance || 0);
  next();
});

// Indexes for common queries
businessAssociateSchema.index({ employee: 1 });
businessAssociateSchema.index({ date: -1 });
businessAssociateSchema.index({ employee: 1, date: -1 });

const BusinessAssociate = mongoose.model(
  "BusinessAssociate",
  businessAssociateSchema
);

export default BusinessAssociate;
