# Investigación y decisiones — 21 de octubre de 2026

## Referencia jugable

Se consultó el manual transcrito en [SWOS United, publicado por Playaveli](https://www.sensiblesoccer.de/forum?catid=94&id=2472&view=topic), especialmente controles y editor táctico. El [manual de Lemon Amiga solicitado](https://www.lemonamiga.com/doc/sensible-world-of-soccer/1416) devolvió HTTP 403. También se localizó el [manual original en PDF](https://files.swos.eu/manual/SWOS1.1/SWOS1.1manual.pdf), cuya descarga desde la herramienta de consulta agotó el tiempo.

Hallazgos del manual: ocho direcciones, selección automática del jugador próximo, toque corto para pase dirigido y pulsación larga para potencia. El balón tiene independencia durante la conducción. Sin posesión, el botón inicia entrada o cabezazo si hay balón aéreo. El efecto se aplica inmediatamente después del golpeo: lateral para curva, dirección de ataque para reducir altura y contraria para elevar. Las posiciones tácticas dependen de la zona del balón.

Adaptación propia: WASD y espacio; Q añade cambio manual. Ventana de efecto de 0,30 s; potencia máxima a los 0,72 s. Formación 4-4-2 desplazada con el balón; uno o dos jugadores presionan, los demás cubren y ofrecen salidas. Los porteros son automáticos y tienen reacción y alcance limitados. El código y las constantes son originales; no se utilizó código ni recursos de SWOS.

Vídeos localizados: [partida Amiga 96/97](https://www.youtube.com/watch?v=Owr4BaDO2Lk) y [partida PC sin comentarios](https://www.youtube.com/watch?v=tNFOyF9bVt4). No se reproduce aquí una revisión fotograma a fotograma: la evidencia sobre controles procede del manual.

## Refinamiento: habilidad de control

El [manual original transcrito, sección BUY! SELL!](https://sensiblesoccer.de/forum/swos-related/2472-the-swos-manual) enumera Ball Control entre las habilidades individuales. Esto confirma que el control era un atributo del futbolista; el manual no aporta su fórmula numérica. La adaptación utiliza una escala propia de 0 a 1, con **0,95 para todos los jugadores de ambos equipos**, incluidos los porteros. No se presenta como una reproducción de los valores internos originales. Este atributo regula la frecuencia y longitud de los toques, corrección lateral, amortiguación al parar y primer contacto. El balón conserva posición y velocidad independientes.

## Búsqueda de arte

- **itch.io**: [8 Direction Walk Cycle, Ordinary Bumblebee](https://ordinary-bumblebee.itch.io/8-direction-walk-cycle). CC0 explícito en la página y en `License_CC0.txt` del ZIP. Descargado gratuitamente, sin pago. Se usa su base animada de ocho direcciones, con paleta de fútbol adaptada al cargar.
- **Kenney**: [Sports Pack](https://kenney.nl/assets/sports-pack), CC0; contrastado con su [publicación del autor en OpenGameArt](https://opengameart.org/content/sports-pack-350). Descargado. Se usa `ball_soccer4.png`; el paquete no aporta las animaciones de fútbol necesarias.
- **OpenGameArt**: [football players, looneybits](https://opengameart.org/content/football-players) y [32-pixel Human Sprites, cyanowl](https://opengameart.org/content/32-pixel-human-sprites), ambos CC0. Descargados para evaluación; no usados en el juego.
- [2D Soccer, DavideVitali](https://davidevitali.itch.io/2d-soccer): licencia comercial no explícita en la página consultada; descartado.
- [Goals in Pixels, Josee](https://n3cloud.itch.io/goals-in-pixels): recurso de pago; descartado.

Se conserva una sola base para todos los personajes. No se ha encontrado en esta selección gratuita un paquete completo de fútbol con ocho direcciones y todas las acciones especializadas. La carrera es animación de sprites real; patadas, entradas, cabezazos y estiradas usan poses y transformaciones de esos sprites. Este es un límite gráfico de esta primera versión.
