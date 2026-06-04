# Documentación Técnica del Proyecto: Los Consentidos

## Índice

1. [Introducción](#1-introducción)
2. [Planteamiento del Problema](#2-planteamiento-del-problema)
   - [2.1 Descripción de la Problemática](#21-descripción-de-la-problemática)
   - [2.2 Levantamiento de Requerimientos](#22-levantamiento-de-requerimientos)
3. [Diseño Conceptual](#3-diseño-conceptual)
   - [3.1 Identificación de Entidades](#31-identificación-de-entidades)
   - [3.2 Relaciones y Cardinalidades](#32-relaciones-y-cardinalidades)
   - [3.3 Jerarquía ISA](#33-jerarquía-isa)
   - [3.4 Entidades Débiles](#34-entidades-débiles)
   - [3.5 Diagrama EER](#35-diagrama-eer)
4. [Modelo Relacional](#4-modelo-relacional)
   - [4.1 Estrategia de Transformación](#41-estrategia-de-transformación)
   - [4.2 Tablas Resultantes del Esquema Relacional](#42-tablas-resultantes-del-esquema-relacional)
   - [4.3 Diagrama del Modelo Relacional](#43-diagrama-del-modelo-relacional)
   - [4.4 Diccionario de Datos](#44-diccionario-de-datos)
5. [Implementación — DDL y Restricciones de Dominio](#5-implementación--ddl-y-restricciones-de-dominio)
   - [5.1 Sistema Gestor de Base de Datos](#51-sistema-gestor-de-base-de-datos)
   - [5.2 Creación del Esquema — DDL Principal](#52-creación-del-esquema--ddl-principal)
   - [5.3 Restricciones de Dominio Implementadas](#53-restricciones-de-dominio-implementadas)
6. [Arquitectura del Sistema](#6-arquitectura-del-sistema)
   - [6.1 Stack Tecnológico](#61-stack-tecnológico)
   - [6.2 Módulos Funcionales](#62-módulos-funcionales)
7. [Pruebas de Integridad y Seguridad](#7-pruebas-de-integridad-y-seguridad)

---

## 1. Introducción

El presente documento constituye la documentación técnica completa del proyecto final de la materia **Bases de Datos**, desarrollado por el equipo del Grupo **3CV2** de la Escuela Superior de Cómputo (**ESCOM**) del Instituto Politécnico Nacional (**IPN**). El proyecto consiste en el diseño, modelado e implementación de un sistema de gestión integral para el restaurante **"Los Consentidos"**, establecimiento de comida tradicional mexicana ubicado en la colonia Lindavista, Ciudad de México.

El sistema fue desarrollado como una aplicación web desplegada en **GitHub Pages**, utilizando **HTML5**, **CSS3** y **JavaScript vanilla** como tecnologías de frontend, y **Supabase** (**PostgreSQL** en la nube) como backend de base de datos. La solución permite digitalizar y automatizar las operaciones críticas del restaurante: toma de órdenes en mesa, control de inventario de ingredientes, gestión de personal, administración de caja y generación de reseñas de clientes mediante códigos QR.

El proyecto es el resultado de cuatro prácticas progresivas que abarcan desde el levantamiento de requerimientos y el modelado conceptual (**Modelo E-R** y **E-R Extendido**), pasando por la transformación al modelo relacional, hasta la implementación física con **DDL** y la asignación de permisos con **DCL**. Cada etapa se encuentra documentada en las secciones correspondientes de este documento.

---

## 2. Planteamiento del Problema

### 2.1 Descripción de la Problemática

El restaurante **"Los Consentidos"** operaba con un modelo de gestión completamente manual que presentaba múltiples vulnerabilidades operativas. Los procesos críticos afectados eran los siguientes:

- **Gestión de órdenes en papel:** cada mesero contaba con una libreta personal donde anotaba el número de mesa, los platillos solicitados, sus precios y el total. Este proceso generaba errores frecuentes al no recordar los pedidos correctamente o al realizar cálculos aritméticos equivocados.
- **Cuadre de caja manual:** al final de cada jornada, el cajero debía conciliar el dinero en caja contra la suma de todas las órdenes registradas. La posibilidad de errores humanos en este proceso representaba un riesgo financiero directo para el negocio.
- **Control de inventario deficiente:** el inventario de ingredientes se llevaba en papel y no se actualizaba en tiempo real, lo que causaba que ciertos insumos se agotaran sin previo aviso, resultando en clientes insatisfechos y compras reactivas a proveedores.

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

## 3. Diseño Conceptual

### 3.1 Identificación de Entidades

A partir del análisis del problema y el levantamiento de requerimientos, se identificaron las siguientes entidades para el modelo E-R inicial, las cuales se corresponden directamente con las tablas presentes en el diagrama relacional final:

| Entidad | Descripción |
|---|---|
| EMPLEADO | Trabajadores del restaurante. Contiene nombre, apellidos, teléfono, fecha de ingreso, fecha de egreso, rol y turno. |
| PLATILLO | Comidas y bebidas ofrecidas en el menú, con nombre, precio, stock e id de categoría. |
| MESA | Espacio físico ocupado por los clientes; registra número, estado, id de orden activa y hora de ocupación. |
| INGREDIENTES | Insumos del inventario utilizados para preparar los platillos, con unidad de medida y cantidad mínima. |
| PROVEEDORES | Empresas o personas que abastecen al restaurante de ingredientes. |
| ORDEN | Registro del servicio prestado a una mesa, con fecha, empleado responsable, mesa y fuente de la orden. |
| DETALLE_ORDEN | Entidad débil que registra cada platillo y su cantidad dentro de una orden (id_orden + id_platillo). |
| RECETA | Tabla asociativa que vincula platillo con ingredientes, indicando la cantidad usada de cada ingrediente. |
| INVENTARIO | Registro de movimientos de inventario por ingrediente, con fecha y cantidad. |
| INGRESO | Dinero recibido; vinculado a una orden, con monto, fecha, método de pago y número de comensales. |
| EGRESOS | Pagos realizados a proveedores por compra de insumos, referenciando inventario y proveedor. |
| CATEGORIAS | Catálogo de categorías de platillos (relación con PLATILLO). |
| ROLES | Catálogo de roles del personal (relación con EMPLEADO). |
| RESENA | Reseñas de clientes asociadas a un número de mesa, con calificación, comentario y fecha. |

**Tabla 1. Entidades identificadas en el modelo E-R**

### 3.2 Relaciones y Cardinalidades

Las relaciones entre entidades se definieron con cardinalidades mínimas y máximas conforme al modelo EER. Las relaciones se derivan directamente de las claves foráneas visibles en el diagrama relacional:

| Relación | Tipo | Cardinalidad | Descripción |
|---|---:|---|---|
| EMPLEADO – genera – ORDEN | 1:N | (1,N) : (1,1) | Un empleado genera muchas órdenes; cada orden tiene un solo empleado responsable (FK: orden.empleado). |
| ORDEN – registrada en – MESA | N:1 | (N,1) : (0,1) | Muchas órdenes pueden registrarse en una misma mesa; una mesa tiene como máximo una orden activa (FK: orden.mesa / mesa.id_orden_activa). |
| ORDEN – contiene – DETALLE_ORDEN | 1:N | (1,N) : (1,30) | Una orden tiene entre 1 y 30 renglones de detalle (FK: detalle_orden.id_orden). |
| DETALLE_ORDEN – referencia – PLATILLO | N:1 | (N,1) : (1,1) | Cada renglón de detalle referencia un platillo (FK: detalle_orden.id_platillo). |
| PLATILLO – descrito en – RECETA | 1:N | (1,N) : (1,1) | Un platillo puede tener múltiples renglones de receta, uno por ingrediente (FK: receta.id_platillo). |
| RECETA – usa – INGREDIENTES | N:1 | (N,1) : (1,1) | Cada renglón de receta referencia un ingrediente (FK: receta.id_ingrediente). |
| INGREDIENTES – registrado en – INVENTARIO | 1:N | (1,N) : (1,1) | Un ingrediente tiene múltiples registros de movimiento de inventario (FK: inventario.id_ingrediente). |
| INVENTARIO – genera – EGRESOS | 1:N | (0,N) : (1,1) | Un movimiento de inventario puede generar uno o más egresos (FK: egresos.id_inventario). |
| PROVEEDORES – asociado en – EGRESOS | 1:N | (0,N) : (1,1) | Un proveedor puede tener múltiples egresos asociados (FK: egresos.id_proveedor). |
| ORDEN – genera – INGRESO | 1:1 | (1,1) : (1,1) | Cada orden al cobrarse genera exactamente un ingreso (FK: ingreso.id_orden). |
| PLATILLO – clasificado en – CATEGORIAS | N:1 | (N,1) : (1,1) | Muchos platillos pertenecen a una categoría (FK: platillo.id_categorias). |
| EMPLEADO – tiene – ROLES | N:1 | (N,1) : (1,1) | Muchos empleados pueden tener el mismo rol (FK: empleado.rol). |
| MESA – tiene – RESENA | 1:N | (0,N) : (1,1) | Una mesa puede recibir múltiples reseñas de clientes (FK: resena.numero_mesa). |

**Tabla 2. Relaciones y cardinalidades del modelo EER**

### 3.3 Jerarquía ISA

En el diagrama relacional, la tabla **EMPLEADO** centraliza todos los atributos del personal sin subtipos explícitos. Esto refleja una estrategia de tabla única, donde el campo **rol** (`INT`, FK → `ROLES`) discrimina el tipo de empleado y el campo **turno** (`VARCHAR(50)`) diferencia el horario asignado. En el modelo conceptual EER, esta decisión corresponde a:

- **Supertipo EMPLEADO:** contiene atributos globales: nombre, paterno, materno, teléfono, fecha_ingreso, fecha_egreso, rol y turno.
- **Discriminador de tipo:** el campo rol (FK → tabla ROLES) identifica el perfil del trabajador, como mesero, cocinero, cajero, etc.
- **Especialización disjunta y total:** todo empleado debe tener un rol asignado y pertenece a un único perfil.

La tabla **ROLES** (`id INT`, `nombre_rol VARCHAR`) actúa como catálogo de los tipos de empleado admitidos en el sistema.

### 3.4 Entidades Débiles

- **DETALLE_ORDEN** (dependencia de identificación): su clave primaria es compuesta (`id_orden` + `id_platillo`). No tiene significado sin la orden que la contiene. Si una orden se elimina, todos sus renglones se eliminan en cascada. Esta entidad resuelve el requerimiento de registrar múltiples platillos con cantidad variable en una sola orden.
- **RECETA** (dependencia de identificación): tabla puente entre **PLATILLO** e **INGREDIENTES**. Su identidad depende de ambas claves foráneas (`id_platillo` + `id_ingrediente`). Almacena la `cantidad_usada` de cada ingrediente por platillo, habilitando el cálculo de consumo de inventario al procesar una orden.
- **INGRESO** (dependencia de existencia): posee su propio id, pero su existencia está condicionada a la orden que lo origina (FK: `id_orden`). Si la orden se cancela antes de cobrarse, el ingreso debe eliminarse con ella.

### 3.5 Diagrama EER

<img src="https://cdn.discordapp.com/attachments/1474619815225196635/1512152393473724476/9kX9qQAAAABklEQVQDAMp0R9zMNK9AAAAAElFTkSuQmCC.png?ex=6a230d29&is=6a21bba9&hm=018bb53314c11c6c1b051f8463fda5733bea8224847359051b7f5b36485524b6" alt="Diagrama EER del sistema Los Consentidos" loading="lazy">

---

## 4. Modelo Relacional

### 4.1 Estrategia de Transformación

La transformación del modelo EER al modelo relacional se realizó aplicando las ocho reglas estándar de conversión. Las decisiones de diseño más relevantes fueron:

- **Jerarquía ISA:** se utilizó el campo `rol` en la tabla **EMPLEADO** como discriminador, referenciando a la tabla **ROLES**.
- **Relaciones N:M:** se resolvieron mediante tablas asociativas, como **RECETA**, que conecta **PLATILLO** e **INGREDIENTES**.
- **Relación 1:1 ORDEN–INGRESO:** se propagó `id_orden` como FK en **INGRESO**, garantizando que ninguna orden se cobre dos veces.
- **Entidad débil DETALLE_ORDEN:** se implementó con referencia a **ORDEN** y **PLATILLO**, asegurando que los detalles dependan de una orden existente.
- **Control de inventario:** se modeló mediante **INGREDIENTES**, **INVENTARIO**, **RECETA**, **PROVEEDORES** y **EGRESOS**.

### 4.2 Tablas Resultantes del Esquema Relacional

El modelo relacional final del restaurante **Los Consentidos**, derivado del diagrama relacional entregado, está compuesto por 14 tablas:

| Tabla | Tipo | Descripción |
|---|---|---|
| EMPLEADO | Fuerte / Supertipo | Datos generales de todos los empleados: nombre, apellidos, teléfono, fechas de ingreso/egreso, rol (FK → ROLES) y turno. |
| ROLES | Catálogo | Catálogo de roles del personal (id, nombre_rol). Referenciado por EMPLEADO. |
| PLATILLO | Fuerte | Catálogo de platillos del menú con nombre, precio, stock e id_categorias (FK → CATEGORIAS). |
| CATEGORIAS | Catálogo | Catálogo de categorías de platillos (id, nombre). Referenciado por PLATILLO. |
| MESA | Fuerte | Mesas del restaurante: número, estado, id_orden_activa (FK → ORDEN) y hora_ocupada. |
| ORDEN | Fuerte / Transaccional | Registro de cada servicio prestado: fecha, empleado (FK → EMPLEADO), mesa (FK → MESA) y fuente. |
| DETALLE_ORDEN | Débil (identificación) | Renglones de platillo dentro de una orden (PK compuesta: id_orden + id_platillo, cantidad INT). |
| INGREDIENTES | Fuerte | Insumos del inventario con nombre, unidad y cantidad mínima de alerta. |
| RECETA | Asociativa N:M | Tabla puente entre PLATILLO e INGREDIENTES; almacena cantidad_usada por ingrediente por platillo. |
| INVENTARIO | Transaccional | Movimientos de inventario por ingrediente (id_ingrediente FK, fecha, cantidad). |
| PROVEEDORES | Fuerte | Empresas proveedoras de insumos (nombre, teléfono). |
| EGRESOS | Fuerte / Transaccional | Pagos a proveedores; referencia inventario (id_inventario FK) y proveedor (id_proveedor FK), monto y fecha. |
| INGRESO | Débil (existencia) | Registro financiero del cobro de una orden: id_orden (FK, 1:1), monto, fecha, método de pago, comensales. |
| RESENA | Transaccional | Reseñas de clientes por mesa (numero_mesa INT, calificación INT, comentario TEXT, fecha). |

**Tabla 3. Tablas del esquema relacional**

### 4.3 Diagrama del Modelo Relacional

<img src="https://cdn.discordapp.com/attachments/1474619815225196635/1512142639791870084/1f79e42e-b291-4254-bee1-a4f458ee004b.png?ex=6a230413&is=6a21b293&hm=cf9037f0001085b2a1c4bb0e110dcd0825753213da549179dd75ae7e1f88e0fa" alt="Diagrama del modelo relacional del sistema Los Consentidos" loading="lazy">

### 4.4 Diccionario de Datos

A continuación, se muestra el diccionario de datos de la tabla **EMPLEADO** como ejemplo representativo.

| Tabla | Columna | Tipo | Restricciones | Descripción |
|---|---|---|---|---|
| EMPLEADO | numero_empleado | SERIAL | PK, NOT NULL | Identificador único del empleado. |
| EMPLEADO | nombre | VARCHAR(60) | NOT NULL | Nombre del empleado. |
| EMPLEADO | apellido_paterno | VARCHAR(60) | NOT NULL | Primer apellido. |
| EMPLEADO | apellido_materno | VARCHAR(60) | NOT NULL | Segundo apellido. |
| EMPLEADO | puesto | VARCHAR(40) | NOT NULL | Cargo en el restaurante. |
| EMPLEADO | fecha_ingreso | DATE | NOT NULL | Fecha de contratación. |
| EMPLEADO | fecha_egreso | DATE | CHECK | Fecha de baja. |

**Tabla 4. Diccionario de datos**

---

## 5. Implementación — DDL y Restricciones de Dominio

### 5.1 Sistema Gestor de Base de Datos

Para la implementación final del proyecto se utilizó **Supabase** como backend de base de datos, el cual expone una instancia de **PostgreSQL** en la nube. Esta elección permitió el despliegue sin servidor de la aplicación en **GitHub Pages**, ya que Supabase ofrece una API REST y credenciales de acceso público (`anon key`) que el frontend consume directamente mediante JavaScript.

Durante el desarrollo de la Práctica 4 se utilizó **MySQL 9.0** con **MySQL Workbench 8.0** para la implementación y prueba local del DDL. El esquema resultante es compatible con PostgreSQL (Supabase) con ajustes menores en la sintaxis (`SERIAL` en lugar de `AUTO_INCREMENT`, tipos `TINYINT` manejados como `SMALLINT` en PostgreSQL).

### 5.2 Creación del Esquema — DDL Principal

Las tablas se crean en el orden correcto respetando las dependencias de claves foráneas. A continuación se muestran fragmentos representativos del DDL basados en el diagrama relacional:

```sql
-- Tabla ROLES (catálogo, sin dependencias)
CREATE TABLE roles (
    id INT NOT NULL AUTO_INCREMENT,
    nombre_rol VARCHAR(255) NOT NULL,
    CONSTRAINT pk_roles PRIMARY KEY (id)
);

-- Tabla EMPLEADO (referencia ROLES)
CREATE TABLE empleado (
    id INT NOT NULL AUTO_INCREMENT,
    nombre VARCHAR(255) NOT NULL,
    paterno VARCHAR(255),
    materno VARCHAR(255),
    telefono VARCHAR(20),
    fecha_ingreso DATE NOT NULL,
    fecha_egreso DATE,
    rol INT NOT NULL,
    turno VARCHAR(50),
    CONSTRAINT pk_empleado PRIMARY KEY (id),
    CONSTRAINT fk_emp_rol FOREIGN KEY (rol) REFERENCES roles(id),
    CONSTRAINT chk_egreso CHECK (
        fecha_egreso IS NULL OR fecha_egreso >= fecha_ingreso
    )
);

-- Tabla DETALLE_ORDEN (entidad débil)
CREATE TABLE detalle_orden (
    id INT NOT NULL AUTO_INCREMENT,
    id_orden INT NOT NULL,
    id_platillo INT NOT NULL,
    cantidad INT NOT NULL DEFAULT 1,
    CONSTRAINT pk_detalle PRIMARY KEY (id),
    CONSTRAINT uq_detalle UNIQUE (id_orden, id_platillo),
    CONSTRAINT fk_det_orden FOREIGN KEY (id_orden)
        REFERENCES orden(id) ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT fk_det_platillo FOREIGN KEY (id_platillo)
        REFERENCES platillo(id) ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT chk_cantidad CHECK (cantidad BETWEEN 1 AND 30)
);

-- Tabla RECETA (tabla asociativa PLATILLO — INGREDIENTES)
CREATE TABLE receta (
    id INT NOT NULL AUTO_INCREMENT,
    id_platillo INT NOT NULL,
    id_ingrediente INT NOT NULL,
    cantidad_usada DECIMAL(10,2) NOT NULL,
    CONSTRAINT pk_receta PRIMARY KEY (id),
    CONSTRAINT fk_rec_platillo FOREIGN KEY (id_platillo)
        REFERENCES platillo(id),
    CONSTRAINT fk_rec_ingrediente FOREIGN KEY (id_ingrediente)
        REFERENCES ingredientes(id)
);
```

### 5.3 Restricciones de Dominio Implementadas

Se implementaron restricciones `CHECK` que codifican las reglas de negocio directamente en la base de datos, en función de los atributos visibles en el diagrama relacional:

| Restricción CHECK | Justificación de negocio |
|---|---|
| precio > 0 en platillo | Un platillo sin precio o con precio negativo es un error de captura. |
| stock >= 0 en platillo | El stock de un platillo no puede ser negativo. |
| minimo > 0 en ingredientes | El umbral de alerta de inventario debe ser un valor positivo. |
| cantidad > 0 en inventario | Los movimientos de inventario deben registrar cantidades positivas. |
| cantidad BETWEEN 1 AND 30 en detalle_orden | Implementa la cardinalidad máxima (1,30) del modelo EER para renglones de orden. |
| cantidad_usada > 0 en receta | La cantidad de un ingrediente usada en una receta debe ser mayor que cero. |
| monto > 0 en egresos | Todo pago a proveedor debe ser de monto positivo. |
| monto > 0 en ingreso | Un ingreso de cero pesos no tiene sentido contable. |
| calificacion BETWEEN 1 AND 5 en resena | Las reseñas se califican en una escala del 1 al 5. |
| comensales > 0 en ingreso | El número de comensales por ingreso debe ser al menos 1. |
| fecha_egreso IS NULL OR fecha_egreso >= fecha_ingreso en empleado | Garantiza coherencia en las fechas laborales del empleado. |
| numero > 0 en mesa | Los números de mesa comienzan en 1. |

---

## 6. Arquitectura del Sistema

### 6.1 Stack Tecnológico

- **Frontend:** HTML5, CSS3, JavaScript vanilla. Desplegado en GitHub Pages.
- **Repositorio:** `https://github.com/aeiou520814-del/abc`.
- **Backend / Base de Datos:** Supabase — PostgreSQL gestionado en la nube. Proporciona API REST y credenciales (`URL` + `anon key`) consumidas directamente desde el frontend.
- **Tipografías:** Cormorant Garamond para títulos y Montserrat para cuerpo, cargadas desde Google Fonts.
- **Estructura de archivos:** `index.html` (interfaz y modales), `styles.css` (estilos), `app.js` (lógica de negocio y conexión a Supabase), `config.js` (credenciales de Supabase).

### 6.2 Módulos Funcionales

La aplicación está estructurada en siete módulos accesibles desde la barra de navegación. Cada módulo corresponde a una o más operaciones CRUD sobre las tablas del esquema relacional:

| Módulo | Sección en UI | Operaciones sobre BD |
|---|---|---|
| Menú | #menu | SELECT platillos por categoría, INSERT platillo nuevo. |
| Órdenes | #ordenes | INSERT en ORDEN y DETALLE_ORDEN, UPDATE estado pendiente → servido. |
| Inventario | #inventario | SELECT ingredientes, alerta cuando existencia < mínimo, INSERT ingrediente, UPDATE existencia. |
| Personal | #meseros | SELECT empleados con subtipo, INSERT empleado nuevo en EMPLEADO + subtipo correspondiente. |
| Mesas | #mesas | SELECT estado de mesas, UPDATE estado libre/ocupada, función de inicializar layout. |
| Caja | #caja | SELECT órdenes pendientes de cobro, INSERT en INGRESO al procesar pago, generación de ticket imprimible. |
| Reseñas | #resenas | Generación de código QR por mesa para formulario público, INSERT reseña con calificación y comentario. |

**Tabla 6. Módulos del sistema y su relación con la base de datos**

---

## 7. Pruebas de Integridad y Seguridad

Se ejecutaron pruebas de validación para verificar que todas las restricciones DDL y los permisos DCL funcionan correctamente. La siguiente tabla documenta los casos de prueba más representativos:

| # | Operación SQL / Acción | Resultado Esperado | Resultado Obtenido |
|---:|---|---|---|
| 1 | INSERT INTO PLATILLO con precio = -50.00 | Error CHECK chk_precio | Error Code 3819: Check constraint 'chk_precio' is violated. |
| 2 | INSERT INTO DETALLE_ORDEN con cantidad = 31 | Error CHECK chk_cantidad | Error Code 3819: Check constraint 'chk_cantidad' is violated. |
| 3 | INSERT INTO INGREDIENTE con unidad = 'ML' | Error CHECK chk_unidad | Error Code 3819: Check constraint 'chk_unidad' is violated. |
| 4 | INSERT duplicado de nombre en PROVEEDOR | Error UNIQUE | Error Code 1062: Duplicate entry para clave 'proveedor.nombre'. |
| 5 | UPDATE EMPLEADO con fecha_egreso anterior a fecha_ingreso | Error CHECK chk_fechas_emp | Error Code 3819: Check constraint 'chk_fechas_emp' is violated. |
| 6 | DELETE ORDEN con id = 7 (tiene 3 detalles) | Orden eliminada; 3 DETALLE_ORDEN eliminados en cascada. | Éxito. SELECT COUNT(*) FROM DETALLE_ORDEN WHERE id_orden = 7 → 0 filas. |
| 7 | DELETE MESERO con mesas asignadas activas | Error RESTRICT (FK) | Error Code 1451: Cannot delete a parent row (FK fk_mesa_mesero). |
| 8 | tablet_mesero intenta SELECT * FROM INGRESO | Error de permisos | Error Code 1142: SELECT command denied to user 'tablet_mesero'. |
| 9 | INSERT segunda vez el mismo id_orden en INGRESO | Error UNIQUE (doble cobro) | Error Code 1062: Duplicate entry para clave 'ingreso.id_orden'. |

**Tabla 7. Casos de prueba de integridad y seguridad**
