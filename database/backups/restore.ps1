# ==============================================================================
# Script de Restauracion de Base de Datos PostgreSQL
# Cerrajeria JMG - SoftSmith
# ==============================================================================
param (
    [string]$BackupPath = ""
)

$ErrorActionPreference = "Stop"
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Definition
$ProjectRoot = (Resolve-Path (Join-Path $ScriptDir "..\..")).Path

function Write-Info {
    param ([string]$Message, [string]$Color = "Cyan")
    $timestamp = (Get-Date).ToString("yyyy-MM-dd HH:mm:ss")
    Write-Host "[$timestamp] $Message" -ForegroundColor $Color
}

Write-Info "==================== RESTAURACION DE BASE DE DATOS ====================" "Yellow"

# 1. Cargar credenciales desde backend/.env o valores por defecto
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
    } catch {
        Write-Info "Aviso al leer backend/.env: $_. Usando valores predeterminados." "Yellow"
    }
}

# 2. Localizar pg_restore.exe
$PgRestorePath = ""
$KnownPaths = @(
    "C:\Program Files\PostgreSQL\18\bin\pg_restore.exe",
    "C:\Program Files\PostgreSQL\17\bin\pg_restore.exe",
    "C:\Program Files\PostgreSQL\16\bin\pg_restore.exe",
    "C:\Program Files\PostgreSQL\15\bin\pg_restore.exe",
    "C:\Program Files\PostgreSQL\14\bin\pg_restore.exe"
)

foreach ($path in $KnownPaths) {
    if (Test-Path $path) {
        $PgRestorePath = $path
        break
    }
}

if (-not $PgRestorePath) {
    $cmd = Get-Command "pg_restore.exe" -ErrorAction SilentlyContinue
    if ($cmd) {
        $PgRestorePath = $cmd.Source
    }
}

if (-not $PgRestorePath) {
    Write-Info "ERROR: No se encontro 'pg_restore.exe'. Instale PostgreSQL o configure la ruta en el PATH." "Red"
    exit 1
}

# 3. Si no se especifico BackupPath, buscar respaldos disponibles (Local y Google Drive)
$SelectedFile = $BackupPath

