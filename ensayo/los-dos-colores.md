<!-- SPDX-License-Identifier: CC-BY-4.0 -->
# Los dos colores

*Por qué una comprobación no vale nada hasta que se la ha visto fallar, y fallar por su causa.*

Samy Haggag · 2026 · [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/)

---

## 1. La regla, en una frase

> **Una comprobación solo merece confianza cuando se la ha visto de los dos colores: en verde sobre código que está bien de verdad, en rojo sobre código roto, y en ese rojo cayendo por el fallo que dice vigilar y nombrándolo.**

Son tres cláusulas, y cada una tapa un agujero distinto.

- **Verde sobre lo que está bien de verdad.** No sobre un texto que la comprobación se inventa, ni sobre una copia antigua del código, ni sobre una lista vacía. Un verde obtenido con datos que la propia comprobación se ha fabricado no dice nada del código.
- **Rojo sobre lo roto.** Que una comprobación no se haya puesto nunca en rojo no prueba que sepa hacerlo. Hay que provocarle, en una copia, el fallo que dice detectar, y mirar si lo detecta.
- **Por su causa, y nombrándola.** Si cae por otro motivo —falta una dependencia, el puerto está ocupado, no existe un fichero—, ese rojo es de otra cosa y no cuenta. Y un rojo que no explica por qué acostumbra a quien lo ve a pasarlo por alto.

## 2. Por qué hace falta

El verde no afirma nada: es que no ha salido rojo. Mientras el código esté bien, una comprobación rota y una sana imprimen lo mismo. Se distinguen el día que el código se rompe, y ese día la rota sigue en verde.

Por eso nadie ve lo que cuesta un verde que miente. No aparece en ningún informe. Aparece semanas después, como un fallo que «las pruebas no vieron», y casi nunca se vuelve atrás a buscar qué prueba lo dejó pasar.

El rojo que miente cuesta lo contrario, y lo mismo. La primera vez que una batería se pone roja sin que haya un defecto, alguien lo investiga. La segunda, alguien reconoce el patrón y lo despacha sin mirar. A la tercera la batería ya no avisa de nada, aunque siga ejecutándose cada noche.

Si nunca puede ponerse en rojo, no avisa de nada. Si se pone en rojo por cualquier cosa, tampoco.

## 3. El tercer resultado: NO MIRADO

Entre el verde y el rojo hay un tercer resultado: la comprobación no llegó a mirar. Le faltaba una clave, el servicio no contestó, la muestra se cortó a medias. No ha dicho «bien»; ha dicho «no he podido». Los formatos de prueba lo conocen —TAP lo escribe como una directiva `# SKIP` con su motivo, y Mocha puede tratar las pruebas pendientes como fallo con `--forbid-pending`—, pero en los resúmenes se pierde con facilidad: si el salto se cuenta en prosa en mitad de la salida («(se omite: no hay navegador)») y la última línea dice «todo en verde», lo que se queda es el verde.

Tres reglas para que no se pierda:

1. **Una línea con formato fijo, al principio de la línea, que una máquina sepa contar.** Aquí es `PARCIAL: <motivo>`. Sin sangría, sin iconos delante y sin variantes: `  ⚠ PARCIAL:` o `[parcial] -` no los cuenta el mismo lector.
2. **Un lector estricto.** `^PARCIAL:[ \t]*(\S.*)$`, multilínea. Tiene dos trampas. Con `\s*` en lugar de `[ \t]*`, un `PARCIAL:` sin motivo se traga el salto de línea y toma la línea siguiente como motivo. Con `(.+)` en lugar de `(\S.*)`, un motivo hecho solo de espacios cuenta como motivo. El [ejemplo 3](../ejemplos/03-tres-estados.mjs) enseña las dos: con `\s*`, el motivo leído es «ok totales».
3. **Los números los ponen contadores.** Un «0 fallos · 0 saltos» escrito como texto fijo detrás de dos marcas de «bien» no es un recuento. Dice lo que su autor esperaba.

