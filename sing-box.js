// Adapted for Sing-box v1.14.x

const { type, name } = $arguments;
const compatible_outbound = {
  tag: 'COMPATIBLE',
  type: 'direct',
};

let compatibleAdded = false;

let config;
try {
  config = JSON.parse($files[0]);
} catch (e) {
  throw new Error('Failed to parse config JSON in sing-box.js: ' + e);
}

let proxies = await produceArtifact({
  name,
  type: /^1$|col/i.test(type) ? 'collection' : 'subscription',
  platform: 'sing-box',
  produceType: 'internal',
});

// 如果没有产出 proxies，可能需要 fallback 或提示
if (!Array.isArray(proxies)) {
  throw new Error('produceArtifact did not return array for proxies');
}

config.outbounds = config.outbounds || [];
config.outbounds.push(...proxies);

config.outbounds.forEach(outbound => {
  // 确保有 outbounds 字段为数组
  if (!Array.isArray(outbound.outbounds)) {
    outbound.outbounds = [];
  }
});

config.outbounds = config.outbounds.map(outbound => {
  const tag = outbound.tag || '';
  const lowerTag = tag.toLowerCase();

  if (['全部', '全部自动'].includes(tag)) {
    outbound.outbounds.push(...getTags(proxies));
  }
  if (['香港', '香港自动'].includes(tag)) {
    outbound.outbounds.push(...getTags(proxies, /港|香港|hk|hongkong/i));
  }
  if (['台湾', '台湾自动'].includes(tag)) {
    outbound.outbounds.push(...getTags(proxies, /台|台湾|tw|taiwan/i));
  }
  if (['日本', '日本自动'].includes(tag)) {
    outbound.outbounds.push(...getTags(proxies, /日|日本|jp|japan/i));
  }
  if (['新加坡', '新加坡自动'].includes(tag)) {
    outbound.outbounds.push(...getTags(proxies, /^(?!.*(?:us)).*(新|新加坡|sg|singapore)/i));
  }
  if (['美国', '美国自动'].includes(tag)) {
    outbound.outbounds.push(...getTags(proxies, /美|美国|us|unitedstates/i));
  }

  return outbound;
});

config.outbounds.forEach(outbound => {
  if (Array.isArray(outbound.outbounds) && outbound.outbounds.length === 0) {
    if (!compatibleAdded) {
      config.outbounds.push(compatible_outbound);
      compatibleAdded = true;
    }
    // 这里如果要使用 tag 名称，也可以 push 一个 object 而不是 string
    outbound.outbounds.push(compatible_outbound.tag);
  }
});

$content = JSON.stringify(config, null, 2);

function getTags(proxies, regex) {
  if (regex) {
    return proxies.filter(p => regex.test(p.tag)).map(p => p.tag);
  } else {
    return proxies.map(p => p.tag);
  }
}
