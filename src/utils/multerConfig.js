const multer = require('multer');
const crypto = require('crypto');
const path = require('path');
const fs = require('fs');

function createUploader(subdir, options = {}) {
  const storage = multer.diskStorage({
    destination: (req, file, cb) => {
      // Pegar organizationId do JWT (admin) ou do middleware tenant (público)
      const organizationId = req.user?.organizationId || req.organizationId;
      
      if (!organizationId) {
        return cb(new Error('organizationId não encontrado no request'));
      }

      // Construir path: /uploads/{orgId}/{subdir}/
      const dir = path.join(__dirname, '../../uploads', organizationId.toString(), subdir);
      
      // Criar diretório se não existir
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      
      cb(null, dir);
    },
    filename: (req, file, cb) => {
      const suffix = crypto.randomBytes(8).toString('hex');
      cb(null, suffix + path.extname(file.originalname));
    }
  });

  return multer({
    storage,
    limits: {
      fileSize: options.maxSize || 10 * 1024 * 1024,
      files: options.maxFiles || 50
    }
  });
}

module.exports = { createUploader };
