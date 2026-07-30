import httpx
from fastapi import FastAPI, Request, Response
from fastapi.middleware.cors import CORSMiddleware
from starlette.background import BackgroundTask
import uvicorn

app = FastAPI(title="AI Viva API Gateway Proxy")

# Setup CORS to allow UI to talk to proxy
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Service mapping
# Questions API is on 8001
# Validation API is on 8002
# Result & Storage API is on 8010

client = httpx.AsyncClient()

@app.api_route("/{path:path}", methods=["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"])
async def proxy(request: Request, path: str):
    # Determine the target URL based on the path
    target_url = None
    
    if path.startswith("api/v1/validation") or path.startswith("api/v1/validate"):
        target_url = f"http://127.0.0.1:8002/{path}"
    elif (
        path.startswith("questions") or
        path.startswith("auth/register") or
        path.startswith("auth/login") or
        path.startswith("auth/token") or
        path.startswith("auth/me")
    ):
        target_url = f"http://127.0.0.1:8001/{path}"
    elif (
        path.startswith("api/questions")
        or path.startswith("api/results")
        or path.startswith("api/feedback")
        or path.startswith("api/attempts")
        or path.startswith("api/health")
    ):
        target_url = f"http://127.0.0.1:8010/{path}"
    else:
        # Default fallback, maybe return 404
        return Response(content="Route not found in API Gateway", status_code=404)

    # Append query params if any
    query_params = request.url.query
    if query_params:
        target_url = f"{target_url}?{query_params}"
    
    # Read the request body
    body = await request.body()
    
    # Forward the request headers (filter out some host/connection specific ones)
    headers = dict(request.headers)
    headers.pop("host", None)
    
    # Forward the request using httpx
    req = client.build_request(
        method=request.method,
        url=target_url,
        headers=headers,
        content=body
    )
    
    response = await client.send(req, stream=True)
    
    # Return the response to the client
    return Response(
        content=await response.aread(),
        status_code=response.status_code,
        headers=dict(response.headers),
        background=BackgroundTask(response.aclose)
    )

if __name__ == "__main__":
    print("Starting API Gateway Proxy on http://127.0.0.1:8000")
    uvicorn.run(app, host="127.0.0.1", port=8000)
