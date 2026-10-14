import type { MenuCategory, MenuItem, Offer } from "../types/movie.types.ts";

export const MENU_CATEGORIES: MenuCategory[] = ["Popcorn", "Combos", "Snacks", "Beverages", "Desserts"];

export const CATEGORY_ICON: Record<MenuCategory, string> = {
  Popcorn: "🍿", Combos: "🍱", Snacks: "🌮", Beverages: "🥤", Desserts: "🍦",
};

export const offerHeadline = (o: Pick<Offer, "type" | "value" | "maxDiscount">) =>
  o.type === "PERCENT" ? `${o.value}% off${o.maxDiscount ? ` up to ₹${o.maxDiscount}` : ""}` : `₹${o.value} off`;

/** One-click starting menu for owners setting up F&B */
export const STARTER_MENU: MenuItem[] = [
  { name: "Salted Popcorn (Large)",  category: "Popcorn",   price: 320, veg: true, description: "Classic butter-salted, freshly popped" },
  { name: "Caramel Popcorn (Large)", category: "Popcorn",   price: 360, veg: true, description: "Crunchy caramel glaze" },
  { name: "Cheese Nachos",           category: "Snacks",    price: 280, veg: true, description: "Tortilla chips with warm cheese dip" },
  { name: "Chicken Hot Dog",         category: "Snacks",    price: 260, veg: false },
  { name: "Cold Drink (500ml)",      category: "Beverages", price: 180, veg: true },
  { name: "Cold Coffee",             category: "Beverages", price: 220, veg: true },
  { name: "Popcorn + 2 Drinks",      category: "Combos",    price: 599, veg: true, description: "Large salted popcorn with two 500ml drinks" },
  { name: "Chocolate Brownie",       category: "Desserts",  price: 190, veg: true },
];
