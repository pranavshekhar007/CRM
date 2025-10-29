const express = require("express");
const { sendResponse } = require("../utils/common");
require("dotenv").config();
const PerformanceIndicatorCategory = require("../model/performanceIndicatorCategory.schema");
const performanceIndicatorCategoryController = express.Router();
const auth = require("../utils/auth");

performanceIndicatorCategoryController.post("/create", async (req, res) => {
  try {
    const createdCategory = await PerformanceIndicatorCategory.create(req.body);

    sendResponse(res, 200, "Success", {
      message: "Performance Indicator Category created successfully!",
      data: createdCategory,
      statusCode: 200,
    });
  } catch (error) {
    console.error(error);
    sendResponse(res, 500, "Failed", {
      message: error.message || "Internal server error",
    });
  }
});


performanceIndicatorCategoryController.post("/list", async (req, res) => {
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
    if (status !== undefined && status !== "") query.status = status;

    if (searchKey) {
      query.$or = [
        { categoryName: { $regex: searchKey, $options: "i" } },
        { description: { $regex: searchKey, $options: "i" } },
      ];
    }

    const sortField = sortByField || "createdAt";
    const sortOrder = sortByOrder === "asc" ? 1 : -1;
    const sortOption = { [sortField]: sortOrder };

    const categoryList = await PerformanceIndicatorCategory.find(query)
      .sort(sortOption)
      .limit(parseInt(pageCount))
      .skip((pageNo - 1) * parseInt(pageCount));

    const totalCount = await PerformanceIndicatorCategory.countDocuments(query);

    sendResponse(res, 200, "Success", {
      message: "Performance Indicator Category list retrieved successfully!",
      data: categoryList,
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

performanceIndicatorCategoryController.put("/update", async (req, res) => {
  try {
    const id = req.body._id;

    const existingCategory = await PerformanceIndicatorCategory.findById(id);
    if (!existingCategory) {
      return sendResponse(res, 404, "Failed", {
        message: "Performance Indicator Category not found",
      });
    }

    const updatedCategory = await PerformanceIndicatorCategory.findByIdAndUpdate(
      id,
      req.body,
      { new: true }
    );

    sendResponse(res, 200, "Success", {
      message: "Performance Indicator Category updated successfully!",
      data: updatedCategory,
      statusCode: 200,
    });
  } catch (error) {
    console.error(error);
    sendResponse(res, 500, "Failed", {
      message: error.message || "Internal server error",
    });
  }
});

performanceIndicatorCategoryController.delete("/delete/:id", async (req, res) => {
  try {
    const { id } = req.params;

    const category = await PerformanceIndicatorCategory.findById(id);
    if (!category) {
      return sendResponse(res, 404, "Failed", {
        message: "Performance Indicator Category not found",
      });
    }

    await PerformanceIndicatorCategory.findByIdAndDelete(id);

    sendResponse(res, 200, "Success", {
      message: "Performance Indicator Category deleted successfully!",
      statusCode: 200,
    });
  } catch (error) {
    console.error(error);
    sendResponse(res, 500, "Failed", {
      message: error.message || "Internal server error",
    });
  }
});

module.exports = performanceIndicatorCategoryController;
