import { useState } from "react";
import Modal             from "../../../common/Modal/Modal.tsx";
import MultiImageUpload from "../../../common/MultiImageUpload/MultiImageUpload.tsx";
import { theatresApi } from "../../../../api/index.api.ts";
import { showToast }  from "../../../common/Toast/toast.ts";
import type { Theatre, CreateTheatrePayload } from "../../../../types/movie.types.ts";
import { AMENITIES, AMENITY_GROUPS, amenityInfo } from "../../../../constants/amenities.ts";
import PhotoSlot from "../../../common/PhotoSlot/PhotoSlot.tsx";
import { AMENITY_PHOTOS } from "../../../../utils/theatreImages.ts";
import ScreenEditor from "./ScreenEditor.tsx";
import MenuEditor from "./MenuEditor.tsx";
import LocationField from "./LocationField.tsx";
import PricingRulesEditor from "./PricingRulesEditor.tsx";
import CancellationPolicyEditor from "./CancellationPolicyEditor.tsx";
import { PLATFORM_POLICY } from "../../../../constants/policy.ts";
import type { CancellationPolicy, GeoPoint, MenuItem, PricingRules } from "../../../../types/movie.types.ts";
import { draftError, draftFromScreen, screenFromDraft, type ScreenDraft } from "./screenDraft.ts";
import "./TheatreForm.css";

interface TheatreFormProps {
  data:    Theatre | null;
  onClose: () => void;
  onSave:  () => void;
}

const STATE_OPTIONS   = ["Andhra Pradesh","Arunachal Pradesh","Assam","Bihar","Chhattisgarh","Goa","Gujarat","Haryana","Himachal Pradesh","Jharkhand","Karnataka","Kerala","Madhya Pradesh","Maharashtra","Manipur","Meghalaya","Mizoram","Nagaland","Odisha","Punjab","Rajasthan","Sikkim","Tamil Nadu","Telangana","Tripura","Uttar Pradesh","Uttarakhand","West Bengal","Delhi","Jammu & Kashmir"];
const CITY_OPTIONS    = ["Mumbai","Delhi","Bangalore","Chennai","Hyderabad","Pune","Kolkata","Ahmedabad","Jaipur","Lucknow","Patna","Chandigarh","Indore","Bhopal","Surat","Nagpur","Vadodara","Visakhapatnam","Coimbatore","Kochi"];

type Form = CreateTheatrePayload;

const BLANK: Form = {
  name: "", description: "", city: "", state: "",
  pincode: 0, address: "", totalScreens: 1, amenities: [], images: [],
  phone: "", openingHours: "",
};

