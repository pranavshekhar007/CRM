const express = require("express");
const { sendResponse } = require("../utils/common");
const EmployeeSalary = require("../model/employeeSalary.schema");
require("dotenv").config();

const employeeSalaryController = express.Router();

// ✅ Create Employee Salary
employeeSalaryController.post("/create", async (req, res) => {
  try {
    const salary = await EmployeeSalary.create(req.body);
    sendResponse(res, 200, "Success", {
      message: "Employee salary record created successfully!",
      data: salary,
      statusCode: 200,
    });
  } catch (error) {
    sendResponse(res, 500, "Failed", { message: error.message });
  }
});

// ✅ List Employee Salaries (with pagination, search, filter)
employeeSalaryController.post("/list", async (req, res) => {
  try {
    const {
      searchKey = "",
      isActive,
      pageNo = 1,
      pageCount = 10,
      sortByField,
      sortByOrder,
    } = req.body;

    const query = {};

    if (isActive !== undefined) query.isActive = isActive;

    if (searchKey) {
      query.$or = [
        { notes: { $regex: searchKey, $options: "i" } },
      ];
    }

    const sortField = sortByField || "createdAt";
    const sortOrder = sortByOrder === "asc" ? 1 : -1;

    const data = await EmployeeSalary.find(query)
      .populate("employee", "fullName employeeCode department")
      .populate("salaryComponents", "componentName type calculationType fixedAmount percentageOfBasic")
      .sort({ [sortField]: sortOrder })
      .skip((pageNo - 1) * parseInt(pageCount))
      .limit(parseInt(pageCount));

    const totalCount = await EmployeeSalary.countDocuments(query);

    sendResponse(res, 200, "Success", {
      message: "Employee salary list fetched successfully!",
      data,
      total: totalCount,
      statusCode: 200,
    });
  } catch (error) {
    sendResponse(res, 500, "Failed", { message: error.message });
  }
});

// ✅ Update Employee Salary
employeeSalaryController.put("/update/:id", async (req, res) => {
  try {
    const { id } = req.params;

    const salary = await EmployeeSalary.findById(id);
    if (!salary)
      return sendResponse(res, 404, "Failed", { message: "Salary record not found" });

    const updatedSalary = await EmployeeSalary.findByIdAndUpdate(id, req.body, {
      new: true,
    });

    sendResponse(res, 200, "Success", {
      message: "Employee salary record updated successfully!",
      data: updatedSalary,
      statusCode: 200,
    });
  } catch (error) {
    sendResponse(res, 500, "Failed", { message: error.message });
  }
});

// ✅ Delete Employee Salary Record
employeeSalaryController.delete("/delete/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const salary = await EmployeeSalary.findById(id);

    if (!salary)
      return sendResponse(res, 404, "Failed", { message: "Salary record not found" });

    await EmployeeSalary.findByIdAndDelete(id);

    sendResponse(res, 200, "Success", {
      message: "Employee salary record deleted successfully!",
      statusCode: 200,
    });
  } catch (error) {
    sendResponse(res, 500, "Failed", { message: error.message });
  }
});

// ✅ Change Active Status
employeeSalaryController.put("/change-status/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { isActive } = req.body;

    const salary = await EmployeeSalary.findById(id);
    if (!salary)
      return sendResponse(res, 404, "Failed", { message: "Salary record not found" });

    salary.isActive = isActive;
    const updated = await salary.save();

    sendResponse(res, 200, "Success", {
      message: "Employee salary status updated successfully!",
      data: updated,
      statusCode: 200,
    });
  } catch (error) {
    sendResponse(res, 500, "Failed", { message: error.message });
  }
});

module.exports = employeeSalaryController;
