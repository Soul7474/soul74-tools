export type PcapByteOrder = "little" | "big";

export type PcapPacket = {
  index: number;
  timestamp: number | null;
  capturedLength: number;
  originalLength: number;
  frameOffset: number;
  protocol: string;
  applicationProtocol: string;
  sourceMac: string;
  destinationMac: string;
  sourceIp: string;
  destinationIp: string;
  sourcePort: number | null;
  destinationPort: number | null;
  vlanIds: number[];
  summary: string;
  dnsSummary: string;
  httpLine: string;
  tlsSni: string;
};

export type PcapSummary = {
  byteOrder: PcapByteOrder;
  timestampResolution: "microseconds" | "nanoseconds";
  linkType: number;
  packetCount: number;
  durationMilliseconds: number;
  protocolDistribution: Array<{ protocol: string; count: number }>;
  topTalkers: Array<{ address: string; packets: number; bytes: number }>;
  flows: Array<{ tuple: string; packets: number; bytes: number }>;
  warnings: string[];
};

export type PcapAnalysis = {
  summary: PcapSummary;
  packets: PcapPacket[];
};

export type PcapFilters = {
  ip?: string;
  port?: string;
  protocol?: string;
};

export const PCAP_FILE_SIZE_LIMIT = 32 * 1024 * 1024;
const MAX_PACKET_COUNT = 50_000;
const HEX_DUMP_BYTE_LIMIT = 4096;

function fail(message: string): never {
  throw new Error(message);
}

function requireBytes(data: Uint8Array, offset: number, length: number, message: string): void {
  if (offset < 0 || length < 0 || offset + length > data.length) fail(message);
}

function read16(view: DataView, offset: number, littleEndian: boolean): number {
  return view.getUint16(offset, littleEndian);
}

function read32(view: DataView, offset: number, littleEndian: boolean): number {
  return view.getUint32(offset, littleEndian);
}

function macAddress(bytes: Uint8Array, offset: number): string {
  return Array.from(bytes.subarray(offset, offset + 6), (byte) => byte.toString(16).padStart(2, "0")).join(":");
}

function ipv4Address(bytes: Uint8Array, offset: number): string {
  return Array.from(bytes.subarray(offset, offset + 4)).join(".");
}

function ipv6Address(bytes: Uint8Array, offset: number): string {
  const groups = Array.from({ length: 8 }, (_, index) => ((bytes[offset + index * 2] << 8) | bytes[offset + index * 2 + 1]).toString(16));
  let bestStart = -1;
  let bestLength = 1;
  for (let index = 0; index < groups.length;) {
    if (groups[index] !== "0") {
      index += 1;
      continue;
    }
    let end = index;
    while (end < groups.length && groups[end] === "0") end += 1;
    if (end - index > bestLength) {
      bestStart = index;
      bestLength = end - index;
    }
    index = end;
  }
  if (bestStart < 0) return groups.join(":");
  const left = groups.slice(0, bestStart).join(":");
  const right = groups.slice(bestStart + bestLength).join(":");
  return `${left}::${right}`;
}

function protocolName(number: number, ipv6 = false): string {
  if (number === 6) return "TCP";
  if (number === 17) return "UDP";
  if (number === 1 && !ipv6) return "ICMP";
  if (number === 58 && ipv6) return "ICMPv6";
  return `IP-${number}`;
}

function readDnsName(data: Uint8Array, start: number): { name: string; next: number } {
  const labels: string[] = [];
  let cursor = start;
  let next = -1;
  const visited = new Set<number>();
  for (let steps = 0; steps < 128; steps += 1) {
    requireBytes(data, cursor, 1, "DNS truncado al leer un nombre.");
    const length = data[cursor];
    if (length === 0) {
      if (next < 0) next = cursor + 1;
      return { name: labels.join("."), next };
    }
    if ((length & 0xc0) === 0xc0) {
      requireBytes(data, cursor, 2, "Puntero DNS truncado.");
      const pointer = ((length & 0x3f) << 8) | data[cursor + 1];
      if (pointer >= data.length || visited.has(pointer)) fail("Puntero DNS inválido o circular.");
      visited.add(pointer);
      if (next < 0) next = cursor + 2;
      cursor = pointer;
      continue;
    }
    if ((length & 0xc0) !== 0 || length > 63) fail("Etiqueta DNS con longitud inválida.");
    requireBytes(data, cursor + 1, length, "Etiqueta DNS truncada.");
    labels.push(new TextDecoder("ascii").decode(data.subarray(cursor + 1, cursor + 1 + length)));
    cursor += length + 1;
  }
  fail("El nombre DNS supera el límite de etiquetas.");
}

