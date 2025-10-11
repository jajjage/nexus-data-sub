ARG BASE_IMAGE=node:23-alpine
FROM ${BASE_IMAGE}

# Install dependencies
RUN apk update && apk add --no-cache \
    bash \
    curl \
    git \
    postgresql-client \
    openssh-client openssh-keygen 
   

# Create app directory with proper permissions
RUN npm i -g @google/gemini-cli \
    && mkdir -p /workspaces && chown -R node:node /workspaces

# Switch to node user
USER node
WORKDIR /workspace

# Copy package files with proper ownership
COPY --chown=node:node package*.json ./

# Install dependencies
RUN npm ci

# Copy source code with proper ownership
COPY --chown=node:node . .

# Expose port
EXPOSE 3000

# Start command
CMD ["zsh"]