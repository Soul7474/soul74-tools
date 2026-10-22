# Progreso de funciones nuevas — S0ul74-Tools

## Punto de partida

- 2026-10-22: `npm.cmd run build` correcto (`tsc -b` y `vite build`).
- Se confirmó el diseño cyberpunk como completado en `DISENO-PROGRESO.md`.
- El directorio del proyecto no contiene `.git`; por eso no es posible crear la rama solicitada desde `rediseno-cyberpunk`, registrar commits por fase ni crear el commit final. No se inicializará Git ni se tocará `main`.
- No se instalarán dependencias salvo Vitest de desarrollo si se necesita para los tests de funciones puras.

## Fases

- A — Network Lab: completada; tests (8) y build correctos.
- B — Hash, Timestamp y Password Labs: completada; tests (17) y build correctos.
- C — IOC Analyzer: completada; 5 tests nuevos, 22 tests totales y build correcto.
- D — Log Analyzer: completada; 7 tests nuevos, 30 tests totales y build correcto.
- E — Sysadmin Lab: completada; 6 tests nuevos, 36 tests totales y build correcto.
- F — Reference Database: completada; 2 tests nuevos, 38 tests totales y build correcto.
- G — PCAP Analyzer: completada; 7 tests nuevos, 45 tests totales y build correcto.

## Restricciones y notas

- Funciones nuevas completamente locales; no se añadirán consultas, CDN, analítica ni backend.
- Las detecciones de IOC y logs serán indicadores heurísticos, nunca veredictos de ataque.
- No se implementarán crackeo, verificación de firmas JWT, antivirus ni captura de red en directo.
- Se inspeccionarán y reutilizarán las capacidades de Text & Regex, hash, timestamp y referencias antes de crear lógica nueva.
- Actualizar este documento al cerrar cada fase, incluyendo archivos, pruebas, limitaciones y pasos manuales.

## Fase A — Network Lab

- Reutilizado `src/lib/network.ts` y se añadió el panel avanzado a la vista activa de `App.tsx`; no se reemplazó la calculadora que ya estaba en uso. El componente duplicado `sections/NetworkSection.tsx` no se montó ni se unificó.
- Nuevas funciones: conversión IPv4 a decimal punteado, hexadecimal, binario por octeto y entero unsigned de 32 bits; comprobación de pertenencia CIDR; subnetting uniforme y VLSM con validación de capacidad; expansión/compresión IPv6, cálculo de red/prefijo y clasificación de rango.
- IPv6 incluye el tipo `documentation` para `2001:db8::/32`, en vez de afirmar que sea espacio global enrutable. La clasificación de “global” es solo por prefijo asignado, no prueba conectividad.
- Se corrigieron dentro de las funciones expuestas los límites de `/31` y `/32`, las asignaciones VLSM fuera de la red base, la cantidad de subredes superior a la capacidad y la normalización de IPv6 completa/comprimida.
- Archivos añadidos/modificados: `src/lib/network.test.ts`, `src/sections/NetworkAdvancedTools.tsx`, `src/lib/network.ts`, `src/App.tsx`, `src/styles.css`, `package.json` y lockfile.
- Vitest añadido como dependencia de desarrollo y script `test`; no se añadieron otras dependencias.
- `npm.cmd test`: 8 tests pasaron. `npm.cmd run build`: correcto.
- Prueba manual en navegador: `192.168.1.0/24` muestra 4 subredes `/26` y 3 asignaciones VLSM para `50,25,10`; `192.168.1.42` pertenece a `/24`; conversión de `192.168.1.1` y `2001:db8::1/32` correctas; sin overflow en escritorio.

## Fase B — Hash, Timestamp y Password