export default function TheatreForm({ data, onClose, onSave }: TheatreFormProps) {
  const isEdit = !!data;

  const [form, setForm] = useState<Form>(data ? {
    name:         data.name,
    description:  data.description ?? "",
    city:         data.city,
    state:        data.state        ?? "",
    pincode:      data.pincode,
    address:      data.address,
    totalScreens: data.totalScreens ?? 1,
    amenities:    data.amenities    ?? [],
    images:       data.images       ?? [],
    phone:        data.phone        ?? "",
    openingHours: data.openingHours ?? "",
  } : { ...BLANK });

  const [screens, setScreens] = useState<ScreenDraft[]>(() => (data?.screens ?? []).map(draftFromScreen));
  const [menu, setMenu] = useState<MenuItem[]>(() => (data?.menu ?? []).map(m => ({ ...m })));
  const [amenityPhotos, setAmenityPhotos] = useState<Record<string, string>>(() => ({ ...(data?.amenityPhotos ?? {}) }));
  const setAmenityPhoto = (label: string, url: string) =>
    setAmenityPhotos(p => { const next = { ...p }; if (url) next[label] = url; else delete next[label]; return next; });

  const [location, setLocation] = useState<GeoPoint | null>(() =>
    data?.location && typeof data.location.lat === "number" ? { ...data.location } : null);
  const [pricingRules, setPricingRules] = useState<PricingRules>(() => ({ ...(data?.pricingRules ?? {}) }));
  const [policy, setPolicy] = useState<CancellationPolicy | null>(() => data?.cancellationPolicy ? { ...PLATFORM_POLICY, ...data.cancellationPolicy } : null);

  const [saving, setSaving] = useState(false);

  const set = <K extends keyof Form>(k: K, v: Form[K]) =>
    setForm(p => ({ ...p, [k]: v }));

  const toggleAmenity = (a: string) =>
    set("amenities", form.amenities.includes(a)
      ? form.amenities.filter(x => x !== a)
      : [...form.amenities, a]);

  const validate = (): string | null => {
    if (!form.name.trim()    || form.name.length    < 5)  return "Name must be at least 5 characters";
    if (!form.city.trim())                                  return "City is required";
    if (!form.state.trim())                                 return "State is required";
    if (!form.address.trim() || form.address.length < 5)   return "Address must be at least 5 characters";
    if (!form.pincode || String(form.pincode).length !== 6) return "Pincode must be 6 digits";
    if (form.totalScreens < 1)                              return "Must have at least 1 screen";
    if (form.phone && !/^[+\d][\d\s-]{6,18}$/.test(form.phone)) return "Enter a valid phone number";
    for (const d of screens) { const e = draftError(d); if (e) return e; }
    if (menu.some(m => !m.name.trim())) return "Every menu item needs a name";
    if (menu.some(m => !(m.price > 0)))  return "Every menu item needs a price";
    if (location && (Math.abs(location.lat) > 90 || Math.abs(location.lng) > 180)) return "Map pin coordinates are out of range";
    if (policy && policy.cancelCutoffHours > policy.fullRefundHours) return "Cancellation cut-off must be shorter than the full-refund window";
    return null;
  };

  const handleSubmit = async () => {
    const err = validate();
    if (err) { showToast(err, "error"); return; }
    setSaving(true);
    try {
      const payload: Form = {
        ...form,
        screens: screens.map(screenFromDraft),
        menu: menu.map(m => ({ ...m, name: m.name.trim(), image: m.image || "" })),
        // Only keep photos for amenities that are still selected
        amenityPhotos: Object.fromEntries(Object.entries(amenityPhotos).filter(([a, url]) => url && form.amenities.includes(a))),
        totalScreens: screens.length || form.totalScreens,
        location,
        cancellationPolicy: policy,
        pricingRules: Object.values(pricingRules).some(v => v) ? pricingRules : null,
      };
      if (isEdit) await theatresApi.update(data!._id, payload);
      else        await theatresApi.create(payload);
      showToast(`Theatre ${isEdit ? "updated" : "created"} successfully`);
      onSave();
    } catch (e) {
      showToast(e instanceof Error ? e.message : "Failed to save", "error");
    } finally { setSaving(false); }
  };

  return (
    <Modal
      title={isEdit ? "EDIT THEATRE" : "ADD THEATRE"}
      onClose={onClose}
      maxWidth={760}
      footer={
        <>
          <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={handleSubmit} disabled={saving}>
            {saving ? "Saving…" : isEdit ? "Save Changes" : "Create Theatre"}
          </button>
        </>
      }
    >
      {/* Basic */}
      <p className="form-section-label">BASIC INFO</p>
      <div className="form-group">
        <label className="form-label">Theatre Name *</label>
        <input className="form-input" value={form.name}
          onChange={e => set("name", e.target.value)}
          placeholder="e.g. PVR Cinemas" />
      </div>
      <div className="form-group">
        <label className="form-label">Description</label>
        <textarea className="form-input" rows={2} value={form.description}
          onChange={e => set("description", e.target.value)}
          placeholder="Optional tagline or description" />
      </div>

      {/* Location */}
      <p className="form-section-label">LOCATION</p>
      <div className="form-row">
        <div className="form-group">
          <label className="form-label">City *</label>
          <select className="form-input" value={form.city}
            onChange={e => set("city", e.target.value)}>
            <option value="">Select City</option>
            {CITY_OPTIONS.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <div className="form-group">
          <label className="form-label">State *</label>
          <select className="form-input" value={form.state}
            onChange={e => set("state", e.target.value)}>
            <option value="">Select State</option>
            {STATE_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
      </div>
      <div className="form-row">
        <div className="form-group">
          <label className="form-label">Pincode *</label>
          <input className="form-input" type="number"
            value={form.pincode || ""}
            onChange={e => set("pincode", Number(e.target.value))}
            placeholder="6-digit pincode" />
        </div>
        <div className="form-group">
          <label className="form-label">Total Screens *</label>
          <input className="form-input" type="number" min={1} max={20}
            value={screens.length || form.totalScreens}
            disabled={screens.length > 0}
            title={screens.length > 0 ? "Set by the screens configured below" : undefined}
            onChange={e => set("totalScreens", Number(e.target.value))} />
        </div>
      </div>
      <div className="form-group">
        <label className="form-label">Address *</label>
        <input className="form-input" value={form.address}
          onChange={e => set("address", e.target.value)}
          placeholder="Full street address" />
      </div>

      <div className="form-row">
        <div className="form-group">
          <label className="form-label">Box office phone</label>
          <input className="form-input" value={form.phone ?? ""}
            onChange={e => set("phone", e.target.value)}
            placeholder="+91 98765 43210" />
        </div>
        <div className="form-group">
          <label className="form-label">Opening hours</label>
          <input className="form-input" value={form.openingHours ?? ""} maxLength={60}
            onChange={e => set("openingHours", e.target.value)}
            placeholder="9:00 AM – 1:00 AM" />
        </div>
      </div>

      <p className="form-section-label">MAP PIN</p>
      <LocationField value={location} onChange={setLocation} query={[form.name, form.address, form.city].filter(Boolean).join(", ")} />

      {/* Screens */}
      <p className="form-section-label">SCREENS & SEATING</p>
      <p className="tf-hint">
        Configure each auditorium's seat tiers and prices. Shows scheduled on a configured screen get its seat map
        and tiered pricing automatically.
      </p>
      <ScreenEditor screens={screens} onChange={setScreens} theatreId={data?._id} />

      <p className="form-section-label">DYNAMIC PRICING</p>
      <p className="tf-hint">Adjust ticket prices automatically when you schedule shows. Rules stack (a Saturday-morning show gets both).</p>
      <PricingRulesEditor value={pricingRules} onChange={setPricingRules} />

      <p className="form-section-label">CANCELLATION POLICY</p>
      <CancellationPolicyEditor value={policy} onChange={setPolicy} />

      {/* Food & beverages */}
      <p className="form-section-label">FOOD &amp; BEVERAGES</p>
      <p className="tf-hint">Customers can prebook these after choosing seats and collect them at the counter.</p>
      <MenuEditor menu={menu} onChange={setMenu} />

      {/* Amenities */}
      <p className="form-section-label">AMENITIES</p>
      <div className="tf-amenities">
        {AMENITY_GROUPS.map(group => (
          <div key={group} className="tf-amenity-group">
            <p className="tf-amenity-title">{group}</p>
            <div className="tf-amenity-list">
              {AMENITIES.filter(a => a.group === group).map(a => (
                <button key={a.label} type="button"
                  className={`amenity-toggle ${form.amenities.includes(a.label) ? "active" : ""}`}
                  aria-pressed={form.amenities.includes(a.label)}
                  onClick={() => toggleAmenity(a.label)}>
                  <span aria-hidden="true">{a.icon}</span> {a.label}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Per-amenity photos */}
      {form.amenities.length > 0 && (
        <>
          <p className="form-section-label">AMENITY PHOTOS</p>
          <p className="tf-hint">
            Show guests what to expect. Amenities without your own photo use a representative stock image where one exists.
          </p>
          <div className="tf-amenity-photos">
            {form.amenities.map(a => (
              <div key={a} className="tf-amenity-photo">
                <PhotoSlot
                  label={`${amenityInfo(a).icon} ${a}`}
                  value={amenityPhotos[a] ?? ""}
                  onChange={url => setAmenityPhoto(a, url)}
                  folder="cineverse/theatres/amenities"
                  fallback={AMENITY_PHOTOS[a]}
                />
              </div>
            ))}
          </div>
        </>
      )}

      {/* Images */}
      <p className="form-section-label">THEATRE PHOTOS</p>
      <p className="tf-hint">The first photo becomes the cover on your theatre page and cards; the rest fill the gallery.</p>
      <MultiImageUpload
        label="Theatre Images"
        images={form.images}
        onChange={v => set("images", v)}
        folder="cineverse/theatres"
        optional
      />
    </Modal>
  );
}