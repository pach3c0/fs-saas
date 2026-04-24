const fs = require('fs').promises;
const fsSync = require('fs');
const path = require('path');
const logger = require('../utils/logger');

class StorageService {
    constructor() {
        this.baseDir = path.join(__dirname, '../../uploads');
    }

    /**
     * Resolve o caminho absoluto de um arquivo.
     */
    resolvePath(filePath) {
        // Se já começa com o baseDir, é um caminho absoluto já resolvido (ex: vindo do multer.path)
        if (filePath.startsWith(this.baseDir)) {
            return filePath;
        }

        // Se já for absoluto, retorna. Se for relativo (começa com /uploads), remove o prefixo.
        const relative = filePath.startsWith('/uploads') 
            ? filePath.replace('/uploads', '') 
            : filePath;
        return path.join(this.baseDir, relative);
    }

    /**
     * Salva um buffer ou arquivo no storage.
     */
    async saveFile(targetPath, content) {
        try {
            const absolutePath = this.resolvePath(targetPath);
            const dir = path.dirname(absolutePath);
            
            if (!fsSync.existsSync(dir)) {
                await fs.mkdir(dir, { recursive: true });
            }

            await fs.writeFile(absolutePath, content);
            return targetPath;
        } catch (error) {
            logger.error('Storage Save Error', { path: targetPath, error: error.message });
            throw error;
        }
    }

    /**
     * Deleta um arquivo do storage.
     */
    async deleteFile(filePath) {
        try {
            const absolutePath = this.resolvePath(filePath);
            await fs.unlink(absolutePath);
        } catch (error) {
            if (error.code !== 'ENOENT') {
                logger.error('Storage Delete Error', { path: filePath, error: error.message });
            }
        }
    }

    /**
     * Deleta um diretório e todo seu conteúdo.
     */
    async deleteDir(dirPath) {
        try {
            const absolutePath = this.resolvePath(dirPath);
            if (fsSync.existsSync(absolutePath)) {
                await fs.rm(absolutePath, { recursive: true, force: true });
            }
        } catch (error) {
            logger.error('Storage DeleteDir Error', { path: dirPath, error: error.message });
        }
    }

    /**
     * Retorna a URL pública de um arquivo.
     * Atualmente servido pelo próprio Express (/uploads/...).
     */
    getUrl(filePath) {
        if (filePath.startsWith('http')) return filePath;
        if (filePath.startsWith('/uploads')) return filePath;
        return `/uploads${filePath.startsWith('/') ? '' : '/'}${filePath}`;
    }

    /**
     * Calcula o tamanho de um diretório recursivamente em bytes.
     */
    async getDirSize(targetPath = '') {
        const absolutePath = this.resolvePath(targetPath);
        let size = 0;
        try {
            const files = await fs.readdir(absolutePath, { withFileTypes: true });
            
            for (const file of files) {
                const filePath = path.join(absolutePath, file.name);
                if (file.isDirectory()) {
                    size += await this.getDirSize(path.join(targetPath, file.name));
                } else {
                    const stats = await fs.stat(filePath);
                    size += stats.size;
                }
            }
        } catch (e) {
            // Se a pasta não existe ou erro de permissão, retornar 0
        }
        return size;
    }
}

module.exports = new StorageService();
