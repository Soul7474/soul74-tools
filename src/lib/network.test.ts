import { describe, expect, it } from "vitest";
import {
  analyzeIpv6,
  classifyIpv6,
  compressIpv6,
  convertIpv4,
  expandIpv6,
  isIpv4InCidr,
  subnetByCount,
  vlsmSubnets,
} from "./network";

describe("IPv4 subnet calculations", () => {
  it("divides /24 into the requested number of equally sized subnets", () => {
    const subnets = subnetByCount("192.168.1.0/24", 4);
    expect(subnets.map(({ network, prefix }) => `${network}/${prefix}`)).toEqual([
      "192.168.1.0/26",
      "192.168.1.64/26",
      "192.168.1.128/26",
      "192.168.1.192/26",
    ]);
    expect(subnets[0]?.usableHosts).toBe(62);
  });

  it("supports /31 and /32 and rejects requests beyond the base network", () => {
    expect(subnetByCount("192.0.2.0/31", 2).map((item) => item.prefix)).toEqual([32, 32]);
    expect(subnetByCount("192.0.2.10/32", 2)).toEqual([]);
    expect(subnetByCount("10.0.0.0/8", 257)).toEqual([]);
  });

  it("allocates VLSM blocks largest first and enforces base range", () => {
    const subnets = vlsmSubnets("192.168.1.0/24", [50, 25, 10]);
    expect(subnets.map(({ network, prefix }) => `${network}/${prefix}`)).toEqual([
      "192.168.1.0/26",
      "192.168.1.64/27",
      "192.168.1.96/28",
    ]);
    expect(vlsmSubnets("192.168.1.0/24", [128, 128])).toEqual([]);
    expect(vlsmSubnets("192.168.1.0/24", [1.5])).toEqual([]);
  });

  it("tests IP membership in a CIDR range", () => {
    expect(isIpv4InCidr("192.168.1.255", "192.168.1.0/24")).toBe(true);
    expect(isIpv4InCidr("192.168.2.1", "192.168.1.0/24")).toBe(false);
    expect(isIpv4InCidr("invalid", "192.168.1.0/24")).toBe(false);
  });

  it("converts dotted, binary, hexadecimal, and unsigned 32-bit forms", () => {
    expect(convertIpv4("192.168.1.1")).toEqual({
      decimal: "192.168.1.1",
      hexadecimal: "0xc0a80101",
      binary: "11000000.10101000.00000001.00000001",
      integer: 3_232_235_777,
    });
    expect(convertIpv4("256.0.0.1")).toBeNull();
  });
});

describe("IPv6 address handling", () => {
  it("expands and compresses addresses with RFC-style longest-zero-run selection", () => {
    expect(expandIpv6("2001:db8::1")).toBe("2001:0db8:0000:0000:0000:0000:0000:0001");
    expect(compressIpv6("2001:0db8:0000:0000:0000:0000:0000:0001")).toBe("2001:db8::1");
    expect(compressIpv6("2001:0:0:1:0:0:0:1")).toBe("2001:0:0:1::1");
    expect(expandIpv6("1:2:3:4:5:6:7:8::")).toBeNull();
  });

  it("classifies common address scopes and documentation space", () => {
    expect(classifyIpv6("::1")).toBe("loopback");
    expect(classifyIpv6("fe80::1")).toBe("link-local");
    expect(classifyIpv6("fc00::1")).toBe("ULA");
    expect(classifyIpv6("ff02::1")).toBe("multicast");
    expect(classifyIpv6("2001:4860::1")).toBe("global");
    expect(classifyIpv6("2001:db8::1")).toBe("documentation");
  });

  it("calculates an IPv6 prefix network", () => {
    expect(analyzeIpv6("2001:db8:abcd:12::1/32")).toMatchObject({
      address: "2001:db8:abcd:12::1",
      prefix: 32,
      network: "2001:db8::",
      type: "documentation",
    });
    expect(analyzeIpv6("2001:db8::1/129")).toBeNull();
  });
});
