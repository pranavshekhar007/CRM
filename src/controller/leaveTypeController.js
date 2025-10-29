const express = require("express");
const { sendResponse } = require("../utils/common");
require("dotenv").config();
const LeaveType = require("../model/leaveType.schema");
const leaveTypeController = express.Router();
const auth = require("../utils/auth");

leaveTypeController.post("/create", async (req, res) => {
  try {
    const leaveTypeCreated = await LeaveType.create(req.body);

    sendResponse(res, 200, "Success", {
      message: "Leave Type created successfully!",
      data: leaveTypeCreated,
      statusCode: 200,
    });
  } catch (error) {
    console.error(error);
    sendResponse(res, 500, "Failed", {
      message: error.message || "Internal server error",
    });
  }
});

leaveTypeController.post("/list", async (req, res) => {
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
    if (typeof status === "boolean") query.status = status;
    if (searchKey) {
      query.$or = [
        { leaveType: { $regex: searchKey, $options: "i" } },
        { description: { $regex: searchKey, $options: "i" } },
        { color: { $regex: searchKey, $options: "i" } },
      ];
    }

    const sortField = sortByField || "createdAt";
    const sortOrder = sortByOrder === "asc" ? 1 : -1;
    const sortOption = { [sortField]: sortOrder };

    const leaveTypeList = await LeaveType.find(query)
      .sort(sortOption)
      .limit(parseInt(pageCount))
      .skip((pageNo - 1) * parseInt(pageCount));

    const totalCount = await LeaveType.countDocuments(query);

    sendResponse(res, 200, "Success", {
      message: "Leave Type list retrieved successfully!",
      data: leaveTypeList,
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

leaveTypeController.put("/update", async (req, res) => {
  try {
    const id = req.body._id;

    const leaveTypeData = await LeaveType.findById(id);
    if (!leaveTypeData) {
      return sendResponse(res, 404, "Failed", {
        message: "Leave Type not found",
      });
    }

    const updatedLeaveType = await LeaveType.findByIdAndUpdate(id, req.body, {
      new: true,
    });

    sendResponse(res, 200, "Success", {
      message: "Leave Type updated successfully!",
      data: updatedLeaveType,
      statusCode: 200,
    });
  } catch (error) {
    console.error(error);
    sendResponse(res, 500, "Failed", {
      message: error.message || "Internal server error",
    });
  }
});

leaveTypeController.delete("/delete/:id", async (req, res) => {
  try {
    const { id } = req.params;

    const leaveTypeItem = await LeaveType.findById(id);
    if (!leaveTypeItem) {
      return sendResponse(res, 404, "Failed", {
        message: "Leave Type not found",
      });
    }

    await LeaveType.findByIdAndDelete(id);

    sendResponse(res, 200, "Success", {
      message: "Leave Type deleted successfully!",
      statusCode: 200,
    });
  } catch (error) {
    console.error(error);
    sendResponse(res, 500, "Failed", {
      message: error.message || "Internal server error",
    });
  }
});

module.exports = leaveTypeController;
