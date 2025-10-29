const express = require("express");
const { sendResponse } = require("../utils/common");
require("dotenv").config();
const PerformanceIndicator = require("../model/performanceIndicator.schema");
const PerformanceIndicatorCategory = require("../model/performanceIndicatorCategory.schema");
const performanceIndicatorController = express.Router();
const auth = require("../utils/auth");

performanceIndicatorController.post("/create", async (req, res) => {
  try {
    const { indicatorCategory } = req.body;

    const categoryExists = await PerformanceIndicatorCategory.findById(indicatorCategory);
    if (!categoryExists) {
      return sendResponse(res, 400, "Failed", {
        message: "Invalid indicator category ID",
      });
    }

    const createdIndicator = await PerformanceIndicator.create(req.body);

    sendResponse(res, 200, "Success", {
      message: "Performance Indicator created successfully!",
      data: createdIndicator,
      statusCode: 200,
    });
  } catch (error) {
    console.error(error);
    sendResponse(res, 500, "Failed", {
      message: error.message || "Internal server error",
    });
  }
});

performanceIndicatorController.post("/list", async (req, res) => {
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
        { indicatorName: { $regex: searchKey, $options: "i" } },
        { description: { $regex: searchKey, $options: "i" } },
        { measurementUnit: { $regex: searchKey, $options: "i" } },
        { targetValue: { $regex: searchKey, $options: "i" } },
      ];
    }

    const sortField = sortByField || "createdAt";
    const sortOrder = sortByOrder === "asc" ? 1 : -1;
    const sortOption = { [sortField]: sortOrder };

    const indicatorList = await PerformanceIndicator.find(query)
      .populate("indicatorCategory", "categoryName")
      .sort(sortOption)
      .limit(parseInt(pageCount))
      .skip((pageNo - 1) * parseInt(pageCount));

    const totalCount = await PerformanceIndicator.countDocuments(query);

    sendResponse(res, 200, "Success", {
      message: "Performance Indicator list retrieved successfully!",
      data: indicatorList,
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

performanceIndicatorController.put("/update", async (req, res) => {
  try {
    const { _id, indicatorCategory } = req.body;

    const existingIndicator = await PerformanceIndicator.findById(_id);
    if (!existingIndicator) {
      return sendResponse(res, 404, "Failed", {
        message: "Performance Indicator not found",
      });
    }

    if (indicatorCategory) {
      const categoryExists = await PerformanceIndicatorCategory.findById(indicatorCategory);
      if (!categoryExists) {
        return sendResponse(res, 400, "Failed", {
          message: "Invalid indicator category ID",
        });
      }
    }

    const updatedIndicator = await PerformanceIndicator.findByIdAndUpdate(_id, req.body, {
      new: true,
    });

    sendResponse(res, 200, "Success", {
      message: "Performance Indicator updated successfully!",
      data: updatedIndicator,
      statusCode: 200,
    });
  } catch (error) {
    console.error(error);
    sendResponse(res, 500, "Failed", {
      message: error.message || "Internal server error",
    });
  }
});

performanceIndicatorController.delete("/delete/:id", async (req, res) => {
  try {
    const { id } = req.params;

    const indicator = await PerformanceIndicator.findById(id);
    if (!indicator) {
      return sendResponse(res, 404, "Failed", {
        message: "Performance Indicator not found",
      });
    }

    await PerformanceIndicator.findByIdAndDelete(id);

    sendResponse(res, 200, "Success", {
      message: "Performance Indicator deleted successfully!",
      statusCode: 200,
    });
  } catch (error) {
    console.error(error);
    sendResponse(res, 500, "Failed", {
      message: error.message || "Internal server error",
    });
  }
});

module.exports = performanceIndicatorController;
