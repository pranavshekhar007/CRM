const express = require("express");
const { sendResponse } = require("../utils/common");
const Complaint = require("../model/complaint.schema");
const Employee = require("../model/employee.schema");
const complaintController = express.Router();
const cloudinary = require("../utils/cloudinary");
const upload = require("../utils/multer");

complaintController.post(
  "/create",
  upload.single("documents"),
  async (req, res) => {
    try {
      const { employee, against, submitAnonymously } = req.body;

      const employeeExists =
        submitAnonymously || (await Employee.findById(employee));
      const againstExists = await Employee.findById(against);

      if (!employeeExists)
        return sendResponse(res, 400, "Failed", {
          message: "Invalid employee ID",
        });
      if (!againstExists)
        return sendResponse(res, 400, "Failed", {
          message: "Invalid against employee ID",
        });

      const complaintData = { ...req.body };

      // Handle file upload if present
      if (req.file) {
        const uploadedDoc = await cloudinary.uploader.upload(req.file.path, {
          folder: "complaints",
        });
        complaintData.documents = {
          fileUrl: uploadedDoc.secure_url,
          fileName: req.file.originalname,
        };
      }

      const createdComplaint = await Complaint.create(complaintData);

      sendResponse(res, 200, "Success", {
        message: "Complaint submitted successfully",
        data: createdComplaint,
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


complaintController.post("/list", async (req, res) => {
  try {
    const { searchKey = "", pageNo = 1, pageCount = 10, status } = req.body;

    const query = {};
    if (status) query.status = status;
    if (searchKey) {
      query.$or = [
        { subject: { $regex: searchKey, $options: "i" } },
        { description: { $regex: searchKey, $options: "i" } },
      ];
    }

    const complaints = await Complaint.find(query)
      .populate("employee", "fullName email")
      .populate("against", "fullName email")
      .populate("assignedTo", "fullName email")
      .limit(parseInt(pageCount))
      .skip((pageNo - 1) * parseInt(pageCount))
      .sort({ createdAt: -1 });

    const totalCount = await Complaint.countDocuments(query);

    sendResponse(res, 200, "Success", {
      message: "Complaint list retrieved successfully",
      data: complaints,
      total: totalCount,
      statusCode: 200,
    });
  } catch (error) {
    sendResponse(res, 500, "Failed", { message: error.message });
  }
});

complaintController.put(
  "/update/:id",
  upload.single("documents"),
  async (req, res) => {
    try {
      const { id } = req.params;
      const complaint = await Complaint.findById(id);
      if (!complaint)
        return sendResponse(res, 404, "Failed", {
          message: "Complaint not found",
        });

      const updatedData = { ...req.body };

      if (req.file) {
        const uploadedDoc = await cloudinary.uploader.upload(req.file.path, {
          folder: "complaints",
        });
        updatedData.documents = {
          fileUrl: uploadedDoc.secure_url,
          fileName: req.file.originalname,
        };
      }

      const updatedComplaint = await Complaint.findByIdAndUpdate(id, updatedData, {
        new: true,
      });

      sendResponse(res, 200, "Success", {
        message: "Complaint updated successfully",
        data: updatedComplaint,
        statusCode: 200,
      });
    } catch (error) {
      console.error(error);
      sendResponse(res, 500, "Failed", { message: error.message });
    }
  }
);


complaintController.put("/change-status/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const complaint = await Complaint.findById(id);
    if (!complaint)
      return sendResponse(res, 404, "Failed", { message: "Complaint not found" });

    if (status) complaint.status = status;

    const updatedComplaint = await complaint.save();

    sendResponse(res, 200, "Success", {
      message: "Complaint status updated",
      data: updatedComplaint,
      statusCode: 200,
    });
  } catch (error) {
    sendResponse(res, 500, "Failed", { message: error.message });
  }
});

complaintController.put("/assign/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { assignedTo, resolutionDeadline } = req.body;

    const complaint = await Complaint.findById(id);
    if (!complaint)
      return sendResponse(res, 404, "Failed", { message: "Complaint not found" });

    complaint.assignedTo = assignedTo;
    complaint.resolutionDeadline = resolutionDeadline;
    complaint.status = "Under Investigation";

    const updatedComplaint = await complaint.save();

    sendResponse(res, 200, "Success", {
      message: "Complaint assigned successfully",
      data: updatedComplaint,
      statusCode: 200,
    });
  } catch (error) {
    sendResponse(res, 500, "Failed", { message: error.message });
  }
});

complaintController.put("/resolve/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const {
      resolutionType,
      investigationNotes,
      resolutionAction,
      resolutionDate,
      followUpAction,
      followUpDate,
    } = req.body;

    const complaint = await Complaint.findById(id);
    if (!complaint)
      return sendResponse(res, 404, "Failed", { message: "Complaint not found" });

    complaint.resolutionType = resolutionType;
    complaint.investigationNotes = investigationNotes;
    complaint.resolutionAction = resolutionAction;
    complaint.resolutionDate = resolutionDate;
    complaint.followUpAction = followUpAction;
    complaint.followUpDate = followUpDate;
    complaint.status = resolutionType === "Resolved" ? "Resolved" : "Dismissed";

    const updatedComplaint = await complaint.save();

    sendResponse(res, 200, "Success", {
      message: "Complaint resolved successfully",
      data: updatedComplaint,
      statusCode: 200,
    });
  } catch (error) {
    sendResponse(res, 500, "Failed", { message: error.message });
  }
});

complaintController.put("/update-followup/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { followUpAction, followUpDate, followUpFeedback } = req.body;

    const complaint = await Complaint.findById(id);
    if (!complaint)
      return sendResponse(res, 404, "Failed", { message: "Complaint not found" });

    if (followUpAction) complaint.followUpAction = followUpAction;
    if (followUpDate) complaint.followUpDate = followUpDate;
    if (followUpFeedback) complaint.followUpFeedback = followUpFeedback;

    const updatedComplaint = await complaint.save();

    sendResponse(res, 200, "Success", {
      message: "Complaint follow-up updated",
      data: updatedComplaint,
      statusCode: 200,
    });
  } catch (error) {
    sendResponse(res, 500, "Failed", { message: error.message });
  }
});

complaintController.delete("/delete/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const complaint = await Complaint.findById(id);
    if (!complaint)
      return sendResponse(res, 404, "Failed", { message: "Complaint not found" });

    await Complaint.findByIdAndDelete(id);

    sendResponse(res, 200, "Success", {
      message: "Complaint deleted successfully",
      statusCode: 200,
    });
  } catch (error) {
    sendResponse(res, 500, "Failed", { message: error.message });
  }
});

module.exports = complaintController;
