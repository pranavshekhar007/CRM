const express = require("express");
const { sendResponse } = require("../utils/common");
require("dotenv").config();
const LeaveApplication = require("../model/leaveApplication.schema");
const cloudinary = require("../utils/cloudinary");
const upload = require("../utils/multer");
const leaveApplicationController = express.Router();
const auth = require("../utils/auth");

leaveApplicationController.post(
  "/create",
  upload.single("attachment"),
  async (req, res) => {
    try {
      const { employee, leaveType, startDate, endDate, reason } = req.body;

      let uploadedFileUrl = null;
      if (req.file) {
        const uploadedFile = await cloudinary.uploader.upload(req.file.path, {
          folder: "leave_attachments",
        });
        uploadedFileUrl = uploadedFile.secure_url;
      }

      const leaveApplication = await LeaveApplication.create({
        employee,
        leaveType,
        startDate,
        endDate,
        reason,
        attachment: uploadedFileUrl,
      });

      sendResponse(res, 200, "Success", {
        message: "Leave application submitted successfully!",
        data: leaveApplication,
        statusCode: 200,
      });
    } catch (error) {
      console.error(error);
      sendResponse(res, 500, "Failed", {
        message: error.message || "Internal server error",
      });
    }
  }
);

leaveApplicationController.post("/list", async (req, res) => {
  try {
    const {
      employee,
      status,
      searchKey = "",
      pageNo = 1,
      pageCount = 10,
      sortByField,
      sortByOrder,
    } = req.body;

    const query = {};
    if (employee) query.employee = employee;
    if (status) query.status = status;
    if (searchKey) {
      query.reason = { $regex: searchKey, $options: "i" };
    }

    const sortField = sortByField || "createdAt";
    const sortOrder = sortByOrder === "asc" ? 1 : -1;
    const sortOption = { [sortField]: sortOrder };

    const leaveApplications = await LeaveApplication.find(query)
      .populate("employee", "fullName email")
      .populate("leaveType", "leaveType color isPaid")
      .sort(sortOption)
      .limit(parseInt(pageCount))
      .skip((pageNo - 1) * parseInt(pageCount));

    const totalCount = await LeaveApplication.countDocuments(query);

    sendResponse(res, 200, "Success", {
      message: "Leave applications retrieved successfully!",
      data: leaveApplications,
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

leaveApplicationController.put(
  "/update",
  upload.single("attachment"),
  async (req, res) => {
    try {
      const id = req.body._id;

      const existingLeave = await LeaveApplication.findById(id);
      if (!existingLeave) {
        return sendResponse(res, 404, "Failed", {
          message: "Leave application not found",
        });
      }

      let uploadedFileUrl = existingLeave.attachment;
      if (req.file) {
        const uploadedFile = await cloudinary.uploader.upload(req.file.path, {
          folder: "leave_attachments",
        });
        uploadedFileUrl = uploadedFile.secure_url;
      }

      const updatedLeave = await LeaveApplication.findByIdAndUpdate(
        id,
        { ...req.body, attachment: uploadedFileUrl },
        { new: true }
      )
        .populate("employee", "name email")
        .populate("leaveType", "leaveType color isPaid");

      sendResponse(res, 200, "Success", {
        message: "Leave application updated successfully!",
        data: updatedLeave,
        statusCode: 200,
      });
    } catch (error) {
      console.error(error);
      sendResponse(res, 500, "Failed", {
        message: error.message || "Internal server error",
      });
    }
  }
);

leaveApplicationController.delete("/delete/:id", async (req, res) => {
  try {
    const { id } = req.params;

    const leaveApplication = await LeaveApplication.findById(id);
    if (!leaveApplication) {
      return sendResponse(res, 404, "Failed", {
        message: "Leave application not found",
      });
    }

    await LeaveApplication.findByIdAndDelete(id);

    sendResponse(res, 200, "Success", {
      message: "Leave application deleted successfully!",
      statusCode: 200,
    });
  } catch (error) {
    console.error(error);
    sendResponse(res, 500, "Failed", {
      message: error.message || "Internal server error",
    });
  }
});

// Update Leave Application Status (Approved / Rejected / Pending)
leaveApplicationController.put("/update-status/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const { status } = req.body;
  
      if (!["Pending", "Approved", "Rejected"].includes(status)) {
        return sendResponse(res, 400, "Failed", {
          message: "Invalid status. Use 'Pending', 'Approved', or 'Rejected'.",
        });
      }
  
      const leaveApplication = await LeaveApplication.findById(id);
      if (!leaveApplication) {
        return sendResponse(res, 404, "Failed", {
          message: "Leave application not found",
        });
      }
  
      leaveApplication.status = status;
      await leaveApplication.save();
  
      sendResponse(res, 200, "Success", {
        message: `Leave application status updated to ${status} successfully!`,
        data: leaveApplication,
        statusCode: 200,
      });
    } catch (error) {
      console.error("Update Leave Status Error:", error);
      sendResponse(res, 500, "Failed", {
        message: error.message || "Internal server error",
      });
    }
  });
  

module.exports = leaveApplicationController;
