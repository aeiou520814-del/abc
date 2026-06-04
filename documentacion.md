# Documentación Técnica del Proyecto: Los Consentidos

## Índice

- [1. Introducción](#1-introducción)
- [2. Planteamiento del Problema](#2-planteamiento-del-problema)
  - [2.1 Descripción de la Problemática](#21-descripción-de-la-problemática)
  - [2.2 Levantamiento de Requerimientos](#22-levantamiento-de-requerimientos)
- [3. Diseño Conceptual — Modelos E-R y EER](#3-diseño-conceptual--modelos-e-r-y-eer)
  - [3.1 Identificación de Entidades](#31-identificación-de-entidades-modelo-e-r)
  - [3.2 Relaciones y Cardinalidades](#32-relaciones-y-cardinalidades)
  - [3.3 Jerarquía ISA](#33-jerarquía-isa--especialización-de-empleados)
  - [3.4 Entidades Débiles](#34-entidades-débiles)
  - [3.5 Diagrama E-R](#35-diagrama-e-r-práctica-1)
  - [3.6 Diagrama EER](#36-diagrama-eer--notación-crows-feet-práctica-2)
- [4. Modelo Relacional](#4-modelo-relacional)
- [5. Implementación — DDL y Restricciones de Dominio](#5-implementación--ddl-y-restricciones-de-dominio)
- [6. Seguridad y Control de Acceso — DCL](#6-seguridad-y-control-de-acceso--dcl)
- [7. Arquitectura del Sistema](#7-arquitectura-del-sistema)
- [8. Pruebas de Integridad y Seguridad](#8-pruebas-de-integridad-y-seguridad)

---

## 1. Introducción

El presente documento constituye la documentación técnica completa del proyecto final de la materia Bases de Datos, desarrollado por el equipo del Grupo 3CV2 de la Escuela Superior de Cómputo (ESCOM) del Instituto Politécnico Nacional (IPN). El proyecto consiste en el diseño, modelado e implementación de un sistema de gestión integral para el restaurante **"Los Consentidos"**, establecimiento de comida tradicional mexicana ubicado en la colonia Lindavista, Ciudad de México.

El sistema fue desarrollado como una aplicación web desplegada en GitHub Pages, utilizando HTML5, CSS3 y JavaScript vanilla como tecnologías de frontend, y Supabase, PostgreSQL en la nube, como backend de base de datos. La solución permite digitalizar y automatizar las operaciones críticas del restaurante: toma de órdenes en mesa, control de inventario de ingredientes, gestión de personal, administración de caja y generación de reseñas de clientes mediante códigos QR.

El proyecto es el resultado de cuatro prácticas progresivas que abarcan desde el levantamiento de requerimientos y el modelado conceptual, Modelo E-R y E-R Extendido, pasando por la transformación al modelo relacional, hasta la implementación física con DDL y la asignación de permisos con DCL. Cada etapa se encuentra documentada en las secciones correspondientes de este documento.

---

## 2. Planteamiento del Problema

### 2.1 Descripción de la Problemática

El restaurante **"Los Consentidos"** operaba con un modelo de gestión completamente manual que presentaba múltiples vulnerabilidades operativas. Los procesos críticos afectados eran los siguientes:

- **Gestión de órdenes en papel:** Cada mesero contaba con una libreta personal donde anotaba el número de mesa, los platillos solicitados, sus precios y el total. Este proceso generaba errores frecuentes al no recordar los pedidos correctamente o al realizar cálculos aritméticos equivocados.

- **Cuadre de caja manual:** Al final de cada jornada, el cajero debía conciliar el dinero en caja contra la suma de todas las órdenes registradas. La posibilidad de errores humanos en este proceso representaba un riesgo financiero directo para el negocio.

- **Control de inventario deficiente:** El inventario de ingredientes se llevaba en papel y no se actualizaba en tiempo real, lo que causaba que ciertos insumos se agotaran sin previo aviso, resultando en clientes insatisfechos y compras reactivas a proveedores.

### 2.2 Levantamiento de Requerimientos

Se realizó una entrevista simulada entre el analista del equipo y el dueño del restaurante, de la cual se extrajeron los siguientes requerimientos funcionales del sistema:

- Registrar y vincular cada orden con el mesero responsable y la mesa atendida.
- Permitir el registro de múltiples platillos con cantidad en una sola orden.
- Alertar cuando algún ingrediente del inventario esté por debajo de su cantidad mínima.
- Asociar cada ingrediente con su proveedor correspondiente.
- Registrar los ingresos diarios basados en la suma total de las órdenes cobradas.
- Registrar egresos por compras realizadas a proveedores.
- Proporcionar acceso a información del personal del restaurante.
- Identificar los platillos más ordenados para gestionar la demanda de ingredientes.

---

## 3. Diseño Conceptual — Modelos E-R y EER

### 3.1 Identificación de Entidades (Modelo E-R)

A partir del análisis del problema y el levantamiento de requerimientos, se identificaron las siguientes entidades para el modelo E-R inicial:

| Entidad | Descripción |
|---|---|
| EMPLEADO | Trabajadores del restaurante: cajero, meseros, lavalozas, repartidores, cocineros. |
| PLATILLO | Comidas y bebidas que el restaurante ofrece en su menú. |
| MESA | Espacio físico que ocupan los clientes dentro del restaurante. |
| INGREDIENTE | Insumos del inventario utilizados para preparar los platillos. |
| PROVEEDOR | Empresas o personas que abastecen al restaurante de ingredientes. |
| ORDEN | Registro de la prestación del servicio a una mesa con sus platillos. |
| DETALLE_ORDEN | Entidad débil que registra cada platillo y su cantidad dentro de una orden. |
| PRESUPUESTO | Dinero disponible acumulado del restaurante. |
| INGRESO | Dinero recibido por la prestación del servicio, dependiente de Orden. |
| EGRESO | Pagos realizados a proveedores por compra de insumos. |

**Tabla 1. Entidades identificadas en el modelo E-R.**

### 3.2 Relaciones y Cardinalidades

Las relaciones entre entidades se definieron con cardinalidades mínimas y máximas, como parte del modelo EER, incorporando restricciones operativas reales del negocio:

| Relación | Tipo | Cardinalidad | Descripción |
|---|---:|---:|---|
| EMPLEADO – atiende – MESA | 1:N | (1,4) : (1,1) | Un mesero atiende entre 1 y 4 mesas simultáneamente. |
| EMPLEADO – genera – ORDEN | 1:N | (1,N) : (1,1) | Un mesero genera muchas órdenes; cada orden tiene un solo mesero. |
| ORDEN – contiene – DETALLE_ORDEN | 1:N | (1,N) : (1,30) | Una orden tiene entre 1 y 30 renglones de detalle. |
| DETALLE_ORDEN – incluye – PLATILLO | N:M | (1,30) : (0,N) | Un platillo puede aparecer en múltiples detalles de orden. |
| PROVEEDOR – vende – INGREDIENTE | N:M | (0,N) : (1,10) | Un proveedor puede surtir hasta 10 ingredientes distintos. |
| ORDEN – genera – INGRESO | 1:1 | (1,1) : (1,1) | Cada orden genera exactamente un ingreso al cobrarse. |
| INGRESO – aumenta – PRESUPUESTO | N:1 | (N,1) : (1,1) | Muchos ingresos aumentan el presupuesto del restaurante. |
| EGRESO – disminuye – PRESUPUESTO | N:1 | (N,1) : (1,1) | Muchos egresos disminuyen el presupuesto del restaurante. |
| PROVEEDOR – genera – EGRESO | 1:N | (1,N) : (1,1) | Un proveedor genera múltiples egresos; cada egreso va a un proveedor. |

**Tabla 2. Relaciones y cardinalidades del modelo EER.**

### 3.3 Jerarquía ISA — Especialización de Empleados

Se identificó que agrupar a todos los trabajadores en una única entidad EMPLEADO generaba atributos nulos innecesarios. Por ejemplo, un cocinero no tiene propinas acumuladas y un cajero no tiene zona asignada. Se diseñó la siguiente jerarquía de especialización:

- **Supertipo:** EMPLEADO, que contiene atributos globales: número de empleado, nombre, apellidos, teléfono, fecha de ingreso y fecha de egreso.
- **Subtipo MESERO:** Atributos específicos: zona_asignada y propinas_acumuladas.
- **Subtipo COCINERO:** Atributos específicos: especialidad y certificacion_sanitaria.
- **Subtipo CAJERO:** Atributos específicos: caja_asignada y caja_faltante.

La especialización es **disjunta**, porque un empleado pertenece a un solo subtipo activo, y **total**, porque todo empleado debe pertenecer obligatoriamente a algún subtipo.

### 3.4 Entidades Débiles

- **DETALLE_ORDEN, dependencia de identificación:** No tiene identificador propio. Su clave primaria es compuesta: `(orden_id, platillo_id)`. Si una orden se elimina, todos sus detalles se eliminan en cascada. Esta entidad resuelve el requerimiento de registrar múltiples platillos con cantidad en una sola orden.

- **INGRESO, dependencia de existencia:** Posee su propio ID, pero no puede existir sin la orden que lo origina. Si la orden se cancela antes de cobrarse, el ingreso debe eliminarse con ella.

### 3.5 Diagrama E-R (Práctica 1)

Insertar aquí el Diagrama E-R de la Práctica 1, con notación Crow's Feet.

<!-- Cuando subas la imagen, deja esta etiqueta. GitHub renderiza este HTML dentro del Markdown y conserva lazy loading. -->
<img src="imagenes/diagrama-er.png" alt="Diagrama E-R de la Práctica 1" loading="lazy">

### 3.6 Diagrama EER — Notación Crow's Feet (Práctica 2)

Insertar aquí el Diagrama EER de la Práctica 2, con notación Crow's Feet, jerarquía ISA y cardinalidades min/max.

<img src="imagenes/diagrama-eer.png" alt="Diagrama EER con notación Crow's Feet" loading="lazy">

---

## 4. Modelo Relacional

### 4.1 Estrategia de Transformación

La transformación del modelo EER al modelo relacional se realizó aplicando las ocho reglas estándar de conversión. Las decisiones de diseño más relevantes fueron:

- **Jerarquía ISA, Estrategia A — múltiples tablas:** Se creó una tabla por cada subtipo, MESERO, COCINERO y CAJERO, cuya PK es a la vez FK que referencia a EMPLEADO. Esta estrategia elimina valores NULL innecesarios y facilita la escalabilidad, ya que agregar un subtipo nuevo en el futuro no altera las tablas existentes.

- **Atributos multivaluados:** El teléfono de EMPLEADO y de PROVEEDOR se extrajo a tablas separadas, EMPLEADO_TELEFONO y PROVEEDOR_TELEFONO, con PK compuesta.

- **Relación N:M PROVEEDOR–INGREDIENTE:** Se creó la tabla asociativa PROVEEDOR_INGREDIENTE.

- **Relación 1:1 ORDEN–INGRESO:** Se propagó orden_id como FK UNIQUE NOT NULL en INGRESO, garantizando que ninguna orden se cobre dos veces.

- **Entidad débil DETALLE_ORDEN:** PK compuesta `(orden_id, platillo_id)` con `ON DELETE CASCADE`, para asegurar que eliminar una orden borre automáticamente sus renglones de detalle.

### 4.2 Tablas Resultantes del Esquema Relacional

El modelo relacional final del restaurante Los Consentidos está compuesto por 16 tablas:

| Tabla | Tipo | Descripción |
|---|---|---|
| EMPLEADO | Fuerte / Supertipo | Datos generales de todos los empleados. |
| MESERO | Subtipo (ISA) | Atributos específicos del rol mesero; PK es FK a EMPLEADO. |
| COCINERO | Subtipo (ISA) | Atributos específicos del rol cocinero; PK es FK a EMPLEADO. |
| CAJERO | Subtipo (ISA) | Atributos específicos del rol cajero; PK es FK a EMPLEADO. |
| EMPLEADO_TELEFONO | Multivaluado | Teléfonos del empleado, con PK compuesta por numero_empleado y telefono. |
| PLATILLO | Fuerte | Catálogo de platillos del menú con precio y frecuencia. |
| PROVEEDOR | Fuerte | Empresas proveedoras de insumos. |
| PROVEEDOR_TELEFONO | Multivaluado | Teléfonos del proveedor, con PK compuesta por proveedor_id y telefono. |
| INGREDIENTE | Fuerte | Insumos del inventario con existencia, mínimo y unidad. |
| PROVEEDOR_INGREDIENTE | Asociativa N:M | Tabla puente entre proveedor e ingrediente. |
| MESA | Fuerte | Mesas del restaurante con posición y estado. |
| ORDEN | Fuerte / Transaccional | Registro de cada servicio prestado a una mesa. |
| DETALLE_ORDEN | Débil, identificación | Renglones de platillo dentro de una orden, con PK compuesta. |
| INGRESO | Débil, existencia | Registro financiero del cobro de una orden, con relación 1:1 con ORDEN. |
| PRESUPUESTO | Fuerte | Presupuesto acumulado del restaurante, con PK compuesta por monto y fecha. |
| EGRESO | Fuerte / Transaccional | Pagos realizados a proveedores. |

**Tabla 3. Las 16 tablas del esquema relacional.**

### 4.3 Diagrama del Modelo Relacional

Insertar aquí el diagrama del modelo relacional completo de la Práctica 3.

<img src="imagenes/modelo-relacional.png" alt="Diagrama del modelo relacional del sistema" loading="lazy">

### 4.4 Diccionario de Datos

A continuación, se muestra el diccionario de datos de la tabla EMPLEADO como ejemplo representativo.

| Tabla | Columna | Tipo | Restricciones | Descripción |
|---|---|---|---|---|
| EMPLEADO | numero_empleado | SERIAL | PK, NOT NULL | Identificador único del empleado. |
| EMPLEADO | nombre | VARCHAR(60) | NOT NULL | Nombre del empleado. |
| EMPLEADO | apellido_paterno | VARCHAR(60) | NOT NULL | Primer apellido. |
| EMPLEADO | apellido_materno | VARCHAR(60) | NOT NULL | Segundo apellido. |
| EMPLEADO | puesto | VARCHAR(40) | NOT NULL | Cargo en el restaurante. |
| EMPLEADO | fecha_ingreso | DATE | NOT NULL | Fecha de contratación. |
| EMPLEADO | fecha_egreso | DATE | CHECK | Fecha de baja. |

**Tabla 4. Diccionario de datos.**

---

## 5. Implementación — DDL y Restricciones de Dominio

### 5.1 Sistema Gestor de Base de Datos

Para la implementación final del proyecto se utilizó Supabase como backend de base de datos, el cual expone una instancia de PostgreSQL en la nube. Esta elección permitió el despliegue sin servidor de la aplicación en GitHub Pages, ya que Supabase ofrece una API REST y credenciales de acceso público, anon key, que el frontend consume directamente mediante JavaScript.

Durante el desarrollo de la Práctica 4 se utilizó MySQL 9.0 con MySQL Workbench 8.0 para la implementación y prueba local del DDL. El esquema resultante es compatible con PostgreSQL, Supabase, con ajustes menores en la sintaxis, como `SERIAL` en lugar de `AUTO_INCREMENT` y `DEFAULT CURRENT_DATE` sin paréntesis.

### 5.2 Creación del Esquema — DDL Principal

Las tablas se crean en el orden correcto respetando las dependencias de claves foráneas, es decir, tablas padre antes que hijas. A continuación se muestran fragmentos representativos del DDL:

```sql
-- Tabla EMPLEADO, supertipo de la jerarquía ISA
CREATE TABLE EMPLEADO (
    numero_empleado SERIAL NOT NULL,
    nombre VARCHAR(60) NOT NULL,
    apellido_paterno VARCHAR(60) NOT NULL,
    apellido_materno VARCHAR(60),
    puesto VARCHAR(40) NOT NULL,
    fecha_ingreso DATE NOT NULL DEFAULT CURRENT_DATE,
    fecha_egreso DATE,
    CONSTRAINT pk_empleado PRIMARY KEY (numero_empleado),
    CONSTRAINT chk_egreso CHECK (
        fecha_egreso IS NULL OR fecha_egreso >= fecha_ingreso
    )
);

-- Tabla DETALLE_ORDEN, entidad débil por identificación
CREATE TABLE DETALLE_ORDEN (
    orden_id INTEGER NOT NULL,
    platillo_id INTEGER NOT NULL,
    cantidad INTEGER NOT NULL DEFAULT 1,
    CONSTRAINT pk_detalle PRIMARY KEY (orden_id, platillo_id),
    CONSTRAINT fk_det_orden FOREIGN KEY (orden_id)
        REFERENCES ORDEN(id) ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT fk_det_platillo FOREIGN KEY (platillo_id)
        REFERENCES PLATILLO(id) ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT chk_cantidad CHECK (cantidad BETWEEN 1 AND 30)
);
```

### 5.3 Restricciones de Dominio Implementadas

Se implementaron 14 restricciones `CHECK` que codifican reglas de negocio directamente en la base de datos, de modo que ninguna capa de la aplicación pueda eludirlas:

- `precio > 0` en PLATILLO: un platillo sin precio o con precio negativo es un error de captura.
- `frecuencia >= 0` en PLATILLO: el contador de ventas no puede ser negativo.
- `existencia >= 0` en INGREDIENTE: no se pueden tener kilos negativos en inventario.
- `minimo > 0` en INGREDIENTE: el umbral de alerta debe ser positivo.
- `unidad IN ('KG','PZ','LTS')` en INGREDIENTE: catálogo cerrado para estandarizar el inventario.
- `posicion IN ('Interior','Exterior','Terraza')` en MESA: solo existen tres zonas físicas.
- `numero_mesa > 0` en MESA: los números de mesa comienzan en 1.
- `fecha_egreso IS NULL OR fecha_egreso >= fecha_ingreso` en EMPLEADO: coherencia de fechas laborales.
- `propinas_acumuladas >= 0` en MESERO: las propinas son siempre positivas.
- `caja_faltante >= 0` en CAJERO: el faltante de arqueo nunca es negativo.
- `cantidad BETWEEN 1 AND 30` en DETALLE_ORDEN: implementa la cardinalidad `(1,30)` del modelo EER.
- `cuenta_total >= 0` en ORDEN: la cuenta de una mesa no puede ser negativa.
- `monto > 0` en EGRESO: todo pago a proveedor es positivo.
- `monto > 0` en INGRESO: un ingreso de cero pesos no tiene sentido contable.

### 5.4 Acciones Referenciales (ON DELETE / ON UPDATE)

La decisión entre `ON DELETE CASCADE` y `ON DELETE RESTRICT` no es técnica sino de negocio. El criterio aplicado fue:

- **CASCADE:** Para entidades débiles y datos que no tienen valor sin su padre. Por ejemplo, los renglones de DETALLE_ORDEN no existen sin su ORDEN; los registros de INGRESO no existen sin su ORDEN.

- **RESTRICT:** Para proteger el historial financiero y operativo. Por ejemplo, no se puede eliminar un PROVEEDOR si tiene EGRESOS asociados; no se puede eliminar un MESERO si tiene MESAS u ÓRDENES asignadas.

---

## 6. Seguridad y Control de Acceso — DCL

### 6.1 Diseño de Roles del Sistema

Siguiendo el principio de privilegio mínimo, se diseñaron cuatro roles que reflejan los perfiles de acceso del restaurante. El uso de roles, en lugar de asignar permisos directamente a usuarios, facilita la escalabilidad: al contratar un nuevo cajero, basta asignarle el rol existente sin tener que reescribir sentencias `GRANT` individuales.

| Rol | Perfil | Tablas / Privilegios |
|---|---|---|
| admin_db | Administrador de BD. Mantenimiento, respaldos y gestión de usuarios. | ALL PRIVILEGES en todas las tablas, DDL + DML + DCL. |
| gerente | Gerente del restaurante. Revisa reportes, gestiona inventario y nómina. | SELECT, INSERT, UPDATE, DELETE en todas las tablas transaccionales, sin DDL. |
| cajero | Cajero en caja registradora. Toma y liquida órdenes. | PLATILLO (SELECT), ORDEN (SELECT/INSERT/UPDATE), DETALLE_ORDEN (SELECT/INSERT/UPDATE), INGRESO (SELECT/INSERT). |
| mesero_app | Aplicación en tableta del mesero. Registra pedidos en mesa. | PLATILLO (SELECT), MESA (SELECT), ORDEN (INSERT), DETALLE_ORDEN (INSERT). Sin acceso a datos financieros. |

**Tabla 5. Roles y privilegios del sistema.**

---

## 7. Arquitectura del Sistema

### 7.1 Stack Tecnológico

- **Frontend:** HTML5, CSS3, JavaScript vanilla. Desplegado en GitHub Pages.
- **Repositorio:** `https://github.com/aeiou520814-del/abc`
- **Backend / Base de Datos:** Supabase, PostgreSQL gestionado en la nube. Proporciona API REST y credenciales URL + anon key consumidas directamente desde el frontend.
- **Tipografías:** Cormorant Garamond para títulos y Montserrat para cuerpo, cargadas desde Google Fonts.
- **Estructura de archivos:** `index.html`, `styles.css`, `app.js` y `config.js`.

### 7.2 Diagrama de Arquitectura

Insertar aquí un diagrama de arquitectura que muestre:

```txt
Navegador Web → app.js → Supabase API REST → PostgreSQL
```

<img src="imagenes/arquitectura.png" alt="Diagrama de arquitectura del sistema" loading="lazy">

### 7.3 Módulos Funcionales

La aplicación está estructurada en siete módulos accesibles desde la barra de navegación. Cada módulo corresponde a una o más operaciones CRUD sobre las tablas del esquema relacional:

| Módulo | Sección en UI | Operaciones sobre BD |
|---|---|---|
| Menú | `#menu` | SELECT platillos por categoría, INSERT platillo nuevo. |
| Órdenes | `#ordenes` | INSERT en ORDEN y DETALLE_ORDEN, UPDATE estado pendiente a servido. |
| Inventario | `#inventario` | SELECT ingredientes, alerta cuando existencia < minimo, INSERT ingrediente, UPDATE existencia. |
| Personal | `#meseros` | SELECT empleados con subtipo, INSERT empleado nuevo en EMPLEADO + subtipo correspondiente. |
| Mesas | `#mesas` | SELECT estado de mesas, UPDATE estado libre/ocupada, función de inicializar layout. |
| Caja | `#caja` | SELECT órdenes pendientes de cobro, INSERT en INGRESO al procesar pago, generación de ticket imprimible. |
| Reseñas | `#resenas` | Generación de código QR por mesa para formulario público, INSERT reseña con calificación y comentario. |

**Tabla 6. Módulos del sistema y su relación con la base de datos.**

---

## 8. Pruebas de Integridad y Seguridad

Se ejecutaron pruebas de validación para verificar que todas las restricciones DDL y los permisos DCL funcionan correctamente. La siguiente tabla documenta los casos de prueba más representativos. El conjunto completo de 12 pruebas DDL y 6 pruebas DCL se encuentra en la Práctica 4, Sección 6.

| # | Operación SQL / Acción | Resultado Esperado | Resultado Obtenido |
|---:|---|---|---|
| 1 | INSERT INTO PLATILLO con precio = -50.00 | Error CHECK chk_precio | Error Code 3819: Check constraint 'chk_precio' is violated. |
| 2 | INSERT INTO DETALLE_ORDEN con cantidad = 31 | Error CHECK chk_cantidad | Error Code 3819: Check constraint 'chk_cantidad' is violated. |
| 3 | INSERT INTO INGREDIENTE con unidad = 'ML' | Error CHECK chk_unidad | Error Code 3819: Check constraint 'chk_unidad' is violated. |
| 4 | INSERT duplicado de nombre en PROVEEDOR | Error UNIQUE | Error Code 1062: Duplicate entry para clave 'proveedor.nombre'. |
| 5 | UPDATE EMPLEADO con fecha_egreso anterior a fecha_ingreso | Error CHECK chk_fechas_emp | Error Code 3819: Check constraint 'chk_fechas_emp' is violated. |
| 6 | DELETE ORDEN con id = 7, tiene 3 detalles | Orden eliminada; 3 DETALLE_ORDEN eliminados en cascada. | Éxito. SELECT COUNT(*) FROM DETALLE_ORDEN WHERE id_orden = 7 → 0 filas. |
| 7 | DELETE MESERO con mesas asignadas activas | Error RESTRICT, FK | Error Code 1451: Cannot delete a parent row, FK fk_mesa_mesero. |
| 8 | tablet_mesero intenta SELECT * FROM INGRESO | Error de permisos | Error Code 1142: SELECT command denied to user 'tablet_mesero'. |
| 9 | caja_01 intenta DROP TABLE PLATILLO | Error de permisos, sin DDL | Error Code 1142: DROP command denied to user 'caja_01'. |
| 10 | INSERT segunda vez el mismo id_orden en INGRESO | Error UNIQUE, doble cobro | Error Code 1062: Duplicate entry para clave 'ingreso.id_orden'. |

**Tabla 7. Casos de prueba de integridad y seguridad.**

---

## Nota sobre imágenes y carga diferida

Este archivo Markdown usa etiquetas HTML `<img>` para las imágenes, porque así se puede agregar el atributo `loading="lazy"`. Cuando agregues las imágenes al repositorio, súbelas en una carpeta llamada `imagenes` con estos nombres:

```txt
imagenes/diagrama-er.png
imagenes/diagrama-eer.png
imagenes/modelo-relacional.png
imagenes/arquitectura.png
```

Cada imagen ya está referenciada con una etiqueta de este tipo:

```html
<img src="imagenes/diagrama-er.png" alt="Diagrama E-R de la Práctica 1" loading="lazy">
```
