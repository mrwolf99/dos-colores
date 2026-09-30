<!-- SPDX-License-Identifier: MIT -->
# Publicar en npm

Cómo salen `@mrwolf99/ancla` y `eslint-plugin-ancla` a npm, qué hace cada
pieza y qué comprueba cada paso. Escrito el 30 sep 2026, antes de la primera
publicación.

## En una frase

La **0.1.0** se publica **a mano**, desde el Mac, con la 2FA de la cuenta
`mrwolf99`, y **no lleva procedencia**. Desde la **0.1.1**, cada versión sale
sola al subir una etiqueta `vX.Y.Z`: `.github/workflows/publicar.yml` pasa la CI
entera, compara la etiqueta con las versiones, comprueba que el commit está en
`main`, prepara los dos paquetes con *trusted publishing* (OIDC, sin ningún
token) y con procedencia, y la versión queda **esperando** en npmjs.com hasta
que una persona la revisa (sección 6) y la aprueba con la 2FA.

**Por qué la primera va a mano:** npm solo deja configurar un *trusted
publisher* en un paquete que ya existe («Package must exist», en la página de
`npm trust`), y no tiene nada parecido a los *pending publishers* de PyPI; la
petición para cambiarlo, npm/cli#8544, sigue abierta. La otra salida,
`npm stage publish` sobre un paquete nuevo, publica antes una versión
`0.0.0-stage` **pública** que se queda en la lista de versiones.

**Lo que no tiene vuelta atrás:** el correo de la cuenta de npm sale publicado
con cada versión (sección 1), y una versión publicada no se puede volver a usar.
Por eso el orden de las secciones es el orden en que se hacen.

## Lo que había el 30 sep 2026 (visto)

- npm: la cuenta `mrwolf99` existe, con 2FA «Enabled for authorization and
  publishing» (dos llaves de seguridad), **0 tokens** y **0 paquetes**. Los dos
  nombres dan E404 en el registro. El correo de la cuenta era **uno personal**,
  y la página de la cuenta avisa: «This email will be added to the metadata of
  packages you publish».
- GitHub: `mrwolf99/dos-colores`, público, rama `main`, issues activadas, sin
  entornos, sin etiquetas y sin rulesets. Actions: `allowed_actions: all` y
  `sha_pinning_required: false` (`gh api repos/mrwolf99/dos-colores/actions/permissions`).
- En el Mac: Node 24.18.1 con npm 11.16.0, sin sesión de npm abierta y sin
  `~/.npmrc`.

---

## 1. Antes de nada: el correo de la cuenta de npm

El registro publica el correo de la cuenta **con cada versión, y para
siempre**: en `_npmUser` de la 0.1.0 (la que sale a mano), en
`_npmUser.approver` de cada versión que se aprueba (sección 6), y en
`maintainers` de los dos paquetes. Visto el 30 sep 2026 con `npm view` sobre
una versión de un tercero preparada por OIDC y aprobada a mano: el aprobador
sale con su nombre **y su correo**. Qué pasa con las versiones ya publicadas si
el correo se cambia después: **no se ha mirado**. Por eso se cambia antes.

1. Elegir una dirección que (a) reciba correo, porque npm manda un enlace para
   verificarla; (b) pueda quedar publicada para siempre; y (c) no lleve a nada
   que no deba aparecer (la referencia es la lista privada de la limpieza). Una
   dirección *noreply* de GitHub no sirve: no recibe correo.
2. npmjs.com → avatar → **Account** (`npmjs.com/settings/mrwolf99/profile`) →
   **Email & Password** → **Change email** → la dirección nueva → confirmar.
3. Abrir el correo de verificación que llega a esa dirección y confirmarlo.

La comprobación de verdad va en la sección 3, en la terminal, justo antes de
publicar: `npm profile get email` tiene que decir la dirección nueva seguida de
`(verified)`.

## 2. GitHub: el entorno `npm`, las etiquetas y las acciones

Antes que la confianza de npmjs.com: el entorno tiene que existir, con su
regla, antes de que nada pueda nombrarlo.

**El entorno** (GitHub → el repositorio → **Settings**):

