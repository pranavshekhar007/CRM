const express = require("express");
const { sendResponse } = require("../utils/common");
const bcrypt = require("bcryptjs");
require("dotenv").config();
const Employee = require("../model/employee.schema");
const employeeController = express.Router();
const cloudinary = require("../utils/cloudinary");
const upload = require("../utils/multer");
const auth = require("../utils/auth");

employeeController.post(
  "/create",
  upload.fields([
    { name: "profileImage", maxCount: 1 },
    { name: "documents", maxCount: 10 },
  ]),
  async (req, res) => {
    try {
      const body = req.body;

      if (req.files?.profileImage) {
        const uploaded = await cloudinary.uploader.upload(
          req.files.profileImage[0].path
        );
        body.profileImage = uploaded.url;
      }

      let documents = [];
      if (req.files?.documents?.length > 0 && req.body.documentsData) {
        const documentsData = JSON.parse(req.body.documentsData); // array of metadata

        for (let i = 0; i < req.files.documents.length; i++) {
          const fileUploaded = await cloudinary.uploader.upload(
            req.files.documents[i].path
          );
          documents.push({
            documentType: documentsData[i].documentType,
            fileUrl: fileUploaded.url,
            expiryDate: documentsData[i].expiryDate,
          });
        }
      }

      if (body.password) {
        const salt = await bcrypt.genSalt(10);
        body.password = await bcrypt.hash(body.password, salt);
      }

      const employeeCreated = await Employee.create({ ...body, documents });

      sendResponse(res, 200, "Success", {
        message: "Employee created successfully!",
        data: employeeCreated,
        statusCode: 200,
      });
    } catch (error) {
      console.error("Employee create error:", error);
      sendResponse(res, 500, "Failed", {
        message: error.message || "Internal server error",
      });
    }
  }
);

