require("dotenv").config();
const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { sendResponse } = require("../utils/common");
const auth = require("../utils/auth");
const User = require("../model/user.schema");
const Role = require("../model/role.schema");
const moment = require("moment");
const Attendance = require("../model/attendanceRecord.schema");
const Leave = require("../model/leaveApplication.schema");
const Candidate = require("../model/candidate.schema");
const Department = require("../model/department.schema");
const Announcement = require("../model/announcement.schema");
// const Meeting = require("../model/meeting.schema");
const Employee = require("../model/employee.schema");
const Branch = require("../model/branch.schema");
// const Hiring = require("../model/hiring.schema");

const userController = express.Router();

userController.post("/create", async (req, res) => {
  try {
    const { name, email, phone, password, confirmPassword, role } = req.body;

    if (!name || !email || !password || !confirmPassword || !phone || !role) {
      return sendResponse(res, 422, "Failed", {
        message: "All fields are required",
      });
    }

    if (password !== confirmPassword) {
      return sendResponse(res, 400, "Failed", {
        message: "Passwords do not match",
      });
    }

    const existingUser = await User.findOne({ email });
    if (existingUser)
      return sendResponse(res, 400, "Failed", {
        message: "Email already exists",
      });

    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = await User.create({
      name,
      email,
      phone,
      password: hashedPassword,
      role,
    });

    sendResponse(res, 200, "Success", {
      message: "User created successfully",
      data: newUser,
    });
  } catch (error) {
    console.error(error);
    sendResponse(res, 500, "Failed", { message: error.message });
  }
});

// ✅ Register (Public)
userController.post("/register", async (req, res) => {
  try {
    const { name, email, phone, password, confirmPassword, role } = req.body;

    if (!name || !email || !password || !confirmPassword || !phone) {
      return sendResponse(res, 422, "Failed", {
        message: "All fields are required",
      });
    }

    if (password !== confirmPassword) {
      return sendResponse(res, 400, "Failed", {
        message: "Passwords do not match",
      });
    }

    const existingUser = await User.findOne({ email });
    if (existingUser)
      return sendResponse(res, 400, "Failed", {
        message: "Email already exists",
      });

    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = await User.create({
      name,
      email,
      phone,
      password: hashedPassword,
      role,
    });

    const token = jwt.sign({ id: newUser._id }, process.env.JWT_KEY, {
      expiresIn: "7d",
    });

    sendResponse(res, 200, "Success", {
      message: "User registered successfully",
      data: { ...newUser.toObject(), token },
    });
  } catch (error) {
    console.error(error);
    sendResponse(res, 500, "Failed", { message: error.message });
  }
});

userController.post("/list", async (req, res) => {
  try {
    let {
      searchKey = "",
      role,
      department,
      status,
      pageNo = 1,
      pageCount = 10,
      sortByField = "createdAt",
      sortByOrder = "desc",
    } = req.body;

    // ✅ Fallback for invalid or empty sort field
    if (
      !sortByField ||
      typeof sortByField !== "string" ||
      sortByField.trim() === ""
    ) {
      sortByField = "createdAt";
    }

    // ✅ Build query dynamically
    const query = {};
    if (role) query.role = role;
    if (department) query.department = department;

    // ✅ Only add status if it's explicitly true or false
    if (status === true || status === false) {
      query.status = status;
    } else if (status === "true" || status === "false") {
      query.status = status === "true";
    }

    if (searchKey) {
      query.$or = [
        { name: { $regex: searchKey, $options: "i" } },
        { email: { $regex: searchKey, $options: "i" } },
        { phone: { $regex: searchKey, $options: "i" } },
      ];
    }

    // ✅ Sorting options
    const sortOption = { [sortByField]: sortByOrder === "asc" ? 1 : -1 };

    // ✅ Fetch data with pagination
    const users = await User.find(query)
      .populate("role")
      .sort(sortOption)
      .skip((pageNo - 1) * pageCount)
      .limit(pageCount);

    const totalCount = await User.countDocuments(query);

    sendResponse(res, 200, "Success", {
      message: "User list fetched successfully",
      data: users,
      totalCount,
      pageNo,
      pageCount,
    });
  } catch (error) {
    console.error(error);
    sendResponse(res, 500, "Failed", {
      message: error.message || "Internal server error",
    });
  }
});

// ✅ Update User by ID
userController.put("/update/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { name, email, phone, role, status } = req.body;

    if (!name && !email && !phone && !role && status === undefined) {
      return sendResponse(res, 422, "Failed", {
        message: "At least one field is required to update",
      });
    }

    const updateData = {};

    if (name) updateData.name = name;
    if (email) updateData.email = email;
    if (phone) updateData.phone = phone;
    if (role) updateData.role = role;
    if (status !== undefined) updateData.status = status;

    const updatedUser = await User.findByIdAndUpdate(id, updateData, {
      new: true,
    }).populate("role");

    if (!updatedUser) {
      return sendResponse(res, 404, "Failed", { message: "User not found" });
    }

    sendResponse(res, 200, "Success", {
      message: "User updated successfully",
      data: updatedUser,
    });
  } catch (error) {
    console.error(error);
    sendResponse(res, 500, "Failed", { message: error.message });
  }
});

