const express = require("express");
const { sendResponse } = require("../utils/common");
const SalaryComponent = require("../model/salaryComponent.schema");
require("dotenv").config();

const salaryComponentController = express.Router();

// ✅ Create Salary Component
salaryComponentController.post("/create", async (req, res) => {
  try {
    const createdComponent = await SalaryComponent.create(req.body);
    sendResponse(res, 200, "Success", {
      message: "Salary component created successfully!",
      data: createdComponent,
      statusCode: 200,
    });
  } catch (error) {
    sendResponse(res, 500, "Failed", { message: error.message });
  }
});

// ✅ List Salary Components (with filters & pagination)
salaryComponentController.post("/list", async (req, res) => {
  try {
    const {
      searchKey = "",
      type,
      status,
      pageNo = 1,
      pageCount = 10,
      sortByField,
      sortByOrder,
    } = req.body;

    const query = {};
    if (status !== undefined) query.status = status;
    if (type) query.type = type;

    if (searchKey) {
      query.$or = [
        { componentName: { $regex: searchKey, $options: "i" } },
        { description: { $regex: searchKey, $options: "i" } },
      ];
    }

    const sortField = sortByField || "createdAt";
    const sortOrder = sortByOrder === "asc" ? 1 : -1;

    const components = await SalaryComponent.find(query)
      .sort({ [sortField]: sortOrder })
      .skip((pageNo - 1) * parseInt(pageCount))
      .limit(parseInt(pageCount));

    const totalCount = await SalaryComponent.countDocuments(query);

    sendResponse(res, 200, "Success", {
      message: "Salary components retrieved successfully!",
      data: components,
      total: totalCount,
      statusCode: 200,
    });
  } catch (error) {
    sendResponse(res, 500, "Failed", { message: error.message });
  }
});

// ✅ Update Salary Component
salaryComponentController.put("/update/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const component = await SalaryComponent.findById(id);
    if (!component)
      return sendResponse(res, 404, "Failed", { message: "Salary component not found" });

    const updatedComponent = await SalaryComponent.findByIdAndUpdate(id, req.body, {
      new: true,
    });

    sendResponse(res, 200, "Success", {
      message: "Salary component updated successfully!",
      data: updatedComponent,
      statusCode: 200,
    });
  } catch (error) {
    sendResponse(res, 500, "Failed", { message: error.message });
  }
});

// ✅ Delete Salary Component
salaryComponentController.delete("/delete/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const component = await SalaryComponent.findById(id);
    if (!component)
      return sendResponse(res, 404, "Failed", { message: "Salary component not found" });

    await SalaryComponent.findByIdAndDelete(id);

    sendResponse(res, 200, "Success", {
      message: "Salary component deleted successfully!",
      statusCode: 200,
    });
  } catch (error) {
    sendResponse(res, 500, "Failed", { message: error.message });
  }
});

// ✅ Change Status (Active / Inactive)
salaryComponentController.put("/change-status/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const component = await SalaryComponent.findById(id);
    if (!component)
      return sendResponse(res, 404, "Failed", { message: "Salary component not found" });

    component.status = status;
    const updated = await component.save();

    sendResponse(res, 200, "Success", {
      message: "Salary component status updated successfully!",
      data: updated,
      statusCode: 200,
    });
  } catch (error) {
    sendResponse(res, 500, "Failed", { message: error.message });
  }
});

module.exports = salaryComponentController;
