<!-- SPDX-License-Identifier: CC-BY-4.0 -->
# Los dos colores

*Por qué una comprobación no vale nada hasta que se la ha visto fallar, y fallar por su causa.*

Samy Haggag · 2026 · [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/)

---

## 1. La regla, en una frase

> **Una prueba no vale hasta que se la ha visto de los dos colores: verde contra lo bueno de verdad, rojo contra lo roto, y el rojo cayendo por su causa y diciéndola.**

Son tres cláusulas, y cada una tapa un agujero distinto.

- **Verde contra lo bueno de verdad.** No contra un texto que se inventa la propia prueba, ni contra una copia de hace nueve versiones, ni contra una lista vacía. Si el verde solo se ha visto sobre datos que fabrica la comprobación, no se ha visto.
- **Rojo contra lo roto.** Una comprobación que nunca se ha puesto roja no ha demostrado que sepa hacerlo. Hay que romper a propósito lo que dice vigilar, en una copia, y mirar.
- **Por su causa, y diciéndola.** Si cae por otro motivo —una dependencia que falta, un puerto ocupado, un fichero que no existe—, no ha demostrado nada. Y si cae sin decir por qué, enseña a quien la lee a ignorarla.

## 2. Por qué hace falta

El verde no es una afirmación: es la ausencia de rojo. Una comprobación rota y una comprobación sana imprimen exactamente lo mismo mientras el código esté bien. La diferencia solo aparece el día que el código se rompe, y ese día la rota sigue en verde.

Por eso el coste de un verde que miente no lo ve nadie. No sale en ningún informe. Sale semanas después, como un fallo que «las pruebas no vieron», y casi nadie vuelve atrás a preguntar qué prueba lo dejó pasar y por qué.

El rojo que miente tiene el coste contrario, y es igual de caro. La primera vez que una batería se pone roja por algo que no es un defecto, alguien lo investiga. La segunda vez, alguien dice «ah, eso es lo del servidor» y sigue. A la tercera, la batería ya no protege nada, aunque siga ejecutándose todas las noches.

Una prueba que no puede fallar no protege nada. Una que falla por cualquier cosa, tampoco.

## 3. Tres estados, no dos

Hay un tercer color que casi nunca se nombra: **NO MIRADO**. Una comprobación que necesita una clave que no está, un servicio que no responde, o una muestra que se ha cortado a la mitad no ha dicho «bien». Ha dicho «no he podido mirar». Si eso se imprime en prosa («○ se salta la parte del almacén») y el resumen dice «todo en verde», quien lo lee se queda con el verde.

Tres reglas hacen que el tercer estado no se pierda:

1. **Una línea de formato fijo, a principio de línea, que una máquina pueda leer.** Aquí es `PARCIAL: <motivo>`. Nada de iconos, sangrías ni variantes: `  ◐ PARCIAL:` y `PARCIAL —` no las lee el mismo lector.
2. **El lector, escrito con cuidado.** `^PARCIAL:[ \t]*(.+)$`, con la bandera multilínea. No `\s*`: `\s` también casa con el salto de línea, así que un `PARCIAL:` sin motivo se come la línea siguiente y la lee como si fuera el motivo. El [ejemplo 3](../ejemplos/03-tres-estados.mjs) lo enseña: con `\s*`, el motivo leído es «ok totales».
3. **El recuento sale de contadores, nunca a mano.** «0 fallos · 0 saltos» escrito en una cadena después de dos marcas de «bien» no es un recuento: es un adorno que dice lo que su autor esperaba.

Y una regla de política: **en integración continua, un salto es rojo; en local, es PARCIAL.** En el repositorio que acompaña a este texto, la variable `DOS_COLORES_SIN_SALTOS=1` convierte cualquier `PARCIAL` en fallo. Si algún salto tiene que estar exento, la exención lleva su motivo escrito al lado, y solo hay una.

## 4. El catálogo

Diecinueve formas en que una comprobación miente, en cuatro familias. Cada una va con un caso contado sobre una tienda de juguete —vende cuadernos: pedidos, líneas, impuesto, envío, correo de confirmación y una cola de envíos—, con la guarda que la tapa y con la pregunta que la caza. Los casos son reales en su forma; la tienda es inventada.

### Verdes que no miden

