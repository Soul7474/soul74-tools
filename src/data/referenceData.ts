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

export type ReferenceSource = { label: string; url: string };
export type ReferenceToolId = "network" | "hash" | "jwt" | "encoding" | "text" | "ioc" | "sysadmin";
export type ReferenceRecord = {
  id: string;
  category: string;
  title: string;
  aliases: string[];
  description: string;
  details: string;
  copyValue?: string;
  sources?: ReferenceSource[];
  relatedTool?: { id: ReferenceToolId; label: string };
};

const rfc = (number: number, title: string): ReferenceSource => ({
  label: `RFC ${number} · ${title}`,
  url: `https://www.rfc-editor.org/rfc/rfc${number}.html`,
});

function ipv4Mask(prefix: number): string {
  return [0, 1, 2, 3].map((octet) => {
    const bits = Math.max(0, Math.min(8, prefix - octet * 8));
    return bits === 0 ? "0" : String(256 - 2 ** (8 - bits));
  }).join(".");
}

function ipv4Wildcard(prefix: number): string {
  return ipv4Mask(prefix).split(".").map((octet) => String(255 - Number(octet))).join(".");
}

const cidrRecords: ReferenceRecord[] = Array.from({ length: 33 }, (_, prefix) => {
  const addresses = 2 ** (32 - prefix);
  const usable = prefix === 32 ? 1 : prefix === 31 ? 2 : Math.max(0, addresses - 2);
  const note = prefix === 31
    ? "RFC 3021 permite usar ambas direcciones como extremos de un enlace punto a punto; no se reservan network/broadcast en ese caso."
    : prefix === 32
      ? "Una sola dirección; se usa habitualmente para una ruta o interfaz de host."
      : prefix === 0
        ? "Prefijo de ruta que cubre todo el espacio IPv4."
        : `${addresses.toLocaleString("en-US")} direcciones; ${usable.toLocaleString("en-US")} hosts utilizables con el modelo de subred convencional.`;
  const mask = ipv4Mask(prefix);
  const wildcard = ipv4Wildcard(prefix);
  return {
    id: `cidr-${prefix}`,
    category: "Redes",
    title: `IPv4 /${prefix}`,
    aliases: [`CIDR /${prefix}`, `máscara ${mask}`, `wildcard ${wildcard}`],
    description: `Prefijo CIDR /${prefix}, máscara ${mask} y wildcard ${wildcard}.`,
    details: note,
    copyValue: `/${prefix} · máscara ${mask} · wildcard ${wildcard}`,
    sources: [rfc(4632, "Classless Inter-domain Routing (CIDR)")],
    relatedTool: { id: "network", label: "Network Lab" },
  };
});

const networkRanges: Array<[string, string, string, string, string[]]> = [
  ["private-10", "10.0.0.0/8", "Privada (RFC 1918)", "Uso privado; no se anuncia globalmente como destino público.", ["10/8", "RFC1918"]],
  ["private-172", "172.16.0.0/12", "Privada (RFC 1918)", "Rango privado desde 172.16.0.0 hasta 172.31.255.255; no todo 172/8 es privado.", ["172.16/12", "RFC1918"]],
  ["private-192", "192.168.0.0/16", "Privada (RFC 1918)", "Uso privado habitual en redes locales.", ["192.168/16", "RFC1918"]],
  ["loopback", "127.0.0.0/8", "Loopback", "Direcciones de retorno al propio host; 127.0.0.1 es la más conocida.", ["localhost"]],
  ["link-local", "169.254.0.0/16", "Link-local", "Rango IPv4 de enlace local; no debe reenviarse por routers.", ["APIPA"]],
  ["shared", "100.64.0.0/10", "Espacio compartido", "Rango compartido para CGNAT; no es espacio privado RFC 1918 ni globalmente alcanzable.", ["CGNAT", "RFC6598"]],
  ["documentation-1", "192.0.2.0/24", "Documentación", "TEST-NET-1; ejemplos y documentación.", ["TEST-NET-1"]],
  ["documentation-2", "198.51.100.0/24", "Documentación", "TEST-NET-2; ejemplos y documentación.", ["TEST-NET-2"]],
  ["documentation-3", "203.0.113.0/24", "Documentación", "TEST-NET-3; ejemplos y documentación.", ["TEST-NET-3"]],
  ["benchmark", "198.18.0.0/15", "Pruebas de rendimiento", "Reservado para pruebas de dispositivos de red; no es un rango privado RFC 1918.", ["benchmarking"]],
  ["multicast", "224.0.0.0/4", "Multicast", "Espacio IPv4 multicast; la asignación y alcance dependen del grupo.", ["multicast"]],
  ["reserved-240", "240.0.0.0/4", "Reservado", "Rango reservado; no tratar como rango de hosts públicos ordinarios.", ["Class E"]],
  ["unspecified", "0.0.0.0/8", "Especial / no especificada", "Uso especial; 0.0.0.0 suele representar una dirección no especificada en contextos locales.", ["unspecified"]],
  ["limited-broadcast", "255.255.255.255/32", "Broadcast limitado", "Broadcast local limitado; los routers no lo reenvían.", ["broadcast"]],
];

