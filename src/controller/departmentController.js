const express = require("express");
const { sendResponse } = require("../utils/common");
const Department = require("../model/department.schema");
const auth = require("../utils/auth");

const departmentController = express.Router();

departmentController.post("/create", async (req, res) => {
  try {
    const departmentCreated = await Department.create(req.body);

    sendResponse(res, 200, "Success", {
      message: "Department created successfully!",
      data: departmentCreated,
      statusCode: 200,
    });
  } catch (error) {
    console.error(error);
    sendResponse(res, 500, "Failed", {
      message: error.message || "Internal server error",
    });
  }
});

departmentController.post("/list", async (req, res) => {
  try {
    const {
      searchKey = "",
      status,
      pageNo = 1,
      pageCount = 10,
      sortByField,
      sortByOrder,
      branch,
    } = req.body;

    const query = {};
    if (status) query.status = status;
    if (branch) query.branch = branch;
    if (searchKey) query.name = { $regex: searchKey, $options: "i" };

    const sortField = sortByField || "createdAt";
    const sortOrder = sortByOrder === "asc" ? 1 : -1;
    const sortOption = { [sortField]: sortOrder };

    const departmentList = await Department.find(query)
      .populate("branch")
      .sort(sortOption)
      .limit(parseInt(pageCount))
      .skip((pageNo - 1) * parseInt(pageCount));

    const totalCount = await Department.countDocuments(query);

    sendResponse(res, 200, "Success", {
      message: "Department list retrieved successfully!",
      data: departmentList,
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

departmentController.put("/update", async (req, res) => {
  try {
    const id = req.body._id;

    const departmentData = await Department.findById(id);
    if (!departmentData) {
      return sendResponse(res, 404, "Failed", {
        message: "Department not found",
      });
    }

    const updatedDepartment = await Department.findByIdAndUpdate(id, req.body, {
      new: true,
    });

    sendResponse(res, 200, "Success", {
      message: "Department updated successfully!",
      data: updatedDepartment,
      statusCode: 200,
    });
  } catch (error) {
    console.error(error);
    sendResponse(res, 500, "Failed", {
      message: error.message || "Internal server error",
    });
  }
});

departmentController.delete("/delete/:id", async (req, res) => {
  try {
    const { id } = req.params;

    const departmentItem = await Department.findById(id);
    if (!departmentItem) {
      return sendResponse(res, 404, "Failed", {
        message: "Department not found",
      });
    }

    await Department.findByIdAndDelete(id);

    sendResponse(res, 200, "Success", {
      message: "Department deleted successfully!",
      statusCode: 200,
    });
  } catch (error) {
    console.error(error);
    sendResponse(res, 500, "Failed", {
      message: error.message || "Internal server error",
    });
  }
});

departmentController.get("/by-branch/:branchId", async (req, res) => {
  try {
    const { branchId } = req.params;

    if (!branchId) {
      return sendResponse(res, 400, "Failed", {
        message: "Branch ID is required",
      });
    }

    const departments = await Department.find({ branch: branchId, status: true })
      .populate("branch", "branchName")
      .sort({ createdAt: -1 });

    if (!departments.length) {
      return sendResponse(res, 404, "Failed", {
        message: "No departments found for this branch",
      });
    }

    sendResponse(res, 200, "Success", {
      message: "Departments fetched successfully!",
      data: departments,
      statusCode: 200,
    });
  } catch (error) {
    console.error("Error in getDepartmentsByBranch:", error);
    sendResponse(res, 500, "Failed", {
      message: error.message || "Internal server error",
    });
  }
});

module.exports = departmentController;
