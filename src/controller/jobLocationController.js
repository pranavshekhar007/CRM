const express = require("express");
const { sendResponse } = require("../utils/common");
const JobLocation = require("../model/jobLocation.schema");
require("dotenv").config();

const jobLocationController = express.Router();

// ✅ Create Job Location
jobLocationController.post("/create", async (req, res) => {
  try {
    const location = await JobLocation.create(req.body);
    sendResponse(res, 200, "Success", {
      message: "Job location created successfully!",
      data: location,
      statusCode: 200,
    });
  } catch (error) {
    sendResponse(res, 500, "Failed", { message: error.message });
  }
});

// ✅ List Job Locations
jobLocationController.post("/list", async (req, res) => {
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
      query.name = { $regex: searchKey, $options: "i" };
    }

    const sortField = sortByField || "createdAt";
    const sortOrder = sortByOrder === "asc" ? 1 : -1;

    const locations = await JobLocation.find(query)
      .sort({ [sortField]: sortOrder })
      .skip((pageNo - 1) * parseInt(pageCount))
      .limit(parseInt(pageCount));

    const totalCount = await JobLocation.countDocuments(query);

    sendResponse(res, 200, "Success", {
      message: "Job location list fetched successfully!",
      data: locations,
      total: totalCount,
      statusCode: 200,
    });
  } catch (error) {
    sendResponse(res, 500, "Failed", { message: error.message });
  }
});

// ✅ Update Job Location
jobLocationController.put("/update/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const location = await JobLocation.findByIdAndUpdate(id, req.body, { new: true });
    if (!location)
      return sendResponse(res, 404, "Failed", { message: "Job location not found" });

    sendResponse(res, 200, "Success", {
      message: "Job location updated successfully!",
      data: location,
      statusCode: 200,
    });
  } catch (error) {
    sendResponse(res, 500, "Failed", { message: error.message });
  }
});

// ✅ Delete Job Location
jobLocationController.delete("/delete/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const location = await JobLocation.findByIdAndDelete(id);
    if (!location)
      return sendResponse(res, 404, "Failed", { message: "Job location not found" });

    sendResponse(res, 200, "Success", {
      message: "Job location deleted successfully!",
      statusCode: 200,
    });
  } catch (error) {
    sendResponse(res, 500, "Failed", { message: error.message });
  }
});

// ✅ Change Status
jobLocationController.put("/change-status/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const location = await JobLocation.findById(id);
    if (!location)
      return sendResponse(res, 404, "Failed", { message: "Job location not found" });

    location.status = status;
    const updated = await location.save();

    sendResponse(res, 200, "Success", {
      message: "Job location status updated successfully!",
      data: updated,
      statusCode: 200,
    });
  } catch (error) {
    sendResponse(res, 500, "Failed", { message: error.message });
  }
});

module.exports = jobLocationController;
