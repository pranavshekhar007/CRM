const express = require("express");
const { sendResponse } = require("../utils/common");
const JobPosition = require("../model/jobPosition.schema");
require("dotenv").config();

const jobPositionController = express.Router();

jobPositionController.post("/create", async (req, res) => {
  try {
    const position = await JobPosition.create(req.body);
    sendResponse(res, 200, "Success", {
      message: "Job position created successfully!",
      data: position,
      statusCode: 200,
    });
  } catch (error) {
    sendResponse(res, 500, "Failed", { message: error.message });
  }
});

jobPositionController.post("/list", async (req, res) => {
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
    if (status) query.status = status;
    if (searchKey) {
      query.title = { $regex: searchKey, $options: "i" };
    }

    const sortField = sortByField || "createdAt";
    const sortOrder = sortByOrder === "asc" ? 1 : -1;

    const positions = await JobPosition.find(query)
      .populate("jobRequisition", "title")
      .populate("jobType", "name")
      .populate("jobLocation", "name")
      .populate("department", "name")
      .sort({ [sortField]: sortOrder })
      .skip((pageNo - 1) * parseInt(pageCount))
      .limit(parseInt(pageCount));

    const totalCount = await JobPosition.countDocuments(query);

    sendResponse(res, 200, "Success", {
      message: "Job positions list fetched successfully!",
      data: positions,
      total: totalCount,
      statusCode: 200,
    });
  } catch (error) {
    sendResponse(res, 500, "Failed", { message: error.message });
  }
});

jobPositionController.put("/update/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const position = await JobPosition.findByIdAndUpdate(id, req.body, { new: true });
    if (!position)
      return sendResponse(res, 404, "Failed", { message: "Job position not found" });

    sendResponse(res, 200, "Success", {
      message: "Job position updated successfully!",
      data: position,
      statusCode: 200,
    });
  } catch (error) {
    sendResponse(res, 500, "Failed", { message: error.message });
  }
});

jobPositionController.delete("/delete/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const position = await JobPosition.findByIdAndDelete(id);
    if (!position)
      return sendResponse(res, 404, "Failed", { message: "Job position not found" });

    sendResponse(res, 200, "Success", {
      message: "Job position deleted successfully!",
      statusCode: 200,
    });
  } catch (error) {
    sendResponse(res, 500, "Failed", { message: error.message });
  }
});

jobPositionController.put("/change-status/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const position = await JobPosition.findById(id);
    if (!position)
      return sendResponse(res, 404, "Failed", { message: "Job position not found" });

    position.status = status;
    const updated = await position.save();

    sendResponse(res, 200, "Success", {
      message: "Job position status updated successfully!",
      data: updated,
      statusCode: 200,
    });
  } catch (error) {
    sendResponse(res, 500, "Failed", { message: error.message });
  }
});

module.exports = jobPositionController;
