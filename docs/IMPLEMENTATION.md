# Primera versión jugable

## Arquitectura

- `config/tuning.ts`: campo, velocidad, potencia, rozamiento, tiempos, IA y cámara.
- `simulation/Player.ts`: futbolistas, formación, aceleración, orientación, entrada y recuperación.
- `simulation/Ball.ts`: posición y velocidad independientes, altura, gravedad, rebote y efecto.
- `simulation/AI.ts`: formación dinámica, presión limitada, cobertura, conducción, selección de pase, tiro y porteros.
- `simulation/Match.ts`: contactos, selección automática, colisiones, saques, goles, periodos y resultado.
- `systems/KeyboardControls.ts`: teclado y conservación de pulsaciones cortas entre frames.
- `systems/ActionCamera.ts`: seguimiento suave con anticipación.
- `systems/Audio.ts`: efectos sintetizados.
- `render/`: recursos, paletas de equipación, estadio, animación, HUD y radar.
- `scenes/`: carga → menú → partido → resultado.

Phaser 4.0.0 estaba ya instalado. Se conserva Vite y TypeScript existentes, sin añadir frameworks ni dependencias. La simulación no depende de Phaser y se prueba en Node.

## Física y reglas

Ritmo reducido: carrera de 248 a 200 px/s, entrada de 415 a 335, desplazamiento de portero de 195 a 160 y estirada de 430 a 350. Se conserva la aceleración para responder enseguida al teclado. La física del balón y el reloj no se ralentizan. El umbral del toque de conducción a máxima carrera es relativo a la velocidad configurada, para conservar el ajuste del control.

Paso fijo de 1/120 s con acumulador; cada frame admite como máximo 0,1 s para evitar saltos enormes al recuperar foco. Conducción por impulsos separados: no se fija la posición del balón a los pies. Un portero que bloca sí lo sostiene durante un breve periodo antes del saque. Las colisiones de jugadores y balón usan radios físicos invisibles; los jugadores visibles son sprites.

Balón que cruza completamente una línea: banda, córner, puerta o gol según borde, último contacto y altura. Se interpola el cruce para comprobar goles y se consideran postes y larguero. Los saques aceptan espacio y orientación; hay respaldo automático a los cinco segundos para el usuario y 1,3 segundos para el rival. Celebración de 2,8 s, descanso de 4,5 s y cambio real de dirección de ataque.

Reloj de 90 minutos acelerado; se detiene en reanudaciones, goles, descanso y pausa. Menú con una única opción START; duración de cuatro minutos efectivos, ajustable desde configuración. Movimiento y aftertouch con flechas. Pérdida de foco pausa el partido y cancela carga pendiente.

Selección en defensa: candidato a un máximo de 70 píxeles reales del balón, defensor controlado a más de 140 y ventaja mínima de 90 para el candidato. No se cambia durante una entrada o recuperación y hay un segundo de estabilidad tras cambiar. Defensa se identifica por posesión rival o último toque rival si el balón está libre. Q sigue siendo libre y la selección en ataque conserva la lógica anterior. Constantes en `TUNING.selection`.

## Refinamiento del control humano y de balón

La posesión de un futbolista de campo del equipo humano tiene prioridad sobre el temporizador de selección, el bloqueo defensivo, la carga anterior, el aftertouch y el receptor previsto de un pase. Se comprueba antes de que actúe la IA y de nuevo tras las colisiones para entregar una recepción en el mismo paso. La nueva intención de movimiento procede del teclado; el antiguo jugador vuelve a la IA. Se descarta al pasador mientras dura la exclusión física tras golpear, evitando recuperar el control del pasador inmediatamente. Un compañero cercano al poseedor no puede decidir pases o tiros por él. Los porteros conservan su gestión automática.

