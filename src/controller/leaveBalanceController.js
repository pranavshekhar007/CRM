const express = require("express");
const { sendResponse } = require("../utils/common");
require("dotenv").config();
const LeaveBalance = require("../model/leaveBalance.schema");
const leaveBalanceController = express.Router();
const auth = require("../utils/auth");

leaveBalanceController.post("/create", async (req, res) => {
  try {
    const {
      employee,
      leaveType,
      year,
      allocatedDays,
      carriedForwardDays,
      manualAdjustment,
      adjustmentReason,
      adjustmentAmount,
      reasonForAdjustment,
    } = req.body;

    // Optional: Prevent duplicate records for same employee, year, and leave type
    const existingBalance = await LeaveBalance.findOne({
      employee,
      leaveType,
      year,
    });
    if (existingBalance) {
      return sendResponse(res, 400, "Failed", {
        message: "Leave balance already exists for this employee and year",
      });
    }

    const leaveBalance = await LeaveBalance.create({
      employee,
      leaveType,
      year,
      allocatedDays,
      carriedForwardDays,
      manualAdjustment,
      adjustmentReason,
      adjustmentAmount,
      reasonForAdjustment,
    });

    sendResponse(res, 200, "Success", {
      message: "Leave balance created successfully!",
      data: leaveBalance,
      statusCode: 200,
    });
  } catch (error) {
    console.error(error);
    sendResponse(res, 500, "Failed", {
      message: error.message || "Internal server error",
    });
  }
});

leaveBalanceController.post("/list", async (req, res) => {
  try {
    const {
      employee,
      leaveType,
      year,
      searchKey = "",
      pageNo = 1,
      pageCount = 10,
      sortByField,
      sortByOrder,
    } = req.body;

    const query = {};
    if (employee) query.employee = employee;
    if (leaveType) query.leaveType = leaveType;
    if (year) query.year = year;
    if (searchKey) {
      query.$or = [
        { adjustmentReason: { $regex: searchKey, $options: "i" } },
        { reasonForAdjustment: { $regex: searchKey, $options: "i" } },
      ];
    }

    const sortField = sortByField || "createdAt";
    const sortOrder = sortByOrder === "asc" ? 1 : -1;
    const sortOption = { [sortField]: sortOrder };

    const leaveBalances = await LeaveBalance.find(query)
      .populate("employee", "fullName email")
      .populate("leaveType", "leaveType color isPaid")
      .sort(sortOption)
      .limit(parseInt(pageCount))
      .skip((pageNo - 1) * parseInt(pageCount));

    const totalCount = await LeaveBalance.countDocuments(query);

    sendResponse(res, 200, "Success", {
      message: "Leave balances retrieved successfully!",
      data: leaveBalances,
      total: totalCount,
      statusCode: 200,
    });
  } catch (error) {
    console.error(error);
    sendResponse(res, 500, "Failed", {
      message: error.message || "Internal server error",
    });
  }
});

// 🟠 Update Leave Balance
leaveBalanceController.put("/update", async (req, res) => {
  try {
    const id = req.body._id;
    const existing = await LeaveBalance.findById(id);
    if (!existing) {
      return sendResponse(res, 404, "Failed", {
        message: "Leave balance not found",
      });
    }

    const updatedBalance = await LeaveBalance.findByIdAndUpdate(id, req.body, {
      new: true,
    })
      .populate("employee", "name email")
      .populate("leaveType", "leaveType color isPaid");

    sendResponse(res, 200, "Success", {
      message: "Leave balance updated successfully!",
      data: updatedBalance,
      statusCode: 200,
    });
  } catch (error) {
    console.error(error);
    sendResponse(res, 500, "Failed", {
      message: error.message || "Internal server error",
    });
  }
});

leaveBalanceController.delete("/delete/:id", async (req, res) => {
  try {
    const { id } = req.params;

    const existing = await LeaveBalance.findById(id);
    if (!existing) {
      return sendResponse(res, 404, "Failed", {
        message: "Leave balance not found",
      });
    }

    await LeaveBalance.findByIdAndDelete(id);

    sendResponse(res, 200, "Success", {
      message: "Leave balance deleted successfully!",
      statusCode: 200,
    });
  } catch (error) {
    console.error(error);
    sendResponse(res, 500, "Failed", {
      message: error.message || "Internal server error",
    });
  }
});

module.exports = leaveBalanceController;