const rangeRecords: ReferenceRecord[] = networkRanges.map(([id, range, label, details, aliases]) => ({
  id: `range-${id}`,
  category: "Redes",
  title: `${label}: ${range}`,
  aliases,
  description: `${range} · ${label}.`,
  details,
  copyValue: range,
  sources: [
    { label: "IANA · IPv4 Special-Purpose Address Registry", url: "https://www.iana.org/assignments/iana-ipv4-special-registry/iana-ipv4-special-registry.xhtml" },
    ...(id.startsWith("private-") ? [rfc(1918, "Address Allocation for Private Internets")] : []),
  ],
  relatedTool: { id: "network", label: "Network Lab" },
}));

const portRows: Array<[number, string, string, string, string]> = [
  [20, "TCP", "FTP data", "Canal de datos FTP en modo activo.", "FTP clásico no cifra credenciales ni contenido; preferir alternativas seguras."],
  [21, "TCP", "FTP control", "Canal de control del protocolo FTP.", "Exponer FTP sin protección puede revelar credenciales y datos."],
  [22, "TCP", "SSH", "Acceso remoto y túneles seguros.", "Requiere autenticación fuerte, claves protegidas y control de acceso."],
  [23, "TCP", "Telnet", "Terminal remoto en texto claro.", "Evitar en redes no confiables: no cifra el tráfico."],
  [25, "TCP", "SMTP", "Transferencia de correo entre servidores.", "Aplicar controles antirrelay y cifrado donde corresponda."],
  [53, "TCP/UDP", "DNS", "Consultas y transferencias DNS según uso.", "Validar exposición, recursión y política de transferencia de zona."],
  [67, "UDP", "DHCP server", "Servidor DHCP IPv4.", "Restringir a segmentos previstos y proteger la infraestructura de red."],
  [68, "UDP", "DHCP client", "Cliente DHCP IPv4.", "Puerto cliente habitual en el intercambio DHCP."],
  [80, "TCP", "HTTP", "HTTP sin cifrado TLS por sí mismo.", "No asumir confidencialidad; redirigir o proteger con TLS según la aplicación."],
  [110, "TCP", "POP3", "Acceso a buzones POP3.", "Usar una variante protegida por TLS y autenticación robusta."],
  [123, "UDP", "NTP", "Sincronización de hora.", "Limitar quién puede consultar o administrar el servicio."],
  [143, "TCP", "IMAP", "Acceso a buzones IMAP.", "Usar TLS y restringir el acceso."],
  [161, "UDP", "SNMP", "Consultas de gestión de red.", "Preferir SNMPv3 con autenticación/cifrado; evitar comunidades débiles."],
  [162, "UDP", "SNMP traps", "Recepción de notificaciones SNMP.", "Restringir fuentes de notificación."],
  [389, "TCP/UDP", "LDAP", "Acceso a directorios LDAP.", "Proteger credenciales y evaluar TLS/StartTLS."],
  [443, "TCP", "HTTPS", "HTTP transportado mediante TLS.", "TLS no corrige por sí solo fallos de autenticación o autorización."],
  [445, "TCP", "SMB", "Compartición de archivos e impresoras de Microsoft.", "Restringir a redes confiables; no exponer a Internet."],
  [587, "TCP", "SMTP submission", "Envío de correo por clientes.", "Exigir autenticación y protección del canal cuando proceda."],
  [993, "TCP", "IMAPS", "IMAP sobre TLS implícito.", "El puerto no demuestra que el servicio esté correctamente configurado."],
  [995, "TCP", "POP3S", "POP3 sobre TLS implícito.", "El puerto no demuestra que el servicio esté correctamente configurado."],
  [1433, "TCP", "Microsoft SQL Server", "Puerto por defecto frecuente de SQL Server.", "No exponer la base de datos públicamente sin controles estrictos."],
  [3306, "TCP", "MySQL / MariaDB", "Puerto por defecto frecuente de MySQL y MariaDB.", "Limitar por firewall y aplicar autenticación segura."],
  [3389, "TCP/UDP", "RDP", "Acceso remoto de escritorio de Microsoft.", "Restringir, exigir MFA cuando corresponda y mantener actualizado."],
  [5432, "TCP", "PostgreSQL", "Puerto por defecto frecuente de PostgreSQL.", "Limitar la exposición y revisar reglas de autenticación."],
  [5900, "TCP", "VNC", "Acceso remoto gráfico; asignación habitual.", "No exponer sin protección y controles de acceso adecuados."],
  [514, "UDP", "Syslog", "Transporte tradicional de mensajes Syslog.", "UDP no garantiza entrega ni confidencialidad."],
];

