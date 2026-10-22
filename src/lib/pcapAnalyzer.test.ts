import { describe, expect, it } from "vitest";
import { filterPcapPackets, formatPcapHexDump, parsePcap, type PcapPacket } from "./pcapAnalyzer";

function pcap(records: Uint8Array[], timestamps: number[] = []): ArrayBuffer {
  const length = 24 + records.reduce((total, record) => total + 16 + record.length, 0);
  const buffer = new ArrayBuffer(length);
  const bytes = new Uint8Array(buffer);
  bytes.set([0xd4, 0xc3, 0xb2, 0xa1]);
  const view = new DataView(buffer);
  view.setUint16(4, 2, true);
  view.setUint16(6, 4, true);
  view.setUint32(16, 65535, true);
  view.setUint32(20, 1, true);
  let offset = 24;
  records.forEach((record, index) => {
    view.setUint32(offset, timestamps[index] ?? 1_700_000_000 + index, true);
    view.setUint32(offset + 4, 250_000, true);
    view.setUint32(offset + 8, record.length, true);
    view.setUint32(offset + 12, record.length, true);
    bytes.set(record, offset + 16);
    offset += 16 + record.length;
  });
  return buffer;
}

function ethernetIpv4Tcp(): Uint8Array {
  const frame = new Uint8Array(14 + 20 + 20);
  frame.set([0, 1, 2, 3, 4, 5], 0);
  frame.set([6, 7, 8, 9, 10, 11], 6);
  frame[12] = 0x08; frame[13] = 0x00;
  const ip = 14;
  frame[ip] = 0x45;
  frame[ip + 2] = 0; frame[ip + 3] = 40;
  frame[ip + 8] = 64; frame[ip + 9] = 6;
  frame.set([192, 0, 2, 1], ip + 12);
  frame.set([198, 51, 100, 2], ip + 16);
  const tcp = ip + 20;
  frame[tcp] = 0x30; frame[tcp + 1] = 0x39;
  frame[tcp + 2] = 0; frame[tcp + 3] = 80;
  frame[tcp + 12] = 0x50;
  frame[tcp + 13] = 0x02;
  return frame;
}

function ethernetIpv4DnsQuery(): Uint8Array {
  const labels = ["example", "com"].flatMap((label) => [label.length, ...Array.from(label, (character) => character.charCodeAt(0))]);
  const dns = new Uint8Array(12 + labels.length + 1 + 4);
  dns.set([0x12, 0x34, 0x01, 0x00, 0, 1, 0, 0, 0, 0, 0, 0]);
  dns.set([...labels, 0], 12);
  dns.set([0, 1, 0, 1], 12 + labels.length + 1);
  const frame = new Uint8Array(14 + 20 + 8 + dns.length);
  frame.set([0, 1, 2, 3, 4, 5], 0);
  frame.set([6, 7, 8, 9, 10, 11], 6);
  frame[12] = 0x08; frame[13] = 0x00;
  const ip = 14;
  frame[ip] = 0x45;
  const ipLength = 20 + 8 + dns.length;
  frame[ip + 2] = ipLength >> 8; frame[ip + 3] = ipLength & 0xff;
  frame[ip + 8] = 64; frame[ip + 9] = 17;
  frame.set([192, 0, 2, 53], ip + 12);
  frame.set([198, 51, 100, 53], ip + 16);
  const udp = ip + 20;
  frame[udp] = 0xcf; frame[udp + 1] = 0x08;
  frame[udp + 2] = 0; frame[udp + 3] = 53;
  frame[udp + 4] = (8 + dns.length) >> 8; frame[udp + 5] = (8 + dns.length) & 0xff;
  frame.set(dns, udp + 8);
  return frame;
}

function ethernetIpv6Udp(): Uint8Array {
  const frame = new Uint8Array(14 + 40 + 8);
  frame.set([0, 1, 2, 3, 4, 5], 0);
  frame.set([6, 7, 8, 9, 10, 11], 6);
  frame[12] = 0x86; frame[13] = 0xdd;
  const ip = 14;
  frame[ip] = 0x60;
  frame[ip + 4] = 0; frame[ip + 5] = 8;
  frame[ip + 6] = 17; frame[ip + 7] = 64;
  frame.set([0x20, 0x01, 0x0d, 0xb8, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1], ip + 8);
  frame.set([0x20, 0x01, 0x0d, 0xb8, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 2], ip + 24);
  const udp = ip + 40;
  frame[udp] = 0x04; frame[udp + 1] = 0xd2;
  frame[udp + 2] = 0x10; frame[udp + 3] = 0xe1;
  frame[udp + 5] = 8;
  return frame;
}

