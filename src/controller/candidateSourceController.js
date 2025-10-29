const express = require("express");
const { sendResponse } = require("../utils/common");
const CandidateSource = require("../model/candidateSource.schema");
require("dotenv").config();

const candidateSourceController = express.Router();

candidateSourceController.post("/create", async (req, res) => {
  try {
    const source = await CandidateSource.create(req.body);
    sendResponse(res, 200, "Success", {
      message: "Candidate source created successfully!",
      data: source,
      statusCode: 200,
    });
  } catch (error) {
    sendResponse(res, 500, "Failed", { message: error.message });
  }
});

candidateSourceController.post("/list", async (req, res) => {
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
    if (searchKey) query.name = { $regex: searchKey, $options: "i" };

    const sortField = sortByField || "createdAt";
    const sortOrder = sortByOrder === "asc" ? 1 : -1;

    const sources = await CandidateSource.find(query)
      .sort({ [sortField]: sortOrder })
      .skip((pageNo - 1) * parseInt(pageCount))
      .limit(parseInt(pageCount));

    const totalCount = await CandidateSource.countDocuments(query);

    sendResponse(res, 200, "Success", {
      message: "Candidate source list fetched successfully!",
      data: sources,
      total: totalCount,
      statusCode: 200,
    });
  } catch (error) {
    sendResponse(res, 500, "Failed", { message: error.message });
  }
});


candidateSourceController.put("/update/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const source = await CandidateSource.findByIdAndUpdate(id, req.body, { new: true });
    if (!source)
      return sendResponse(res, 404, "Failed", { message: "Candidate source not found" });

    sendResponse(res, 200, "Success", {
      message: "Candidate source updated successfully!",
      data: source,
      statusCode: 200,
    });
  } catch (error) {
    sendResponse(res, 500, "Failed", { message: error.message });
  }
});


candidateSourceController.delete("/delete/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const source = await CandidateSource.findByIdAndDelete(id);
    if (!source)
      return sendResponse(res, 404, "Failed", { message: "Candidate source not found" });

    sendResponse(res, 200, "Success", {
      message: "Candidate source deleted successfully!",
      statusCode: 200,
    });
  } catch (error) {
    sendResponse(res, 500, "Failed", { message: error.message });
  }
});

candidateSourceController.put("/change-status/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const source = await CandidateSource.findById(id);
    if (!source)
      return sendResponse(res, 404, "Failed", { message: "Candidate source not found" });

    source.status = status;
    const updated = await source.save();

    sendResponse(res, 200, "Success", {
      message: "Candidate source status updated successfully!",
      data: updated,
      statusCode: 200,
    });
  } catch (error) {
    sendResponse(res, 500, "Failed", { message: error.message });
  }
});

module.exports = candidateSourceController;
