# Publicar SoccerPasion en GitHub Pages

Repositorio previsto: `https://github.com/darecagames/soccerpasion` (publico).
URL prevista del juego: `https://darecagames.com/soccerpasion/`.

Estado inicial: archivos y workflow preparados localmente. Esta documentacion no confirma que el repositorio remoto exista ni que el juego ya este publicado.

La landing pertenece al repositorio separado `darecagames.github.io`, cuyo CNAME es `darecagames.com`. Este proyecto hereda ese dominio al publicar Pages bajo la misma cuenta, sin CNAME propio y sin tocar la landing o DNS.

## Primera publicacion

1. Autenticar GitHub en el equipo, con la cuenta `darecagames`.
2. Crear el repositorio publico `soccerpasion`, sin README inicial si se sube el historial local.
3. Subir la rama `main` a ese repositorio.
4. En el repositorio del juego, activar Settings > Pages > Source > GitHub Actions. Tambien puede configurarse por la API de GitHub con `build_type: workflow`.
5. Ejecutar el workflow `Publicar SoccerPasion`, o reintentar la primera ejecucion si se activo Pages despues del primer push.
6. Esperar al exito de los trabajos build y deploy, y comprobar el enlace y sus recursos.

No se necesita una clave de despliegue ni guardar un token en el repositorio: Actions usa su GITHUB_TOKEN efimero para Pages. La sesion local de GitHub se almacena en el gestor de credenciales, nunca en archivos del proyecto.

## Actualizaciones

Los pushes a `main` ejecutan comprobacion de TypeScript, pruebas y compilacion. Solo se publica si todos esos pasos pasan. Se aloja exclusivamente `dist`, sin dependencias de desarrollo ni archivos fuente de evaluacion.

## Comprobar la compilacion para una subruta

```powershell
npm.cmd run typecheck
npm.cmd test
npm.cmd run build-nolog -- --base=/soccerpasion/
```

El prefijo de compilacion permite que JavaScript y CSS carguen desde la subruta correcta. Los sprites y el balon se cargan con rutas relativas. No anadir un CNAME al juego: esta publicacion usa la ruta del dominio existente.

Fuentes oficiales:
- https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages
- https://docs.github.com/en/pages/configuring-a-custom-domain-for-your-github-pages-site/about-custom-domains-and-github-pages
