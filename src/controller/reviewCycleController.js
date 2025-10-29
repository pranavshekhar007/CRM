const express = require("express");
const { sendResponse } = require("../utils/common");
require("dotenv").config();
const ReviewCycle = require("../model/reviewCycle.schema");
const reviewCycleController = express.Router();

reviewCycleController.post("/create", async (req, res) => {
  try {
    const createdCycle = await ReviewCycle.create(req.body);
    sendResponse(res, 200, "Success", {
      message: "Review Cycle created successfully!",
      data: createdCycle,
      statusCode: 200,
    });
  } catch (error) {
    sendResponse(res, 500, "Failed", { message: error.message });
  }
});

reviewCycleController.post("/list", async (req, res) => {
  try {
    const {
      searchKey = "",
      pageNo = 1,
      status,
      pageCount = 10,
      sortByField,
      sortByOrder,
    } = req.body;

    const query = {};
    if (status) query.status = status;
    if (searchKey) {
      query.$or = [
        { name: { $regex: searchKey, $options: "i" } },
        { description: { $regex: searchKey, $options: "i" } },
      ];
    }

    const sortField = sortByField || "createdAt";
    const sortOrder = sortByOrder === "asc" ? 1 : -1;
    const sortOption = { [sortField]: sortOrder };

    const reviewCycles = await ReviewCycle.find(query)
      .sort(sortOption)
      .limit(parseInt(pageCount))
      .skip((pageNo - 1) * parseInt(pageCount));

    const totalCount = await ReviewCycle.countDocuments(query);

    sendResponse(res, 200, "Success", {
      message: "Review Cycle list retrieved successfully!",
      data: reviewCycles,
      total: totalCount,
      statusCode: 200,
    });
  } catch (error) {
    sendResponse(res, 500, "Failed", { message: error.message });
  }
});

reviewCycleController.put("/update", async (req, res) => {
  try {
    const id = req.body._id;
    const existingCycle = await ReviewCycle.findById(id);
    if (!existingCycle)
      return sendResponse(res, 404, "Failed", { message: "Review Cycle not found" });

    const updatedCycle = await ReviewCycle.findByIdAndUpdate(id, req.body, { new: true });

    sendResponse(res, 200, "Success", {
      message: "Review Cycle updated successfully!",
      data: updatedCycle,
      statusCode: 200,
    });
  } catch (error) {
    sendResponse(res, 500, "Failed", { message: error.message });
  }
});

reviewCycleController.delete("/delete/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const cycle = await ReviewCycle.findById(id);
    if (!cycle)
      return sendResponse(res, 404, "Failed", { message: "Review Cycle not found" });

    await ReviewCycle.findByIdAndDelete(id);

    sendResponse(res, 200, "Success", {
      message: "Review Cycle deleted successfully!",
      statusCode: 200,
    });
  } catch (error) {
    sendResponse(res, 500, "Failed", { message: error.message });
  }
});

module.exports = reviewCycleController;
