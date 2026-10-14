import { useCallback, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import Modal from "../../../../common/Modal/Modal.tsx";
import { showToast } from "../../../../common/Toast/toast.ts";
import { couponsApi, type CouponPayload } from "../../../../../api/index.api.ts";
import { offerHeadline } from "../../../../../constants/checkout.ts";
import type { Coupon, CouponType } from "../../../../../types/movie.types.ts";
import Icon from "../../../common/Icons.tsx";

const BLANK: CouponPayload = {
  code: "", description: "", type: "PERCENT", value: 10, maxDiscount: 150, minAmount: 0,
  validFrom: null, validUntil: null, usageLimit: 0, perUserLimit: 1, isActive: true,
};

const toInput = (iso: string | null) => (iso ? new Date(iso).toISOString().slice(0, 10) : "");
const fromInput = (d: string, endOfDay = false) => (d ? new Date(`${d}T${endOfDay ? "23:59:59" : "00:00:00"}`).toISOString() : null);

function status(c: Coupon): { label: string; cls: string } {
  const now = Date.now();
  if (!c.isActive) return { label: "Paused", cls: "gray" };
  if (c.validUntil && new Date(c.validUntil).getTime() < now) return { label: "Expired", cls: "red" };
  if (c.validFrom && new Date(c.validFrom).getTime() > now) return { label: "Scheduled", cls: "blue" };
  if (c.usageLimit > 0 && c.usedCount >= c.usageLimit) return { label: "Used up", cls: "yellow" };
  return { label: "Live", cls: "green" };
}

export default function OffersTab() {
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<{ id: string | null; form: CouponPayload } | null>(null);
  const [saving,  setSaving]  = useState(false);

  const load = useCallback(() => {
    couponsApi.getAll().then(setCoupons)
      .catch((e: unknown) => showToast(e instanceof Error ? e.message : "Failed to load offers", "error"))
      .finally(() => setLoading(false));
  }, []);
  useEffect(() => { load(); }, [load]);

  const set = <K extends keyof CouponPayload>(k: K, v: CouponPayload[K]) =>
    setEditing(e => (e ? { ...e, form: { ...e.form, [k]: v } } : e));

  const save = async () => {
    if (!editing) return;
    setSaving(true);
    try {
      const { code, type, ...rest } = editing.form;
      if (editing.id) await couponsApi.update(editing.id, rest);
      else await couponsApi.create({ ...editing.form, code: code.trim().toUpperCase(), type });
      showToast(editing.id ? "Offer updated" : "Offer created");
      setEditing(null);
      load();
    } catch (e: unknown) {
      showToast(e instanceof Error ? e.message : "Could not save offer", "error");
    } finally { setSaving(false); }
  };

  const toggle = async (c: Coupon) => {
    try { await couponsApi.update(c._id, { isActive: !c.isActive }); load(); }
    catch (e: unknown) { showToast(e instanceof Error ? e.message : "Failed", "error"); }
  };

  const remove = async (c: Coupon) => {
    if (!window.confirm(`Delete offer ${c.code}? Customers won't be able to use it.`)) return;
    try { await couponsApi.delete(c._id); showToast("Offer deleted"); load(); }
    catch (e: unknown) { showToast(e instanceof Error ? e.message : "Failed", "error"); }
  };

  const f = editing?.form;

  return (
    <div className="anim-fadeup">
      <div className="dash-tab-header">
        <div className="dash-page-header" style={{ marginBottom: 0 }}>
          <p className="dash-eyebrow">Promotions</p>
          <h1 className="dash-page-title">Offers &amp; coupons</h1>
          <p className="dash-page-sub">Codes customers can apply at checkout. Live offers are listed on the checkout page.</p>
        </div>
        <button className="btn btn-primary btn-sm" onClick={() => setEditing({ id: null, form: { ...BLANK } })}>
          <Icon name="plus" size={15} /> New offer
        </button>
      </div>

      <div className="dash-table-wrap">
        <table className="dash-table">
          <thead><tr><th>Code</th><th>Discount</th><th>Min order</th><th>Valid</th><th className="num">Used</th><th>Status</th><th /></tr></thead>
          <tbody>
            {!loading && coupons.length === 0 && (
              <tr><td colSpan={7} className="dash-table-empty">No offers yet — create one to run a promotion.</td></tr>
            )}
            {coupons.map(c => {
              const st = status(c);
              return (
                <tr key={c._id}>
                  <td><strong style={{ letterSpacing: 1 }}>{c.code}</strong>{c.description && <small>{c.description}</small>}</td>
                  <td>{offerHeadline(c)}</td>
                  <td>{c.minAmount ? `₹${c.minAmount}` : "—"}</td>
                  <td className="cell-muted">
                    {c.validFrom ? new Date(c.validFrom).toLocaleDateString("en-IN", { day: "numeric", month: "short" }) : "Now"}
                    {" → "}
                    {c.validUntil ? new Date(c.validUntil).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : "No end"}
                  </td>
                  <td className="num">{c.usedCount}{c.usageLimit ? ` / ${c.usageLimit}` : ""}<small>{c.perUserLimit ? `${c.perUserLimit} per user` : "Unlimited per user"}</small></td>
                  <td><span className={`badge badge-${st.cls}`}>{st.label}</span></td>
                  <td>
                    <div className="row-actions">
                      <button className="btn btn-ghost btn-sm" onClick={() => setEditing({ id: c._id, form: {
                        code: c.code, description: c.description, type: c.type, value: c.value, maxDiscount: c.maxDiscount,
                        minAmount: c.minAmount, validFrom: c.validFrom, validUntil: c.validUntil, usageLimit: c.usageLimit,
                        perUserLimit: c.perUserLimit, isActive: c.isActive,
                      } })}>Edit</button>
                      <button className="btn btn-ghost btn-sm" onClick={() => toggle(c)}>{c.isActive ? "Pause" : "Resume"}</button>
                      <button className="btn btn-danger btn-sm" onClick={() => remove(c)} aria-label={`Delete ${c.code}`}>🗑</button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Portalled: the tab's fade-in transform would otherwise trap the fixed overlay */}
      {editing && f && createPortal(
        <Modal title={editing.id ? `EDIT ${f.code}` : "NEW OFFER"} onClose={() => setEditing(null)} maxWidth={560}
          footer={<>
            <button className="btn btn-ghost" onClick={() => setEditing(null)}>Cancel</button>
            <button className="btn btn-primary" onClick={save} disabled={saving || !f.code.trim()}>{saving ? "Saving…" : "Save offer"}</button>
          </>}>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Code *</label>
              <input className="form-input" value={f.code} disabled={!!editing.id} maxLength={20}
                onChange={e => set("code", e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ""))} placeholder="WEEKEND20" />
            </div>
            <div className="form-group">
              <label className="form-label">Type</label>
              <select className="form-input" value={f.type} disabled={!!editing.id} onChange={e => set("type", e.target.value as CouponType)}>
                <option value="PERCENT">Percentage off</option>
                <option value="FLAT">Flat ₹ off</option>
              </select>
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">Description</label>
            <input className="form-input" value={f.description} maxLength={160} onChange={e => set("description", e.target.value)}
              placeholder="Weekend special on all shows" />
          </div>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">{f.type === "PERCENT" ? "Discount %" : "Discount ₹"} *</label>
              <input className="form-input" type="number" min={1} max={f.type === "PERCENT" ? 100 : undefined} value={f.value}
                onChange={e => set("value", Number(e.target.value))} />
            </div>
            {f.type === "PERCENT" && (
              <div className="form-group">
                <label className="form-label">Max discount ₹ (0 = no cap)</label>
                <input className="form-input" type="number" min={0} value={f.maxDiscount} onChange={e => set("maxDiscount", Number(e.target.value))} />
              </div>
            )}
          </div>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Minimum order ₹</label>
              <input className="form-input" type="number" min={0} value={f.minAmount} onChange={e => set("minAmount", Number(e.target.value))} />
            </div>
            <div className="form-group">
              <label className="form-label">Uses per customer (0 = unlimited)</label>
              <input className="form-input" type="number" min={0} value={f.perUserLimit} onChange={e => set("perUserLimit", Number(e.target.value))} />
            </div>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Starts</label>
              <input className="form-input" type="date" value={toInput(f.validFrom)} onChange={e => set("validFrom", fromInput(e.target.value))} />
            </div>
            <div className="form-group">
              <label className="form-label">Ends</label>
              <input className="form-input" type="date" value={toInput(f.validUntil)} onChange={e => set("validUntil", fromInput(e.target.value, true))} />
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">Total redemptions (0 = unlimited)</label>
            <input className="form-input" type="number" min={0} value={f.usageLimit} onChange={e => set("usageLimit", Number(e.target.value))} />
          </div>
        </Modal>,
        document.body,
      )}
    </div>
  );
}