- `src/lib/hash.ts`: MD5 propio sobre UTF-8, HMAC SHA-1/256/384/512 con Web Crypto, CRC32 y reconocimiento heurístico ampliado para bcrypt, Argon2, md5crypt, sha256crypt y sha512crypt. Los modos/fmt solo se indican para los identificadores comunes que conozco con certeza; MD5/SHA raw siguen mostrándose como ambiguos.
- El identificador dice expresamente que no verifica ni descifra. No se implementa crackeo. MD5 se etiqueta como inseguro/legado, apto solo para compatibilidad y análisis forense; CRC32 se explica como checksum no criptográfico.
- `src/lib/timestampTools.ts`: conversiones FILETIME, WebKit/Chrome, .NET ticks y Mac Absolute; autodetección Unix s/ms/µs/ns con advertencia de ambigüedad.
- `src/lib/passwordStrength.ts`: estimación local de entropía y diversidad; la interfaz la identifica como aproximación que no detecta filtraciones ni patrones lingüísticos.
- UI activa extendida en `HashSection.tsx`, `TimestampSection.tsx` y `App.tsx`; estilos añadidos en `styles.css`. Se conserva la lógica previa de hashing y generación de contraseñas.
- Tests: MD5 de vectores conocidos, CRC32 `123456789`, HMAC SHA-1/SHA-256, identificadores modulares, épocas conocidas (FILETIME/WebKit/.NET Unix epoch y Mac 2001) y estimador. Total actual: 17 tests pasados. Build correcto.
- Prueba manual: MD5 `abc` → `900150983cd24fb0d6963f7d28e17f72`; CRC32 `abc` → `352441c2`; HMAC-SHA256 RFC `Jefe`/`what do ya want for nothing?`; FILETIME `116444736000000000` → Unix epoch; auto `0` indica ambigüedad; fortaleza estimada visible tras generar contraseña.
- Riesgo de instalación observado: npm informó 3 vulnerabilidades en el árbol actual (1 moderate, 2 critical). No se aplicó `npm audit fix` ni se cambiaron dependencias de producción.

## Fase C — IOC Analyzer

- Añadida `src/lib/iocAnalyzer.ts`, que reutiliza `extractIndicators` para IPv4, URL, dominios, correos y hashes, y añade IPv6, CVE, rutas, deduplicación, clasificación local de IP, refang/defang y exportadores CSV/TXT.
- Añadida `src/sections/IocAnalyzerSection.tsx` y registrada como `ioc` en `src/data/toolCatalog.ts`; integrada en `src/App.tsx` y con color FX en `src/components/CodeRain.tsx`. El catálogo central alimenta navegación, búsqueda y command palette.
- La interfaz permite pegar o cargar texto (máximo 2 MiB y 1.000.000 caracteres), ver contadores derivados, filtrar copia por categoría y descargar CSV, JSON o TXT. La lectura de archivos es local mediante `File.text()`.
- Se añadió el evento `soul74:open-iocs` para que la futura fase D pueda transferir texto al IOC Analyzer sin duplicar parsers.
- Incluye avisos de que las detecciones son indicadores sintácticos: no determina malware, no consulta reputación/DNS, no abre URLs y no ejecuta archivos. Refang/defang solo transforma texto.
- Archivos añadidos/modificados: `src/lib/iocAnalyzer.ts`, `src/lib/iocAnalyzer.test.ts`, `src/sections/IocAnalyzerSection.tsx`, `src/data/toolCatalog.ts`, `src/App.tsx`, `src/components/CodeRain.tsx`, `src/styles.css`.
- Pruebas unitarias cubren indicadores defanged, categorías y clasificación IPv4, deduplicación, rutas, CSV/TXT y límites. `npm.cmd test`: 22 tests pasaron. `npm.cmd run build`: correcto.
- Prueba manual sugerida: introducir `hxxps://example[.]org 192.168.1.10 2001:db8::1 CVE-2024-12345`, extraer y verificar URL refang, clasificación privada/reservada, contadores, copiar IPv4 y exportar los tres formatos. Probar archivo mayor de 2 MiB y texto mayor de 1.000.000 caracteres para verificar el aviso.

## Fase D — Log Analyzer

