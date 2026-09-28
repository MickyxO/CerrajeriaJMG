# Sistema de Respaldos Automáticos y Recuperación ante Desastres
## Cerrajería JMG - SoftSmith

Este módulo gestiona la creación periódica de respaldos de la base de datos PostgreSQL (`cerrajeria_prod`), asegurando redundancia dual (disco local + sincronización automática a Google Drive) y retención histórica de 30 días.

---

### 📂 Estructura de Archivos

- `backup.bat` / `backup.ps1`: Ejecuta el respaldo completo en formato binario comprimido (`pg_dump -F c`), lo guarda en esta carpeta y copia un duplicado idéntico a tu Google Drive (`Mi unidad/Respaldos_Cerrajeria`).
- `restore.bat` / `restore.ps1`: Asistente interactivo de recuperación. Muestra la lista de respaldos disponibles (locales y en Google Drive) ordenados por fecha, pide confirmación explícita y restaura la base de datos de forma limpia.
- `setup_task.bat`: Script de configuración rápida para programar la tarea automática en el Administrador de Tareas de Windows (por defecto: diario a las 23:30).
- `backup.log`: Registro cronológico con fecha, hora, estado y tamaño de cada respaldo realizado.
- `.gitignore`: Evita que los archivos pesados `.dump` y logs se suban al repositorio Git.

---

### 🚀 ¿Cómo Funciona?

1. **Detección Automática de Configuración**:
   - Lee las credenciales y nombre de base de datos directamente de `backend/.env`.
   - Si no existe, recurre a los valores estándar de PostgreSQL (`localhost:5432`, `postgres`, `cerrajeria_prod`).
2. **Detección de Herramientas**:
   - Localiza automáticamente `pg_dump.exe` y `pg_restore.exe` en cualquier versión instalada de PostgreSQL (14 a 18+) o en el PATH del sistema.
3. **Detección Dinámica de Google Drive**:
   - Escanea las unidades montadas del sistema buscando la carpeta `Mi unidad` o `My Drive` (por ejemplo, `G:\Mi unidad`).
   - Crea automáticamente la subcarpeta `Respaldos_Cerrajeria` y envía el respaldo ahí.
4. **Política de Retención Automática (30 días)**:
   - Al terminar cada respaldo, busca y elimina automáticamente los archivos `.dump` con más de 30 días de antigüedad tanto en la carpeta local como en Google Drive para no saturar el espacio en disco.

---

### 🛠️ Uso Manual

#### 1. Realizar un Respaldo Manual Inmediato
Haz doble clic sobre `backup.bat`.
Verás en consola el progreso y confirmación de copia en local y Google Drive.

#### 2. Restaurar una Copia de Seguridad
Haz doble clic sobre `restore.bat`.
1. El script te listará todos los respaldos encontrados con su fecha y tamaño.
2. Presiona `[ENTER]` para restaurar el más reciente (#1) o introduce el número que desees.
3. Te pedirá escribir `SI` para confirmar la sobreescritura de la base de datos.

---

### ⏰ Automatización en Windows (Programador de Tareas)

Ya se ha configurado la tarea `CerrajeriaJMG_Backup` en este equipo. Se ejecutará todos los días a las **23:30 hrs** en segundo plano (sin ventanas molestas).

Si en el futuro cambias de equipo o deseas reconfigurarla:
1. Asegúrate de tener instalado PostgreSQL y Google Drive para Escritorio.
2. Ejecuta `setup_task.bat`.
3. Introduce la hora deseada (o presiona ENTER para 23:30) y listo.

---

### 💻 Migración a la Computadora Final

Cuando vayas a instalar el sistema en la computadora definitiva del negocio:
1. Instala **PostgreSQL** (versión 16 o 18 recomendada) con la misma contraseña indicada en `backend/.env`.
2. Instala e inicia sesión en **Google Drive para Escritorio**.
3. Restaura tu respaldo más reciente ejecutando `restore.bat`.
4. Ejecuta `setup_task.bat` una sola vez para dejar programados los respaldos diarios automáticos.

