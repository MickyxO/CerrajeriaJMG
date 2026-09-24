# ==============================================================================
# Script de Respaldo Automatizado de Base de Datos PostgreSQL
# Cerrajeria JMG - SoftSmith
# ==============================================================================
param (
    [string]$TargetDrive = "",
    [int]$RetentionDays = 30
)

$ErrorActionPreference = "Stop"
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Definition
$ProjectRoot = (Resolve-Path (Join-Path $ScriptDir "..\..")).Path
$LogFile = Join-Path $ScriptDir "backup.log"

function Write-Log {
    param ([string]$Message, [string]$Level = "INFO")
    $Timestamp = (Get-Date).ToString("yyyy-MM-dd HH:mm:ss")
    $Formatted = "[$Timestamp] [$Level] $Message"
    Add-Content -Path $LogFile -Value $Formatted -Encoding UTF8
    
    switch ($Level) {
        "ERROR"   { Write-Host $Formatted -ForegroundColor Red }
        "WARN"    { Write-Host $Formatted -ForegroundColor Yellow }
        "SUCCESS" { Write-Host $Formatted -ForegroundColor Green }
        default   { Write-Host $Formatted -ForegroundColor Cyan }
    }
}

Write-Log "==================== INICIO DE RESPALDO ===================="

# 1. Cargar credenciales desde backend/.env o usar valores por defecto
$EnvFile = Join-Path $ProjectRoot "backend\.env"
$DbUser = "postgres"
$DbPass = "root"
$DbHost = "localhost"
$DbPort = "5432"
$DbName = "cerrajeria_prod"

if (Test-Path $EnvFile) {
    try {
        $envLines = Get-Content $EnvFile
        foreach ($line in $envLines) {
            $trimmed = $line.Trim()
            if ($trimmed -match '^DATABASE_URL=(.+)$') {
                $dbUrl = $matches[1].Trim()
                if ($dbUrl -match '^postgresql://(?:([^:]+)(?::([^@]*))?@)?([^:/]+)(?::([0-9]+))?/([^?]+)$') {
                    if ($matches[1]) { $DbUser = $matches[1] }
                    if ($matches[2]) { $DbPass = $matches[2] }
                    if ($matches[3]) { $DbHost = $matches[3] }
                    if ($matches[4]) { $DbPort = $matches[4] }
                    if ($matches[5]) { $DbName = $matches[5] }
                }
            }
        }
        Write-Log "Configuracion de base de datos cargada desde backend/.env"
    } catch {
        Write-Log "Aviso al leer backend/.env: $_. Usando valores predeterminados." "WARN"
    }
}

# 2. Localizar pg_dump.exe
$PgDumpPath = ""
$KnownPaths = @(
    "C:\Program Files\PostgreSQL\18\bin\pg_dump.exe",
    "C:\Program Files\PostgreSQL\17\bin\pg_dump.exe",
    "C:\Program Files\PostgreSQL\16\bin\pg_dump.exe",
    "C:\Program Files\PostgreSQL\15\bin\pg_dump.exe",
    "C:\Program Files\PostgreSQL\14\bin\pg_dump.exe"
)

foreach ($path in $KnownPaths) {
    if (Test-Path $path) {
        $PgDumpPath = $path
        break
    }
}

if (-not $PgDumpPath) {
    $cmd = Get-Command "pg_dump.exe" -ErrorAction SilentlyContinue
    if ($cmd) {
        $PgDumpPath = $cmd.Source
    }
}

if (-not $PgDumpPath) {
    Write-Log "ERROR: No se encontro 'pg_dump.exe'. Instale PostgreSQL o configure la ruta en el PATH." "ERROR"
    exit 1
}

Write-Log "Usando herramienta: $PgDumpPath"

# 3. Generar nombre de archivo con timestamp seguro
$TimestampStr = (Get-Date).ToString("yyyy-MM-dd_HH-mm-ss")
$BackupFileName = "${DbName}_${TimestampStr}.dump"
$LocalBackupPath = Join-Path $ScriptDir $BackupFileName

# 4. Ejecutar respaldo local (formato binario comprimido -F c)
Write-Log "Generando respaldo local: $BackupFileName ..."
$env:PGPASSWORD = $DbPass