const uniquePorts = portRows.filter((row, index) => portRows.findIndex((candidate) => candidate[0] === row[0]) === index);
const portRecords: ReferenceRecord[] = uniquePorts.map(([port, protocol, service, description, securityNotes]) => ({
  id: `port-${port}`,
  category: "Puertos",
  title: `${port}/${protocol} · ${service}`,
  aliases: [`puerto ${port}`, service, protocol],
  description,
  details: `Notas de seguridad: ${securityNotes} La asociación de puerto y servicio es orientativa: un número de puerto no demuestra qué servicio está ejecutándose.`,
  copyValue: `${port}/${protocol}`,
  sources: [{ label: "IANA · Service Name and Transport Protocol Port Number Registry", url: "https://www.iana.org/assignments/service-names-port-numbers/service-names-port-numbers.xhtml" }],
}));

const httpRows: Array<[number, string, string, string]> = [
  [100, "Continue", "El servidor recibió la parte inicial de la solicitud; el cliente puede continuar.", "Intercambio provisional, normalmente asociado a Expect: 100-continue."],
  [101, "Switching Protocols", "El servidor acepta cambiar al protocolo solicitado.", "El cambio se negocia mediante los encabezados de actualización aplicables."],
  [200, "OK", "La solicitud se completó correctamente.", "El significado del contenido depende del método HTTP."],
  [201, "Created", "La solicitud se completó y creó uno o más recursos.", "La respuesta suele identificar el recurso creado."],
  [202, "Accepted", "La solicitud se aceptó para procesamiento, pero este no ha finalizado.", "La aceptación no garantiza que el procesamiento termine correctamente."],
  [204, "No Content", "La solicitud se completó sin contenido de respuesta.", "No debe incluir contenido de mensaje."],
  [206, "Partial Content", "El servidor entrega una o varias partes solicitadas.", "Se usa con solicitudes de rango."],
  [300, "Multiple Choices", "Hay varias representaciones disponibles y el agente puede elegir.", "La negociación puede ser manual o automática."],
  [301, "Moved Permanently", "El recurso tiene una URI permanente distinta.", "Los clientes pueden actualizar referencias; cuidado con redirecciones cacheadas."],
  [302, "Found", "El recurso está temporalmente disponible en otra URI.", "Históricamente algunos clientes cambian POST a GET."],
  [303, "See Other", "La respuesta puede consultarse en otra URI mediante GET.", "Frecuente tras completar un POST."],
  [304, "Not Modified", "El recurso no ha cambiado respecto de validadores condicionales.", "Permite reutilizar una representación almacenada en caché."],
  [307, "Temporary Redirect", "Redirección temporal que conserva el método de la solicitud.", "El cliente no debe cambiar el método."],
  [308, "Permanent Redirect", "Redirección permanente que conserva el método de la solicitud.", "El cliente no debe cambiar el método."],
  [400, "Bad Request", "El servidor no puede o no quiere procesar la solicitud por un error percibido del cliente.", "Revisar sintaxis y parámetros enviados."],
  [401, "Unauthorized", "La solicitud carece de credenciales de autenticación válidas para el recurso.", "Se asocia con un desafío de autenticación; no equivale a autorización denegada."],
  [403, "Forbidden", "El servidor entendió la solicitud y rehúsa cumplirla.", "No implica necesariamente que volver a autenticarse resuelva el problema."],
  [404, "Not Found", "No se encontró una representación actual o el servidor no revela su existencia.", "Puede ser temporal o permanente."],
  [405, "Method Not Allowed", "El método es conocido, pero no está permitido para el recurso.", "La respuesta debe incluir el encabezado Allow."],
  [408, "Request Timeout", "El servidor no recibió una solicitud completa dentro del tiempo de espera.", "El cliente puede repetir la solicitud."],
  [409, "Conflict", "La solicitud entra en conflicto con el estado actual del recurso.", "El cliente puede resolver el conflicto y reenviar."],
  [410, "Gone", "El acceso al recurso ya no está disponible y probablemente sea permanente.", "Se prefiere cuando se conoce que la condición es permanente."],
  [413, "Content Too Large", "El servidor rehúsa procesar contenido de solicitud mayor de lo que admite.", "Puede usarse Retry-After si la condición es temporal."],
  [415, "Unsupported Media Type", "El formato del contenido no es compatible con el método o recurso.", "Revisar Content-Type y codificación."],
  [422, "Unprocessable Content", "El tipo de contenido y la sintaxis son comprensibles, pero no se pueden procesar sus instrucciones.", "Útil para errores semánticos de contenido."],
  [429, "Too Many Requests", "El cliente envió demasiadas solicitudes en un período dado.", "La respuesta puede indicar Retry-After."],
  [500, "Internal Server Error", "El servidor encontró una condición inesperada que impidió completar la solicitud.", "No expongas detalles internos sensibles en la respuesta."],
  [501, "Not Implemented", "El servidor no admite la funcionalidad necesaria para completar la solicitud.", "No debe confundirse con un método no permitido para un recurso."],
  [502, "Bad Gateway", "Un servidor que actúa como gateway o proxy recibió una respuesta inválida upstream.", "Revisar el servicio upstream y la ruta de proxy."],
  [503, "Service Unavailable", "El servidor no puede atender temporalmente la solicitud.", "Puede incluir Retry-After."],
  [504, "Gateway Timeout", "Un gateway o proxy no recibió a tiempo una respuesta upstream.", "Revisar latencia y disponibilidad del servicio upstream."],
  [505, "HTTP Version Not Supported", "El servidor no admite la versión principal de HTTP usada en la solicitud.", "Es una condición distinta de un error genérico de sintaxis."],
];

