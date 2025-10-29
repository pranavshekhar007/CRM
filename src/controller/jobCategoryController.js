const express = require("express");
const { sendResponse } = require("../utils/common");
const JobCategory = require("../model/jobCategory.schema");
require("dotenv").config();

const jobCategoryController = express.Router();

// ✅ Create Job Category
jobCategoryController.post("/create", async (req, res) => {
  try {
    const category = await JobCategory.create(req.body);
    sendResponse(res, 200, "Success", {
      message: "Job Category created successfully!",
      data: category,
      statusCode: 200,
    });
  } catch (error) {
    sendResponse(res, 500, "Failed", { message: error.message });
  }
});

// ✅ List Job Categories
jobCategoryController.post("/list", async (req, res) => {
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
    if (searchKey) query.name = { $regex: searchKey, $options: "i" };

    const sortField = sortByField || "createdAt";
    const sortOrder = sortByOrder === "asc" ? 1 : -1;

    const categories = await JobCategory.find(query)
      .sort({ [sortField]: sortOrder })
      .limit(parseInt(pageCount))
      .skip((pageNo - 1) * parseInt(pageCount));

    const totalCount = await JobCategory.countDocuments(query);

    sendResponse(res, 200, "Success", {
      message: "Job Category list fetched successfully!",
      data: categories,
      total: totalCount,
      statusCode: 200,
    });
  } catch (error) {
    sendResponse(res, 500, "Failed", { message: error.message });
  }
});

// ✅ Update Job Category
jobCategoryController.put("/update/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const category = await JobCategory.findById(id);
    if (!category)
      return sendResponse(res, 404, "Failed", { message: "Job Category not found" });

    const updatedCategory = await JobCategory.findByIdAndUpdate(id, req.body, {
      new: true,
    });

    sendResponse(res, 200, "Success", {
      message: "Job Category updated successfully!",
      data: updatedCategory,
      statusCode: 200,
    });
  } catch (error) {
    sendResponse(res, 500, "Failed", { message: error.message });
  }
});

// ✅ Delete Job Category
jobCategoryController.delete("/delete/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const category = await JobCategory.findById(id);
    if (!category)
      return sendResponse(res, 404, "Failed", { message: "Job Category not found" });

    await JobCategory.findByIdAndDelete(id);

    sendResponse(res, 200, "Success", {
      message: "Job Category deleted successfully!",
      statusCode: 200,
    });
  } catch (error) {
    sendResponse(res, 500, "Failed", { message: error.message });
  }
});

// ✅ Change Status
jobCategoryController.put("/change-status/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const category = await JobCategory.findById(id);
    if (!category)
      return sendResponse(res, 404, "Failed", { message: "Job Category not found" });

    category.status = status;
    const updated = await category.save();

    sendResponse(res, 200, "Success", {
      message: "Job Category status updated successfully!",
      data: updated,
      statusCode: 200,
    });
  } catch (error) {
    sendResponse(res, 500, "Failed", { message: error.message });
  }
});

module.exports = jobCategoryController;
