import express from "express";
import {
  getUsers,
  getUser,
  updateUser,
  deleteUser,
  updateProfile,
  changePassword,
} from "../controllers/user.controller.js";
import { isAuthenticated, isAdmin } from "../middlewares/auth.middleware.js";
import { validateUpdateUserRequest } from "../middlewares/user.middleware.js";

const router = express.Router();

// ── SELF-SERVICE — specific routes FIRST (before :id) ────
router.patch("/users/profile",         isAuthenticated, updateProfile);
router.patch("/users/change-password", isAuthenticated, changePassword);

// ── ADMIN ONLY — dynamic :id routes AFTER ────────────────
router.get   ("/users",     isAuthenticated, isAdmin, getUsers);
router.get   ("/users/:id", isAuthenticated, isAdmin, getUser);
router.patch ("/users/:id", isAuthenticated, isAdmin, validateUpdateUserRequest, updateUser);
router.delete("/users/:id", isAuthenticated, isAdmin, deleteUser);

export default router;