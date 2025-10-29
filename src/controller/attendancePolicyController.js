const express = require("express");
const { sendResponse } = require("../utils/common");
require("dotenv").config();
const AttendancePolicy = require("../model/attendancePolicy.schema");
const attendancePolicyController = express.Router();
const auth = require("../utils/auth");

// Create Attendance Policy
attendancePolicyController.post("/create", async (req, res) => {
  try {
    const policyCreated = await AttendancePolicy.create(req.body);

    sendResponse(res, 200, "Success", {
      message: "Attendance Policy created successfully!",
      data: policyCreated,
      statusCode: 200,
    });
  } catch (error) {
    console.error("Attendance Policy Create Error:", error);
    sendResponse(res, 500, "Failed", { message: error.message });
  }
});

// List Attendance Policies (with search, pagination, sort)
attendancePolicyController.post("/list", async (req, res) => {
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
    if (status !== undefined) query.status = status;
    if (searchKey) {
      query.$or = [
        { name: { $regex: searchKey, $options: "i" } },
        { description: { $regex: searchKey, $options: "i" } },
      ];
    }

    const sortField = sortByField || "createdAt";
    const sortOrder = sortByOrder === "asc" ? 1 : -1;
    const sortOption = { [sortField]: sortOrder };

    const policyList = await AttendancePolicy.find(query)
      .sort(sortOption)
      .limit(parseInt(pageCount))
      .skip((pageNo - 1) * parseInt(pageCount));

    const totalCount = await AttendancePolicy.countDocuments(query);

    sendResponse(res, 200, "Success", {
      message: "Attendance Policy list retrieved successfully!",
      data: policyList,
      total: totalCount,
      statusCode: 200,
    });
  } catch (error) {
    console.error("Attendance Policy List Error:", error);
    sendResponse(res, 500, "Failed", { message: error.message });
  }
});

// Update Attendance Policy
attendancePolicyController.put("/update", async (req, res) => {
  try {
    const id = req.body._id;
    const policyData = await AttendancePolicy.findById(id);

    if (!policyData) {
      return sendResponse(res, 404, "Failed", { message: "Policy not found" });
    }

    const updatedPolicy = await AttendancePolicy.findByIdAndUpdate(id, req.body, { new: true });

    sendResponse(res, 200, "Success", {
      message: "Attendance Policy updated successfully!",
      data: updatedPolicy,
      statusCode: 200,
    });
  } catch (error) {
    console.error("Attendance Policy Update Error:", error);
    sendResponse(res, 500, "Failed", { message: error.message });
  }
});

// Delete Attendance Policy
attendancePolicyController.delete("/delete/:id", async (req, res) => {
  try {
    const { id } = req.params;

    const policyItem = await AttendancePolicy.findById(id);
    if (!policyItem) {
      return sendResponse(res, 404, "Failed", { message: "Policy not found" });
    }

    await AttendancePolicy.findByIdAndDelete(id);

    sendResponse(res, 200, "Success", {
      message: "Attendance Policy deleted successfully!",
      statusCode: 200,
    });
  } catch (error) {
    console.error("Attendance Policy Delete Error:", error);
    sendResponse(res, 500, "Failed", { message: error.message });
  }
});

module.exports = attendancePolicyController;
