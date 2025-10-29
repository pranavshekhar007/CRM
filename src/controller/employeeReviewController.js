const express = require("express");
const { sendResponse } = require("../utils/common");
const EmployeeReview = require("../model/employeeReview.schema");
require("dotenv").config();

const employeeReviewController = express.Router();

employeeReviewController.post("/create", async (req, res) => {
  try {
    const createdReview = await EmployeeReview.create(req.body);
    sendResponse(res, 200, "Success", {
      message: "Employee Review created successfully!",
      data: createdReview,
      statusCode: 200,
    });
  } catch (error) {
    sendResponse(res, 500, "Failed", { message: error.message });
  }
});

employeeReviewController.post("/list", async (req, res) => {
  try {
    const {
      searchKey = "",
      pageNo = 1,
      pageCount = 10,
      status,
      sortByField,
      sortByOrder,
    } = req.body;

    const query = {};
    if (status) query.status = status;
    if (searchKey) {
      query.$or = [
        { status: { $regex: searchKey, $options: "i" } },
      ];
    }

    const sortField = sortByField || "createdAt";
    const sortOrder = sortByOrder === "asc" ? 1 : -1;
    const sortOption = { [sortField]: sortOrder };

    const employeeReviews = await EmployeeReview.find(query)
      .populate("employee", "fullName email")
      .populate("reviewer", "fullName email")
      .populate("reviewCycle", "name frequency")
      .sort(sortOption)
      .limit(parseInt(pageCount))
      .skip((pageNo - 1) * parseInt(pageCount));

    const totalCount = await EmployeeReview.countDocuments(query);

    sendResponse(res, 200, "Success", {
      message: "Employee Review list retrieved successfully!",
      data: employeeReviews,
      total: totalCount,
      statusCode: 200,
    });
  } catch (error) {
    sendResponse(res, 500, "Failed", { message: error.message });
  }
});

employeeReviewController.put("/update", async (req, res) => {
  try {
    const id = req.body._id;
    const existingReview = await EmployeeReview.findById(id);
    if (!existingReview)
      return sendResponse(res, 404, "Failed", { message: "Employee Review not found" });

    const updatedReview = await EmployeeReview.findByIdAndUpdate(id, req.body, { new: true });

    sendResponse(res, 200, "Success", {
      message: "Employee Review updated successfully!",
      data: updatedReview,
      statusCode: 200,
    });
  } catch (error) {
    sendResponse(res, 500, "Failed", { message: error.message });
  }
});

employeeReviewController.delete("/delete/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const review = await EmployeeReview.findById(id);
    if (!review)
      return sendResponse(res, 404, "Failed", { message: "Employee Review not found" });

    await EmployeeReview.findByIdAndDelete(id);

    sendResponse(res, 200, "Success", {
      message: "Employee Review deleted successfully!",
      statusCode: 200,
    });
  } catch (error) {
    sendResponse(res, 500, "Failed", { message: error.message });
  }
});

module.exports = employeeReviewController;
