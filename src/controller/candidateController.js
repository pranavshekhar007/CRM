const express = require("express");
const { sendResponse } = require("../utils/common");
const Candidate = require("../model/candidate.schema");
require("dotenv").config();

const candidateController = express.Router();

// ✅ Create Candidate
candidateController.post("/create", async (req, res) => {
  try {
    const candidate = await Candidate.create(req.body);
    sendResponse(res, 200, "Success", {
      message: "Candidate created successfully!",
      data: candidate,
      statusCode: 200,
    });
  } catch (error) {
    sendResponse(res, 500, "Failed", { message: error.message });
  }
});

// ✅ Get All Candidates (with pagination, search, and filters)
candidateController.post("/list", async (req, res) => {
  try {
    const {
      searchKey = "",
      status,
      pageNo = 1,
      pageCount = 10,
      sortByField,
      sortByOrder,
      job,
      source,
    } = req.body;

    const query = {};
    if (status) query.status = status;
    if (job) query.job = job;
    if (source) query.source = source;

    if (searchKey) {
      query.$or = [
        { firstName: { $regex: searchKey, $options: "i" } },
        { lastName: { $regex: searchKey, $options: "i" } },
        { email: { $regex: searchKey, $options: "i" } },
        { phone: { $regex: searchKey, $options: "i" } },
      ];
    }

    const sortField = sortByField || "createdAt";
    const sortOrder = sortByOrder === "asc" ? 1 : -1;

    const candidates = await Candidate.find(query)
      .populate("job", "title")
      .populate("source", "name")
      .populate("referredBy", "fullName")
      .sort({ [sortField]: sortOrder })
      .skip((pageNo - 1) * parseInt(pageCount))
      .limit(parseInt(pageCount));

    const totalCount = await Candidate.countDocuments(query);

    sendResponse(res, 200, "Success", {
      message: "Candidate list fetched successfully!",
      data: candidates,
      total: totalCount,
      statusCode: 200,
    });
  } catch (error) {
    sendResponse(res, 500, "Failed", { message: error.message });
  }
});

// ✅ Get Candidate by ID
candidateController.get("/get/:id", async (req, res) => {
  try {
    const candidate = await Candidate.findById(req.params.id)
      .populate("job", "title")
      .populate("source", "name")
      .populate("referredBy", "fullName");

    if (!candidate)
      return sendResponse(res, 404, "Failed", { message: "Candidate not found" });

    sendResponse(res, 200, "Success", {
      message: "Candidate details fetched successfully!",
      data: candidate,
      statusCode: 200,
    });
  } catch (error) {
    sendResponse(res, 500, "Failed", { message: error.message });
  }
});

// ✅ Update Candidate
candidateController.put("/update/:id", async (req, res) => {
  try {
    const candidate = await Candidate.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
    });
    if (!candidate)
      return sendResponse(res, 404, "Failed", { message: "Candidate not found" });

    sendResponse(res, 200, "Success", {
      message: "Candidate updated successfully!",
      data: candidate,
      statusCode: 200,
    });
  } catch (error) {
    sendResponse(res, 500, "Failed", { message: error.message });
  }
});

// ✅ Change Candidate Status
candidateController.put("/change-status/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const candidate = await Candidate.findById(id);
    if (!candidate)
      return sendResponse(res, 404, "Failed", { message: "Candidate not found" });

    candidate.status = status;
    const updated = await candidate.save();

    sendResponse(res, 200, "Success", {
      message: "Candidate status updated successfully!",
      data: updated,
      statusCode: 200,
    });
  } catch (error) {
    sendResponse(res, 500, "Failed", { message: error.message });
  }
});

// ✅ Delete Candidate
candidateController.delete("/delete/:id", async (req, res) => {
  try {
    const candidate = await Candidate.findByIdAndDelete(req.params.id);
    if (!candidate)
      return sendResponse(res, 404, "Failed", { message: "Candidate not found" });

    sendResponse(res, 200, "Success", {
      message: "Candidate deleted successfully!",
      statusCode: 200,
    });
  } catch (error) {
    sendResponse(res, 500, "Failed", { message: error.message });
  }
});

module.exports = candidateController;
