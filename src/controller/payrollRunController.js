const express = require("express");
const { sendResponse } = require("../utils/common");
const PayrollRun = require("../model/payrollRun.schema");
require("dotenv").config();

const payrollRunController = express.Router();

// ✅ Create Payroll Run
payrollRunController.post("/create", async (req, res) => {
  try {
    const payrollRun = await PayrollRun.create(req.body);
    sendResponse(res, 200, "Success", {
      message: "Payroll run created successfully!",
      data: payrollRun,
      statusCode: 200,
    });
  } catch (error) {
    sendResponse(res, 500, "Failed", { message: error.message });
  }
});

// ✅ List Payroll Runs
payrollRunController.post("/list", async (req, res) => {
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
    if (searchKey) query.title = { $regex: searchKey, $options: "i" };

    const sortField = sortByField || "createdAt";
    const sortOrder = sortByOrder === "asc" ? 1 : -1;

    const payrollList = await PayrollRun.find(query)
      .sort({ [sortField]: sortOrder })
      .limit(parseInt(pageCount))
      .skip((pageNo - 1) * parseInt(pageCount));

    const totalCount = await PayrollRun.countDocuments(query);

    sendResponse(res, 200, "Success", {
      message: "Payroll run list fetched successfully!",
      data: payrollList,
      total: totalCount,
      statusCode: 200,
    });
  } catch (error) {
    sendResponse(res, 500, "Failed", { message: error.message });
  }
});

// ✅ Update Payroll Run
payrollRunController.put("/update/:id", async (req, res) => {
  try {
    const { id } = req.params;

    const payroll = await PayrollRun.findById(id);
    if (!payroll)
      return sendResponse(res, 404, "Failed", { message: "Payroll run not found" });

    const updatedPayroll = await PayrollRun.findByIdAndUpdate(id, req.body, {
      new: true,
    });

    sendResponse(res, 200, "Success", {
      message: "Payroll run updated successfully!",
      data: updatedPayroll,
      statusCode: 200,
    });
  } catch (error) {
    sendResponse(res, 500, "Failed", { message: error.message });
  }
});

// ✅ Delete Payroll Run
payrollRunController.delete("/delete/:id", async (req, res) => {
  try {
    const { id } = req.params;

    const payroll = await PayrollRun.findById(id);
    if (!payroll)
      return sendResponse(res, 404, "Failed", { message: "Payroll run not found" });

    await PayrollRun.findByIdAndDelete(id);

    sendResponse(res, 200, "Success", {
      message: "Payroll run deleted successfully!",
      statusCode: 200,
    });
  } catch (error) {
    sendResponse(res, 500, "Failed", { message: error.message });
  }
});

// ✅ Update Payroll Run Status
payrollRunController.put("/status/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const payroll = await PayrollRun.findById(id);
    if (!payroll)
      return sendResponse(res, 404, "Failed", { message: "Payroll run not found" });

    payroll.status = status;
    const updated = await payroll.save();

    sendResponse(res, 200, "Success", {
      message: "Payroll run status updated successfully!",
      data: updated,
      statusCode: 200,
    });
  } catch (error) {
    sendResponse(res, 500, "Failed", { message: error.message });
  }
});

module.exports = payrollRunController;
