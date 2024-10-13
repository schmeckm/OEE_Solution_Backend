# Nutze Node.js Version 20 als Basisimage
FROM node:18

# Installiere system libraries, die für Canvas erforderlich sind
RUN apt-get update && apt-get install -y \
    libcairo2-dev \
    libjpeg-dev \
    libpango1.0-dev \
    libgif-dev \
    librsvg2-dev

# Setze das Arbeitsverzeichnis im Container
WORKDIR /app

# Kopiere package.json und package-lock.json
COPY package*.json ./

# Installiere die Abhängigkeiten und nodemon in einem Schritt
RUN npm install && npm install -g nodemon

# Kopiere den Rest der Anwendung
COPY . .

# Exponiere den Port (z.B. 3000)
EXPOSE 3000

# Starte die App mit nodemon
CMD ["nodemon", "server.js"]