- Se amplió la pestaña `Logs` existente de Text & Regex Lab; se preservó el analizador anterior por términos y se añadió `src/lib/logAnalyzer.ts` más `src/lib/logAnalyzer.worker.ts`.
- El parser reconoce Apache common/combined, formato access JSON habitual de Nginx, Linux syslog/auth.log, texto Windows con Event ID y CSV con cabeceras de Event Viewer. El formato admite detección automática y selección manual; las líneas que no se reconocen se conservan como texto para no perder evidencia.
- Filtros locales por IP, estado/Event ID, método, usuario, fecha (cuando existe timestamp), texto o Regex. Tablas paginadas a 50 registros, detalle bruto, top IP/URL/estado/User-Agent/usuario e histograma SVG inline.
- Indicadores heurísticos con umbrales configurables: fallos de autenticación por IP y ventana temporal, path traversal, patrones SQLi/XSS, User-Agent de escáneres conocidos y volumen de estados HTTP 4xx/5xx. Cada resultado se rotula como indicador, nunca como veredicto.
- La interfaz analiza en Web Worker con timeout de seguridad. Límite de texto 1.000.000 unidades UTF-16 y archivo de hasta 4 MB; no captura tráfico en directo ni contacta servicios externos. RFC 3164 syslog no incluye año: el timestamp permanece vacío, aunque su reloj fecha/hora se usa solo para evaluar ventanas relativas de fallos.
- El enlace de IPs filtradas abre IOC Analyzer usando el evento `soul74:open-iocs`; se verificó manualmente con una línea Apache de ejemplo, un indicador de traversal/escáner y la navegación con la IP en IOC.
- Archivos añadidos/modificados: `src/lib/logAnalyzer.ts`, `src/lib/logAnalyzer.worker.ts`, `src/lib/logAnalyzer.test.ts`, `src/sections/TextRegexSection.tsx`, `src/sections/IocAnalyzerSection.tsx`, `src/App.tsx`, `src/lib/iocAnalyzer.ts`, `src/lib/iocAnalyzer.test.ts`, `src/styles.css`.
- Tests con Apache combined, Nginx JSON, auth.log, CSV/texto Windows, filtros, heurísticas y fechas: `npm.cmd test` pasó (30 tests totales). `npm.cmd run build` pasó e incluye bundle de Worker.
- Prueba manual sugerida: usar `192.0.2.44 - - [10/Oct/2000:13:55:36 -0700] "GET /../../etc/passwd HTTP/1.1" 404 12 "-" "sqlmap/1.0"`; verificar parser Apache, filtro por IP/método, indicador heurístico, tabla/detalle y envío de IP a IOC. Probar además el ejemplo de `auth.log` y un CSV Windows con Event ID 4625.

## Fase E — Sysadmin Lab

- Añadidos `src/lib/sysadminTools.ts`, con funciones puras para conversión octal/rwx, cálculo de permisos efectivos tras `umask` (base de archivo `0666` y directorio `0777`) y parser/explainer cron de cinco campos con listas, rangos y pasos.
- Añadida interfaz `src/sections/SysadminSection.tsx`, registrada en el catálogo central como ASIR y montada en `App.tsx`; recibe estilo de FX y diseño del sistema existente.
- Las próximas cinco ejecuciones cron se calculan en la zona local del navegador, con límite de búsqueda de dos años y errores claros. Día de semana `7` se normaliza a domingo `0`, y cuando ambos campos de día cron están restringidos se utiliza la semántica OR habitual.
- La interfaz deja claro que no ejecuta `chmod`, no modifica archivos ni programa tareas. No se soportan permisos especiales setuid/setgid/sticky, nombres de meses/días ni sintaxis cron con segundos.
- Archivos añadidos/modificados: `src/lib/sysadminTools.ts`, `src/lib/sysadminTools.test.ts`, `src/sections/SysadminSection.tsx`, `src/data/toolCatalog.ts`, `src/App.tsx`, `src/components/CodeRain.tsx`, `src/styles.css`.
- Tests de modos `0755`/`0640`, umask `027`, cron `*/15 9-17 * * 1-5`, domingo 7 y errores: `npm.cmd test` pasó (36 tests totales). `npm.cmd run build`: correcto.
- Comprobación manual de UI: `0640` produce `rw-r-----`; umask `027` produce archivo `640` y directorio `750`; cron `*/15 * * * *` lista cinco horarios locales. A 390 px, `scrollWidth` coincidió con el ancho del viewport (sin desbordamiento horizontal).
- Prueba manual sugerida: abrir Sysadmin Lab, comprobar `755` ↔ `rwxr-xr-x`, `027` → `640/750`, cron `*/15 9-17 * * 1-5` y entradas inválidas como `60 * * * *`.

