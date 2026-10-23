<#
.SINOPSIS
  Corre un escaneo de OWASP ZAP contra el bot y guarda el reporte en HTML.

.DESCRIPCION
  Por defecto hace el escaneo BASELINE, que es pasivo: ZAP navega el sitio y analiza las
  respuestas, sin atacar nada. Es seguro incluso contra produccion.

  Con -Completo hace el escaneo ACTIVO, que si manda ataques y ENVIA FORMULARIOS. En este
  bot los formularios escriben en las hojas de Google, mandan correos y contestan por
  WhatsApp, asi que el escaneo activo SOLO debe correrse contra el entorno local y con las
  hojas de prueba configuradas. Lee el README antes.

.EJEMPLOS
  .\escanear.ps1 -Objetivo "http://host.docker.internal:3001" -Nombre local
  .\escanear.ps1 -Objetivo "https://comanpackagrobot.com" -Nombre produccion
  .\escanear.ps1 -Objetivo "http://host.docker.internal:3001" -Nombre local-completo -Completo
#>
param(
  [Parameter(Mandatory = $true)][string]$Objetivo,
  [string]$Nombre = "escaneo",
  [switch]$Completo,
  [int]$MinutosMaximos = 10
)

$ErrorActionPreference = "Stop"
$aqui = Split-Path -Parent $MyInvocation.MyCommand.Path
$reportes = Join-Path $aqui "reportes"
New-Item -ItemType Directory -Force -Path $reportes | Out-Null

$fecha = Get-Date -Format "yyyy-MM-dd-HHmm"
$archivo = "$Nombre-$fecha.html"

# Freno de mano: el escaneo activo contra algo que no sea local se bloquea aqui mismo.
# Es deliberado -- la forma mas facil de hacer un desastre es teclear el comando completo
# con la direccion de produccion sin pensarlo.
if ($Completo -and $Objetivo -notmatch "host\.docker\.internal|localhost|127\.0\.0\.1") {
  Write-Host ""
  Write-Host "  BLOQUEADO: el escaneo completo es ACTIVO y este objetivo no es local." -ForegroundColor Red
  Write-Host "  Envia formularios de verdad: escribiria en las hojas del equipo, mandaria" -ForegroundColor Red
  Write-Host "  correos y gastaria cuota de WhatsApp y de la IA." -ForegroundColor Red
  Write-Host ""
  Write-Host "  Si de verdad lo necesitas contra produccion, lee el README: hay que poner la" -ForegroundColor Yellow
  Write-Host "  app en mantenimiento primero y asumir que las hojas quedaran sucias." -ForegroundColor Yellow
  Write-Host ""
  exit 1
}

$script = if ($Completo) { "zap-full-scan.py" } else { "zap-baseline.py" }
$tipo   = if ($Completo) { "COMPLETO (activo)" } else { "BASELINE (pasivo)" }

Write-Host ""
Write-Host "  Escaneo $tipo" -ForegroundColor Cyan
Write-Host "  Objetivo: $Objetivo"
Write-Host "  Reporte : seguridad\zap\reportes\$archivo"
Write-Host ""

# -r reporte HTML, -c reglas de ajuste, -m minutos de exploracion pasiva, -I no fallar por
# avisos (asi el comando no devuelve error solo porque haya hallazgos de nivel bajo).
docker run --rm `
  -v "${reportes}:/zap/wrk:rw" `
  -v "${aqui}\reglas.conf:/zap/wrk/reglas.conf:ro" `
  ghcr.io/zaproxy/zaproxy:stable `
  $script -t $Objetivo -r $archivo -c reglas.conf -m $MinutosMaximos -I

$ruta = Join-Path $reportes $archivo
if (Test-Path $ruta) {
  Write-Host ""
  Write-Host "  Listo. Abriendo el reporte..." -ForegroundColor Green
  Start-Process $ruta
} else {
  Write-Host ""
  Write-Host "  El escaneo termino pero no se genero el reporte. Revisa la salida de arriba." -ForegroundColor Yellow
}