if (-not $SelectedFile) {
    $allFiles = @()
    
    # Buscar en carpeta local
    $localFiles = Get-ChildItem -Path $ScriptDir -Filter "*.dump" -ErrorAction SilentlyContinue | ForEach-Object {
        [PSCustomObject]@{
            Name = $_.Name
            FullName = $_.FullName
            Length = $_.Length
            LastWriteTime = $_.LastWriteTime
            Source = "Local"
        }
    }
    if ($localFiles) { $allFiles += $localFiles }
    
    # Buscar en Google Drive
    Get-PSDrive -PSProvider FileSystem | ForEach-Object {
        $root = $_.Root.TrimEnd('\')
        $driveDirs = @(
            "$root\Mi unidad\Respaldos_Cerrajeria",
            "$root\My Drive\Respaldos_Cerrajeria"
        )
        foreach ($dDir in $driveDirs) {
            if (Test-Path $dDir) {
                $driveFiles = Get-ChildItem -Path $dDir -Filter "*.dump" -ErrorAction SilentlyContinue | ForEach-Object {
                    [PSCustomObject]@{
                        Name = $_.Name
                        FullName = $_.FullName
                        Length = $_.Length
                        LastWriteTime = $_.LastWriteTime
                        Source = "Google Drive"
                    }
                }
                if ($driveFiles) { $allFiles += $driveFiles }
            }
        }
    }
    
    # Ordenar y desduplicar por nombre (preferir local si existen en ambos)
    $uniqueFiles = $allFiles | Group-Object Name | ForEach-Object {
        $loc = $_.Group | Where-Object { $_.Source -eq "Local" } | Select-Object -First 1
        if ($loc) { $loc } else { $_.Group | Select-Object -First 1 }
    } | Sort-Object LastWriteTime -Descending

    if (-not $uniqueFiles -or $uniqueFiles.Count -eq 0) {
        Write-Info "No se encontraron archivos de respaldo (.dump) en local ni en Google Drive." "Red"
        exit 1
    }

    Write-Host "`nRespaldos disponibles:" -ForegroundColor White
    for ($i = 0; $i -lt $uniqueFiles.Count; $i++) {
        $item = $uniqueFiles[$i]
        $sizeMB = [math]::Round($item.Length / 1MB, 2)
        $dateStr = $item.LastWriteTime.ToString("yyyy-MM-dd HH:mm:ss")
        $num = $i + 1
        Write-Host "  [$num] $($item.Name)  ($sizeMB MB) - $dateStr [$($item.Source)]" -ForegroundColor Green
    }

    Write-Host "`nPresione [ENTER] para restaurar el mas reciente (#1) o ingrese el numero deseado:" -ForegroundColor Yellow
    $selection = Read-Host "Opcion"
    if ([string]::IsNullOrWhiteSpace($selection)) {
        $index = 0
    } else {
        $index = [int]$selection - 1
    }

    if ($index -lt 0 -or $index -ge $uniqueFiles.Count) {
        Write-Info "Seleccion invalida. Operacion cancelada." "Red"
        exit 1
    }

    $targetItem = $uniqueFiles[$index]
    $SelectedFile = $targetItem.FullName

    # Si esta solo en Google Drive, copiarlo a la carpeta local primero
    if ($targetItem.Source -eq "Google Drive") {
        $localDest = Join-Path $ScriptDir $targetItem.Name
        Write-Info "Descargando copia desde Google Drive a la carpeta local..." "Cyan"
        Copy-Item -Path $targetItem.FullName -Destination $localDest -Force
        $SelectedFile = $localDest
    }
}

if (-not (Test-Path $SelectedFile)) {
    Write-Info "El archivo seleccionado no existe: $SelectedFile" "Red"
    exit 1
}

# 4. Confirmacion de seguridad
Write-Host "`n------------------------------------------------------------------" -ForegroundColor Red
Write-Host "ADVERTENCIA CRITICA!" -ForegroundColor Red
Write-Host "Esta accion restaurara la base de datos '$DbName' usando:" -ForegroundColor White
Write-Host "Archivo: $SelectedFile" -ForegroundColor Yellow
Write-Host "Las tablas actuales seran sobreescritas con los datos del respaldo." -ForegroundColor White
Write-Host "------------------------------------------------------------------" -ForegroundColor Red

$confirm = Read-Host "Escriba 'SI' en mayusculas para confirmar la restauracion"
if ($confirm.Trim() -ne "SI") {
    Write-Info "Operacion cancelada por el usuario. No se modifico la base de datos." "Yellow"
    exit 0
}

# 5. Ejecutar pg_restore
Write-Info "Iniciando restauracion en base de datos '$DbName'..." "Cyan"
$env:PGPASSWORD = $DbPass

try {
    # 5.1 Verificar si la base de datos existe; si no, crearla automaticamente
    $psqlPath = Join-Path (Split-Path -Parent $PgRestorePath) "psql.exe"
    if (Test-Path $psqlPath) {
        $checkDb = & $psqlPath -h $DbHost -p $DbPort -U $DbUser -d postgres -t -c "SELECT 1 FROM pg_database WHERE datname = '$DbName';" 2>$null
        if (-not $checkDb -or $checkDb.Trim() -ne "1") {
            Write-Info "La base de datos '$DbName' no existe todavia. Creandola automaticamente..." "Yellow"
            & $psqlPath -h $DbHost -p $DbPort -U $DbUser -d postgres -c "CREATE DATABASE $DbName;" 2>$null
            Write-Info "Base de datos '$DbName' creada exitosamente." "Green"
        }
    }
    $restoreArgs = @(
        "-h", $DbHost,
        "-p", $DbPort,
        "-U", $DbUser,
        "-d", $DbName,
        "--clean",
        "--if-exists",
        "-v",
        $SelectedFile
    )

    $proc = Start-Process -FilePath $PgRestorePath -ArgumentList $restoreArgs -NoNewWindow -Wait -PassThru
    
    if ($proc.ExitCode -eq 0 -or $proc.ExitCode -eq 1) {
        Write-Info "============================================================" "Green"
        Write-Info " RESTAURACION COMPLETADA CON EXITO!" "Green"
        Write-Info " La base de datos '$DbName' ha sido restaurada correctamente." "Green"
        Write-Info "============================================================" "Green"
    } else {
        throw "pg_restore finalizo con codigo de error inesperado: $($proc.ExitCode)"
    }
} catch {
    Write-Info "Error durante la restauracion: $_" "Red"
    exit 1
} finally {
    $env:PGPASSWORD = ""
}

