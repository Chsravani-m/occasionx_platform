from fastapi import FastAPI

app = FastAPI(title="OccasionX")

@app.get("/health")
def health():
    return {"status":"UP"}