1. Barra lateral → **Environments** → **New environment**.
2. **Name**: `npm` → **Configure environment**.
3. **Deployment branches and tags** → en el desplegable, **Selected branches
   and tags** → **Add deployment branch or tag rule** → **Ref type**: **Tag** →
   patrón `v*` → **Add rule**.
4. Desmarcar **Allow administrators to bypass configured protection rules** →
   **Save protection rules**.
5. **Required reviewers**: no hace falta. La aprobación que cuenta es la de
   npm, con la 2FA (sección 6); pedir otra en GitHub sería aprobar dos veces lo
   mismo.

**Las etiquetas de versión no se mueven ni se borran**:

1. **Settings** → barra lateral → **Rules** → **Rulesets** → **New ruleset** →
   **New tag ruleset**.
2. **Ruleset name**: `etiquetas de versión`. **Enforcement status**: *Active*.
3. **Target tags** → **Add a target** → incluir por patrón → `v*`.
4. Marcar **Restrict updates**, **Restrict deletions** y **Block force
   pushes**. Sin nadie en **Bypass list**.
5. **Create**.

Con eso, una etiqueta `v*` ya subida apunta para siempre al mismo commit. Para
corregir una puesta por error antes de que se publique nada, se desactiva el
ruleset a propósito, se corrige y se vuelve a activar.

**Solo estas dos acciones, y solo por SHA** (Settings → **Actions** →
**General** → **Actions permissions**). Lo aplica el servidor de GitHub, y por
eso vale aunque alguien cambie un flujo y su guarda en el mismo commit:

1. Elegir la opción que permite las acciones de `mrwolf99` y **una lista** de
   las demás, y en la lista escribir `actions/checkout@*` y
   `actions/setup-node@*`, sin marcar ni «las de GitHub» ni «las de creadores
   verificados».
2. Marcar **Require actions to be pinned to a full-length commit SHA**.
3. **Save**.

Los nombres exactos de esas pantallas **no se han visto**. El resultado, en
cambio, se comprueba desde la terminal. Tienen que salir
`"allowed_actions":"selected"` y `"sha_pinning_required":true`; después, las dos
acciones en `patterns_allowed` y `false` en las otras dos; después, el entorno
con `"can_admins_bypass":false` y `"custom_branch_policies":true`; después, la
regla `v*` de tipo `tag`; y al final, el ruleset.

```sh
gh api repos/mrwolf99/dos-colores/actions/permissions
```

```sh
gh api repos/mrwolf99/dos-colores/actions/permissions/selected-actions
```

```sh
gh api repos/mrwolf99/dos-colores/environments/npm --jq '{can_admins_bypass, deployment_branch_policy}'
```

```sh
gh api repos/mrwolf99/dos-colores/environments/npm/deployment-branch-policies --jq '.branch_policies[] | {name, type}'
```

```sh
gh api repos/mrwolf99/dos-colores/rulesets
```

El siguiente push a `main` lo confirma de verdad: si la lista de acciones
estuviera mal, la CI no arrancaría y lo diría en la ejecución.

## 3. La 0.1.0, a mano

Todo desde la terminal, en la carpeta del repositorio, con `main` ya subido y
la CI de ese commit en verde (GitHub → pestaña **Actions** → la última
ejecución de **ci** en `main`, con la marca verde).

El árbol, limpio: esta orden no tiene que imprimir nada.

```sh
git status --short
```

Y al día con GitHub: la primera línea tiene que ser `## main...origin/main`,
sin `[ahead …]` ni `[behind …]`.

```sh
git fetch origin && git status -sb
```

**Apuntar el commit que se va a publicar.** Es el que llevará la etiqueta
`v0.1.0` en la sección 5, y el que npm guardará como `gitHead`:

```sh
git rev-parse HEAD
```

Las versiones cuadran con la etiqueta que tendrá, y el commit está en `main`:
las dos órdenes tienen que decir `VERDE:`.

```sh
node scripts/antes-de-publicar.mjs --etiqueta v0.1.0
```

```sh
node scripts/antes-de-publicar.mjs --en-main
```

Las pruebas y la limpieza. En el Mac, sin ESLint instalado, las pruebas del
plugin dicen dos `PARCIAL:`; eso lo mira la CI.

```sh
npm test && npm run limpieza
```

