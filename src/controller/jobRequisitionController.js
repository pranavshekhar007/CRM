const express = require("express");
const { sendResponse } = require("../utils/common");
const JobRequisition = require("../model/jobRequisition.schema");
require("dotenv").config();

const jobRequisitionController = express.Router();

jobRequisitionController.post("/create", async (req, res) => {
  try {
    const requisition = await JobRequisition.create(req.body);
    sendResponse(res, 200, "Success", {
      message: "Job requisition created successfully!",
      data: requisition,
      statusCode: 200,
    });
  } catch (error) {
    sendResponse(res, 500, "Failed", { message: error.message });
  }
});

// ✅ List Job Requisitions
jobRequisitionController.post("/list", async (req, res) => {
  try {
    const {
      searchKey = "",
      status,
      priority,
      pageNo = 1,
      pageCount = 10,
      sortByField,
      sortByOrder,
    } = req.body;

    const query = {};
    if (status) query.status = status;
    if (priority) query.priority = priority;
    if (searchKey) {
      query.$or = [
        { title: { $regex: searchKey, $options: "i" } },
        { description: { $regex: searchKey, $options: "i" } },
      ];
    }

    const sortField = sortByField || "createdAt";
    const sortOrder = sortByOrder === "asc" ? 1 : -1;

    const requisitions = await JobRequisition.find(query)
      .populate("jobCategory", "name")
      .populate("department", "name")
      .sort({ [sortField]: sortOrder })
      .skip((pageNo - 1) * parseInt(pageCount))
      .limit(parseInt(pageCount));

    const totalCount = await JobRequisition.countDocuments(query);

    sendResponse(res, 200, "Success", {
      message: "Job requisition list fetched successfully!",
      data: requisitions,
      total: totalCount,
      statusCode: 200,
    });
  } catch (error) {
    sendResponse(res, 500, "Failed", { message: error.message });
  }
});

// ✅ Update Job Requisition
jobRequisitionController.put("/update/:id", async (req, res) => {
  try {
    const { id } = req.params;

    const requisition = await JobRequisition.findById(id);
    if (!requisition)
      return sendResponse(res, 404, "Failed", { message: "Job requisition not found" });

    const updatedRequisition = await JobRequisition.findByIdAndUpdate(id, req.body, {
      new: true,
    });

    sendResponse(res, 200, "Success", {
      message: "Job requisition updated successfully!",
      data: updatedRequisition,
      statusCode: 200,
    });
  } catch (error) {
    sendResponse(res, 500, "Failed", { message: error.message });
  }
});

// ✅ Delete Job Requisition
jobRequisitionController.delete("/delete/:id", async (req, res) => {
  try {
    const { id } = req.params;

    const requisition = await JobRequisition.findById(id);
    if (!requisition)
      return sendResponse(res, 404, "Failed", { message: "Job requisition not found" });

    await JobRequisition.findByIdAndDelete(id);

    sendResponse(res, 200, "Success", {
      message: "Job requisition deleted successfully!",
      statusCode: 200,
    });
  } catch (error) {
    sendResponse(res, 500, "Failed", { message: error.message });
  }
});

// ✅ Change Job Requisition Status
jobRequisitionController.put("/change-status/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const requisition = await JobRequisition.findById(id);
    if (!requisition)
      return sendResponse(res, 404, "Failed", { message: "Job requisition not found" });

    requisition.status = status;
    const updated = await requisition.save();

    sendResponse(res, 200, "Success", {
      message: "Job requisition status updated successfully!",
      data: updated,
      statusCode: 200,
    });
  } catch (error) {
    sendResponse(res, 500, "Failed", { message: error.message });
  }
});

module.exports = jobRequisitionController;
