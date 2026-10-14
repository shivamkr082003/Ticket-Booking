import AuditLog from "../models/auditLog.model.js";
import { USER_ROLE } from "../utils/constants.js";

// Which staff actions we record: [method, path pattern, entity, action]
const RULES = [
    ["POST",   /^\/api\/v1\/theatres$/,                 "Theatre", "CREATE"],
    ["PATCH",  /^\/api\/v1\/theatres\/([^/]+)\/status$/, "Theatre", "STATUS"],
    ["PATCH",  /^\/api\/v1\/theatres\/([^/]+)\/movies$/, "Theatre", "UPDATE"],
    ["PATCH",  /^\/api\/v1\/theatres\/([^/]+)$/,        "Theatre", "UPDATE"],
    ["DELETE", /^\/api\/v1\/theatres\/([^/]+)$/,        "Theatre", "DELETE"],
    ["POST",   /^\/api\/v1\/shows(\/bulk)?$/,           "Show",    "CREATE"],
    ["PATCH",  /^\/api\/v1\/shows\/([^/]+)\/status$/,    "Show",    "STATUS"],
    ["PATCH",  /^\/api\/v1\/shows\/([^/]+)$/,           "Show",    "UPDATE"],
    ["DELETE", /^\/api\/v1\/shows\/([^/]+)$/,           "Show",    "DELETE"],
    ["POST",   /^\/api\/v1\/movies$/,                   "Movie",   "CREATE"],
    ["PATCH",  /^\/api\/v1\/movies\/([^/]+)\/status$/,   "Movie",   "STATUS"],
    ["PATCH",  /^\/api\/v1\/movies\/([^/]+)$/,          "Movie",   "UPDATE"],
    ["DELETE", /^\/api\/v1\/movies\/([^/]+)$/,          "Movie",   "DELETE"],
    ["POST",   /^\/api\/v1\/coupons$/,                  "Coupon",  "CREATE"],
    ["PATCH",  /^\/api\/v1\/coupons\/([^/]+)$/,         "Coupon",  "UPDATE"],
    ["DELETE", /^\/api\/v1\/coupons\/([^/]+)$/,         "Coupon",  "DELETE"],
    ["PATCH",  /^\/api\/v1\/users\/([^/]+)$/,           "User",    "UPDATE"],
    ["DELETE", /^\/api\/v1\/users\/([^/]+)$/,           "User",    "DELETE"],
    ["POST",   /^\/api\/v1\/bookings\/check-in$/,       "Booking", "CHECK_IN"],
    ["PATCH",  /^\/api\/v1\/support\/([^/]+)$/,         "Support", "REPLY"],
];

const SECRET = /password|token|otp|secret/i;

const describe = (entity, action, body, data) => {
    const name = body?.name ?? body?.code ?? data?.name ?? data?.code ?? body?.ticketCode ?? "";
    if (action === "STATUS") return `${entity} ${body?.isActive === false || body?.status === "INACTIVE" ? "deactivated" : "status changed"}${name ? `: ${name}` : ""}`;
    if (action === "CHECK_IN") return `Admitted ${String(body?.ticketCode ?? "").toUpperCase()}`;
    if (entity === "User" && action === "UPDATE") {
        const bits = [body?.userStatus && `status → ${body.userStatus}`, body?.userRole && `role → ${body.userRole}`].filter(Boolean);
        return `User ${bits.join(", ") || "updated"}`;
    }
    if (entity === "Show" && action === "CREATE" && Array.isArray(body?.showTimes)) return `Scheduled ${data?.created?.length ?? body.showTimes.length} shows`;
    const verb = { CREATE: "created", UPDATE: "updated", DELETE: "deleted", REPLY: "replied" }[action] ?? action.toLowerCase();
    return `${entity} ${verb}${name ? `: ${name}` : ""}`;
};

/** Records successful staff changes once the response has been sent. Never blocks the request. */
export const auditTrail = (req, res, next) => {
    const rule = RULES.find(([m, rx]) => m === req.method && rx.test(req.originalUrl.split("?")[0]));
    if (!rule) return next();

    let payload;
    const json = res.json.bind(res);
    res.json = (body) => { payload = body; return json(body); };

    res.on("finish", () => {
        const user = req.user;
        if (!user || res.statusCode >= 400) return;
        if (![USER_ROLE.admin, USER_ROLE.client].includes(user.userRole)) return;
        const [, rx, entity, action] = rule;
        const match = rx.exec(req.originalUrl.split("?")[0]);
        const data = payload?.data ?? {};
        AuditLog.create({
            actor: user._id, actorName: user.name, role: user.userRole, action, entity,
            entityId: match?.[1]?.startsWith("/") ? "" : (match?.[1] ?? data?._id ?? ""),
            summary: describe(entity, action, req.body ?? {}, data),
            fields: Object.keys(req.body ?? {}).filter((k) => !SECRET.test(k)).slice(0, 20),
            ip: req.ip ?? "",
        }).catch((e) => console.error("Audit log failed:", e.message));
    });
    next();
};

export const listAuditLogsService = async ({ entity, actor, page = 1, limit = 50 }) => {
    const q = {};
    if (entity) q.entity = entity;
    if (actor) q.actor = actor;
    const p = Math.max(1, Number(page) || 1), l = Math.min(100, Math.max(1, Number(limit) || 50));
    const [items, total] = await Promise.all([
        AuditLog.find(q).sort({ createdAt: -1 }).skip((p - 1) * l).limit(l),
        AuditLog.countDocuments(q),
    ]);
    return { items, pagination: { page: p, total, totalPages: Math.ceil(total / l) } };
};