function dnsTypeName(type: number): string {
  if (type === 1) return "A";
  if (type === 28) return "AAAA";
  if (type === 5) return "CNAME";
  if (type === 15) return "MX";
  if (type === 16) return "TXT";
  if (type === 2) return "NS";
  return `TYPE${type}`;
}

function parseDns(data: Uint8Array): string {
  if (data.length < 12) return "";
  const view = new DataView(data.buffer, data.byteOffset, data.byteLength);
  const response = (view.getUint16(2, false) & 0x8000) !== 0;
  const questionCount = Math.min(view.getUint16(4, false), 100);
  const answerCount = Math.min(view.getUint16(6, false), 100);
  let cursor = 12;
  let firstQuestion = "";
  let firstQuestionType = 0;
  for (let index = 0; index < questionCount; index += 1) {
    const question = readDnsName(data, cursor);
    requireBytes(data, question.next, 4, "Sección de pregunta DNS truncada.");
    const type = view.getUint16(question.next, false);
    if (!firstQuestion) {
      firstQuestion = question.name;
      firstQuestionType = type;
    }
    cursor = question.next + 4;
  }
  if (!response) return firstQuestion ? `Consulta ${dnsTypeName(firstQuestionType)} ${firstQuestion}` : "Consulta DNS";
  const answers: string[] = [];
  for (let index = 0; index < answerCount; index += 1) {
    const answer = readDnsName(data, cursor);
    requireBytes(data, answer.next, 10, "Sección de respuesta DNS truncada.");
    const type = view.getUint16(answer.next, false);
    const length = view.getUint16(answer.next + 8, false);
    const dataOffset = answer.next + 10;
    requireBytes(data, dataOffset, length, "Datos de respuesta DNS truncados.");
    if (type === 1 && length === 4) answers.push(ipv4Address(data, dataOffset));
    else if (type === 28 && length === 16) answers.push(ipv6Address(data, dataOffset));
    cursor = dataOffset + length;
  }
  return `${firstQuestion ? `Respuesta ${dnsTypeName(firstQuestionType)} ${firstQuestion}` : "Respuesta DNS"}${answers.length ? ` → ${answers.join(", ")}` : ""}`;
}

function decodeApplicationPayload(payload: Uint8Array, sourcePort: number | null, destinationPort: number | null): {
  applicationProtocol: string;
  dnsSummary: string;
  httpLine: string;
  tlsSni: string;
} {
  const empty = { applicationProtocol: "", dnsSummary: "", httpLine: "", tlsSni: "" };
  if ((sourcePort === 53 || destinationPort === 53) && payload.length >= 12) {
    const dnsSummary = parseDns(payload);
    if (dnsSummary) return { ...empty, applicationProtocol: "DNS", dnsSummary };
  }
  const ascii = new TextDecoder("ascii").decode(payload.subarray(0, Math.min(payload.length, 4096)));
  const firstLine = ascii.split(/\r?\n/, 1)[0]?.replace(/[^\x20-\x7e]/g, "") ?? "";
  if (/^(?:[A-Z]{3,10}\s+\S+\s+HTTP\/1\.[01]|HTTP\/1\.[01]\s+\d{3}\b)/.test(firstLine)) {
    return { ...empty, applicationProtocol: "HTTP", httpLine: firstLine };
  }
  const tlsSni = parseTlsSni(payload);
  if (tlsSni) return { ...empty, applicationProtocol: "TLS", tlsSni };
  return empty;
}

