#!/bin/bash
# Gera certificado SSL para domínio customizado

DOMAIN=$1
ADMIN_EMAIL=${2:-"admin@fsfotografias.com.br"}

if [ -z "$DOMAIN" ]; then
  echo "Uso: ./generate-ssl.sh dominio.com [email]"
  exit 1
fi

# Instalar certbot se não estiver instalado
if ! command -v certbot &> /dev/null; then
  sudo apt update
  sudo apt install -y certbot python3-certbot-nginx
fi

# Gerar certificado
sudo certbot --nginx -d $DOMAIN --non-interactive --agree-tos --email $ADMIN_EMAIL

# Recarregar nginx
sudo nginx -t && sudo systemctl reload nginx

echo "Certificado SSL gerado para $DOMAIN"