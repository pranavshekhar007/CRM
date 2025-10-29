const express = require("express");
const { sendResponse } = require("../utils/common");
require("dotenv").config();
const Designation = require("../model/designation.schema");
const auth = require("../utils/auth");

const designationController = express.Router();

designationController.post("/create", async (req, res) => {
  try {
    const { name, department } = req.body;

    if (!department) {
      return sendResponse(res, 400, "Failed", { message: "Department is required" });
    }

    const designationCreated = await Designation.create(req.body);

    sendResponse(res, 200, "Success", {
      message: "Designation created successfully!",
      data: designationCreated,
      statusCode: 200,
    });
  } catch (error) {
    console.error(error);
    sendResponse(res, 500, "Failed", {
      message: error.message || "Internal server error",
    });
  }
});


designationController.post("/list", async (req, res) => {
  try {
    const {
      searchKey = "",
      status,
      department,
      pageNo = 1,
      pageCount = 10,
      sortByField,
      sortByOrder,
    } = req.body;

    const query = {};
    if (status !== undefined) query.status = status;
    if (department) query.department = department;
    if (searchKey) query.name = { $regex: searchKey, $options: "i" };

    const sortField = sortByField || "createdAt";
    const sortOrder = sortByOrder === "asc" ? 1 : -1;
    const sortOption = { [sortField]: sortOrder };

    const designationList = await Designation.find(query)
    .populate({
      path: "department",
      populate: {
        path: "branch",
        select: "branchName",
      },
    })
      .sort(sortOption)
      .limit(parseInt(pageCount))
      .skip((pageNo - 1) * parseInt(pageCount));

    const totalCount = await Designation.countDocuments(query);

    sendResponse(res, 200, "Success", {
      message: "Designation list retrieved successfully!",
      data: designationList,
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

designationController.put("/update", async (req, res) => {
  try {
    const id = req.body._id;

    const designationData = await Designation.findById(id);
    if (!designationData) {
      return sendResponse(res, 404, "Failed", { message: "Designation not found" });
    }

    const updatedDesignation = await Designation.findByIdAndUpdate(id, req.body, {
      new: true,
    }).populate("department");

    sendResponse(res, 200, "Success", {
      message: "Designation updated successfully!",
      data: updatedDesignation,
      statusCode: 200,
    });
  } catch (error) {
    console.error(error);
    sendResponse(res, 500, "Failed", {
      message: error.message || "Internal server error",
    });
  }
});

designationController.delete("/delete/:id", async (req, res) => {
  try {
    const { id } = req.params;

    const designationItem = await Designation.findById(id);
    if (!designationItem) {
      return sendResponse(res, 404, "Failed", {
        message: "Designation not found",
      });
    }

    await Designation.findByIdAndDelete(id);

    sendResponse(res, 200, "Success", {
      message: "Designation deleted successfully!",
      statusCode: 200,
    });
  } catch (error) {
    console.error(error);
    sendResponse(res, 500, "Failed", {
      message: error.message || "Internal server error",
    });
  }
});

// ✅ Get Designations by Department ID
designationController.get("/by-department/:departmentId", async (req, res) => {
  try {
    const { departmentId } = req.params;

    if (!departmentId) {
      return sendResponse(res, 400, "Failed", {
        message: "Department ID is required",
      });
    }

    const designations = await Designation.find({ department: departmentId, status: true })
      .populate({
        path: "department",
        populate: {
          path: "branch",
          select: "branchName",
        },
      })
      .sort({ createdAt: -1 });

    if (!designations.length) {
      return sendResponse(res, 404, "Failed", {
        message: "No designations found for this department",
      });
    }

    sendResponse(res, 200, "Success", {
      message: "Designations fetched successfully!",
      data: designations,
      statusCode: 200,
    });
  } catch (error) {
    console.error("Error in getDesignationsByDepartment:", error);
    sendResponse(res, 500, "Failed", {
      message: error.message || "Internal server error",
    });
  }
});


module.exports = designationController;