const httpRecords: ReferenceRecord[] = httpRows.map(([code, title, meaning, use]) => ({
  id: `http-${code}`,
  category: "HTTP",
  title: `${code} · ${title}`,
  aliases: [`HTTP ${code}`, title, `${Math.floor(code / 100)}xx`],
  description: meaning,
  details: `Uso y observaciones: ${use}`,
  copyValue: String(code),
  sources: [rfc(9110, "HTTP Semantics")],
}));

const conceptRows: Array<[string, string, string, string[]]> = [
  ["Codificación", "Representa datos mediante otro alfabeto o formato para facilitar su almacenamiento o transporte.", "Normalmente es reversible sin secreto. No aporta confidencialidad ni autenticidad.", ["encoding", "representación"]],
  ["Hashing", "Mapea datos de cualquier tamaño a un digest de tamaño definido mediante una función hash.", "No está diseñado para recuperar la entrada. No es cifrado; la igualdad de hashes no constituye por sí sola una prueba de autenticidad.", ["hash", "digest"]],
  ["Cifrado", "Transforma datos usando una clave para que solo quien disponga de la clave adecuada pueda recuperar el contenido.", "Es reversible con la clave. Usa cifrado autenticado cuando también se requiera detectar modificaciones.", ["encryption", "cifrado"]],
  ["Transformación", "Operación genérica que cambia una representación o contenido conforme a una regla.", "Puede ser reversible o con pérdida; una transformación no es necesariamente codificación, hash ni cifrado.", ["transformation"]],
  ["DNS", "Sistema distribuido que asocia nombres de dominio con datos como direcciones IP.", "La resolución y la autenticidad dependen de configuración, caché y mecanismos de seguridad.", ["Domain Name System"]],
  ["DHCP", "Protocolo para configurar dinámicamente parámetros de red de un host.", "En IPv4, el intercambio habitual usa UDP; protege la red contra servidores no autorizados.", ["Dynamic Host Configuration Protocol"]],
  ["NAT", "Traducción de direcciones de red entre espacios de direccionamiento.", "No es por sí misma una frontera de seguridad ni sustituye un firewall.", ["Network Address Translation"]],
  ["VLAN", "Segmentación lógica de una red de capa 2.", "Una VLAN no garantiza aislamiento si el enrutamiento o la configuración están mal definidos.", ["Virtual LAN"]],
  ["ARP", "Protocolo de resolución de direcciones IPv4 a direcciones de enlace en una red local.", "Es susceptible a suplantación en redes sin controles adicionales.", ["Address Resolution Protocol"]],
  ["TCP", "Protocolo de transporte orientado a conexión con entrega ordenada y control de flujo.", "No cifra datos por sí mismo; TLS puede proteger protocolos de aplicación sobre TCP.", ["Transmission Control Protocol"]],
  ["UDP", "Protocolo de transporte sin conexión con datagramas.", "No garantiza entrega, orden ni retransmisión.", ["User Datagram Protocol"]],
  ["TLS", "Protocolo criptográfico que proporciona confidencialidad e integridad en un canal.", "La seguridad depende de versiones, certificados, validación y configuración.", ["Transport Layer Security"]],
  ["Firewall", "Controla tráfico de red según reglas de política.", "La cobertura depende del punto de aplicación y de reglas; no reemplaza controles de identidad o aplicación.", ["cortafuegos"]],
  ["Reverse proxy", "Proxy que recibe solicitudes en nombre de uno o más servidores upstream.", "Puede terminar TLS o enrutar tráfico; no convierte automáticamente una aplicación en segura.", ["proxy inverso"]],
  ["VPN", "Túnel que protege o transporta tráfico entre extremos o redes.", "El nivel de protección depende de protocolo, configuración, extremos y modelo de confianza.", ["Virtual Private Network"]],
  ["SIEM", "Plataforma que centraliza y correlaciona eventos para monitoreo y respuesta.", "La calidad de detección depende de fuentes, normalización, reglas y revisión.", ["Security Information and Event Management"]],
  ["IOC", "Indicador observable que puede asociarse con actividad maliciosa, como un hash o dominio.", "Un indicador aislado puede ser obsoleto o compartido; debe contextualizarse.", ["Indicator of Compromise"]],
  ["IOA", "Indicador basado en comportamiento o actividad que puede señalar una técnica o ataque.", "Se interpreta en contexto y puede generar falsos positivos.", ["Indicator of Attack"]],
  ["TTP", "Tácticas, técnicas y procedimientos describen objetivos y métodos de un actor.", "Son más generales y duraderos que indicadores concretos.", ["Tactics, Techniques and Procedures"]],
  ["HMAC", "Código de autenticación de mensajes que combina una función hash con una clave secreta.", "No cifra el mensaje y requiere gestión segura de claves.", ["Hash-based Message Authentication Code"]],
  ["Salting", "Añadir un valor aleatorio único a cada contraseña antes de derivar su hash.", "El salt no es secreto; debe almacenarse junto al resultado y ser único por contraseña.", ["salt", "sal"]],
  ["MFA", "Autenticación que combina factores de categorías diferentes.", "Varios factores del mismo tipo no constituyen necesariamente MFA.", ["Multi-factor authentication"]],
  ["Mínimo privilegio", "Conceder únicamente permisos necesarios para una tarea durante el tiempo necesario.", "Revisar y revocar permisos reduce impacto de errores o cuentas comprometidas.", ["least privilege"]],
  ["Cadena de custodia", "Registro de control, acceso, transferencia y conservación de evidencia.", "Requiere procedimientos documentados; un informe de esta herramienta no la establece ni certifica.", ["chain of custody"]],
];