Lo que va a viajar. Tienen que salir **7** ficheros en `@mrwolf99/ancla`
(`LICENSE`, `README.md`, `ancla.cjs`, `ancla.d.cts`, `ancla.d.mts`,
`ancla.mjs`, `package.json`) y **6** en `eslint-plugin-ancla` (`LICENSE`,
`README.md`, `docs/rules/no-unchecked-slice.md`, `index.cjs`, `package.json`,
`rules/no-unchecked-slice.cjs`). Las tres últimas líneas de cada una son estas,
y la primera de las tres, el aviso de que no hay sesión, es lo esperado aquí:

```text
npm warn publish This command requires you to be logged in to https://registry.npmjs.org/ (dry-run)
npm notice Publishing to https://registry.npmjs.org/ with tag latest and public access (dry-run)
+ @mrwolf99/ancla@0.1.0
```

(y `+ eslint-plugin-ancla@0.1.0` en la del plugin).

```sh
npm publish -w packages/ancla --dry-run --ignore-scripts
```

```sh
npm publish -w packages/eslint-plugin-ancla --dry-run --ignore-scripts
```

Abrir sesión. Abre el navegador; se entra con la llave de seguridad. La sesión
dura dos horas.

```sh
npm login
```

Tiene que contestar `mrwolf99`.

```sh
npm whoami
```

**El correo que va a quedar publicado.** Tiene que ser la dirección de la
sección 1 seguida de `(verified)`. Si dice la personal, **se para aquí** y se
hace la sección 1.

```sh
npm profile get email
```

Publicar `ancla`. npm enseña el contenido y pide confirmar con la 2FA (en el
navegador, con la llave). Termina con `+ @mrwolf99/ancla@0.1.0`.

```sh
npm publish -w packages/ancla --ignore-scripts
```

Publicar el plugin. Termina con `+ eslint-plugin-ancla@0.1.0`.

```sh
npm publish -w packages/eslint-plugin-ancla --ignore-scripts
```

Cerrar la sesión: invalida el token que `npm login` dejó en `~/.npmrc`.

```sh
npm logout
```

Comprobarlo contra el registro, **pasados unos cinco minutos** (npm escanea
cada versión antes de servirla; en horas punta, quince o más). Cada orden
tiene que dar el nombre, `0.1.0`, `_npmUser.name = 'mrwolf99'`, el correo de
la sección 1 en `_npmUser.email`, y en `gitHead` **el SHA apuntado antes de
publicar**; y **ninguna** línea `dist.attestations…`: la 0.1.0 no lleva
procedencia, y eso es lo esperado.

```sh
npm view @mrwolf99/ancla@0.1.0 name version _npmUser.name _npmUser.email gitHead dist.attestations.provenance.predicateType
```

```sh
npm view eslint-plugin-ancla@0.1.0 name version _npmUser.name _npmUser.email gitHead dist.attestations.provenance.predicateType
```

Si falla el segundo después de salir el primero, se repite solo el segundo: no
hay nada que deshacer.

**Si pasados quince minutos sigue dando E404**, no se vuelve a publicar ni se
sube la versión: el escaneo de npm puede retener una versión para revisarla a
mano, o bloquearla. Se mira la página del paquete en npmjs.com
(`npmjs.com/package/@mrwolf99/ancla`) y el correo de la sección 1. Qué dice
npm en ese caso **no se ha visto**.

Con los dos en npm, dejan de ser verdad estas frases, y se cambian en un
mismo commit **posterior** (la etiqueta `v0.1.0` no va en ese commit, sino en
el apuntado): «Not published yet» en la entrada 0.1.0 del `CHANGELOG.md`, el
párrafo «Ninguno de los dos paquetes está todavía en npm» / «Neither package
is on npm yet» del `README.md`, el principio de la sección 8 de
`ensayo/los-dos-colores.md` y la línea «None of them is on npm yet» de
`ensayo/two-colours.en.md`. Los README de los paquetes ya dicen
`npm install`, porque viajan dentro del tarball.

## 4. La confianza en npmjs.com (una vez por paquete)

Con los dos paquetes ya publicados. En Chrome, con la sesión de `mrwolf99`.
**Estas pantallas no se han podido ver**: no existen hasta que el paquete
existe. Los nombres son los de la documentación de npm (páginas «Trusted
publishing for npm packages» y «Staged publishing», editadas en sep 2026).