userController.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password)
      return sendResponse(res, 422, "Failed", {
        message: "Email and password are required",
      });

    const user = await User.findOne({ email }).populate("role");
    if (!user)
      return sendResponse(res, 404, "Failed", { message: "User not found" });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch)
      return sendResponse(res, 401, "Failed", {
        message: "Invalid credentials",
      });

    const token = jwt.sign({ id: user._id }, process.env.JWT_KEY, {
      expiresIn: "7d",
    });

    sendResponse(res, 200, "Success", {
      message: "Login successful",
      data: { ...user.toObject(), token },
    });
  } catch (error) {
    console.error(error);
    sendResponse(res, 500, "Failed", { message: error.message });
  }
});

// ✅ Reset Password
userController.post("/reset-password/:id", auth, async (req, res) => {
  try {
    const { id } = req.params;
    const { newPassword, confirmPassword } = req.body;

    if (!newPassword || !confirmPassword) {
      return sendResponse(res, 422, "Failed", {
        message: "Both new password and confirm password are required",
      });
    }

    if (newPassword !== confirmPassword) {
      return sendResponse(res, 400, "Failed", {
        message: "Passwords do not match",
      });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);

    const updatedUser = await User.findByIdAndUpdate(
      id,
      { password: hashedPassword },
      { new: true }
    );

    if (!updatedUser)
      return sendResponse(res, 404, "Failed", { message: "User not found" });

    sendResponse(res, 200, "Success", {
      message: `Password reset successfully for ${updatedUser.name}`,
    });
  } catch (error) {
    console.error(error);
    sendResponse(res, 500, "Failed", { message: error.message });
  }
});


// ✅ Delete User by ID
userController.delete("/delete/:id", async (req, res) => {
  try {
    const { id } = req.params;

    if (!id) {
      return sendResponse(res, 400, "Failed", {
        message: "User ID is required",
      });
    }

    const deletedUser = await User.findByIdAndDelete(id);

    if (!deletedUser) {
      return sendResponse(res, 404, "Failed", {
        message: "User not found",
      });
    }

    sendResponse(res, 200, "Success", {
      message: "User deleted successfully",
      data: deletedUser,
    });
  } catch (error) {
    console.error(error);
    sendResponse(res, 500, "Failed", {
      message: error.message || "Internal server error",
    });
  }
});




userController.get("/dashboard-details", async (req, res) => {
  try {
    // 1️⃣ Parallel counts
    const [
      totalEmployee,
      totalBranch,
      attendanceRecords,
      pendingLeaves,
      totalCandidate,
      departmentList,
    ] = await Promise.all([
      Employee.countDocuments(),
      Branch.countDocuments(),
      Attendance.find(),
      Leave.countDocuments({ status: "pending" }),
      Candidate.countDocuments(),
      Department.find(),
    ]);

    // 2️⃣ Attendance rate
    const totalAttendance = attendanceRecords.length;
    const presentCount = attendanceRecords.filter(a => a.status === "present").length;
    const attendanceRate = totalAttendance ? ((presentCount / totalAttendance) * 100).toFixed(2) : 0;

    // 3️⃣ Department distribution for chart
    const departmentDistribution = await Employee.aggregate([
      { $group: { _id: "$department", count: { $sum: 1 } } }
    ]);

    // 4️⃣ Last 6 months Hiring Trend
    const sixMonthsAgo = moment().subtract(6, "months").startOf("month").toDate();
    const last6MonthsHiring = await Hiring.aggregate([
      { $match: { createdAt: { $gte: sixMonthsAgo } } },
      { $group: { _id: { $dateToString: { format: "%Y-%m", date: "$createdAt" } }, hires: { $sum: 1 } } },
      { $sort: { _id: 1 } },
    ]);

    // 5️⃣ Candidate status
    const candidateStatus = await Candidate.aggregate([
      { $group: { _id: "$status", count: { $sum: 1 } } }
    ]);

    // 6️⃣ Leave types
    const leaveTypes = await Leave.aggregate([
      { $group: { _id: "$type", count: { $sum: 1 } } }
    ]);

    // 7️⃣ Recent records
    const [recentLeaves, recentCandidates, recentAnnouncements, recentMeetings] = await Promise.all([
      Leave.find().sort({ createdAt: -1 }).limit(5),
      Candidate.find().sort({ createdAt: -1 }).limit(5),
      Announcement.find().sort({ createdAt: -1 }).limit(5),
      Meeting.find().sort({ createdAt: -1 }).limit(5),
    ]);

    // 8️⃣ Employee growth for 2025 (monthly)
    const employeeGrowth = await Employee.aggregate([
      {
        $match: {
          createdAt: {
            $gte: moment("2025-01-01").startOf("year").toDate(),
            $lte: moment("2025-12-31").endOf("year").toDate()
          }
        }
      },
      {
        $group: {
          _id: { $month: "$createdAt" },
          count: { $sum: 1 }
        }
      },
      { $sort: { "_id": 1 } }
    ]);

    // 9️⃣ Send final response
    sendResponse(res, 200, "Success", {
      message: "Dashboard details retrieved successfully",
      data: {
        employees: { totalEmployee, attendanceRate },
        branches: { totalBranch },
        pendingLeaves,
        totalCandidate,
        departmentDistribution,
        last6MonthsHiring,
        candidateStatus,
        leaveTypes,
        recentLeaves,
        recentCandidates,
        recentAnnouncements,
        recentMeetings,
        employeeGrowth2025: employeeGrowth
      },
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



module.exports = userController;
