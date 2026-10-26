// Values come from the .env file (Vite only exposes variables that start with VITE_)
export const WHATSAPP_NUMBER = import.meta.env.VITE_WHATSAPP_NUMBER || "";
export const THEATER = import.meta.env.VITE_THEATER_NAME || "Your Theater";

export const MENU = [
  { id: 1, c: "Popcorn", n: "Salted popcorn", d: "Regular tub", p: 150, e: "🍿" },
  { id: 2, c: "Popcorn", n: "Caramel popcorn", d: "Regular tub", p: 180, e: "🍯" },
  { id: 3, c: "Popcorn", n: "Cheese popcorn", d: "Regular tub", p: 190, e: "🧀" },
  { id: 4, c: "Drinks", n: "Cola", d: "500 ml", p: 90, e: "🥤" },
  { id: 5, c: "Drinks", n: "Cold coffee", d: "300 ml", p: 120, e: "☕" },
  { id: 6, c: "Drinks", n: "Water", d: "1 litre", p: 30, e: "💧" },
  { id: 7, c: "Bites", n: "Veg puff", d: "Hot", p: 40, e: "🥟" },
  { id: 8, c: "Bites", n: "French fries", d: "With ketchup", p: 110, e: "🍟" },
  { id: 9, c: "Bites", n: "Veg sandwich", d: "Grilled", p: 100, e: "🥪" },
  { id: 10, c: "Sweets", n: "Chocolate bar", d: "Small", p: 50, e: "🍫" },
];

export const CATEGORIES = [...new Set(MENU.map((m) => m.c))];
export const rupee = (n) => "₹" + n;