const conceptRecords: ReferenceRecord[] = conceptRows.map(([title, description, details, aliases]) => ({
  id: `concept-${title.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-")}`,
  category: "Conceptos",
  title,
  aliases,
  description,
  details,
  sources: title === "DNS" ? [rfc(1034, "Domain Names - Concepts and Facilities"), rfc(1035, "Domain Names - Implementation and Specification")]
    : title === "DHCP" ? [rfc(2131, "Dynamic Host Configuration Protocol")]
      : title === "ARP" ? [rfc(826, "An Ethernet Address Resolution Protocol")]
        : title === "TCP" ? [rfc(9293, "Transmission Control Protocol")]
          : title === "UDP" ? [rfc(768, "User Datagram Protocol")]
            : title === "TLS" ? [rfc(8446, "The Transport Layer Security (TLS) Protocol Version 1.3")]
              : title === "HMAC" ? [rfc(2104, "HMAC: Keyed-Hashing for Message Authentication")]
                : [],
  relatedTool: title === "Codificación" || title === "Transformación"
    ? { id: "encoding", label: "Encoding Lab" }
    : title === "Hashing"
      ? { id: "hash", label: "Hash Lab" }
      : undefined,
}));

const hashRows: Array<[string, string, string, string[]]> = [
  ["MD5", "128-bit general-purpose digest; collision resistance is broken for security uses.", "Do not use MD5 in new security designs. It is not a password hashing/KDF algorithm.", ["Message Digest 5"]],
  ["SHA-1", "160-bit general-purpose digest with practical collision attacks.", "Avoid SHA-1 for new security designs; it is not a password hashing/KDF algorithm.", ["Secure Hash Algorithm 1"]],
  ["SHA-256", "SHA-2 hash function producing a 256-bit digest.", "Suitable as a general-purpose digest primitive where a digest is needed; do not use a single fast digest for password storage.", ["SHA2-256"]],
  ["SHA-384", "SHA-2 hash function producing a 384-bit digest.", "General-purpose cryptographic hash; not a password-specific KDF.", ["SHA2-384"]],
  ["SHA-512", "SHA-2 hash function producing a 512-bit digest.", "General-purpose cryptographic hash; not a password-specific KDF.", ["SHA2-512"]],
  ["bcrypt", "Adaptive password hashing scheme designed to make password verification costly.", "Use a maintained implementation and tune its work factor to the deployment environment.", ["password hashing"]],
  ["Argon2", "Memory-hard password hashing and key derivation function; variants include Argon2id.", "Use a vetted implementation and parameters appropriate for the system. RFC 9106 specifies Argon2.", ["Argon2id", "password hashing"]],
];