function parseTlsSni(data: Uint8Array): string {
  if (data.length < 9 || data[0] !== 22 || data[5] !== 1) return "";
  let cursor = 9;
  requireBytes(data, cursor, 34, "TLS ClientHello truncado.");
  cursor += 34;
  const sessionLength = data[cursor];
  cursor += 1 + sessionLength;
  requireBytes(data, cursor, 2, "Lista de cifrados TLS truncada.");
  const cipherLength = (data[cursor] << 8) | data[cursor + 1];
  cursor += 2 + cipherLength;
  requireBytes(data, cursor, 1, "Lista de compresión TLS truncada.");
  const compressionLength = data[cursor];
  cursor += 1 + compressionLength;
  requireBytes(data, cursor, 2, "Lista de extensiones TLS truncada.");
  const extensionsLength = (data[cursor] << 8) | data[cursor + 1];
  cursor += 2;
  const extensionsEnd = Math.min(cursor + extensionsLength, data.length);
  while (cursor + 4 <= extensionsEnd) {
    const extensionType = (data[cursor] << 8) | data[cursor + 1];
    const extensionLength = (data[cursor + 2] << 8) | data[cursor + 3];
    const extensionStart = cursor + 4;
    const extensionEnd = extensionStart + extensionLength;
    if (extensionEnd > extensionsEnd) return "";
    if (extensionType === 0 && extensionLength >= 5) {
      const listLength = (data[extensionStart] << 8) | data[extensionStart + 1];
      let nameCursor = extensionStart + 2;
      const listEnd = Math.min(nameCursor + listLength, extensionEnd);
      while (nameCursor + 3 <= listEnd) {
        const nameType = data[nameCursor];
        const nameLength = (data[nameCursor + 1] << 8) | data[nameCursor + 2];
        nameCursor += 3;
        if (nameCursor + nameLength > listEnd) return "";
        if (nameType === 0) return new TextDecoder("ascii").decode(data.subarray(nameCursor, nameCursor + nameLength));
        nameCursor += nameLength;
      }
    }
    cursor = extensionEnd;
  }
  return "";
}

function newPacket(index: number, timestamp: number, capturedLength: number, originalLength: number, frameOffset: number): PcapPacket {
  return {
    index, timestamp, capturedLength, originalLength, frameOffset,
    protocol: "Ethernet", applicationProtocol: "", sourceMac: "", destinationMac: "",
    sourceIp: "", destinationIp: "", sourcePort: null, destinationPort: null,
    vlanIds: [], summary: "", dnsSummary: "", httpLine: "", tlsSni: "",
  };
}

