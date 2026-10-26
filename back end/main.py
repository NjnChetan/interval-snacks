import os 

import psycopg
from fastapi import FastAPI,HTTPException
from fastapi.middleware.cors import CORSMiddleware

app=FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000",
                  "http://localhost:5173",
                  ],
    allow_methods=["GET"],
    allow_headers=["*"]
)

def get_connection():
    return psycopg.connect(
        host=os.getenv("DB_HOST","localhost"),
        port=os.getenv("DB_PORT", "5432"),
        dbname=os.getenv("DB_NAME", "db"),
        user=os.getenv("DB_USER", "user"),
        password=os.getenv("DB_PASSWORD", "pass"),
        )
@app.get("/")
def home ():
    return("working")

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
        raise HTTPException(
            status_code=500,
            detail="Could not retrieve snacks from the database",
        )