`TUNING.player.ballControl = 0.95` inicializa la misma habilidad para los 22 jugadores, en escala propia 0–1. El control alto acorta los toques cuando el balón se adelanta, facilita recentrarlo al girar y amortigua la recepción y la frenada. Estas acciones cambian velocidades mediante contactos, nunca fijan la posición del balón al pie. Las pruebas comprueban posesión durante bloqueos, contacto aéreo descendente, pasador, IA de apoyo, conducción continua, frenada y efecto de la estadística en la recepción.

## Límites conocidos

Refinamiento de conducción prolongada: control común 0,95, alcance de contacto de 42 píxeles, intervalo base de toque de 0,12 s e impulso de conducción reducido al 70 %. Al girar, los contactos con el balón que ya llevaba el jugador se resuelven con velocidad tangencial alrededor del pie, manteniendo la colisión física sin frenarlo como una recepción nueva. No hay límite de tiempo artificial de posesión ni fijación de posición. La prueba de conducción recorre cuatro vueltas con cambios de dirección durante 12,8 s y comprueba distancia al pie, control del futbolista y frenada final.

- Sin fuera de juego, faltas, tarjetas, penaltis ni sustituciones. Las entradas no generan faltas.
- Saques simplificados: se reubica al ejecutor; saque de banda mediante trayectoria aérea, sin animación de manos. No hay animación dedicada de recogida de balón.
- Carrera en ocho direcciones real; las acciones especiales reutilizan poses transformadas, no hojas especializadas. Arte base adaptado, no un paquete de futbolistas dibujado expresamente para este juego.
- IA heurística, dificultad única inicial. Mantiene roles y toma decisiones, pero requiere pruebas humanas para equilibrar presión, oportunidades y efectividad de porteros. Las simulaciones cortas pueden acabar sin goles.
- No hay repeticiones, guardado ni multijugador. El marcador admite empate.
- El balón rota sobre una textura: no es una secuencia dedicada de fotogramas de esfera.
- Objetivo de 60 FPS; no se afirma una medición sostenida de rendimiento. La inspección del navegador confirmó la presentación y los sprites; la prueba de teclado y la valoración jugable corresponden al usuario por petición expresa. No se volvió a tomar control de su PC.

## Verificación automatizada

Se añade `tests/keyboard.cjs`: utiliza las clases Key reales de Phaser y recorre dos flechas más espacio o X hasta la simulación de golpeo, en las cuatro diagonales. Comprueba carga, liberación, pulsación corta y solapamiento de las dos teclas de acción. Esto verifica los eventos que recibe el juego; no demuestra que un teclado físico concreto envíe todas las combinaciones. X es una alternativa a espacio y la etiqueta de acción se ilumina al registrarla. La limitación física de ciertas combinaciones está documentada por [Microsoft](https://news.microsoft.com/source/2010/02/01/ghost-buster-microsofts-sidewinder-x4-keyboard-debuts-advanced-anti-ghosting-technology/); sigue siendo una hipótesis para el caso del usuario.

Refinamiento diagonal: el golpeo lee la dirección de entrada antes del movimiento, evitando utilizar la orientación del paso anterior. La ayuda del pase humano está limitada a ±22,5°; sin receptor válido, se conserva exactamente la dirección de entrada. En los saques manuales se aplica ese mismo criterio. Mantener la dirección original no aplica aftertouch involuntario: el efecto requiere cambiar las flechas después del golpeo. Se prueban pases y tiros en las cuatro diagonales, asistencia de pase, saques manuales y efecto posterior.

`npm.cmd test` compila únicamente la simulación y prueba: equipos, velocidad diagonal, fricción, botes, pase corto, carga y potencia, aftertouch en ambos sentidos de ataque, goles válidos y balones altos, saque correcto por último contacto, postes, colisiones a máxima velocidad, entrada, blocaje y liberación del portero. Simula además tres partidos completos con semillas reproducibles, comprobando final, descanso, cambio de campo y valores finitos.

Las pruebas no sustituyen una partida humana ni demuestran por sí solas equivalencia de sensaciones con SWOS.