| # | Forma | Caso en la tienda | Guarda | La pregunta |
|---|---|---|---|---|
| 1 | **El ancla perdida** | La guarda «la línea del pedido no suma el envío» corta el cuerpo de `importeLinea` con `slice(indexOf(...))`. Alguien renombra la función: `indexOf` devuelve −1, el trozo sale vacío y la comprobación negativa pasa. | Cortar con funciones que fallan si el ancla no está (`desde`, `entre`, `cerca`) y una regla de lint para lo que quede. | ¿Qué mide esto si el ancla no está? |
| 2 | **La verdad vacía**, en seis formas: `every` sobre una lista vacía, estado sembrado, estado heredado, tautología, lista de exenciones a cero, revisión con cero revisores | «Los correos de confirmación tienen asuntos distintos», con cero correos en la cola. «Vaciar el carrito no borra pedidos», con cero pedidos antes. | Exigir la población antes de afirmar sobre ella; sembrar el estado al empezar cada caso. | ¿Se cumpliría si la función no hubiera hecho nada? |
| 3 | **La copia congelada** | La batería sirve una carpeta generada hace nueve versiones: cientos de verdes sobre código que ya no existe. | Medir el original, o fabricar la copia en cada ejecución. | ¿De cuándo es lo que mido? |
| 4 | **Mira donde no vive el hecho** | Un sondeo TCP a un servicio que escucha por UDP. «La cola de envíos está activa», comprobado sobre una lista de eventos vacía. Un listado hecho con una credencial de solo lectura que devuelve `[]`. | Un control positivo: algo que *tiene* que salir, y sale. Probar el comportamiento, no el indicio. | ¿Qué tendría que pasar para que esto cambie de color? |
| 5 | **El número tranquilizador** | `grep -c` con un corchete sin escapar da una cadena vacía, y `[ "" -eq 0 ]` es verdadero. `… \| head; echo $?` da el código de `head`. Contar un directorio que crece. Contar dos veces lo que se imprime dos veces. | Que mande el recuento de la herramienta, no el de un filtro encima. | ¿Este cero es un recuento o una ausencia? |
| 6 | **Mide menos de lo que promete** | El censo de `fechaDeEntrega` reconoce una de las cuatro formas en que se escribe en el código: ve el 69 % y lo da en verde. Una frase armada con un ternario que el patrón no reconoce. | Probar el patrón contra cada forma real y contra negativos. | ¿Cuántas formas reales hay? |
| 7 | **Los dos colores sin distinguir**, y **dos rutas con una salida** | Cuatro errores de envío distintos que devuelven el mismo texto: la guarda exige que existan los cuatro y pasa igual. Una etiqueta que dice por qué vía se clasificó un dato, no quién lo emitió. | Un caso que exija textos distintos. Imprimir la ruta tomada. | Si el camino nuevo fallara, ¿se vería distinto? |

### Rojos que mienten

| # | Forma | Caso en la tienda | Guarda | La pregunta |
|---|---|---|---|---|
| 8 | **El rojo por otra causa** | Dos baterías a la vez contra el mismo servidor de pruebas. Doce rojos por el directorio desde el que se lanzó el conductor, nueve de ellos falsos. Una señal de corte capturada que termina con código 1. | Correr desde la raíz; una batería cada vez. | ¿Cae por lo que dice vigilar? |
| 9 | **La que nunca puede dar verde** | Comparar la huella de la página servida a través de un intermediario que la reescribe en cada respuesta: dos peticiones seguidas, dos huellas. Una dirección antigua que devuelve una redirección, no la página. | Comparar donde los bytes significan algo; un control de «200 y HTML». | ¿La he visto verde alguna vez? |
| 10 | **El `\|\|` de una sola rama** | `killed \|\| signal === "SIGTERM"` para detectar un tiempo agotado: `killed` venía `undefined` en los cuatro casos, y decidía siempre la otra rama. | Medir cada rama por separado; usar el hecho (`ETIMEDOUT`), no el síntoma. | ¿He visto decidir a cada rama sola? |
| 11 | **El error adivinado** | Expresiones regulares escritas contra un mensaje de error que nadie había visto, y que además llegaba en la respuesta, no por la salida de error. | Imprimir el dato crudo antes de razonar sobre él. | ¿He visto el texto contra el que caso? |

### Grises que se leen como verde

| # | Forma | Caso en la tienda | Guarda | La pregunta |
|---|---|---|---|---|
| 12 | **El salto dicho en prosa** | La mitad de la batería que habla con el almacén necesita una clave; sin ella imprime «○ se salta» y el resumen dice «todo en verde». | Una línea de formato fijo, y un censo que lea el árbol sintáctico de las pruebas para encontrar los saltos. | ¿Lo leerá la máquina? |
| 13 | **El tope o la muestra sin declarar** | Treinta y cuatro de cuarenta y seis hallazgos sin mirar, y el grave estaba entre ellos. Revisores automáticos que agotan su presupuesto y cuentan como «refutados». | Separar «sin veredicto» de «descartado». | ¿Qué dejé fuera, y lo he dicho? |
| 14 | **El marcador escrito a mano** | «0·0·0» impreso después de dos marcas de «bien». | El recuento sale de contadores. | ¿De dónde sale este número? |

