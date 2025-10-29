const express = require("express");
const { sendResponse } = require("../utils/common");
const Performance = require("../model/performance.schema");
const auth = require("../utils/auth");

const performanceController = express.Router();

performanceController.post("/add", auth, async (req, res) => {
  try {
    const { userId, reviewPeriod, goals, overallRating, remarks, approvedBy } = req.body;

    if (!userId || !reviewPeriod) {
      return sendResponse(res, 422, "Failed", { message: "userId and reviewPeriod are required" });
    }

    const performanceRecord = await Performance.create({
      userId,
      reviewPeriod,
      goals,
      overallRating,
      remarks,
      approvedBy,
    });

    sendResponse(res, 200, "Success", { message: "Performance record added", data: performanceRecord });
  } catch (error) {
    console.error(error);
    sendResponse(res, 500, "Failed", { message: error.message || "Internal server error" });
  }
});

performanceController.put("/update/:id", auth, async (req, res) => {
  try {
    const { id } = req.params;
    const updatedData = req.body;

    const updatedRecord = await Performance.findByIdAndUpdate(id, updatedData, { new: true });

    if (!updatedRecord) {
      return sendResponse(res, 404, "Failed", { message: "Performance record not found" });
    }

    sendResponse(res, 200, "Success", { message: "Performance record updated", data: updatedRecord });
  } catch (error) {
    console.error(error);
    sendResponse(res, 500, "Failed", { message: error.message || "Internal server error" });
  }
});

performanceController.get("/user/:userId", auth, async (req, res) => {
  try {
    const { userId } = req.params;
    const records = await Performance.find({ userId }).populate("approvedBy", "name email");

    sendResponse(res, 200, "Success", { message: "Performance records retrieved", data: records });
  } catch (error) {
    console.error(error);
    sendResponse(res, 500, "Failed", { message: error.message || "Internal server error" });
  }
});

performanceController.post("/list", auth, async (req, res) => {
  try {
    const { userId, reviewPeriod, pageNo = 1, pageCount = 10 } = req.body;

    const query = {};
    if (userId) query.userId = userId;
    if (reviewPeriod) query.reviewPeriod = reviewPeriod;

    const records = await Performance.find(query)
      .populate("userId", "name email department")
      .populate("approvedBy", "name email")
      .sort({ createdAt: -1 })
      .skip((pageNo - 1) * pageCount)
      .limit(parseInt(pageCount));

    const totalCount = await Performance.countDocuments(query);

    sendResponse(res, 200, "Success", {
      message: "Performance records list retrieved",
      data: records,
      total: totalCount,
    });
  } catch (error) {
    console.error(error);
    sendResponse(res, 500, "Failed", { message: error.message || "Internal server error" });
  }
});

performanceController.delete("/delete/:id", auth, async (req, res) => {
  try {
    const { id } = req.params;
    const record = await Performance.findById(id);

    if (!record) {
      return sendResponse(res, 404, "Failed", { message: "Performance record not found" });
    }

    await Performance.findByIdAndDelete(id);
    sendResponse(res, 200, "Success", { message: "Performance record deleted successfully" });
  } catch (error) {
    console.error(error);
    sendResponse(res, 500, "Failed", { message: error.message || "Internal server error" });
  }
});

module.exports = performanceController;
