const express = require("express");
const { sendResponse } = require("../utils/common");
require("dotenv").config();
const Shift = require("../model/shift.schema");
const shiftController = express.Router();
const auth = require("../utils/auth");

// Create Shift
shiftController.post("/create", async (req, res) => {
  try {
    const shiftCreated = await Shift.create(req.body);

    sendResponse(res, 200, "Success", {
      message: "Shift created successfully!",
      data: shiftCreated,
      statusCode: 200,
    });
  } catch (error) {
    console.error("Shift Create Error:", error);
    sendResponse(res, 500, "Failed", { message: error.message });
  }
});

// List Shifts (with search, pagination, sort)
shiftController.post("/list", async (req, res) => {
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
    if (searchKey) {
      query.$or = [
        { name: { $regex: searchKey, $options: "i" } },
        { description: { $regex: searchKey, $options: "i" } },
      ];
    }

    const sortField = sortByField || "createdAt";
    const sortOrder = sortByOrder === "asc" ? 1 : -1;
    const sortOption = { [sortField]: sortOrder };

    const shiftList = await Shift.find(query)
      .sort(sortOption)
      .limit(parseInt(pageCount))
      .skip((pageNo - 1) * parseInt(pageCount));

    const totalCount = await Shift.countDocuments(query);

    sendResponse(res, 200, "Success", {
      message: "Shift list retrieved successfully!",
      data: shiftList,
      total: totalCount,
      statusCode: 200,
    });
  } catch (error) {
    console.error("Shift List Error:", error);
    sendResponse(res, 500, "Failed", { message: error.message });
  }
});

// Update Shift
shiftController.put("/update", async (req, res) => {
  try {
    const id = req.body._id;
    const shiftData = await Shift.findById(id);

    if (!shiftData) {
      return sendResponse(res, 404, "Failed", { message: "Shift not found" });
    }

    const updatedShift = await Shift.findByIdAndUpdate(id, req.body, { new: true });

    sendResponse(res, 200, "Success", {
      message: "Shift updated successfully!",
      data: updatedShift,
      statusCode: 200,
    });
  } catch (error) {
    console.error("Shift Update Error:", error);
    sendResponse(res, 500, "Failed", { message: error.message });
  }
});

// Delete Shift
shiftController.delete("/delete/:id", async (req, res) => {
  try {
    const { id } = req.params;

    const shiftItem = await Shift.findById(id);
    if (!shiftItem) {
      return sendResponse(res, 404, "Failed", { message: "Shift not found" });
    }

    await Shift.findByIdAndDelete(id);

    sendResponse(res, 200, "Success", {
      message: "Shift deleted successfully!",
      statusCode: 200,
    });
  } catch (error) {
    console.error("Shift Delete Error:", error);
    sendResponse(res, 500, "Failed", { message: error.message });
  }
});

module.exports = shiftController;