Para **`@mrwolf99/ancla`**:

1. npmjs.com → avatar (arriba a la derecha) → **Packages**
   (`npmjs.com/settings/mrwolf99/packages`) → `@mrwolf99/ancla` → pestaña
   **Settings**.
2. Sección **Trusted Publisher** → bajo **Select your publisher**, el botón
   **GitHub Actions**. Se abre un formulario con estos campos; todos distinguen
   mayúsculas y npm **no los comprueba al guardar** (el error sale el día que
   se intenta publicar):
   - **Organization or user**: `mrwolf99`
   - **Repository**: `dos-colores`
   - **Workflow filename**: `publicar.yml` (solo el nombre, con la extensión)
   - **Environment name**: `npm`
   - **Allowed actions**: `npm stage publish` va siempre permitido. **No**
     marcar la publicación directa (`npm publish`): así, nada que corra en
     GitHub puede publicar sin la aprobación de la sección 6.
3. Guardar (el nombre exacto del botón no se ha visto).
4. En la misma pestaña, sección **Publishing access** → marcar **Require
   two-factor authentication and disallow tokens** → **Update Package
   Settings**. No afecta al OIDC.

Lo mismo para **`eslint-plugin-ancla`**, con los mismos cuatro valores.

Una conexión no se puede editar: si un campo está mal, se borra y se crea otra.

**La misma confianza desde la terminal**, si se prefiere (pide confirmar la
2FA; enseña los valores antes de crear nada). Solo con `--allow-stage-publish`:
nunca `--allow-publish`.

```sh
npm login
```

```sh
npm trust github @mrwolf99/ancla --file publicar.yml --repo mrwolf99/dos-colores --env npm --allow-stage-publish
```

```sh
npm trust github eslint-plugin-ancla --file publicar.yml --repo mrwolf99/dos-colores --env npm --allow-stage-publish
```

**Se comprueba así, por cualquiera de los dos caminos.** `npm trust list`
necesita sesión (sin ella da `E401`), y puede pedir la 2FA. Cada paquete tiene
que enseñar **una** configuración, con `publicar.yml`, `mrwolf99/dos-colores`
y `npm`, y la línea **`permissions: stage publish`**, exactamente. Si dice
`permissions: publish, stage publish`, la publicación directa quedó marcada:
se borra esa configuración y se crea otra solo para preparar. Si no sale
ninguna línea `permissions`, no se puede afirmar que sea solo para preparar, y
se hace lo mismo desde la terminal. Esta es la línea que sostiene todo el
diseño, y ninguna otra prueba la ve: el ensayo de la sección 5 cae antes de que
el registro mire el permiso.

```sh
npm trust list @mrwolf99/ancla
```

```sh
npm trust list eslint-plugin-ancla
```

```sh
npm logout
```

## 5. El ensayo general: la etiqueta `v0.1.0` (sale roja, y ese rojo es el bueno)

Con las secciones 1 a 4 hechas, se sube la etiqueta de la versión que ya está
publicada, **en el commit apuntado en la sección 3**, no en `HEAD` (que para
entonces puede ser ya el commit de las frases). La 0.1.0 no lleva procedencia, y esta etiqueta es lo
único que la une con su fuente; el ruleset de la sección 2 no deja moverla
después.

```sh
git tag -a v0.1.0 <SHA-apuntado-en-la-sección-3> -m "0.1.0"
```

Las dos órdenes tienen que dar el mismo SHA, y ser el apuntado:

```sh
git rev-parse "v0.1.0^{commit}"
```

```sh
npm view @mrwolf99/ancla@0.1.0 gitHead
```

```sh
git push origin v0.1.0
```

En **Actions** aparece una ejecución de **publicar**. Lo esperado:

- `pruebas` (la CI entera, llamada desde aquí) y `etiqueta` (la etiqueta y
  `--en-main`, los dos con `VERDE:`), en verde.
- En `publicar`, la comprobación del entorno dice `VERDE:`, y el paso de
  `packages/ancla` cae con
  `You cannot publish over the previously published versions: 0.1.0.`

