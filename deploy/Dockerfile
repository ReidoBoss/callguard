# The public site on buddy-root. The deploy workflow rsyncs this folder and web/.output
# (built on GitHub Actions) to the VPS, then builds and starts it with compose.yaml.
FROM node:24.22.1-alpine

# Recording uploads convert and split audio with ffmpeg (web/server/utils/recordings.ts)
RUN apk add --no-cache ffmpeg

WORKDIR /app
COPY .output .output
ENV NODE_ENV=production PORT=3000
USER node
EXPOSE 3000
CMD ["node", ".output/server/index.mjs"]
