const jwt = require("jsonwebtoken");
const express = require("express");
const { sendResponse } = require("../utils/common");
require("dotenv").config();
const Admin = require("../model/admin.schema");
const bcrypt = require("bcrypt");
const adminController = express.Router();
require("dotenv").config();
const Employee = require("../model/employee.schema");
const LoanCollection = require("../model/loanCollection.schema");
const Profit = require("../model/profit.schema");
const Expense = require("../model/expense.schema");
const Investment = require("../model/investment.schema");
const ReserveFund = require("../model/reserveFund.schema");

// ... (imports remain the same)

adminController.post("/create", async (req, res) => {
  try {
    const { name, email, phone, password, confirmPassword, role } = req.body;

    // 🔹 Validate required fields
    if (!name || !email || !password || !confirmPassword || !phone || !role) {
      return sendResponse(res, 422, "Failed", {
        message: "All fields are required",
      });
    }

    // 🔹 Check password match
    if (password !== confirmPassword) {
      return sendResponse(res, 400, "Failed", {
        message: "Passwords do not match",
      });
    }

    // 🔹 Check existing email in Admin collection
    const existingAdmin = await Admin.findOne({ email });
    if (existingAdmin) {
      return sendResponse(res, 400, "Failed", {
        message: "Email already exists in Admin records",
      });
    }

    // 🔹 Check existing email in Employee collection if it's an employee role
    // NOTE: You'll need to know the specific ObjectId or name of the "Employee Role" to check this.
    // For this example, I'll assume you pass the Role ID for an Employee.
    // **A BETTER IMPLEMENTATION** would involve checking the Role Name/Type by populating the Role, but since we only have the ID here, we'll proceed assuming the Role ID for 'Employee' is known or the check below is sufficient.
    const existingEmployee = await Employee.findOne({ email });
    if (existingEmployee) {
      return sendResponse(res, 400, "Failed", {
        message: "Email already exists in Employee records",
      });
    }

    // 🔹 Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // 🔹 Create new admin
    const newAdmin = await Admin.create({
      name,
      email,
      phone,
      role,
      password: hashedPassword,
      status: true, // Default status for new admin
    });

    // 💾 Conditional Employee Record Creation
    // 💡 IMPORTANT: Replace 'EMPLOYEE_ROLE_ID' with the actual MongoDB ObjectId of your 'Employee' role.
    // Since you didn't provide Role schema or list, this is a necessary placeholder.
    // Alternatively, you could check the Role name after fetching it: const roleData = await Role.findById(role); if (roleData.name === "Employee") { ... }

    // For this demo, let's assume we proceed if the role is *not* an 'Admin' role (which is a rough but common approach).
    // The most robust way is to check the *name* of the role.
    const isEmployeeRole = async (roleId) => {
      // **You will need to fetch the Role model here if it's not imported/defined globally**
      // const Role = require("../model/role.schema"); // Assuming Role is your role model
      // const roleDoc = await Role.findById(roleId);
      // return roleDoc && roleDoc.name.toLowerCase().includes('employee');

      // Since we don't have the Role model here, we'll use a placeholder logic.
      // A common pattern is to check if the role ID is for a non-admin role.
      // This is a **TEMPORARY** solution. A proper solution requires knowing the Role Name/ID.
      return true; // Assume any non-Admin role being created here should be an employee for this example.
    };

    if (await isEmployeeRole(role)) {
      // ⚠️ Simple ID generation. Use a proper sequence generator in production.
      const newEmployeeId = `EMP-${Math.floor(Math.random() * 100000) + 1000}`;

      await Employee.create({
        fullName: name,
        employeeId: newEmployeeId, // Required by Employee schema
        email: email,
        phoneNumber: phone, // Name change from phone to phoneNumber
        password: hashedPassword,
        // The role field in AdminSchema is not directly mapped in EmployeeSchema,
        // but fields like department, designation, etc., are usually required for a real employee.
        // For now, we only store the minimum required fields from the Admin registration.
        employmentStatus: "Active", // Default status as per Employee schema enum
      });
    }

    // 🔹 Generate JWT token
    const token = jwt.sign(
      { id: newAdmin._id, email: newAdmin.email, role: newAdmin.role },
      process.env.JWT_KEY
    );

    // 🔹 Success response
    sendResponse(res, 200, "Success", {
      message: "Admin/Employee registered successfully!",
      data: newAdmin,
      token,
      statusCode: 200,
    });
  } catch (error) {
    console.error(error);
    sendResponse(res, 500, "Failed", {
      message: error.message || "Internal server error",
      statusCode: 500,
    });
  }
});

