const express = require("express");
const { sendResponse } = require("../utils/common");
require("dotenv").config();
const PerformanceGoalType = require("../model/performanceGoalType.schema");
const performanceGoalTypeController = express.Router();
const auth = require("../utils/auth");

performanceGoalTypeController.post("/create", async (req, res) => {
  try {
    const createdGoalType = await PerformanceGoalType.create(req.body);

    sendResponse(res, 200, "Success", {
      message: "Performance Goal Type created successfully!",
      data: createdGoalType,
      statusCode: 200,
    });
  } catch (error) {
    console.error(error);
    sendResponse(res, 500, "Failed", {
      message: error.message || "Internal server error",
    });
  }
});

performanceGoalTypeController.post("/list", async (req, res) => {
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
        { name: { $regex: searchKey, $options: "i" } },
        { description: { $regex: searchKey, $options: "i" } },
      ];
    }

    const sortField = sortByField || "createdAt";
    const sortOrder = sortByOrder === "asc" ? 1 : -1;
    const sortOption = { [sortField]: sortOrder };

    const goalTypeList = await PerformanceGoalType.find(query)
      .sort(sortOption)
      .limit(parseInt(pageCount))
      .skip((pageNo - 1) * parseInt(pageCount));

    const totalCount = await PerformanceGoalType.countDocuments(query);

    sendResponse(res, 200, "Success", {
      message: "Performance Goal Type list retrieved successfully!",
      data: goalTypeList,
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

performanceGoalTypeController.put("/update", async (req, res) => {
  try {
    const id = req.body._id;

    const existingGoalType = await PerformanceGoalType.findById(id);
    if (!existingGoalType) {
      return sendResponse(res, 404, "Failed", {
        message: "Performance Goal Type not found",
      });
    }

    const updatedGoalType = await PerformanceGoalType.findByIdAndUpdate(id, req.body, {
      new: true,
    });

    sendResponse(res, 200, "Success", {
      message: "Performance Goal Type updated successfully!",
      data: updatedGoalType,
      statusCode: 200,
    });
  } catch (error) {
    console.error(error);
    sendResponse(res, 500, "Failed", {
      message: error.message || "Internal server error",
    });
  }
});

performanceGoalTypeController.delete("/delete/:id", async (req, res) => {
  try {
    const { id } = req.params;

    const goalType = await PerformanceGoalType.findById(id);
    if (!goalType) {
      return sendResponse(res, 404, "Failed", {
        message: "Performance Goal Type not found",
      });
    }

    await PerformanceGoalType.findByIdAndDelete(id);

    sendResponse(res, 200, "Success", {
      message: "Performance Goal Type deleted successfully!",
      statusCode: 200,
    });
  } catch (error) {
    console.error(error);
    sendResponse(res, 500, "Failed", {
      message: error.message || "Internal server error",
    });
  }
});

module.exports = performanceGoalTypeController;
