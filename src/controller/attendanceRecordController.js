const express = require("express");
const { sendResponse } = require("../utils/common");
require("dotenv").config();
const AttendanceRecord = require("../model/attendanceRecord.schema");
const attendanceRecordController = express.Router();
const auth = require("../utils/auth");

attendanceRecordController.post("/create", async (req, res) => {
    try {
      const { inTime, outTime, breakHours = 0 } = req.body;
  
      let totalHours = 0;
  
      // Calculate total working time if inTime and outTime are provided
      if (inTime && outTime) {
        const [inH, inM] = inTime.split(":").map(Number);
        const [outH, outM] = outTime.split(":").map(Number);
  
        const inMinutes = inH * 60 + inM;
        const outMinutes = outH * 60 + outM;
  
        let diff = outMinutes - inMinutes;
  
        if (diff < 0) diff += 24 * 60; 
  
        totalHours = diff / 60 - breakHours;
        if (totalHours < 0) totalHours = 0;
      }
  
      const recordCreated = await AttendanceRecord.create({
        ...req.body,
        totalHours: totalHours.toFixed(2),
      });
  
      sendResponse(res, 200, "Success", {
        message: "Attendance Record created successfully!",
        data: recordCreated,
        statusCode: 200,
      });
    } catch (error) {
      console.error("Attendance Record Create Error:", error);
      sendResponse(res, 500, "Failed", { message: error.message });
    }
  });
  

attendanceRecordController.post("/list", async (req, res) => {
  try {
    const {
      searchKey = "",
      employee,
      status,
      fromDate,
      toDate,
      pageNo = 1,
      pageCount = 10,
      sortByField,
      sortByOrder,
    } = req.body;

    const query = {};
    if (employee) query.employee = employee;
    if (status) query.status = status;
    if (fromDate && toDate) {
      query.date = { $gte: new Date(fromDate), $lte: new Date(toDate) };
    }

    if (searchKey) {
      query.$or = [
        { notes: { $regex: searchKey, $options: "i" } },
      ];
    }

    const sortField = sortByField || "date";
    const sortOrder = sortByOrder === "asc" ? 1 : -1;
    const sortOption = { [sortField]: sortOrder };

    const records = await AttendanceRecord.find(query)
      .populate("employee", "fullName employeeCode department")
      .sort(sortOption)
      .limit(parseInt(pageCount))
      .skip((pageNo - 1) * parseInt(pageCount));

    const totalCount = await AttendanceRecord.countDocuments(query);

    sendResponse(res, 200, "Success", {
      message: "Attendance Records retrieved successfully!",
      data: records,
      total: totalCount,
      statusCode: 200,
    });
  } catch (error) {
    console.error("Attendance Record List Error:", error);
    sendResponse(res, 500, "Failed", { message: error.message });
  }
});

attendanceRecordController.put("/update", async (req, res) => {
  try {
    const id = req.body._id;
    const recordData = await AttendanceRecord.findById(id);

    if (!recordData) {
      return sendResponse(res, 404, "Failed", { message: "Attendance Record not found" });
    }

    const updatedRecord = await AttendanceRecord.findByIdAndUpdate(id, req.body, { new: true });

    sendResponse(res, 200, "Success", {
      message: "Attendance Record updated successfully!",
      data: updatedRecord,
      statusCode: 200,
    });
  } catch (error) {
    console.error("Attendance Record Update Error:", error);
    sendResponse(res, 500, "Failed", { message: error.message });
  }
});

attendanceRecordController.delete("/delete/:id", async (req, res) => {
  try {
    const { id } = req.params;

    const recordItem = await AttendanceRecord.findById(id);
    if (!recordItem) {
      return sendResponse(res, 404, "Failed", { message: "Attendance Record not found" });
    }

    await AttendanceRecord.findByIdAndDelete(id);

    sendResponse(res, 200, "Success", {
      message: "Attendance Record deleted successfully!",
      statusCode: 200,
    });
  } catch (error) {
    console.error("Attendance Record Delete Error:", error);
    sendResponse(res, 500, "Failed", { message: error.message });
  }
});

module.exports = attendanceRecordController;
