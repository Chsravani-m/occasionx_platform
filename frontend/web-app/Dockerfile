# Production image for the Next.js web app (standalone output).
#
# NEXT_PUBLIC_* values are baked into the JavaScript bundle at build time,
# so they are build args, not runtime env vars. Rebuild the image after
# changing any of them.

FROM node:22-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund

FROM node:22-alpine AS build
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

ARG NEXT_PUBLIC_API_GATEWAY
ARG NEXT_PUBLIC_RAZORPAY_KEY
ARG NEXT_PUBLIC_PAYMENT_TEST_MODE=false
ENV NEXT_PUBLIC_API_GATEWAY=$NEXT_PUBLIC_API_GATEWAY \
    NEXT_PUBLIC_RAZORPAY_KEY=$NEXT_PUBLIC_RAZORPAY_KEY \
    NEXT_PUBLIC_PAYMENT_TEST_MODE=$NEXT_PUBLIC_PAYMENT_TEST_MODE \
    NEXT_TELEMETRY_DISABLED=1

RUN test -n "$NEXT_PUBLIC_API_GATEWAY" \
    || (echo "Build arg NEXT_PUBLIC_API_GATEWAY is required" && exit 1)
RUN npm run build

FROM node:22-alpine AS run
WORKDIR /app
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=3000 \
    HOSTNAME=0.0.0.0

RUN addgroup -S app && adduser -S app -G app

COPY --from=build /app/public ./public
COPY --from=build --chown=app:app /app/.next/standalone ./
COPY --from=build --chown=app:app /app/.next/static ./.next/static

USER app
EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=3 \
    CMD wget -q -O /dev/null http://127.0.0.1:3000/ || exit 1

CMD ["node", "server.js"]
