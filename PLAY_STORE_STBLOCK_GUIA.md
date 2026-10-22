# Guía Oficial de Publicación de STBlock en Google Play Store
**Organización / Grupo:** STB Academy  
**Equipo Responsable:** Equipo de Desarrollo y Pedagogía STEM - STB Academy  
**Representante Principal:** Jeason Bello  
**ID de la Aplicación (Package Name):** `com.stbacademy.stblock`  
**Versión Inicial:** `0.1.38` (Versión de Código: `1038`)  
**Fecha de Actualización:** 11 de Octubre de 2026  

---

## 1. Credenciales y Llave Criptográfica Oficial (Upload Keystore)

> ⚠️ **ADVERTENCIA CRÍTICA DE RESPALDO Y SEGURIDAD:**  
> Esta llave (`stblock-upload.keystore`) es la identidad criptográfica digital de **STB Academy** para Google Play.  
> Google Play **NUNCA** aceptará actualizaciones de la aplicación si no están firmadas con esta llave exacta.  
> **Copia de seguridad obligatoria:** Guarda este archivo en Google Drive de STB Academy, correo seguro o almacenamiento externo cifrado.

### Datos Técnicos del Certificado Digital:
| Parámetro | Detalle Oficial |
|---|---|
| **Ruta del Archivo en PC** | `C:\stb\keystore\stblock-upload.keystore` |
| **Alias de la Llave** | `stblock_upload_key` |
| **Contraseña del Keystore (Store Password)** | `STB_PlayStore_2026_SecureKey!` |
| **Contraseña de la Llave (Key Password)** | `STB_PlayStore_2026_SecureKey!` |
| **Algoritmo de Cifrado** | RSA 2048 bits (SHA384withRSA) |
| **Periodo de Validez** | 10.000 días (válida hasta el año 2054) |
| **Titular Oficial (CN)** | **STB Academy** |
| **Unidad Organizativa (OU)** | Software Development |
| **Organización (O)** | STB Academy |
| **Dirección Registrada (STREET)** | Urb. 28 de Mayo, Calle 2, Casa 59 |
| **Ciudad / Localidad (L)** | Porlamar |
| **Estado / Provincia (ST)** | Nueva Esparta |
| **País (C)** | VE (Venezuela) |

### Huellas Digitales del Certificado:
- **SHA-256:** `CB:FC:6D:4E:8E:7E:7B:A4:36:CE:BE:C8:4C:69:8D:CD:01:B0:69:41:1F:B3:82:25:83:86:E1:C2:30:63:89:A8`
- **SHA-1:** `52:64:20:21:7F:4B:C9:0D:DE:A0:E2:C8:A2:F4:77:E2:B7:7B:7B:E3`

### Enlace Automático en el Proyecto:
El proyecto ya está vinculado con esta llave a través de:
- `C:\stb\src-tauri\gen\android\key.properties`
- `C:\stb\src-tauri\gen\android\app\build.gradle.kts` (asigna la firma de release automáticamente para compilar los paquetes `.aab`).

---

## 2. Ficha de Play Store (Redactada a Nombre del Grupo STB Academy)

### Datos de la Ficha:
- **Nombre de la app:** `STBlock`
- **Desarrollador / Empresa:** `STB Academy`
- **Tipo de aplicación:** `Aplicación`
- **Precio:** `Gratis`
- **Categoría principal:** `Educación`
- **Etiquetas:** `Educación`, `Programación`, `Robótica`, `Electrónica`, `Ciencia y tecnología`
- **Correo de contacto:** `solucionestecnologicasb@gmail.com`
- **Sitio web:** `https://www.stbacademy.net`
- **Dirección física:** Urb. 28 de Mayo, Calle 2, Casa 59, Porlamar, Estado Nueva Esparta, Venezuela.

---

### Textos de la Ficha (Listos para Copiar y Pegar):

#### Título (máx. 30 caracteres):
```text
STBlock
```

#### Descripción breve (máx. 80 caracteres):
```text
Programación visual, circuitos electrónicos y diseño 3D por STB Academy.
```