Ese rojo es la prueba de que la confianza funciona: npm hace el intercambio
OIDC **antes** de mirar qué versiones existen (en `lib/commands/publish.js`
del propio npm, que es también el de `npm stage publish`, el `oidc()` va antes
de esa comprobación), y sin un token válido habría caído antes, con otro
mensaje. Los otros rojos posibles, y lo que dicen:

| Sale | Quiere decir |
|---|---|
| `ENEEDAUTH` / `This command requires you to be logged in` | el intercambio OIDC falló. **Primero**, buscar en el registro del paso la línea `npm verbose oidc Failed token exchange request with body message:`: lo que sigue es la causa que da npm. Lo más probable es que la confianza de npmjs.com no case (dueño, repositorio, `publicar.yml` o `npm`, letra a letra); la documentación de npm cita también `repository.url` (lo vigila `test/publicar.test.mjs`) y las máquinas propias (el job solo corre en `ubuntu-latest`) |
| el job no arranca, por las reglas del entorno | la regla `v*` del entorno `npm` no está, o está mal escrita |
| el job no arranca, por una acción no permitida | la lista de acciones de la sección 2 |
| `ROJO:` en `antes-de-publicar.mjs --entorno` | lo dice la línea: npm sin `stage`, falta `id-token` o hay un token en el entorno |
| `ROJO:` en `antes-de-publicar.mjs --en-main` | lo dice la línea: el commit etiquetado no está en `main`, o el clon no es completo |

Lo que este ensayo **no** mide: la confianza del plugin (el paso de `ancla` cae
primero y el del plugin no llega a correr), la firma de la procedencia (va
después) y el permiso «solo preparar» (el rojo sale en el cliente antes de que
el registro lo mire; eso lo dice `npm trust list`, sección 4). Las dos primeras
se ven por primera vez en la 0.1.1.

## 6. Cada versión siguiente

Subir la versión en los tres `package.json` a la vez (sin instalar nada):

```sh
npm version 0.1.1 --no-git-tag-version --workspaces --include-workspace-root --no-workspaces-update --ignore-scripts
```

Añadir a mano la entrada `## [0.1.1] - AAAA-MM-DD` arriba del `CHANGELOG.md`,
pasar las pruebas y la limpieza, comprometer y subir `main`, y esperar a que la
CI de ese commit salga en verde. Después, la etiqueta, en ese commit de `main`:

```sh
git tag -a v0.1.1 -m "0.1.1"
```

```sh
git push origin v0.1.1
```

En **Actions**, la ejecución de **publicar** tiene que acabar en verde, y el
registro de cada paso de preparación dice `Signed provenance statement` y
`+ … (staged with id …)`.

**Si el job `publicar` cae a medias** (un paquete preparado y el otro no):
**no** se relanza («Re-run jobs»): volvería a preparar el primero con la misma
versión, y qué hace el registro con eso **no se ha visto**. Se rechaza el que
quedó preparado (`npm stage reject <id>`, con sesión) y se sale con la versión
siguiente. Si una versión rechazada se puede reutilizar tampoco se ha visto;
subir de versión es lo seguro.

### Antes de aprobar: mirar lo que se va a publicar

Aprobar es la única barrera que no se puede editar desde el repositorio: el
flujo que corre es el del commit etiquetado, y sus guardas (`--en-main`, la
forma cerrada del job, la limpieza, que en CI no tiene la lista privada y dice
`PARCIAL`) las puede quitar quien cambie ese commit. Por eso, antes de pulsar
nada, se mira a mano, desde la carpeta del repositorio.

El commit de la etiqueta está en `main`; tiene que imprimir `v0.1.1 está en
main`:

```sh
git fetch origin --tags && git merge-base --is-ancestor v0.1.1 origin/main && echo "v0.1.1 está en main"
```

La ejecución de **publicar** de esa etiqueta, con `pruebas`, `etiqueta` y
`publicar` en verde (la columna de la rama dice `v0.1.1`):

```sh
gh run list --workflow publicar.yml --limit 3
```

```sh
gh run view <id-de-la-ejecución>
```

Sesión, y lo que hay preparado: tienen que salir **dos**, `@mrwolf99/ancla` y
`eslint-plugin-ancla`, los dos con `0.1.1`, cada uno con su `id`.

