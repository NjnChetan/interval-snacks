import { rupee } from "./config";

const LABEL = {
  new: "Received",
  preparing: "Preparing",
  completed: "Ready",
};

function OrderCard({ order, staff, onStatus }) {
  return (
    <div className="panel">
      <div className="row">
        <b>#{order.id} · Screen {order.screen}, seat {order.seat}</b>
        <span className={`pill s-${order.status}`}>
          {LABEL[order.status] || order.status}
        </span>
      </div>
      {order.name && <div>{order.name}</div>}
      <div>
        {(order.items || []).map((item) =>
          `${item.q} × ${item.n}`
        ).join(", ")}
      </div>
      {order.note && <small className="mute">Note: {order.note}</small>}
      <div><b>{rupee(order.total)}</b></div>
      {order.created_at && (
        <small className="mute">{new Date(order.created_at).toLocaleString()}</small>
      )}
      {staff && order.status !== "completed" && (
        <div className="actions">
          {order.status !== "preparing" && (
            <button className="ghost" onClick={() => onStatus(order.id, "preparing")}>
              Preparing
            </button>
          )}
          <button className="ghost" onClick={() => onStatus(order.id, "completed")}>
            Completed
          </button>
        </div>
      )}
    </div>
  );
}

export default function Orders({ orders, staff = false, onStatus }) {
  const list = staff ? orders.filter((order) => order.status !== "completed") : orders;
  return (
    <section>
      {staff && (
        <p className="mute">
          Staff counter. Orders refresh automatically about every five seconds.
        </p>
      )}
      {list.length === 0 && (
        <div className="empty">
          {staff ? "No open orders." : "No orders yet. Pick something from the menu."}
        </div>
      )}
      {list.map((order) => (
        <OrderCard key={order.id} order={order} staff={staff} onStatus={onStatus} />
      ))}
    </section>
  );
}
