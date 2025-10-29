const express = require("express");
const { sendResponse } = require("../utils/common");
const MeetingType = require("../model/meetingType.schema");
require("dotenv").config();

const meetingTypeController = express.Router();

// ✅ Create Meeting Type
meetingTypeController.post("/create", async (req, res) => {
  try {
    const meetingType = await MeetingType.create(req.body);
    sendResponse(res, 200, "Success", {
      message: "Meeting type created successfully!",
      data: meetingType,
      statusCode: 200,
    });
  } catch (error) {
    sendResponse(res, 500, "Failed", { message: error.message });
  }
});

// ✅ List Meeting Types (search, pagination, sort)
meetingTypeController.post("/list", async (req, res) => {
  try {
    const {
      searchKey = "",
      pageNo = 1,
      pageCount = 10,
      sortByField,
      sortByOrder,
      status,
    } = req.body;

    const query = {};
    if (status !== undefined) query.status = status;

    if (searchKey) {
      query.$or = [
        { name: { $regex: searchKey, $options: "i" } },
        { description: { $regex: searchKey, $options: "i" } },
      ];
    }

    const sortField = sortByField || "createdAt";
    const sortOrder = sortByOrder === "asc" ? 1 : -1;

    const data = await MeetingType.find(query)
      .sort({ [sortField]: sortOrder })
      .skip((pageNo - 1) * parseInt(pageCount))
      .limit(parseInt(pageCount));

    const total = await MeetingType.countDocuments(query);

    sendResponse(res, 200, "Success", {
      message: "Meeting type list fetched successfully!",
      data,
      total,
      statusCode: 200,
    });
  } catch (error) {
    sendResponse(res, 500, "Failed", { message: error.message });
  }
});

// ✅ Get by ID
meetingTypeController.get("/get/:id", async (req, res) => {
  try {
    const meetingType = await MeetingType.findById(req.params.id);
    if (!meetingType)
      return sendResponse(res, 404, "Failed", { message: "Meeting type not found" });

    sendResponse(res, 200, "Success", {
      message: "Meeting type fetched successfully!",
      data: meetingType,
      statusCode: 200,
    });
  } catch (error) {
    sendResponse(res, 500, "Failed", { message: error.message });
  }
});

// ✅ Update Meeting Type
meetingTypeController.put("/update/:id", async (req, res) => {
  try {
    const meetingType = await MeetingType.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
    });
    if (!meetingType)
      return sendResponse(res, 404, "Failed", { message: "Meeting type not found" });

    sendResponse(res, 200, "Success", {
      message: "Meeting type updated successfully!",
      data: meetingType,
      statusCode: 200,
    });
  } catch (error) {
    sendResponse(res, 500, "Failed", { message: error.message });
  }
});

// ✅ Change Status
meetingTypeController.put("/change-status/:id", async (req, res) => {
  try {
    const { status } = req.body;
    const meetingType = await MeetingType.findById(req.params.id);
    if (!meetingType)
      return sendResponse(res, 404, "Failed", { message: "Meeting type not found" });

    meetingType.status = status;
    const updated = await meetingType.save();

    sendResponse(res, 200, "Success", {
      message: "Meeting type status updated successfully!",
      data: updated,
      statusCode: 200,
    });
  } catch (error) {
    sendResponse(res, 500, "Failed", { message: error.message });
  }
});

// ✅ Delete Meeting Type
meetingTypeController.delete("/delete/:id", async (req, res) => {
  try {
    const meetingType = await MeetingType.findByIdAndDelete(req.params.id);
    if (!meetingType)
      return sendResponse(res, 404, "Failed", { message: "Meeting type not found" });

    sendResponse(res, 200, "Success", {
      message: "Meeting type deleted successfully!",
      statusCode: 200,
    });
  } catch (error) {
    sendResponse(res, 500, "Failed", { message: error.message });
  }
});

module.exports = meetingTypeController;
