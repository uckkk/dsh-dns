// dsh-dns — DNS 查询（DeepSeek Harness）。纯 Node（node:dns）。
import { defineTool } from "@deepseek-ai/dsh-tools";
import dns from "node:dns/promises";

const name = "DNS 查询";
const inject = ["tools"];

async function apply(ctx, _config) {
  ctx.tools.register(defineTool({
    name: "dns_lookup",
    description: "查询域名解析：A 记录（IPv4）、AAAA（IPv6）、CNAME、MX 邮件记录、TXT、NS 名称服务器。`domain` 传域名；`type` 默认 A。",
    parameters: {
      domain: { type: "string", required: true, description: "域名。" },
      type: { type: "string", enum: ["A", "AAAA", "CNAME", "MX", "TXT", "NS"], description: "记录类型，默认 A。" },
    },
    output: { schema: { type: "object", additionalProperties: false, properties: { records: { type: "array", required: true, items: { type: "string" } } } }, render: (_a, v) => [{ type: "text", text: v.records.join("\n") || "（无记录）" }] },
    execute: async (args) => {
      const d = args.domain, t = args.type || "A";
      let records = [];
      try {
        if (t === "A" || t === "AAAA") records = await dns.resolve4(d).then((r) => r).catch(() => t === "A" ? dns.resolve4(d) : dns.resolve6(d));
        else if (t === "AAAA") records = await dns.resolve6(d);
        else if (t === "CNAME") records = await dns.resolveCname(d);
        else if (t === "MX") records = (await dns.resolveMx(d)).map((m) => `${m.exchange} (优先级 ${m.priority})`);
        else if (t === "TXT") records = (await dns.resolveTxt(d)).map((a) => a.join(""));
        else if (t === "NS") records = await dns.resolveNs(d);
      } catch (e) {
        throw new Error(`DNS 查询失败：${e.message}`);
      }
      return { records };
    },
  }));

  ctx.tools.register(defineTool({
    name: "dns_reverse",
    description: "反向 DNS 查询：根据 IP 查域名（PTR 记录）。`ip` 传 IP 地址。",
    parameters: { ip: { type: "string", required: true, description: "IP 地址。" } },
    output: { schema: { type: "object", additionalProperties: false, properties: { hostnames: { type: "array", required: true, items: { type: "string" } } } }, render: (_a, v) => [{ type: "text", text: v.hostnames.join(", ") || "（无记录）" }] },
    execute: async (args) => {
      try { return { hostnames: await dns.reverse(args.ip) }; }
      catch (e) { throw new Error(`反向查询失败：${e.message}`); }
    },
  }));
}

export { apply, inject, name };