## Fase F — Reference Database

- Ampliado `src/data/referenceData.ts` con 6 Windows Security Event IDs (4624, 4625, 4688, 4720, 4672, 1102), 9 Sysmon Event IDs habituales, las 8 severidades syslog RFC 5424 (0–7), 9 cabeceras HTTP de seguridad y 8 modos Hashcat conocidos (MD5, SHA-1, NTLM, SHA-256, SHA-512, md5crypt, sha512crypt y bcrypt).
- Cada entrada contiene una explicación breve, advertencias de interpretación y enlace interno a Text & Regex Lab o Hash Lab. Los conteos/categorías visibles se siguen derivando de `referenceRecords`, sin duplicar números en la interfaz.
- No se añadieron entradas de las que no hubiera certeza; los modos se presentan como referencias de formato y no se descifra ningún hash. Los eventos se advierten como señales contextuales, no veredictos.
- Archivos añadidos/modificados: `src/data/referenceData.ts`, `src/data/referenceData.test.ts`.
- Tests verifican identificadores únicos, categorías derivadas y presencia de eventos/modes seleccionados: `npm.cmd test` pasó (38 tests totales). `npm.cmd run build`: correcto.
- Prueba manual sugerida: en Reference Database buscar `4625`, `Sysmon 22`, `Emergency`, `Content-Security-Policy` y `3200`; validar que el contador cambia con la búsqueda/categoría y que los enlaces internos llevan a las herramientas relacionadas.

## Fase G — PCAP Analyzer

- Añadidos `src/lib/pcapAnalyzer.ts` y `src/lib/pcapAnalyzer.worker.ts`; el parser utiliza `DataView` y se ejecuta en Web Worker con timeout. Límite de archivo: 32 MiB y límite de análisis: 50.000 paquetes.
- El volcado hexadecimal limita la vista a los primeros 4 KiB del paquete seleccionado e indica los bytes omitidos para evitar bloquear la interfaz con tramas anormalmente grandes.
- Soporta PCAP clásico Ethernet little/big endian y resolución micro/nanosegundos. Decodifica Ethernet II, VLAN 802.1Q/802.1ad, ARP, IPv4, IPv6 con extensiones comunes, TCP, UDP, ICMP/ICMPv6, consultas/respuestas DNS UDP, línea de petición/respuesta HTTP en claro y SNI cuando el ClientHello está completo y se reconoce.
- La interfaz añade resumen de paquetes, duración, distribución de protocolos, top talkers, flujos TCP/UDP direccionales, filtros IP/puerto/protocolo, tabla paginada a 50 filas, detalle de paquete y volcado hex con offsets.
- PCAPNG no se parsea todavía: se detecta el magic y se muestra un aviso explícito para exportar a PCAP clásico. Archivos truncados/corruptos producen warnings por paquete y el análisis continúa cuando es posible; errores de cabecera/formato se muestran claramente.
- La interfaz especifica: sin captura en directo, sin reensamblado completo TCP y sin descifrado. No se realizan consultas externas.
- Archivos añadidos/modificados: `src/lib/pcapAnalyzer.ts`, `src/lib/pcapAnalyzer.worker.ts`, `src/lib/pcapAnalyzer.test.ts`, `src/sections/PcapAnalyzerSection.tsx`, `src/data/toolCatalog.ts`, `src/components/CodeRain.tsx`, `src/App.tsx`, `src/styles.css`.
- Tests construyen capturas en memoria (PCAP header + Ethernet/IPv4/TCP y DNS query/response) y cubren endianess, precisión, IPv6, HTTP, SNI, VLAN, filtros, truncamiento, límite del volcado hex y mensaje PCAPNG. `npm.cmd test`: 45 tests pasaron. `npm.cmd run build`: correcto; se generan bundles Worker para logs y PCAP.
- Comprobación manual en navegador: captura Ethernet/IPv4/TCP sintética procesada por Worker; tabla muestra `192.0.2.1:12345 → 198.51.100.2:80`, flujo, top talkers y hex. Sin overflow horizontal a 390, 768 y 1280 px.
- Prueba manual sugerida: cargar un PCAP clásico Ethernet de menos de 32 MiB, filtrar por IP/puerto/protocolo, abrir detalle y comprobar offsets. Cargar un `.pcapng` para verificar el aviso de no soportado y un archivo truncado para comprobar warnings sin bloqueo de interfaz.