const hashRecords: ReferenceRecord[] = hashRows.map(([title, description, details, aliases]) => ({
  id: `hash-${title.toLowerCase()}`,
  category: "Hashes",
  title,
  aliases,
  description,
  details,
  copyValue: title,
  sources: title === "Argon2" ? [rfc(9106, "Argon2 Memory-Hard Function for Password Hashing and Proof-of-Work Applications")]
    : title === "SHA-256" || title === "SHA-384" || title === "SHA-512" ? [rfc(6234, "US Secure Hash Algorithms")]
      : [],
  relatedTool: { id: "hash", label: "Hash Lab" },
}));

const claimRows: Array<[string, string, string]> = [
  ["iss", "Issuer: principal que emitió el JWT.", "El consumidor define qué emisores acepta."],
  ["sub", "Subject: principal sobre el que trata el JWT.", "El significado y unicidad dependen de la aplicación y del emisor."],
  ["aud", "Audience: destinatarios previstos del JWT.", "El consumidor debe comprobar que está incluido cuando la política lo exige."],
  ["exp", "Expiration Time: instante a partir del cual el JWT no debe aceptarse.", "Valor NumericDate en segundos desde Unix Epoch."],
  ["nbf", "Not Before: instante antes del cual el JWT no debe aceptarse.", "Valor NumericDate en segundos desde Unix Epoch."],
  ["iat", "Issued At: instante en que se emitió el JWT.", "Valor NumericDate; no prueba por sí mismo la validez del token."],
  ["jti", "JWT ID: identificador único asignado al token.", "Puede ayudar a prevenir repetición si la aplicación lo controla."],
];

const jwtRecords: ReferenceRecord[] = claimRows.map(([title, description, details]) => ({
  id: `jwt-claim-${title}`,
  category: "JWT",
  title,
  aliases: [`claim ${title}`, title === "iss" ? "issuer" : title === "sub" ? "subject" : title === "aud" ? "audience" : title],
  description,
  details,
  sources: [rfc(7519, "JSON Web Token (JWT)")],
  relatedTool: { id: "jwt", label: "JWT Inspector" },
}));

const encodingRows: Array<[string, string, string, string[], string?]> = [
  ["Base64", "Codifica bytes como texto usando el alfabeto Base64.", "No cifra ni autentica; los datos pueden recuperarse sin clave.", ["base 64"]],
  ["Base64URL", "Variante de Base64 para datos en URLs y nombres, con alfabeto adaptado.", "No es cifrado; el padding puede omitirse según el formato.", ["base64 url"]],
  ["Hexadecimal", "Representa cada byte normalmente con dos dígitos hexadecimales.", "Es una representación reversible, no una función hash.", ["hex", "hex encoding"]],
  ["Binario", "Representación de valores usando bits.", "La representación depende del tamaño, orden y convención elegidos.", ["binary"]],
  ["URL encoding", "Codifica bytes de componentes URL mediante escapes porcentuales.", "No confundir con codificar una URL completa; los componentes tienen reglas distintas.", ["percent encoding", "percent-encoding"], "https://developer.mozilla.org/en-US/docs/Glossary/Percent-encoding"],
  ["HTML entities", "Representa determinados caracteres en HTML mediante referencias de caracteres.", "El escaping depende del contexto; no sustituye una política completa de seguridad HTML.", ["entities", "character references"], "https://developer.mozilla.org/en-US/docs/Glossary/Entity"],
  ["UTF-8", "Codificación Unicode de longitud variable compatible con ASCII.", "Es una codificación de caracteres; no cifra ni valida contenido.", ["unicode"]],
  ["ROT13", "Rotación de letras latinas por 13 posiciones.", "Transformación educativa reversible, no proporciona seguridad.", ["caesar"]],
  ["ROT47", "Rotación de caracteres ASCII imprimibles.", "Transformación reversible educativa; no es cifrado seguro.", []],
  ["XOR educativo", "Operación bit a bit XOR entre datos y una clave o flujo.", "XOR con clave reutilizada o débil no ofrece cifrado seguro; se presenta solo como demostración.", ["xor"]],
];

const encodingRecords: ReferenceRecord[] = encodingRows.map(([title, description, details, aliases, url]) => ({
  id: `encoding-${title.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`,
  category: "Codificación",
  title,
  aliases,
  description,
  details,
  copyValue: title,
  sources: title === "Base64" || title === "Base64URL" ? [rfc(4648, "The Base16, Base32, and Base64 Data Encodings")]
    : title === "UTF-8" ? [rfc(3629, "UTF-8, a transformation format of ISO 10646")]
      : url ? [{ label: "MDN Web Docs", url }]
        : [],
  relatedTool: { id: "encoding", label: "Encoding Lab" },
}));

