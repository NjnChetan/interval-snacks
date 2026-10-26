import { useCallback, useEffect, useMemo, useState } from "react";
import { WHATSAPP_NUMBER, THEATER, rupee } from "./config";
import Orders from "./Orders";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";
const params = new URLSearchParams(window.location.search);
const CUSTOMER_ORDER_IDS_KEY = "intervalSnackCustomerOrderIds";

function getCustomerOrderIds() {
  try {
    return JSON.parse(localStorage.getItem(CUSTOMER_ORDER_IDS_KEY) || "[]");
  } catch {
    return [];
  }
}

export default function App() {
  const [view, setView] = useState("menu");
  const [cat, setCat] = useState("Snacks");
  const [cart, setCart] = useState({});
  const [screen, setScreen] = useState(params.get("screen") || "");
  const [seat, setSeat] = useState(params.get("seat") || "");
  const [name, setName] = useState("");
  const [note, setNote] = useState("");
  const [menu, setMenu] = useState([]);
  const [menuLoading, setMenuLoading] = useState(true);
  const [menuError, setMenuError] = useState("");
  const [orders, setOrders] = useState([]);
  const [orderError, setOrderError] = useState("");
  const [sending, setSending] = useState(false);

  const loadMenu = useCallback(async () => {
    setMenuError("");
    try {
      const response = await fetch(`${API_URL}/snacks`);
      if (!response.ok) throw new Error(`API returned ${response.status}`);
      const data = await response.json();
      setMenu(data.map((snack) => ({
        id: snack.id,
        c: snack.category || "Snacks",
        n: snack.name,
        d: snack.description || "",
        p: Number(snack.price),
        e: snack.emoji || "🍿",
        available: snack.available,
      })));
    } catch (error) {
      console.error(error);
      setMenuError("Could not load snacks. Check that FastAPI and PostgreSQL are running.");
    } finally {
      setMenuLoading(false);
    }
  }, []);

  const loadOrders = useCallback(async () => {
    try {
      const response = await fetch(`${API_URL}/orders`);
      if (!response.ok) throw new Error(`API returned ${response.status}`);
      setOrders(await response.json());
      setOrderError("");
    } catch (error) {
      console.error(error);
      setOrderError("Could not load orders from the backend.");
    }
  }, []);

  useEffect(() => { loadMenu(); }, [loadMenu]);

  // Refresh shared order status while viewing customer orders or the staff counter.
  useEffect(() => {
    if (view !== "orders" && view !== "staff") return;
    loadOrders();
    const timer = window.setInterval(loadOrders, 5000);
    return () => window.clearInterval(timer);
  }, [view, loadOrders]);

  const categories = useMemo(
    () => [...new Set(menu.map((item) => item.c))],
    [menu]
  );
  const lines = useMemo(
    () => menu.filter((item) => cart[item.id]).map((item) => ({ ...item, qty: cart[item.id] })),
    [menu, cart]
  );
  const count = lines.reduce((sum, item) => sum + item.qty, 0);
  const total = lines.reduce((sum, item) => sum + item.qty * item.p, 0);
  const customerOrders = orders.filter((order) => getCustomerOrderIds().includes(order.id));

  function change(id, difference) {
    setCart((current) => {
      const quantity = Math.max(0, (current[id] || 0) + difference);
      const next = { ...current };
      if (quantity) next[id] = quantity;
      else delete next[id];
      return next;
    });
  }

  async function setStatus(id, status) {
    try {
      const response = await fetch(`${API_URL}/orders/${id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.detail || `Request failed: ${response.status}`);
      }
      await loadOrders();
    } catch (error) {
      console.error(error);
      alert(`Could not update order status: ${error.message}`);
    }
  }

  async function send() {
    if (sending) return;
    if (!lines.length) {
      alert("Please add at least one snack to your cart.");
      return;
    }
    if (!screen.trim() || !seat.trim()) {
      alert("Enter your screen and seat number so we can find you.");
      window.scrollTo(0, 0);
      return;
    }

    setSending(true);
    try {
      const response = await fetch(`${API_URL}/orders`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          screen: screen.trim(),
          seat: seat.trim(),
          customer_name: name.trim(),
          note: note.trim(),
          items: lines.map((item) => ({
            snack_id: item.id,
            quantity: item.qty,
          })),
        }),
      });

      const result = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(result.detail || `Order failed (${response.status})`);
      }

      const ids = getCustomerOrderIds();
      if (!ids.includes(result.id)) {
        localStorage.setItem(CUSTOMER_ORDER_IDS_KEY, JSON.stringify([...ids, result.id]));
      }

      setCart({});
      setView("orders");
      await loadOrders();

      // WhatsApp opens only after the API has successfully saved the order.
      if (WHATSAPP_NUMBER) {
        const message =
          `New snack order #${result.id}\n${THEATER}\nScreen ${result.screen}, Seat ${result.seat}` +
          (result.name ? `\nName: ${result.name}` : "") +
          "\n\n" + result.items.map((item) =>
            `${item.q} x ${item.n} = ${rupee(item.q * item.p)}`
          ).join("\n") +
          `\n\nTotal: ${rupee(result.total)}` +
          (result.note ? `\nNote: ${result.note}` : "");
        window.open(
          `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`,
          "_blank",
          "noopener,noreferrer"
        );
      } else {
        alert(`Order #${result.id} saved successfully. Configure VITE_WHATSAPP_NUMBER to enable WhatsApp.`);
      }
    } catch (error) {
      console.error(error);
      alert(`Could not place order: ${error.message}`);
    } finally {
      setSending(false);
    }
  }

  const inMenu = view === "menu" || view === "checkout";

  return (
    <>
      <main>
        <header>
          <h1>Interval snacks</h1>
          <div className="mute">
            {params.get("theater") || "Order now, we bring it to your seat."}
          </div>
        </header>

        <div className="seat">
          <label htmlFor="scr">Screen</label>
          <input id="scr" inputMode="numeric" maxLength={2} placeholder="2"
            value={screen} onChange={(event) => setScreen(event.target.value)} />
          <label htmlFor="st">Seat</label>
          <input id="st" maxLength={4} placeholder="F12"
            value={seat} onChange={(event) => setSeat(event.target.value)} />
        </div>

        <div className="tabs">
          <button aria-pressed={inMenu} onClick={() => setView("menu")}>Menu</button>
          <button aria-pressed={view === "orders"} onClick={() => setView("orders")}>My orders</button>
          <button aria-pressed={view === "staff"} onClick={() => setView("staff")}>Counter</button>
        </div>

        {view === "menu" && (
          <>
            {menuLoading && <p className="mute">Loading snacks...</p>}
            {menuError && <div className="panel" role="alert">
              <p>{menuError}</p>
              <button className="ghost" onClick={() => { setMenuLoading(true); loadMenu(); }}>Retry</button>
            </div>}
            {!menuLoading && !menuError && menu.length === 0 && (
              <p className="mute">No snacks found in the database.</p>
            )}
            {!menuLoading && !menuError && menu.length > 0 && (
              <>
                <div className="cats">
                  {categories.map((category) => (
                    <button key={category} aria-pressed={category === cat}
                      onClick={() => setCat(category)}>{category}</button>
                  ))}
                </div>
                {menu.filter((item) => item.c === cat && item.available !== false).map((item) => {
                  const quantity = cart[item.id] || 0;
                  return (
                    <div className="item" key={item.id}>
                      <div className="emoji">{item.e}</div>
                      <div className="t">
                        <b>{item.n}</b>
                        <small>{item.d ? `${item.d} · ` : ""}{rupee(item.p)}</small>
                      </div>
                      {quantity ? (
                        <div className="qty">
                          <button aria-label={`Remove one ${item.n}`} onClick={() => change(item.id, -1)}>−</button>
                          <b>{quantity}</b>
                          <button aria-label={`Add one ${item.n}`} onClick={() => change(item.id, 1)}>+</button>
                        </div>
                      ) : (
                        <button className="add" onClick={() => change(item.id, 1)}>Add</button>
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
            <button className="ghost" onClick={() => setView("menu")}>Back to menu</button>
            <div className="panel spaced">
              {lines.map((item) => (
                <div className="row" key={item.id}>
                  <span>{item.qty} × {item.n}</span><span>{rupee(item.qty * item.p)}</span>
                </div>
              ))}
              <div className="row total"><span>Total</span><span>{rupee(total)}</span></div>
            </div>
            <div className="panel">
              <label htmlFor="nm">Your name</label>
              <input id="nm" value={name} onChange={(event) => setName(event.target.value)} autoComplete="name" />
              <label htmlFor="note" className="spaced">Note for the counter (optional)</label>
              <textarea id="note" rows={2} placeholder="Less ice, no salt..." value={note}
                onChange={(event) => setNote(event.target.value)} />
            </div>
            <button className="primary" disabled={sending} onClick={send}>
              {sending ? "Placing order..." : "Place order"}
            </button>
            <p className="mute small">
              Your order is saved to the theater database. If WhatsApp is configured, a prefilled message will open after ordering.
            </p>
          </>
        )}

        {view === "orders" && (
          <>
            {orderError && <p role="alert">{orderError}</p>}
            <Orders orders={customerOrders} />
          </>
        )}
        {view === "staff" && (
          <>
            {orderError && <p role="alert">{orderError}</p>}
            <Orders orders={orders} staff onStatus={setStatus} />
          </>
        )}
      </main>

      {view === "menu" && (
        <div className="bar">
          <button disabled={!count} onClick={() => setView("checkout")}>
            <span>{count ? `View cart (${count} item${count > 1 ? "s" : ""})` : "Your cart is empty"}</span>
            <span>{count ? rupee(total) : ""}</span>
          </button>
        </div>
      )}
    </>
  );
}
