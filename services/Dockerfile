# Shared production image for every Python/FastAPI service.
#
# Built once per service from the services/ folder, e.g.
#   docker build --build-arg SERVICE=auth-service -t occasionx/auth-service services
# docker-compose.yml at the repo root does this for all of them.

FROM python:3.14-slim

ARG SERVICE
RUN test -n "$SERVICE" || (echo "Build arg SERVICE is required" && exit 1)

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1 \
    PORT=8000 \
    WEB_CONCURRENCY=1

WORKDIR /app

RUN useradd --create-home --uid 10001 app

COPY ${SERVICE}/requirements.txt ./requirements.txt
RUN pip install -r requirements.txt

COPY ${SERVICE}/ ./
COPY docker-entrypoint.sh /usr/local/bin/docker-entrypoint.sh

# uploads/ is only used by provider-service (mounted as a volume there),
# but creating it everywhere keeps the image identical across services.
RUN chmod +x /usr/local/bin/docker-entrypoint.sh \
    && mkdir -p /app/uploads \
    && chown -R app:app /app/uploads

USER app

EXPOSE 8000

HEALTHCHECK --interval=30s --timeout=5s --start-period=40s --retries=3 \
    CMD python -c "import os, urllib.request; urllib.request.urlopen(f'http://127.0.0.1:{os.environ[\"PORT\"]}/docs', timeout=4)" || exit 1

ENTRYPOINT ["docker-entrypoint.sh"]

# WEB_CONCURRENCY stays at 1 by default: auth-service and catalog-service
# seed data on startup, and several workers starting at once would race
# on those inserts.
CMD ["sh", "-c", "exec uvicorn app.main:app --host 0.0.0.0 --port \"$PORT\" --workers \"$WEB_CONCURRENCY\" --proxy-headers --forwarded-allow-ips='*'"]