// ... (remaining adminController endpoints remain the same)

adminController.put("/update/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { name, email, phone, role, status } = req.body;

    // 🔹 Check if at least one field is provided
    if (!name && !email && !phone && !role && status === undefined) {
      return sendResponse(res, 422, "Failed", {
        message: "At least one field is required to update",
      });
    }

    // 🔹 Build update object dynamically
    const updateData = {};
    if (name) updateData.name = name;
    if (email) updateData.email = email;
    if (phone) updateData.phone = phone;
    if (role) updateData.role = role;
    if (status !== undefined) updateData.status = status;

    // 🔹 Update admin
    const updatedAdmin = await Admin.findByIdAndUpdate(id, updateData, {
      new: true,
    }).populate("role");

    if (!updatedAdmin) {
      return sendResponse(res, 404, "Failed", { message: "Admin not found" });
    }

    // 🔹 Success response
    sendResponse(res, 200, "Success", {
      message: "Admin updated successfully!",
      data: updatedAdmin,
      statusCode: 200,
    });
  } catch (error) {
    console.error(error);
    sendResponse(res, 500, "Failed", {
      message: error.message || "Internal server error",
      statusCode: 500,
    });
  }
});

adminController.delete("/delete/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const admin = await Admin.findById(id);
    if (!admin) {
      return sendResponse(res, 404, "Failed", {
        message: "Admin not found",
      });
    }

    await Admin.findByIdAndDelete(id);
    sendResponse(res, 200, "Success", {
      message: "Admin deleted successfully!",
      statusCode: 200,
    });
  } catch (error) {
    console.error(error);
    sendResponse(res, 500, "Failed", {
      message: error.message || "Internal server error",
    });
  }
});

adminController.post("/login", async (req, res) => {
  try {
    const { email, password, deviceId } = req.body;

    // Step 1: Find user and populate deeply
    const user = await Admin.findOne({ email })
      .populate({
        path: "role",
        populate: {
          path: "permissions.permissionId",
          model: "Permission",
        },
      })
      .lean();

    if (!user) {
      return sendResponse(res, 422, "Failed", {
        message: "Invalid Credentials",
      });
    }

    // Step 2: Verify password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return sendResponse(res, 422, "Failed", {
        message: "Invalid Credentials",
      });
    }

    // Step 3: Generate token
    const token = jwt.sign(
      { id: user._id, email: user.email, role: user.role?._id },
      process.env.JWT_KEY
    );

    // Step 4: Update deviceId
    const updatedAdmin = await Admin.findByIdAndUpdate(
      user._id,
      { deviceId },
      { new: true }
    )
      .populate({
        path: "role",
        populate: {
          path: "permissions.permissionId",
          model: "Permission",
        },
      })
      .lean();

    // Step 5: Transform permissions (keep selectedActions from DB)
    const transformedRole = {
      ...updatedAdmin.role,
      permissions: updatedAdmin.role.permissions.map((perm) => ({
        ...perm,
        // ✅ keep real selectedActions if present, fallback to empty []
        selectedActions:
          perm.selectedActions && perm.selectedActions.length
            ? perm.selectedActions
            : perm.actions || [], // if still not present, fallback to actions
        // Optional: remove raw `actions` if not needed
        actions: undefined,
      })),
    };

    // Step 6: Send response
    return sendResponse(res, 200, "Success", {
      message: "User logged in successfully",
      data: {
        ...updatedAdmin,
        role: transformedRole,
      },
      token,
      statusCode: 200,
    });
  } catch (error) {
    console.error(error);
    return sendResponse(res, 500, "Failed", {
      message: error.message || "Internal server error",
      statusCode: 500,
    });
  }
});

