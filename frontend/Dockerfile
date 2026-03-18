FROM node:20-alpine

WORKDIR /app

# Copiar package.json y package-lock.json
COPY package.json package-lock.json ./

# Instalar dependencias
RUN npm install

# Copiar código del frontend
COPY . .

# Exponer puerto
EXPOSE 3000

# Usar modo desarrollo (dev server con hot-reload)
CMD ["npm", "run", "dev"]