function parseFrame(frame: Uint8Array, packet: PcapPacket): void {
  requireBytes(frame, 0, 14, "Cabecera Ethernet truncada.");
  const view = new DataView(frame.buffer, frame.byteOffset, frame.byteLength);
  packet.destinationMac = macAddress(frame, 0);
  packet.sourceMac = macAddress(frame, 6);
  let etherType = read16(view, 12, false);
  let cursor = 14;
  while (etherType === 0x8100 || etherType === 0x88a8 || etherType === 0x9100) {
    requireBytes(frame, cursor, 4, "Etiqueta VLAN truncada.");
    packet.vlanIds.push(read16(view, cursor, false) & 0x0fff);
    etherType = read16(view, cursor + 2, false);
    cursor += 4;
  }
  if (etherType === 0x0806) {
    requireBytes(frame, cursor, 8, "Cabecera ARP truncada.");
    const hardwareLength = frame[cursor + 4];
    const protocolLength = frame[cursor + 5];
    const operation = read16(view, cursor + 6, false);
    const addressLength = 8 + 2 * hardwareLength + 2 * protocolLength;
    requireBytes(frame, cursor, addressLength, "Direcciones ARP truncadas.");
    if (hardwareLength === 6 && protocolLength === 4) {
      packet.sourceIp = ipv4Address(frame, cursor + 14);
      packet.destinationIp = ipv4Address(frame, cursor + 24);
    }
    packet.protocol = "ARP";
    packet.summary = operation === 1 ? "ARP request" : operation === 2 ? "ARP reply" : `ARP operation ${operation}`;
    return;
  }
  if (etherType === 0x0800) {
    requireBytes(frame, cursor, 20, "Cabecera IPv4 truncada.");
    const version = frame[cursor] >> 4;
    const headerLength = (frame[cursor] & 0x0f) * 4;
    if (version !== 4 || headerLength < 20) fail("Cabecera IPv4 con versión o longitud inválida.");
    requireBytes(frame, cursor, headerLength, "Opciones de cabecera IPv4 truncadas.");
    const totalLength = read16(view, cursor + 2, false);
    if (totalLength < headerLength) fail("Longitud total IPv4 inválida.");
    packet.sourceIp = ipv4Address(frame, cursor + 12);
    packet.destinationIp = ipv4Address(frame, cursor + 16);
    const protocol = frame[cursor + 9];
    const fragmentOffset = read16(view, cursor + 6, false) & 0x1fff;
    packet.protocol = protocolName(protocol);
    if (fragmentOffset !== 0) {
      packet.summary = `IPv4 fragment ${packet.sourceIp} → ${packet.destinationIp}`;
      return;
    }
    parseTransport(frame.subarray(cursor + headerLength, Math.min(frame.length, cursor + totalLength)), packet, protocol);
    return;
  }
  if (etherType === 0x86dd) {
    requireBytes(frame, cursor, 40, "Cabecera IPv6 truncada.");
    if ((frame[cursor] >> 4) !== 6) fail("Cabecera IPv6 con versión inválida.");
    packet.sourceIp = ipv6Address(frame, cursor + 8);
    packet.destinationIp = ipv6Address(frame, cursor + 24);
    const payloadLength = read16(view, cursor + 4, false);
    let nextHeader = frame[cursor + 6];
    let payloadOffset = cursor + 40;
    const payloadEnd = Math.min(frame.length, payloadOffset + payloadLength);
    let nonInitialFragment = false;
    for (let extensionCount = 0; extensionCount < 8 && [0, 43, 44, 51, 60].includes(nextHeader); extensionCount += 1) {
      requireBytes(frame, payloadOffset, nextHeader === 44 ? 8 : 2, "Cabecera de extensión IPv6 truncada.");
      const extensionType = nextHeader;
      nextHeader = frame[payloadOffset];
      const extensionLength = extensionType === 44 ? 8 : extensionType === 51
        ? (frame[payloadOffset + 1] + 2) * 4
        : (frame[payloadOffset + 1] + 1) * 8;
      requireBytes(frame, payloadOffset, extensionLength, "Cabecera de extensión IPv6 truncada.");
      payloadOffset += extensionLength;
      if (extensionType === 44 && (read16(view, payloadOffset - 6, false) & 0xfff8) !== 0) {
        nonInitialFragment = true;
        break;
      }
    }
    packet.protocol = protocolName(nextHeader, true);
    if (nonInitialFragment) {
      packet.summary = `IPv6 fragment ${packet.sourceIp} → ${packet.destinationIp}`;
      return;
    }
    parseTransport(frame.subarray(payloadOffset, payloadEnd), packet, nextHeader);
    return;
  }
  packet.protocol = `EtherType 0x${etherType.toString(16).padStart(4, "0")}`;
  packet.summary = `${packet.sourceMac} → ${packet.destinationMac}`;
}

