const express = require("express");
const { sendResponse } = require("../utils/common");
require("dotenv").config();
const Payroll = require("../model/payroll.schema");
const payrollController = express.Router();
const auth = require("../utils/auth");

payrollController.post("/create", async (req, res) => {
  try {
    const payrollCreated = await Payroll.create(req.body);

    sendResponse(res, 200, "Success", {
      message: "Payroll record created successfully!",
      data: payrollCreated,
      statusCode: 200,
    });
  } catch (error) {
    console.error(error);
    sendResponse(res, 500, "Failed", { message: error.message || "Internal server error" });
  }
});

payrollController.post("/list", async (req, res) => {
  try {
    const {
      userId,
      month,
      paymentStatus,
      pageNo = 1,
      pageCount = 10,
      sortByField,
      sortByOrder,
    } = req.body;

    const query = {};
    if (userId) query.userId = userId;
    if (month) query.month = month;
    if (paymentStatus) query.paymentStatus = paymentStatus;

    const sortField = sortByField || "createdAt";
    const sortOrder = sortByOrder === "asc" ? 1 : -1;
    const sortOption = { [sortField]: sortOrder };

    const payrollList = await Payroll.find(query)
      .populate("userId")
      .sort(sortOption)
      .limit(parseInt(pageCount))
      .skip((pageNo - 1) * parseInt(pageCount));

    const totalCount = await Payroll.countDocuments(query);

    sendResponse(res, 200, "Success", {
      message: "Payroll list retrieved successfully!",
      data: payrollList,
      total: totalCount,
      statusCode: 200,
    });
  } catch (error) {
    console.error(error);
    sendResponse(res, 500, "Failed", { message: error.message || "Internal server error" });
  }
});

payrollController.put("/update", async (req, res) => {
  try {
    const id = req.body._id;
    const payrollData = await Payroll.findById(id);
    if (!payrollData) return sendResponse(res, 404, "Failed", { message: "Payroll record not found" });

    const updatedPayroll = await Payroll.findByIdAndUpdate(id, req.body, { new: true });

    sendResponse(res, 200, "Success", {
      message: "Payroll record updated successfully!",
      data: updatedPayroll,
      statusCode: 200,
    });
  } catch (error) {
    console.error(error);
    sendResponse(res, 500, "Failed", { message: error.message || "Internal server error" });
  }
});

payrollController.delete("/delete/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const payrollItem = await Payroll.findById(id);
    if (!payrollItem) return sendResponse(res, 404, "Failed", { message: "Payroll record not found" });

    await Payroll.findByIdAndDelete(id);

    sendResponse(res, 200, "Success", {
      message: "Payroll record deleted successfully!",
      statusCode: 200,
    });
  } catch (error) {
    console.error(error);
    sendResponse(res, 500, "Failed", { message: error.message || "Internal server error" });
  }
});

module.exports = payrollController;
