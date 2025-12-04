ARG BASE_IMAGE=node:23-bookworm-slim
FROM ${BASE_IMAGE}

# Install system dependencies (as root)
RUN apt-get update && apt-get install -y --no-install-recommends \
    bash \
    curl \
    git \
    postgresql-client \
    openssh-client \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

# Install global dev tools (as root, BEFORE switching to node user)
RUN npm install -g typescript @types/node ts-node nodemon

# Create app directory with proper permissions
RUN mkdir -p /workspace && chown -R node:node /workspace

# NOW switch to node user
USER node
WORKDIR /workspace

# Copy package files with proper ownership
COPY --chown=node:node package*.json ./

# Install project dependencies (as node user)
RUN npm ci

# Copy source code with proper ownership
COPY --chown=node:node . .

# Expose port
EXPOSE 3000

# Start command
CMD ["bash"]