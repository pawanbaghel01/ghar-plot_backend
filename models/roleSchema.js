import mongoose from "mongoose";

const roleSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  description: {
    type: String,
    required: false,
    trim: true
  },
  permissions: [{
    module: {
      type: String,
      required: true,
      enum: [
        'dashboard',
        'properties',
        'users',
        'categories',
        'recent',
        'bought-property',
        'settings',
        'security',
        'reports-complaints',
        'service-management',
        'enquiries',
        'roles',
        'employees',
        'employee_reports',
        'reports'      ]
    },
    actions: [{
      type: String,
    //   enum: ['create', 'read', 'update', 'delete']
     enum: ['create', 'read', 'update', 'delete', 'assign']
    }]
  }],
  isActive: {
    type: Boolean,
    default: true
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: false
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Update timestamp on save
roleSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

const Role = mongoose.model('Role', roleSchema);

export default Role;