```sh
npm login
```

```sh
npm stage list
```

Para cada paquete, se baja lo preparado, se empaqueta aquí el commit de la
etiqueta y se comparan fichero a fichero (no por `shasum`: si un tarball hecho
en el Mac y otro en Linux dan el mismo no se ha medido), y se pasa la limpieza
**con** la lista privada. Para `ancla`, con su `id`:

```sh
V=0.1.1; P=ancla; ID=<id-de-@mrwolf99/ancla>
D=$(git rev-parse --show-toplevel); R=$(mktemp -d); cd "$R"
npm stage download "$ID" && mkdir preparado etiqueta local && tar -xzf ./*.tgz -C preparado
git -C "$D" archive "v$V" | tar -x -C etiqueta
(cd "etiqueta/packages/$P" && npm pack --ignore-scripts --pack-destination "$R/local")
tar -xzf local/*.tgz -C local
diff -r preparado/package local/package && echo "IGUALES"
node "$D/scripts/limpieza.mjs" preparado/package --lista "$(git -C "$D" rev-parse --path-format=absolute --git-common-dir)/info/terminos-prohibidos"
cd "$D"
```

Tiene que decir `IGUALES` y, en la última línea de la limpieza, `0 hallazgos` y
`lista privada: N términos` (no `NO MIRADA`). Lo mismo para el plugin, con
`P=eslint-plugin-ancla` y su `id`. Cualquier otra cosa: **no se aprueba**; se
rechaza (`npm stage reject <id>`) y se averigua.

**Aprobar** (esto es lo que la publica): npmjs.com → avatar → **Staged
Packages** (`npmjs.com/settings/mrwolf99/staged-packages`) → cada uno de los
dos paquetes → **Approve** → la 2FA. Desde la terminal, con la sesión de antes,
es lo mismo:

```sh
npm stage approve <id-de-@mrwolf99/ancla>
```

```sh
npm stage approve <id-de-eslint-plugin-ancla>
```

```sh
npm logout
```

**Comprobarlo**, pasados unos minutos. Cada orden tiene que dar
`_npmUser.name = 'GitHub Actions'`, `_npmUser.trustedPublisher.id = 'github'`,
`_npmUser.approver.name = 'mrwolf99'`, el correo de la sección 1 en
`_npmUser.approver.email` y
`dist.attestations.provenance.predicateType = 'https://slsa.dev/provenance/v1'`;
si falta cualquiera de esas líneas, la versión no ha salido como debía.

```sh
npm view @mrwolf99/ancla@0.1.1 _npmUser.name _npmUser.trustedPublisher.id _npmUser.approver.name _npmUser.approver.email dist.attestations.provenance.predicateType
```

```sh
npm view eslint-plugin-ancla@0.1.1 _npmUser.name _npmUser.trustedPublisher.id _npmUser.approver.name _npmUser.approver.email dist.attestations.provenance.predicateType
```

## Lo que ninguna prueba del repositorio ve

`test/publicar.test.mjs` lee `publicar.yml`, `ci.yml` y los dos
`package.json`. Cada regla se ha visto caer sola y por su causa, y un censo
comprueba que cada rama de la guarda (cada llamada a `falta()`) la ha hecho
caer algún sabotaje; las dos ramas que no pueden caer solas (un paquete nuevo,
y `publicar` sin esperar al job `etiqueta`) tienen su prueba aparte, con cada
regla que cae nombrada. Lo que no puede leer desde aquí, y dónde se ve:

