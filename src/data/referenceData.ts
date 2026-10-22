export const portCatalog = [
  { port: 20, protocol: "TCP", name: "FTP Data" },
  { port: 21, protocol: "TCP", name: "FTP Control" },
  { port: 22, protocol: "TCP", name: "SSH" },
  { port: 23, protocol: "TCP", name: "Telnet" },
  { port: 25, protocol: "TCP", name: "SMTP" },
  { port: 53, protocol: "UDP/TCP", name: "DNS" },
  { port: 67, protocol: "UDP", name: "DHCP Server" },
  { port: 68, protocol: "UDP", name: "DHCP Client" },
  { port: 80, protocol: "TCP", name: "HTTP" },
  { port: 110, protocol: "TCP", name: "POP3" },
  { port: 123, protocol: "UDP", name: "NTP" },
  { port: 143, protocol: "TCP", name: "IMAP" },
  { port: 161, protocol: "UDP", name: "SNMP" },
  { port: 389, protocol: "TCP/UDP", name: "LDAP" },
  { port: 443, protocol: "TCP", name: "HTTPS" },
  { port: 465, protocol: "TCP", name: "SMTP TLS" },
  { port: 587, protocol: "TCP", name: "SMTP Submission" },
  { port: 993, protocol: "TCP", name: "IMAPS" },
  { port: 995, protocol: "TCP", name: "POP3S" },
  { port: 1433, protocol: "TCP", name: "Microsoft SQL" },
  { port: 1521, protocol: "TCP", name: "Oracle DB" },
  { port: 3306, protocol: "TCP", name: "MySQL" },
  { port: 5432, protocol: "TCP", name: "PostgreSQL" },
  { port: 8080, protocol: "TCP", name: "HTTP Alternative" },
  { port: 8443, protocol: "TCP", name: "HTTPS Alternative" },
  { port: 3389, protocol: "TCP", name: "RDP" },
  { port: 5900, protocol: "TCP", name: "VNC" },
  { port: 6379, protocol: "TCP", name: "Redis" },
  { port: 9200, protocol: "TCP", name: "Elasticsearch" },
  { port: 27017, protocol: "TCP", name: "MongoDB" },
];

export const cidrReference = [
  { prefix: 8, mask: "255.0.0.0", description: "Clase A" },
  { prefix: 16, mask: "255.255.0.0", description: "Clase B" },
  { prefix: 24, mask: "255.255.255.0", description: "Clase C" },
  { prefix: 30, mask: "255.255.255.252", description: "Punto a punto" },
  { prefix: 31, mask: "255.255.255.254", description: "Punto a punto (caso especial)" },
  { prefix: 32, mask: "255.255.255.255", description: "Host individual" },
];

export const httpCodes = [
  { code: 200, title: "OK" },
  { code: 201, title: "Created" },
  { code: 204, title: "No Content" },
  { code: 301, title: "Moved Permanently" },
  { code: 302, title: "Found" },
  { code: 400, title: "Bad Request" },
  { code: 401, title: "Unauthorized" },
  { code: 403, title: "Forbidden" },
  { code: 404, title: "Not Found" },
  { code: 500, title: "Internal Server Error" },
  { code: 502, title: "Bad Gateway" },
  { code: 503, title: "Service Unavailable" },
];

export const hashAlgorithms = [
  { name: "MD5", note: "Legacy and fast, not collision resistant" },
  { name: "SHA-1", note: "Legacy; collision attacks known" },
  { name: "SHA-256", note: "Standard secure digest" },
  { name: "SHA-384", note: "Stronger, longer digest" },
  { name: "SHA-512", note: "High security general-purpose" },
  { name: "bcrypt", note: "Password hashing designed to be slow" },
  { name: "Argon2", note: "Modern memory-hard password hashing" },
];

export const jwtClaims = [
  { claim: "iss", description: "Issuer: entidad que emitió el token" },
  { claim: "sub", description: "Subject: principal del token" },
  { claim: "aud", description: "Audience: destinatarios permitidos" },
  { claim: "exp", description: "Expiration time" },
  { claim: "nbf", description: "Not before" },
  { claim: "iat", description: "Issued at" },
  { claim: "jti", description: "JWT ID, identificador único" },
];

export const referenceEntries = [
  { category: "network", title: "CIDR", description: "Notación de encaminamiento por prefijo" },
  { category: "network", title: "Wildcard", description: "Máscara inversa para ACLs y ACLs de red" },
  { category: "security", title: "Hashing", description: "Función unidireccional para verificaciones" },
  { category: "security", title: "Encoding", description: "Transformación de representación, no cifrado" },
  { category: "security", title: "Encryption", description: "Proceso reversible con clave" },
  { category: "system", title: "ssh", description: "Acceso seguro remoto" },
  { category: "system", title: "curl", description: "Transferencias HTTP y pruebas de servicio" },
  { category: "system", title: "openssl", description: "Herramienta de criptografía y certificados" },
];

export const toolsCatalog = [
  { id: "overview", label: "SYSTEM OVERVIEW", category: "ops" },
  { id: "network", label: "NETWORK LAB", category: "network" },
  { id: "password", label: "PASSWORD LAB", category: "security" },
  { id: "hash", label: "HASH LAB", category: "security" },
  { id: "encoding", label: "ENCODING LAB", category: "security" },
  { id: "jwt", label: "JWT INSPECTOR", category: "security" },
  { id: "text", label: "TEXT & REGEX LAB", category: "analysis" },
  { id: "timestamp", label: "TIMESTAMP LAB", category: "analysis" },
  { id: "file", label: "FILE INSPECTOR", category: "ops" },
  { id: "reference", label: "REFERENCE DATABASE", category: "reference" },
  { id: "extras", label: "UTILITIES", category: "tools" },
] as const;
