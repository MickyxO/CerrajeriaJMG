' ========================================================
' CERRAJERÍA JMG - ARRANQUE SILENCIOSO DE PRODUCCIÓN
' Inicia el backend y el frontend en segundo plano
' sin mostrar ninguna ventana de consola negra.
' ========================================================

Set WshShell = CreateObject("WScript.Shell")
Set fso = CreateObject("Scripting.FileSystemObject")

' Obtener la carpeta raíz del proyecto (un nivel arriba de /scripts)
strScriptDir = fso.GetParentFolderName(WScript.ScriptFullName)
strProjectRoot = fso.GetParentFolderName(strScriptDir)

' 1. Iniciar Servidor Backend (Puerto 3000)
WshShell.CurrentDirectory = strProjectRoot & "\backend"
WshShell.Run "cmd /c node src/index.js", 0, False

' 2. Iniciar Interfaz Frontend (Puerto 5173 en 0.0.0.0)
WshShell.CurrentDirectory = strProjectRoot & "\frontend"
WshShell.Run "cmd /c npx vite preview --host 0.0.0.0 --port 5173", 0, False

' 3. Esperar 3 segundos para que los servidores levanten y abrir navegador en el POS
WScript.Sleep 3000
WshShell.Run "http://localhost:5173/pos"