function ethernetIpv4TcpWithPayload(payload: Uint8Array, destinationPort = 80): Uint8Array {
  const frame = new Uint8Array(14 + 20 + 20 + payload.length);
  frame.set(ethernetIpv4Tcp().subarray(0, 54));
  const view = new DataView(frame.buffer);
  view.setUint16(36, destinationPort, false);
  view.setUint16(16, 20 + 20 + payload.length, false);
  frame[14 + 20 + 12] = 0x50;
  frame.set(payload, 14 + 20 + 20);
  return frame;
}

function bigEndianPcap(frame: Uint8Array, nanoseconds = false): ArrayBuffer {
  const buffer = new ArrayBuffer(24 + 16 + frame.length);
  const bytes = new Uint8Array(buffer);
  bytes.set(nanoseconds ? [0xa1, 0xb2, 0x3c, 0x4d] : [0xa1, 0xb2, 0xc3, 0xd4]);
  const view = new DataView(buffer);
  view.setUint16(4, 2, false);
  view.setUint16(6, 4, false);
  view.setUint32(16, 65535, false);
  view.setUint32(20, 1, false);
  view.setUint32(24, 100, false);
  view.setUint32(28, nanoseconds ? 123_456_789 : 123_456, false);
  view.setUint32(32, frame.length, false);
  view.setUint32(36, frame.length, false);
  bytes.set(frame, 40);
  return buffer;
}

