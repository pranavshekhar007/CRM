const express = require("express");
const { sendResponse } = require("../utils/common");
require("dotenv").config();
const Warning = require("../model/warning.schema");
const Employee = require("../model/employee.schema");
const warningController = express.Router();
const cloudinary = require("../utils/cloudinary");
const upload = require("../utils/multer");

warningController.post("/create", upload.single("document"), async (req, res) => {
  try {
    const { employee, warningBy, ...rest } = req.body;

    const employeeExists = await Employee.findById(employee);
    if (!employeeExists)
      return sendResponse(res, 400, "Failed", { message: "Invalid employee ID" });

    const warningByExists = await Employee.findById(warningBy);
    if (!warningByExists)
      return sendResponse(res, 400, "Failed", { message: "Invalid warningBy employee ID" });

    let documentData = {};
    if (req.file) {
      const result = await cloudinary.uploader.upload(req.file.path, {
        folder: "warnings",
      });
      documentData = { fileUrl: result.secure_url, fileName: req.file.originalname };
    }

    const createdWarning = await Warning.create({
      employee,
      warningBy,
      ...rest,
      document: documentData,
    });

    sendResponse(res, 200, "Success", {
      message: "Warning created successfully!",
      data: createdWarning,
      statusCode: 200,
    });
  } catch (error) {
    sendResponse(res, 500, "Failed", { message: error.message });
  }
});

warningController.post("/list", async (req, res) => {
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
        { subject: { $regex: searchKey, $options: "i" } },
        { description: { $regex: searchKey, $options: "i" } },
      ];
    }

    const sortField = sortByField || "createdAt";
    const sortOrder = sortByOrder === "asc" ? 1 : -1;
    const sortOption = { [sortField]: sortOrder };

    const warnings = await Warning.find(query)
      .populate("employee", "fullName email")
      .populate("warningBy", "fullName email")
      .sort(sortOption)
      .limit(parseInt(pageCount))
      .skip((pageNo - 1) * parseInt(pageCount));

    const totalCount = await Warning.countDocuments(query);

    sendResponse(res, 200, "Success", {
      message: "Warning list retrieved successfully!",
      data: warnings,
      total: totalCount,
      statusCode: 200,
    });
  } catch (error) {
    sendResponse(res, 500, "Failed", { message: error.message });
  }
});

warningController.put("/update", upload.single("document"), async (req, res) => {
  try {
    const { _id, ...rest } = req.body;

    const existingWarning = await Warning.findById(_id);
    if (!existingWarning)
      return sendResponse(res, 404, "Failed", { message: "Warning not found" });

    let documentData = existingWarning.document; // keep old document by default
    if (req.file) {
      const result = await cloudinary.uploader.upload(req.file.path, {
        folder: "warnings",
      });
      documentData = { fileUrl: result.secure_url, fileName: req.file.originalname };
    }

    const updatedWarning = await Warning.findByIdAndUpdate(
      _id,
      { ...rest, document: documentData },
      { new: true }
    );

    sendResponse(res, 200, "Success", {
      message: "Warning updated successfully!",
      data: updatedWarning,
      statusCode: 200,
    });
  } catch (error) {
    sendResponse(res, 500, "Failed", { message: error.message });
  }
});

warningController.put("/update-status/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { status, acknowledgementDate, employeeResponse } = req.body;

    const warning = await Warning.findById(id);
    if (!warning)
      return sendResponse(res, 404, "Failed", { message: "Warning not found" });

    warning.status = status || warning.status;
    warning.acknowledgementDate = acknowledgementDate || warning.acknowledgementDate;
    warning.employeeResponse = employeeResponse || warning.employeeResponse;

    const updatedWarning = await warning.save();

    sendResponse(res, 200, "Success", {
      message: "Warning status updated successfully!",
      data: updatedWarning,
      statusCode: 200,
    });
  } catch (error) {
    sendResponse(res, 500, "Failed", { message: error.message });
  }
});

warningController.delete("/delete/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const warning = await Warning.findById(id);
    if (!warning)
      return sendResponse(res, 404, "Failed", { message: "Warning not found" });

    await Warning.findByIdAndDelete(id);

    sendResponse(res, 200, "Success", {
      message: "Warning deleted successfully!",
      statusCode: 200,
    });
  } catch (error) {
    sendResponse(res, 500, "Failed", { message: error.message });
  }
});

module.exports = warningController;
