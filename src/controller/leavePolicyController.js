const express = require("express");
const { sendResponse } = require("../utils/common");
require("dotenv").config();
const LeavePolicy = require("../model/leavePolicy.schema");
const leavePolicyController = express.Router();
const auth = require("../utils/auth");

leavePolicyController.post("/create", async (req, res) => {
  try {
    const leavePolicyCreated = await LeavePolicy.create(req.body);

    sendResponse(res, 200, "Success", {
      message: "Leave Policy created successfully!",
      data: leavePolicyCreated,
      statusCode: 200,
    });
  } catch (error) {
    console.error(error);
    sendResponse(res, 500, "Failed", {
      message: error.message || "Internal server error",
    });
  }
});

leavePolicyController.post("/list", async (req, res) => {
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
        { name: { $regex: searchKey, $options: "i" } },
        { description: { $regex: searchKey, $options: "i" } },
        { accuralType: { $regex: searchKey, $options: "i" } },
      ];
    }

    const sortField = sortByField || "createdAt";
    const sortOrder = sortByOrder === "asc" ? 1 : -1;
    const sortOption = { [sortField]: sortOrder };

    const leavePolicyList = await LeavePolicy.find(query)
      .populate("leaveType", "leaveType color isPaid")
      .sort(sortOption)
      .limit(parseInt(pageCount))
      .skip((pageNo - 1) * parseInt(pageCount));

    const totalCount = await LeavePolicy.countDocuments(query);

    sendResponse(res, 200, "Success", {
      message: "Leave Policy list retrieved successfully!",
      data: leavePolicyList,
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

leavePolicyController.put("/update", async (req, res) => {
  try {
    const id = req.body._id;

    const leavePolicyData = await LeavePolicy.findById(id);
    if (!leavePolicyData) {
      return sendResponse(res, 404, "Failed", {
        message: "Leave Policy not found",
      });
    }

    const updatedLeavePolicy = await LeavePolicy.findByIdAndUpdate(id, req.body, {
      new: true,
    }).populate("leaveType", "leaveType color isPaid");

    sendResponse(res, 200, "Success", {
      message: "Leave Policy updated successfully!",
      data: updatedLeavePolicy,
      statusCode: 200,
    });
  } catch (error) {
    console.error(error);
    sendResponse(res, 500, "Failed", {
      message: error.message || "Internal server error",
    });
  }
});

leavePolicyController.delete("/delete/:id", async (req, res) => {
  try {
    const { id } = req.params;

    const leavePolicyItem = await LeavePolicy.findById(id);
    if (!leavePolicyItem) {
      return sendResponse(res, 404, "Failed", {
        message: "Leave Policy not found",
      });
    }

    await LeavePolicy.findByIdAndDelete(id);

    sendResponse(res, 200, "Success", {
      message: "Leave Policy deleted successfully!",
      statusCode: 200,
    });
  } catch (error) {
    console.error(error);
    sendResponse(res, 500, "Failed", {
      message: error.message || "Internal server error",
    });
  }
});

module.exports = leavePolicyController;