## Límites funcionales explícitos

- **Network Lab:** calcula y clasifica rangos localmente; no escanea, enruta ni prueba conectividad.
- **Hash Lab:** MD5 se marca legado/inseguro; no crackea hashes, no confirma formatos ambiguos ni verifica integridad de firmas.
- **Timestamp Lab:** autodetección de unidades es heurística y puede ser ambigua; no valida la procedencia temporal.
- **Password Lab:** fortaleza/entropía es una estimación local; no consulta filtraciones ni predice reutilización o patrones lingüísticos.
- **IOC Analyzer:** extracción sintáctica local; no confirma actividad maliciosa, reputación, DNS, firmas ni existencia de dominios, y no ejecuta archivos.
- **Text & Regex / Log Analyzer:** busca patrones y produce indicadores heurísticos; no sentencia ataques, no captura tráfico en directo y no contacta servicios.
- **Sysadmin Lab:** calcula modos y horarios; no ejecuta comandos, no cambia archivos ni instala tareas.
- **Reference Database:** referencia local orientativa; el Event ID, modo hash o cabecera no prueba por sí solo un evento o vulnerabilidad, y no realiza descifrado.
- **PCAP Analyzer:** análisis parcial de PCAP clásico; no soporta PCAPNG aún, no captura tráfico, no reensambla por completo TCP y no descifra.

## Verificación final y limitaciones de entrega

- `npm.cmd test`: 45 tests, todos correctos. `npm.cmd run build`: correcto.
- El catálogo central alimenta sidebar, búsqueda, command palette y dashboard. Smoke test manual: 13 páginas de herramientas/auxiliar navegables, sin errores de JavaScript; `Ctrl+K` abre la command palette y muestra IOC Analyzer.
- Responsive comprobado a 390/768/1280 px en PCAP Analyzer; IOC Analyzer y Sysadmin Lab; Text & Regex Logs. El primer chequeo de Logs detectó overflow horizontal; se corrigió estableciendo `min-width: 0` en sus elementos de grid y se volvió a verificar sin overflow. Herramientas antiguas smoke-tested en escritorio; Network/Hash/Password mantienen sus pruebas y resultados conocidos de fases A/B.
- Las fases no se revirtieron. No se pudo crear `funciones-nuevas` ni registrar commits por fase/final: la carpeta sigue sin `.git`. No se inicializó un repositorio, no se hizo push ni deploy, y no se modificó `main`.
- No se agregaron dependencias después de Vitest; no se tocaron servicios externos, CDNs, analítica ni backend. Permanece la advertencia previa de npm sobre 3 vulnerabilidades existentes (1 moderada, 2 críticas); no se ejecutó `npm audit fix`.
