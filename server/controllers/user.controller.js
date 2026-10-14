import {
  errorResponseBody,
  successResponseBody,
} from "../utils/response.utils.js";
import { STATUS_CODES } from "../utils/constants.js";
import {
  getAllUsersService,
  getUserByIdService,
  updateUserRoleOrStatus,
  deleteUserService,
  updateProfileService,
  changePasswordService,
} from "../services/user.service.js";

// GET /users — list all users (admin dashboard)
export const getUsers = async (req, res) => {
  try {
    const response = await getAllUsersService(req.query);
    successResponseBody.message = "Users fetched successfully";
    successResponseBody.data = response;
    return res.status(STATUS_CODES.OK).json(successResponseBody);
  } catch (error) {
    if (error.err) {
      errorResponseBody.err = error.err;
      return res.status(error.code).json(errorResponseBody);
    }
    errorResponseBody.err = error;
    return res
      .status(STATUS_CODES.INTERNAL_SERVER_ERROR)
      .json(errorResponseBody);
  }
};

// GET /users/:id — single user detail
export const getUser = async (req, res) => {
  try {
    const response = await getUserByIdService(req.params.id);
    successResponseBody.message = "User fetched successfully";
    successResponseBody.data = response;
    return res.status(STATUS_CODES.OK).json(successResponseBody);
  } catch (error) {
    if (error.err) {
      errorResponseBody.err = error.err;
      return res.status(error.code).json(errorResponseBody);
    }
    errorResponseBody.err = error;
    return res
      .status(STATUS_CODES.INTERNAL_SERVER_ERROR)
      .json(errorResponseBody);
  }
};

// PATCH /users/:id — update role or status (approve/reject/promote)
export const updateUser = async (req, res) => {
  try {
    const response = await updateUserRoleOrStatus(req.body, req.params.id);
    successResponseBody.message = "User updated successfully";
    successResponseBody.data = response;
    return res.status(STATUS_CODES.OK).json(successResponseBody);
  } catch (error) {
    if (error.err) {
      errorResponseBody.err = error.err;
      return res.status(error.code).json(errorResponseBody);
    }
    errorResponseBody.err = error;
    return res
      .status(STATUS_CODES.INTERNAL_SERVER_ERROR)
      .json(errorResponseBody);
  }
};

// DELETE /users/:id — hard delete user
export const deleteUser = async (req, res) => {
  try {
    const response = await deleteUserService(req.params.id);
    successResponseBody.message = "User deleted successfully";
    successResponseBody.data = response;
    return res.status(STATUS_CODES.OK).json(successResponseBody);
  } catch (error) {
    if (error.err) {
      errorResponseBody.err = error.err;
      return res.status(error.code).json(errorResponseBody);
    }
    errorResponseBody.err = error;
    return res
      .status(STATUS_CODES.INTERNAL_SERVER_ERROR)
      .json(errorResponseBody);
  }
};

// PATCH /users/profile — update own profile
export const updateProfile = async (req, res) => {
  try {
    const user = await updateProfileService({
      userId: req.user._id,
      name: req.body.name,
      phone: req.body.phone,
      avatar: req.body.avatar,
    });
    successResponseBody.message = "Profile updated successfully";
    successResponseBody.data = user;
    return res.status(STATUS_CODES.OK).json(successResponseBody);
  } catch (error) {
    if (error.err) {
      errorResponseBody.err = error.err;
      return res.status(error.code).json(errorResponseBody);
    }
    errorResponseBody.err = error.message ?? error;
    return res
      .status(STATUS_CODES.INTERNAL_SERVER_ERROR)
      .json(errorResponseBody);
  }
};

// PATCH /users/change-password
export const changePassword = async (req, res) => {
  try {
    await changePasswordService({
      userId: req.user._id,
      currentPassword: req.body.currentPassword,
      newPassword: req.body.newPassword,
    });
    successResponseBody.message = "Password changed successfully";
    successResponseBody.data = null;
    return res.status(STATUS_CODES.OK).json(successResponseBody);
  } catch (error) {
    if (error.err) {
      errorResponseBody.err = error.err;
      return res.status(error.code).json(errorResponseBody);
    }
    errorResponseBody.err = error.message ?? error;
    return res
      .status(STATUS_CODES.INTERNAL_SERVER_ERROR)
      .json(errorResponseBody);
  }
};