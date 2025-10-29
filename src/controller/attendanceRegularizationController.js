const express = require("express");
const { sendResponse } = require("../utils/common");
require("dotenv").config();
const AttendanceRegularization = require("../model/attendanceRegularization.schema");
const AttendanceRecord = require("../model/attendanceRecord.schema");
const attendanceRegularizationController = express.Router();
const auth = require("../utils/auth");

// Create Regularization Request
attendanceRegularizationController.post("/create", async (req, res) => {
  try {
    const request = await AttendanceRegularization.create(req.body);

    sendResponse(res, 200, "Success", {
      message: "Attendance regularization request created successfully!",
      data: request,
      statusCode: 200,
    });
  } catch (error) {
    console.error("Create Regularization Error:", error);
    sendResponse(res, 500, "Failed", { message: error.message });
  }
});

// List Requests (with filters, pagination, search)
attendanceRegularizationController.post("/list", async (req, res) => {
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
    if (status) query.status = status;

    if (searchKey) {
      query.$or = [
        { reason: { $regex: searchKey, $options: "i" } },
      ];
    }

    const sortField = sortByField || "createdAt";
    const sortOrder = sortByOrder === "asc" ? 1 : -1;
    const sortOption = { [sortField]: sortOrder };

    const requestList = await AttendanceRegularization.find(query)
      .populate("employee", "fullName employeeId")
      .populate("attendanceRecord")
      .sort(sortOption)
      .limit(parseInt(pageCount))
      .skip((pageNo - 1) * parseInt(pageCount));

    const totalCount = await AttendanceRegularization.countDocuments(query);

    sendResponse(res, 200, "Success", {
      message: "Attendance regularization list retrieved successfully!",
      data: requestList,
      total: totalCount,
      statusCode: 200,
    });
  } catch (error) {
    console.error("List Regularization Error:", error);
    sendResponse(res, 500, "Failed", { message: error.message });
  }
});

// Update Regularization Request
attendanceRegularizationController.put("/update", async (req, res) => {
  try {
    const id = req.body._id;
    const record = await AttendanceRegularization.findById(id);

    if (!record) {
      return sendResponse(res, 404, "Failed", {
        message: "Regularization request not found",
      });
    }

    const updatedRecord = await AttendanceRegularization.findByIdAndUpdate(
      id,
      req.body,
      { new: true }
    );

    sendResponse(res, 200, "Success", {
      message: "Attendance regularization updated successfully!",
      data: updatedRecord,
      statusCode: 200,
    });
  } catch (error) {
    console.error("Update Regularization Error:", error);
    sendResponse(res, 500, "Failed", { message: error.message });
  }
});

// Delete Regularization Request
attendanceRegularizationController.delete("/delete/:id", async (req, res) => {
  try {
    const { id } = req.params;

    const record = await AttendanceRegularization.findById(id);
    if (!record) {
      return sendResponse(res, 404, "Failed", {
        message: "Regularization request not found",
      });
    }

    await AttendanceRegularization.findByIdAndDelete(id);

    sendResponse(res, 200, "Success", {
      message: "Regularization request deleted successfully!",
      statusCode: 200,
    });
  } catch (error) {
    console.error("Delete Regularization Error:", error);
    sendResponse(res, 500, "Failed", { message: error.message });
  }
});

// ✅ Approve/Reject Regularization Request
attendanceRegularizationController.put("/update-status/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!["Approved", "Rejected"].includes(status)) {
      return sendResponse(res, 400, "Failed", {
        message: "Invalid status. Use 'Approved' or 'Rejected'.",
      });
    }

    const record = await AttendanceRegularization.findById(id);
    if (!record) {
      return sendResponse(res, 404, "Failed", {
        message: "Regularization request not found",
      });
    }

    record.status = status;
    await record.save();

    sendResponse(res, 200, "Success", {
      message: `Request ${status.toLowerCase()} successfully!`,
      data: record,
      statusCode: 200,
    });
  } catch (error) {
    console.error("Status Update Error:", error);
    sendResponse(res, 500, "Failed", { message: error.message });
  }
});

attendanceRegularizationController.get("/employee/:employeeId", async (req, res) => {
    try {
      const { employeeId } = req.params;
  
      const attendanceRecords = await AttendanceRecord.find({ employee: employeeId })
        .populate("employee", "name employeeCode")
        .sort({ date: -1 });
  
      sendResponse(res, 200, "Success", {
        message: "Employee attendance records fetched successfully!",
        data: attendanceRecords,
        statusCode: 200,
      });
    } catch (error) {
      console.error("Employee Attendance Fetch Error:", error);
      sendResponse(res, 500, "Failed", { message: error.message });
    }
  });

module.exports = attendanceRegularizationController;
