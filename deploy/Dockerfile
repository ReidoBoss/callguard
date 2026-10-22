# The public site on buddy-root. The deploy workflow rsyncs this folder and web/.output
# (built on GitHub Actions) to the VPS, then builds and starts it with compose.yaml.

# whisper.cpp for recording uploads (#78), built on the same base so it runs on its musl.
# Static and without OpenMP, so the binary needs only the libstdc++ Node already ships
FROM node:24.22.1-alpine AS whisper
RUN apk add --no-cache build-base cmake
ADD --checksum=sha256:ff1a9053feb509ff9d7729703355541ae9690073a6b1c40eb692c962e0dc1720 \
  https://github.com/ggml-org/whisper.cpp/archive/refs/tags/v1.9.5.tar.gz /whisper.tar.gz
RUN mkdir /src && tar -xzf /whisper.tar.gz -C /src --strip-components 1 \
  && cmake -S /src -B /src/build -DCMAKE_BUILD_TYPE=Release -DBUILD_SHARED_LIBS=OFF \
    -DGGML_OPENMP=OFF -DWHISPER_BUILD_TESTS=OFF -DWHISPER_BUILD_SERVER=OFF \
  && cmake --build /src/build --target whisper-cli -j"$(nproc)"

FROM node:24.22.1-alpine

# Recording uploads convert and split audio with ffmpeg (web/server/utils/recordings.ts)
RUN apk add --no-cache ffmpeg

# Transcribed here, never by a hosted service (CLAUDE.md). The model is downloaded once at
# build and pinned by checksum; Docker caches the layer
COPY --from=whisper /src/build/bin/whisper-cli /usr/local/bin/whisper-cli
# Made first: ADD would create it unreadable to the node user
RUN mkdir -m 755 /models
ADD --chmod=644 --checksum=sha256:a03779c86df3323075f5e796cb2ce5029f00ec8869eee3fdfb897afe36c6d002 \
  https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-base.en.bin /models/ggml-base.en.bin

WORKDIR /app
COPY .output .output
# Saved calls and settings (web/nuxt.config.ts storage). /app is root's, so the node user
# needs this made for it; compose.yaml mounts a volume here so they survive a deploy
RUN mkdir .data && chown node:node .data
ENV NODE_ENV=production PORT=3000 \
  NUXT_WHISPER_CLI=/usr/local/bin/whisper-cli NUXT_WHISPER_MODEL=/models/ggml-base.en.bin
USER node
EXPOSE 3000
CMD ["node", ".output/server/index.mjs"]
