import type { NetworkSummary, SubnetSlice } from "../types";

export function ipv4ToNumber(address: string): number | null {
  const octets = address.trim().split(".");
  if (octets.length !== 4 || octets.some((octet) => !/^\d{1,3}$/.test(octet))) {
    return null;
  }

  const values = octets.map((octet) => Number(octet));
  if (values.some((octet) => Number.isNaN(octet) || octet < 0 || octet > 255)) {
    return null;
  }

  return values.reduce((total, octet) => total * 256 + octet, 0);
}

export function numberToIpv4(value: number): string {
  const normalized = value >>> 0;
  return [
    (normalized >>> 24) & 255,
    (normalized >>> 16) & 255,
    (normalized >>> 8) & 255,
    normalized & 255,
  ].join(".");
}

export function ipv4ToBinary(address: string): string | null {
  const number = ipv4ToNumber(address);
  if (number === null) return null;

  return number.toString(2).padStart(32, "0");
}

export function ipv4ToHex(address: string): string | null {
  const number = ipv4ToNumber(address);
  if (number === null) return null;

  return number.toString(16).padStart(8, "0");
}

export function prefixToMask(prefix: number): string {
  if (prefix < 0 || prefix > 32) return "0.0.0.0";
  const mask = prefix === 0 ? 0 : ((0xffffffff << (32 - prefix)) >>> 0) >>> 0;
  return numberToIpv4(mask);
}

export function calculateNetworkSummary(input: string): NetworkSummary | null {
  const match = /^\s*(\d{1,3}(?:\.\d{1,3}){3})\s*\/\s*(\d{1,2})\s*$/.exec(input);
  if (!match) return null;

  const ip = ipv4ToNumber(match[1]);
  const prefix = Number(match[2]);
  if (ip === null || prefix < 0 || prefix > 32) return null;

  const totalAddresses = 2 ** (32 - prefix);
  const maskNumber = prefix === 0 ? 0 : ((0xffffffff << (32 - prefix)) >>> 0);
  const mask = numberToIpv4(maskNumber);
  const wildcard = numberToIpv4((0xffffffff >>> 0) ^ maskNumber);
  const networkNumber = Math.floor(ip / totalAddresses) * totalAddresses;
  const broadcastNumber = networkNumber + totalAddresses - 1;
  const usableHosts = prefix < 31 ? Math.max(totalAddresses - 2, 0) : totalAddresses;
  const firstHost = prefix < 31 ? networkNumber + 1 : networkNumber;
  const lastHost = prefix < 31 ? broadcastNumber - 1 : broadcastNumber;

  return {
    original: match[1],
    prefix,
    mask,
    wildcard,
    network: numberToIpv4(networkNumber),
    broadcast: numberToIpv4(broadcastNumber),
    firstHost: numberToIpv4(firstHost),
    lastHost: numberToIpv4(lastHost),
    totalAddresses,
    usableHosts,
    binary: ipv4ToBinary(match[1]) ?? "",
    hex: ipv4ToHex(match[1]) ?? "",
  };
}

export function subnetByCount(baseNetwork: string, subnetCount: number): SubnetSlice[] {
  const summary = calculateNetworkSummary(baseNetwork);
  if (!summary) return [];
  const target = Math.max(1, subnetCount);
  const bitsNeeded = Math.ceil(Math.log2(target));
  const prefix = Math.min(32, summary.prefix + bitsNeeded);
  const subnetSize = 2 ** (32 - prefix);
  const start = ipv4ToNumber(summary.network) ?? 0;
  const slices: SubnetSlice[] = [];

  for (let index = 0; index < target; index += 1) {
    const networkNumber = start + index * subnetSize;
    const broadcastNumber = networkNumber + subnetSize - 1;
    const usableHosts = prefix < 31 ? Math.max(subnetSize - 2, 0) : subnetSize;
    const waste = subnetSize - usableHosts;
    slices.push({
      network: numberToIpv4(networkNumber),
      prefix,
      mask: prefixToMask(prefix),
      broadcast: numberToIpv4(broadcastNumber),
      firstHost: prefix < 31 ? numberToIpv4(networkNumber + 1) : numberToIpv4(networkNumber),
      lastHost: prefix < 31 ? numberToIpv4(broadcastNumber - 1) : numberToIpv4(broadcastNumber),
      usableHosts,
      totalAddresses: subnetSize,
      waste,
    });
  }

  return slices;
}

export function vlsmSubnets(baseNetwork: string, requirements: number[]): SubnetSlice[] {
  const summary = calculateNetworkSummary(baseNetwork);
  if (!summary) return [];

  const sorted = [...requirements].sort((a, b) => b - a);
  const slices: SubnetSlice[] = [];
  let current = ipv4ToNumber(summary.network) ?? 0;

  for (const hosts of sorted) {
    if (hosts < 1) continue;
    const needed = hosts + 1;
    const bits = Math.max(1, Math.ceil(Math.log2(needed)));
    const prefix = Math.min(32, 32 - bits);
    const size = 2 ** (32 - prefix);
    const network = numberToIpv4(current);
    const broadcast = numberToIpv4(current + size - 1);
    const usableHosts = prefix < 31 ? Math.max(size - 2, 0) : size;
    slices.push({
      network,
      prefix,
      mask: prefixToMask(prefix),
      broadcast,
      firstHost: prefix < 31 ? numberToIpv4(current + 1) : network,
      lastHost: prefix < 31 ? numberToIpv4(current + size - 2) : broadcast,
      usableHosts,
      totalAddresses: size,
      waste: size - usableHosts,
    });
    current += size;
  }

  return slices;
}

export function isValidIpv6(value: string): boolean {
  const trimmed = value.trim();
  if (!trimmed) return false;
  if (trimmed.includes(":::") || trimmed.startsWith(":") || trimmed.endsWith(":")) return false;

  const chunks = trimmed.split("::");
  if (chunks.length > 2) return false;

  if (chunks.length === 2) {
    const left = chunks[0] ? chunks[0].split(":").filter(Boolean) : [];
    const right = chunks[1] ? chunks[1].split(":").filter(Boolean) : [];
    const total = left.length + right.length;
    return total <= 7 && left.every((segment) => /^[0-9a-fA-F]{1,4}$/.test(segment)) && right.every((segment) => /^[0-9a-fA-F]{1,4}$/.test(segment));
  }

  const segments = trimmed.split(":");
  if (segments.length !== 8) return false;
  return segments.every((segment) => /^[0-9a-fA-F]{1,4}$/.test(segment));
}

export function normalizeIpv6(value: string): string {
  if (!isValidIpv6(value)) return "";
  const trimmed = value.trim();
  if (!trimmed.includes("::")) {
    return trimmed.toLowerCase();
  }

  const [left, right] = trimmed.split("::");
  const leftSegments = left ? left.split(":").filter(Boolean) : [];
  const rightSegments = right ? right.split(":").filter(Boolean) : [];
  const missing = 8 - (leftSegments.length + rightSegments.length);
  const assembled = [...leftSegments, ...Array.from({ length: missing }, () => "0"), ...rightSegments];
  return assembled.map((segment) => segment.padStart(4, "0")).join(":").toLowerCase();
}
