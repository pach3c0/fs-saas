#!/bin/bash
# Backup diário do CliqueZoom para Google Drive via rclone
# Onde instalar no VPS: /root/scripts/backup.sh
# Cron: 0 3 * * * /root/scripts/backup.sh >> /var/log/cz-backup.log 2>&1

DATE=$(date +%Y%m%d_%H%M)
BACKUP_DIR="/tmp/cz-backup"
GDRIVE_FOLDER="CliqueZoom-Backups"

mkdir -p "$BACKUP_DIR"

echo "[$DATE] === Iniciando backup CliqueZoom ==="

# 1. Backup do MongoDB (dump comprimido do banco inteiro)
echo "[$DATE] Iniciando backup MongoDB..."
mongodump --archive="$BACKUP_DIR/mongodb-$DATE.gz" --gzip
echo "[$DATE] MongoDB dump concluído."

# 2. Upload do dump para Google Drive
rclone copy "$BACKUP_DIR/mongodb-$DATE.gz" "gdrive:$GDRIVE_FOLDER/mongodb/" --log-level INFO
echo "[$DATE] MongoDB enviado para Google Drive."

# 3. Sync incremental de /uploads/ para Google Drive
# Na primeira execução envia tudo; nas seguintes só o que mudou
echo "[$DATE] Sincronizando /uploads/..."
rclone sync /var/www/cz-saas/uploads/ "gdrive:$GDRIVE_FOLDER/uploads/" --log-level INFO
echo "[$DATE] /uploads/ sincronizado."

# 4. Limpar dumps locais com mais de 7 dias para não lotar o disco
find "$BACKUP_DIR" -name "*.gz" -mtime +7 -delete

echo "[$DATE] === Backup concluído ==="
