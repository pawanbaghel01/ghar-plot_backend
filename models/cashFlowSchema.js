import mongoose from "mongoose";

const receivedEntrySchema = new mongoose.Schema(
  {
    receivedFrom: {
      type: String,
      required: true,
      trim: true,
    },
    receivedAmount: {
      type: Number,
      required: true,
      min: 0,
    },
    type: {
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
    },
  },
  { _id: false }
);

const cashFlowSchema = new mongoose.Schema({
  businessAssociate: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Employee",
    required: true,
  },
  date: {
    type: Date,
    required: true,
  },
  openingBalance: {
    type: Number,
    required: true,
    default: 0,
  },
  entries: {
    type: [receivedEntrySchema],
    default: [],
  },
  totalReceived: {
    type: Number,
    default: 0,
  },
  totalExpense: {
    type: Number,
    default: 0,
  },
  closingBalance: {
    type: Number,
    default: 0,
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Employee",
    required: false,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
});

// Auto-calculate totalReceived and closingBalance before save
cashFlowSchema.pre("save", function (next) {
  this.updatedAt = Date.now();

  this.totalReceived = this.entries.reduce(
    (sum, entry) => sum + (entry.receivedAmount || 0),
    0
  );

  this.closingBalance =
    (this.openingBalance || 0) +
    this.totalReceived -
    (this.totalExpense || 0);

  next();
});

// Indexes
cashFlowSchema.index({ businessAssociate: 1 });
cashFlowSchema.index({ date: -1 });
cashFlowSchema.index({ businessAssociate: 1, date: -1 });

const CashFlow = mongoose.model("CashFlow", cashFlowSchema);

export default CashFlow;
