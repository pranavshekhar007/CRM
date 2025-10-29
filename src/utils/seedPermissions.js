// seedPermissions.js
const mongoose = require("mongoose");
const Permission = require("../model/permission.schema");
require("dotenv").config();

const sidebarModules = [
  { displayName: "Dashboard", module: "dashboard" },
  { displayName: "Users", module: "staff.users" },
  { displayName: "Role", module: "staff.role" },
  { displayName: "Branches", module: "hr.branch" },
  { displayName: "Department", module: "hr.department" },
  { displayName: "Designation", module: "hr.designation" },
  { displayName: "Documents Type", module: "hr.documentType" },
  { displayName: "Employee", module: "hr.employee" },
  { displayName: "Award Types", module: "hr.awardType" },
  { displayName: "Awards", module: "hr.award" },
];

const defaultActions = [
  { name: "create", allowed: true },
  { name: "update", allowed: true },
  { name: "delete", allowed: true },
  { name: "view", allowed: true },
];

async function seed() {
  await mongoose.connect(process.env.DB_STRING);
  console.log("Connected to MongoDB");

  for (const mod of sidebarModules) {
    const exists = await Permission.findOne({ module: mod.module });
    if (!exists) {
      await Permission.create({
        ...mod,
        actions: defaultActions,
        description: `${mod.displayName} permissions`,
      });
      console.log(`✅ Created permission for ${mod.displayName}`);
    } else {
      console.log(`⚠️ Already exists: ${mod.displayName}`);
    }
  }

  mongoose.connection.close();
}

seed().catch((err) => console.error(err));