| Qué | Dónde se ve |
|---|---|
| La confianza en npmjs.com (dueño, repositorio, `publicar.yml`, entorno `npm`) | `npm trust list` (sección 4) y el ensayo de la sección 5 |
| Que esa confianza es **solo para preparar** (`permissions: stage publish`) | solo `npm trust list` (sección 4): el ensayo no lo distingue |
| El correo que el registro publica con cada versión | `npm profile get email` antes de publicar (sección 3) y `npm view` después (secciones 3 y 6) |
| Que el entorno `npm` solo admite etiquetas `v*`, el ruleset de las etiquetas y la lista de acciones permitidas | los `gh api` de la sección 2 |
| Que el filtro `v[0-9]+.[0-9]+.[0-9]+` de GitHub compara la etiqueta entera y no solo su principio | **no se ha mirado**; `antes-de-publicar.mjs --etiqueta` la exige entera de todas formas, y el job cae si no |
| Que cada SHA fijado es el commit de la etiqueta que lleva al lado | `git ls-remote https://github.com/actions/checkout refs/tags/v7.0.1` (y lo mismo con `actions/setup-node` y `v7.0.0`): el SHA tiene que ser el del flujo |
| Que GitHub lee los flujos como los lee `test/_yaml.mjs` | el lector se niega a todo lo que no conoce en vez de adivinar (su rojo dice el fichero, la línea y que es suyo); se comparó con PyYAML sobre los dos flujos normalizando lo que PyYAML convierte (la clave `on` pasa a `True`, los números y los booleanos dejan de ser texto) y salen iguales; lo último que lo dice es la propia ejecución en GitHub |
| Que lo preparado es lo del commit etiquetado | la revisión antes de aprobar (sección 6) |
| La procedencia y la aprobación de cada versión | el `npm view` de la sección 6 |

## Por qué está hecho así

- **`npm stage publish`, no `npm publish`.** La confianza se configura solo
  para preparar: una etiqueta subida por error, o un flujo comprometido, como
  mucho propone una versión; publicarla exige la 2FA de una persona, después de
  mirar lo preparado.
- **El job que publica tiene una forma cerrada.** La guarda no busca lo que
  no debe estar (esa lista nunca se acaba: un `shell:` propio, un `env:` con
  `NODE_OPTIONS`, un contenedor, una máquina propia, una acción de terceros, un
  `npx` de más, una línea en `$GITHUB_ENV`…), sino que compara cada clave y cada
  paso con lo único que puede haber.
- **`--provenance` escrito.** npm la activa solo cuando, tras el OIDC, consulta
  la visibilidad del paquete y le sale pública; si esa consulta falla, lo
  anota a nivel `verbose` y publica sin procedencia. Pedida en la orden, una
  procedencia que no se puede firmar es un rojo.
- **La etiqueta por `"$GITHUB_REF_NAME"`, nunca por `${{ github.ref_name }}`.**
  Una plantilla se pega en el guion antes de ejecutarlo; una variable de
  entorno, no.
- **`--en-main` antes de preparar.** Una etiqueta puesta en una rama sin
  integrar para ahí. Solo protege de un despiste (quien cambie el flujo la puede
  quitar), y por eso se repite a mano antes de aprobar.
- **Nada de `provenance` en `publishConfig`.** Rompería la publicación a mano
  de la 0.1.0 (`EUSAGE`: fuera de la CI no hay con qué firmarla).
- **`publishConfig.access: "public"` en los dos.** Un paquete con *scope* es
  privado por defecto en la primera publicación según unas páginas de npm, y
  público según otras; así no depende de cuál acierte.
- **`repository` con `directory`.** npm compara la URL con el repositorio del
  token, letra a letra; y con `directory`, npmjs.com resuelve los enlaces
  relativos de cada README contra la carpeta del paquete en GitHub.
- **Node exacto (24.21.0) en el job que publica.** Trae npm 11.19.0, y
  `npm stage` necesita 11.15.0; un `24` suelto puede tomar un Node más viejo
  que ya tenga la máquina. Además, antes de preparar nada,
  `antes-de-publicar.mjs --entorno` lo comprueba y lo dice, y rechaza también
  un `NPM_ID_TOKEN` en el entorno (npm lo usaría en vez de pedir el suyo a
  GitHub).
- **La CI entera, llamada, antes de publicar.** Es el mismo `ci.yml` de cada
  push, no una segunda lista que pueda divergir. Por eso `ci.yml` ya no se
  dispara solo con las etiquetas: correría dos veces (lo vigila la guarda).
- **Acciones fijadas por SHA**, y además exigido por GitHub (sección 2). Una
  etiqueta se puede mover; un SHA completo, no. El comentario de al lado dice
  qué versión era.
- **`persist-credentials: false`, `--ignore-scripts`, `permissions: {}`
  arriba.** En el job que tiene `id-token` no queda el token de GitHub en el
  disco, no corre ningún script de los paquetes y nada tiene permisos que no
  pida.
