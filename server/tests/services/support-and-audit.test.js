import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import { EventEmitter } from "events";
import mongoose from "mongoose";
import { connectTestDb, disconnectTestDb, clearTestDb } from "../setup/testDb.js";

const { createTicketService, replyTicketService, listTicketsService } = await import("../../services/support.service.js");
const { auditTrail, listAuditLogsService } = await import("../../middlewares/audit.middleware.js");
const { listNotificationsService } = await import("../../services/notification.service.js");
const Booking = (await import("../../models/bookings.model.js")).default;

beforeAll(connectTestDb);
afterAll(disconnectTestDb);
beforeEach(clearTestDb);

const user = (role = "CUSTOMER") => ({ _id: new mongoose.Types.ObjectId(), name: `${role} person`, userRole: role });
const flush = () => new Promise((r) => setTimeout(r, 60));

describe("support tickets", () => {
    it("lets a customer raise an issue on their own booking, and notifies them when staff reply", async () => {
        const [me, other, admin] = [user(), user(), user("ADMIN")];
        const booking = await Booking.create({ showId: new mongoose.Types.ObjectId(), userId: me._id, seats: ["A1"], totalAmount: 200, status: "SUCCESSFUL" });
        await expect(createTicketService(other, { category: "REFUND", subject: "Refund", message: "Where is my refund?", bookingId: booking._id.toString() }))
            .rejects.toMatchObject({ code: 403 });

        const t = await createTicketService(me, { category: "ENTRY", subject: "QR wouldn't scan", message: "Staff couldn't scan my ticket at the door", bookingId: booking._id.toString() });
        await expect(replyTicketService(other, t._id.toString(), { message: "hi" })).rejects.toMatchObject({ code: 403 });

        const r = await replyTicketService(admin, t._id.toString(), { message: "Sorry! We've fixed the scanner.", status: "RESOLVED" });
        expect(r).toMatchObject({ status: "RESOLVED" });
        expect(r.replies[0]).toMatchObject({ staff: true });
        await flush();
        expect((await listNotificationsService(me._id)).items[0]).toMatchObject({ type: "SUPPORT_REPLY" });

        const reopened = await replyTicketService(me, t._id.toString(), { message: "Still broken today", status: "RESOLVED" });
        expect(reopened.status).toBe("OPEN");                   // customers can't resolve, but can reopen
        expect((await listTicketsService({})).open).toBe(1);
    });
});

describe("audit trail", () => {
    const fakeRes = () => {
        const res = new EventEmitter();
        res.statusCode = 200;
        res.json = (b) => b;
        return res;
    };
    const run = (req, status = 200) => {
        const res = fakeRes();
        auditTrail(req, res, () => {});
        res.json({ success: true, data: { _id: "abc123", name: "IMAX Hall Show" } });
        res.statusCode = status;
        res.emit("finish");
    };

    it("records successful staff changes, skipping secrets and failed or customer requests", async () => {
        const admin = user("ADMIN");
        run({ method: "PATCH", originalUrl: "/api/v1/users/u1", body: { userStatus: "APPROVED", password: "x" }, user: admin });
        run({ method: "POST", originalUrl: "/api/v1/theatres", body: { name: "Failing" }, user: admin }, 400);
        run({ method: "POST", originalUrl: "/api/v1/bookings/check-in", body: { ticketCode: "cv-1" }, user: user("CUSTOMER") });
        run({ method: "GET", originalUrl: "/api/v1/theatres", body: {}, user: admin });
        await flush();

        const { items } = await listAuditLogsService({});
        expect(items).toHaveLength(1);
        expect(items[0]).toMatchObject({ entity: "User", action: "UPDATE", entityId: "u1", summary: "User status → APPROVED", fields: ["userStatus"] });
    });
});
