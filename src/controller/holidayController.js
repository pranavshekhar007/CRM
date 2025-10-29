const express = require("express");
const { sendResponse } = require("../utils/common");
const Holiday = require("../model/holiday.schema");
require("dotenv").config();

const holidayController = express.Router();

// ✅ Create Holiday
holidayController.post("/create", async (req, res) => {
  try {
    const createdHoliday = await Holiday.create(req.body);
    sendResponse(res, 200, "Success", {
      message: "Holiday created successfully!",
      data: createdHoliday,
      statusCode: 200,
    });
  } catch (error) {
    sendResponse(res, 500, "Failed", { message: error.message });
  }
});

// ✅ List Holidays (filter, search, pagination)
holidayController.post("/list", async (req, res) => {
  try {
    const {
      searchKey = "",
      category,
      status,
      pageNo = 1,
      pageCount = 10,
      sortByField,
      sortByOrder,
    } = req.body;

    const query = {};
    if (status !== undefined) query.status = status;
    if (category) query.category = category;
    if (searchKey) {
      query.$or = [
        { name: { $regex: searchKey, $options: "i" } },
        { description: { $regex: searchKey, $options: "i" } },
      ];
    }

    const sortField = sortByField || "startDate";
    const sortOrder = sortByOrder === "asc" ? 1 : -1;

    const holidays = await Holiday.find(query)
      .populate("applicableBranches", "branchName")
      .sort({ [sortField]: sortOrder })
      .skip((pageNo - 1) * parseInt(pageCount))
      .limit(parseInt(pageCount));

    const totalCount = await Holiday.countDocuments(query);

    sendResponse(res, 200, "Success", {
      message: "Holiday list retrieved successfully!",
      data: holidays,
      total: totalCount,
      statusCode: 200,
    });
  } catch (error) {
    sendResponse(res, 500, "Failed", { message: error.message });
  }
});

// ✅ Update Holiday
holidayController.put("/update/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const holiday = await Holiday.findById(id);
    if (!holiday)
      return sendResponse(res, 404, "Failed", { message: "Holiday not found" });

    const updatedHoliday = await Holiday.findByIdAndUpdate(id, req.body, { new: true });

    sendResponse(res, 200, "Success", {
      message: "Holiday updated successfully!",
      data: updatedHoliday,
      statusCode: 200,
    });
  } catch (error) {
    sendResponse(res, 500, "Failed", { message: error.message });
  }
});

// ✅ Delete Holiday
holidayController.delete("/delete/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const holiday = await Holiday.findById(id);
    if (!holiday)
      return sendResponse(res, 404, "Failed", { message: "Holiday not found" });

    await Holiday.findByIdAndDelete(id);

    sendResponse(res, 200, "Success", {
      message: "Holiday deleted successfully!",
      statusCode: 200,
    });
  } catch (error) {
    sendResponse(res, 500, "Failed", { message: error.message });
  }
});

// ✅ Change Holiday Status (Activate / Deactivate)
holidayController.put("/change-status/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const holiday = await Holiday.findById(id);
    if (!holiday)
      return sendResponse(res, 404, "Failed", { message: "Holiday not found" });

    holiday.status = status;
    const updatedHoliday = await holiday.save();

    sendResponse(res, 200, "Success", {
      message: "Holiday status updated successfully!",
      data: updatedHoliday,
      statusCode: 200,
    });
  } catch (error) {
    sendResponse(res, 500, "Failed", { message: error.message });
  }
});

module.exports = holidayController;
