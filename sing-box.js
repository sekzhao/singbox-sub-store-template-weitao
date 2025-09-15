// 适用于 sing-box 1.14.0 的配置文件生成脚本
function operator(proxies) {
    // 过滤掉不支持 UDP 的节点
    proxies = proxies.filter(p => p.udp !== false);
    
    const $ = $substore;
    const { createDns } = $.require('./lib/dns.js');
    const { createRouting } = $.require('./lib/routing.js');
    const { createTun } = $.require('./lib/tun.js');
    
    // 创建 DNS 配置
    const dns = createDns();
    
    // 创建路由配置
    const routing = createRouting();
    
    // 创建 Tun 配置
    const tun = createTun();
    
    // 创建出站配置
    const outbounds = createOutbounds(proxies);
    
    // 构建完整的配置文件
    const config = {
        version: "1.14.0",
        log: {
            level: "info",
            timestamp: true
        },
        dns: dns,
        inbounds: [
            {
                type: "tun",
                tag: "tun-in",
                ...tun
            }
        ],
        outbounds: outbounds,
        route: routing
    };
    
    return JSON.stringify(config, null, 2);
}

function createOutbounds(proxies) {
    const outbounds = [
        {
            type: "direct",
            tag: "direct"
        },
        {
            type: "block",
            tag: "block"
        },
        {
            type: "dns",
            tag: "dns-out"
        }
    ];
    
    // 添加代理节点
    proxies.forEach((proxy, index) => {
        const outbound = {
            type: proxy.type,
            tag: proxy.name || `proxy-${index}`,
            server: proxy.server,
            server_port: proxy.port
        };
        
        // 根据代理类型添加特定配置
        switch (proxy.type) {
            case "ss":
                outbound.method = proxy.cipher;
                outbound.password = proxy.password;
                break;
            case "ssr":
                outbound.method = proxy.cipher;
                outbound.password = proxy.password;
                outbound.obfs = proxy.obfs;
                outbound.protocol = proxy.protocol;
                outbound.obfs_param = proxy.obfs_param;
                outbound.protocol_param = proxy.protocol_param;
                break;
            case "vmess":
                outbound.uuid = proxy.uuid;
                outbound.alterId = proxy.alterId || 0;
                outbound.security = proxy.security || "auto";
                outbound.transport = {
                    type: proxy.network || "tcp"
                };
                if (proxy.network === "ws") {
                    outbound.transport.path = proxy.path || "/";
                    outbound.transport.headers = proxy.headers || {};
                }
                if (proxy.tls) {
                    outbound.tls = {
                        enabled: true,
                        server_name: proxy.sni || proxy.server
                    };
                }
                break;
            case "vless":
                outbound.uuid = proxy.uuid;
                outbound.flow = proxy.flow || "";
                outbound.transport = {
                    type: proxy.network || "tcp"
                };
                if (proxy.network === "ws") {
                    outbound.transport.path = proxy.path || "/";
                    outbound.transport.headers = proxy.headers || {};
                }
                if (proxy.tls) {
                    outbound.tls = {
                        enabled: true,
                        server_name: proxy.sni || proxy.server
                    };
                }
                break;
            case "trojan":
                outbound.password = proxy.password;
                outbound.transport = {
                    type: proxy.network || "tcp"
                };
                if (proxy.tls) {
                    outbound.tls = {
                        enabled: true,
                        server_name: proxy.sni || proxy.server
                    };
                }
                break;
            case "hysteria":
                outbound.up_mbps = proxy.up_mbps || 10;
                outbound.down_mbps = proxy.down_mbps || 50;
                outbound.obfs = proxy.obfs || "";
                outbound.auth_str = proxy.auth_str || "";
                outbound.tls = {
                    enabled: true,
                    server_name: proxy.sni || proxy.server
                };
                break;
            case "hysteria2":
                outbound.password = proxy.password;
                outbound.up_mbps = proxy.up_mbps || 10;
                outbound.down_mbps = proxy.down_mbps || 50;
                outbound.obfs = proxy.obfs || "";
                outbound.tls = {
                    enabled: true,
                    server_name: proxy.sni || proxy.server
                };
                break;
        }
        
        outbounds.push(outbound);
    });
    
    // 添加选择器和URL测试出站
    const proxyTags = proxies.map((proxy, index) => proxy.name || `proxy-${index}`);
    
    outbounds.push({
        type: "selector",
        tag: "select",
        "default": "auto",
        outbounds: ["auto", ...proxyTags]
    });
    
    outbounds.push({
        type: "urltest",
        tag: "auto",
        outbounds: proxyTags,
        url: "https://www.gstatic.com/generate_204",
        interval: "5m",
        tolerance: 100
    });
    
    return outbounds;
}
