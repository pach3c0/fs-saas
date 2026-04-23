/**
 * Verifica se uma org tem uma feature beta ativada.
 * Uso: if (hasFeature(org, 'upsell-v2')) { ... }
 */
function hasFeature(org, feature) {
  return Array.isArray(org?.betaFeatures) && org.betaFeatures.includes(feature);
}

module.exports = { hasFeature };
