# Cápsula del tiempo · Expediente clasificado

Se abre el **8 de noviembre de 2026, 00:00 (hora Colombia)**. HTML + CSS + JS vanilla, funciones serverless en `/api`.

## Editar contenido
- **Preguntas, textos, carta final:** `public/js/config.js`
- **Respuestas correctas + notita al acertar:** `api/_answers.js` (solo vive en el servidor)
- **GIF del regalo:** `public/assets/regalo.gif` (si no existe, se muestra un regalo dibujado)

## Probar en local (PowerShell)
```powershell
npm run dev                                              # cápsula sellada
$env:UNLOCK_AT="2020-01-01T00:00:00Z"; npm run dev       # cápsula ya abierta
Remove-Item Env:UNLOCK_AT                                # volver a la normalidad
```
Abre http://localhost:3000. Agrega `?reiniciar` a la URL para borrar el progreso.

## Desplegar
```powershell
npx vercel        # preview
npx vercel --prod
```
Opcional: variable de entorno `UNLOCK_AT` en Vercel para cambiar la fecha sin tocar código.