employeeController.post("/list", async (req, res) => {
  try {
    const {
      searchKey = "",
      branch,
      department,
      designation,
      employmentStatus,
      pageNo = 1,
      pageCount = 10,
      sortByField,
      sortByOrder,
    } = req.body;

    const query = {};
    if (branch) query.branch = branch;
    if (department) query.department = department;
    if (designation) query.designation = designation;
    if (employmentStatus) query.employmentStatus = employmentStatus;
    if (searchKey) query.fullName = { $regex: searchKey, $options: "i" };

    const sortField = sortByField || "createdAt";
    const sortOrder = sortByOrder === "asc" ? 1 : -1;
    const sortOption = { [sortField]: sortOrder };

    const employeeList = await Employee.find(query)
      .populate("branch department designation documents.documentType")
      .sort(sortOption)
      .limit(parseInt(pageCount))
      .skip((pageNo - 1) * parseInt(pageCount));

    const totalCount = await Employee.countDocuments(query);

    sendResponse(res, 200, "Success", {
      message: "Employee list retrieved successfully!",
      data: employeeList,
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

employeeController.put(
  "/update",
  upload.fields([
    { name: "profileImage", maxCount: 1 },
    { name: "documents", maxCount: 10 },
  ]),
  async (req, res) => {
    try {
      const id = req.params.id || req.body._id;
      const employeeData = await Employee.findById(id);
      if (!employeeData) {
        return sendResponse(res, 404, "Failed", { message: "Employee not found" });
      }

      if (req.files?.profileImage) {
        const uploaded = await cloudinary.uploader.upload(req.files.profileImage[0].path);
        req.body.profileImage = uploaded.url;
      }
      const currentDocs = employeeData.documents || [];
      const updatedDocs = [...currentDocs];

      if (req.files?.documents?.length > 0 && req.body.documentsData) {
        const documentsData = JSON.parse(req.body.documentsData);
      
        let fileIndex = 0; // To match files with documentData
        for (let i = 0; i < documentsData.length; i++) {
          const docData = documentsData[i];
      
          let uploadedUrl = docData.documentUrl || null;
          if (docData.file || req.files.documents[fileIndex]) {
            const file = req.files.documents[fileIndex];
            const uploaded = await cloudinary.uploader.upload(file.path);
            uploadedUrl = uploaded.url;
            fileIndex++;
          }
      
          // Push every document as new if _id is null
          if (!docData._id) {
            updatedDocs.push({
              documentType: docData.documentType,
              fileUrl: uploadedUrl,
              expiryDate: docData.expiryDate,
            });
          } else {
            // Update existing document
            const existingIndex = updatedDocs.findIndex(
              (doc) => doc._id.toString() === docData._id
            );
            if (existingIndex !== -1) {
              updatedDocs[existingIndex] = {
                ...updatedDocs[existingIndex].toObject(),
                fileUrl: uploadedUrl,
                expiryDate: docData.expiryDate,
              };
            }
          }
        }
      }
      

      req.body.documents = updatedDocs;

      // --------------------------
      // Handle password hash
      // --------------------------
      if (req.body.password) {
        const salt = await bcrypt.genSalt(10);
        req.body.password = await bcrypt.hash(req.body.password, salt);
      }

      // --------------------------
      // Update employee
      // --------------------------
      const updatedEmployee = await Employee.findByIdAndUpdate(id, req.body, { new: true });
      sendResponse(res, 200, "Success", {
        message: "Employee updated successfully!",
        data: updatedEmployee,
        statusCode: 200,
      });
    } catch (error) {
      console.error("Employee update error:", error);
      sendResponse(res, 500, "Failed", { message: error.message || "Internal server error" });
    }
  }
);


employeeController.put("/reset-password", async (req, res) => {
  try {
    const { employeeId, newPassword, confirmPassword } = req.body;

    if (!employeeId || !newPassword || !confirmPassword) {
      return sendResponse(res, 422, "Failed", {
        message: "employeeId, newPassword and confirmPassword are required",
      });
    }

    if (newPassword !== confirmPassword) {
      return sendResponse(res, 422, "Failed", {
        message: "Passwords do not match",
      });
    }

    const employee = await Employee.findById(employeeId);
    if (!employee) {
      return sendResponse(res, 404, "Failed", { message: "Employee not found" });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    employee.password = hashedPassword;
    await employee.save();

    sendResponse(res, 200, "Success", {
      message: "Password updated successfully",
      data: {
        _id: employee._id,
        fullName: employee.fullName,
        email: employee.email,
      },
    });
  } catch (error) {
    console.error(error);
    sendResponse(res, 500, "Failed", { message: error.message });
  }
});



employeeController.delete("/delete/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const employeeItem = await Employee.findById(id);
    if (!employeeItem)
      return sendResponse(res, 404, "Failed", {
        message: "Employee not found",
      });

    await Employee.findByIdAndDelete(id);

    sendResponse(res, 200, "Success", {
      message: "Employee deleted successfully!",
      statusCode: 200,
    });
  } catch (error) {
    sendResponse(res, 500, "Failed", {
      message: error.message || "Internal server error",
    });
  }
});

employeeController.delete(
  "/delete-document/:employeeId/:documentTypeId",
  async (req, res) => {
    try {
      const { employeeId, documentTypeId } = req.params;

      const employee = await Employee.findById(employeeId);
      if (!employee) {
        return sendResponse(res, 404, "Failed", {
          message: "Employee not found",
        });
      }

      // Safely filter out documentType
      const filteredDocs = employee.documents.filter((doc) => {
        const docTypeId =
          doc?.documentType?._id?.toString?.() ||
          doc?.documentType?.toString?.() ||
          null;
        return docTypeId !== documentTypeId;
      });

      employee.documents = filteredDocs;
      await employee.save();

      sendResponse(res, 200, "Success", {
        message: "Document deleted successfully!",
        data: employee.documents,
        statusCode: 200,
      });
    } catch (error) {
      console.error("Delete document error:", error);
      sendResponse(res, 500, "Failed", {
        message: error.message || "Internal server error",
      });
    }
  }
);

employeeController.get("/details/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const employee = await Employee.findById(id)
      .populate("branch department designation documents.documentType transfers");

    if (!employee) {
      return sendResponse(res, 404, "Failed", { message: "Employee not found" });
    }

    sendResponse(res, 200, "Success", {
      message: "Employee details fetched successfully!",
      data: employee,
    });
  } catch (error) {
    sendResponse(res, 500, "Failed", { message: error.message });
  }
});



module.exports = employeeController;