#### Descripción completa (máx. 4000 caracteres):
```text
¡Bienvenidos a STBlock! Somos el equipo de STB Academy, una organización dedicada a la innovación educativa y la formación tecnológica en áreas STEM (Ciencia, Tecnología, Ingeniería y Matemáticas).

STBlock es nuestra plataforma integral diseñada para que niños, jóvenes, educadores y entusiastas de la robótica aprendan a crear tecnología real de manera intuitiva, interactiva y divertida desde cualquier dispositivo móvil o tablet.

Nuestra aplicación une en un solo ecosistema el pensamiento computacional, el diseño tridimensional y la ingeniería electrónica:

🧩 1. PROGRAMACIÓN VISUAL POR BLOQUES
- Entorno ágil y amigable basado en el estándar Scratch 3.0 con extensiones especializadas desarrolladas por STB Academy.
- Diseña videojuegos, proyectos interactivos, animaciones y simulaciones lógicas.
- Guarda y exporta tus proyectos (.flynt y .sb3) en la memoria de tu dispositivo con total libertad.

💡 2. LABORATORIO DE ELECTRÓNICA Y CIRCUITOS 3D
- Diseña, conecta y experimenta con circuitos interactivos en tiempo real.
- Experimenta con componentes como LEDs, pulsadores, resistencias, sensores y microcontroladores sin riesgo de dañar componentes físicos.
- Interfaz táctil adaptada para celulares con una barra inferior ergonómica y acceso instantáneo a la biblioteca de componentes.

📐 3. ENTORNO DE MODELADO Y DISEÑO 3D (SKETCHFORGE)
- Crea piezas, estructuras mecánicas y figuras tridimensionales listas para robótica y proyectos escolares.
- Visualización interactiva 3D con navegación táctil fluida.

🎓 4. COMPROMISO EDUCATIVO DE STB ACADEMY
- Sin publicidad molesta ni compras integradas: un entorno 100% enfocado en el aprendizaje y la concentración.
- Diseñado para su integración en aulas escolares, laboratorios de robótica y aprendizaje autónomo en casa.
- Desarrollado por docentes, ingenieros y desarrolladores comprometidos con la educación tecnológica accesible en toda Latinoamérica y el mundo.

¡Descubre el creador de tecnología que llevas dentro con el equipo de STB Academy!
Conoce más sobre nuestros cursos, kits y proyectos en: https://www.stbacademy.net
```

---

## 3. Recursos Gráficos Preparados

Para completar la publicación en **Google Play Console > Crecimiento > Ficha de Play Store principal**:

1. **Icono Oficial de STBlock (512 × 512 px PNG con canal alfa):**
   - Archivo generado y listo para subir:  
     `C:\stb\icon_playstore_512x512.png`
2. **Gráfico de Funciones / Banner Promocional (1024 × 500 px):**
   - Imagen horizontal de cabecera con el logotipo de STBlock y STB Academy.
3. **Capturas de Pantalla (Mínimo 2, recomendado 4 a 6):**
   - Capturas en horizontal de la vista de bloques, del laboratorio de electrónica y del modelador 3D tomadas desde un teléfono o tablet.

---

## 4. Política de Privacidad Oficial (STB Academy)

Esta política debe publicarse en tu página web (`https://www.stbacademy.net/politica-privacidad`) para cumplir las directrices de privacidad infantil y escolar de Google Play:

```markdown
# Política de Privacidad de STBlock

Última actualización: 11 de Octubre de 2026
STB Academy — Porlamar, Nueva Esparta, Venezuela

1. QUIÉNES SOMOS
STB Academy es una iniciativa educativa enfocada en la enseñanza y desarrollo de herramientas STEM para niños, jóvenes y educadores. Nuestra sede principal está ubicada en Porlamar, Estado Nueva Esparta, Venezuela.

2. COMPROMISO CON LA PRIVACIDAD Y SEGURIDAD FAMILIAR
En STB Academy respetamos y protegemos la privacidad de nuestros usuarios y estudiantes. La aplicación STBlock NO recopila, transmite, vende ni comparte información de identificación personal (PII) con terceros ni con servidores remotos.
- No requerimos registros de cuentas, nombres, correos ni datos sensibles para usar las funciones básicas de la aplicación.
- Todos los proyectos creados (.flynt, .sb3) se guardan localmente en el almacenamiento del dispositivo del usuario.

3. USO DE PERMISOS
STBlock únicamente solicita los permisos indispensables para cumplir sus funciones educativas:
- Selector de Archivos / Almacenamiento: Permite al usuario abrir proyectos guardados y guardar nuevos diseños o códigos en su dispositivo.
- Acceso a Red / Internet: Utilizado exclusivamente para la carga de librerías y componentes educativos integrados en la aplicación web local.

4. POLÍTICA PARA MENORES DE EDAD (COPPA / GDPR-K)
STBlock es una aplicación 100% segura para niños y familias. No incluye anuncios publicitarios de terceros ni mecanismos de monetización invasivos.

5. CONTACTO Y SOPORTE
Para cualquier duda o consulta sobre nuestra política de privacidad, puede contactar al equipo de STB Academy:
- Correo Electrónico: solucionestecnologicasb@gmail.com
- Sitio Web Oficial: https://www.stbacademy.net
- Dirección: Urb. 28 de Mayo, Calle 2, Casa 59, Porlamar, Nueva Esparta, Venezuela.
```