describe("classic PCAP parser", () => {
  it("parses an Ethernet/IPv4/TCP packet and builds summaries, flow and hex dump", () => {
    const buffer = pcap([ethernetIpv4Tcp()]);
    const result = parsePcap(buffer);
    const packet = result.packets[0];
    expect(result.summary).toMatchObject({ byteOrder: "little", timestampResolution: "microseconds", packetCount: 1 });
    expect(packet).toMatchObject({
      protocol: "TCP",
      sourceIp: "192.0.2.1",
      destinationIp: "198.51.100.2",
      sourcePort: 12345,
      destinationPort: 80,
    });
    expect(result.summary.flows[0].tuple).toContain("192.0.2.1:12345");
    expect(formatPcapHexDump(buffer, packet)).toContain("0000");
    expect(filterPcapPackets(result.packets, { ip: "198.51", port: "80", protocol: "tcp" })).toHaveLength(1);
  });

  it("parses DNS query names from UDP payloads", () => {
    const result = parsePcap(pcap([ethernetIpv4DnsQuery()]));
    expect(result.packets[0]).toMatchObject({
      protocol: "UDP",
      applicationProtocol: "DNS",
      dnsSummary: "Consulta A example.com",
    });
    expect(result.summary.protocolDistribution).toEqual([{ protocol: "DNS", count: 1 }]);

    const query = ethernetIpv4DnsQuery();
    const response = new Uint8Array(query.length + 16);
    response.set(query);
    const dnsOffset = 14 + 20 + 8;
    response[dnsOffset + 2] = 0x81;
    response[dnsOffset + 3] = 0x80;
    response[dnsOffset + 7] = 1;
    response.set([0xc0, 0x0c, 0, 1, 0, 1, 0, 0, 0, 60, 0, 4, 93, 184, 216, 34], query.length);
    const updatedView = new DataView(response.buffer);
    const updatedIpLength = response.length - 14;
    updatedView.setUint16(16, updatedIpLength, false);
    updatedView.setUint16(14 + 20 + 4, updatedIpLength - 20, false);
    expect(parsePcap(pcap([response])).packets[0].dnsSummary).toBe("Respuesta A example.com → 93.184.216.34");
  });

  it("parses IPv6 addresses and UDP ports", () => {
    const packet = parsePcap(pcap([ethernetIpv6Udp()])).packets[0];
    expect(packet).toMatchObject({
      protocol: "UDP",
      sourceIp: "2001:db8::1",
      destinationIp: "2001:db8::2",
      sourcePort: 1234,
      destinationPort: 4321,
    });
  });

  it("supports big-endian microsecond and nanosecond capture headers", () => {
    const frame = ethernetIpv4Tcp();
    const micro = parsePcap(bigEndianPcap(frame));
    expect(micro.summary).toMatchObject({ byteOrder: "big", timestampResolution: "microseconds" });
    expect(micro.packets[0].timestamp).toBe(100_123.456);
    const nano = parsePcap(bigEndianPcap(frame, true));
    expect(nano.summary.timestampResolution).toBe("nanoseconds");
    expect(nano.packets[0].timestamp).toBeCloseTo(100_123.456789);
  });

  it("extracts an HTTP request line, TLS SNI and VLAN tags", () => {
    const request = new TextEncoder().encode("GET /health HTTP/1.1\r\nHost: example.org\r\n\r\n");
    const http = parsePcap(pcap([ethernetIpv4TcpWithPayload(request)])).packets[0];
    expect(http).toMatchObject({ applicationProtocol: "HTTP", httpLine: "GET /health HTTP/1.1" });

    const hostname = new TextEncoder().encode("example.org");
    const sniData = new Uint8Array([0, 3 + hostname.length, 0, hostname.length >> 8, hostname.length & 0xff, ...hostname]);
    const sniExtension = new Uint8Array([0, 0, 0, sniData.length, ...sniData]);
    const extensions = new Uint8Array([sniExtension.length >> 8, sniExtension.length & 0xff, ...sniExtension]);
    const body = new Uint8Array(2 + 32 + 1 + 2 + 2 + 1 + 1 + extensions.length);
    body.set([3, 3], 0);
    let cursor = 34;
    body[cursor++] = 0;
    body[cursor++] = 0; body[cursor++] = 2; body[cursor++] = 0x13; body[cursor++] = 1;
    body[cursor++] = 1; body[cursor++] = 0;
    body.set(extensions, cursor);
    const handshake = new Uint8Array(4 + body.length);
    handshake[0] = 1;
    handshake[1] = (body.length >> 16) & 0xff; handshake[2] = (body.length >> 8) & 0xff; handshake[3] = body.length & 0xff;
    handshake.set(body, 4);
    const tls = new Uint8Array(5 + handshake.length);
    tls.set([22, 3, 1, handshake.length >> 8, handshake.length & 0xff]);
    tls.set(handshake, 5);
    const sni = parsePcap(pcap([ethernetIpv4TcpWithPayload(tls, 443)])).packets[0];
    expect(sni).toMatchObject({ applicationProtocol: "TLS", tlsSni: "example.org" });

    const base = ethernetIpv4Tcp();
    const vlan = new Uint8Array(base.length + 4);
    vlan.set(base.subarray(0, 12));
    vlan.set([0x81, 0x00, 0, 42, 0x08, 0x00], 12);
    vlan.set(base.subarray(14), 18);
    expect(parsePcap(pcap([vlan])).packets[0].vlanIds).toEqual([42]);
  });

  it("reports malformed, truncated, unsupported and PCAPNG inputs clearly", () => {
    const shortFrame = new Uint8Array(10);
    const truncated = parsePcap(pcap([shortFrame]));
    expect(truncated.packets[0].protocol).toBe("Malformed");
    expect(truncated.summary.warnings[0]).toContain("Ethernet truncada");
    const capture = pcap([shortFrame]);
    new DataView(capture).setUint32(32, 54, true);
    const clippedRecord = parsePcap(capture);
    expect(clippedRecord.summary.warnings[0]).toContain("truncado (10/54");
    expect(() => parsePcap(new Uint8Array([0x0a, 0x0d, 0x0d, 0x0a, ...new Array(20).fill(0)]))).toThrow(/PCAPNG/);
    expect(() => parsePcap(new ArrayBuffer(12))).toThrow(/truncada/);
    expect(() => filterPcapPackets([], { port: "70000" })).toThrow(/puerto/);
  });

  it("limits displayed hex output for unusually large captured frames", () => {
    const packet: PcapPacket = {
      index: 1, timestamp: null, capturedLength: 5000, originalLength: 5000, frameOffset: 0,
      protocol: "Other", applicationProtocol: "", sourceMac: "", destinationMac: "", sourceIp: "",
      destinationIp: "", sourcePort: null, destinationPort: null, vlanIds: [], summary: "",
      dnsSummary: "", httpLine: "", tlsSni: "",
    };
    const dump = formatPcapHexDump(new ArrayBuffer(5000), packet);
    expect(dump).toContain("volcado limitado a 4096 de 5000 bytes");
    expect(dump).not.toContain("1000");
  });
});
