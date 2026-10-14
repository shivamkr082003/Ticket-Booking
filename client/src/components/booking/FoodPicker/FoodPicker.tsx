import { useState } from "react";
import type { MenuCategory, MenuItem } from "../../../types/movie.types.ts";
import { CATEGORY_ICON } from "../../../constants/checkout.ts";
import "./FoodPicker.css";

interface FoodPickerProps {
  menu:     MenuItem[];
  qty:      Record<string, number>;
  onChange: (itemId: string, qty: number) => void;
  max?:     number;
}

export default function FoodPicker({ menu, qty, onChange, max = 10 }: FoodPickerProps) {
  const categories = [...new Set(menu.map(m => m.category))];
  const [tab, setTab] = useState<MenuCategory | "All">("All");
  const items = tab === "All" ? menu : menu.filter(m => m.category === tab);

  return (
    <div className="fp">
      <div className="fp-head">
        <div>
          <h2 className="fp-title">Grab a bite!</h2>
          <p className="fp-sub">Prebook your snacks and skip the queue — collect them at the counter with your ticket.</p>
        </div>
      </div>

      {categories.length > 1 && (
        <div className="fp-tabs" role="tablist" aria-label="Menu category">
          {(["All", ...categories] as (MenuCategory | "All")[]).map(c => (
            <button key={c} role="tab" aria-selected={tab === c} className={`fp-tab ${tab === c ? "active" : ""}`} onClick={() => setTab(c)}>
              {c !== "All" && <span aria-hidden="true">{CATEGORY_ICON[c]}</span>} {c}
            </button>
          ))}
        </div>
      )}

      <div className="fp-grid">
        {items.map(item => {
          const id = item._id!;
          const n = qty[id] ?? 0;
          const soldOut = item.available === false;
          return (
            <article key={id} className={`fp-item ${n > 0 ? "is-added" : ""} ${soldOut ? "is-sold-out" : ""}`}>
              <div className="fp-media">
                {item.image
                  ? <img src={item.image} alt="" loading="lazy" />
                  : <span className="fp-emoji" aria-hidden="true">{CATEGORY_ICON[item.category]}</span>}
                <span className={`fp-veg ${item.veg === false ? "is-nonveg" : ""}`} title={item.veg === false ? "Non-veg" : "Veg"} />
              </div>
              <div className="fp-body">
                <p className="fp-name">{item.name}</p>
                {item.description && <p className="fp-desc">{item.description}</p>}
                <div className="fp-foot">
                  <span className="fp-price">₹{item.price}</span>
                  {soldOut ? (
                    <span className="fp-soldout">Sold out</span>
                  ) : n === 0 ? (
                    <button className="fp-add" onClick={() => onChange(id, 1)}>Add</button>
                  ) : (
                    <div className="fp-stepper" aria-label={`${item.name} quantity`}>
                      <button onClick={() => onChange(id, n - 1)} aria-label="Remove one">−</button>
                      <span>{n}</span>
                      <button onClick={() => onChange(id, Math.min(max, n + 1))} disabled={n >= max} aria-label="Add one">+</button>
                    </div>
                  )}
                </div>
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
}
