import type { MenuCategory, MenuItem } from "../../../../types/movie.types.ts";
import { CATEGORY_ICON, MENU_CATEGORIES, STARTER_MENU } from "../../../../constants/checkout.ts";
import PhotoSlot from "../../../common/PhotoSlot/PhotoSlot.tsx";

interface MenuEditorProps {
  menu:     MenuItem[];
  onChange: (menu: MenuItem[]) => void;
}

// Items keep their _id across edits so past bookings still reference them
export default function MenuEditor({ menu, onChange }: MenuEditorProps) {
  const update = (i: number, patch: Partial<MenuItem>) =>
    onChange(menu.map((m, j) => (j === i ? { ...m, ...patch } : m)));

  return (
    <div className="me">
      {menu.length === 0 && (
        <div className="me-empty">
          <p>No food menu yet. Customers will skip the food step at checkout.</p>
          <button type="button" className="btn btn-ghost btn-sm" onClick={() => onChange(STARTER_MENU.map(m => ({ ...m })))}>
            🍿 Use a starter menu
          </button>
        </div>
      )}

      {menu.map((item, i) => (
        <div key={item._id ?? `new-${i}`} className={`me-item ${item.available === false ? "is-off" : ""}`}>
          <PhotoSlot value={item.image ?? ""} onChange={image => update(i, { image })} folder="cineverse/theatres/menu" />
          <div className="me-fields">
            <div className="me-row">
              <input className="form-input" value={item.name} maxLength={60} placeholder="Item name"
                aria-label="Item name" onChange={e => update(i, { name: e.target.value })} />
              <select className="form-input me-cat" value={item.category} aria-label="Category"
                onChange={e => update(i, { category: e.target.value as MenuCategory })}>
                {MENU_CATEGORIES.map(c => <option key={c} value={c}>{CATEGORY_ICON[c]} {c}</option>)}
              </select>
              <input className="form-input me-price" type="number" min={1} value={item.price} aria-label="Price"
                onChange={e => update(i, { price: Number(e.target.value) || 0 })} />
            </div>
            <div className="me-row">
              <input className="form-input" value={item.description ?? ""} maxLength={140} placeholder="Short description (optional)"
                aria-label="Description" onChange={e => update(i, { description: e.target.value })} />
              <label className="me-check"><input type="checkbox" checked={item.veg !== false} onChange={e => update(i, { veg: e.target.checked })} /> Veg</label>
              <label className="me-check"><input type="checkbox" checked={item.available !== false} onChange={e => update(i, { available: e.target.checked })} /> In stock</label>
              <button type="button" className="ps-link ps-link--danger" onClick={() => onChange(menu.filter((_, j) => j !== i))}>Remove</button>
            </div>
          </div>
        </div>
      ))}

      <button type="button" className="se-add"
        onClick={() => onChange([...menu, { name: "", category: "Snacks", price: 150, veg: true, available: true, description: "" }])}>
        + Add menu item
      </button>
    </div>
  );
}
