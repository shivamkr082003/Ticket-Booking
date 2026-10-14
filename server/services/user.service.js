import bcrypt from "bcryptjs";
import User from "../models/user.model.js";
import { USER_ROLE, USER_STATUS, STATUS_CODES } from "../utils/constants.js";

// ── Helper ────────────────────────────────────────────────
const handleValidationError = (error) => {
  if (error.name === "ValidationError") {
    const err = {};
    Object.keys(error.errors).forEach((key) => {
      err[key] = error.errors[key].message;
    });
    throw { err, code: STATUS_CODES.UNPROCESSABLE_ENTITY };
  }
  throw error;
};

// ── CREATE (signup) ───────────────────────────────────────
export const createUser = async (data) => {
  try {
    const adminCount = await User.countDocuments({ userRole: USER_ROLE.admin });

    // First ever signup — make them ADMIN automatically
    if (adminCount === 0 && data.userRole === USER_ROLE.admin) {
      data.userStatus = USER_STATUS.approved;
    }
    // CUSTOMER → always APPROVED
    else if (!data.userRole || data.userRole === USER_ROLE.customer) {
      data.userStatus = USER_STATUS.approved;
    }
    // CLIENT or ADMIN (when admin already exists) → PENDING, needs approval
    else {
      data.userStatus = USER_STATUS.pending;
    }

    const response = await User.create(data);
    return response;
  } catch (error) {
    handleValidationError(error);
  }
};

// ── GET BY EMAIL (signin) ─────────────────────────────────
export const getUserByEmail = async (email) => {
  const user = await User.findOne({ email }).select("+password");
  if (!user)
    throw {
      err: "No user found for the given email",
      code: STATUS_CODES.NOT_FOUND,
    };
  return user;
};

// ── GET BY ID ─────────────────────────────────────────────
export const getUserById = async (id) => {
  const user = await User.findById(id).select("+password");
  if (!user)
    throw {
      err: "No user found for the given id",
      code: STATUS_CODES.NOT_FOUND,
    };
  return user;
};

// ── GET BY ID (no password — for public/admin views) ─────
export const getUserByIdService = async (id) => {
  const user = await User.findById(id);
  if (!user)
    throw {
      err: "No user found for the given id",
      code: STATUS_CODES.NOT_FOUND,
    };
  return user;
};

// ── GET ALL (admin dashboard) ─────────────────────────────
export const getAllUsersService = async (filter = {}) => {
  try {
    const { userRole, userStatus, name, page = 1, limit = 50 } = filter;

    const query = {};
    if (userRole) query.userRole = userRole;
    if (userStatus) query.userStatus = userStatus;
    if (name) query.name = { $regex: name, $options: "i" };

    const pageNum = Math.max(1, Number(page));
    const limitNum = Math.min(100, Math.max(1, Number(limit)));
    const skip = (pageNum - 1) * limitNum;

    const [users, total] = await Promise.all([
      User.find(query)
        .select("-password")
        .skip(skip)
        .limit(limitNum)
        .sort({ createdAt: -1 }),
      User.countDocuments(query),
    ]);

    return {
      users,
      pagination: {
        total,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(total / limitNum),
      },
    };
  } catch (error) {
    throw {
      err: "Failed to fetch users",
      code: STATUS_CODES.INTERNAL_SERVER_ERROR,
    };
  }
};

// ── UPDATE ROLE / STATUS (admin action) ───────────────────
export const updateUserRoleOrStatus = async (data, userId) => {
  try {
    const updateQuery = {};
    if (data.userRole) updateQuery.userRole = data.userRole;
    if (data.userStatus) updateQuery.userStatus = data.userStatus;

    if (Object.keys(updateQuery).length === 0)
      throw {
        err: "Provide at least userRole or userStatus to update",
        code: STATUS_CODES.BAD_REQUEST,
      };

    const response = await User.findByIdAndUpdate(userId, updateQuery, {
      new: true,
      runValidators: true,
    });
    if (!response)
      throw {
        err: "No user found for the given id",
        code: STATUS_CODES.NOT_FOUND,
      };

    return response;
  } catch (error) {
    handleValidationError(error);
  }
};

// ── DELETE (admin action) ─────────────────────────────────
export const deleteUserService = async (id) => {
  const user = await User.findByIdAndDelete(id);
  if (!user)
    throw {
      err: "No user found for the given id",
      code: STATUS_CODES.NOT_FOUND,
    };
  return user;
};

// ── UPDATE PROFILE ────────────────────────────────────────
export const updateProfileService = async ({ userId, name, phone, avatar }) => {
  if (!name?.trim())
    throw { err: "Name is required", code: STATUS_CODES.BAD_REQUEST };
  if (name.trim().length < 2)
    throw {
      err: "Name must be at least 2 characters",
      code: STATUS_CODES.BAD_REQUEST,
    };

  const updates = { name: name.trim() };
  if (phone !== undefined) updates.phone = phone.trim();
  if (avatar !== undefined) updates.avatar = avatar.trim();

  const user = await User.findByIdAndUpdate(userId, updates, {
    new: true,
  }).select("-password");

  if (!user) throw { err: "User not found", code: STATUS_CODES.NOT_FOUND };
  return user;
};

// ── CHANGE PASSWORD ───────────────────────────────────────
export const changePasswordService = async ({
  userId,
  currentPassword,
  newPassword,
}) => {
  const user = await User.findById(userId).select("+password");
  if (!user) throw { err: "User not found", code: STATUS_CODES.NOT_FOUND };

  const isMatch = await bcrypt.compare(currentPassword, user.password);
  if (!isMatch)
    throw {
      err: "Current password is incorrect",
      code: STATUS_CODES.UNAUTHORISED,
    };

  if (newPassword.length < 6)
    throw {
      err: "New password must be at least 6 characters",
      code: STATUS_CODES.BAD_REQUEST,
    };

  user.password = await bcrypt.hash(newPassword, 10);
  await user.save();
};
