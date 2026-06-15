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

  const limits = { files: options.maxFiles || 50 };
  if (options.maxSize) limits.fileSize = options.maxSize;
  // Sem maxSize = sem limite por arquivo (fotógrafo usa o espaço da assinatura dele)

  return multer({
    storage,
    limits,
    fileFilter: (req, file, cb) => {
      const allowed = options.allowedTypes || ['image/jpeg', 'image/png'];
      if (allowed.includes(file.mimetype)) cb(null, true);
      else cb(new Error('Formato de arquivo não permitido'), false);
    }
  });
}

module.exports = { createUploader };
