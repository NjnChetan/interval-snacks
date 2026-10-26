
import { useState, useEffect, useMemo } from "react";
import {
  CATEGORIES,
  WHATSAPP_NUMBER,
  THEATER,
  rupee,
} from "./config";
import Orders from "./Orders";

const API_URL = "http://localhost:8000";
const params = new URLSearchParams(window.location.search);

export default function App() {
  const [view, setView] = useState("menu");
  const [cat, setCat] = useState(CATEGORIES[0] || "Snacks");
  const [cart, setCart] = useState({});
  const [screen, setScreen] = useState(params.get("screen") || "");
  const [seat, setSeat] = useState(params.get("seat") || "");
  const [name, setName] = useState("");
  const [note, setNote] = useState("");

  // Snacks fetched from FastAPI
  const [menu, setMenu] = useState([]);
  const [menuLoading, setMenuLoading] = useState(true);
  const [menuError, setMenuError] = useState("");

  // Existing demo order storage (not yet connected to backend)
  const [orders, setOrders] = useState(() => {
    try {
      return JSON.parse(
        localStorage.getItem("snackOrders") || "[]"
      );
    } catch {
      return [];
    }
  });

  // Fetch snacks from PostgreSQL through FastAPI
  useEffect(() => {
    let cancelled = false;

    async function loadMenu() {
      try {
        setMenuLoading(true);
        setMenuError("");

        const response = await fetch(`${API_URL}/snacks`);

        if (!response.ok) {
          throw new Error(`Request failed: ${response.status}`);
        }

        const data = await response.json();

        if (!Array.isArray(data)) {
          throw new Error("Unexpected menu response");
        }

        const fetchedMenu = data.map((snack) => ({
          id: snack.id,
          c: snack.category || "Snacks",
          n: snack.name,
          d: snack.description || "",
          p: Number(snack.price),
          e: snack.emoji || "🍿",
          available: snack.available,
        }));

        if (!cancelled) {
          setMenu(fetchedMenu);

          // Keep the selected category valid after loading.
          if (fetchedMenu.length > 0) {
            setCat((current) =>
              fetchedMenu.some((item) => item.c === current)
                ? current
                : fetchedMenu[0].c
            );
          }
        }
      } catch (error) {
        if (!cancelled) {
          setMenuError(
            "Could not load snacks. Check that FastAPI and PostgreSQL are running."
          );
          console.error("Menu loading error:", error);
        }
      } finally {
        if (!cancelled) {
          setMenuLoading(false);
        }
      }
    }

    loadMenu();

    return () => {
      cancelled = true;
    };
  }, []);

  // Persist demo orders in this browser.
  useEffect(() => {
    try {
      localStorage.setItem("snackOrders", JSON.stringify(orders));
    } catch (error) {
      console.error("Could not save orders:", error);
    }
  }, [orders]);

  const categories = useMemo(
    () => [...new Set(menu.map((item) => item.c))],
    [menu]
  );

  const lines = useMemo(
    () =>
      menu
        .filter((item) => cart[item.id])
        .map((item) => ({ ...item, qty: cart[item.id] })),
    [menu, cart]
  );

  const count = lines.reduce((sum, item) => sum + item.qty, 0);

  const total = lines.reduce(
    (sum, item) => sum + item.qty * item.p,
    0
  );

  function change(id, difference) {
    setCart((current) => {
      const quantity = Math.max(
        0,
        (current[id] || 0) + difference
      );

      const next = { ...current };

      if (quantity > 0) {
        next[id] = quantity;
      } else {
        delete next[id];
      }

      return next;
    });
  }

  function setStatus(id, status) {
    setOrders((current) =>
      current.map((order) =>
        order.id === id ? { ...order, status } : order
      )
    );
  }

  function send() {
    if (lines.length === 0) {
      alert("Please add at least one snack to your cart.");
      return;
    }

    if (!screen.trim() || !seat.trim()) {
      alert("Enter your screen and seat number so we can find you.");
      window.scrollTo(0, 0);
      return;
    }

    if (!WHATSAPP_NUMBER) {
      alert(
        "WhatsApp number is not set. Add VITE_WHATSAPP_NUMBER to your .env file."
      );
      return;
    }

    const order = {
      id: String(Date.now()).slice(-4),
      screen: screen.trim(),
      seat: seat.trim(),
      name: name.trim(),
      note: note.trim(),
      items: lines.map((item) => ({
        n: item.n,
        q: item.qty,
        p: item.p,
      })),
      total,
      status: "new",
    };

    // This still saves orders only in the current browser.
    setOrders((current) => [order, ...current]);

    const message =
      `New snack order #${order.id}\n${THEATER}\n` +
      `Screen ${order.screen}, Seat ${order.seat}` +
      (order.name ? `\nName: ${order.name}` : "") +
      "\n\n" +
      order.items
        .map(
          (item) =>
            `${item.q} x ${item.n} = ${rupee(item.q * item.p)}`
        )
        .join("\n") +
      `\n\nTotal: ${rupee(order.total)}` +
      (order.note ? `\nNote: ${order.note}` : "");

    setCart({});
    setView("orders");

    window.open(
      `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`,
      "_blank",
      "noopener,noreferrer"
    );
  }

  const inMenu = view === "menu" || view === "checkout";

  return (
    <>
      <main>
        <header>
          <h1>Interval snacks</h1>
          <div className="mute">
            {params.get("theater") ||
              "Order now, we bring it to your seat."}
          </div>
        </header>

        <div className="seat">
          <label htmlFor="scr">Screen</label>
          <input
            id="scr"
            inputMode="numeric"
            maxLength={2}
            placeholder="2"
            value={screen}
            onChange={(event) => setScreen(event.target.value)}
          />

          <label htmlFor="st">Seat</label>
          <input
            id="st"
            maxLength={4}
            placeholder="F12"
            value={seat}
            onChange={(event) => setSeat(event.target.value)}
          />
        </div>

        <div className="tabs">
          <button
            aria-pressed={inMenu}
            onClick={() => setView("menu")}
          >
            Menu
          </button>

          <button
            aria-pressed={view === "orders"}
            onClick={() => setView("orders")}
          >
            My orders
          </button>

          <button
            aria-pressed={view === "staff"}
            onClick={() => setView("staff")}
          >
            Counter
          </button>
        </div>

        {view === "menu" && (
          <>
            {menuLoading && (
              <p className="mute">Loading snacks...</p>
            )}

            {menuError && (
              <div className="panel" role="alert">
                <p>{menuError}</p>
                <button
                  className="ghost"
                  onClick={() => window.location.reload()}
                >
                  Retry
                </button>
              </div>
            )}

            {!menuLoading && !menuError && menu.length === 0 && (
              <p className="mute">
                No snacks found in the database.
              </p>
            )}

            {!menuLoading && !menuError && menu.length > 0 && (
              <>
                <div className="cats">
                  {categories.map((category) => (
                    <button
                      key={category}
                      aria-pressed={category === cat}
                      onClick={() => setCat(category)}
                    >
                      {category}
                    </button>
                  ))}
                </div>

                {menu
                  .filter(
                    (item) =>
                      item.c === cat && item.available !== false
                  )
                  .map((item) => {
                    const quantity = cart[item.id] || 0;

                    return (
                      <div className="item" key={item.id}>
                        <div className="emoji">{item.e}</div>

                        <div className="t">
                          <b>{item.n}</b>
                          <small>
                            {item.d ? `${item.d} · ` : ""}
                            {rupee(item.p)}
                          </small>
                        </div>

                        {quantity > 0 ? (
                          <div className="qty">
                            <button
                              aria-label={`Remove one ${item.n}`}
                              onClick={() => change(item.id, -1)}
                            >
                              −
                            </button>

                            <b>{quantity}</b>

                            <button
                              aria-label={`Add one ${item.n}`}
                              onClick={() => change(item.id, 1)}
                            >
                              +
                            </button>
                          </div>
                        ) : (
                          <button
                            className="add"
                            onClick={() => change(item.id, 1)}
                          >
                            Add
                          </button>
                        )}
                      </div>
                    );
                  })}
              </>
            )}
          </>
        )}

        {view === "checkout" && (
          <>
            <button
              className="ghost"
              onClick={() => setView("menu")}
            >
              Back to menu
            </button>

            <div className="panel spaced">
              {lines.map((item) => (
                <div className="row" key={item.id}>
                  <span>
                    {item.qty} × {item.n}
                  </span>
                  <span>{rupee(item.qty * item.p)}</span>
                </div>
              ))}

              <div className="row total">
                <span>Total</span>
                <span>{rupee(total)}</span>
              </div>
            </div>

            <div className="panel">
              <label htmlFor="nm">Your name</label>
              <input
                id="nm"
                value={name}
                onChange={(event) => setName(event.target.value)}
                autoComplete="name"
              />

              <label htmlFor="note" className="spaced">
                Note for the counter (optional)
              </label>
              <textarea
                id="note"
                rows={2}
                placeholder="Less ice, no salt..."
                value={note}
                onChange={(event) => setNote(event.target.value)}
              />
            </div>

            <button className="primary" onClick={send}>
              Send order on WhatsApp
            </button>

            <p className="mute small">
              WhatsApp opens with your order ready to send. Pay at
              the counter or when it arrives.
            </p>
          </>
        )}

        {view === "orders" && (
          <Orders orders={orders} />
        )}

        {view === "staff" && (
          <Orders
            orders={orders}
            staff
            onStatus={setStatus}
          />
        )}
      </main>

      {view === "menu" && (
        <div className="bar">
          <button
            disabled={!count}
            onClick={() => setView("checkout")}
          >
            <span>
              {count
                ? `View cart (${count} item${count > 1 ? "s" : ""})`
                : "Your cart is empty"}
            </span>
            <span>{count ? rupee(total) : ""}</span>
          </button>
        </div>
      )}
    </>
  );
}