function parseTransport(
  payload: Uint8Array,
  packet: PcapPacket,
  protocol: number,
): void {
  if (protocol === 6) {
    requireBytes(payload, 0, 20, "Cabecera TCP truncada.");
    const view = new DataView(payload.buffer, payload.byteOffset, payload.byteLength);
    packet.sourcePort = read16(view, 0, false);
    packet.destinationPort = read16(view, 2, false);
    const headerLength = (payload[12] >> 4) * 4;
    if (headerLength < 20) fail("Longitud de cabecera TCP inválida.");
    requireBytes(payload, 0, headerLength, "Opciones de cabecera TCP truncadas.");
    const flags = payload[13];
    const flagNames = ["FIN", "SYN", "RST", "PSH", "ACK", "URG", "ECE", "CWR"].filter((_, index) => flags & (1 << index));
    const app = decodeApplicationPayload(payload.subarray(headerLength), packet.sourcePort, packet.destinationPort);
    Object.assign(packet, app);
    packet.summary = `${packet.sourceIp}:${packet.sourcePort} → ${packet.destinationIp}:${packet.destinationPort}${flagNames.length ? ` [${flagNames.join(",")}]` : ""}${app.httpLine ? ` ${app.httpLine}` : app.tlsSni ? ` SNI ${app.tlsSni}` : ""}`;
    return;
  }
  if (protocol === 17) {
    requireBytes(payload, 0, 8, "Cabecera UDP truncada.");
    const view = new DataView(payload.buffer, payload.byteOffset, payload.byteLength);
    packet.sourcePort = read16(view, 0, false);
    packet.destinationPort = read16(view, 2, false);
    const length = read16(view, 4, false);
    if (length < 8) fail("Longitud de cabecera UDP inválida.");
    const app = decodeApplicationPayload(payload.subarray(8, Math.min(length, payload.length)), packet.sourcePort, packet.destinationPort);
    Object.assign(packet, app);
    packet.summary = `${packet.sourceIp}:${packet.sourcePort} → ${packet.destinationIp}:${packet.destinationPort}${app.dnsSummary ? ` · ${app.dnsSummary}` : ""}`;
    return;
  }
  if (protocol === 1 || protocol === 58) {
    requireBytes(payload, 0, 2, "Cabecera ICMP truncada.");
    packet.protocol = protocol === 58 ? "ICMPv6" : "ICMP";
    packet.summary = `${packet.protocol} type ${payload[0]} code ${payload[1]} · ${packet.sourceIp} → ${packet.destinationIp}`;
    return;
  }
  packet.summary = `${packet.sourceIp} → ${packet.destinationIp} · ${packet.protocol}`;
}

function hexDump(buffer: Uint8Array, offset: number, length: number): string {
  const lines: string[] = [];
  for (let start = 0; start < length; start += 16) {
    const row = buffer.subarray(offset + start, offset + Math.min(length, start + 16));
    const hex = Array.from(row, (byte) => byte.toString(16).padStart(2, "0")).join(" ").padEnd(47, " ");
    const text = Array.from(row, (byte) => byte >= 32 && byte <= 126 ? String.fromCharCode(byte) : ".").join("");
    lines.push(`${start.toString(16).padStart(4, "0")}  ${hex}  ${text}`);
  }
  return lines.join("\n");
}

function increment(counts: Map<string, number>, value: string): void {
  counts.set(value, (counts.get(value) ?? 0) + 1);
}

