const dns = require('dns').promises;

async function verifyDomain(domain, targetIP) {
  try {
    const records = await dns.resolve4(domain);
    return records.includes(targetIP);
  } catch (error) {
    return false;
  }
}

async function verifyCNAME(domain, targetHost) {
  try {
    const records = await dns.resolveCname(domain);
    return records.some(r => r.includes(targetHost));
  } catch (error) {
    return false;
  }
}

module.exports = { verifyDomain, verifyCNAME };