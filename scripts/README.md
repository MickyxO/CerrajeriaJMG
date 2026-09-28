# 🚀 Scripts de Arranque y Red Intranet - Cerrajería JMG

Esta carpeta contiene los scripts para operar el sistema en la computadora principal del negocio y habilitar la **Intranet Local** (conexión simultánea de tablets, celulares y otras computadoras en el mostrador).

---

## 📋 Lista de Scripts y para qué sirve cada uno

| Archivo | Función | Modo de Uso |
| :--- | :--- | :--- |
| **`instalar_arranque_automatico.bat`** | **Configura el inicio con Windows (1 solo clic).** Crea un acceso directo en la carpeta de inicio para que cada vez que prendan la computadora, el sistema arranque solo en silencio y abra el POS. | Doble clic (solo se hace una vez). |
| **`arrancar_silencioso.vbs`** | **Arranque en segundo plano.** Inicia Backend (puerto 3000) y Frontend (puerto 5173) sin mostrar ninguna consola negra, y abre el navegador en el Punto de Venta. | Ejecutado automáticamente por Windows o por doble clic. |
| **`arrancar_servidor.bat`** | **Arranque visible (Modo diagnóstico).** Abre las consolas CMD mostrando logs en vivo de Node.js y Vite. Útil si alguna vez deseas ver errores o hacer mantenimiento. | Doble clic si quieres ver consolas. |
| **`detener_servidor.bat`** | **Detiene todos los servidores.** Localiza y cierra limpiamente los procesos que estén ocupando los puertos 3000 y 5173. | Doble clic si vas a actualizar el sistema. |
| **`abrir_puertos_firewall.bat`** | **Permite la conexión de otros dispositivos.** Abre los puertos 3000 y 5173 en el Firewall de Windows para que tablets y celulares en el mismo Wi-Fi puedan entrar al sistema. | Clic derecho -> *Ejecutar como administrador* (solo una vez). |
| **`ver_ip_intranet.bat`** | **Muestra la dirección de red.** Te indica exactamente qué dirección IP escribir en las tablets o celulares (ejemplo: `http://192.168.1.50:5173/pos`). | Doble clic. |
| **`desinstalar_arranque_automatico.bat`** | Elimina el acceso directo de inicio automático en caso de que desees desactivarlo. | Doble clic. |

---

## 🛠️ Pasos de instalación en la Nueva Computadora (Servidor)

1. **Instalar programas base**:
   * Node.js (LTS).
   * PostgreSQL (versión 15, 16 o 17).
   * Google Drive para escritorio (para respaldos automáticos).
2. **Descargar el proyecto**:
   * Con Git: `git clone <URL>` o copiando la carpeta del proyecto.
   * Ejecutar `npm install` dentro de `backend/` y `frontend/`.
   * En `frontend/` ejecutar `npm run build` una vez para generar los archivos optimizados.
3. **Restaurar la base de datos**:
   * Ejecutar el script en `database/backups/restore.bat`.
4. **Habilitar Intranet y Arranque Automático**:
   * En esta carpeta `scripts/`, haz clic derecho en **`abrir_puertos_firewall.bat`** -> *Ejecutar como administrador*.
   * Haz doble clic en **`instalar_arranque_automatico.bat`**.
5. **¡Listo!**:
   * La computadora ya está configurada. Cada mañana que se encienda, el sistema se iniciará solo sin que el cerrajero tenga que mover nada.

