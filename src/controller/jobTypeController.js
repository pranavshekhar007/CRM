const express = require("express");
const { sendResponse } = require("../utils/common");
const JobType = require("../model/jobType.schema");
require("dotenv").config();

const jobTypeController = express.Router();

// ✅ Create Job Type
jobTypeController.post("/create", async (req, res) => {
  try {
    const jobType = await JobType.create(req.body);
    sendResponse(res, 200, "Success", {
      message: "Job type created successfully!",
      data: jobType,
      statusCode: 200,
    });
  } catch (error) {
    sendResponse(res, 500, "Failed", { message: error.message });
  }
});

// ✅ List Job Types
jobTypeController.post("/list", async (req, res) => {
  try {
    const {
      searchKey = "",
      pageNo = 1,
      pageCount = 10,
      sortByField,
      sortByOrder,
    } = req.body;

    const query = {};
    if (searchKey) {
      query.$or = [
        { name: { $regex: searchKey, $options: "i" } },
        { description: { $regex: searchKey, $options: "i" } },
      ];
    }

    const sortField = sortByField || "createdAt";
    const sortOrder = sortByOrder === "asc" ? 1 : -1;

    const jobTypes = await JobType.find(query)
      .sort({ [sortField]: sortOrder })
      .skip((pageNo - 1) * parseInt(pageCount))
      .limit(parseInt(pageCount));

    const totalCount = await JobType.countDocuments(query);

    sendResponse(res, 200, "Success", {
      message: "Job type list fetched successfully!",
      data: jobTypes,
      total: totalCount,
      statusCode: 200,
    });
  } catch (error) {
    sendResponse(res, 500, "Failed", { message: error.message });
  }
});

// ✅ Update Job Type
jobTypeController.put("/update/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const jobType = await JobType.findByIdAndUpdate(id, req.body, { new: true });
    if (!jobType)
      return sendResponse(res, 404, "Failed", { message: "Job type not found" });

    sendResponse(res, 200, "Success", {
      message: "Job type updated successfully!",
      data: jobType,
      statusCode: 200,
    });
  } catch (error) {
    sendResponse(res, 500, "Failed", { message: error.message });
  }
});

// ✅ Delete Job Type
jobTypeController.delete("/delete/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const jobType = await JobType.findByIdAndDelete(id);
    if (!jobType)
      return sendResponse(res, 404, "Failed", { message: "Job type not found" });

    sendResponse(res, 200, "Success", {
      message: "Job type deleted successfully!",
      statusCode: 200,
    });
  } catch (error) {
    sendResponse(res, 500, "Failed", { message: error.message });
  }
});

// ✅ Change Status
jobTypeController.put("/change-status/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const jobType = await JobType.findById(id);
    if (!jobType)
      return sendResponse(res, 404, "Failed", { message: "Job type not found" });

    jobType.status = status;
    const updated = await jobType.save();

    sendResponse(res, 200, "Success", {
      message: "Job type status updated successfully!",
      data: updated,
      statusCode: 200,
    });
  } catch (error) {
    sendResponse(res, 500, "Failed", { message: error.message });
  }
});

module.exports = jobTypeController;