Y una política: **en la integración continua un salto cuenta como rojo; en local, como PARCIAL.** En el repositorio que acompaña a este texto lo decide la variable `DOS_COLORES_SIN_SALTOS=1`. Hay una sola excepción, y lleva su motivo escrito al lado: la lista privada de términos de la limpieza, que por diseño no viaja con el código y en la integración continua nunca existe.

## 4. El catálogo

Diecinueve formas en que una comprobación miente, en cuatro familias. Cada una con su síntoma, un caso contado sobre una tienda de juguete —vende cuadernos: pedidos, líneas, impuesto, envío, correo de confirmación y una cola de envíos, y tiene su batería, su conductor y su servidor de pruebas—, la guarda que la tapa y la pregunta que la caza. Los casos son reales en su forma; la tienda y sus números son inventados.

### Verdes que no miden

**1. El ancla perdida.**
- *Síntoma:* una comprobación negativa («esto no aparece aquí») sigue en verde después de un cambio de nombres.
- *En la tienda:* la guarda «el importe de una línea no suma el envío» saca el cuerpo de `importeLinea` con `slice(indexOf(...))`. Alguien renombra la función: `indexOf` da −1, el trozo sale vacío, y en un trozo vacío no aparece el envío.
- *Guarda:* recortar con funciones que se niegan a seguir si el ancla falta (`desde`, `entre`, `cerca`) y buscar con la regla de lint las formas que queden.
- *Pregunta:* si el ancla desapareciera, ¿qué estaría mirando?

**2. La verdad vacía**, en seis variantes: `every` sobre una lista vacía, un estado que siembra la propia prueba, un estado que dejó la prueba anterior, una tautología, una lista de excepciones que se quedó a cero y una revisión que no tuvo revisores.
- *Síntoma:* un «todos cumplen» sobre nadie.
- *En la tienda:* «los correos de confirmación tienen asuntos distintos», comprobado con la cola vacía. «Ningún pedido sin correo llega a la cola», comprobado sobre una cola que la prueba llenó ella misma con pedidos que ya traían correo.
- *Guarda:* exigir antes la población («hay al menos dos correos») y sembrar el estado dentro de cada caso, a la vista, incluido el caso que tiene que ser rechazado.
- *Pregunta:* si el código no hiciera nada, ¿seguiría en verde?

**3. La copia congelada.**
- *Síntoma:* muchos verdes sobre un código que ya no existe.
- *En la tienda:* la batería prueba una carpeta generada a partir del código hace meses, que nadie regenera; el código de verdad ha cambiado varias veces desde entonces.
- *Guarda:* medir el original, o regenerar la copia en cada ejecución y comprobar de qué versión sale.
- *Pregunta:* ¿de cuándo es lo que estoy midiendo?

**4. Mira donde no vive el hecho.**
- *Síntoma:* verde porque el sitio que se mira está vacío o es otro.
- *En la tienda:* «la cola de envíos está activa», comprobado leyendo un registro de eventos en el que nadie escribe. Un sondeo por TCP a un servicio de avisos que escucha por UDP. Un listado de pedidos hecho con una credencial que no puede leerlos y devuelve `[]`.
- *Guarda:* un control positivo —algo que tiene que salir, y sale— antes de creerse un «no hay nada»; probar el comportamiento, no una señal indirecta.
- *Pregunta:* ¿qué cambio real lo pondría en rojo?

**5. El número tranquilizador.**
- *Síntoma:* un cero que nadie ha contado.
- *En la tienda:* el guion que cuenta los accesos a `lineas[` hace `grep -c "lineas["`. El corchete sin cerrar es una expresión regular inválida: `grep` no cuenta nada, escribe un error y sale con 2. Con el error tirado a `/dev/null`, el recuento es una cadena vacía, y `[ "$n" -gt 0 ] || echo limpio` imprime «limpio» (en zsh, además, `[ "" -eq 0 ]` es verdadero; en bash y en sh es un error). Otras variantes: `… | head; echo $?` devuelve cómo le fue a `head`, y el programa de delante puede haber fallado; contar los ficheros de una carpeta en la que otro proceso sigue escribiendo; contar dos veces lo que la salida repite.
- *Guarda:* que mande el recuento y el código de salida de la herramienta, no los de un filtro puesto encima (`set -o pipefail`, `grep -F` para buscar texto literal).
- *Pregunta:* ¿ese número lo ha contado alguien, o es lo que queda cuando nada cuenta?