export function parsePcap(input: ArrayBuffer | Uint8Array): PcapAnalysis {
  const data = input instanceof Uint8Array ? input : new Uint8Array(input);
  if (data.length > PCAP_FILE_SIZE_LIMIT) fail(`El archivo supera el límite de ${Math.floor(PCAP_FILE_SIZE_LIMIT / 1024 / 1024)} MiB.`);
  if (data.length >= 4 && data[0] === 0x0a && data[1] === 0x0d && data[2] === 0x0d && data[3] === 0x0a) {
    fail("El formato PCAPNG aún no está soportado. Exporta o convierte la captura a PCAP clásico.");
  }
  requireBytes(data, 0, 24, "La cabecera global PCAP está truncada (se requieren 24 bytes).");
  let littleEndian: boolean;
  let resolution: PcapSummary["timestampResolution"];
  const magic = Array.from(data.subarray(0, 4), (byte) => byte.toString(16).padStart(2, "0")).join("");
  if (magic === "d4c3b2a1") { littleEndian = true; resolution = "microseconds"; }
  else if (magic === "a1b2c3d4") { littleEndian = false; resolution = "microseconds"; }
  else if (magic === "4d3cb2a1") { littleEndian = true; resolution = "nanoseconds"; }
  else if (magic === "a1b23c4d") { littleEndian = false; resolution = "nanoseconds"; }
  else fail("La firma no corresponde a PCAP clásico reconocido.");

  const view = new DataView(data.buffer, data.byteOffset, data.byteLength);
  const majorVersion = read16(view, 4, littleEndian);
  if (majorVersion !== 2 || read16(view, 6, littleEndian) < 4) fail(`Versión PCAP no soportada: ${majorVersion}.${read16(view, 6, littleEndian)}.`);
  const snapLength = read32(view, 16, littleEndian);
  const linkType = read32(view, 20, littleEndian);
  if (linkType !== 1) fail(`Tipo de enlace PCAP ${linkType} no soportado; se requiere Ethernet (1).`);

  const packets: PcapPacket[] = [];
  const warnings: string[] = [];
  let offset = 24;
  while (offset < data.length && packets.length < MAX_PACKET_COUNT) {
    if (data.length - offset < 16) {
      warnings.push("La última cabecera de paquete está truncada; se detuvo el parseo.");
      break;
    }
    const seconds = read32(view, offset, littleEndian);
    const fraction = read32(view, offset + 4, littleEndian);
    const capturedLength = read32(view, offset + 8, littleEndian);
    const originalLength = read32(view, offset + 12, littleEndian);
    const frameOffset = offset + 16;
    offset = frameOffset;
    if (capturedLength > snapLength && snapLength > 0) warnings.push(`El paquete ${packets.length + 1} declara más bytes capturados que el snaplen del archivo.`);
    const available = data.length - frameOffset;
    const frameLength = Math.min(capturedLength, available);
    const timestamp = seconds * 1000 + fraction / (resolution === "microseconds" ? 1000 : 1_000_000);
    const packet = newPacket(packets.length + 1, timestamp, frameLength, originalLength, frameOffset);
    if (frameLength < capturedLength) warnings.push(`El paquete ${packet.index} está truncado (${frameLength}/${capturedLength} bytes capturados); se intentó analizar la parte disponible.`);
    try {
      parseFrame(data.subarray(frameOffset, frameOffset + frameLength), packet);
    } catch (reason) {
      packet.protocol = "Malformed";
      packet.summary = reason instanceof Error ? reason.message : "Paquete dañado o truncado.";
      warnings.push(`Paquete ${packet.index}: ${packet.summary}`);
    }
    packets.push(packet);
    offset = frameOffset + capturedLength;
    if (capturedLength > available) break;
  }
  if (packets.length === MAX_PACKET_COUNT && offset < data.length) warnings.push(`Se alcanzó el límite de ${MAX_PACKET_COUNT.toLocaleString("es-ES")} paquetes.`);

  const protocolCounts = new Map<string, number>();
  const talkers = new Map<string, { packets: number; bytes: number }>();
  const flows = new Map<string, { packets: number; bytes: number }>();
  for (const packet of packets) {
    increment(protocolCounts, packet.applicationProtocol || packet.protocol);
    for (const address of new Set([packet.sourceIp, packet.destinationIp].filter(Boolean))) {
      const talker = talkers.get(address) ?? { packets: 0, bytes: 0 };
      talker.packets += 1;
      talker.bytes += packet.capturedLength;
      talkers.set(address, talker);
    }
    if (packet.sourceIp && packet.destinationIp && packet.sourcePort !== null && packet.destinationPort !== null) {
      const tuple = `${packet.sourceIp}:${packet.sourcePort ?? "-"} → ${packet.destinationIp}:${packet.destinationPort ?? "-"}/${packet.protocol}`;
      const flow = flows.get(tuple) ?? { packets: 0, bytes: 0 };
      flow.packets += 1;
      flow.bytes += packet.capturedLength;
      flows.set(tuple, flow);
    }
  }
  const timestampValues = packets.map((packet) => packet.timestamp).filter((value): value is number => value !== null);
  const minimumTimestamp = timestampValues.reduce((earliest, timestamp) => Math.min(earliest, timestamp), Number.POSITIVE_INFINITY);
  const maximumTimestamp = timestampValues.reduce((latest, timestamp) => Math.max(latest, timestamp), Number.NEGATIVE_INFINITY);
  const sortCounts = <T extends { packets: number; bytes: number }>(entries: Map<string, T>) =>
    [...entries].map(([key, value]) => ({ key, ...value })).sort((left, right) => right.packets - left.packets || right.bytes - left.bytes).slice(0, 20);

  return {
    packets,
    summary: {
      byteOrder: littleEndian ? "little" : "big",
      timestampResolution: resolution,
      linkType,
      packetCount: packets.length,
      durationMilliseconds: timestampValues.length ? maximumTimestamp - minimumTimestamp : 0,
      protocolDistribution: [...protocolCounts].map(([protocol, count]) => ({ protocol, count })).sort((left, right) => right.count - left.count),
      topTalkers: sortCounts(talkers).map(({ key, packets: count, bytes }) => ({ address: key, packets: count, bytes })),
      flows: sortCounts(flows).map(({ key, packets: count, bytes }) => ({ tuple: key, packets: count, bytes })),
      warnings,
    },
  };
}

