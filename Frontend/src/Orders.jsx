import { rupee } from "./config";

const LABEL = { new: "Received", preparing: "Preparing", completed: "Ready" };

function OrderCard({ o, staff, onStatus }) {
  return (
    <div className="panel">
      <div className="row">
        <b>#{o.id} · Screen {o.screen}, seat {o.seat}</b>
        <span className={`pill s-${o.status}`}>{LABEL[o.status]}</span>
      </div>
      <div>{o.items.map((i) => `${i.q} × ${i.n}`).join(", ")}</div>
      {o.note && <small className="mute">Note: {o.note}</small>}
      <div><b>{rupee(o.total)}</b></div>
      {staff && (
        <div className="actions">
          <button className="ghost" onClick={() => onStatus(o.id, "preparing")}>Preparing</button>
          <button className="ghost" onClick={() => onStatus(o.id, "completed")}>Completed</button>
        </div>
      )}
    </div>
  );
}

export default function Orders({ orders, staff = false, onStatus }) {
  const list = staff ? orders.filter((o) => o.status !== "completed") : orders;
  return (
    <section>
      {staff && (
        <p className="mute">
          Demo view. In the real system this list comes from the server and updates on every counter at once.
        </p>
      )}
      {list.length === 0 && (
        <div className="empty">{staff ? "No open orders." : "No orders yet. Pick something from the menu."}</div>
      )}
      {list.map((o) => (
        <OrderCard key={o.id} o={o} staff={staff} onStatus={onStatus} />
      ))}
    </section>
  );
}