**6. Mide menos de lo que promete.**
- *Síntoma:* un censo dice «todo cubierto» y solo reconoce parte de las formas reales.
- *En la tienda:* el censo de «cada importe pasa por `redondear`» busca `redondear(` y sale en verde; los sitios que redondean con `toFixed(2)` no los ve. El censo de textos del correo reconoce las cadenas sueltas y no ve el asunto, que se arma con un ternario (`n === 1 ? "cuaderno" : "cuadernos"`).
- *Guarda:* comprobar el patrón con todas las variantes que aparecen en el código de verdad, y con ejemplos que no debe aceptar.
- *Pregunta:* ¿de cuántas maneras distintas está escrito esto en el código?

**7. Los dos colores sin distinguir, y dos rutas con una salida.**
- *Síntoma:* la guarda cambia de color, pero no según lo que dice vigilar.
- *En la tienda:* hay cuatro errores de envío (sin correo, dirección incompleta, peso excesivo, destino sin servicio) y la guarda exige que existan los cuatro; si los cuatro devolvieran el mismo texto, pasaría igual. El cálculo del envío tiene una tarifa nueva y otra de reserva; la prueba mira el importe, que coincide en las dos, y no sabe cuál respondió.
- *Guarda:* un caso que exija textos distintos; que la salida diga qué ruta se tomó.
- *Pregunta:* si fallara la ruta nueva y respondiera la de reserva, ¿lo notaría?

### Rojos que mienten

**8. El rojo por otra causa.**
- *Síntoma:* un rojo que se «arregla» sin tocar el código.
- *En la tienda:* dos baterías lanzadas a la vez contra el mismo servidor de pruebas se quitan el puerto. La batería lanzada desde otra carpeta da una ristra de rojos, porque sus rutas son relativas a la carpeta desde la que se lanza y no al fichero de cada prueba. El conductor, cuando recibe la orden de parar, termina con código 1 y se cuenta como fallo de las pruebas.
- *Guarda:* resolver las rutas a partir del fichero de la prueba; turno para los recursos compartidos; que el conductor distinga «me pararon» de «algo falló».
- *Pregunta:* ¿cae por lo que dice vigilar?

**9. La que nunca puede dar verde.**
- *Síntoma:* rojo siempre, pase lo que pase.
- *En la tienda:* la guarda compara la huella de la portada servida con la del fichero subido, pero entre la tienda y el visitante hay un intermediario que reescribe parte del HTML en cada respuesta: si se pide la página dos veces seguidas, las huellas ya no coinciden entre sí. Otra pide una dirección antigua que contesta con una redirección, y compara la redirección con la página.
- *Guarda:* comparar antes del intermediario, donde los bytes son los que se subieron; comprobar primero «200 y HTML».
- *Pregunta:* ¿la he visto en verde alguna vez?

**10. El `||` de una sola rama.**
- *Síntoma:* una condición con dos motivos que en la práctica decide con uno.
- *En la tienda:* la cola decide reintentar un envío con `r.reintentable || r.estado >= 500`. La transportista nunca manda `reintentable`, así que decide siempre la segunda mitad: un 429 («demasiadas peticiones») no se reintenta, y la prueba del reintento, escrita con un 503, sale verde.
- *Guarda:* probar cada rama sola, con la otra en falso; decidir con el dato que de verdad llega.
- *Pregunta:* ¿he visto a cada rama decidir sola?

**11. El error adivinado.**
- *Síntoma:* un rojo que nunca dice su causa, o una rama que nunca se ejecuta.
- *En la tienda:* la guarda del alta de envíos clasifica los fallos buscando «dirección no válida» en la salida de error. Nadie había visto el error real, que llega en inglés y en el cuerpo de la respuesta. La guarda no lo reconoce nunca: marca cada fallo como «error desconocido», y el reintento que dependía de esa clasificación no se prueba jamás.
- *Guarda:* imprimir el dato crudo y mirarlo antes de escribir el patrón.
- *Pregunta:* ¿he visto el texto contra el que estoy comparando?

### Grises que se leen como verde

