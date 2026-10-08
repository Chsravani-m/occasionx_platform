import os
from fastapi import FastAPI
from fastapi import Request
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from fastapi import Response
import httpx

app = FastAPI(
    title="OccasionX API Gateway"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        o.strip()
        for o in os.getenv(
            "CORS_ORIGINS",
            "http://localhost:3000,http://localhost:8081,http://localhost:8082",
        ).split(",")
        if o.strip()
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

AUTH_SERVICE = os.getenv("AUTH_SERVICE_URL", "http://localhost:8001")
USER_SERVICE = os.getenv("USER_SERVICE_URL", "http://localhost:8002")
PROVIDER_SERVICE = os.getenv("PROVIDER_SERVICE_URL", "http://localhost:8003")
CATALOG_SERVICE = os.getenv("CATALOG_SERVICE_URL", "http://localhost:8004")
BOOKING_SERVICE = os.getenv("BOOKING_SERVICE_URL", "http://localhost:8005")
SEARCH_SERVICE = os.getenv("SEARCH_SERVICE_URL", "http://localhost:8006")
AI_SERVICE = os.getenv("AI_SERVICE_URL", "http://localhost:8007")
COLLAB_SERVICE = os.getenv("COLLAB_SERVICE_URL", "http://localhost:8008")

# Generous, shared timeout for all proxied calls to downstream services.
# The default httpx timeout (5s total) is too tight for local dev, where a
# service that's mid-restart (uvicorn --reload) or doing a cold DB query can
# briefly take longer to accept a connection or respond, causing spurious
# ConnectTimeout/ReadTimeout errors even though the service is healthy.
DEFAULT_TIMEOUT = httpx.Timeout(
    connect=10.0,
    read=30.0,
    write=30.0,
    pool=30.0
)

@app.api_route(
    "/auth/{path:path}",
    methods=[
        "GET",
        "POST",
        "PUT",
        "DELETE",
        "PATCH",
        "OPTIONS"
    ]
)
@app.api_route(
    "/auth/{path:path}",
    methods=["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"]
)
async def auth_proxy(path: str, request: Request):

    target_url = f"{AUTH_SERVICE}/api/v1/auth/{path}"

    print("REQUEST METHOD:", request.method)
    print("FORWARDING TO:", target_url)

    timeout = httpx.Timeout(
        connect=10.0,
        read=30.0,
        write=30.0,
        pool=30.0
    )

    async with httpx.AsyncClient(
        timeout=timeout
    ) as client:

        response = await client.request(
            request.method,
            target_url,
            headers=dict(request.headers),
            content=await request.body(),
            params=request.query_params
        )

        print("AUTH SERVICE STATUS:", response.status_code)


        try:
            return JSONResponse(
                status_code=response.status_code,
                content=response.json()
            )
        except Exception:
            return JSONResponse(
                status_code=response.status_code,
                content={"message": response.text}
            )
        
    
@app.api_route(
    "/users/{path:path}",
    methods=[
        "GET",
        "POST",
        "PUT",
        "DELETE",
        "PATCH"
    ]
)
async def user_proxy(
    path: str,
    request: Request
):

    async with httpx.AsyncClient(timeout=DEFAULT_TIMEOUT) as client:

        response = await client.request(
            request.method,
            f"{USER_SERVICE}/api/v1/users/{path}",
            headers=dict(request.headers),
            content=await request.body(),
            params=request.query_params
        )

        try:
            return JSONResponse(
                status_code=response.status_code,
                content=response.json()
            )
        except Exception:
            return JSONResponse(
                status_code=response.status_code,
                content={"message": response.text}
            )
@app.api_route(
    "/providers",
    methods=["POST", "GET"]
)
async def provider_root(
    request: Request
):
    async with httpx.AsyncClient(timeout=DEFAULT_TIMEOUT) as client:

        response = await client.request(
            request.method,
            f"{PROVIDER_SERVICE}/providers",
            headers=dict(request.headers),
            content=await request.body(),
            params=request.query_params
        )
        print("PROVIDER STATUS =", response.status_code)

        try:
            return JSONResponse(
                status_code=response.status_code,
                content=response.json()
            )
        except Exception:
            return JSONResponse(
                status_code=response.status_code,
                content={"message": response.text}
            )
        
@app.api_route(
    "/providers/{path:path}",
    methods=[
        "GET",
        "POST",
        "PUT",
        "DELETE",
        "PATCH"
    ]
)

async def provider_proxy(
    path: str,
    request: Request
):

    async with httpx.AsyncClient(timeout=DEFAULT_TIMEOUT) as client:

        response = await client.request(
            request.method,
            f"{PROVIDER_SERVICE}/providers/{path}",
            headers=dict(request.headers),
            content=await request.body(),
            params=request.query_params
        )
        try:
            return JSONResponse(
                status_code=response.status_code,
                content=response.json()
            )
        except Exception:
            return JSONResponse(
                status_code=response.status_code,
                content={"message": response.text}
            )
@app.api_route(
    "/uploads/{path:path}",
    methods=["GET"]
)
async def uploads_proxy(
    path: str,
    request: Request
):
    """
    Streams provider-service's uploaded portfolio media (images/videos)
    back through the gateway, so mobile clients can build media URLs off
    the single api-gateway origin instead of needing to know
    provider-service's own host/port directly. Unlike the JSON proxies
    above, this returns the raw bytes with the original content-type -
    running an image/video through response.json() would corrupt it.
    """

    async with httpx.AsyncClient(timeout=DEFAULT_TIMEOUT) as client:

        response = await client.get(
            f"{PROVIDER_SERVICE}/uploads/{path}",
            params=request.query_params
        )

        return Response(
            content=response.content,
            status_code=response.status_code,
            media_type=response.headers.get("content-type")
        )


@app.api_route(
    "/search/providers",
    methods=["GET"]
)
async def search_proxy(
    request: Request
):

    async with httpx.AsyncClient(timeout=DEFAULT_TIMEOUT) as client:

        response = await client.request(
            request.method,
            f"{PROVIDER_SERVICE}/search/providers",
            params=request.query_params
        )

        try:
            return JSONResponse(
                status_code=response.status_code,
                content=response.json()
            )
        except Exception:
            return JSONResponse(
                status_code=response.status_code,
                content={"message": response.text}
            )

@app.api_route(
    "/search/category/{category_id}/services",
    methods=["GET"]
)
async def search_category_services_proxy(
    category_id: str,
    request: Request
):

    async with httpx.AsyncClient(timeout=DEFAULT_TIMEOUT) as client:

        response = await client.request(
            request.method,
            f"{PROVIDER_SERVICE}/search/category/{category_id}/services",
            params=request.query_params
        )

        try:
            return JSONResponse(
                status_code=response.status_code,
                content=response.json()
            )
        except Exception:
            return JSONResponse(
                status_code=response.status_code,
                content={"message": response.text}
            )

@app.api_route(
    "/search/{path:path}",
    methods=[
        "GET",
        "POST",
        "PUT",
        "DELETE",
        "PATCH"
    ]
)
async def search_service_proxy(
    path: str,
    request: Request
):
    async with httpx.AsyncClient(timeout=DEFAULT_TIMEOUT) as client:

        response = await client.request(
            request.method,
            f"{SEARCH_SERVICE}/search/{path}",
            headers=dict(request.headers),
            content=await request.body(),
            params=request.query_params
        )

        try:
            return JSONResponse(
                status_code=response.status_code,
                content=response.json()
            )
        except Exception:
            return JSONResponse(
                status_code=response.status_code,
                content={"message": response.text}
            )
    
@app.api_route(
    "/catalog/{path:path}",
    methods=[
        "GET",
        "POST",
        "PUT",
        "DELETE",
        "PATCH"
    ]
)
async def catalog_proxy(
    path: str,
    request: Request
):
    async with httpx.AsyncClient(timeout=DEFAULT_TIMEOUT) as client:

        response = await client.request(
            request.method,
            f"{CATALOG_SERVICE}/{path}",
            headers=dict(request.headers),
            content=await request.body(),
            params=request.query_params
        )

        try:
            return JSONResponse(
                status_code=response.status_code,
                content=response.json()
            )
        except Exception:
            return JSONResponse(
                status_code=response.status_code,
                content={"message": response.text}
            )
        
@app.api_route(
    "/locations/{path:path}",
    methods=[
        "GET",
        "POST",
        "PUT",
        "DELETE",
        "PATCH"
    ]
)
async def location_proxy(
    path: str,
    request: Request
):
    async with httpx.AsyncClient(timeout=DEFAULT_TIMEOUT) as client:

        response = await client.request(
            request.method,
            f"{CATALOG_SERVICE}/locations/{path}",
            headers=dict(request.headers),
            content=await request.body(),
            params=request.query_params
        )

        try:
            return JSONResponse(
                status_code=response.status_code,
                content=response.json()
            )
        except Exception:
            return JSONResponse(
                status_code=response.status_code,
                content={"message": response.text}
            )
        
@app.api_route(
    "/bookings",
    methods=[
        "GET",
        "POST"
    ]
)
async def booking_root(
    request: Request
):
    async with httpx.AsyncClient(timeout=DEFAULT_TIMEOUT) as client:

        response = await client.request(
            request.method,
            f"{BOOKING_SERVICE}/bookings",
            headers=dict(request.headers),
            content=await request.body(),
            params=request.query_params
        )

        print("BOOKING ROOT STATUS =", response.status_code)

        return Response(
            content=response.text,
            status_code=response.status_code,
            media_type=response.headers.get(
                "content-type",
                "application/json"
            )
        )
        
@app.api_route(
    "/bookings/{path:path}",
    methods=[
        "GET",
        "POST",
        "PUT",
        "PATCH",
        "DELETE"
    ]
)
async def booking_proxy(
    path: str,
    request: Request
):

    async with httpx.AsyncClient(timeout=DEFAULT_TIMEOUT) as client:

        response = await client.request(
            request.method,
            f"{BOOKING_SERVICE}/bookings/{path}",
            headers=dict(request.headers),
            content=await request.body(),
            params=request.query_params
        )

        print("BOOKING STATUS =", response.status_code)

        return Response(
            content=response.text,
            status_code=response.status_code,
            media_type=response.headers.get(
                "content-type",
                "application/json"
    )
)

@app.api_route(
    "/notifications/{path:path}",
    methods=[
        "GET",
        "POST",
        "PUT",
        "PATCH",
        "DELETE"
    ]
)
async def notification_proxy(
    path: str,
    request: Request
):

    async with httpx.AsyncClient(timeout=DEFAULT_TIMEOUT) as client:

        response = await client.request(
            request.method,
            f"{BOOKING_SERVICE}/notifications/{path}",
            headers=dict(request.headers),
            content=await request.body(),
            params=request.query_params
        )

        return Response(
            content=response.text,
            status_code=response.status_code,
            media_type=response.headers.get(
                "content-type",
                "application/json"
            )
        )

@app.api_route(
    "/wishlist",
    methods=[
        "GET",
        "POST"
    ]
)
async def wishlist_root(
    request: Request
):
    async with httpx.AsyncClient(timeout=DEFAULT_TIMEOUT) as client:

        response = await client.request(
            request.method,
            f"{BOOKING_SERVICE}/wishlist",
            headers=dict(request.headers),
            content=await request.body(),
            params=request.query_params
        )

        return Response(
            content=response.text,
            status_code=response.status_code,
            media_type=response.headers.get(
                "content-type",
                "application/json"
            )
        )

@app.api_route(
    "/wishlist/{path:path}",
    methods=[
        "GET",
        "POST",
        "PUT",
        "PATCH",
        "DELETE"
    ]
)
async def wishlist_proxy(
    path: str,
    request: Request
):

    async with httpx.AsyncClient(timeout=DEFAULT_TIMEOUT) as client:

        response = await client.request(
            request.method,
            f"{BOOKING_SERVICE}/wishlist/{path}",
            headers=dict(request.headers),
            content=await request.body(),
            params=request.query_params
        )

        return Response(
            content=response.text,
            status_code=response.status_code,
            media_type=response.headers.get(
                "content-type",
                "application/json"
            )
        )

@app.api_route(
    "/payments/{path:path}",
    methods=[
        "GET",
        "POST",
        "PUT",
        "PATCH",
        "DELETE"
    ]
)
async def payment_proxy(
    path: str,
    request: Request
):

    async with httpx.AsyncClient(timeout=DEFAULT_TIMEOUT) as client:

        response = await client.request(
            request.method,
            f"{BOOKING_SERVICE}/payments/{path}",
            headers=dict(request.headers),
            content=await request.body(),
            params=request.query_params
        )

        return Response(
            content=response.text,
            status_code=response.status_code,
            media_type=response.headers.get(
                "content-type",
                "application/json"
            )
        )

@app.api_route(
    "/ai/{path:path}",
    methods=[
        "GET",
        "POST",
        "PUT",
        "DELETE",
        "PATCH"
    ]
)
async def ai_proxy(
    path: str,
    request: Request
):
    async with httpx.AsyncClient(timeout=DEFAULT_TIMEOUT) as client:

        response = await client.request(
            request.method,
            f"{AI_SERVICE}/ai/{path}",
            headers=dict(request.headers),
            content=await request.body(),
            params=request.query_params
        )

        try:
            return JSONResponse(
                status_code=response.status_code,
                content=response.json()
            )
        except Exception:
            return JSONResponse(
                status_code=response.status_code,
                content={"message": response.text}
            )

@app.api_route(
    "/budget/{path:path}",
    methods=[
        "GET",
        "POST",
        "PUT",
        "DELETE",
        "PATCH"
    ]
)
async def budget_proxy(
    path: str,
    request: Request
):
    async with httpx.AsyncClient(timeout=DEFAULT_TIMEOUT) as client:

        response = await client.request(
            request.method,
            f"{SEARCH_SERVICE}/budget/{path}",
            headers=dict(request.headers),
            content=await request.body(),
            params=request.query_params
        )

        try:
            return JSONResponse(
                status_code=response.status_code,
                content=response.json()
            )
        except Exception:
            return JSONResponse(
                status_code=response.status_code,
                content={"message": response.text}
            )

@app.api_route(
    "/vendor/{path:path}",
    methods=[
        "GET",
        "POST",
        "PUT",
        "DELETE",
        "PATCH"
    ]
)
async def vendor_proxy(
    path: str,
    request: Request
):
    async with httpx.AsyncClient(timeout=DEFAULT_TIMEOUT) as client:

        response = await client.request(
            request.method,
            f"{SEARCH_SERVICE}/vendor/{path}",
            headers=dict(request.headers),
            content=await request.body(),
            params=request.query_params
        )

        try:
            return JSONResponse(
                status_code=response.status_code,
                content=response.json()
            )
        except Exception:
            return JSONResponse(
                status_code=response.status_code,
                content={"message": response.text}
            )

@app.api_route(
    "/collab/{path:path}",
    methods=[
        "GET",
        "POST",
        "PUT",
        "DELETE",
        "PATCH"
    ]
)
async def collab_proxy(
    path: str,
    request: Request
):
    async with httpx.AsyncClient(timeout=DEFAULT_TIMEOUT) as client:

        response = await client.request(
            request.method,
            f"{COLLAB_SERVICE}/collab/{path}",
            headers=dict(request.headers),
            content=await request.body(),
            params=request.query_params
        )

        try:
            return JSONResponse(
                status_code=response.status_code,
                content=response.json()
            )
        except Exception:
            return JSONResponse(
                status_code=response.status_code,
                content={"message": response.text}
            )

@app.get("/")
def health():
    return {
        "gateway": "running",
        "services": {
            "auth": AUTH_SERVICE,
            "user": USER_SERVICE,
            "provider": PROVIDER_SERVICE,
            "catalog": CATALOG_SERVICE,
            "booking": BOOKING_SERVICE,
            "search": SEARCH_SERVICE,
            "ai": AI_SERVICE,
            "collab": COLLAB_SERVICE
        }
    }