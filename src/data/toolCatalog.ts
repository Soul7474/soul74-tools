export type AppSectionId =
  | "overview"
  | "network"
  | "password"
  | "hash"
  | "encoding"
  | "jwt"
  | "text"
  | "timestamp"
  | "file"
  | "reference"
  | "about"
  | "ioc"
  | "sysadmin"
  | "pcap";

export type AppSection = {
  id: AppSectionId;
  label: string;
  short: string;
  category: string;
  description: string;
  aliases: string[];
};

export const appSections: AppSection[] = [
  { id: "overview", label: "System Overview", short: "00", category: "Inicio", description: "Centro de operaciones con accesos a todas las herramientas.", aliases: ["inicio", "dashboard", "home", "overview"] },
  { id: "network", label: "Network Lab", short: "01", category: "Redes", description: "Calcula redes IPv4, CIDR, máscaras, wildcard y subredes.", aliases: ["subnet", "ipv4", "cidr", "máscara", "wildcard", "vlsm", "hosts", "red"] },
  { id: "password", label: "Password Lab", short: "02", category: "Seguridad", description: "Genera contraseñas con aleatoriedad criptográfica del navegador.", aliases: ["generador", "generar contraseña", "password generator", "clave", "aleatorio", "csprng"] },
  { id: "hash", label: "Hash Lab", short: "03", category: "Seguridad", description: "Calcula y compara digests de texto y archivos localmente.", aliases: ["sha-256", "sha256", "digest", "huella", "comparar hash", "md5"] },
  { id: "encoding", label: "Encoding Lab", short: "04", category: "Codificación", description: "Codifica, decodifica y transforma datos con recetas locales.", aliases: ["base64", "hexadecimal", "url encoding", "html", "xor", "rot13", "transformar"] },
  { id: "jwt", label: "JWT Inspector", short: "05", category: "Seguridad", description: "Inspecciona localmente la estructura y los claims de un token JWT.", aliases: ["token", "claims", "json web token", "issuer", "exp", "decodificar jwt"] },
  { id: "text", label: "Text & Regex Lab", short: "06", category: "Análisis", description: "Analiza, compara, transforma texto y evalúa expresiones regulares.", aliases: ["regex", "regexp", "logs", "buscar texto", "diff", "unicode"] },
  { id: "timestamp", label: "Timestamp Lab", short: "07", category: "Análisis", description: "Convierte timestamps Unix, fechas, ISO 8601 y zonas horarias.", aliases: ["unix", "epoch", "fecha", "zona horaria", "iso 8601", "duración"] },
  { id: "file", label: "File Inspector", short: "08", category: "Archivos", description: "Inspecciona archivos localmente: magic bytes, hexadecimal, cadenas, JSON y CSV.", aliases: ["magic bytes", "firma", "binario", "hex viewer", "extraer strings", "sha-256 de archivo"] },
  { id: "reference", label: "Reference Database", short: "09", category: "Referencia", description: "Busca referencias técnicas locales de redes, puertos, HTTP, hashes y conceptos.", aliases: ["puertos", "protocolos", "cidr", "códigos http", "jwt claims", "documentación"] },
  { id: "about", label: "Acerca de", short: "10", category: "Información", description: "Información de S0ul74-Tools y su procesamiento local.", aliases: ["about", "privacidad", "s0ul74 tools"] },
  { id: "ioc", label: "IOC Analyzer", short: "11", category: "Análisis", description: "Extrae, clasifica y exporta posibles indicadores desde texto local.", aliases: ["ioc", "indicadores", "defang", "refang", "cve", "hash", "dominio", "forense"] },
  { id: "sysadmin", label: "Sysadmin Lab", short: "12", category: "ASIR", description: "Calcula permisos chmod, umask y explica expresiones cron de cinco campos.", aliases: ["chmod", "permisos", "rwx", "umask", "cron", "sysadmin", "linux"] },
  { id: "pcap", label: "PCAP Analyzer", short: "13", category: "Forense", description: "Inspecciona capturas PCAP clásicas locales y resume paquetes, protocolos y flujos.", aliases: ["packet capture", "tcpdump", "pcapng", "ethernet", "dns", "sni", "forense de red"] },
];

export function searchAppSections(query: string): AppSection[] {
  const terms = query.trim().toLocaleLowerCase("es").split(/\s+/).filter(Boolean);
  return appSections.filter((section) => {
    const haystack = [
      section.label,
      section.category,
      section.description,
      ...section.aliases,
    ].join(" ").toLocaleLowerCase("es");
    return terms.every((term) => haystack.includes(term));
  });
}
