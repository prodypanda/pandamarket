import dns from 'dns';
import net from 'net';
import { PdValidationError } from '../errors';

/**
 * Converts an IPv4 string to a 32-bit unsigned integer.
 */
function ipv4ToInt(ip: string): number {
  return ip
    .split('.')
    .reduce((acc, octet) => ((acc << 8) + parseInt(octet, 10)) >>> 0, 0);
}

/**
 * Check if a given IPv4 integer falls into a CIDR range.
 */
function inCidrV4(ipInt: number, cidrBase: string, maskBits: number): boolean {
  const baseInt = ipv4ToInt(cidrBase);
  const mask = maskBits === 0 ? 0 : (~0 << (32 - maskBits)) >>> 0;
  return (ipInt & mask) === (baseInt & mask);
}

/**
 * Checks if an IPv4 or IPv6 string is private, loopback, link-local, or cloud metadata.
 */
export function isPrivateIp(ip: string): boolean {
  const cleanIp = ip.trim().toLowerCase();

  // Handle IPv4-mapped IPv6 addresses (e.g. ::ffff:127.0.0.1 or ::ffff:7f00:1)
  if (cleanIp.startsWith('::ffff:')) {
    const rawV4 = cleanIp.substring(7);
    if (net.isIPv4(rawV4)) {
      return isPrivateIp(rawV4);
    }
  }

  if (net.isIPv4(cleanIp)) {
    const ipInt = ipv4ToInt(cleanIp);

    return (
      inCidrV4(ipInt, '0.0.0.0', 8) || // Current network
      inCidrV4(ipInt, '10.0.0.0', 8) || // Private 10.0.0.0/8
      inCidrV4(ipInt, '100.64.0.0', 10) || // Carrier-grade NAT
      inCidrV4(ipInt, '127.0.0.0', 8) || // Loopback
      inCidrV4(ipInt, '169.254.0.0', 16) || // Link-local / Cloud Metadata (169.254.169.254)
      inCidrV4(ipInt, '172.16.0.0', 12) || // Private 172.16.0.0/12
      inCidrV4(ipInt, '192.0.0.0', 24) || // IETF Protocol Assignments
      inCidrV4(ipInt, '192.0.2.0', 24) || // TEST-NET-1
      inCidrV4(ipInt, '192.88.99.0', 24) || // 6to4 Relay Anycast
      inCidrV4(ipInt, '192.168.0.0', 16) || // Private 192.168.0.0/16
      inCidrV4(ipInt, '198.18.0.0', 15) || // Benchmarking
      inCidrV4(ipInt, '198.51.100.0', 24) || // TEST-NET-2
      inCidrV4(ipInt, '203.0.113.0', 24) || // TEST-NET-3
      inCidrV4(ipInt, '224.0.0.0', 4) || // Multicast
      inCidrV4(ipInt, '240.0.0.0', 4) || // Reserved for future use
      inCidrV4(ipInt, '255.255.255.255', 32) // Broadcast
    );
  }

  if (net.isIPv6(cleanIp)) {
    // Loopback ::1
    if (cleanIp === '::1' || cleanIp === '0:0:0:0:0:0:0:1') return true;
    // Unspecified ::
    if (cleanIp === '::' || cleanIp === '0:0:0:0:0:0:0:0') return true;

    // Expand or check prefix for IPv6
    // Unique Local fc00::/7 (starts with fc or fd)
    if (/^(fc|fd)/i.test(cleanIp)) return true;
    // Link-local fe80::/10 (starts with fe8, fe9, fea, feb)
    if (/^fe[89ab]/i.test(cleanIp)) return true;
    // Multicast ff00::/8 (starts with ff)
    if (/^ff/i.test(cleanIp)) return true;
  }

  return false;
}

/**
 * Validates a webhook target URL to prevent SSRF vulnerabilities.
 * Resolves all DNS records and checks if any resolve to private/reserved IP ranges.
 */
export async function validateWebhookUrl(urlStr: string): Promise<string> {
  let parsed: URL;
  try {
    parsed = new URL(urlStr);
  } catch {
    throw new PdValidationError('Invalid webhook URL format', { url: urlStr });
  }

  if (parsed.protocol !== 'https:') {
    throw new PdValidationError('Webhook URL must use HTTPS protocol', { url: urlStr });
  }

  const hostname = parsed.hostname.toLowerCase();

  // Check direct IP address literals in URL
  if (net.isIP(hostname)) {
    if (isPrivateIp(hostname)) {
      throw new PdValidationError('Webhook URL cannot target private or internal IP addresses', {
        url: urlStr,
        ip: hostname,
      });
    }
    return parsed.toString();
  }

  // Reject local hostnames
  if (
    hostname === 'localhost' ||
    hostname.endsWith('.localhost') ||
    hostname.endsWith('.local') ||
    hostname.endsWith('.internal')
  ) {
    throw new PdValidationError('Webhook URL cannot target localhost or internal domains', {
      url: urlStr,
      hostname,
    });
  }

  // Resolve DNS records
  let records: dns.LookupAddress[];
  try {
    records = await dns.promises.lookup(hostname, { all: true });
  } catch {
    throw new PdValidationError(`Failed to resolve DNS for host '${hostname}'`, {
      url: urlStr,
      hostname,
    });
  }

  if (!records || records.length === 0) {
    throw new PdValidationError(`No DNS records found for host '${hostname}'`, {
      url: urlStr,
      hostname,
    });
  }

  for (const record of records) {
    if (isPrivateIp(record.address)) {
      throw new PdValidationError(
        `Webhook URL resolves to a forbidden private IP address (${record.address})`,
        {
          url: urlStr,
          hostname,
          resolvedIp: record.address,
        },
      );
    }
  }

  return parsed.toString();
}
