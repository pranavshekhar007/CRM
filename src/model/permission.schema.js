const mongoose = require("mongoose");

const defaultActions = [
    "create",
    "update",
    "delete",
    "view",
  ];
  

const permissionSchema = new mongoose.Schema(
  {
    module: {
      type: String,
      required: true,
      trim: true,
    },
    actions: {
        type: [String],
        default: defaultActions,
      },
    description: {
      type: String,
      trim: true,
    },
  },
  { timestamps: true }
);

const Permission = mongoose.model("Permission", permissionSchema);

module.exports = Permission;