adminController.post("/list", async (req, res) => {
  try {
    const {
      searchKey = "",
      status,
      pageNo = 1,
      pageCount = 10,
      sortByField,
      sortByOrder,
    } = req.body;

    const query = {};
    if (status) query.profileStatus = status;
    if (searchKey) {
      query.$or = [
        { firstName: { $regex: searchKey, $options: "i" } },
        { lastName: { $regex: searchKey, $options: "i" } },
        { email: { $regex: searchKey, $options: "i" } },
      ];
    }

    // Construct sorting object
    const sortField = sortByField || "createdAt";
    const sortOrder = sortByOrder === "asc" ? 1 : -1;
    const sortOption = { [sortField]: sortOrder };

    // Fetch the category list
    const adminList = await Admin.find(query)
      .sort(sortOption)
      .limit(parseInt(pageCount))
      .skip(parseInt(pageNo - 1) * parseInt(pageCount))
      .populate({
        path: "role",
      });
    const totalCount = await Admin.countDocuments({});
    sendResponse(res, 200, "Success", {
      message: "Admin list retrieved successfully!",
      data: adminList,
      documentCount: {
        totalCount,
      },
      statusCode: 200,
    });
  } catch (error) {
    console.error(error);
    sendResponse(res, 500, "Failed", {
      message: error.message || "Internal server error",
    });
  }
});

adminController.post("/reset-password", async (req, res) => {
  try {
    const { adminId, newPassword, confirmPassword } = req.body;

    // 🔹 Validation
    if (!adminId || !newPassword || !confirmPassword) {
      return sendResponse(res, 422, "Failed", {
        message: "adminId, newPassword and confirmPassword are required",
        statusCode: 422,
      });
    }

    if (newPassword !== confirmPassword) {
      return sendResponse(res, 422, "Failed", {
        message: "Passwords do not match",
        statusCode: 422,
      });
    }

    // 🔹 Hash the new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // 🔹 Update password
    const updatedAdmin = await Admin.findByIdAndUpdate(
      adminId,
      { password: hashedPassword },
      { new: true }
    );

    if (!updatedAdmin) {
      return sendResponse(res, 404, "Failed", {
        message: "Admin not found",
        statusCode: 404,
      });
    }

    // 🔹 Success response
    sendResponse(res, 200, "Success", {
      message: "Password updated successfully",
      data: { _id: updatedAdmin._id, email: updatedAdmin.email },
      statusCode: 200,
    });
  } catch (error) {
    console.error(error);
    sendResponse(res, 500, "Failed", {
      message: error.message || "Internal server error",
      statusCode: 500,
    });
  }
});

/**
 * 📊 Finance Dashboard Details
 */