export function filterPcapPackets(packets: PcapPacket[], filters: PcapFilters): PcapPacket[] {
  const ip = filters.ip?.trim().toLocaleLowerCase() ?? "";
  const port = filters.port?.trim() ?? "";
  const protocol = filters.protocol?.trim().toLocaleLowerCase() ?? "";
  if (port && (!/^\d{1,5}$/.test(port) || Number(port) > 65535)) throw new Error("El filtro de puerto debe ser un entero entre 0 y 65535.");
  return packets.filter((packet) => {
    if (ip && !`${packet.sourceIp} ${packet.destinationIp}`.toLocaleLowerCase().includes(ip)) return false;
    if (port && packet.sourcePort !== Number(port) && packet.destinationPort !== Number(port)) return false;
    if (protocol && !`${packet.protocol} ${packet.applicationProtocol}`.toLocaleLowerCase().includes(protocol)) return false;
    return true;
  });
}

export function formatPcapHexDump(buffer: ArrayBuffer, packet: PcapPacket): string {
  const bytes = new Uint8Array(buffer);
  if (packet.frameOffset < 0 || packet.frameOffset + packet.capturedLength > bytes.length) {
    throw new Error("El rango del paquete seleccionado no está disponible en el buffer de captura.");
  }
  const displayedLength = Math.min(packet.capturedLength, HEX_DUMP_BYTE_LIMIT);
  const dump = hexDump(bytes, packet.frameOffset, displayedLength);
  return displayedLength < packet.capturedLength
    ? `${dump}\n... volcado limitado a ${HEX_DUMP_BYTE_LIMIT} de ${packet.capturedLength} bytes capturados`
    : dump;
}

export function analyzePcapInWorker(buffer: ArrayBuffer): Promise<{ analysis: PcapAnalysis; buffer: ArrayBuffer }> {
  if (typeof Worker === "undefined") return Promise.reject(new Error("Este navegador no admite Web Workers para procesar capturas PCAP."));
  return new Promise((resolve, reject) => {
    let worker: Worker;
    try {
      worker = new Worker(new URL("./pcapAnalyzer.worker.ts", import.meta.url), { type: "module" });
    } catch (reason) {
      reject(new Error(`No se pudo iniciar el Worker PCAP local: ${reason instanceof Error ? reason.message : "error desconocido"}`));
      return;
    }
    const timeout = globalThis.setTimeout(() => {
      worker.terminate();
      reject(new Error("El parseo PCAP excedió 20 segundos y se canceló."));
    }, 20_000);
    const cleanup = () => {
      globalThis.clearTimeout(timeout);
      worker.terminate();
    };
    worker.onmessage = (event: MessageEvent<{ analysis?: PcapAnalysis; buffer?: ArrayBuffer; error?: string }>) => {
      cleanup();
      if (event.data.error) reject(new Error(event.data.error));
      else if (event.data.analysis && event.data.buffer) resolve({ analysis: event.data.analysis, buffer: event.data.buffer });
      else reject(new Error("El Worker PCAP terminó sin devolver resultados completos."));
    };
    worker.onerror = (event) => {
      cleanup();
      reject(new Error(`Falló el Worker PCAP local: ${event.message || "error de ejecución"}`));
    };
    worker.postMessage({ buffer }, [buffer]);
  });
}