### Sabotajes y avales que mienten

| # | Forma | Caso en la tienda | Guarda | La pregunta |
|---|---|---|---|---|
| 15 | **El sabotaje que no se aplica** | El sabotaje reemplaza `calcularEnvio(pedido)`. Alguien le añade el parámetro `zona`, el `replace` ya no encuentra nada y devuelve el texto tal cual, sin error. La guarda corre sobre código sano. | Un `romper()` que se niega si el ancla no está una sola vez o si no cambia nada. | ¿Cambió el texto? |
| 16 | **El sabotaje pegado, con la red dentro del guion** | La huella del original la compara el mismo guion que lo sabotea, y dice «idéntico». Un sabotaje «cazado» porque la suite reventó por una dependencia que faltaba. | Copias; `git diff --exit-code` desde fuera del guion; mirar el código de salida y la causa. | ¿Quién comprueba al que comprueba? |
| 17 | **El aval caducado** | Un «59 de 59» presentado cuatro horas después, con el fichero reescrito en medio. | Un sello con la huella del árbol que se midió. | ¿Este verde es de este árbol? |
| 18 | **«Compila», pero le faltan 116 líneas** | Un corte hecho contando llaves: el módulo resultante compila y exporta 13 cosas de las 15 que tenía. | Dos anclas, y medir el tamaño esperado antes de escribir. | ¿Cuánto esperaba cambiar? |
| 19 | **La media línea** | «No se puede borrar…» seguía con «si lo que quieres es…», y cambiaba el sentido de la frase. | Leer la línea entera. | Una línea cortada a mitad de palabra, ¿está leída? |

Dos formas merecen una nota aparte, porque son las que el código del repositorio ataca directamente.

**El ancla perdida (1)** es la más barata de cometer y la más difícil de ver. JavaScript no se queja cuando `indexOf` devuelve −1: `t.slice(-1)` da el último carácter, `t.substring(-1)` da el texto entero, y una ventana `t.slice(i - 900, i + 900)` da el texto entero si mide 899 caracteres o menos, un trozo al que le falta el final entre 900 y 1.799, y nada desde 1.800. Ninguna de las tres cosas es un error. Las tres dejan pasar una comprobación negativa. El paquete `ancla` convierte el ancla ausente en el fallo, con un mensaje que nombra quién buscaba y qué; la regla `ancla/no-unchecked-slice` señala las formas directas que quedan en el código. El [ejemplo 1](../ejemplos/01-ancla-perdida.mjs) enseña las cuatro fases: verde bueno, rojo bueno, verde mentiroso tras el renombrado, y rojo con nombre.

**El sabotaje que no se aplica (15)** es la versión del ancla perdida dentro de la propia prueba. `String.prototype.replace` con un patrón que no está devuelve el texto sin cambios y sin error. Y tiene una trampa más: si el texto de sustitución contiene `$&`, la sustitución puede dejar el original tal cual aunque el patrón sí esté. Por eso `romper()` sustituye por posición y se niega a trabajar si el ancla no aparece exactamente una vez.

## 5. Cómo sabotear

Sabotear es romper a propósito lo que una guarda dice vigilar, para verla ponerse roja. Hecho sin cuidado, el sabotaje miente tanto como la guarda. Siete reglas:

1. **En copia, nunca en sitio.** El original no se toca. Si un sabotaje se escapa al original, acaba desplegado o comprometido; ya ha pasado.
2. **`romper()` se niega** si no encuentra el ancla, si la encuentra más de una vez o si el reemplazo es igual al original.
3. **Un control verde sobre la copia sin tocar.** Si la copia sin sabotear no pasa entera, lo que falla es copiar o cargar, no la guarda.
4. **Se exige el conjunto exacto de pruebas que caen, y la causa de cada una.** No basta con «cayó algo». Si cae la prueba correcta por otra causa, o caen de más, el sabotaje no ha demostrado lo que dice.
5. **Las partes se rompen una a una.** Una guarda que vigila cuatro cosas y solo cae cuando se rompen las cuatro no cubre ninguna.
6. **La red va fuera del guion.** Que el original sigue intacto lo comprueba alguien que no es el guion que sabotea: `git diff --exit-code` al final del trabajo de integración.
7. **El censo.** Toda prueba tiene al menos un sabotaje que la ha visto caer. Una prueba nueva sin sabotaje es roja hasta que lo tenga.

