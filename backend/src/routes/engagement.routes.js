import { Router } from "express";
import { addBookmark, createReport, listBookmarks, listNotifications, markAllNotificationsRead, markNotificationRead, removeBookmark } from "../controllers/engagement.controller.js";
import { authenticate, authorize } from "../middleware/auth.js";
import { submissionLimiter } from "../middleware/rateLimits.js";
import asyncHandler from "../utils/asyncHandler.js";
import { listReports, updateReport } from "../controllers/admin.controller.js";

export const bookmarksRouter = Router();
bookmarksRouter.use(authenticate);
bookmarksRouter.get("/", asyncHandler(listBookmarks));
bookmarksRouter.post("/:gemId", asyncHandler(addBookmark));
bookmarksRouter.delete("/:gemId", asyncHandler(removeBookmark));

export const reportsRouter = Router();
reportsRouter.post("/", authenticate, submissionLimiter, asyncHandler(createReport));
reportsRouter.get("/", authenticate, authorize("admin"), asyncHandler(listReports));
reportsRouter.patch("/:id", authenticate, authorize("admin"), asyncHandler(updateReport));

export const notificationsRouter = Router();
notificationsRouter.use(authenticate);
notificationsRouter.get("/", asyncHandler(listNotifications));
notificationsRouter.patch("/read-all", asyncHandler(markAllNotificationsRead));
notificationsRouter.patch("/:id/read", asyncHandler(markNotificationRead));