const windowsSecurityEvents: Array<[string, string, string, string[]]> = [
  ["4624", "Inicio de sesión correcto.", "Registra que se creó una sesión de inicio de sesión. El tipo de inicio y el contexto ayudan a interpretar el evento; no prueba por sí solo una actividad legítima.", ["successful logon", "inicio de sesión"]],
  ["4625", "Error de inicio de sesión.", "Puede deberse a credenciales, políticas, formato de cuenta o configuración. Correlaciona con origen, tipo de inicio y eventos cercanos.", ["failed logon", "fallo de autenticación"]],
  ["4688", "Se creó un nuevo proceso.", "La línea de comandos puede requerir que la directiva correspondiente esté habilitada; la ausencia de esos datos no indica ausencia de procesos.", ["process creation", "nuevo proceso"]],
  ["4720", "Se creó una cuenta de usuario.", "Interpreta el evento junto con el sujeto que realizó el cambio, el equipo y la actividad aprobada.", ["user account created", "crear usuario"]],
  ["4672", "Se asignaron privilegios especiales a un nuevo inicio de sesión.", "Puede aparecer en actividad administrativa normal; debe correlacionarse con el usuario, tipo de inicio y privilegios.", ["special privileges assigned", "privilegios especiales"]],
  ["1102", "Se borró el registro de auditoría de seguridad.", "Es una señal que merece contexto, pero también puede tener causas administrativas; revisa los registros conservados y la política del sistema.", ["audit log cleared", "security log cleared"]],
];

const windowsEventRecords: ReferenceRecord[] = windowsSecurityEvents.map(([id, description, details, aliases]) => ({
  id: `windows-security-event-${id}`,
  category: "Windows Security Event IDs",
  title: `Event ID ${id}`,
  aliases: [`Windows ${id}`, ...aliases],
  description,
  details,
  copyValue: id,
  relatedTool: { id: "text", label: "Text & Regex Lab" },
}));

const sysmonEvents: Array<[string, string, string, string[]]> = [
  ["1", "Process Create.", "Evento de creación de proceso; incluye datos del proceso y del proceso padre según configuración y versión.", ["process creation", "process create"]],
  ["3", "Network Connection.", "Registra conexiones de red iniciadas por un proceso. La captura depende de la configuración de Sysmon.", ["network connection"]],
  ["7", "Image Loaded.", "Registra la carga de una imagen/módulo en un proceso; puede generar volumen elevado y requiere configuración explícita.", ["image load", "module load"]],
  ["8", "CreateRemoteThread.", "Indica la creación de un hilo en otro proceso; es un indicador contextual, no una confirmación de inyección maliciosa.", ["remote thread"]],
  ["10", "Process Access.", "Registra el acceso de un proceso a otro proceso; muchas herramientas legítimas también acceden a procesos.", ["process access"]],
  ["11", "File Create.", "Registra la creación o sobrescritura de archivos observada por Sysmon.", ["file creation"]],
  ["12", "Registry object create/delete.", "Registra operaciones de creación o eliminación de objetos de registro.", ["registry create", "registry delete"]],
  ["13", "Registry value set.", "Registra cambios de valores del registro observados por Sysmon.", ["registry modification"]],
  ["22", "DNS Query.", "Registra consultas DNS asociadas a procesos cuando la versión y configuración de Sysmon lo admiten.", ["dns query"]],
];

const sysmonRecords: ReferenceRecord[] = sysmonEvents.map(([id, title, details, aliases]) => ({
  id: `sysmon-event-${id}`,
  category: "Sysmon Event IDs",
  title: `Sysmon ${id} · ${title}`,
  aliases: [`Event ID ${id}`, ...aliases],
  description: title,
  details,
  copyValue: id,
  relatedTool: { id: "text", label: "Text & Regex Lab" },
}));

const syslogSeverities: Array<[number, string, string]> = [
  [0, "Emergency", "El sistema no es utilizable."],
  [1, "Alert", "Se requiere acción inmediata."],
  [2, "Critical", "Condición crítica."],
  [3, "Error", "Condición de error."],
  [4, "Warning", "Condición de advertencia."],
  [5, "Notice", "Evento normal pero significativo."],
  [6, "Informational", "Mensaje informativo."],
  [7, "Debug", "Mensaje de depuración."],
];

const syslogRecords: ReferenceRecord[] = syslogSeverities.map(([severity, title, description]) => ({
  id: `syslog-severity-${severity}`,
  category: "Syslog Severities",
  title: `${severity} · ${title}`,
  aliases: [`severity ${severity}`, `RFC 5424 ${severity}`],
  description,
  details: "Los números de severidad de syslog van de 0 (más urgente) a 7 (depuración); la política de registro determina qué mensajes se conservan.",
  copyValue: String(severity),
  relatedTool: { id: "text", label: "Text & Regex Lab" },
}));

