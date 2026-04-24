const mongoose = require('mongoose');
const fs = require('fs').promises;
const path = require('path');
const Organization = require('../models/Organization');
const Session = require('../models/Session');
const SiteData = require('../models/SiteData');

async function cleanupStorage(orgId) {
    if (!orgId) throw new Error('Organization ID is required');

    console.log(`--- Iniciando limpeza para Org: ${orgId} ---`);

    const uploadsDir = path.join(__dirname, '../../uploads', orgId.toString());
    try {
        await fs.access(uploadsDir);
    } catch {
        console.log('Diretório de uploads não existe.');
        return;
    }

    // 1. Coletar todas as referências no banco
    const org = await Organization.findById(orgId).lean();
    const sessions = await Session.find({ organizationId: orgId }).lean();
    const siteData = await SiteData.findOne({ organizationId: orgId }).lean();

    const references = new Set();

    // Referências da Organização
    if (org.logo) references.add(org.logo);
    if (org.siteConfig?.heroImage) references.add(org.siteConfig.heroImage);
    if (org.siteContent?.sobre?.image) references.add(org.siteContent.sobre.image);
    if (org.siteContent?.portfolio?.photos) {
        org.siteContent.portfolio.photos.forEach(p => references.add(p.url));
    }

    // Referências das Sessões
    sessions.forEach(s => {
        s.photos.forEach(p => {
            if (p.url) references.add(p.url);
            if (p.urlOriginal) references.add(p.urlOriginal);
            if (p.urlEditada) references.add(p.urlEditada);
        });
        if (s.coverPhoto) references.add(s.coverPhoto);
    });

    // Referências do SiteData
    if (siteData?.hero?.image) references.add(siteData.hero.image);
    // Adicionar outros campos se necessário...

    console.log(`Total de referências no banco: ${references.size}`);

    // 2. Mapear arquivos no disco
    async function getFiles(dir) {
        let results = [];
        const list = await fs.readdir(dir, { withFileTypes: true });
        for (const file of list) {
            const res = path.resolve(dir, file.name);
            if (file.isDirectory()) {
                results = results.concat(await getFiles(res));
            } else {
                results.push(res);
            }
        }
        return results;
    }

    const allFiles = await getFiles(uploadsDir);
    console.log(`Total de arquivos no disco: ${allFiles.length}`);

    let deletedCount = 0;
    let deletedSize = 0;

    for (const fullPath of allFiles) {
        // Converter path absoluto para URL relativa (/uploads/orgId/...)
        const relativePath = '/uploads' + fullPath.split('/uploads')[1];
        
        if (!references.has(relativePath)) {
            const stats = await fs.stat(fullPath);
            deletedSize += stats.size;
            deletedCount++;
            console.log(`[DELETE] Órfão encontrado: ${relativePath} (${(stats.size / 1024).toFixed(2)} KB)`);
            await fs.unlink(fullPath);
        }
    }

    console.log(`--- Limpeza Concluída ---`);
    console.log(`Arquivos deletados: ${deletedCount}`);
    console.log(`Espaço liberado: ${(deletedSize / 1024 / 1024).toFixed(2)} MB`);
}

// Se rodar direto
if (require.main === module) {
    const orgId = process.argv[2];
    if (!orgId) {
        console.error('Uso: node src/utils/cleanupStorage.js <organizationId>');
        process.exit(1);
    }

    require('dotenv').config();
    mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/cliquezoom')
        .then(() => cleanupStorage(orgId))
        .then(() => process.exit(0))
        .catch(err => {
            console.error(err);
            process.exit(1);
        });
}

module.exports = cleanupStorage;
