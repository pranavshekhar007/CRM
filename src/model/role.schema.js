const mongoose = require("mongoose");

const roleSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      unique: true,
    },
    permissions: [
      {
        permissionId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Permission",
          required: true,
        },
        actions: [
          {
            type: String,
            trim: true,
          },
        ],
      },
    ],
    description: {
      type: String,
      trim: true,
    },
  },
  { timestamps: true }
);

const Role = mongoose.model("Role", roleSchema);

module.exports = Role;
