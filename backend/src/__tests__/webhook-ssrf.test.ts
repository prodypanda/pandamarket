import { describe, it, expect, vi } from 'vitest';
import { isPrivateIp, validateWebhookUrl } from '../utils/ssrf';

describe('SSRF Protections — IP Range Checks', () => {
  it('identifies IPv4 loopback and private IP ranges', () => {
    expect(isPrivateIp('127.0.0.1')).toBe(true);
    expect(isPrivateIp('127.0.1.1')).toBe(true);
    expect(isPrivateIp('10.0.0.1')).toBe(true);
    expect(isPrivateIp('10.255.255.254')).toBe(true);
    expect(isPrivateIp('172.16.0.1')).toBe(true);
    expect(isPrivateIp('172.31.255.255')).toBe(true);
    expect(isPrivateIp('192.168.1.1')).toBe(true);
    expect(isPrivateIp('100.64.0.1')).toBe(true); // CGNAT
  });

  it('identifies AWS / Cloud Metadata and link-local addresses', () => {
    expect(isPrivateIp('169.254.169.254')).toBe(true);
    expect(isPrivateIp('169.254.1.1')).toBe(true);
  });

  it('identifies IPv6 loopback, link-local, and unique local addresses', () => {
    expect(isPrivateIp('::1')).toBe(true);
    expect(isPrivateIp('0:0:0:0:0:0:0:1')).toBe(true);
    expect(isPrivateIp('fe80::1')).toBe(true);
    expect(isPrivateIp('fc00::1')).toBe(true);
    expect(isPrivateIp('fd00::1')).toBe(true);
  });

  it('identifies IPv4-mapped IPv6 internal addresses', () => {
    expect(isPrivateIp('::ffff:127.0.0.1')).toBe(true);
    expect(isPrivateIp('::ffff:169.254.169.254')).toBe(true);
    expect(isPrivateIp('::ffff:10.0.0.1')).toBe(true);
  });

  it('allows valid public IPv4 and IPv6 addresses', () => {
    expect(isPrivateIp('8.8.8.8')).toBe(false);
    expect(isPrivateIp('1.1.1.1')).toBe(false);
    expect(isPrivateIp('104.21.32.1')).toBe(false);
    expect(isPrivateIp('2606:4700:4700::1111')).toBe(false);
  });
});

describe('SSRF Protections — Webhook URL Validation', () => {
  it('rejects URLs that do not use HTTPS protocol', async () => {
    await expect(validateWebhookUrl('http://example.com/webhook')).rejects.toThrow(
      'Webhook URL must use HTTPS protocol',
    );
  });

  it('rejects direct private IP addresses', async () => {
    await expect(validateWebhookUrl('https://127.0.0.1/webhook')).rejects.toThrow(
      'cannot target private or internal IP addresses',
    );
    await expect(validateWebhookUrl('https://10.0.0.5/webhook')).rejects.toThrow(
      'cannot target private or internal IP addresses',
    );
    await expect(validateWebhookUrl('https://169.254.169.254/latest/meta-data/')).rejects.toThrow(
      'cannot target private or internal IP addresses',
    );
  });

  it('rejects localhost and internal hostname suffixes', async () => {
    await expect(validateWebhookUrl('https://localhost/webhook')).rejects.toThrow(
      'cannot target localhost or internal domains',
    );
    await expect(validateWebhookUrl('https://my-service.local/webhook')).rejects.toThrow(
      'cannot target localhost or internal domains',
    );
  });

  it('accepts valid public HTTPS URLs', async () => {
    const validUrl = 'https://httpbin.org/post';
    const result = await validateWebhookUrl(validUrl);
    expect(result).toBe(validUrl);
  });
});