const securityHeaders: Array<[string, string, string, string[]]> = [
  ["Content-Security-Policy", "Política que limita los orígenes y tipos de contenido que el navegador puede cargar o ejecutar.", "Una política incorrecta puede romper la aplicación; definirla requiere conocer los recursos y necesidades reales del sitio.", ["CSP"]],
  ["Strict-Transport-Security", "Indica al navegador que use HTTPS para el host durante el período especificado.", "Solo debe servirse por HTTPS; parámetros como includeSubDomains y preload amplían el alcance y requieren evaluación.", ["HSTS"]],
  ["X-Content-Type-Options", "El valor nosniff evita que algunos navegadores interpreten el contenido con un tipo distinto al declarado.", "Configura también un Content-Type correcto para cada recurso.", ["nosniff"]],
  ["X-Frame-Options", "Controla la presentación en marcos en navegadores compatibles.", "CSP frame-ancestors es la opción más flexible para políticas modernas; no configures reglas incompatibles sin revisar compatibilidad.", ["clickjacking"]],
  ["Referrer-Policy", "Controla qué información de referencia se envía en solicitudes iniciadas desde el documento.", "El valor apropiado depende de los requisitos de privacidad y navegación.", ["referer policy"]],
  ["Permissions-Policy", "Permite limitar el acceso del documento a determinadas funciones del navegador.", "La política depende de las funciones realmente utilizadas y del contexto de origen.", ["feature policy"]],
  ["Cross-Origin-Opener-Policy", "Aísla el contexto de navegación de ventanas cross-origin según la política elegida.", "Puede afectar integraciones con ventanas emergentes y autenticación.", ["COOP"]],
  ["Cross-Origin-Resource-Policy", "Indica qué contextos pueden cargar un recurso cross-origin.", "Debe ajustarse al uso previsto del recurso; un valor restrictivo puede bloquear integraciones legítimas.", ["CORP"]],
  ["Cross-Origin-Embedder-Policy", "Controla la carga de recursos cross-origin para contextos aislados.", "Puede requerir que los subrecursos habiliten CORS o CORP.", ["COEP"]],
];

const securityHeaderRecords: ReferenceRecord[] = securityHeaders.map(([title, description, details, aliases]) => ({
  id: `http-security-header-${title.toLowerCase()}`,
  category: "HTTP Security Headers",
  title,
  aliases,
  description,
  details,
  relatedTool: { id: "text", label: "Text & Regex Lab" },
}));

const hashcatModes: Array<[string, string, string, string[]]> = [
  ["0", "MD5", "Digest MD5 sin sal en formato hexadecimal habitual.", ["raw md5"]],
  ["100", "SHA-1", "Digest SHA-1 sin sal en formato hexadecimal habitual.", ["raw sha1"]],
  ["1000", "NTLM", "Hash NT LAN Manager en representación hexadecimal habitual.", ["ntlm"]],
  ["1400", "SHA2-256", "Digest SHA-256 sin sal en formato hexadecimal habitual.", ["sha256"]],
  ["1700", "SHA2-512", "Digest SHA-512 sin sal en formato hexadecimal habitual.", ["sha512"]],
  ["500", "md5crypt", "Formato Unix crypt MD5 con prefijo habitual $1$.", ["$1$"]],
  ["1800", "sha512crypt", "Formato Unix crypt SHA-512 con prefijo habitual $6$.", ["$6$"]],
  ["3200", "bcrypt", "Formato bcrypt con prefijos habituales $2a$, $2b$ o $2y$.", ["$2b$", "bcrypt"]],
];

const hashcatRecords: ReferenceRecord[] = hashcatModes.map(([mode, title, details, aliases]) => ({
  id: `hashcat-mode-${mode}`,
  category: "Hashcat Modes",
  title: `Modo ${mode} · ${title}`,
  aliases,
  description: `Identificador de modo Hashcat ${mode} para ${title}.`,
  details: `${details} La identificación por forma no garantiza que una entrada arbitraria corresponda a este modo; modos referenciados únicamente, no se realiza descifrado.`,
  copyValue: mode,
  relatedTool: { id: "hash", label: "Hash Lab" },
}));

export const referenceRecords: ReferenceRecord[] = [
  ...cidrRecords,
  ...rangeRecords,
  ...portRecords,
  ...httpRecords,
  ...hashRecords,
  ...jwtRecords,
  ...encodingRecords,
  ...conceptRecords,
  ...windowsEventRecords,
  ...sysmonRecords,
  ...syslogRecords,
  ...securityHeaderRecords,
  ...hashcatRecords,
];