**12. El salto dicho en prosa.**
- *Síntoma:* un verde que incluye lo que no se ejecutó.
- *En la tienda:* las pruebas que dibujan el correo de confirmación necesitan un navegador. Sin él, escriben «(se omite: no hay navegador)» en mitad de la salida, y el resumen final dice «todo en verde».
- *Guarda:* una línea de formato fijo, y un censo que encuentre en el código de las pruebas cada salto y exija que la escriba.
- *Pregunta:* ¿lo contará una máquina?

**13. El tope o la muestra sin declarar.**
- *Síntoma:* un «nada grave» que solo cubre lo que dio tiempo a mirar.
- *En la tienda:* una revisión automática de los cambios se queda sin presupuesto a mitad de la lista. Lo que no llegó a mirar sale como «descartado», junto a lo que sí miró y descartó, y el informe dice «sin hallazgos». El fallo que importaba estaba en la parte sin mirar.
- *Guarda:* tres casillas, no dos: confirmado, descartado y sin veredicto. Y el tope, escrito en el informe.
- *Pregunta:* ¿qué dejé fuera, y lo he dicho?

**14. El marcador escrito a mano.**
- *Síntoma:* un resumen que dice lo que su autor esperaba.
- *En la tienda:* el guion de comprobación imprime «0 fallos · 0 saltos» como texto fijo después de dos marcas de «bien», aunque una de las comprobaciones de en medio no se ejecutó.
- *Guarda:* que el recuento salga de contadores.
- *Pregunta:* ¿de dónde sale este número?

### Sabotajes y avales que mienten

**15. El sabotaje que no se aplica.**
- *Síntoma:* «la guarda no cae» (o «cae») sobre algo que nadie ha roto.
- *En la tienda:* el sabotaje sustituye `calcularEnvio(pedido)` por una versión rota. Alguien añade el parámetro `zona`; `replace` ya no encuentra el texto, devuelve el original sin error, y la guarda se ejecuta sobre el código intacto.
- *Guarda:* un `romper()` que se niega si el texto a sustituir no aparece exactamente una vez o si el resultado es igual al original.
- *Pregunta:* ¿cambió el texto?

**16. La red dentro del guion.**
- *Síntoma:* un fichero roto en el árbol y un informe que dice «original intacto».
- *En la tienda:* el guion de sabotaje rompe `pedido.mjs` en su sitio, ejecuta la batería, restaura el fichero y, al final, compara su huella con la de antes: «idéntico». Pero si el guion muere a mitad, ni restaura ni compara, y el sabotaje se queda en el árbol, a la vista de cualquiera que suba el código en ese momento. Y un sabotaje que se da por «cazado» porque la batería reventó al cargar una dependencia que faltaba.
- *Guarda:* sabotear en copias; que compruebe el original alguien de fuera (`git diff --exit-code` al final de la integración continua); mirar el código de salida y la causa de cada rojo.
- *Pregunta:* ¿quién comprueba al que comprueba?

**17. El aval caducado.**
- *Síntoma:* un verde que avala un código que ya no es el que hay.
- *En la tienda:* un «todo en verde» que se enseña horas después, cuando el fichero ya se había reescrito entre medias.
- *Guarda:* un sello con la huella exacta del código medido, que se compara antes de dar el verde por bueno.
- *Pregunta:* ¿este verde es de este árbol?

**18. «Compila», pero le falta un trozo.**
- *Síntoma:* compila, luego «está bien».
- *En la tienda:* las funciones de envío se sacan a su propio módulo con un corte hecho contando llaves. El módulo nuevo compila y exporta casi todo; dos funciones se han quedado fuera, y nadie lo nota hasta que se llaman.
- *Guarda:* cortar entre dos anclas, y escribir antes cuánto se espera mover (líneas, funciones exportadas) para compararlo después.
- *Pregunta:* ¿cuánto esperaba cambiar, y cuánto cambió?