adminController.get("/dashboard-details", async (req, res) => {
  try {
    // ✅ Fetch everything in parallel
    const [loans, profits, expenses, investments, reserveFunds] =
      await Promise.all([
        LoanCollection.find().lean(),
        Profit.find().lean(),
        Expense.find().lean(),
        Investment.find().lean(),
        ReserveFund.find().lean(),
      ]);

    // ========== 1️⃣ USER METRICS (CUSTOMERS) ==========
    const uniqueUsers = new Set(loans.map((l) => l.name?.trim().toLowerCase()))
      .size;
    const totalLoans = loans.length;
    const totalLoanAmount = loans.reduce(
      (acc, l) => acc + (l.loanAmount || 0),
      0
    );
    const totalGivenAmount = loans.reduce(
      (acc, l) => acc + (l.givenAmount || 0),
      0
    );
    const totalRemainingLoan = loans.reduce(
      (acc, l) => acc + (l.remainingLoan || 0),
      0
    );

    // ========== 2️⃣ PROFIT METRICS ==========
    const manualProfitTotal = profits.reduce(
      (acc, p) => acc + (p.amount || 0),
      0
    );
    const autoLoanProfit = loans.reduce(
      (acc, l) => acc + ((l.loanAmount || 0) - (l.givenAmount || 0)),
      0
    );
    const totalProfit = manualProfitTotal + autoLoanProfit;

    // ========== 3️⃣ EXPENSE METRICS ==========
    const totalExpense = expenses.reduce((acc, e) => acc + (e.amount || 0), 0);

    // ========== 4️⃣ INVESTMENT METRICS ==========
    const totalInvestment = investments.reduce(
      (acc, i) => acc + (i.amount || 0),
      0
    );

    // ========== 5️⃣ RESERVE FUND METRICS ==========
    const totalReserveFund = reserveFunds.reduce(
      (acc, f) => acc + (f.amount || 0),
      0
    );

    // ========== 6️⃣ DAILY TREND COMBINED ==========
    const dailyTrend = {};

    // Add from profits
    profits.forEach((p) => {
      const dateKey = new Date(p.date).toISOString().split("T")[0];
      if (!dailyTrend[dateKey])
        dailyTrend[dateKey] = {
          profit: 0,
          expense: 0,
          investment: 0,
          reserveFund: 0,
        };
      dailyTrend[dateKey].profit += Number(p.amount || 0);
    });

    // Add from loans (auto profit)
    loans.forEach((l) => {
      const dateKey = new Date(l.createdAt).toISOString().split("T")[0];
      const profit = (l.loanAmount || 0) - (l.givenAmount || 0);
      if (!dailyTrend[dateKey])
        dailyTrend[dateKey] = {
          profit: 0,
          expense: 0,
          investment: 0,
          reserveFund: 0,
        };
      dailyTrend[dateKey].profit += profit;
    });

    // Add from expense
    expenses.forEach((e) => {
      const dateKey = new Date(e.date).toISOString().split("T")[0];
      if (!dailyTrend[dateKey])
        dailyTrend[dateKey] = {
          profit: 0,
          expense: 0,
          investment: 0,
          reserveFund: 0,
        };
      dailyTrend[dateKey].expense += Number(e.amount || 0);
    });

    // Add from investment
    investments.forEach((i) => {
      const dateKey = new Date(i.date).toISOString().split("T")[0];
      if (!dailyTrend[dateKey])
        dailyTrend[dateKey] = {
          profit: 0,
          expense: 0,
          investment: 0,
          reserveFund: 0,
        };
      dailyTrend[dateKey].investment += Number(i.amount || 0);
    });

    // Add from reserve fund
    reserveFunds.forEach((f) => {
      const dateKey = new Date(f.date).toISOString().split("T")[0];
      if (!dailyTrend[dateKey])
        dailyTrend[dateKey] = {
          profit: 0,
          expense: 0,
          investment: 0,
          reserveFund: 0,
        };
      dailyTrend[dateKey].reserveFund += Number(f.amount || 0);
    });

    const dailyTrendArray = Object.entries(dailyTrend)
      .sort(([a], [b]) => new Date(a) - new Date(b))
      .map(([date, values]) => ({ date, ...values }));

    // ========== 7️⃣ FINAL DASHBOARD SUMMARY ==========
    const dashboardSummary = {
      users: {
        totalUsers: uniqueUsers,
        totalLoans,
        totalLoanAmount,
        totalGivenAmount,
        totalRemainingLoan,
      },
      finance: {
        totalProfit,
        manualProfit: manualProfitTotal,
        loanProfit: autoLoanProfit,
        totalExpense,
        totalInvestment,
        totalReserveFund,
      },
      dailyTrend: dailyTrendArray,
    };

    sendResponse(res, 200, "Success", {
      message: "Finance dashboard data fetched successfully!",
      data: dashboardSummary,
    });
  } catch (error) {
    console.error("Dashboard details error:", error);
    sendResponse(res, 500, "Failed", { message: error.message });
  }
});

module.exports = adminController;

module.exports = adminController;
