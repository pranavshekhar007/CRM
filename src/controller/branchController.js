const express = require("express");
const { sendResponse } = require("../utils/common");
require("dotenv").config();
const Branch = require("../model/branch.schema");
const branchController = express.Router();
const auth = require("../utils/auth");

branchController.post("/create", async (req, res) => {
  try {
    const branchCreated = await Branch.create(req.body);

    sendResponse(res, 200, "Success", {
      message: "Branch created successfully!",
      data: branchCreated,
      statusCode: 200,
    });
  } catch (error) {
    console.error(error);
    sendResponse(res, 500, "Failed", {
      message: error.message || "Internal server error",
    });
  }
});

branchController.post("/list", async (req, res) => {
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
      query.$or = [
        { branchName: { $regex: searchKey, $options: "i" } },
        { city: { $regex: searchKey, $options: "i" } },
        { state: { $regex: searchKey, $options: "i" } },
        { country: { $regex: searchKey, $options: "i" } },
        { email: { $regex: searchKey, $options: "i" } },
      ];
    }

    const sortField = sortByField || "createdAt";
    const sortOrder = sortByOrder === "asc" ? 1 : -1;
    const sortOption = { [sortField]: sortOrder };

    const branchList = await Branch.find(query)
      .sort(sortOption)
      .limit(parseInt(pageCount))
      .skip((pageNo - 1) * parseInt(pageCount));

    const totalCount = await Branch.countDocuments(query);

    sendResponse(res, 200, "Success", {
      message: "Branch list retrieved successfully!",
      data: branchList,
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

branchController.put("/update", async (req, res) => {
  try {
    const id = req.body._id;

    const branchData = await Branch.findById(id);
    if (!branchData) {
      return sendResponse(res, 404, "Failed", { message: "Branch not found" });
    }

    const updatedBranch = await Branch.findByIdAndUpdate(id, req.body, {
      new: true,
    });

    sendResponse(res, 200, "Success", {
      message: "Branch updated successfully!",
      data: updatedBranch,
      statusCode: 200,
    });
  } catch (error) {
    console.error(error);
    sendResponse(res, 500, "Failed", {
      message: error.message || "Internal server error",
    });
  }
});

branchController.delete("/delete/:id", async (req, res) => {
  try {
    const { id } = req.params;

    const branchItem = await Branch.findById(id);
    if (!branchItem) {
      return sendResponse(res, 404, "Failed", {
        message: "Branch not found",
      });
    }

    await Branch.findByIdAndDelete(id);

    sendResponse(res, 200, "Success", {
      message: "Branch deleted successfully!",
      statusCode: 200,
    });
  } catch (error) {
    console.error(error);
    sendResponse(res, 500, "Failed", {
      message: error.message || "Internal server error",
    });
  }
});

module.exports = branchController;
