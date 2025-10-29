const express = require("express");
const { sendResponse } = require("../utils/common");
require("dotenv").config();
const Permission = require("../model/permission.schema");
const Role = require("../model/role.schema");
const roleController = express.Router();

roleController.post("/create", async (req, res) => {
  try {
    const { name, permissions, description } = req.body;

    if (!permissions || !permissions.length) {
      return sendResponse(res, 400, "Failed", {
        message: "At least one permission is required.",
      });
    }

    for (const item of permissions) {
      const perm = await Permission.findById(item.permissionId);
      if (!perm) {
        return sendResponse(res, 400, "Failed", {
          message: `Invalid permission ID: ${item.permissionId}`,
        });
      }

      const invalidActions = item.actions.filter(
        (a) => !perm.actions.includes(a)
      );

      if (invalidActions.length > 0) {
        return sendResponse(res, 400, "Failed", {
          message: `Invalid actions for permission '${perm.name}': ${invalidActions.join(", ")}`,
        });
      }
    }

    const roleCreated = await Role.create({ name, permissions, description });

    sendResponse(res, 200, "Success", {
      message: "Role created successfully!",
      data: roleCreated,
      statusCode: 200,
    });
  } catch (error) {
    console.error(error);
    sendResponse(res, 500, "Failed", {
      message: error.message || "Internal server error",
    });
  }
});

roleController.post("/list", async (req, res) => {
    try {
      const {
        searchKey = "",
        pageNo = 1,
        pageCount = 10,
        sortByField,
        sortByOrder,
      } = req.body;
  
      const query = {};
      if (searchKey) query.name = { $regex: searchKey, $options: "i" };
  
      const sortField = sortByField || "createdAt";
      const sortOrder = sortByOrder === "asc" ? 1 : -1;
      const sortOption = { [sortField]: sortOrder };
  
      const roleList = await Role.find(query)
        .populate("permissions.permissionId")
        .sort(sortOption)
        .limit(parseInt(pageCount))
        .skip((pageNo - 1) * parseInt(pageCount))
        .lean();
  
      const updatedRoleList = roleList.map((role) => ({
        ...role,
        permissions: role.permissions.map((perm) => ({
          ...perm,
          selectedActions: perm.actions || [],
          actions: undefined,
        })),
      }));
  
      const totalCount = await Role.countDocuments(query);
  
      sendResponse(res, 200, "Success", {
        message: "Role list retrieved successfully!",
        data: updatedRoleList,
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
  

  roleController.put("/update/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const { name, permissions, description } = req.body;
  
      if (!id) {
        return sendResponse(res, 400, "Failed", { message: "Role ID is required" });
      }
  
      const roleData = await Role.findById(id);
      if (!roleData) {
        return sendResponse(res, 404, "Failed", { message: "Role not found" });
      }
  
      // Validate permissions if provided
      if (permissions && permissions.length) {
        for (const item of permissions) {
          const perm = await Permission.findById(item.permissionId);
          if (!perm) {
            return sendResponse(res, 400, "Failed", {
              message: `Invalid permission ID: ${item.permissionId}`,
            });
          }
  
          const invalidActions = item.actions?.filter(
            (a) => !perm.actions.includes(a)
          );
  
          if (invalidActions && invalidActions.length > 0) {
            return sendResponse(res, 400, "Failed", {
              message: `Invalid actions for permission '${perm.name}': ${invalidActions.join(", ")}`,
            });
          }
        }
      }
  
      // Perform update
      const updatedRole = await Role.findByIdAndUpdate(
        id,
        { name, permissions, description },
        { new: true }
      ).populate("permissions.permissionId");
  
      sendResponse(res, 200, "Success", {
        message: "Role updated successfully!",
        data: updatedRole,
        statusCode: 200,
      });
    } catch (error) {
      console.error("Error updating role:", error);
      sendResponse(res, 500, "Failed", {
        message: error.message || "Internal server error",
      });
    }
  });
  


roleController.get("/details/:id", async (req, res) => {
  try {
    const { id } = req.params;
    if (!id) {
      return sendResponse(res, 400, "Failed", { message: "Role ID is required" });
    }

    const role = await Role.findById(id)
      .populate("permissions.permissionId") // populate permission details
      .lean();

    if (!role) {
      return sendResponse(res, 404, "Failed", { message: "Role not found" });
    }

    // Map permissions to include selectedActions from DB
    const formattedPermissions = (role.permissions || []).map((perm) => ({
      _id: perm._id,
      permissionId: perm.permissionId,
      selectedActions: perm.actions || [],
      actions: undefined,
    }));

    sendResponse(res, 200, "Success", {
      message: "Role details retrieved successfully!",
      data: {
        ...role,
        permissions: formattedPermissions,
      },
      statusCode: 200,
    });
  } catch (error) {
    console.error(error);
    sendResponse(res, 500, "Failed", {
      message: error.message || "Internal server error",
    });
  }
});


roleController.delete("/delete/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const roleItem = await Role.findById(id);
    if (!roleItem) {
      return sendResponse(res, 404, "Failed", { message: "Role not found" });
    }

    await Role.findByIdAndDelete(id);

    sendResponse(res, 200, "Success", {
      message: "Role deleted successfully!",
      statusCode: 200,
    });
  } catch (error) {
    console.error(error);
    sendResponse(res, 500, "Failed", {
      message: error.message || "Internal server error",
    });
  }
});

module.exports = roleController;
