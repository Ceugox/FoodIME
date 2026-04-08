# Shared base with OpenSSL for Prisma
FROM node:20-bookworm-slim AS base
RUN apt-get update -y && \
    apt-get install -y --no-install-recommends openssl ca-certificates && \
    rm -rf /var/lib/apt/lists/*

# Stage 1: Install dependencies
FROM base AS deps
WORKDIR /app
COPY foodime-v3/package.json foodime-v3/package-lock.json* ./
COPY foodime-v3/prisma ./prisma
RUN npm ci

# Stage 2: Build
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY foodime-v3/ ./

# Build-time env vars for Next.js (NEXT_PUBLIC_* must be ARGs to be baked into the bundle)
ARG NEXT_PUBLIC_GOOGLE_CLIENT_ID
ARG NEXT_PUBLIC_API_URL
ARG NEXT_PUBLIC_APP_URL
ARG NEXT_PUBLIC_SUPABASE_URL
ARG NEXT_PUBLIC_SUPABASE_ANON_KEY
ARG NEXT_PUBLIC_EFI_PAYEE_CODE
ARG NEXT_PUBLIC_EFI_ACCOUNT_ID
ARG NEXT_PUBLIC_EFI_SANDBOX

ENV NEXT_PUBLIC_GOOGLE_CLIENT_ID=$NEXT_PUBLIC_GOOGLE_CLIENT_ID
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_APP_URL=$NEXT_PUBLIC_APP_URL
ENV NEXT_PUBLIC_SUPABASE_URL=$NEXT_PUBLIC_SUPABASE_URL
ENV NEXT_PUBLIC_SUPABASE_ANON_KEY=$NEXT_PUBLIC_SUPABASE_ANON_KEY
ENV NEXT_PUBLIC_EFI_PAYEE_CODE=$NEXT_PUBLIC_EFI_PAYEE_CODE
ENV NEXT_PUBLIC_EFI_ACCOUNT_ID=$NEXT_PUBLIC_EFI_ACCOUNT_ID
ENV NEXT_PUBLIC_EFI_SANDBOX=$NEXT_PUBLIC_EFI_SANDBOX

# Generate Prisma client
RUN npx prisma generate

# Build Next.js
RUN npm run build

# Stage 3: Production
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV HOSTNAME=0.0.0.0

RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

# Copy standalone output
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public
COPY --from=builder /app/prisma ./prisma

# Copy Prisma engine binaries and CLI (needed for migrate deploy)
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/node_modules/@prisma ./node_modules/@prisma
COPY --from=builder /app/node_modules/prisma ./node_modules/prisma

# Copy startup script
COPY --from=builder /app/start.sh ./start.sh

USER nextjs

EXPOSE 3000

CMD ["sh", "start.sh"]