try {
    $dumpArgs = @(
        "-h", $DbHost,
        "-p", $DbPort,
        "-U", $DbUser,
        "-F", "c",
        "-b",
        "-f", $LocalBackupPath,
        $DbName
    )
    
    $proc = Start-Process -FilePath $PgDumpPath -ArgumentList $dumpArgs -NoNewWindow -Wait -PassThru
    
    if ($proc.ExitCode -ne 0 -or -not (Test-Path $LocalBackupPath)) {
        throw "pg_dump finalizo con codigo de error $($proc.ExitCode)"
    }
    
    $fileInfo = Get-Item $LocalBackupPath
    $sizeMB = [math]::Round($fileInfo.Length / 1MB, 2)
    Write-Log "Respaldo local generado con exito: $BackupFileName ($sizeMB MB)" "SUCCESS"
} catch {
    Write-Log "Error durante la ejecucion de pg_dump: $_" "ERROR"
    exit 1
} finally {
    $env:PGPASSWORD = ""
}

# 5. Detectar Google Drive y sincronizar
$DriveFound = $false
$DriveBackupDir = ""

# Lista de posibles rutas de Google Drive
$PotentialDrivePaths = @()
if ($TargetDrive -ne "") {
    $PotentialDrivePaths += "$TargetDrive\Respaldos_Cerrajeria"
}

# Revisar unidades montadas de Google Drive
Get-PSDrive -PSProvider FileSystem | ForEach-Object {
    $root = $_.Root.TrimEnd('\')
    if (Test-Path "$root\Mi unidad") {
        $PotentialDrivePaths += "$root\Mi unidad\Respaldos_Cerrajeria"
    }
    if (Test-Path "$root\My Drive") {
        $PotentialDrivePaths += "$root\My Drive\Respaldos_Cerrajeria"
    }
}

foreach ($dest in $PotentialDrivePaths) {
    try {
        if (-not (Test-Path $dest)) {
            New-Item -ItemType Directory -Path $dest -Force | Out-Null
        }
        $DriveBackupDir = $dest
        $DriveFound = $true
        break
    } catch {
        # Si falla en una ruta de prueba, sigue a la siguiente
    }
}

if ($DriveFound) {
    try {
        $DriveDestPath = Join-Path $DriveBackupDir $BackupFileName
        Write-Log "Copiando respaldo a Google Drive: $DriveDestPath ..."
        Copy-Item -Path $LocalBackupPath -Destination $DriveDestPath -Force
        Write-Log "Sincronizacion con Google Drive completada correctamente." "SUCCESS"
    } catch {
        Write-Log "Aviso: No se pudo copiar a Google Drive ($DriveBackupDir): $_" "WARN"
    }
} else {
    Write-Log "Aviso: No se detecto ninguna unidad activa de Google Drive ('Mi unidad' o 'My Drive'). El respaldo local esta seguro." "WARN"
}

# 6. Politica de retencion: Eliminar respaldos mayores a N dias (default: 30 dias)
$CutoffDate = (Get-Date).AddDays(-$RetentionDays)
Write-Log "Aplicando politica de retencion ($RetentionDays dias)..."

# Limpieza local
try {
    $oldLocalFiles = Get-ChildItem -Path $ScriptDir -Filter "*.dump" | Where-Object { $_.LastWriteTime -lt $CutoffDate }
    foreach ($file in $oldLocalFiles) {
        Write-Log "Eliminando respaldo local antiguo: $($file.Name)"
        Remove-Item -Path $file.FullName -Force
    }
} catch {
    Write-Log "Error al purgar respaldos locales antiguos: $_" "WARN"
}

# Limpieza en Google Drive
if ($DriveFound -and (Test-Path $DriveBackupDir)) {
    try {
        $oldDriveFiles = Get-ChildItem -Path $DriveBackupDir -Filter "*.dump" | Where-Object { $_.LastWriteTime -lt $CutoffDate }
        foreach ($file in $oldDriveFiles) {
            Write-Log "Eliminando respaldo antiguo en Google Drive: $($file.Name)"
            Remove-Item -Path $file.FullName -Force
        }
    } catch {
        Write-Log "Error al purgar respaldos en Google Drive: $_" "WARN"
    }
}

Write-Log "==================== RESPALDO FINALIZADO EXITOSAMENTE ===================="
exit 0

