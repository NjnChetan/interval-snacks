import os
from decimal import Decimal

import psycopg
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

app = FastAPI(title="Interval Snacks API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://localhost:5173",
    ],
    allow_methods=["GET", "POST", "PATCH"],
    allow_headers=["*"],
)


def get_connection():
    return psycopg.connect(
        host=os.getenv("DB_HOST", "localhost"),
        port=os.getenv("DB_PORT", "5432"),
        dbname=os.getenv("DB_NAME", "db"),
        user=os.getenv("DB_USER", "user"),
        password=os.getenv("DB_PASSWORD", "pass"),
    )


@app.get("/")
def home():
    return {"message": "Interval Snacks API is running"}


@app.get("/snacks")
def get_snacks():
    try:
        with get_connection() as conn:
            with conn.cursor() as cur:
                cur.execute(
                    """
                    SELECT id, name, price, available
                    FROM snacks
                    ORDER BY id
                    """
                )
                rows = cur.fetchall()
        return [
            {
                "id": row[0],
                "name": row[1],
                "price": float(row[2]),
                "available": row[3],
            }
            for row in rows
        ]
    except psycopg.Error:
        raise HTTPException(status_code=500, detail="Could not retrieve snacks")


class OrderItemInput(BaseModel):
    snack_id: int
    quantity: int = Field(gt=0, le=50)


class OrderInput(BaseModel):
    screen: str = Field(min_length=1, max_length=10)
    seat: str = Field(min_length=1, max_length=10)
    customer_name: str = Field(default="", max_length=100)
    note: str = Field(default="", max_length=1000)
    items: list[OrderItemInput] = Field(min_length=1, max_length=50)


class StatusInput(BaseModel):
    status: str


def fetch_order(cur, order_id):
    cur.execute(
        """
        SELECT id, screen, seat, customer_name, note, total, status, created_at
        FROM orders WHERE id = %s
        """,
        (order_id,),
    )
    row = cur.fetchone()
    if row is None:
        return None

    cur.execute(
        """
        SELECT snack_id, snack_name, quantity, unit_price
        FROM order_items WHERE order_id = %s ORDER BY id
        """,
        (order_id,),
    )
    items = cur.fetchall()
    return {
        "id": row[0],
        "screen": row[1],
        "seat": row[2],
        "name": row[3] or "",
        "note": row[4] or "",
        "total": float(row[5]),
        "status": row[6],
        "created_at": row[7].isoformat(),
        "items": [
            {"snack_id": i[0], "n": i[1], "q": i[2], "p": float(i[3])}
            for i in items
        ],
    }


@app.post("/orders", status_code=201)
def create_order(order: OrderInput):
    try:
        with get_connection() as conn:
            with conn.cursor() as cur:
                chosen_items = []
                total = Decimal("0.00")

                # Trust prices from the database, never prices sent by the browser.
                for item in order.items:
                    cur.execute(
                        "SELECT id, name, price, available FROM snacks WHERE id = %s",
                        (item.snack_id,),
                    )
                    snack = cur.fetchone()
                    if snack is None:
                        raise HTTPException(status_code=404, detail=f"Snack {item.snack_id} not found")
                    if not snack[3]:
                        raise HTTPException(status_code=400, detail=f"{snack[1]} is unavailable")
                    price = snack[2]
                    total += price * item.quantity
                    chosen_items.append((snack[0], snack[1], item.quantity, price))

                cur.execute(
                    """
                    INSERT INTO orders (screen, seat, customer_name, note, total)
                    VALUES (%s, %s, %s, %s, %s)
                    RETURNING id
                    """,
                    (order.screen.strip(), order.seat.strip(),
                     order.customer_name.strip(), order.note.strip(), total),
                )
                order_id = cur.fetchone()[0]

                for snack_id, snack_name, quantity, price in chosen_items:
                    cur.execute(
                        """
                        INSERT INTO order_items
                            (order_id, snack_id, snack_name, quantity, unit_price)
                        VALUES (%s, %s, %s, %s, %s)
                        """,
                        (order_id, snack_id, snack_name, quantity, price),
                    )

                result = fetch_order(cur, order_id)
        return result
    except HTTPException:
        raise
    except psycopg.Error:
        raise HTTPException(status_code=500, detail="Could not save the order")


@app.get("/orders")
def list_orders():
    try:
        with get_connection() as conn:
            with conn.cursor() as cur:
                cur.execute("SELECT id FROM orders ORDER BY created_at DESC, id DESC")
                ids = [row[0] for row in cur.fetchall()]
                return [fetch_order(cur, order_id) for order_id in ids]
    except psycopg.Error:
        raise HTTPException(status_code=500, detail="Could not retrieve orders")


@app.patch("/orders/{order_id}/status")
def update_order_status(order_id: int, update: StatusInput):
    if update.status not in {"new", "preparing", "completed"}:
        raise HTTPException(status_code=400, detail="Invalid order status")
    try:
        with get_connection() as conn:
            with conn.cursor() as cur:
                cur.execute(
                    "UPDATE orders SET status = %s WHERE id = %s RETURNING id",
                    (update.status, order_id),
                )
                if cur.fetchone() is None:
                    raise HTTPException(status_code=404, detail="Order not found")
                result = fetch_order(cur, order_id)
        return result
    except HTTPException:
        raise
    except psycopg.Error:
        raise HTTPException(status_code=500, detail="Could not update order status")