---

## 5. Respuestas a los Cuestionarios Obligatorios de Google Play

Dentro de **Google Play Console > Contenido de la app**:

| Cuestionario | Respuesta de STB Academy |
|---|---|
| **Acceso a la app** | *"Todas las funciones están disponibles sin restricciones especiales de acceso o credenciales"*. |
| **Anuncios** | *"No, mi app no contiene anuncios"*. |
| **Clasificación IARC** | Correo: `solucionestecnologicasb@gmail.com`, Categoría: *Educación*. Contestar **NO** a violencia, lenguaje fuerte y compras. (Resultado: Para todos / PEGI 3). |
| **Público Objetivo** | Seleccionar las franjas de edad escolares (ej. *6 a 8 años, 9 a 12 años, 13 a 15 años, 16 a 17 años y 18 años o más*). Declarar que la app no recopila datos de menores. |
| **Seguridad de los Datos** | Indicar que la app **NO recopila ni comparte datos de usuario**. |
| **Apps de Gobierno / Noticias / Salud** | Marcar *"No"* a todas. |

---

## 6. Dinámica de los 14 Días de Pruebas Cerradas (Comunidad STB Academy)

Al ser una cuenta personal recién creada, Google solicita validar la app mediante **Pruebas Cerradas (Closed Testing)**:

1. **Reunir a la comunidad STB Academy:**
   - 20 estudiantes, profesores, colaboradores o amigos con cuenta Gmail.
2. **Cargar la lista en Play Console:**
   - Ir a *Pruebas cerradas > Evaluadores > Crear lista de distribución de correo*.
   - Añadir los 20+ correos electrónicos de Gmail.
3. **Compartir el enlace:**
   - Compartir el enlace privado generado por Play Console para que los 20 evaluadores acepten participar e instalen la app desde la tienda.
4. **Completar las 2 semanas:**
   - Mantener la app instalada durante 14 días continuos.
5. **Paso a Producción:**
   - Al cumplirse el plazo, se activará la opción *"Solicitar acceso a Producción"*, permitiendo que STBlock esté visible y descargable para cualquier persona en Google Play a nivel mundial.

---

## 7. Paquete Oficial Listo para Subir a Google Play (.aab)

El paquete de producción firmado digitalmente con la llave de **STB Academy** ya fue compilado y verificado con éxito total:

- **Archivo para subir a la consola (Acceso directo en tu PC):**  
  📁 [`C:\stb\STBlock_v0.1.38_PlayStore_Release.aab`](file:///C:/stb/STBlock_v0.1.38_PlayStore_Release.aab) *(Módulo Base: ~60 MB | Asset Pack PAD: ~240 MB — 100% conforme a Google Play)*
- **Ruta interna de Gradle:**  
  📁 `C:\stb\src-tauri\gen\android\app\build\outputs\bundle\universalRelease\app-universal-release.aab`
- **Icono Oficial para la ficha (512x512 px PNG):**  
  📁 [`C:\stb\icon_playstore_512x512.png`](file:///C:/stb/icon_playstore_512x512.png)

> **Nota:** Este archivo `.aab` incluye **Google Play Asset Delivery (PAD)** en modo `install-time`. Cumple sobradamente la regla de Google Play (Módulo Base < 150 MB) y entrega automáticamente los modelos 3D y componentes multimedia durante la instalación de la app.

