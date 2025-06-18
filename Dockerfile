FROM oven/bun:alpine as base

# Add git for showing latest changes in about
RUN apk add --no-cache git

# Setup state for building
WORKDIR /app

# Install dependencies and allow cachine
COPY --link package.json bun.lock ./
RUN --mount=type=cache,target=/root/.bun \
    bun install --production --frozen-lockfile

# Use the same base container because there's not much we can reduce
FROM base as runner

# Copy all other files over
COPY --link . /app

# Setup some default files
RUN touch settings.sqlite3 && mkdir -p .revspin

USER bun

# Refresh commands when starting the bot
CMD ["sh", "-c", "bun run validate && bun run deploy && bun run start"]