El [ejemplo 2](../ejemplos/02-sabotaje-en-copia.mjs) lo hace sobre la tienda: control verde, un sabotaje que tumba exactamente una comprobación y dice por qué, un sabotaje escrito para una versión antigua que `replace` aplica en silencio y `romper` rechaza, y la huella del original igual antes y después. El arnés completo, con veintidós sabotajes y el arnés visto de los dos colores, está en `packages/ancla/test/sabotajes.test.mjs`.

## 6. Vecinos, con honradez

Casi nada de esto es nuevo por separado, y conviene decir de dónde viene cada pieza.

- **Ver el rojo, y por el motivo esperado.** Mark Seemann, en su lista de comprobación de rojo-verde-refactorizar (2019), pide en la fase roja ejecutar la prueba, comprobar que falla, que falla por una aserción y que falla por la última aserción. Derick Bailey tituló en 2010 una entrada «Red for the right reason: fail by assertion, not by anything else». La skill de TDD de *superpowers* pide verificar el rojo: que la prueba falle en vez de dar error, que el mensaje sea el esperado y que falle porque falta la funcionalidad, no por una errata; un PR abierto en agosto de 2026 (#2196) propone, para refactorizaciones, introducir una mutación y comprobar el fallo esperado antes de seguir.
- **Que la causa se vea.** Entre las Test Desiderata de Kent Beck está la propiedad *Specific*: «if a test fails, the cause of the failure should be obvious».
- **El vecino más cercano.** *goodfellow* (PR #30, septiembre de 2026) vuelve a ejecutar las pruebas nuevas contra la rama base y clasifica el resultado; uno de sus veredictos, `WRONG_REASON`, marca la prueba que se puso roja por un fallo que no era una aserción. El propio proyecto reconoce su límite: un veredicto correcto demuestra que falló una aserción, no cuál.
- **Mutación.** Stryker, PIT, cargo-mutants o mutmut generan mutantes y cuentan cuántos «mata» la batería. En Stryker, por ejemplo, un mutante cuenta como muerto cuando falla al menos una prueba mientras está activo; la definición no distingue si esa prueba cayó por una aserción o por una excepción. Major sí separa el motivo: aserción, excepción o tiempo agotado. Du, Palepu y Jones (ISSTA 2023) midieron qué hay detrás de esas muertes y encontraron que las caídas del programa —excepciones que ninguna aserción esperaba— aportan una parte sustancial de esas muertes, y que un mismo mutante puede hacer fallar pruebas por causas muy distintas. Descartes, sobre PIT, aplica mutación extrema —vaciar el cuerpo entero de un método— para encontrar métodos «pseudoprobados»: cubiertos por las pruebas, pero sin que ninguna note que se ha quitado todo.
- **Estático.** *vacutest* detecta sin ejecutar nada pruebas vacías o tautológicas: las que no afirman nada, comparan un valor consigo mismo o se tragan el error que debían comprobar. Apuesta por la precisión y acepta no verlo todo.
- **Excepciones que solo encogen.** ESLint puede avisar de los comentarios `eslint-disable` que ya no silencian nada (hoy lo hace por defecto como aviso); subido a error, la lista de excepciones solo puede encoger.
- **Una advertencia de nombre.** Canedo (2026) llama *anchoring* a un defecto: el oráculo que toma su valor esperado del mismo sistema que juzga y por eso no puede fallar. El «ancla» de este texto es casi lo contrario: un punto fijo del texto que tiene que estar, y cuya ausencia es el fallo.

**Qué añade esto.** Hay precedentes que piden ver el rojo por el motivo esperado, pero en el momento de escribir una prueba nueva. Esto lo lleva a cualquier guarda, también sobre código que ya existe; exige *qué* comprobación cae, no solo que caiga una; rompe las partes una a una; ve el verde contra lo bueno de verdad; y comprueba que el sabotaje se aplicó.

**Qué no añade.** No genera mutantes, no da una puntuación y no escala a miles de funciones: cada sabotaje lo escribe una persona que sabe qué debería caer. Es una herramienta de precisión, no de cobertura.

## 7. Cuándo NO compensa

- **Un prototipo que se va a tirar.** Sabotear lo que va a desaparecer la semana que viene es trabajo tirado.
- **Lo que ya garantiza el compilador o el sistema de tipos.** No hace falta sabotear que una función reciba un número si los tipos ya lo impiden (y aun así, conviene ver una vez que los tipos no han degenerado a `any`: una directiva `@ts-expect-error` que sobra es un rojo barato).
- **Volúmenes grandes.** Para una batería de miles de pruebas, la mutación automática da una medida razonable a un coste razonable. El sabotaje dirigido se reserva para las guardas que protegen dinero, datos de terceros o lo irreversible.
- **Sistemas externos que no se pueden copiar.** No se sabotea un servicio ajeno en producción. Ahí la comprobación se declara `PARCIAL`, con su motivo, y se dice qué quedó sin mirar.

## 8. Cómo empezar mañana

1. **Elegir las tres guardas que más dolería que mintieran.** No las más fáciles: las que, si estuvieran en verde por error, dejarían pasar algo caro.
2. **Sabotear cada una en copia.** Comprobar que el texto cambió, que cae ella sola y que dice por qué.
3. **Cambiar los `slice(indexOf(...))`** por `desde`, `entre` o `cerca`, o activar la regla de lint y dejar que ella los encuentre.
4. **Poner `PARCIAL:` en todo lo que se salta algo**, y hacer que el conductor lo cuente aparte.
5. **Escribir el motivo al lado de cada exención**, y hacer que la exención que sobra salga roja.

## 9. Glosario

- **Guarda.** Cualquier comprobación automática que protege algo: una prueba, un censo, un paso de integración, una regla de lint.
- **Ancla.** El trozo de texto por el que una guarda encuentra lo que va a mirar. Si no está, la guarda no puede medir, y eso es un fallo, no un verde.
- **Sabotaje.** Romper a propósito, en una copia, lo que una guarda dice vigilar, para verla ponerse roja por su causa.
- **Conductor.** El programa que ejecuta las guardas y cuenta sus resultados.
- **Aval.** Un resultado en verde presentado como prueba de que algo está bien. Vale para el árbol que se midió, no para «la versión».
- **PARCIAL.** El tercer estado: la guarda no ha podido mirar, y lo dice en una línea que una máquina sabe leer.

## 10. Referencias

- Mark Seemann, «A red-green-refactor checklist», 21 de octubre de 2019. <https://blog.ploeh.dk/2019/10/21/a-red-green-refactor-checklist/>
- Derick Bailey, «Red For The Right Reason: Fail By Assertion, Not By Anything Else», Los Techies, 5 de abril de 2010. <https://lostechies.com/derickbailey/2010/04/05/red-for-the-right-reason-fail-by-assertion-not-by-anything-else/>
- Kent Beck, *Test Desiderata*. <https://testdesiderata.com/>
- *superpowers*, skill `test-driven-development`. <https://github.com/obra/superpowers/blob/main/skills/test-driven-development/SKILL.md>
- *superpowers*, PR #2196, «fix: distinguish characterization tests from feature RED» (abierto, agosto de 2026). <https://github.com/obra/superpowers/pull/2196>
- *goodfellow*, PR #30 (28 de septiembre de 2026). <https://github.com/easelyte/goodfellow/pull/30>
- Stryker Mutator, «Mutant states and metrics». <https://stryker-mutator.io/docs/mutation-testing-elements/mutant-states-and-metrics/>
- Major mutation framework. <https://mutation-testing.org/>. La clasificación de las muertes en aserción, excepción y tiempo agotado se ha comprobado en la descripción de un curso universitario que lo usa: <https://www2.cs.sfu.ca/~wsumner/teaching/473/20/assignment-mutation.html>
- Hang Du, Vijay Krishna Palepu y James A. Jones, «To Kill a Mutant: An Empirical Study of Mutation Testing Kills», ISSTA 2023. <https://doi.org/10.1145/3597926.3598090>
- «Descartes: A PITest Engine to Detect Pseudo-Tested Methods», demostración de herramienta, ASE 2018. <https://doi.org/10.1145/3238147.3240474>. Código: <https://github.com/STAMP-project/pitest-descartes>
- *vacutest*. <https://github.com/zhengqiuyang/vacutest>
- ESLint, «Configuration Files», `linterOptions.reportUnusedDisableDirectives`. <https://eslint.org/docs/latest/use/configure/configuration-files>
- Canedo, «Oracles That Cannot Fail: Anchoring and the Expectation That Moves With the Fault», arXiv:2608.17214, 2026. <https://arxiv.org/abs/2608.17214>