**19. La media línea.**
- *Síntoma:* una conclusión sacada de un texto cortado.
- *En la tienda:* el conductor recorta cada línea a 40 caracteres. «pedido 7: sin correo, no se encola (lo provoca la prueba, es lo esperado)» llega como «pedido 7: sin correo, no se encola (lo p…», y quien lo lee lo toma por un fallo de la tienda que hay que arreglar.
- *Guarda:* no recortar las líneas de veredicto; si hay que recortar, marcarlo («…») y no sacar conclusiones sin la línea completa.
- *Pregunta:* ¿he leído la línea entera?

Dos formas merecen una nota aparte, porque son las que el código del repositorio ataca directamente.

**El ancla perdida (1)** es la más barata de cometer y la más difícil de ver. JavaScript no protesta cuando `indexOf` devuelve −1: `t.slice(-1)` da el último carácter, `t.substring(-1)` da el texto entero, `xs.splice(xs.indexOf(x), 1)` borra el último elemento, y una ventana `t.slice(i - 500, i + 500)` da el texto entero si mide 499 caracteres o menos, el texto sin sus últimos caracteres con 500 o 501, un trozo del medio —sin el principio ni el final— entre 502 y 999, y nada desde 1.000. Ninguna de esas cosas es un error, y todas dejan pasar una comprobación negativa. El paquete `ancla` convierte el ancla ausente en el fallo, con un mensaje que nombra quién buscaba y qué; la regla `ancla/no-unchecked-slice` señala las formas directas que queden en el código. El [ejemplo 1](../ejemplos/01-ancla-perdida.mjs) enseña las cuatro fases: verde bueno, rojo bueno, verde mentiroso tras el cambio de nombre, y rojo con nombre.

**El sabotaje que no se aplica (15)** es el ancla perdida dentro de la propia prueba. `String.prototype.replace` con un patrón que no está devuelve el texto sin cambios y sin error. Y tiene otra trampa: el texto de sustitución no se escribe tal cual, porque `replace` interpreta `$&`, `` $` ``, `$'`, `$1` y `$$`. Lo que se escribe no es lo que se quería, y con `$&` a secas el original queda como estaba aunque el patrón sí esté. Por eso `romper()` sustituye por posición y se niega a trabajar si el texto no aparece exactamente una vez.

## 5. Cómo sabotear

Sabotear es provocar a propósito el fallo que una guarda dice vigilar, para verla ponerse roja. Mal hecho, el sabotaje miente tanto como la guarda. Siete reglas:

1. **En copia, nunca en su sitio.** El original no se toca. Un sabotaje que se escapa al original acaba subido o comprometido; ya ha pasado.
2. **`romper()` se niega** si no encuentra el texto, si lo encuentra más de una vez o si el resultado es igual al original.
3. **Un control verde sobre la copia sin tocar.** Si la copia sin sabotear no pasa entera, lo que falla es copiar o cargar, no la guarda.
4. **Se exige el conjunto exacto de comprobaciones que caen, y la causa de cada una.** No basta con «cayó algo». Si cae la que tocaba pero por otro motivo, o caen de más, el sabotaje no ha demostrado lo que dice.
5. **De una en una.** Si una guarda vigila cuatro cosas, se rompen por separado: que caiga cuando se rompen las cuatro a la vez no dice cuál de ellas detecta.
6. **La red va fuera del guion.** Que el original sigue igual lo comprueba otro proceso, después: aquí, `git diff --exit-code` al final de cada trabajo de la integración continua, y el conductor de los ejemplos, que toma la huella de la carpeta antes y después de lanzar cada uno. Un guion que se comprueba a sí mismo solo sirve de aviso temprano.
7. **El censo.** Toda prueba tiene al menos un sabotaje que la ha visto caer. Una prueba nueva sin sabotaje es roja hasta que lo tenga.

El [ejemplo 2](../ejemplos/02-sabotaje-en-copia.mjs) lo hace sobre la tienda: control verde, un sabotaje que tumba exactamente una comprobación y dice por qué, y un sabotaje escrito para una versión antigua que `replace` aplica en silencio y `romper` rechaza. El ejemplo no escribe en el original, y no es él quien dice que sigue igual. El arnés completo de `ancla`, con 56 sabotajes —uno por cada comprobación del código que se puede romper sola— y visto él mismo de los dos colores, está en `packages/ancla/test/sabotajes.test.mjs`; el de la regla de lint, con 26, en `packages/eslint-plugin-ancla/test/sabotajes.test.cjs`.

## 6. Vecinos, con honradez

Casi nada de esto es nuevo por separado, y conviene decir de dónde viene cada pieza.

- **Ver el rojo, y por el motivo esperado.** Mark Seemann, en su lista de comprobación de rojo-verde-refactorizar (2019), pide en la fase roja ejecutar la prueba, comprobar que falla, que falla por una aserción y que falla por la última aserción. Derick Bailey tituló en 2010 una entrada «Red for the right reason: fail by assertion, not by anything else». La skill de TDD de *superpowers* pide verificar el rojo: que la prueba falle en vez de dar error, que el mensaje sea el esperado y que falle porque falta la funcionalidad, no por una errata. Su guía `writing-good-tests.md` pide además nombrar, antes de escribir la prueba, qué cambio del código debería tumbarla, y repasar mentalmente que cada mutación realista tumba al menos una. Un PR abierto en agosto de 2026 (#2196) lo lleva a las refactorizaciones de código que ya existe y no tiene guarda: mutar el código, ver el fallo esperado, restaurar y comprobar con `git diff --exit-code` que no queda nada.
- **El vecino más cercano.** *goodfellow* (PR #30, fusionado en septiembre de 2026) vuelve a ejecutar las pruebas nuevas contra la rama base y exige que allí caigan por una aserción; uno de sus veredictos, `WRONG_REASON`, marca el rojo que viene de un fallo que no es una aserción. En el código delicado pide romper adrede cada regla en una copia guardada —nunca descartando cambios con git— y anotar qué prueba cazó cada rotura. Añade una mutación automática limitada a las líneas cambiadas, en copias desechables y con un presupuesto que, si se agota, se informa como incompleto y no como aprobado. El propio proyecto reconoce su límite: un `OK` demuestra que en la base falló una aserción, no que fuera la que se pretendía.
- **Que la causa se vea.** Entre las Test Desiderata de Kent Beck está la propiedad *Specific*: «if a test fails, the cause of the failure should be obvious».
- **El tercer resultado.** TAP 14 define la directiva `# SKIP`, con su motivo, en la propia línea del resultado; el reportero TAP de `node --test`, que es el conductor de este repositorio, la escribe. Mocha tiene `--forbid-pending`, que convierte en fallo cualquier prueba pendiente, y `--fail-zero`, que falla si no se ha ejecutado ninguna.
- **Mutación.** Stryker, PIT, cargo-mutants o mutmut generan mutantes y cuentan cuántos «mata» la batería. En Stryker un mutante cuenta como muerto cuando falla al menos una prueba mientras está activo; el informe separa los tiempos agotados y los errores de ejecución, y puede guardar qué pruebas lo mataron (`killedBy`) y con qué mensaje (`statusReason`), pero la puntuación no pregunta si la prueba cayó por una aserción o por una excepción. Major sí clasifica cada muerte: aserción, excepción o tiempo agotado. Du, Palepu y Jones (ISSTA 2023) midieron qué hay detrás de esas muertes y encontraron que las caídas del programa —excepciones que ninguna aserción esperaba— aportan una parte sustancial, y que un mismo mutante puede tumbar pruebas por causas muy distintas. Descartes, sobre PIT, aplica mutación extrema —vacía los métodos que no devuelven nada y hace que los demás devuelvan una constante— para encontrar métodos «pseudoprobados»: cubiertos por las pruebas, pero sin que ninguna note que su lógica ha desaparecido.
- **Estático.** *vacutest* detecta sin ejecutar nada pruebas vacías o tautológicas: las que no afirman nada, comparan un valor consigo mismo o se tragan el error que debían comprobar. Apuesta por la precisión y acepta no verlo todo.
- **Excepciones que no se acumulan.** ESLint avisa por defecto de los comentarios `eslint-disable` que ya no silencian nada; con `reportUnusedDisableDirectives` en `"error"`, la excepción que sobra pone el lint en rojo. Eso evita que se acumulen excepciones muertas; no impide añadir una nueva, que queda para la revisión.
- **Leer el texto del código, con reservas.** *superpowers* («Behavior, not text») y *goodfellow* (en su principio «Test Behaviour Through the Real Entry Point, Not the Source Text») desaconsejan las pruebas que buscan texto en el código fuente, y con razón: demuestran que el texto está, no que el código funcione. `ancla` sirve para cuando no queda otra —configuración, plantillas, textos legales, reglas de estructura como «este módulo no importa aquel»—, y para que, si hay que recortar texto, el recorte no pueda mentir.
- **Una advertencia de nombre.** Canedo (2026) llama *oracle anchoring* al oráculo que saca su valor esperado del mismo sistema que juzga, y por eso no puede fallar. Distingue la expectativa anclada al estado, que sale de ese código, de la anclada a la especificación, que se compone con valores fijados fuera de él y es su remedio. El «ancla» de este texto es otra cosa: un trozo fijo del texto que tiene que estar, y cuya ausencia es el fallo.

**Qué añade esto.** Poco, y concreto. Ver el rojo por su motivo ya lo piden los vecinos, también sobre código que ya existe (#2196 de *superpowers*, las roturas adrede de *goodfellow*), y la mutación lo automatiza. Lo que este texto añade, hasta donde he mirado, es: exigir en cada sabotaje el **conjunto exacto** de comprobaciones que caen y la **causa** de cada una, y que un arnés lo compruebe; comprobar que el sabotaje **se aplicó** de verdad, porque una sustitución que no encuentra su texto no falla, sino que no hace nada; el catálogo de formas en que una comprobación miente, con la pregunta que caza cada una; y, para la forma más barata de cometer, una librería y una regla de lint. No conozco una regla de lint que mire el `slice(indexOf(...))`, pero no he buscado a fondo en los catálogos grandes (SonarJS, CodeQL, unicorn).

**Qué no añade.** No genera mutantes, no da una puntuación y no escala a miles de funciones: cada sabotaje lo escribe una persona que sabe qué debería caer. Es una herramienta de precisión, no de cobertura.

## 7. Cuándo NO compensa

- **Cuando se puede probar el comportamiento.** Una guarda que lee el texto del código demuestra que el texto está, no que funcione. Si hay una entrada que ejecutar y un efecto que observar, esa es la prueba, y el recorte por anclas sobra.
- **Un prototipo que se va a tirar.** Sabotear lo que va a desaparecer la semana que viene es trabajo tirado.
- **Lo que ya garantiza el compilador o el sistema de tipos.** No hace falta sabotear que una función reciba un número si los tipos ya lo impiden (y aun así conviene ver una vez que los tipos no han degenerado a `any`: una directiva `@ts-expect-error` que sobra es un rojo barato).
- **Volúmenes grandes.** Para una batería de miles de pruebas, la mutación automática da una medida razonable a un coste razonable. El sabotaje dirigido se reserva para las guardas que protegen dinero, datos de terceros o lo irreversible.
- **Sistemas externos que no se pueden copiar.** No se sabotea un servicio ajeno en producción. Ahí la comprobación se declara `PARCIAL`, con su motivo, y se dice qué quedó sin mirar.

## 8. Cómo empezar mañana

Ni `ancla` ni la regla de lint están todavía en npm. Hasta que lo estén, se copian: `packages/ancla/ancla.cjs` es un fichero sin dependencias, y `romper()` son unas treinta líneas en `packages/ancla/test/_romper.mjs`.

1. **Elegir las tres guardas que más dolería que mintieran.** No las más fáciles: las que, si estuvieran en verde por error, dejarían pasar algo caro.
2. **Sabotear cada una en copia.** Comprobar que el texto cambió, que cae exactamente lo que se esperaba —ella sola, o el conjunto que se haya escrito— y que dice por qué.
3. **Cambiar los `slice(indexOf(...))` por `desde`, `entre` o `cerca`.** La regla de lint encuentra la forma directa. La forma con variable (`const i = t.indexOf(a); t.slice(i)`), que es la del ejemplo 1, todavía no: esa hay que buscarla a mano, por ejemplo con `grep -n "indexOf"`. En el ejemplo 1 la regla avisaría, pero por el segundo argumento del corte, no por el ancla.
4. **Poner `PARCIAL:` en todo lo que se salta algo**, y hacer que el conductor lo cuente aparte (en el repositorio, `test/_parcial.cjs`).
5. **Escribir el motivo al lado de cada excepción** (`// eslint-disable-next-line … -- motivo`) y subir `reportUnusedDisableDirectives` a `"error"`, para que la que ya no hace falta salga en rojo.

## 9. Glosario

- **Guarda.** Nombre que este texto da a toda comprobación automática: una prueba unitaria, un censo, un paso de la integración continua, una regla de lint.
- **Ancla.** El trozo de texto por el que una guarda encuentra lo que va a mirar. Si no está, la guarda no tiene qué medir, y eso es un fallo, no un verde.
- **Sabotaje.** Un fallo metido adrede en una copia del código para ver si la guarda que debería detectarlo se pone roja, y por qué.
- **Conductor.** El programa que lanza las guardas y cuenta sus resultados.
- **Aval.** Un verde que se enseña como garantía. Solo garantiza el código exacto sobre el que se obtuvo: si cambió después, hay que volver a medir.
- **PARCIAL.** La marca del tercer resultado: la guarda no llegó a mirar. Va en una línea con formato fijo para que la cuente una máquina.

## 10. Referencias

- Mark Seemann, «A red-green-refactor checklist», 21 de octubre de 2019. <https://blog.ploeh.dk/2019/10/21/a-red-green-refactor-checklist/>
- Derick Bailey, «Red For The Right Reason: Fail By Assertion, Not By Anything Else», Los Techies, 5 de abril de 2010. <https://lostechies.com/derickbailey/2010/04/05/red-for-the-right-reason-fail-by-assertion-not-by-anything-else/>
- Kent Beck, *Test Desiderata*. <https://testdesiderata.com/>
- *superpowers*, skill `test-driven-development` y su guía `writing-good-tests.md`. <https://github.com/obra/superpowers/blob/main/skills/test-driven-development/SKILL.md>, <https://github.com/obra/superpowers/blob/main/skills/test-driven-development/writing-good-tests.md>
- *superpowers*, PR #2196, «fix: distinguish characterization tests from feature RED» (abierto, agosto de 2026). <https://github.com/obra/superpowers/pull/2196>
- *goodfellow*, PR #30, «Tests that can fail: red check, diff-scoped mutation check, test-quality prompts» (28 de septiembre de 2026). <https://github.com/easelyte/goodfellow/pull/30>
- *Test Anything Protocol*, versión 14, directivas. <https://testanything.org/tap-version-14-specification.html>
- Mocha, opciones de la línea de órdenes (`--forbid-pending`, `--fail-zero`). <https://mochajs.org/running/cli/>
- Stryker Mutator, «Mutant states and metrics». <https://stryker-mutator.io/docs/mutation-testing-elements/mutant-states-and-metrics/>, y el esquema del informe (`killedBy`, `statusReason`): <https://github.com/stryker-mutator/mutation-testing-elements/tree/master/packages/report-schema>
- Major mutation framework, tutorial (`killed.csv`: aserción, excepción o tiempo agotado). <https://mutation-testing.org/tutorial.html>
- Hang Du, Vijay Krishna Palepu y James A. Jones, «To Kill a Mutant: An Empirical Study of Mutation Testing Kills», ISSTA 2023. <https://doi.org/10.1145/3597926.3598090>
- Oscar Luis Vera-Pérez, Martin Monperrus y Benoit Baudry, «Descartes: A PITest Engine to Detect Pseudo-Tested Methods», demostración de herramienta, ASE 2018. <https://doi.org/10.1145/3238147.3240474>. Cómo funciona: <https://stamp-project.github.io/pitest-descartes/how-does-it-work.html>
- *vacutest*. <https://github.com/zhengqiuyang/vacutest>
- ESLint, «Configuration Files», `linterOptions.reportUnusedDisableDirectives`. <https://eslint.org/docs/latest/use/configure/configuration-files>
- Arquimedes Canedo, «Oracles That Cannot Fail: Anchoring and the Expectation That Moves With the Fault», arXiv:2608.17214, 2026. <https://arxiv.org/abs/2608.17214>
