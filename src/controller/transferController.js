const express = require("express");
const { sendResponse } = require("../utils/common");
const Transfer = require("../model/transfer.schema");
const Employee = require("../model/employee.schema");
const Branch = require("../model/branch.schema");
const Department = require("../model/department.schema");
const Designation = require("../model/designation.schema");
const cloudinary = require("../utils/cloudinary");
const upload = require("../utils/multer"); 

const transferController = express.Router();

transferController.post("/create", upload.single("document"), async (req, res) => {
  try {
    const { employee, toBranch, toDepartment, toDesignation, transferDate, effectiveDate, reason } = req.body;

    const employeeExists = await Employee.findById(employee)
      .populate("branch department designation");
    if (!employeeExists)
      return sendResponse(res, 400, "Failed", { message: "Invalid employee ID" });

    const branchExists = await Branch.findById(toBranch);
    const departmentExists = await Department.findById(toDepartment);
    const designationExists = await Designation.findById(toDesignation);

    if (!branchExists) return sendResponse(res, 400, "Failed", { message: "Invalid branch ID" });
    if (!departmentExists) return sendResponse(res, 400, "Failed", { message: "Invalid department ID" });
    if (!designationExists) return sendResponse(res, 400, "Failed", { message: "Invalid designation ID" });

    let document = {};
    if (req.file) {
      const result = await cloudinary.uploader.upload(req.file.path, { folder: "transfer_documents" });
      document = { fileUrl: result.secure_url, fileName: req.file.originalname };
    }

    // ✅ Create transfer
    const newTransfer = await Transfer.create({
      employee,
      fromBranch: employeeExists.branch,
      fromDepartment: employeeExists.department,
      fromDesignation: employeeExists.designation,
      toBranch,
      toDepartment,
      toDesignation,
      transferDate,
      effectiveDate,
      reason,
      document,
    });

    sendResponse(res, 200, "Success", {
      message: "Transfer request created successfully",
      data: newTransfer,
    });
  } catch (error) {
    sendResponse(res, 500, "Failed", { message: error.message });
  }
});




transferController.post("/list", async (req, res) => {
  try {
    const { searchKey = "", pageNo = 1, pageCount = 10, status } = req.body;

    const query = {};
    if (status) query.status = status;
    if (searchKey) {
      query.$or = [
        { reason: { $regex: searchKey, $options: "i" } },
      ];
    }

    const transfers = await Transfer.find(query)
      .populate("employee", "fullName email")
      .populate("fromBranch", "branchName")
      .populate("toBranch", "branchName")
      .populate("fromDepartment", "name")
      .populate("toDepartment", "name")
      .populate("fromDesignation", "name")
      .populate("toDesignation", "name")
      .limit(parseInt(pageCount))
      .skip((pageNo - 1) * parseInt(pageCount))
      .sort({ createdAt: -1 });

    const total = await Transfer.countDocuments(query);

    sendResponse(res, 200, "Success", {
      message: "Transfer list fetched successfully",
      data: transfers,
      total,
      statusCode: 200,
    });
  } catch (error) {
    sendResponse(res, 500, "Failed", { message: error.message });
  }
});


transferController.put("/update/:id", upload.single("document"), async (req, res) => {
  try {
    const { id } = req.params;
    const transfer = await Transfer.findById(id);
    if (!transfer) return sendResponse(res, 404, "Failed", { message: "Transfer not found" });

    // ✅ Handle single file upload (replace existing)
    if (req.file) {
      const result = await cloudinary.uploader.upload(req.file.path, { folder: "transfer_documents" });
      transfer.document = { fileUrl: result.secure_url, fileName: req.file.originalname };
    }

    // Update other fields
    const { employee, branch, toDepartment, toDesignation, transferDate, effectiveDate, reason, status } = req.body;
    if (employee) transfer.employee = employee;
    if (branch) transfer.branch = branch;
    if (toDepartment) transfer.toDepartment = toDepartment;
    if (toDesignation) transfer.toDesignation = toDesignation;
    if (transferDate) transfer.transferDate = transferDate;
    if (effectiveDate) transfer.effectiveDate = effectiveDate;
    if (reason) transfer.reason = reason;
    if (status) transfer.status = status;

    const updatedTransfer = await transfer.save();

    sendResponse(res, 200, "Success", {
      message: "Transfer details updated successfully",
      data: updatedTransfer,
      statusCode: 200,
    });
  } catch (error) {
    sendResponse(res, 500, "Failed", { message: error.message });
  }
});


transferController.put("/change-status/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!["Pending", "Approved", "Rejected"].includes(status))
      return sendResponse(res, 400, "Failed", { message: "Invalid status" });

    const transfer = await Transfer.findById(id)
      .populate("employee fromBranch fromDepartment fromDesignation toBranch toDepartment toDesignation");

    if (!transfer)
      return sendResponse(res, 404, "Failed", { message: "Transfer not found" });

    // Only update employee details if Approved
    if (status === "Approved") {
      const employee = transfer.employee;

      // Update employee current branch/department/designation
      employee.branch = transfer.toBranch;
      employee.department = transfer.toDepartment;
      employee.designation = transfer.toDesignation;

      // Add transfer to employee's transfers array if not already present
      if (!employee.transfers.includes(transfer._id)) {
        employee.transfers.push(transfer._id);
      }

      await employee.save();
    }

    // Update transfer status
    transfer.status = status;
    const updatedTransfer = await transfer.save();

    sendResponse(res, 200, "Success", {
      message: `Transfer status updated to ${status} successfully`,
      data: updatedTransfer,
      statusCode: 200,
    });
  } catch (error) {
    sendResponse(res, 500, "Failed", { message: error.message });
  }
});


// ✅ Delete Transfer
transferController.delete("/delete/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const transfer = await Transfer.findById(id);
    if (!transfer)
      return sendResponse(res, 404, "Failed", { message: "Transfer not found" });

    await Transfer.findByIdAndDelete(id);

    sendResponse(res, 200, "Success", {
      message: "Transfer deleted successfully",
      statusCode: 200,
    });
  } catch (error) {
    sendResponse(res, 500, "Failed", { message: error.message });
  }
});

module.exports = transferController;
