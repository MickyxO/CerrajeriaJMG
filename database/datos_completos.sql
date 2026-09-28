--
-- PostgreSQL database dump
--

\restrict pQe1nWOjcNLd82lNZeZcCfjUARRVUSfwYExf8I2xyfw73xHWLicYqZSOWUC2s8g

-- Dumped from database version 18.3
-- Dumped by pg_dump version 18.3

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

ALTER TABLE IF EXISTS ONLY public.ventas DROP CONSTRAINT IF EXISTS ventas_id_usuario_fkey;
ALTER TABLE IF EXISTS ONLY public.movimientos_inventario DROP CONSTRAINT IF EXISTS movimientos_inventario_id_usuario_fkey;
ALTER TABLE IF EXISTS ONLY public.movimientos_inventario DROP CONSTRAINT IF EXISTS movimientos_inventario_id_item_fkey;
ALTER TABLE IF EXISTS ONLY public.movimientos_caja DROP CONSTRAINT IF EXISTS movimientos_caja_id_usuario_fkey;
ALTER TABLE IF EXISTS ONLY public.movimientos_caja DROP CONSTRAINT IF EXISTS movimientos_caja_id_caja_fkey;
ALTER TABLE IF EXISTS ONLY public.items DROP CONSTRAINT IF EXISTS items_id_categoria_fkey;
ALTER TABLE IF EXISTS ONLY public.detalle_ventas DROP CONSTRAINT IF EXISTS detalle_ventas_id_venta_fkey;
ALTER TABLE IF EXISTS ONLY public.detalle_ventas DROP CONSTRAINT IF EXISTS detalle_ventas_id_item_fkey;
ALTER TABLE IF EXISTS ONLY public.caja DROP CONSTRAINT IF EXISTS caja_id_usuario_cierre_fkey;
ALTER TABLE IF EXISTS ONLY public.caja DROP CONSTRAINT IF EXISTS caja_id_usuario_apertura_fkey;
DROP INDEX IF EXISTS public.unique_caja_abierta;
ALTER TABLE IF EXISTS ONLY public.ventas DROP CONSTRAINT IF EXISTS ventas_pkey;
ALTER TABLE IF EXISTS ONLY public.usuarios DROP CONSTRAINT IF EXISTS usuarios_username_key;
ALTER TABLE IF EXISTS ONLY public.usuarios DROP CONSTRAINT IF EXISTS usuarios_pkey;
ALTER TABLE IF EXISTS ONLY public.movimientos_inventario DROP CONSTRAINT IF EXISTS movimientos_inventario_pkey;
ALTER TABLE IF EXISTS ONLY public.movimientos_caja DROP CONSTRAINT IF EXISTS movimientos_caja_pkey;
ALTER TABLE IF EXISTS ONLY public.items DROP CONSTRAINT IF EXISTS items_pkey;
ALTER TABLE IF EXISTS ONLY public.detalle_ventas DROP CONSTRAINT IF EXISTS detalle_ventas_pkey;
ALTER TABLE IF EXISTS ONLY public.categorias DROP CONSTRAINT IF EXISTS categorias_pkey;
ALTER TABLE IF EXISTS ONLY public.caja DROP CONSTRAINT IF EXISTS caja_pkey;
ALTER TABLE IF EXISTS public.ventas ALTER COLUMN id_venta DROP DEFAULT;
ALTER TABLE IF EXISTS public.usuarios ALTER COLUMN id_usuario DROP DEFAULT;
ALTER TABLE IF EXISTS public.movimientos_inventario ALTER COLUMN id_movimiento DROP DEFAULT;
ALTER TABLE IF EXISTS public.movimientos_caja ALTER COLUMN id_movimiento DROP DEFAULT;
ALTER TABLE IF EXISTS public.items ALTER COLUMN id_item DROP DEFAULT;
ALTER TABLE IF EXISTS public.detalle_ventas ALTER COLUMN id_detalle DROP DEFAULT;
ALTER TABLE IF EXISTS public.categorias ALTER COLUMN id_categoria DROP DEFAULT;
ALTER TABLE IF EXISTS public.caja ALTER COLUMN id_caja DROP DEFAULT;
DROP SEQUENCE IF EXISTS public.ventas_id_venta_seq;
DROP TABLE IF EXISTS public.ventas;
DROP SEQUENCE IF EXISTS public.usuarios_id_usuario_seq;
DROP TABLE IF EXISTS public.usuarios;
DROP SEQUENCE IF EXISTS public.movimientos_inventario_id_movimiento_seq;
DROP TABLE IF EXISTS public.movimientos_inventario;
DROP SEQUENCE IF EXISTS public.movimientos_caja_id_movimiento_seq;
DROP TABLE IF EXISTS public.movimientos_caja;
DROP SEQUENCE IF EXISTS public.items_id_item_seq;
DROP TABLE IF EXISTS public.items;
DROP SEQUENCE IF EXISTS public.detalle_ventas_id_detalle_seq;
DROP TABLE IF EXISTS public.detalle_ventas;
DROP SEQUENCE IF EXISTS public.categorias_id_categoria_seq;
DROP TABLE IF EXISTS public.categorias;
DROP SEQUENCE IF EXISTS public.caja_id_caja_seq;
DROP TABLE IF EXISTS public.caja;
SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: caja; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.caja (
    id_caja integer NOT NULL,
    fecha_apertura date DEFAULT CURRENT_DATE,
    hora_apertura timestamp without time zone DEFAULT timezone('UTC'::text, now()),
    hora_cierre timestamp without time zone,
    monto_inicial numeric(10,2) NOT NULL,
    monto_final numeric(10,2),
    monto_actual numeric(10,2) NOT NULL,
    id_usuario_apertura integer,
    id_usuario_cierre integer,
    estado character varying(20) DEFAULT 'ABIERTA'::character varying
);


ALTER TABLE public.caja OWNER TO postgres;

--
-- Name: caja_id_caja_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.caja_id_caja_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.caja_id_caja_seq OWNER TO postgres;

--
-- Name: caja_id_caja_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.caja_id_caja_seq OWNED BY public.caja.id_caja;


--
-- Name: categorias; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.categorias (
    id_categoria integer NOT NULL,
    nombre character varying(50) NOT NULL,
    clasificacion text DEFAULT 'Producto Automotriz'::text NOT NULL,
    imagen_url text
);


ALTER TABLE public.categorias OWNER TO postgres;

--
-- Name: categorias_id_categoria_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.categorias_id_categoria_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.categorias_id_categoria_seq OWNER TO postgres;

--
-- Name: categorias_id_categoria_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.categorias_id_categoria_seq OWNED BY public.categorias.id_categoria;


--
-- Name: detalle_ventas; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.detalle_ventas (
    id_detalle integer NOT NULL,
    id_venta integer,
    id_item integer,
    cantidad integer NOT NULL,
    precio_unitario numeric(10,2) NOT NULL,
    subtotal numeric(10,2) NOT NULL,
    nombre_item_snapshot character varying(150),
    id_combo integer,
    nombre_combo_snapshot character varying(100),
    precio_combo_unitario_snapshot numeric(10,2),
    combo_cantidad_snapshot integer
);


ALTER TABLE public.detalle_ventas OWNER TO postgres;

--
-- Name: detalle_ventas_id_detalle_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.detalle_ventas_id_detalle_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.detalle_ventas_id_detalle_seq OWNER TO postgres;

--
-- Name: detalle_ventas_id_detalle_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.detalle_ventas_id_detalle_seq OWNED BY public.detalle_ventas.id_detalle;


--
-- Name: items; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.items (
    id_item integer NOT NULL,
    nombre character varying(150) NOT NULL,
    descripcion text,
    imagen_url text,
    id_categoria integer,
    precio_venta numeric(10,2) NOT NULL,
    costo_referencia numeric(10,2),
    es_servicio boolean DEFAULT false,
    stock_actual integer DEFAULT 0,
    stock_minimo integer DEFAULT 2,
    compatibilidad_marca character varying(255),
    tipo_chip character varying(50),
    frecuencia character varying(20),
    activo boolean DEFAULT true,
    codigo_ubicacion character varying(30) DEFAULT NULL::character varying,
    alerta_stock boolean DEFAULT false NOT NULL
);


ALTER TABLE public.items OWNER TO postgres;

--
-- Name: items_id_item_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.items_id_item_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.items_id_item_seq OWNER TO postgres;

--
-- Name: items_id_item_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.items_id_item_seq OWNED BY public.items.id_item;


--
-- Name: movimientos_caja; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.movimientos_caja (
    id_movimiento integer NOT NULL,
    id_caja integer,
    monto numeric(10,2) NOT NULL,
    metodo_pago character varying(50) DEFAULT 'Efectivo'::character varying,
    tipo_movimiento character varying(20) DEFAULT 'SALIDA'::character varying,
    concepto character varying(255) NOT NULL,
    fecha_hora timestamp without time zone DEFAULT timezone('UTC'::text, now()),
    id_usuario integer
);


ALTER TABLE public.movimientos_caja OWNER TO postgres;

--
-- Name: movimientos_caja_id_movimiento_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.movimientos_caja_id_movimiento_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.movimientos_caja_id_movimiento_seq OWNER TO postgres;

--
-- Name: movimientos_caja_id_movimiento_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.movimientos_caja_id_movimiento_seq OWNED BY public.movimientos_caja.id_movimiento;


--
-- Name: movimientos_inventario; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.movimientos_inventario (
    id_movimiento integer NOT NULL,
    id_item integer,
    tipo_movimiento character varying(20) NOT NULL,
    cantidad integer NOT NULL,
    fecha timestamp without time zone DEFAULT timezone('UTC'::text, now()),
    id_usuario integer,
    comentario text
);


ALTER TABLE public.movimientos_inventario OWNER TO postgres;

--
-- Name: movimientos_inventario_id_movimiento_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.movimientos_inventario_id_movimiento_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.movimientos_inventario_id_movimiento_seq OWNER TO postgres;

--
-- Name: movimientos_inventario_id_movimiento_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.movimientos_inventario_id_movimiento_seq OWNED BY public.movimientos_inventario.id_movimiento;


--
-- Name: usuarios; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.usuarios (
    id_usuario integer NOT NULL,
    nombre_completo character varying(100) NOT NULL,
    pin_acceso character varying(255) NOT NULL,
    rol character varying(20) DEFAULT 'empleado'::character varying,
    activo boolean DEFAULT true,
    username character varying(255) NOT NULL
);


ALTER TABLE public.usuarios OWNER TO postgres;

--
-- Name: usuarios_id_usuario_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.usuarios_id_usuario_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.usuarios_id_usuario_seq OWNER TO postgres;

--
-- Name: usuarios_id_usuario_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.usuarios_id_usuario_seq OWNED BY public.usuarios.id_usuario;


--
-- Name: ventas; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.ventas (
    id_venta integer NOT NULL,
    fecha_venta timestamp without time zone DEFAULT timezone('UTC'::text, now()),
    id_usuario integer,
    nombre_cliente character varying(100) DEFAULT 'Mostrador'::character varying,
    total numeric(10,2) NOT NULL,
    metodo_pago character varying(50) DEFAULT 'Efectivo'::character varying,
    notas text,
    subtotal numeric(10,2) DEFAULT 0,
    monto_iva numeric(10,2) DEFAULT 0,
    estado character varying(20) DEFAULT 'COMPLETADA'::character varying NOT NULL
);


ALTER TABLE public.ventas OWNER TO postgres;

--
-- Name: ventas_id_venta_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.ventas_id_venta_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.ventas_id_venta_seq OWNER TO postgres;

--
-- Name: ventas_id_venta_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.ventas_id_venta_seq OWNED BY public.ventas.id_venta;


--
-- Name: caja id_caja; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.caja ALTER COLUMN id_caja SET DEFAULT nextval('public.caja_id_caja_seq'::regclass);


--
-- Name: categorias id_categoria; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.categorias ALTER COLUMN id_categoria SET DEFAULT nextval('public.categorias_id_categoria_seq'::regclass);


--
-- Name: detalle_ventas id_detalle; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.detalle_ventas ALTER COLUMN id_detalle SET DEFAULT nextval('public.detalle_ventas_id_detalle_seq'::regclass);


--
-- Name: items id_item; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.items ALTER COLUMN id_item SET DEFAULT nextval('public.items_id_item_seq'::regclass);


--
-- Name: movimientos_caja id_movimiento; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.movimientos_caja ALTER COLUMN id_movimiento SET DEFAULT nextval('public.movimientos_caja_id_movimiento_seq'::regclass);


--
-- Name: movimientos_inventario id_movimiento; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.movimientos_inventario ALTER COLUMN id_movimiento SET DEFAULT nextval('public.movimientos_inventario_id_movimiento_seq'::regclass);


--
-- Name: usuarios id_usuario; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.usuarios ALTER COLUMN id_usuario SET DEFAULT nextval('public.usuarios_id_usuario_seq'::regclass);


--
-- Name: ventas id_venta; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.ventas ALTER COLUMN id_venta SET DEFAULT nextval('public.ventas_id_venta_seq'::regclass);


--
-- Data for Name: caja; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.caja (id_caja, fecha_apertura, hora_apertura, hora_cierre, monto_inicial, monto_final, monto_actual, id_usuario_apertura, id_usuario_cierre, estado) FROM stdin;
24	2026-02-28	2026-02-28 17:15:06.011351	2026-02-28 20:15:49.261323	100.00	3040.00	3015.00	7	7	CERRADA
5	2026-02-11	2026-02-11 16:34:48.904676	2026-02-12 16:55:05.297191	30.00	3250.00	3250.00	7	7	CERRADA
1	2026-02-08	2026-02-09 03:40:21.780375	2026-02-09 16:27:31.066812	0.00	0.00	0.00	2	7	CERRADA
33	2026-03-11	2026-03-11 16:20:40.228703	2026-03-16 17:00:49.541668	120.00	1625.00	1625.00	7	7	CERRADA
6	2026-02-12	2026-02-12 16:55:12.870746	2026-02-13 01:11:50.34658	70.00	2275.00	2190.00	7	7	CERRADA
16	2026-02-19	2026-02-19 17:06:21.823478	2026-02-20 16:44:14.413146	129.00	2485.00	2485.00	7	7	CERRADA
34	2026-03-16	2026-03-16 17:00:58.818642	2026-03-17 16:48:53.013531	590.00	3450.00	3450.00	7	7	CERRADA
25	2026-03-02	2026-03-02 16:25:28.262507	2026-03-03 17:37:48.865442	50.00	7480.00	7480.00	7	7	CERRADA
2	2026-02-09	2026-02-09 16:27:42.401296	2026-02-10 01:08:21.445117	110.00	9650.00	9164.00	7	7	CERRADA
17	2026-02-20	2026-02-20 16:44:35.531555	2026-02-21 00:59:12.38834	220.00	3000.00	2662.00	7	7	CERRADA
18	2026-02-21	2026-02-21 16:32:26.175675	2026-02-23 17:36:02.061842	280.00	170.00	177.00	7	7	CERRADA
7	2026-02-16	2026-02-16 16:19:23.313019	2026-02-17 17:21:22.215757	27.50	4203.50	4203.50	7	7	CERRADA
19	2026-02-23	2026-02-23 17:36:06.216381	2026-02-24 16:16:49.73967	0.00	30.00	30.00	7	7	CERRADA
35	2026-03-17	2026-03-17 16:49:01.374841	2026-04-01 23:40:02.868328	190.00	-5.00	-5.00	7	\N	CERRADA
26	2026-03-03	2026-03-03 17:38:10.080656	2026-03-04 01:26:41.488542	40.00	3150.00	505.00	7	7	CERRADA
4	2026-02-10	2026-02-10 15:46:14.948947	2026-02-11 01:20:20.489966	0.00	746.00	746.00	7	7	CERRADA
8	2026-02-17	2026-02-17 17:21:34.283993	2026-02-18 01:19:11.781353	230.00	5768.00	5753.00	7	7	CERRADA
20	2026-02-24	2026-02-24 16:16:56.061029	2026-02-25 01:20:53.514923	140.00	1375.00	1155.00	7	7	CERRADA
27	2026-03-04	2026-03-04 17:53:55.4005	2026-03-05 18:11:46.701771	150.00	385.00	385.00	7	7	CERRADA
9	2026-02-18	2026-02-18 16:26:01.548183	2026-02-19 01:02:35.5764	68.00	1760.00	1761.00	7	7	CERRADA
28	2026-03-05	2026-03-05 18:11:55.762658	2026-03-06 16:59:50.93504	70.00	1000.00	-330.00	7	7	CERRADA
21	2026-02-25	2026-02-25 18:00:44.094518	2026-02-26 18:24:44.588881	340.00	950.00	950.00	7	7	CERRADA
22	2026-02-26	2026-02-26 18:24:52.680933	2026-02-27 19:26:30.500746	80.00	260.00	260.00	7	7	CERRADA
23	2026-02-27	2026-02-27 19:26:35.17108	2026-02-28 17:14:59.239256	0.00	1590.00	1590.00	7	7	CERRADA
29	2026-03-06	2026-03-06 17:00:01.210215	2026-03-07 17:49:31.272913	100.00	1115.00	1115.00	7	7	CERRADA
30	2026-03-07	2026-03-07 17:49:38.316567	2026-03-07 20:25:57.777745	0.00	2770.00	2770.00	7	7	CERRADA
31	2026-03-09	2026-03-09 19:52:16.300031	2026-03-10 22:39:31.200979	50.00	850.00	850.00	7	7	CERRADA
32	2026-03-10	2026-03-10 22:43:28.841672	2026-03-11 16:20:26.756378	2200.00	1337.00	1337.00	7	7	CERRADA
37	2026-09-22	2026-09-22 19:32:30.26209	2026-09-22 19:32:49.99427	500.00	500.00	525.00	2	2	CERRADA
38	2026-09-22	2026-09-22 19:38:30.718953	2026-09-22 19:38:30.735524	500.00	490.00	490.00	2	2	CERRADA
39	2026-09-22	2026-09-22 22:38:29.509158	2026-09-23 01:33:54.83297	0.00	40.00	40.00	2	2	CERRADA
40	2026-09-22	2026-09-23 01:34:14.018812	2026-09-23 17:06:42.348929	0.00	595.00	595.00	2	\N	CERRADA
41	2026-09-23	2026-09-23 17:06:59.537515	2026-09-24 17:09:58.131301	610.00	2790.00	2790.00	2	\N	CERRADA
42	2026-09-24	2026-09-24 17:12:17.770385	\N	0.00	\N	25.00	2	\N	ABIERTA
\.


--
-- Data for Name: categorias; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.categorias (id_categoria, nombre, clasificacion, imagen_url) FROM stdin;
10	Libre	Residencial	\N
2	Llave sencilla	Residencial	\N
48	Llaves Rectangulares TR5	Residencial	\N
49	Llaves Tetra	Residencial	\N
50	Llaves de Puntos	Residencial	\N
51	Llaves Largas	Residencial	\N
52	Llave Puntos Corta	Residencial	\N
53	Chapas	Residencial	\N
54	Candados	Residencial	\N
55	Llaveros	Accesorios	\N
56	Gomas	Accesorios	\N
57	Argollas	Accesorios	\N
58	Fundas de llaves duras	Accesorios	\N
59	Fundas de llaves suaves	Accesorios	\N
60	Llave hueca	Automotriz	\N
4	Llave de moto	Automotriz	\N
61	De trabajo	Automotriz	\N
18	Llave control	Automotriz	\N
62	Llave de presencia	Automotriz	\N
22	Control independiente	Automotriz	\N
63	Baterías	Automotriz	\N
64	Carcasas	Automotriz	\N
44	Chips	Automotriz	\N
66	Servicios	Servicio	\N
65	Refacciones Automotrices	Automotriz	\N
\.


--
-- Data for Name: detalle_ventas; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.detalle_ventas (id_detalle, id_venta, id_item, cantidad, precio_unitario, subtotal, nombre_item_snapshot, id_combo, nombre_combo_snapshot, precio_combo_unitario_snapshot, combo_cantidad_snapshot) FROM stdin;
3	3	140	2	50.00	100.00	Casa Tetra Alba/JMA	\N	\N	\N	\N
4	4	59	1	95.00	95.00	Casa puntos TOV 8D	\N	\N	\N	\N
5	5	653	1	6500.00	6500.00	Programación Aveo	\N	\N	\N	\N
6	6	246	1	90.00	90.00	CR2032	\N	\N	\N	\N
7	7	238	1	90.00	90.00	CR2025	\N	\N	\N	\N
8	8	357	1	2300.00	2300.00	Llave Control Toyota Avanza 2 BTN Orig	3	Corte Een llave control	2000.00	1
9	9	357	1	2300.00	2300.00	Llave Control Toyota Avanza 2 BTN Orig	3	Corte con llave control TOYOTA	2000.00	1
10	10	29	1	25.00	25.00	CASA R1 CORTA	\N	\N	\N	\N
11	11	246	1	90.00	90.00	CR2032	\N	\N	\N	\N
12	12	29	17	25.00	425.00	CASA R1 CORTA	\N	\N	\N	\N
13	12	37	3	25.00	75.00	CASA R52	\N	\N	\N	\N
14	13	407	1	500.00	500.00	Carcasa Volkswagen Clasico Abatible 4 BTN	\N	\N	\N	\N
15	14	407	1	500.00	500.00	Carcasa Volkswagen Clasico Abatible 4 BTN	\N	\N	\N	\N
16	15	649	2	40.00	80.00	Llavero sencillo	\N	\N	\N	\N
17	16	652	1	100.00	100.00	Llavero carritos	\N	\N	\N	\N
18	17	230	2	25.00	50.00	CASA R52 COLORES	\N	\N	\N	\N
19	18	246	1	90.00	90.00	CR2032	\N	\N	\N	\N
20	19	654	1	350.00	350.00	Llavin VW	\N	\N	\N	\N
21	20	238	1	90.00	90.00	CR2025	\N	\N	\N	\N
22	21	655	1	400.00	400.00	DIAGN├ôSTICO	\N	\N	\N	\N
23	22	658	1	100.00	100.00	JUANMI PRESTO	\N	\N	\N	\N
24	23	239	1	90.00	90.00	CR1220	\N	\N	\N	\N
25	24	656	1	100.00	100.00	CHAPIS PRESTO	\N	\N	\N	\N
26	25	640	1	275.00	275.00	715 - CL Clasica Izquierda	\N	\N	\N	\N
27	26	37	6	25.00	150.00	CASA R52	\N	\N	\N	\N
28	27	29	1	25.00	25.00	CASA R1 CORTA	\N	\N	\N	\N
29	28	655	1	400.00	400.00	DIAGN├ôSTICO	\N	\N	\N	\N
30	29	246	1	90.00	90.00	CR2032	\N	\N	\N	\N
31	30	37	3	25.00	75.00	CASA R52	\N	\N	\N	\N
32	31	407	1	500.00	500.00	Carcasa Volkswagen Clasico Abatible 4 BTN	\N	\N	\N	\N
33	32	245	1	90.00	90.00	CR27A	\N	\N	\N	\N
34	33	373	1	500.00	500.00	Carcasa Honda Llave Control 4 BTN	\N	\N	\N	\N
35	33	645	1	100.00	100.00	Fundas Silicon Suave	\N	\N	\N	\N
36	34	58	1	95.00	95.00	Casa puntos TOV 9D	\N	\N	\N	\N
37	35	245	1	90.00	90.00	CR27A	\N	\N	\N	\N
38	36	333	1	600.00	600.00	Carcasa Chevrolet Presencia 6 BTN	\N	\N	\N	\N
39	37	392	1	1600.00	1600.00	Llave Control Toyota KEYDIY Corazon 4 BTN	\N	\N	\N	\N
40	38	246	1	90.00	90.00	CR2032	\N	\N	\N	\N
41	39	660	1	1000.00	1000.00	Reparación de Switch VW	\N	\N	\N	\N
42	40	236	1	90.00	90.00	CR1620	\N	\N	\N	\N
43	41	37	2	25.00	50.00	CASA R52	\N	\N	\N	\N
44	41	29	2	25.00	50.00	CASA R1 CORTA	\N	\N	\N	\N
45	42	661	1	500.00	500.00	Reparación General	\N	\N	\N	\N
46	43	24	1	25.00	25.00	CASA E109	\N	\N	\N	\N
47	43	140	1	50.00	50.00	Casa Tetra Alba/JMA	\N	\N	\N	\N
48	44	656	1	100.00	100.00	CHAPIS PRESTO	\N	\N	\N	\N
49	45	656	1	100.00	100.00	CHAPIS PRESTO	\N	\N	\N	\N
50	46	29	3	25.00	75.00	CASA R1 CORTA	\N	\N	\N	\N
51	46	663	2	3.00	6.00	Gomitas	\N	\N	\N	\N
52	47	317	1	600.00	600.00	Control Ford 3 BTN IND	\N	\N	\N	\N
53	48	246	1	90.00	90.00	CR2032	\N	\N	\N	\N
54	49	664	1	100.00	100.00	CHIP 4D original	4	Duplicado con control Sienna ┬¿06	1800.00	1
55	49	381	1	350.00	350.00	Llave Hueca Toyota TOYO15P 	4	Duplicado con control Sienna ┬¿06	1800.00	1
56	49	433	1	900.00	900.00	Control Generico KEYDIY 4 BTN	4	Duplicado con control Sienna ┬¿06	1800.00	1
57	50	300	1	350.00	350.00	Llave Hueca Ford DobleCorte F0-30DP Explorer	5	Corte y Programacion FORD	1000.00	1
58	51	664	1	100.00	100.00	CHIP 4D original	4	Duplicado con control Sienna ┬¿06	1800.00	1
59	51	381	1	350.00	350.00	Llave Hueca Toyota TOYO15P 	4	Duplicado con control Sienna ┬¿06	1800.00	1
60	51	433	1	900.00	900.00	Control Generico KEYDIY 4 BTN	4	Duplicado con control Sienna ┬¿06	1800.00	1
61	52	665	1	1000.00	1000.00	Reprogramacion de Módulo	\N	\N	\N	\N
62	53	665	1	1000.00	1000.00	Reprogramacion de Módulo	\N	\N	\N	\N
63	54	155	1	30.00	30.00	CASA R52L	\N	\N	\N	\N
64	54	230	4	25.00	100.00	CASA R52 COLORES	\N	\N	\N	\N
65	55	37	2	25.00	50.00	CASA R52	\N	\N	\N	\N
66	55	142	1	50.00	50.00	Casa Tetra Chica Derecha	\N	\N	\N	\N
67	55	140	1	50.00	50.00	Casa Tetra Alba/JMA	\N	\N	\N	\N
68	55	29	5	25.00	125.00	CASA R1 CORTA	\N	\N	\N	\N
69	56	667	1	900.00	900.00	Programacion de Chip	\N	\N	\N	\N
70	57	653	1	6500.00	6500.00	Programación Aveo	\N	\N	\N	\N
71	58	240	1	90.00	90.00	CR2016	\N	\N	\N	\N
72	59	478	1	1800.00	1800.00	Llave Control Chrysler Cajuela 4 BTN	\N	\N	\N	\N
73	60	645	1	100.00	100.00	Fundas Silicon Suave	\N	\N	\N	\N
74	60	374	1	500.00	500.00	Carcasa Honda Llave Control 2 BTN	\N	\N	\N	\N
75	60	235	1	90.00	90.00	CR1616	\N	\N	\N	\N
76	61	57	1	95.00	95.00	Casa puntos TOV 5	\N	\N	\N	\N
77	61	54	1	80.00	80.00	Casa rectangular TR5	\N	\N	\N	\N
78	61	111	1	25.00	25.00	Casa CM5 	\N	\N	\N	\N
79	62	246	1	90.00	90.00	CR2032	\N	\N	\N	\N
80	63	246	1	90.00	90.00	CR2032	\N	\N	\N	\N
81	64	137	1	95.00	95.00	Casa puntos Philips Xtra larga	\N	\N	\N	\N
82	65	660	1	1000.00	1000.00	Reparación de Switch VW	\N	\N	\N	\N
83	65	668	1	300.00	300.00	Hechura Llave Automotriz	\N	\N	\N	\N
84	66	246	1	90.00	90.00	CR2032	\N	\N	\N	\N
85	67	37	1	25.00	25.00	CASA R52	\N	\N	\N	\N
86	67	663	1	3.00	3.00	Gomitas	\N	\N	\N	\N
87	68	434	1	900.00	900.00	Control Generico XHORSE 4 BTN	\N	\N	\N	\N
88	69	331	1	500.00	500.00	Carcasa Chevrolet Abatible Cavalier Regata 3 BTN	\N	\N	\N	\N
89	70	290	1	350.00	350.00	Carcasa Ford Control IND 3 BTN	\N	\N	\N	\N
90	71	318	1	600.00	600.00	Control Ford 4 BTN IND	\N	\N	\N	\N
91	72	155	2	30.00	60.00	CASA R52L	\N	\N	\N	\N
92	73	649	1	40.00	40.00	Llavero sencillo	\N	\N	\N	\N
93	74	669	1	650.00	650.00	Repración de espiga de OPEL	\N	\N	\N	\N
94	75	669	1	650.00	650.00	Repración de espiga de OPEL	\N	\N	\N	\N
95	76	165	1	80.00	80.00	MOTO Yamaha YM63	\N	\N	\N	\N
96	76	633	1	98.00	98.00	Candado 112	\N	\N	\N	\N
97	77	37	2	25.00	50.00	CASA R52	\N	\N	\N	\N
98	77	663	2	3.00	6.00	Gomitas	\N	\N	\N	\N
99	77	670	1	5.00	5.00	Arito de colores	\N	\N	\N	\N
100	78	245	1	90.00	90.00	CR27A	\N	\N	\N	\N
101	79	439	1	1600.00	1600.00	Abatible Genericho Chevrolet XHORSE	\N	\N	\N	\N
102	80	435	1	1600.00	1600.00	Abatible Generico Honda KEYDIY 4 BTN	\N	\N	\N	\N
103	81	406	1	500.00	500.00	Carcasa Volkswagen DC Abatible 4 BTN	\N	\N	\N	\N
104	82	155	1	30.00	30.00	CASA R52L	\N	\N	\N	\N
105	83	246	1	90.00	90.00	CR2032	\N	\N	\N	\N
106	84	140	1	50.00	50.00	Casa Tetra Alba/JMA	\N	\N	\N	\N
107	84	37	1	25.00	25.00	CASA R52	\N	\N	\N	\N
108	84	23	1	25.00	25.00	CASA S6 Corta	\N	\N	\N	\N
109	84	29	1	25.00	25.00	CASA R1 CORTA	\N	\N	\N	\N
110	84	649	1	40.00	40.00	Llavero sencillo	\N	\N	\N	\N
111	85	655	1	400.00	400.00	DIAGN├ôSTICO	\N	\N	\N	\N
112	86	29	3	25.00	75.00	CASA R1 CORTA	\N	\N	\N	\N
113	87	60	1	95.00	95.00	Casa puntos TOV 7	\N	\N	\N	\N
114	87	24	1	25.00	25.00	CASA E109	\N	\N	\N	\N
115	87	142	1	50.00	50.00	Casa Tetra Chica Derecha	\N	\N	\N	\N
116	88	281	1	2000.00	2000.00	Llave Prescencia Nissan 815 4 BTN	\N	\N	\N	\N
117	89	246	1	90.00	90.00	CR2032	\N	\N	\N	\N
118	90	246	1	90.00	90.00	CR2032	\N	\N	\N	\N
119	90	646	1	150.00	150.00	Fundas Silicon Dura	\N	\N	\N	\N
120	91	24	1	25.00	25.00	CASA E109	\N	\N	\N	\N
121	91	155	1	30.00	30.00	CASA R52L	\N	\N	\N	\N
122	92	29	4	25.00	100.00	CASA R1 CORTA	\N	\N	\N	\N
123	93	57	1	95.00	95.00	Casa puntos TOV 5	\N	\N	\N	\N
124	94	37	3	25.00	75.00	CASA R52	\N	\N	\N	\N
125	95	246	1	90.00	90.00	CR2032	\N	\N	\N	\N
126	96	140	2	50.00	100.00	Casa Tetra Alba/JMA	\N	\N	\N	\N
127	96	24	1	25.00	25.00	CASA E109	\N	\N	\N	\N
128	97	155	1	30.00	30.00	CASA R52L	\N	\N	\N	\N
129	98	37	1	25.00	25.00	CASA R52	\N	\N	\N	\N
130	99	668	1	300.00	300.00	Hechura Llave Automotriz	\N	\N	\N	\N
131	100	155	10	30.00	300.00	CASA R52L	\N	\N	\N	\N
132	101	246	1	90.00	90.00	CR2032	\N	\N	\N	\N
133	102	238	1	90.00	90.00	CR2025	\N	\N	\N	\N
134	103	671	2	1000.00	2000.00	SENSORES DE LLANTA	\N	\N	\N	\N
135	104	243	1	150.00	150.00	CR2450	\N	\N	\N	\N
136	105	434	1	900.00	900.00	Control Generico XHORSE 4 BTN	\N	\N	\N	\N
137	106	437	1	1600.00	1600.00	Abatible Generico Volkswagen XHORSE 4 BTN	\N	\N	\N	\N
138	107	645	1	100.00	100.00	Fundas Silicon Suave	\N	\N	\N	\N
139	108	176	2	95.00	190.00	Casa puntos AMG 10	\N	\N	\N	\N
140	108	29	5	25.00	125.00	CASA R1 CORTA	\N	\N	\N	\N
141	109	24	2	25.00	50.00	CASA E109	\N	\N	\N	\N
142	110	373	1	500.00	500.00	Carcasa Honda Llave Control 4 BTN	\N	\N	\N	\N
143	111	435	1	1600.00	1600.00	Abatible Generico Honda KEYDIY 4 BTN	\N	\N	\N	\N
144	112	373	1	500.00	500.00	Carcasa Honda Llave Control 4 BTN	\N	\N	\N	\N
145	112	435	1	1600.00	1600.00	Abatible Generico Honda KEYDIY 4 BTN	\N	\N	\N	\N
146	113	672	1	1000.00	1000.00	VENTA DE PARTE	\N	\N	\N	\N
147	114	649	1	40.00	40.00	Llavero sencillo	\N	\N	\N	\N
148	115	155	1	30.00	30.00	CASA R52L	\N	\N	\N	\N
149	115	37	1	25.00	25.00	CASA R52	\N	\N	\N	\N
150	116	603	2	1200.00	2400.00	Reparación de Switch Volkswagen MK6-Bora	\N	\N	\N	\N
151	117	99	2	95.00	190.00	Casa puntos PHI 12	\N	\N	\N	\N
152	117	140	1	50.00	50.00	Casa Tetra Alba/JMA	\N	\N	\N	\N
153	118	37	2	25.00	50.00	CASA R52	\N	\N	\N	\N
154	119	246	1	90.00	90.00	CR2032	\N	\N	\N	\N
155	120	37	1	25.00	25.00	CASA R52	\N	\N	\N	\N
156	121	173	2	120.00	240.00	CASA DX31	\N	\N	\N	\N
157	121	35	2	25.00	50.00	CASA R55	\N	\N	\N	\N
158	121	651	1	70.00	70.00	Llavero Premium	\N	\N	\N	\N
159	122	238	1	90.00	90.00	CR2025	\N	\N	\N	\N
160	123	29	4	25.00	100.00	CASA R1 CORTA	\N	\N	\N	\N
161	123	140	1	50.00	50.00	Casa Tetra Alba/JMA	\N	\N	\N	\N
162	124	23	1	25.00	25.00	CASA S6 Corta	\N	\N	\N	\N
163	124	155	1	30.00	30.00	CASA R52L	\N	\N	\N	\N
164	124	28	1	25.00	25.00	CASA R1 LARGA	\N	\N	\N	\N
165	125	246	1	90.00	90.00	CR2032	\N	\N	\N	\N
166	126	37	1	25.00	25.00	CASA R52	\N	\N	\N	\N
167	126	649	1	40.00	40.00	Llavero sencillo	\N	\N	\N	\N
168	127	24	2	25.00	50.00	CASA E109	\N	\N	\N	\N
169	128	155	1	30.00	30.00	CASA R52L	\N	\N	\N	\N
170	128	37	1	25.00	25.00	CASA R52	\N	\N	\N	\N
171	128	101	1	95.00	95.00	Casa puntos TRU 12	\N	\N	\N	\N
172	129	24	2	25.00	50.00	CASA E109	\N	\N	\N	\N
173	130	144	1	50.00	50.00	Casa Tetra Chica Chueca	\N	\N	\N	\N
174	130	37	1	25.00	25.00	CASA R52	\N	\N	\N	\N
175	131	246	1	90.00	90.00	CR2032	\N	\N	\N	\N
176	131	649	1	40.00	40.00	Llavero sencillo	\N	\N	\N	\N
177	132	238	3	90.00	270.00	CR2025	\N	\N	\N	\N
178	132	244	1	90.00	90.00	CR23A	\N	\N	\N	\N
179	133	246	1	90.00	90.00	CR2032	\N	\N	\N	\N
180	134	246	1	90.00	90.00	CR2032	\N	\N	\N	\N
181	135	37	1	25.00	25.00	CASA R52	\N	\N	\N	\N
182	135	62	2	25.00	50.00	Casa T4	\N	\N	\N	\N
183	136	29	2	25.00	50.00	CASA R1 CORTA	\N	\N	\N	\N
184	137	96	1	95.00	95.00	Casa puntos TOV6	\N	\N	\N	\N
185	138	365	1	2800.00	2800.00	Abatible Chevrolet 5 BTN Regata	\N	\N	\N	\N
186	139	420	1	350.00	350.00	Llave Hueca Volkswagen V0-8P Gol	\N	\N	\N	\N
187	140	419	1	350.00	350.00	Llave Hueca Volkswagen HU66	\N	\N	\N	\N
188	141	246	2	90.00	180.00	CR2032	\N	\N	\N	\N
189	141	651	2	70.00	140.00	Llavero Premium	\N	\N	\N	\N
190	142	373	1	500.00	500.00	Carcasa Honda Llave Control 4 BTN	\N	\N	\N	\N
191	142	236	1	90.00	90.00	CR1620	\N	\N	\N	\N
192	143	29	4	25.00	100.00	CASA R1 CORTA	\N	\N	\N	\N
193	144	307	1	350.00	350.00	Llave Hueca GM OP11P2 Regata	\N	\N	\N	\N
194	145	667	1	900.00	900.00	Programacion de Chip	\N	\N	\N	\N
195	146	239	1	90.00	90.00	CR1220	\N	\N	\N	\N
196	147	674	1	30.00	30.00	PERNO	\N	\N	\N	\N
197	148	29	1	25.00	25.00	CASA R1 CORTA	\N	\N	\N	\N
198	149	246	2	90.00	180.00	CR2032	\N	\N	\N	\N
199	149	238	1	90.00	90.00	CR2025	\N	\N	\N	\N
200	150	238	1	90.00	90.00	CR2025	\N	\N	\N	\N
201	151	246	1	90.00	90.00	CR2032	\N	\N	\N	\N
202	152	655	1	400.00	400.00	DIAGN├ôSTICO	\N	\N	\N	\N
203	153	327	1	450.00	450.00	Carcasa Chevrolet Llave Control 3 BTN	\N	\N	\N	\N
204	154	332	1	500.00	500.00	Carcasa Chevrolet Abatible Regata 2 BTN	\N	\N	\N	\N
205	155	246	2	90.00	180.00	CR2032	\N	\N	\N	\N
206	155	647	1	40.00	40.00	Cinta corta	\N	\N	\N	\N
207	156	435	1	1600.00	1600.00	Abatible Generico Honda KEYDIY 4 BTN	\N	\N	\N	\N
208	157	37	1	25.00	25.00	CASA R52	\N	\N	\N	\N
209	158	652	1	100.00	100.00	Llavero carritos	\N	\N	\N	\N
210	159	246	1	90.00	90.00	CR2032	\N	\N	\N	\N
211	160	246	1	90.00	90.00	CR2032	\N	\N	\N	\N
212	162	20	1	25.00	25.00	CASA E4B	\N	\N	\N	\N
213	163	20	1	25.00	25.00	CASA E4B	\N	\N	\N	\N
214	164	20	1	25.00	25.00	CASA E4B	\N	\N	\N	\N
215	165	675	1	25.00	25.00	Duplicado Casa Estándar	\N	\N	\N	\N
216	166	29	1	25.00	25.00	CASA R1 CORTA	\N	\N	\N	\N
217	167	29	1	25.00	25.00	CASA R1 CORTA	\N	\N	\N	\N
218	168	29	1	25.00	25.00	CASA R1 CORTA	\N	\N	\N	\N
219	169	29	1	25.00	25.00	CASA R1 CORTA	\N	\N	\N	\N
220	170	155	1	30.00	30.00	CASA R52L	\N	\N	\N	\N
221	171	337	1	500.00	500.00	Carcasa Chevrolet Abatible Spark Doble Corte 3 BTN	\N	\N	\N	\N
222	172	35	1	25.00	25.00	CASA R55	\N	\N	\N	\N
223	173	675	1	25.00	25.00	Duplicado Casa Estándar	\N	\N	\N	\N
224	174	411	1	500.00	500.00	Carcasa Volkswagen MQB Abatible 4 BTN	\N	\N	\N	\N
225	175	411	1	400.00	400.00	Carcasa Volkswagen MQB Abatible 4 BTN	\N	\N	\N	\N
226	176	411	1	500.00	500.00	Carcasa Volkswagen MQB Abatible 4 BTN	\N	\N	\N	\N
227	177	681	1	400.00	400.00	Servicio General: Diagnostico jefe	\N	\N	\N	\N
228	178	603	1	1200.00	1200.00	Reparación de Switch Volkswagen MK6-Bora	\N	\N	\N	\N
229	178	682	1	0.00	0.00	Switch/Housing Volkswagen Original: Refacción en: Reparación de Switch Volkswagen MK6-Bora	\N	\N	\N	\N
230	179	155	1	30.00	30.00	CASA R52L	\N	\N	\N	\N
231	180	675	1	25.00	25.00	Duplicado Casa Estándar	\N	\N	\N	\N
\.


--
-- Data for Name: items; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.items (id_item, nombre, descripcion, imagen_url, id_categoria, precio_venta, costo_referencia, es_servicio, stock_actual, stock_minimo, compatibilidad_marca, tipo_chip, frecuencia, activo, codigo_ubicacion, alerta_stock) FROM stdin;
20	CASA E4B	\N	\N	2	25.00	4.40	f	3	1	\N	\N	\N	t	\N	f
23	CASA S6 Corta	\N	\N	2	25.00	4.40	f	8	1	\N	\N	\N	t	\N	t
21	CASA TE 81	\N	\N	2	25.00	4.40	f	14	1	\N	\N	\N	t	\N	f
24	CASA E109	\N	\N	2	25.00	4.50	f	10	1	\N	\N	\N	t	\N	t
407	Carcasa Volkswagen Clasico Abatible 4 BTN	\N	\N	64	500.00	\N	f	14	4	Volkswagen, Jetta, Bora	\N	\N	t	\N	t
26	CASA CMX 10D	\N	\N	2	25.00	4.40	f	24	1	\N	\N	\N	t	\N	f
27	CASA R2	\N	\N	2	25.00	4.40	f	9	1	\N	\N	\N	t	\N	f
333	Carcasa Chevrolet Presencia 6 BTN	\N	https://res.cloudinary.com/drqabe11r/image/upload/v1770856102/softsmith/items/mlez6algmm1vprsxr8wl.png	64	600.00	0.00	f	3	1	CHEVROLET, Suburban, Tahoe, Silverado, Acadia, Sierra, Yukon, Yukon XL	\N	\N	t	\N	t
447	Carcasa Mitsubishi Llave Control 3 BTN	\N	\N	64	500.00	\N	f	7	1	Mitsubishi, Lancer	\N	\N	t	\N	t
32	CASA 1000SH	\N	\N	2	25.00	4.40	f	5	1	\N	\N	\N	t	\N	f
33	CASA R62	\N	\N	2	25.00	4.40	f	5	1	\N	\N	\N	t	\N	f
34	CASA YA22D	\N	\N	2	25.00	4.40	f	2	1	\N	\N	\N	t	\N	f
69	Llave Candado F15	\N	\N	54	25.00	4.40	f	4	1	\N	\N	\N	t	\N	f
1	Chrysler CHR 15 	\N	\N	61	80.00	11.00	f	8	1	Chrysler	\N	\N	t	\N	f
2	Nissan DAT 15	\N	\N	61	80.00	11.00	f	8	1	Nissan	\N	\N	t	\N	f
35	CASA R55	\N	\N	2	25.00	4.40	f	5	1	\N	\N	\N	t	\N	t
682	Switch/Housing Volkswagen Original	\N	\N	65	2000.00	500.00	f	1	1	Volkswagen	\N	\N	t	\N	t
63	Casa YA 11I	\N	\N	2	25.00	4.40	f	12	1	\N	\N	\N	t	\N	f
64	Casa YA 11D	\N	\N	2	25.00	4.40	f	7	1	\N	\N	\N	t	\N	f
65	Casa VI 1	\N	\N	2	25.00	4.40	f	2	1	\N	\N	\N	t	\N	f
66	Casa VD 1	\N	\N	2	25.00	4.40	f	3	1	\N	\N	\N	t	\N	f
67	Casa Y5	\N	\N	2	25.00	4.40	f	2	1	\N	\N	\N	t	\N	f
68	Casa YA 43D	\N	\N	2	25.00	4.40	f	14	1	\N	\N	\N	t	\N	f
70	Casa MGG 4D	\N	\N	2	25.00	4.40	f	11	1	\N	\N	\N	t	\N	f
71	Casa MGG 4D Contraria	\N	\N	2	25.00	4.40	f	10	1	\N	\N	\N	t	\N	f
3	Ford FO 27D	\N	\N	61	80.00	11.00	f	8	1	Ford	\N	\N	t	\N	f
4	Nissan DAT 21	\N	\N	61	80.00	11.00	f	5	1	Nissan	\N	\N	t	\N	f
62	Casa T4	\N	\N	2	25.00	4.40	f	4	1	\N	\N	\N	t	\N	f
5	Ford FO 21D	\N	\N	61	80.00	11.00	f	8	1	Ford	\N	\N	t	\N	f
6	Ford FO - 8DP PLAST	\N	\N	61	120.00	16.50	f	3	1	Ford	\N	\N	t	\N	f
7	Ford	\N	\N	61	80.00	11.00	f	5	1	Ford	\N	\N	t	\N	f
8	Toyota TOYO 20	\N	\N	61	80.00	11.00	f	5	1	Toyota	\N	\N	t	\N	f
9	Toyota TOYO 20D	\N	\N	61	80.00	11.00	f	4	1	Toyota	\N	\N	t	\N	f
10	GM 29D	\N	\N	61	80.00	11.00	f	4	1	Chevrolet	\N	\N	t	\N	f
12	Chevy OPEL OP 8	\N	\N	61	80.00	11.00	f	9	1	Chevrolet	\N	\N	t	\N	f
662	Carcasa Suzuki 2btns	\N	https://res.cloudinary.com/drqabe11r/image/upload/v1771262472/softsmith/items/lzzdbxtfpysdkrr2mjrm.jpg	64	500.00	90.00	f	5	2	Suzuki	\N	\N	t	\N	t
112	Casa CM5C	\N	\N	2	25.00	4.40	f	7	1	\N	\N	\N	t	\N	f
115	Casa COR 42/E38A	\N	\N	2	25.00	4.40	f	9	1	\N	\N	\N	t	\N	f
116	Casa COR 41D	\N	\N	2	25.00	4.40	f	7	1	\N	\N	\N	t	\N	f
117	Casa PHI 32L	\N	\N	2	25.00	4.40	f	2	1	\N	\N	\N	t	\N	f
120	MOTO Yamaha YH39 RAP PLAST	\N	\N	4	120.00	16.50	f	4	1	Yamaha	\N	\N	t	\N	f
129	Casa puntos DEXTER 	\N	\N	50	95.00	20.00	f	5	1	\N	\N	\N	t	\N	t
122	MOTO Suzuki  SUZU 12-P PLAST	\N	\N	4	120.00	16.50	f	2	1	Suzuki	\N	\N	t	\N	f
123	MOTO Suzuki SUZU 12-DP PLAST	\N	\N	4	120.00	16.50	f	1	1	Suzuki	\N	\N	t	\N	f
124	MOTO Honda HOND36PT PLAST	\N	\N	4	120.00	16.50	f	3	1	Honda	\N	\N	t	\N	f
125	MOTO Honda HOND36PI PLAST	\N	\N	4	120.00	16.50	f	1	1	Honda	\N	\N	t	\N	f
128	MOTO DISCOVER	\N	\N	4	120.00	16.50	f	0	1	\N	\N	\N	t	\N	f
134	Casa puntos Philips corta	\N	\N	50	95.00	20.00	f	4	1	\N	\N	\N	t	\N	t
154	Llave CANDADO GLO 19	\N	\N	54	25.00	4.40	f	9	1	\N	\N	\N	t	\N	f
105	Llave Candado LOC3D	\N	\N	54	25.00	4.40	f	5	1	\N	\N	\N	t	\N	f
118	Volkswagen V0VB	\N	\N	61	80.00	11.00	f	7	1	Volkswagen	\N	\N	t	\N	f
146	Casa DX5D	\N	\N	2	25.00	4.40	f	6	1	\N	\N	\N	t	\N	f
147	Casa TRU 1D	\N	\N	2	25.00	4.40	f	7	1	\N	\N	\N	t	\N	f
165	MOTO Yamaha YM63	\N	\N	4	80.00	11.00	f	3	1	Yamaha	\N	\N	t	\N	f
119	FORD F0TXFC7	\N	\N	61	80.00	11.00	f	5	1	Ford	\N	\N	t	\N	f
157	MOTO KYM 2DP PLAST	\N	\N	4	120.00	16.50	f	1	1	Kymco	\N	\N	t	\N	f
158	MOTO Italika 1DP PLAST	\N	\N	4	120.00	16.50	f	5	1	Italika	\N	\N	t	\N	f
159	MOTO Italika 1DP PLAST	\N	\N	4	120.00	16.50	f	6	1	Italika	\N	\N	t	\N	f
160	MOTO Yamaha YH11P PLAST	\N	\N	4	120.00	16.50	f	2	1	Yamaha	\N	\N	t	\N	f
161	MOTO Yamaha 26DP PLAST	\N	\N	4	120.00	16.50	f	3	1	Yamaha	\N	\N	t	\N	f
162	MOTO Honda Y36C	\N	\N	4	80.00	11.00	f	5	1	Honda	\N	\N	t	\N	f
163	MOTO Honda HD63	\N	\N	4	80.00	11.00	f	4	1	Honda	\N	\N	t	\N	f
164	MOTO BAJ 3P PLAST	\N	\N	4	120.00	16.50	f	2	1	Bajaj	\N	\N	t	\N	f
166	MOTO Yamaha YM64	\N	\N	4	80.00	11.00	f	7	1	Yamaha	\N	\N	t	\N	f
167	MOTO Honda HOND 20D 	\N	\N	4	80.00	11.00	f	3	1	Honda	\N	\N	t	\N	f
135	Casa puntos Philips mediana	\N	\N	50	95.00	20.00	f	4	1	\N	\N	\N	t	\N	t
111	Casa CM5 	\N	\N	2	25.00	4.40	f	4	1	\N	\N	\N	t	\N	f
181	CASA ASH 1	\N	\N	2	25.00	4.40	f	5	1	\N	\N	\N	t	\N	f
182	CASA E4B	\N	\N	2	25.00	4.40	f	5	1	\N	\N	\N	t	\N	f
183	CASA SLG 1	\N	\N	2	25.00	4.40	f	5	1	\N	\N	\N	t	\N	f
184	GAS 	\N	\N	2	25.00	4.40	f	3	1	\N	\N	\N	t	\N	f
126	Chrysler viejo  PLAST	\N	\N	61	80.00	11.00	f	5	1	Chrysler	\N	\N	t	\N	f
127	Chevrolet B91 - P PLAST	\N	\N	61	120.00	16.50	f	4	1	Chevrolet	\N	\N	t	\N	f
94	Casa puntos EUL 1	\N	\N	50	95.00	20.00	f	3	1	\N	\N	\N	t	\N	f
95	Casa puntos CS01	\N	\N	50	95.00	20.00	f	8	1	\N	\N	\N	t	\N	f
97	Casa puntos TV1	\N	\N	50	95.00	20.00	f	2	1	\N	\N	\N	t	\N	f
98	Casa puntos KALE	\N	\N	50	95.00	20.00	f	2	1	\N	\N	\N	t	\N	f
100	Casa puntos TOV 4	\N	\N	50	95.00	20.00	f	2	1	\N	\N	\N	t	\N	f
102	Casa puntos TRU5	\N	\N	50	95.00	20.00	f	4	1	\N	\N	\N	t	\N	f
99	Casa puntos PHI 12	\N	\N	50	95.00	20.00	f	2	1	\N	\N	\N	t	\N	f
130	Casa puntos ASH 7D	\N	\N	50	95.00	20.00	f	4	1	\N	\N	\N	t	\N	f
131	Casa puntos KLE9R	\N	\N	50	95.00	20.00	f	3	1	\N	\N	\N	t	\N	f
132	Casa puntos AKI 1D	\N	\N	50	95.00	20.00	f	3	1	\N	\N	\N	t	\N	f
133	Casa puntos CAS1	\N	\N	50	95.00	20.00	f	4	1	\N	\N	\N	t	\N	f
138	Casa puntos UCEM 13D	\N	\N	50	95.00	20.00	f	7	1	\N	\N	\N	t	\N	f
139	Casa puntos UCEM 8D	\N	\N	50	95.00	20.00	f	5	1	\N	\N	\N	t	\N	f
168	Casa puntos AZ9	\N	\N	50	95.00	20.00	f	4	1	\N	\N	\N	t	\N	f
169	Casa puntos AZ14	\N	\N	50	95.00	20.00	f	4	1	\N	\N	\N	t	\N	f
170	Casa puntos ASH 9D	\N	\N	50	95.00	20.00	f	3	1	\N	\N	\N	t	\N	f
185	CASA M21	\N	\N	2	25.00	4.40	f	4	1	\N	\N	\N	t	\N	f
186	CASA M32	\N	\N	2	25.00	4.40	f	4	1	\N	\N	\N	t	\N	f
187	CASA TRU 1	\N	\N	2	25.00	4.40	f	2	1	\N	\N	\N	t	\N	f
189	CASA T3 NR	\N	\N	2	25.00	4.40	f	0	1	\N	\N	\N	t	\N	f
190	CASA EAG 4D	\N	\N	2	25.00	4.40	f	8	1	\N	\N	\N	t	\N	f
191	CASA CLI1D	\N	\N	2	25.00	4.40	f	5	1	\N	\N	\N	t	\N	f
196	BAJ 3P1 PLAST	\N	\N	4	120.00	16.50	f	3	1	Bajaj	\N	\N	f	\N	f
197	BAJ 3P1 PLAST	\N	\N	4	120.00	16.50	f	3	1	Bajaj	\N	\N	t	\N	t
337	Carcasa Chevrolet Abatible Spark Doble Corte 3 BTN	\N	https://res.cloudinary.com/drqabe11r/image/upload/v1771263033/softsmith/items/zmvykywvlgx0uj2ay0ex.jpg	64	500.00	0.00	f	1	1	\N	\N	\N	t	\N	t
251	Carcasa Renault Llave Control 2 BTN rect Kangoo	\N	/uploads/items/1790185252913-54e696affc48a.jpg	64	500.00	0.00	f	1	1	Renault, Kangoo, Clio, Master, Trafisc, Modus	\N	\N	t	A1	t
198	IKP2 PLAST	\N	\N	4	120.00	16.50	f	2	1	\N	\N	\N	t	\N	f
199	MOTO HOND 48DP PLAST	\N	\N	4	120.00	16.50	f	2	1	Honda	\N	\N	t	\N	f
200	MOTO HOND 48P PLAST	\N	\N	4	120.00	16.50	f	1	1	Honda	\N	\N	t	\N	f
201	ZA 9P PLAST	\N	\N	4	120.00	16.50	f	4	1	\N	\N	\N	t	\N	f
202	MOTO KTM M117 PLAST	\N	\N	4	120.00	16.50	f	5	1	KTM	\N	\N	t	\N	f
203	MOTO KTM M117 PLAST	\N	\N	4	120.00	16.50	f	2	1	KTM	\N	\N	t	\N	f
204	MOTO KTM   PLAST	\N	\N	4	120.00	16.50	f	1	1	KTM	\N	\N	t	\N	f
205	MOTO Yamaha PLAST	\N	\N	4	120.00	16.50	f	2	1	Yamaha	\N	\N	t	\N	f
206	MOTO Kawasaki KAW10 P PLAST	\N	\N	4	120.00	16.50	f	2	1	Kawasaki	\N	\N	t	\N	f
331	Carcasa Chevrolet Abatible Cavalier Regata 3 BTN	\N	https://res.cloudinary.com/drqabe11r/image/upload/v1771264128/softsmith/items/mii3sghifvlijayilitr.jpg	64	500.00	85.00	f	18	2	CHEVROLET, Cavalier	\N	\N	t	\N	t
372	Carcasa Honda Llave Control 3 BTN	\N	https://res.cloudinary.com/drqabe11r/image/upload/v1771260681/softsmith/items/tp9db5spcpmrf3ryoqau.jpg	64	500.00	0.00	f	5	3	Honda, Accord, Civic, CRV, HRV	\N	\N	t	\N	t
374	Carcasa Honda Llave Control 2 BTN	\N	https://res.cloudinary.com/drqabe11r/image/upload/v1771260628/softsmith/items/gxbmgnrz5dcv194kxbjj.jpg	64	500.00	0.00	f	10	3	Honda, Accord, Civic, CRV, HRV	\N	\N	t	\N	t
327	Carcasa Chevrolet Llave Control 3 BTN	\N	https://res.cloudinary.com/drqabe11r/image/upload/v1771262840/softsmith/items/pt8mibezgaeb8gapf5em.jpg	64	450.00	0.00	f	2	1	CHEVROLET	\N	\N	t	\N	t
377	Carcasa Honda Abatible 2 BTN	\N	https://res.cloudinary.com/drqabe11r/image/upload/v1771260885/softsmith/items/jfw1xfiwlvli0sgncebb.jpg	64	500.00	0.00	f	2	1	Honda, Accord, Civic, CRV, HRV	\N	\N	t	\N	t
376	Carcasa Honda Llave Control Odyssey 6 BTN	\N	https://res.cloudinary.com/drqabe11r/image/upload/v1771260793/softsmith/items/ay7b26oaoafoskchnutc.jpg	64	500.00	0.00	f	3	2	Honda, Odyssey	\N	\N	t	\N	t
534	Carcasa Honda Presencia 4 btns	\N	\N	64	500.00	0.00	f	4	1	Honda	\N	\N	t	\N	t
494	Carcasa KIA Abatible3 btns	\N	https://res.cloudinary.com/drqabe11r/image/upload/v1771269874/softsmith/items/tpgbtqosixiikoj37lny.jpg	64	600.00	0.00	f	2	1	Kia	\N	\N	t	\N	t
522	Carcasa Audi Abatible 2 BTN	\N	\N	64	500.00	\N	f	2	1	\N	\N	\N	t	\N	t
290	Carcasa Ford Control IND 3 BTN	\N	\N	64	350.00	0.00	f	4	3	Ford, Escape, Lobo	\N	\N	t	\N	t
259	Carcasa Peugeot 206  Llave Control 2 BTN	\N	\N	64	400.00	\N	f	1	1	\N	\N	\N	t	\N	t
249	Carcasa Renault Llave Control 2 BTN Duster	\N	\N	64	500.00	\N	f	1	1	Renault, Dacia, Duster, Logan, Sandero	\N	\N	t	\N	t
233	CASA DE6	\N	\N	2	25.00	4.40	f	1	1	\N	\N	\N	t	\N	f
230	CASA R52 COLORES	\N	\N	2	25.00	4.40	f	-3	1	\N	\N	\N	t	\N	f
250	Carcasa Reanult Llave Control 3 BTN Duster	\N	\N	64	500.00	\N	f	1	1	Renault, Dacia, Duster, Logan, Sandero	\N	\N	t	\N	t
252	Carcasa Renault Llave Control 2 BTN circ Clio	\N	\N	64	500.00	\N	f	2	1	Renault, Duster, Logan, Clio, Kangoo	\N	\N	t	\N	t
253	Carcasa Renault  Abatible 3 BTN	\N	\N	64	650.00	\N	f	2	1	Renault, Sandero, Stepway, Logan, Clio, Arkana, Captur, Kadjar, Trafic, Kangoo, Duster, Dokker, Master, Laguna, Scenic	\N	\N	t	\N	t
254	Carcasa Renault  Abatible 2 BTN	\N	\N	64	650.00	\N	f	3	1	Renault, Duster, Logan, Sandero, Clio, Captur, Kadjar, Kwid, Megane, Scenic, Trafic, Kangoo, Master, Modus	\N	\N	t	\N	t
411	Carcasa Volkswagen MQB Abatible 4 BTN	\N	https://res.cloudinary.com/drqabe11r/image/upload/v1771264237/softsmith/items/bhyhle4y1ui1nxi86mrt.jpg	64	500.00	0.00	f	0	1	Volkswagen, Jetta, Passat	\N	\N	t	\N	t
188	CASA AM7	\N	\N	2	25.00	4.40	f	4	1	\N	\N	\N	t	\N	f
255	Carcasa Renault Tarjeta 3 BTN	\N	\N	64	500.00	\N	f	3	1	Renault, Megane II, Scenic II	\N	\N	t	\N	t
107	Llave Candado AUS6	\N	\N	54	25.00	4.40	f	13	1	\N	\N	\N	t	\N	f
208	Casa puntos SCO14	\N	\N	50	95.00	20.00	f	3	1	\N	\N	\N	t	\N	f
209	Casa puntos DX1D	\N	\N	50	95.00	20.00	f	4	1	\N	\N	\N	t	\N	f
210	Casa puntos SOP 5	\N	\N	50	95.00	20.00	f	2	1	\N	\N	\N	t	\N	f
211	Casa puntos LOC9	\N	\N	50	95.00	20.00	f	5	1	\N	\N	\N	t	\N	f
212	Casa puntos LOC9 chiquita	\N	\N	50	95.00	20.00	f	5	1	\N	\N	\N	t	\N	f
256	Carcasa Nissan Llave Control Cebolla 4 BTN	\N	\N	64	350.00	\N	f	1	1	Nissan, Versa, Sentra, Rogue, Frontier, Xterra, Pathfinder	\N	\N	t	\N	t
257	Carcasa Nissan Control IND 4 BTN	\N	\N	64	400.00	\N	f	1	1	Nissan 	\N	\N	t	\N	t
258	Carcasa Nissan Control IND 2 BTN	\N	\N	64	350.00	\N	f	2	1	Nissan, Tsuru	\N	\N	t	\N	t
288	Carcasa Ford Abatible 2 BTN	\N	\N	64	500.00	\N	f	1	1	Ford, Focus	\N	\N	t	\N	t
291	Carcasa Mazda Abatible 4 BTN	\N	\N	64	500.00	\N	f	1	1	Mazda, CX3, CX6, Mazda 3	\N	\N	t	\N	t
289	Carcasa Ford Control IND 4 BTN	\N	\N	64	350.00	0.00	f	8	3	Ford, Escape, Lobo	\N	\N	t	\N	t
292	Carcasa Mazda Abatible 3 BTN	\N	\N	64	500.00	\N	f	1	1	Mazda, CX3, CX6, Mazda 3	\N	\N	t	\N	t
293	Carcasa Mazda Presencia 3 BTN	\N	\N	64	600.00	\N	f	3	1	Mazda, CX3, CX6, Mazda 3	\N	\N	t	\N	t
294	Carcasa Mazda Presencia 4 BTN	\N	\N	64	600.00	\N	f	6	1	Mazda, CX3, CX6, Mazda 3	\N	\N	t	\N	t
296	Carcasa Mazda Presencia Cuadrada 4 BTN	\N	\N	64	600.00	\N	f	3	1	Mazda, CX3, CX6, Mazda 3	\N	\N	t	\N	t
297	Carcasa Mazda Presencia Cuadrada 3 BTN	\N	\N	64	600.00	\N	f	1	1	Mazda, CX3, CX6, Mazda 3	\N	\N	t	\N	t
29	CASA R1 CORTA	\N	\N	2	25.00	4.40	f	26	1	\N	\N	\N	t	\N	t
37	CASA R52	\N	\N	2	25.00	4.40	f	10	1	\N	\N	\N	t	\N	t
330	Carcasa Chevrolet Abatible 5 BTN	\N	\N	64	500.00	\N	f	1	2	CHEVROLET	\N	\N	t	\N	t
335	Carcasa Chevrolet Presencia Cuadrada 6 BTN	\N	\N	64	600.00	\N	f	1	1	CHEVROLET, Tahoe, Suburban, Silverado, Colorado, Yukon, Sierra, Canyon	\N	\N	t	\N	t
336	Carcasa Chevrolet Corsa Control 2 BTN	\N	\N	64	350.00	\N	f	12	3	\N	\N	\N	t	\N	t
339	Carcasa FIAT Abatible 3 BTN	\N	\N	64	600.00	\N	f	2	1	FIAT, 500, 500L, Panda, Punto Evo, Boblo, Bravo, Qubo, Ducato	\N	\N	t	\N	t
338	Carcasa Chevrolet Llave Control Aveo 2 BTN	\N	\N	64	500.00	\N	f	2	1	CHEVROLET, Aveo, Cruze, Impala, Malibu, Orlando, Trax	\N	\N	t	\N	t
334	Carcasa Chevrolet Presencia 5 BTN	\N	\N	64	600.00	\N	f	3	1	CHEVROLET, GMC terrain	\N	\N	t	\N	t
328	Carcasa Chevrolet Llave Control 2 BTN	\N	https://res.cloudinary.com/drqabe11r/image/upload/v1771262942/softsmith/items/z9mello1xlbzbtldkt3s.jpg	64	500.00	0.00	f	1	2	CHEVROLET	\N	\N	t	\N	t
332	Carcasa Chevrolet Abatible Regata 2 BTN	\N	\N	64	500.00	110.00	f	4	2	CHEVROLET, SPark	\N	\N	t	\N	t
366	Carcasa Toyota Control Avanza IND 2 BTNS	\N	\N	64	350.00	\N	f	2	1	Toyota, Avanza	\N	\N	t	\N	t
367	Carcasa Toyota Llave Control Yaris 2 BTN	\N	\N	64	500.00	\N	f	5	1	Toyota, Yaris	\N	\N	t	\N	t
369	Carcasa Toyota Llave Control RAV4 2 BTN	\N	\N	64	500.00	\N	f	2	1	Toyota, RAV4, Highlander	\N	\N	t	\N	t
370	Carcasa Toyota Llave Control RAV4 3 BTN	\N	\N	64	500.00	\N	f	1	1	Toyota, RAV4, Highlander	\N	\N	t	\N	t
405	Carcasa Volkswagen DC Control 4 BTN	\N	\N	64	350.00	\N	f	2	2	Volkswagen, Jetta, Bora	\N	\N	t	\N	t
409	Carcasa KD Abatible 3 BTN	\N	\N	64	500.00	\N	f	5	1	KEYDIY	\N	\N	t	\N	t
412	Carcasa Volkswagen Medio Control Crossfox 2 BTN	\N	\N	64	350.00	\N	f	2	1	Volkswagen, Gol, Crossfox	\N	\N	t	\N	t
413	Carcasa Volkswagen Abatible Antigua 2 BTN	\N	\N	64	500.00	\N	f	2	1	Volkswagen, Jetta, Bora	\N	\N	t	\N	t
414	Carcasa KIA Abatible Sportage  2 BTN	\N	\N	64	500.00	\N	f	3	1	KIA, Sportage	\N	\N	t	\N	t
415	Carcasa KIA Abatible 3 BTN	\N	\N	64	500.00	\N	f	3	1	KIA, Sportage	\N	\N	t	\N	t
417	Carcasa KIA Abatible Ovalada Mirage 4 BT	\N	\N	64	600.00	\N	f	1	1	KIA, Sportage, Mirage	\N	\N	t	\N	t
418	Carcasa KIA Abatible Cuadrada 4 BTN	\N	\N	64	600.00	\N	f	2	1	KIA, K3, K4	\N	\N	t	\N	t
426	Carcasa BMW Llave Control 3 BTN	\N	\N	64	700.00	\N	f	3	1	BMW	\N	\N	t	\N	t
428	Carcasa Llave Prescencia BMW 3 BTN	\N	\N	64	700.00	\N	f	2	1	BMW	\N	\N	t	\N	t
375	Carcasa Honda Llave Control City 4 BTN	\N	https://res.cloudinary.com/drqabe11r/image/upload/v1771260820/softsmith/items/bkoxheyquxjakzjkce9o.jpg	64	500.00	0.00	f	4	1	Honda, City	\N	\N	t	\N	t
371	Carcasa Toyota Llave Control Avanza 2 BTN	\N	https://res.cloudinary.com/drqabe11r/image/upload/v1771262667/softsmith/items/iecu3974okacyculcvpw.jpg	64	500.00	0.00	f	7	1	Toyota, Avanza	\N	\N	t	\N	t
378	Carcasa Honda Abatible 3 BTN	\N	https://res.cloudinary.com/drqabe11r/image/upload/v1771260909/softsmith/items/znkhkp5u9ihu9bfd4ein.jpg	64	500.00	0.00	f	2	1	Honda, Accord, Civic, CRV, HRV	\N	\N	t	\N	t
368	Carcasa Toyota Llave control Yaris 3 BTN	\N	\N	64	500.00	0.00	f	4	1	Toyota, Yaris	\N	\N	t	\N	t
406	Carcasa Volkswagen DC Abatible 4 BTN	\N	\N	64	500.00	\N	f	15	4	Volkswagen, Jetta, Bora	\N	\N	t	\N	t
140	Casa Tetra XF12	\N	\N	49	50.00	9.00	f	10	1	\N	\N	\N	t	\N	t
373	Carcasa Honda Llave Control 4 BTN	\N	https://res.cloudinary.com/drqabe11r/image/upload/v1771260721/softsmith/items/x9bv9s1bvtkmd8gtflid.jpg	64	500.00	0.00	f	9	3	Honda, Accord, Civic, CRV, HRV	\N	\N	t	\N	t
444	Carcasa Mitsubishi Llave Control 2 BTN	\N	\N	64	500.00	\N	f	1	1	Mitsubishi, Lancer	\N	\N	t	\N	t
445	Carcasa Chevrolet Llave Control Optra 3 BTN	\N	\N	64	500.00	\N	f	1	1	Chevrolet, Opel, Optra	\N	\N	t	\N	t
446	Carcasa Hyundai Llave Control vieja 1 BTN	\N	\N	64	500.00	\N	f	1	1	Hyundai, Dodge, Attitude	\N	\N	t	\N	t
448	Carcasa Susuki 2 Llave Control 2 BTN	\N	\N	64	500.00	\N	f	1	1	Suzuki	\N	\N	t	\N	t
449	Carcasa Chrysler/ Dodge/Jeep Presencia 5 BTN	\N	\N	64	600.00	\N	f	1	1	Chrysler, Dodge, Jeep, RAM	\N	\N	t	\N	t
450	Carcasa Chrysler/ Dodge/ Jeep Presencia 4 BTN	\N	\N	64	600.00	\N	f	1	1	Chrysler, Dodge, Jeep, RAM	\N	\N	t	\N	t
451	Carcasa Chrysler/ Dodge/ Jeep Llave Control 3 BTN	\N	\N	64	500.00	\N	f	4	1	Chrysler, Dodge, Jeep, RAM	\N	\N	t	\N	t
453	Carcasa Chrysler/ Dodge/ Jeep Llave Control 4 BTN	\N	\N	64	600.00	\N	f	1	1	Chrysler, Dodge, Jeep, RAM	\N	\N	t	\N	t
454	Carcasa Chrysler/Dodge/Jeep Fobik 5 BTN	\N	\N	64	600.00	\N	f	1	1	Chrysler, Dodge, Jeep, RAM	\N	\N	t	\N	t
295	LIBRE	\N	\N	10	0.10	\N	f	\N	\N	\N	\N	\N	f	\N	f
302	LIBRE	\N	\N	10	0.10	\N	f	\N	\N	\N	\N	\N	f	\N	f
455	Carcasa Abatible 4 BTN Regata FORD	\N	\N	64	600.00	125.00	f	2	1	Ford, Focus, Escape	\N	\N	t	\N	t
456	Carcasa Abatible 3 BTN Regata FORD	\N	\N	64	600.00	125.00	f	3	1	Ford, Focus, Escape	\N	\N	t	\N	t
457	Carcasa Abatible 2 BTN Regata FORD	\N	\N	64	600.00	\N	f	2	1	Ford, Focus, Escape	\N	\N	t	\N	t
483	Carcasa GM Control IND 3 BTN	\N	\N	64	350.00	\N	f	4	1	GM, General Motors	\N	\N	t	\N	t
484	Carcasa GM Control IND 5 BTN	\N	\N	64	350.00	\N	f	1	1	GM, General Motors	\N	\N	t	\N	t
485	Carcasa GM Control IND 4 BTN	\N	\N	64	350.00	\N	f	2	1	GM, General Motors	\N	\N	t	\N	t
486	Carcasa GM Control IND 5 BTN 2.0	\N	\N	64	350.00	\N	f	3	1	GM, General Motors	\N	\N	t	\N	t
488	Carcasa JEEP Abatible 4 BTN	\N	\N	64	700.00	\N	f	2	1	Jeep	\N	\N	t	\N	t
490	Carcasa MINI Cooper Llave Control 3 BTN	\N	\N	64	500.00	\N	f	1	1	Mini Cooper	\N	\N	t	\N	t
491	Carcasa Inserto MINI Cooper Sloth Anillo 3 BTN	\N	\N	64	600.00	\N	f	1	1	Mini Cooper	\N	\N	t	\N	t
492	Carcasa Inserto MINI Cooper Sloth Botones Columna 3 BTN	\N	\N	64	600.00	\N	f	1	1	Mini Cooper	\N	\N	t	\N	t
493	Carcasa Control Honda Accord 4 BTN	\N	\N	64	500.00	\N	f	2	1	Honda, Accord	\N	\N	t	\N	t
304	Llave Hueca Ford F024P2 Regata	\N	\N	60	350.00	10.00	f	6	1	Ford	\N	\N	t	\N	t
666	Media Llave Ford HU100 Regata	\N	https://res.cloudinary.com/drqabe11r/image/upload/v1771274589/softsmith/items/tq7aftaahz0xyx0ropyn.jpg	60	250.00	50.00	f	4	1	Ford	\N	\N	t	\N	t
674	PERNO	\N	\N	60	30.00	0.00	f	99	2	\N	\N	\N	t	\N	t
503	Llave Hueca Regata BMW BM-6P6	\N	\N	60	350.00	30.00	f	5	1	BMW	\N	\N	t	\N	t
260	Llave Hueca Nissan Renault  Aprio Kangoo	\N	\N	60	350.00	\N	f	8	1	Nissan, Renault, Kangoo, Aprio	\N	\N	t	\N	t
261	Llave Hueca Nissan VA34P4 Platina	\N	\N	60	350.00	\N	f	5	1	Nissan, Renault, Platina, Clio	\N	\N	t	\N	t
263	Llave Hueca Citroen DobleCorte	\N	\N	60	350.00	\N	f	3	1	Citroen	\N	\N	t	\N	t
264	Llave Hueca Peugeout Regata Partner	\N	\N	60	350.00	\N	f	7	1	Peugeot, Partner	\N	\N	t	\N	t
266	Llave Hueca Nissan  DAT15P3	\N	\N	60	350.00	\N	f	5	1	Nissan, Versa, Sentra, Rogue, Frontier, Xterra, Pathfinder	\N	\N	t	\N	t
273	Tarjeta Megane Orig 3/4 BTN	\N	\N	60	4500.00	\N	f	4	2	Renault, Megane	\N	\N	t	\N	t
298	Llave Hueca Ford DobleCorte F015DP Edge	\N	\N	60	350.00	\N	f	8	2	Ford, Edge	\N	\N	t	\N	t
299	Llave Hueca Ford DobleCorte F015DCP Ranger	\N	\N	60	350.00	\N	f	2	2	Ford, Ranger	\N	\N	t	\N	t
301	Llave Hueca Ford DobleCorte F0-TXP Fiesta	\N	\N	60	350.00	\N	f	3	2	Ford, Fiesta	\N	\N	t	\N	t
303	Llave Hueca Ford Regata F024P	\N	\N	60	350.00	\N	f	3	2	Ford, Escape	\N	\N	t	\N	t
305	Llave Hueca Ford Tibe F0-6P	\N	\N	60	350.00	\N	f	6	2	Ford, Fiesta, Festiva, Mondeo	\N	\N	t	\N	t
306	Llave Hueca Mazda DobleCorte 	\N	\N	60	350.00	\N	f	3	2	Mazda, CX3	\N	\N	t	\N	t
340	Llave Hueca Suzuki SUZU8P1	\N	\N	60	350.00	\N	f	2	1	Suzuki, Grand Vitara	\N	\N	t	\N	t
341	Llave Hueca Daewoo Matisse	\N	\N	60	350.00	\N	f	3	3	Daewoo, Matisse	\N	\N	t	\N	t
342	Llave Hueca Chevrolet OP-DP Chevy izq	\N	\N	60	350.00	\N	f	6	3	Chevrolet, Chevy	\N	\N	t	\N	t
344	Llave Hueca Chevrolet Cadillac	\N	\N	60	350.00	\N	f	4	2	Chevrolet, Cadillac, Buick	\N	\N	t	\N	t
345	Llave Hueca Chevrolet Signo Mas (+)	\N	\N	60	350.00	\N	f	4	2	Chevrolet, Cadillac, Buick	\N	\N	t	\N	t
346	Llave Hueca Chevrolet Pontiac GM43P	\N	\N	60	350.00	\N	f	6	2	Chevrolet, Pontiac, GM	\N	\N	t	\N	t
349	Llave Hueca Chevrolet Aveo DAE-3P4 der	\N	\N	60	350.00	\N	f	3	3	Chevrolet, Aveo	\N	\N	t	\N	t
350	Llave Hueca Chevrolet Aveo DAE-3P4 izq	\N	\N	60	350.00	\N	f	4	3	Chevrolet, Aveo	\N	\N	t	\N	t
351	Llave Hueca Chevrolet Aveo DAE-3P5 der	\N	\N	60	350.00	\N	f	4	3	Chevrolet, Aveo, Pontiac	\N	\N	t	\N	t
300	Llave Hueca Ford DobleCorte F0-30DP Explorer	\N	\N	60	350.00	0.00	f	7	2	Ford, Explorer	\N	\N	t	\N	t
347	Llave Hueca Chevrolet Regata HU100	\N	\N	60	350.00	0.00	f	12	3	Chevrolet, Trax, Sonic	\N	\N	t	\N	t
307	Llave Hueca GM OP11P2 Regata	\N	\N	60	350.00	\N	f	2	1	General Motors, GM, Chevrolet, Buick	\N	\N	t	\N	t
379	Llave Hueca Chevrolet OP-SP Chevy der	\N	\N	60	350.00	\N	f	2	3	Chevrolet, Chevy	\N	\N	t	\N	t
382	Llave Hueca Toyota Camry Regata TOYO-36P	\N	\N	60	350.00	\N	f	4	1	Toyota, Camry	\N	\N	t	\N	t
383	Llave Hueca Mercedes ME-16P Regata	\N	\N	60	350.00	\N	f	5	1	Mercedes Benz, Sprinter	\N	\N	t	\N	t
385	Llave Hueca Mitsubishi MIT-8DP2 IZQ	\N	\N	60	350.00	\N	f	2	2	Mitsubishi, Lancer, Outlander	\N	\N	t	\N	t
386	Llave Hueca Mitsubishi MIT-18P 	\N	\N	60	350.00	\N	f	6	2	Mitsubishi, Lancer, Outlander	\N	\N	t	\N	t
387	Llave Hueca Mitsubishi MIT-12P2 DER	\N	\N	60	350.00	\N	f	2	2	Mitsubishi, Lancer, Outlander	\N	\N	t	\N	t
388	Llave Hueca Honda HOND21P Accord	\N	\N	60	350.00	\N	f	2	3	Honda, Accord, Civic	\N	\N	t	\N	t
389	Llave Hueca Honda Regata CRV HOND31P	\N	\N	60	350.00	\N	f	2	3	Honda, Accord, Civic, CRV, HRV	\N	\N	t	\N	t
424	Llave Hueca Volkswagen V0-2P Vocho der	\N	\N	60	350.00	\N	f	2	1	Volkswagen, Vocho	\N	\N	t	\N	t
425	Llave Hueca Volkswagen V0-2DP Vocho izq	\N	\N	60	350.00	\N	f	3	1	Volkswagen, Vocho	\N	\N	t	\N	t
429	Llave Hueca BMW Regata Hueco	\N	\N	60	350.00	\N	f	3	1	BMW	\N	\N	t	\N	t
381	Llave Hueca Toyota TOYO15P 	\N	\N	60	350.00	\N	f	3	3	Toyota, Yaris	\N	\N	t	\N	t
420	Llave Hueca Volkswagen V0-8P Gol	\N	\N	60	350.00	\N	f	12	2	Volkswagen, Gol	\N	\N	t	\N	t
419	Llave Hueca Volkswagen HU66	\N	\N	60	350.00	\N	f	14	4	Volkswagen, Jetta, Bora	\N	\N	t	\N	t
458	Llave Hueca Chrysler Fobik CHR15P1	\N	\N	60	350.00	\N	f	3	3	Chrysler, Dodge, Jeep, RAM	\N	\N	t	\N	t
459	Llave Hueca Chrysler Gris CHR-15P	\N	\N	60	350.00	\N	f	7	3	Chrysler, Jeep, PT Cruiser	\N	\N	t	\N	t
461	Llave Hueca Fiat Regata Palio	\N	\N	60	350.00	\N	f	2	1	Fiat, Palio, Mobi	\N	\N	t	\N	t
462	Llave Hueca Fiat Uno DobleCorte	\N	\N	60	350.00	\N	f	1	1	Fiat, Uno	\N	\N	t	\N	t
463	Llave Hueca Hyundai KK10P Tucson	\N	\N	60	350.00	\N	f	12	1	Kia, Tucson, Rio	\N	\N	t	\N	t
465	Llave Inserto Mini Cooper Sloth Botones En Columna	\N	\N	60	4000.00	\N	f	1	1	Mini Cooper, Mini	\N	\N	t	\N	t
466	Llave Inserto Mini Cooper Sloth Anillo Circular	\N	\N	60	4000.00	\N	f	1	1	Mini Cooper, Mini	\N	\N	t	\N	t
467	Llave Hueca BMW Regata Recta	\N	\N	60	350.00	\N	f	8	1	BMW	\N	\N	t	\N	t
468	Llave Inserto BMW BMI33 3 BTN Orig	\N	\N	60	350.00	\N	f	5	1	BMW, 328i	\N	\N	t	\N	t
496	Llave Hueca Toyota TOYO-18P Regata	\N	\N	60	350.00	\N	f	1	1	Toyota	\N	\N	t	\N	t
497	Llave Hueca Volvo Regata	\N	\N	60	350.00	\N	f	9	1	Volvo	\N	\N	t	\N	t
498	Llave Hueca Volvo Regata HUDHP	\N	\N	60	350.00	\N	f	1	1	Volvo	\N	\N	t	\N	t
499	Llave Hueca Volvo Regata S60	\N	\N	60	350.00	\N	f	1	1	Volvo, S60	\N	\N	t	\N	t
501	Llave Hueca Mercury Logo	\N	\N	60	350.00	\N	f	1	1	Mercury, Lincoln	\N	\N	t	\N	t
502	Llave Hueca Hyundai Regata 	\N	\N	60	350.00	\N	f	1	1	Hyundai	\N	\N	t	\N	t
360	Abatible Chevrolet Cruze MCHE201 3 BTN Orig	\N	\N	18	2000.00	0.00	f	2	1	Chevrolet, Cruze, Malibu	\N	\N	t	\N	t
435	Abatible Generico Honda KEYDIY 4 BTN	\N	\N	18	1600.00	\N	f	9	3	KEYDIY	\N	\N	t	\N	t
478	Llave Control Chrysler Cajuela 4 BTN	\N	\N	18	1800.00	0.00	f	11	1	Chrysler, Dodge, Jeep, RAM	\N	\N	t	\N	t
365	Abatible Chevrolet 5 BTN Regata	\N	\N	18	2800.00	500.00	f	4	1	Chevrolet	\N	\N	t	\N	t
268	Llave Control Renault 2 BTN circ	\N	\N	18	2300.00	\N	f	4	1	Renault, Duster, Logan, Clio, Kangoo	\N	\N	t	\N	t
270	Llave Control Renault 2 BTN rect 	\N	\N	18	2300.00	\N	f	5	1	Renault, Kangoo, Clio, Master, Trafisc, Modus	\N	\N	t	\N	t
271	Renault Llave Control 2 BTN Duster	\N	\N	18	3500.00	\N	f	2	1	Renault, Dacia, Duster, Logan, Sandero	\N	\N	t	\N	t
272	Abatible Renault Clio 3 BTN Orig	\N	\N	18	3500.00	\N	f	1	1	Renault, Clio	\N	\N	t	\N	t
274	Llave Valet Nissan L116 Orig	\N	\N	18	1100.00	\N	f	14	3	Nissan, Sentra, Versa	\N	\N	t	\N	t
276	Llave Control Nissan Cebolla 4 BTN Orig	\N	\N	18	1800.00	\N	f	11	2	Nissan, Sentra, Versa	\N	\N	t	\N	t
278	Llave Control Nissan Cebolla  3 BTN Orig	\N	\N	18	1800.00	\N	f	2	1	Nissan, Sentra, Versa	\N	\N	t	\N	t
308	Llave Control Ford Tibe Transit 3 BTN	\N	\N	18	1800.00	\N	f	1	1	Ford, Transit	\N	\N	t	\N	t
309	Llave Control Ford Tibe Fiesta 3 BTN 	\N	\N	18	1800.00	\N	f	3	1	Ford, Fiesta, Festiva, Mondeo	\N	\N	t	\N	t
310	Llave Control Ford Regata Escape 4 BTN Orig 	\N	\N	18	1800.00	\N	f	3	1	Ford, Escape	\N	\N	t	\N	t
311	Llave Control Ford DobleCorte Explorer 5 BTN Orig	\N	\N	18	1800.00	\N	f	2	1	Ford, Explorer	\N	\N	t	\N	t
312	Llave Control Ford Regata Escape 3 BTN Orig 	\N	\N	18	2500.00	\N	f	2	1	Ford, Escape	\N	\N	t	\N	t
315	Llave Control Ford Fusion Abatible 4 BTN Orig	\N	\N	18	2500.00	\N	f	1	1	Ford, Fusion	\N	\N	t	\N	t
316	Llave Control Ford Focus Abatible 3 BTN Orig	\N	\N	18	2500.00	\N	f	1	1	Ford, Focus	\N	\N	t	\N	t
321	Llave Control Ford  DobleCorte Escape 4 BTN Orig	\N	\N	18	2500.00	\N	f	2	1	Ford, Escape, Expedition	\N	\N	t	\N	t
324	Llave Control Mazda KEYDIY 4 BTN	\N	\N	18	1600.00	\N	f	5	1	Mazda, CX3, CX6, Mazda 3	\N	\N	t	\N	t
353	Abatible Chevrolet 4/3 BTN Cruze Malibu Orig	\N	\N	18	2000.00	\N	f	2	1	Chevrrolet, Cruze, Malibu	\N	\N	t	\N	t
354	Abatible Chevrolet Spark DobleCorte 2 BTN	\N	\N	18	2000.00	\N	f	1	1	Chevrolet, Spark	\N	\N	t	\N	t
356	Abatible Chevrolet Cruze Malibu 2 BTN Orig	\N	\N	18	3500.00	\N	f	1	1	Chevrolet, Cruze, Malibu	\N	\N	t	\N	t
358	Llave Control Chevrolet Spark 2 BTN Orig	\N	\N	18	2000.00	\N	f	1	1	Chevrolet, Spark	\N	\N	t	\N	t
359	Llave Control Chevrolet Aveo 2 BTN 	\N	\N	18	1800.00	\N	f	3	1	Chevrolet, Aveo	\N	\N	t	\N	t
361	Abatible Chevrolet Tahoe 26363799	\N	\N	18	2000.00	\N	f	2	1	Chevrolet, Tahoe	\N	\N	t	\N	t
362	Abatible Opel Astra 3 BTN	\N	\N	18	2000.00	\N	f	1	1	Opel, Astra	\N	\N	t	\N	t
357	Llave Control Toyota Avanza 2 BTN Orig	\N	\N	18	2300.00	\N	f	1	1	Toyota, Avanza	\N	\N	t	\N	t
355	Abatible Chevrolet Regata 4 BTN	\N	\N	18	2000.00	0.00	f	5	1	Chevrolet, Silverado, Colorado	\N	\N	t	\N	t
391	Llave Control Toyota RAV4 Highlander 3 BTN Orig	\N	\N	18	2500.00	\N	f	3	1	Toyota, RAV4, Highlander	\N	\N	t	\N	t
395	Llave Control Honda 4 BTN Orig 	\N	\N	18	2500.00	\N	f	1	1	Honda, Accord, Civic, CRV, HRV	\N	\N	t	\N	t
396	Llave Control Honda 3 BTN Orig 	\N	\N	18	2500.00	\N	f	1	1	Honda, Accord, Civic, CRV, HRV	\N	\N	t	\N	t
397	Llave Control Honda Odyssey 6 BTN Orig	\N	\N	18	2800.00	\N	f	5	1	Honda, Odyssey	\N	\N	t	\N	t
430	Llave Control BMW 3 BTN Orig	\N	\N	18	3300.00	\N	f	3	1	BMW	\N	\N	t	\N	t
431	Llave Control Mitsubishi Lancer 2 BTN Orig	\N	\N	18	2500.00	\N	f	1	1	Mitsubishi, Lancer	\N	\N	t	\N	t
436	Abatible Generico Volkswagen KEYDIY 4 BTN	\N	\N	18	1600.00	\N	f	9	2	KEYDIY	\N	\N	t	\N	t
438	Abatible Generico MQB KEYDIY 	\N	\N	18	1600.00	\N	f	2	1	KEYDIY	\N	\N	t	\N	t
441	Abatible MQB Volkswagen Orig 3 BTN	\N	\N	18	3500.00	\N	f	1	1	Volkswagen, Jetta, MQB	\N	\N	t	\N	t
442	Abatible DC Volkswagen Orig 4 BTN	\N	\N	18	2300.00	\N	f	2	1	Volkswagen, Jetta, Bora	\N	\N	t	\N	t
443	Abatible AH Volkswagen Orig 4 BTN	\N	\N	18	2300.00	\N	f	2	1	Volkswagen, Jetta, Bora	\N	\N	t	\N	t
392	Llave Control Toyota KEYDIY Corazon 4 BTN	\N	\N	18	1600.00	\N	f	8	1	\N	\N	\N	t	\N	t
437	Abatible Generico Volkswagen XHORSE 4 BTN	\N	\N	18	1600.00	\N	f	7	2	KEYDIY	\N	\N	t	\N	t
402	Llave Control Honda City 3/4 BTN Orig	\N	\N	18	2800.00	0.00	f	2	1	Honda, City	\N	315MHz	t	\N	t
403	Llave Control Honda City 4 BTN Orig	\N	\N	18	2800.00	0.00	f	2	1	Honda, City	\N	434MHz	t	\N	t
439	Abatible Genericho Chevrolet XHORSE	\N	\N	18	1600.00	\N	f	8	2	XHORSE	\N	\N	t	\N	t
471	Llave Control Toyota RAV4 Highlander 4 BTN Orig	\N	\N	18	2800.00	\N	f	1	1	Toyota, RAV4, Highlander	\N	\N	t	\N	t
472	Llave FOBIK  Original Dodge C01C 3 BTN	\N	\N	18	2500.00	\N	f	4	2	Chrysler, Dodge, Jeep, RAM	\N	\N	t	\N	t
475	Llave FOBIK Original Chrysler CON296 4 BTN	\N	\N	18	2500.00	\N	f	2	1	Chrysler, Dodge, Jeep, RAM	\N	\N	t	\N	t
281	Llave Prescencia Nissan 815 4 BTN	\N	\N	62	2000.00	0.00	f	6	1	Nissan, Sentra, Versa	\N	\N	t	\N	t
279	Llave Prescencia Nissan 808 3 BTN	\N	\N	62	2000.00	\N	f	1	1	Nissan, Sentra, Versa	\N	\N	t	\N	t
280	Llave Prescencia Nissan U771 3 BTN	\N	\N	62	2000.00	\N	f	1	1	Nissan, Sentra, Versa	\N	\N	t	\N	t
283	Llave Prescencia Nissan 44106 4 BTN	\N	\N	62	2000.00	\N	f	1	1	Nissan, Sentra, Versa	\N	\N	t	\N	t
284	Llave Prescencia Nissan 48903 4 BTN	\N	\N	62	2000.00	\N	f	1	1	Nissan, Sentra, Versa	\N	\N	t	\N	t
285	Llave Prescencia Nissan 729 3 BTN	\N	\N	62	2000.00	\N	f	2	1	Nissan, Sentra, Versa	\N	\N	t	\N	t
286	Llave Prescencia Nissan 49616 4 BTN	\N	\N	62	2000.00	\N	f	3	1	Nissan, Sentra, Versa	\N	\N	t	\N	t
287	Llave Prescencia Nissan 840 4 BTN	\N	\N	62	2000.00	\N	f	2	1	Nissan, Sentra, Versa	\N	\N	t	\N	t
314	Llave Prescencia Ford Focus 3 BTN Orig	\N	\N	62	2500.00	\N	f	1	1	Ford, Focus	\N	\N	t	\N	t
325	Llave Prescencia Mazda Cuadrada 3 BTN	\N	\N	62	3500.00	\N	f	2	1	Mazda, CX3, CX6, Mazda 3	\N	\N	t	\N	t
326	Llave Prescencia Mazda Cuadrada 4 BTN	\N	\N	62	3500.00	\N	f	3	1	Mazda, CX3, CX6, Mazda 3	\N	\N	t	\N	t
393	Llave Prescencia Toyota Orig 3 BTN	\N	\N	62	3000.00	\N	f	2	1	\N	\N	\N	t	\N	t
400	Llave Prescencia Honda Odyssey 7 BTN Orig	\N	\N	62	3500.00	\N	f	2	1	Honda, Odyssey	\N	\N	t	\N	t
404	Llave Prescencia Honda Civic 4 BTN Orig	\N	\N	62	3500.00	0.00	f	1	1	Honda, Civic, City	\N	\N	t	\N	t
329	Carcasa Chevrolet  Abatible 4 BTN	\N	https://res.cloudinary.com/drqabe11r/image/upload/v1771263168/softsmith/items/ecdxm5f1wpzy3yeptskz.jpg	64	500.00	0.00	f	8	2	CHEVROLET	\N	\N	f	\N	f
470	Llave Prescencia BMW 3 BTN Orig	\N	\N	62	3800.00	\N	f	1	1	BMW, 328i	\N	\N	t	\N	t
473	Llave Prescencia Dodge 3 BTN Orig	\N	\N	62	3000.00	\N	f	1	1	Dodge, Journey, Durango	\N	\N	t	\N	t
474	Llave Prescencia Dodge Ram 4 BTN Orig	\N	\N	62	3000.00	\N	f	2	1	Dodge, RAM, Journey	\N	\N	t	\N	t
481	Llave Prescencia Hyundai Tucson 3 BTN Orig	\N	\N	62	4000.00	\N	f	2	1	Hyundai, Tucson	\N	\N	t	\N	t
482	Llave Prescencia Kia Rio 3 BTN Orig	\N	\N	62	4000.00	\N	f	1	1	Kia, Rio	\N	\N	t	\N	t
555	Llave Prescencia Generica XHORSE 3 BTN 	\N	\N	62	3000.00	\N	f	1	2	XHORSE	\N	\N	t	\N	t
556	Llave Prescencia Toyota RAV4 4 BTN	\N	\N	62	3500.00	\N	f	1	2	Toyota, RAV4	\N	\N	t	\N	t
600	Llave Prescencia Nissan KR5TXN1 Orig 4 BTN	\N	\N	62	3500.00	\N	f	2	1	\N	\N	\N	t	\N	t
275	Control Nissan KBRASTU15 4 BTN	\N	\N	22	900.00	\N	f	2	1	Nissan, Murano	\N	\N	t	\N	t
320	Control Ford Lincoln 5 BTN IND	\N	\N	22	750.00	\N	f	2	1	Ford, Lincoln, Escape	\N	\N	t	\N	t
352	Control Chevrolet 4 BTN Cuadrado Silverado	\N	\N	22	1100.00	\N	f	2	1	Chevrolet, Silverado, Colorado	\N	\N	t	\N	t
363	Control Corsa 2 BTN	\N	\N	22	600.00	\N	f	4	2	\N	\N	\N	t	\N	t
364	Control Separable Opel Astra G 2 BTN	\N	\N	22	600.00	\N	f	1	1	Opel, Astra G, Zafira	\N	\N	t	\N	t
318	Control Ford 4 BTN IND	\N	\N	22	600.00	\N	f	17	3	Ford, Escape, Lobo	\N	\N	t	\N	t
317	Control Ford 3 BTN IND	\N	\N	22	600.00	0.00	f	13	3	Ford, Escape, Lobo	\N	\N	t	\N	t
394	Control Toyota 4 BTN IND ORIG Highlander	\N	\N	22	1100.00	\N	f	3	1	Toyota, Highlander	\N	\N	t	\N	t
399	Control Honda Accord 4 BTN Orig	\N	\N	22	1000.00	\N	f	3	1	Honda, Civic, Accord	\N	\N	t	\N	t
401	Control Honda Odyssey 6 BTN	\N	\N	22	1200.00	\N	f	4	1	\N	\N	\N	t	\N	t
432	Control Generico Puertas Corredizas KEYDIY 6 BTN	\N	\N	22	1100.00	\N	f	1	1	KEYDIY	\N	\N	t	\N	t
440	Control Generico Suzuki XHORSE	\N	\N	22	1100.00	\N	f	1	1	XHORSE, Suzuki	\N	\N	t	\N	t
513	Control GM KOBGT04A 4 BTN	\N	\N	22	1000.00	\N	f	2	1	GM, General Motors	\N	\N	t	\N	t
433	Control Generico KEYDIY 4 BTN	\N	\N	22	900.00	\N	f	7	3	KEYDIY	\N	\N	t	\N	t
434	Control Generico XHORSE 4 BTN	\N	\N	22	900.00	\N	f	5	3	KEYDIY	\N	\N	t	\N	t
479	Control Stratus 4 BTN	\N	\N	22	1000.00	\N	f	2	1	Dodge, Stratus	\N	\N	t	\N	t
480	Control Stratus 3 BTN	\N	\N	22	1000.00	\N	f	1	1	Dodge, Stratus	\N	\N	t	\N	t
509	Control GM OUC60270 6 BTN	\N	\N	22	900.00	\N	f	3	1	GM, General Motors	\N	\N	t	\N	t
510	Control GM OUC60270 5 BTN	\N	\N	22	1000.00	\N	f	7	1	GM, General Motors	\N	\N	t	\N	t
511	Control GM OUC60270 4 BTN	\N	\N	22	1000.00	\N	f	3	1	GM, General Motors	\N	\N	t	\N	t
512	Control GM KOBGT04A 6 BTN	\N	\N	22	1000.00	\N	f	4	1	GM, General Motors	\N	\N	t	\N	t
514	Control GM KOBLEAR1XT 4 BTN	\N	\N	22	1000.00	\N	f	4	1	GM, General Motors	\N	\N	t	\N	t
515	Control GM KOBLEAR1XT 3 BTN	\N	\N	22	1000.00	\N	f	4	1	GM, General Motors	\N	\N	t	\N	t
516	Control GM LC20007T	\N	\N	22	1000.00	\N	f	3	1	GM, General Motors	\N	\N	t	\N	t
519	Control Nissan Tsuru 2 BTN	\N	\N	22	900.00	\N	f	1	1	Nissan, Tsuru	\N	\N	t	\N	t
548	Control Generico Cuadrado KEYDIY	\N	\N	22	900.00	\N	f	1	1	KEYDIY	\N	\N	t	\N	t
549	Control Generico Porton KEYDIY	\N	\N	22	900.00	\N	f	1	1	KEYDIY	\N	\N	t	\N	t
559	Control Generico KEYDIY 3 BTN Ferrari	\N	\N	22	1000.00	\N	f	1	1	Ferrari	\N	\N	t	\N	t
608	Chip ID48 Malayo	\N	\N	44	120.00	0.00	f	30	2	VW, Seat	ID48	\N	t	\N	t
664	CHIP 4D original	\N	\N	44	100.00	0.00	f	19	2	\N	\N	\N	t	\N	t
654	Llavin VW Cortado	\N	\N	65	350.00	0.00	f	5	5	VW	\N	\N	t	\N	t
237	CR1632	\N	\N	63	90.00	10.00	f	5	1	\N	\N	\N	t	\N	t
241	CR1216	\N	\N	63	90.00	10.00	f	18	2	\N	\N	\N	t	\N	t
242	CR1225	\N	\N	63	90.00	2.00	f	5	2	\N	\N	\N	t	\N	t
247	CR13	\N	\N	63	35.00	5.00	f	6	1	\N	\N	\N	t	\N	t
248	CR2430	\N	\N	63	150.00	25.00	f	3	1	\N	\N	\N	t	\N	t
246	CR2032	\N	https://res.cloudinary.com/drqabe11r/image/upload/v1770532629/softsmith/items/q82yeobm1xs2pwx2wih7.png	63	90.00	10.00	f	10	5	\N	\N	\N	t	\N	t
235	CR1616	\N	\N	63	90.00	10.00	f	4	1	\N	\N	\N	t	\N	t
236	CR1620	\N	\N	63	90.00	10.00	f	8	1	\N	\N	\N	t	\N	t
245	CR27A	\N	\N	63	90.00	10.00	f	4	2	\N	\N	\N	t	\N	t
238	CR2025	\N	\N	63	90.00	10.00	f	21	3	\N	\N	\N	t	\N	t
240	CR2016	\N	\N	63	90.00	10.00	f	14	2	\N	\N	\N	t	\N	t
243	CR2450	\N	\N	63	150.00	25.00	f	3	1	\N	\N	\N	t	\N	t
244	CR23A	\N	\N	63	90.00	10.00	f	9	2	\N	\N	\N	t	\N	t
239	CR1220	\N	\N	63	90.00	10.00	f	8	2	\N	\N	\N	t	\N	t
72	Llave Candado M15A	\N	\N	54	25.00	4.40	f	5	1	\N	\N	\N	t	\N	f
75	Llave CANDADO R57	\N	\N	54	25.00	4.40	f	4	1	\N	\N	\N	t	\N	f
76	Llave CANDADO R57D	\N	\N	54	25.00	4.40	f	10	1	\N	\N	\N	t	\N	f
78	Llave CANDADO T32	\N	\N	54	25.00	4.40	f	5	1	\N	\N	\N	t	\N	f
77	Llave CANDADO T3NR	\N	\N	54	25.00	4.40	f	9	1	\N	\N	\N	t	\N	f
73	Llave CANDADO TIM 1D	\N	\N	54	25.00	4.40	f	7	1	\N	\N	\N	t	\N	f
469	LIBRE	\N	\N	10	0.10	\N	f	\N	\N	\N	\N	\N	f	\N	f
489	LIBRE	\N	\N	10	0.10	\N	f	\N	\N	\N	\N	\N	f	\N	f
495	LIBRE	\N	\N	10	0.10	\N	f	\N	\N	\N	\N	\N	f	\N	f
148	Llave CANDADO M1	\N	\N	54	25.00	4.40	f	20	1	\N	\N	\N	t	\N	f
151	Llave CANDADO M15	\N	\N	54	25.00	4.40	f	16	1	\N	\N	\N	t	\N	f
150	Llave CANDADO M16	\N	\N	54	25.00	4.40	f	5	1	\N	\N	\N	t	\N	f
152	Llave CANDADO M18/M3	\N	\N	54	25.00	4.40	f	8	1	\N	\N	\N	t	\N	f
149	Llave CANDADO M1D	\N	\N	54	25.00	4.40	f	4	1	\N	\N	\N	t	\N	f
113	Llave Candado MGG 3	\N	\N	54	25.00	4.40	f	5	1	\N	\N	\N	t	\N	f
114	Llave Candado MGG 3D	\N	\N	54	25.00	4.40	f	6	1	\N	\N	\N	t	\N	f
109	Llave Candado PHI4	\N	\N	54	25.00	4.40	f	2	1	\N	\N	\N	t	\N	f
110	Llave Candado PHI4D	\N	\N	54	25.00	4.40	f	3	1	\N	\N	\N	t	\N	f
106	Llave Candado R76	\N	\N	54	25.00	4.40	f	7	1	\N	\N	\N	t	\N	f
103	Llave CANDADO T6/YA11D	\N	\N	54	25.00	4.40	f	6	1	\N	\N	\N	t	\N	f
104	Llave CANDADO T6/YA11I	\N	\N	54	25.00	4.40	f	8	1	\N	\N	\N	t	\N	f
216	Llave CANDADO DX9FI	\N	\N	54	95.00	20.00	f	2	1	\N	\N	\N	t	\N	f
153	Llave CANDADO GLO 19D	\N	\N	54	25.00	4.40	f	6	1	\N	\N	\N	t	\N	f
74	Llave CANDADO LOC 2D	\N	\N	54	25.00	4.40	f	8	1	\N	\N	\N	t	\N	f
232	Llave CANDADO MGG2	\N	\N	54	25.00	4.40	f	10	1	\N	\N	\N	t	\N	f
214	Llave CANDADO MULT3P1	\N	\N	54	95.00	20.00	f	4	1	\N	\N	\N	t	\N	f
213	Llave CANDADO puntos SOP21P	\N	\N	54	95.00	20.00	f	5	1	\N	\N	\N	t	\N	f
108	Llave Candado R77C	\N	\N	54	25.00	4.40	f	5	1	\N	\N	\N	t	\N	f
215	Llave CANDADO TRU 10P	\N	\N	54	95.00	20.00	f	4	1	\N	\N	\N	t	\N	f
207	Llave CANDADO Tubular GHI-1T	\N	\N	54	80.00	11.00	f	8	1	\N	\N	\N	t	\N	f
628	Candado TX-110	\N	\N	54	259.00	0.00	f	2	1	Phillips	\N	\N	t	\N	t
635	Candado para Viaje 4 dig	\N	\N	54	219.00	0.00	f	1	1	Phillips	\N	\N	t	\N	t
629	Candado HD-730	\N	\N	54	879.00	0.00	f	1	1	Phillips	\N	\N	t	\N	t
636	Candado de Viaje 3 dig.	\N	\N	54	178.00	0.00	f	1	1	Phillips	\N	\N	t	\N	t
630	Candado Mod. 9	Resistente a exteriores	\N	54	392.00	0.00	f	2	1	Phillips	\N	\N	t	\N	t
637	Candado de combinacion 3 dig	\N	\N	54	67.00	0.00	f	1	1	Phillips	\N	\N	t	\N	t
631	Candado 103 GL	\N	\N	54	91.00	0.00	f	2	1	Phillips	\N	\N	t	\N	t
638	Candado Master Lock 7ESPD	\N	\N	54	179.00	0.00	f	1	1	Master Lock	\N	\N	t	\N	t
632	Candado 112 GL	\N	\N	54	98.00	0.00	f	1	1	Phillips	\N	\N	t	\N	t
633	Candado 112	\N	\N	54	98.00	0.00	f	0	1	Philips	\N	\N	t	\N	t
634	Candado 102 GL	\N	\N	54	38.00	0.00	f	1	1	Phillips	\N	\N	t	\N	t
611	715 IF D	Llave R52	\N	53	738.00	0.00	f	2	1	Philips	\N	\N	f	\N	f
620	AS 800 de Barra Fija Derecha. Llave de puntos.	Llave de puntos larga	\N	53	467.00	0.00	f	2	1	Phillips	\N	\N	t	\N	t
614	X720 IF Derecha	Llave tetra	\N	53	738.00	0.00	f	2	1	Philipps	\N	\N	t	\N	t
621	AS 800 de Barra Fija Izquierda. Llave de puntos.	Llave de puntos larga.	\N	53	467.00	0.00	f	1	1	Phillips	\N	\N	t	\N	t
639	715 - CL Clasica Derecha	\N	\N	53	275.00	0.00	f	3	1	Phillips	\N	\N	t	\N	t
640	715 - CL Clasica Izquierda	\N	\N	53	275.00	0.00	f	2	1	Phillips	\N	\N	t	\N	t
612	715 IF D	Llave R52	\N	53	275.00	0.00	f	2	1	Philipps	\N	\N	t	\N	t
613	715 IF I	Llave R52	\N	53	275.00	0.00	f	3	1	Philipps	\N	\N	t	\N	t
615	X720 IF Izquierda	Llave tetra	\N	53	738.00	0.00	f	2	1	Philipps	\N	\N	t	\N	t
622	Perilla Recamara Cobre	De recamara, con llave.	\N	53	221.00	0.00	f	2	1	Phillips	\N	\N	t	\N	t
641	X -1100 Embutir	\N	\N	53	599.00	0.00	f	2	1	Cerrojo auxiliar de extra seguridad	\N	\N	t	\N	t
616	X900 de Barra Derecha	De barra. Llave tetraedro.	\N	53	510.00	0.00	f	2	1	Philipps	\N	\N	t	\N	t
623	Perilla Recamara Dorada	Recamara, con llave	\N	53	221.00	0.00	f	1	1	Phillips	\N	\N	t	\N	t
642	X - 1000 Embutir	\N	\N	53	438.00	0.00	f	2	1	Phillips	\N	\N	t	\N	t
617	X900 de Barra Izquierda	De barra izquierda. Llave tetra	\N	53	510.00	0.00	f	2	1	Philipps	\N	\N	t	\N	t
624	Perilla Recamara Cromo	Recamara, con llave	\N	53	221.00	0.00	f	2	1	Phillips	\N	\N	t	\N	t
618	800 de Barra R52L Derecha	Llave R52L	\N	53	447.00	0.00	f	3	1	Philipps	\N	\N	t	\N	t
619	800 de Barra R52L Izquierda	Llave R52L.	\N	53	447.00	0.00	f	3	1	Phillips	\N	\N	t	\N	t
172	Casa puntos FNL12	\N	\N	50	120.00	16.50	f	5	1	\N	\N	\N	t	\N	f
173	CASA DX31	\N	\N	50	120.00	16.50	f	2	1	\N	\N	\N	t	\N	f
643	Cerradura Mod. 80	Para ventana o vitrina	\N	53	203.00	0.00	f	1	1	Phillips	\N	\N	t	\N	t
22	CASA S6 Larga	\N	\N	51	25.00	4.40	f	7	1	\N	\N	\N	t	\N	f
192	CASA FNL 8D	\N	\N	51	30.00	6.60	f	4	1	\N	\N	\N	t	\N	f
193	CASA R58L	\N	\N	51	30.00	6.60	f	9	1	\N	\N	\N	t	\N	f
194	CASA M17L	\N	\N	51	30.00	6.60	f	4	1	\N	\N	\N	t	\N	f
195	CASA CMX1D	\N	\N	51	30.00	6.60	f	6	1	\N	\N	\N	t	\N	f
234	CASA F49L	\N	\N	51	30.00	4.40	f	2	1	\N	\N	\N	t	\N	f
644	Cerradura para Mueble	\N	\N	53	149.00	0.00	f	3	1	Phillips	\N	\N	t	\N	t
646	Fundas Silicon Dura	\N	\N	58	150.00	0.00	f	43	15	\N	\N	\N	t	\N	t
645	Fundas Silicon Suave	Diversas marcas	\N	59	100.00	0.00	f	100	25	\N	\N	\N	t	\N	t
670	Arito de colores	\N	\N	57	5.00	0.00	f	19	2	\N	\N	\N	t	\N	t
609	Llavero Sencillo $40	\N	\N	55	40.00	20.00	f	15	2	\N	\N	\N	t	\N	f
610	Llavero Caro $100	\N	\N	55	100.00	35.00	f	3	1	\N	\N	\N	t	\N	f
648	Cinta Larga / Destapador	\N	\N	55	60.00	0.00	f	20	2	\N	\N	\N	t	\N	t
647	Cinta corta	\N	\N	55	40.00	0.00	f	41	15	\N	\N	\N	t	\N	t
649	Llavero sencillo	De pasta	\N	55	40.00	0.00	f	15	10	\N	\N	\N	t	\N	t
627	Perilla Baño Cobre	Sin llave	\N	53	220.00	0.00	f	2	1	\N	\N	\N	t	\N	t
626	Perilla Baño Dorada	Sin llave	\N	53	220.00	0.00	f	3	1	Phillips	\N	\N	t	\N	t
625	Perilla Baño Cromo	Sin llave	\N	53	220.00	0.00	f	3	1	Phillips	\N	\N	t	\N	t
56	Casa puntos BKY1 LARGA	\N	\N	50	95.00	20.00	f	3	1	\N	\N	\N	t	\N	f
121	MOTO Honda Larga PLAST	\N	\N	4	120.00	16.50	f	0	1	Honda	\N	\N	t	\N	f
137	Casa puntos Philips Xtra larga	\N	\N	50	95.00	20.00	f	4	1	\N	\N	\N	t	\N	t
179	Casa puntos DEXTER Larga	\N	\N	50	95.00	20.00	f	9	1	\N	\N	\N	t	\N	f
323	Llave Prescencia Mazda Alargada 4 BTN Orig	\N	\N	62	3000.00	0.00	f	3	1	Mazda, CX3, CX6, Mazda 3	\N	\N	t	\N	t
28	CASA R1 LARGA	\N	\N	51	25.00	4.40	f	8	1	\N	\N	\N	t	\N	t
54	Casa rectangular TR5	\N	\N	48	80.00	\N	f	4	1	\N	\N	\N	t	\N	t
142	Casa Tetra Chica Derecha	\N	\N	49	50.00	9.00	f	3	1	\N	\N	\N	t	\N	t
144	Casa Tetra Chica Chueca	\N	\N	49	50.00	9.00	f	1	1	\N	\N	\N	t	\N	t
155	CASA R52L	\N	\N	51	30.00	6.60	f	-1	1	\N	\N	\N	t	\N	t
180	Casa puntos Philips AS800	\N	\N	53	95.00	20.00	f	9	1	\N	\N	\N	t	\N	t
605	Chapa Honda CRV Cola Con Punto	Pieza de cerradura de Honda que termina con el punto	\N	65	600.00	0.00	f	5	1	Honda	\N	\N	t	\N	t
607	Chapa Honda Sensor	Chapa de honda refaccion para sensor.	\N	65	600.00	0.00	f	4	2	\N	\N	\N	t	\N	t
136	Casa puntos Philips larga	\N	\N	50	95.00	20.00	f	5	1	\N	\N	\N	t	\N	t
663	Gomitas	\N	\N	56	3.00	0.00	f	45	2	\N	\N	\N	t	\N	f
650	Llavero Cinta de cuero	\N	\N	55	80.00	0.00	f	19	2	\N	\N	\N	t	\N	t
651	Llavero Premium	Cerezas y ganchos	\N	55	70.00	0.00	f	17	2	\N	\N	\N	t	\N	t
652	Llavero carritos	Combis, carros	\N	55	100.00	0.00	f	1	1	\N	\N	\N	t	\N	t
603	Reparación de Switch Volkswagen MK6-Bora	Reparación de switch de Volkswagen	\N	66	1200.00	0.00	t	10	2	VW, Volkswagen	\N	\N	t	\N	f
604	Reparación de Switch Honda CRV-Civic	Reparación de switch de Honda con cambio de teclas.	\N	66	1200.00	0.00	t	10	2	Honda, Civic	\N	\N	t	\N	f
661	Reparación General	Reparación generica cuando aplique	\N	66	500.00	0.00	t	10	2	\N	\N	\N	t	\N	f
669	Repración de espiga de OPEL	\N	\N	66	650.00	0.00	t	10	2	\N	\N	\N	t	\N	f
673	PROGRAMACION CHIP	\N	\N	66	1000.00	0.00	t	10	2	CHEVROLET	7935	\N	t	\N	t
653	Programación Aveo	Avec, baja de calibracion de compu de agencia	\N	66	6500.00	0.00	t	10	2	Chevrolet	\N	\N	t	\N	t
671	SENSORES DE LLANTA	\N	\N	66	1000.00	0.00	t	10	2	\N	\N	\N	t	\N	t
665	Reprogramacion de Módulo	\N	\N	66	1000.00	0.00	t	10	2	Gen├®rico	\N	\N	t	\N	t
672	VENTA DE PARTE	\N	\N	66	1000.00	0.00	t	10	2	\N	\N	\N	t	\N	t
667	Programacion de Chip	\N	\N	66	900.00	0.00	t	10	2	\N	\N	\N	t	\N	t
668	Hechura Llave Automotriz	\N	\N	66	300.00	0.00	t	10	2	\N	\N	\N	t	\N	t
676	Duplicado Casa Larga	Duplicado rápido de llave residencial larga	\N	51	30.00	0.00	f	9999	0	\N	\N	\N	t	\N	f
678	Duplicado Casa Puntos	Duplicado de llave de seguridad/puntos	\N	50	95.00	0.00	f	9999	0	\N	\N	\N	t	\N	f
679	Llave Puntos Corta	\N	\N	52	80.00	0.00	f	9999	0	\N	\N	\N	t	\N	f
680	Llaves Rectangulares TR5	\N	\N	48	80.00	0.00	f	9999	0	\N	\N	\N	t	\N	f
681	Servicio General	\N	\N	66	0.00	0.00	t	9999	0	\N	\N	\N	t	\N	f
677	Duplicado Casa Tetra	Duplicado rápido de llave tetra de 4 lados	\N	49	50.00	0.00	f	9999	0	\N	\N	\N	f	\N	f
655	DIAGNÓSTICO	\N	\N	66	400.00	0.00	t	0	0	\N	\N	\N	t	\N	t
656	CHAPIS PRESTO	\N	\N	66	100.00	0.00	t	10	2	\N	\N	\N	f	\N	f
660	Reparación de Switch VW	\N	\N	66	1000.00	0.00	t	10	2	\N	\N	\N	f	\N	f
606	MANO DE OBRA	Item generico MANO DE OBRA para a├▒adir a los combos y que absorba el restante (ganancia).	\N	66	1.00	0.00	t	10	2	\N	\N	\N	f	\N	f
657	FANNY PRESTO	\N	\N	66	100.00	0.00	f	10	2	\N	\N	\N	f	\N	f
658	JUANMI PRESTO	\N	\N	66	100.00	0.00	f	9	2	\N	\N	\N	f	\N	f
659	MIKE PRESTO	\N	\N	66	100.00	0.00	f	10	2	\N	\N	\N	f	\N	f
25	LIBRE	\N	\N	10	0.10	\N	f	0	0	\N	\N	\N	f	\N	f
30	LIBRE	\N	\N	10	0.10	\N	f	0	0	\N	\N	\N	f	\N	f
31	LIBRE	\N	\N	10	0.10	\N	f	0	0	\N	\N	\N	f	\N	f
36	LIBRE	\N	\N	10	0.10	\N	f	0	0	\N	\N	\N	f	\N	f
38	LIBRE	\N	\N	10	0.10	\N	f	0	0	\N	\N	\N	f	\N	f
39	LIBRE	\N	\N	10	0.10	\N	f	0	0	\N	\N	\N	f	\N	f
86	LIBRE	\N	\N	10	0.10	\N	f	0	0	\N	\N	\N	f	\N	f
87	LIBRE	\N	\N	10	0.10	\N	f	0	0	\N	\N	\N	f	\N	f
141	LIBRE	\N	\N	10	0.10	\N	f	0	0	\N	\N	\N	f	\N	f
143	LIBRE	\N	\N	10	0.10	\N	f	0	0	\N	\N	\N	f	\N	f
145	LIBRE	\N	\N	10	0.10	\N	f	0	0	\N	\N	\N	f	\N	f
156	LIBRE	\N	\N	10	0.10	\N	f	0	0	\N	\N	\N	f	\N	f
217	LIBRE	\N	\N	10	0.10	\N	f	0	0	\N	\N	\N	f	\N	f
218	LIBRE	\N	\N	10	0.10	\N	f	0	0	\N	\N	\N	f	\N	f
219	LIBRE	\N	\N	10	0.10	\N	f	0	0	\N	\N	\N	f	\N	f
220	LIBRE	\N	\N	10	0.10	\N	f	0	0	\N	\N	\N	f	\N	f
221	LIBRE	\N	\N	10	0.10	\N	f	0	0	\N	\N	\N	f	\N	f
222	LIBRE	\N	\N	10	0.10	\N	f	0	0	\N	\N	\N	f	\N	f
223	LIBRE	\N	\N	10	0.10	\N	f	0	0	\N	\N	\N	f	\N	f
224	LIBRE	\N	\N	10	0.10	\N	f	0	0	\N	\N	\N	f	\N	f
225	LIBRE	\N	\N	10	0.10	\N	f	0	0	\N	\N	\N	f	\N	f
226	LIBRE	\N	\N	10	0.10	\N	f	0	0	\N	\N	\N	f	\N	f
227	LIBRE	\N	\N	10	0.10	\N	f	0	0	\N	\N	\N	f	\N	f
228	LIBRE	\N	\N	10	0.10	\N	f	0	0	\N	\N	\N	f	\N	f
229	LIBRE	\N	\N	10	0.10	\N	f	0	0	\N	\N	\N	f	\N	f
231	LIBRE	\N	\N	10	0.10	\N	f	0	0	\N	\N	\N	f	\N	f
262	LIBRE	\N	\N	10	0.10	\N	f	\N	\N	\N	\N	\N	f	\N	f
265	LIBRE	\N	\N	10	0.10	\N	f	\N	\N	\N	\N	\N	f	\N	f
267	LIBRE	\N	\N	10	0.10	\N	f	\N	\N	\N	\N	\N	f	\N	f
269	LIBRE	\N	\N	10	0.10	\N	f	\N	\N	\N	\N	\N	f	\N	f
277	LIBRE	\N	\N	10	0.10	\N	f	\N	\N	\N	\N	\N	f	\N	f
282	LIBRE	\N	\N	10	0.10	\N	f	\N	\N	\N	\N	\N	f	\N	f
313	LIBRE	\N	\N	10	0.10	\N	f	\N	\N	\N	\N	\N	f	\N	f
319	LIBRE	\N	\N	10	0.10	\N	f	\N	\N	\N	\N	\N	f	\N	f
322	LIBRE	\N	\N	10	0.10	\N	f	\N	\N	\N	\N	\N	f	\N	f
343	LIBRE	\N	\N	10	0.10	\N	f	\N	\N	\N	\N	\N	f	\N	f
348	LIBRE	\N	\N	10	0.10	\N	f	\N	\N	\N	\N	\N	f	\N	f
380	LIBRE	\N	\N	10	0.10	\N	f	\N	\N	\N	\N	\N	f	\N	f
390	LIBRE	\N	\N	10	0.10	\N	f	\N	\N	\N	\N	\N	f	\N	f
398	LIBRE	\N	\N	10	0.10	\N	f	\N	\N	\N	\N	\N	f	\N	f
408	LIBRE	\N	\N	10	0.10	\N	f	\N	\N	\N	\N	\N	f	\N	f
410	LIBRE	\N	\N	10	0.10	\N	f	\N	\N	\N	\N	\N	f	\N	f
416	LIBRE	\N	\N	10	0.10	\N	f	\N	\N	\N	\N	\N	f	\N	f
421	LIBRE	\N	\N	10	0.10	\N	f	\N	\N	\N	\N	\N	f	\N	f
422	LIBRE	\N	\N	10	0.10	\N	f	\N	\N	\N	\N	\N	f	\N	f
423	LIBRE	\N	\N	10	0.10	\N	f	\N	\N	\N	\N	\N	f	\N	f
427	LIBRE	\N	\N	10	0.10	\N	f	\N	\N	\N	\N	\N	f	\N	f
452	LIBRE	\N	\N	10	0.10	\N	f	\N	\N	\N	\N	\N	f	\N	f
460	LIBRE	\N	\N	10	0.10	\N	f	\N	\N	\N	\N	\N	f	\N	f
464	LIBRE	\N	\N	10	0.10	\N	f	\N	\N	\N	\N	\N	f	\N	f
504	LIBRE	\N	\N	10	0.10	\N	f	\N	\N	\N	\N	\N	f	\N	f
505	LIBRE	\N	\N	10	0.10	\N	f	\N	\N	\N	\N	\N	f	\N	f
506	LIBRE	\N	\N	10	0.10	\N	f	\N	\N	\N	\N	\N	f	\N	f
507	LIBRE	\N	\N	10	0.10	\N	f	\N	\N	\N	\N	\N	f	\N	f
508	LIBRE	\N	\N	10	0.10	\N	f	\N	\N	\N	\N	\N	f	\N	f
517	LIBRE	\N	\N	10	0.10	\N	f	\N	\N	\N	\N	\N	f	\N	f
521	LIBRE	\N	\N	10	0.10	\N	f	\N	\N	\N	\N	\N	f	\N	f
526	LIBRE	\N	\N	10	0.10	\N	f	\N	\N	\N	\N	\N	f	\N	f
532	LIBRE	\N	\N	10	0.10	\N	f	\N	\N	\N	\N	\N	f	\N	f
533	LIBRE	\N	\N	10	0.10	\N	f	\N	\N	\N	\N	\N	f	\N	f
535	LIBRE	\N	\N	10	0.10	\N	f	\N	\N	\N	\N	\N	f	\N	f
536	LIBRE	\N	\N	10	0.10	\N	f	\N	\N	\N	\N	\N	f	\N	f
537	LIBRE	\N	\N	10	0.10	\N	f	\N	\N	\N	\N	\N	f	\N	f
539	LIBRE	\N	\N	10	0.10	\N	f	\N	\N	\N	\N	\N	f	\N	f
540	LIBRE	\N	\N	10	0.10	\N	f	\N	\N	\N	\N	\N	f	\N	f
541	LIBRE	\N	\N	10	0.10	\N	f	\N	\N	\N	\N	\N	f	\N	f
542	LIBRE	\N	\N	10	0.10	\N	f	\N	\N	\N	\N	\N	f	\N	f
543	LIBRE	\N	\N	10	0.10	\N	f	\N	\N	\N	\N	\N	f	\N	f
544	LIBRE	\N	\N	10	0.10	\N	f	\N	\N	\N	\N	\N	f	\N	f
545	LIBRE	\N	\N	10	0.10	\N	f	\N	\N	\N	\N	\N	f	\N	f
546	LIBRE	\N	\N	10	0.10	\N	f	\N	\N	\N	\N	\N	f	\N	f
547	LIBRE	\N	\N	10	0.10	\N	f	\N	\N	\N	\N	\N	f	\N	f
550	LIBRE	\N	\N	10	0.10	\N	f	\N	\N	\N	\N	\N	f	\N	f
551	LIBRE	\N	\N	10	0.10	\N	f	\N	\N	\N	\N	\N	f	\N	f
560	LIBRE	\N	\N	10	0.10	\N	f	\N	\N	\N	\N	\N	f	\N	f
562	LIBRE	\N	\N	10	0.10	\N	f	\N	\N	\N	\N	\N	f	\N	f
566	LIBRE	\N	\N	10	0.10	\N	f	\N	\N	\N	\N	\N	f	\N	f
568	LIBRE	\N	\N	10	0.10	\N	f	\N	\N	\N	\N	\N	f	\N	f
569	LIBRE	\N	\N	10	0.10	\N	f	\N	\N	\N	\N	\N	f	\N	f
570	LIBRE	\N	\N	10	0.10	\N	f	\N	\N	\N	\N	\N	f	\N	f
571	LIBRE	\N	\N	10	0.10	\N	f	\N	\N	\N	\N	\N	f	\N	f
572	LIBRE	\N	\N	10	0.10	\N	f	\N	\N	\N	\N	\N	f	\N	f
573	LIBRE	\N	\N	10	0.10	\N	f	\N	\N	\N	\N	\N	f	\N	f
574	LIBRE	\N	\N	10	0.10	\N	f	\N	\N	\N	\N	\N	f	\N	f
575	LIBRE	\N	\N	10	0.10	\N	f	\N	\N	\N	\N	\N	f	\N	f
576	LIBRE	\N	\N	10	0.10	\N	f	\N	\N	\N	\N	\N	f	\N	f
577	LIBRE	\N	\N	10	0.10	\N	f	\N	\N	\N	\N	\N	f	\N	f
578	LIBRE	\N	\N	10	0.10	\N	f	\N	\N	\N	\N	\N	f	\N	f
579	LIBRE	\N	\N	10	0.10	\N	f	\N	\N	\N	\N	\N	f	\N	f
580	LIBRE	\N	\N	10	0.10	\N	f	\N	\N	\N	\N	\N	f	\N	f
581	LIBRE	\N	\N	10	0.10	\N	f	\N	\N	\N	\N	\N	f	\N	f
582	LIBRE	\N	\N	10	0.10	\N	f	\N	\N	\N	\N	\N	f	\N	f
583	LIBRE	\N	\N	10	0.10	\N	f	\N	\N	\N	\N	\N	f	\N	f
584	LIBRE	\N	\N	10	0.10	\N	f	\N	\N	\N	\N	\N	f	\N	f
585	LIBRE	\N	\N	10	0.10	\N	f	\N	\N	\N	\N	\N	f	\N	f
586	LIBRE	\N	\N	10	0.10	\N	f	\N	\N	\N	\N	\N	f	\N	f
587	LIBRE	\N	\N	10	0.10	\N	f	\N	\N	\N	\N	\N	f	\N	f
588	LIBRE	\N	\N	10	0.10	\N	f	\N	\N	\N	\N	\N	f	\N	f
589	LIBRE	\N	\N	10	0.10	\N	f	\N	\N	\N	\N	\N	f	\N	f
590	LIBRE	\N	\N	10	0.10	\N	f	\N	\N	\N	\N	\N	f	\N	f
591	LIBRE	\N	\N	10	0.10	\N	f	\N	\N	\N	\N	\N	f	\N	f
592	LIBRE	\N	\N	10	0.10	\N	f	\N	\N	\N	\N	\N	f	\N	f
593	LIBRE	\N	\N	10	0.10	\N	f	\N	\N	\N	\N	\N	f	\N	f
594	LIBRE	\N	\N	10	0.10	\N	f	\N	\N	\N	\N	\N	f	\N	f
595	LIBRE	\N	\N	10	0.10	\N	f	\N	\N	\N	\N	\N	f	\N	f
596	LIBRE	\N	\N	10	0.10	\N	f	\N	\N	\N	\N	\N	f	\N	f
597	LIBRE	\N	\N	10	0.10	\N	f	\N	\N	\N	\N	\N	f	\N	f
598	LIBRE	\N	\N	10	0.10	\N	f	\N	\N	\N	\N	\N	f	\N	f
599	LIBRE	\N	\N	10	0.10	\N	f	\N	\N	\N	\N	\N	f	\N	f
487	Carcasa GM Control IND 4 BTN 2.0	\N	\N	10	350.00	\N	f	2	1	GM, General Motors	\N	\N	f	\N	f
384	Llave Hueca KIA Regata	\N	\N	60	350.00	\N	f	1	1	KIA	\N	\N	t	\N	t
57	Casa puntos TOV 5	\N	\N	50	95.00	20.00	f	2	1	\N	\N	\N	t	\N	t
58	Casa puntos TOV 9D	\N	\N	50	95.00	20.00	f	8	1	\N	\N	\N	t	\N	t
60	Casa puntos TOV 7	\N	\N	50	95.00	20.00	f	5	1	\N	\N	\N	t	\N	t
96	Casa puntos TOV6	\N	\N	50	95.00	20.00	f	3	1	\N	\N	\N	t	\N	t
523	Carcasa Toyota Llave Control 4 BTN Corazon	\N	\N	64	500.00	\N	f	2	1	\N	\N	\N	t	\N	t
524	Carcasa Toyota Llave Control Una Guia 3 BTN Corazon	\N	\N	64	500.00	\N	f	2	1	\N	\N	\N	t	\N	t
525	Carcasa Toyota Llave Control 3 BTN Corazon	\N	\N	64	500.00	\N	f	14	1	\N	\N	\N	t	\N	t
527	Carcasa Ford Llave Control DobleCorte Explorer 3 BTN Orig	\N	\N	64	500.00	\N	f	2	1	Ford, Escape	\N	\N	t	\N	t
528	Carcasa Ford Llave Control DobleCorte Explorer 4 BTN Orig	\N	\N	64	500.00	\N	f	3	1	Ford, Escape	\N	\N	t	\N	t
529	Carcasa Ford Llave Control Regata 3 BTN	\N	\N	64	500.00	\N	f	3	1	Ford, Escape	\N	\N	t	\N	t
530	Carcasa Ford Llave Control Regata 4 BTN	\N	\N	64	500.00	\N	f	5	1	Ford, Escape	\N	\N	t	\N	t
531	Carcasa Llave Control Ford DobleCorte Explorer 5 BTN 	\N	\N	64	500.00	\N	f	1	1	Ford, Explorer	\N	\N	t	\N	t
500	Llave Hueca FIAT 500 FI-16P Regata	\N	\N	60	350.00	0.00	f	6	1	Fiat, 500	\N	\N	t	\N	t
538	Llave Hueca Mercedes MEHMP1 DobleCorte	\N	\N	60	350.00	\N	f	1	1	Mercedes Benz, Sprinter	\N	\N	t	\N	t
561	Espadín Mazda Presencia 1 Guia	\N	\N	60	350.00	\N	f	6	2	Mazda	\N	\N	t	\N	t
563	Espadin Mazda Presencia 2 Guias	\N	\N	60	350.00	\N	f	3	2	Mazda	\N	\N	t	\N	t
564	Espadin Nissan Presencia 2 Guias	\N	\N	60	350.00	\N	f	2	2	Nissan	\N	\N	t	\N	t
565	Espadin Honda Presencia Regatta	\N	\N	60	350.00	\N	f	4	2	Honda	\N	\N	t	\N	t
567	Espadin Chrysler/Dodge/Jeep Fobik 2 Guias	\N	\N	60	350.00	\N	f	2	2	Chrysler, Dodge, Jeep	\N	\N	t	\N	t
476	Llave FOBIK Original Chrysler 2/3 BTN	\N	\N	18	2500.00	0.00	f	3	1	\N	\N	\N	t	\N	t
477	Llave Control Chrysler Encendido Remoto 4 BTN	\N	\N	18	1800.00	0.00	f	7	1	Chrysler, Dodge, Jeep, RAM	\N	\N	t	\N	t
553	Llave Control Suzuki Original 	\N	\N	18	2300.00	\N	f	2	1	Suzuki	\N	\N	t	\N	t
557	Llave Control Mini Cooper 3 BTN Orig	\N	\N	18	3200.00	\N	f	1	1	Mini Cooper	\N	\N	t	\N	t
558	Llave Control Mitsubishi 3 BTN Rectangular	\N	\N	18	2800.00	\N	f	1	1	Mitsubishi, Lancer, Outlander	\N	\N	t	\N	t
601	Llave Valet Chevrolet Spark 8E	\N	\N	18	1200.00	\N	f	5	2	\N	\N	\N	t	\N	t
520	Llave Prescencia Kia Rio 4 BTN Orig	\N	\N	62	4000.00	\N	f	1	1	KIA, Rio	\N	\N	t	\N	t
518	Llave Prescencia Ford Lengua Focus 5 BTN	\N	\N	62	3500.00	0.00	f	4	1	Ford, Focus, Escape	\N	315MHz	t	\N	t
552	Llave Prescencia BMW XHORSE	\N	\N	62	3500.00	\N	f	1	1	BMW, XHORSE	\N	\N	t	\N	t
554	Llave Prescencia Generica XHORSE 4 BTN 	\N	\N	62	3000.00	\N	f	1	2	XHORSE	\N	\N	t	\N	t
11	Chevy OPEL OP 8 Contraria	\N	\N	61	80.00	11.00	f	0	1	Chevrolet	\N	\N	t	\N	f
13	Chevrolet signo + B106	\N	\N	61	80.00	11.00	f	7	1	Chevrolet	\N	\N	t	\N	f
14	Chevrolet A89	\N	\N	61	80.00	11.00	f	3	1	Chevrolet	\N	\N	t	\N	f
15	Chevrolet Corsa	\N	\N	61	80.00	11.00	f	5	1	Chevrolet	\N	\N	t	\N	f
16	Chevrolet vieja D	\N	\N	61	80.00	11.00	f	5	1	Chevrolet	\N	\N	t	\N	f
17	Chevrolet vieja K	\N	\N	61	80.00	11.00	f	4	1	Chevrolet	\N	\N	t	\N	f
18	Chevrolet vieja B	\N	\N	61	80.00	11.00	f	3	1	Chevrolet	\N	\N	t	\N	f
19	Chevrolet vieja H	\N	\N	61	80.00	11.00	f	4	1	Chevrolet	\N	\N	t	\N	f
40	Nissan DAT 17D	\N	\N	61	80.00	11.00	f	8	1	Nissan	\N	\N	t	\N	f
41	Nissan camioneta vieja	\N	\N	61	80.00	11.00	f	1	1	Nissan	\N	\N	t	\N	f
42	HY5	\N	\N	61	80.00	11.00	f	3	1	Hyundai	\N	\N	t	\N	f
43	Mitsubishi EX22C	\N	\N	61	80.00	11.00	f	6	1	Mitsubishi	\N	\N	t	\N	f
44	Toyota TOYO15 TR47	\N	\N	61	80.00	11.00	f	5	1	Toyota	\N	\N	t	\N	f
45	GM 38	\N	\N	61	80.00	11.00	f	11	1	Chevrolet	\N	\N	t	\N	f
46	Honda HOND31	\N	\N	61	80.00	11.00	f	4	1	Honda	\N	\N	t	\N	f
47	GM34	\N	\N	61	80.00	11.00	f	10	1	Chevrolet	\N	\N	t	\N	f
48	Toyota TOYO 12	\N	\N	61	80.00	11.00	f	6	1	Toyota	\N	\N	t	\N	f
49	Toyota A74LC	\N	\N	61	80.00	11.00	f	8	1	Toyota	\N	\N	t	\N	f
50	Volkswagen Vocho	\N	\N	61	80.00	11.00	f	4	1	Volkswagen	\N	\N	t	\N	f
51	Chevrolet vieja C	\N	\N	61	80.00	11.00	f	5	1	Chevrolet	\N	\N	t	\N	f
52	Chevrolet vieja I	\N	\N	61	80.00	11.00	f	9	1	Chevrolet	\N	\N	t	\N	f
53	Chevrolet vieja B	\N	\N	61	80.00	11.00	f	6	1	Chevrolet	\N	\N	t	\N	f
79	Nissan DAT 17D	\N	\N	61	80.00	11.00	f	6	1	Nissan	\N	\N	t	\N	f
80	Chrysler CHR 14	\N	\N	61	80.00	11.00	f	6	1	Chrysler	\N	\N	t	\N	f
81	Kenworth KEN2D PLAST	\N	\N	61	120.00	16.50	f	3	1	Kenworth	\N	\N	t	\N	f
82	Chrysler CHR 10	\N	\N	61	80.00	11.00	f	4	1	Chrysler	\N	\N	t	\N	f
83	Ford FO25P PLAST	\N	\N	61	120.00	16.50	f	6	1	Ford	\N	\N	t	\N	f
84	NE36	\N	\N	61	80.00	11.00	f	7	1	\N	\N	\N	t	\N	f
85	VA34	\N	\N	61	80.00	11.00	f	6	1	\N	\N	\N	t	\N	f
88	Nissan DN 9P PLAST	\N	\N	61	120.00	16.50	f	2	1	Nissan	\N	\N	t	\N	f
89	Chevrolet  PLAST	\N	\N	61	120.00	16.50	f	5	1	Chevrolet	\N	\N	t	\N	f
90	Chevy PLAST	\N	\N	61	120.00	16.50	f	2	1	Chevrolet	\N	\N	t	\N	f
91	Chevy OP7P PLAST	\N	\N	61	120.00	16.50	f	3	1	Chevrolet	\N	\N	t	\N	f
55	Casa puntos BKY1	\N	\N	50	95.00	20.00	f	6	1	\N	\N	\N	t	\N	f
61	Casa puntos AMG 8D	\N	\N	50	95.00	20.00	f	4	1	\N	\N	\N	t	\N	f
59	Casa puntos TOV 8D	\N	\N	50	95.00	20.00	f	4	1	\N	\N	\N	t	\N	f
92	Casa puntos TRU13D	\N	\N	50	95.00	20.00	f	5	1	\N	\N	\N	t	\N	f
93	Casa puntos EUL1D	\N	\N	50	95.00	20.00	f	3	1	\N	\N	\N	t	\N	f
171	Casa puntos ASH 3D	\N	\N	50	95.00	20.00	f	3	1	\N	\N	\N	t	\N	f
174	Casa puntos LIN 19D	\N	\N	50	95.00	20.00	f	5	1	\N	\N	\N	t	\N	f
175	Casa puntos LIN 19D	\N	\N	50	95.00	20.00	f	8	1	\N	\N	\N	t	\N	f
177	Casa puntos AMG 10D	\N	\N	50	95.00	20.00	f	7	1	\N	\N	\N	t	\N	f
178	Casa puntos TE5	\N	\N	50	95.00	20.00	f	6	1	\N	\N	\N	t	\N	f
176	Casa puntos AMG 10	\N	\N	50	95.00	20.00	f	2	1	\N	\N	\N	t	\N	f
101	Casa puntos TRU 12	\N	\N	50	95.00	20.00	f	1	1	\N	\N	\N	t	\N	f
675	Duplicado Casa Estándar	Duplicado rápido de llave residencial estándar	\N	2	25.00	0.00	f	9996	0	\N	\N	\N	t	\N	f
\.


--
-- Data for Name: movimientos_caja; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.movimientos_caja (id_movimiento, id_caja, monto, metodo_pago, tipo_movimiento, concepto, fecha_hora, id_usuario) FROM stdin;
2	2	49.00	Efectivo	SALIDA	Desayuno	2026-02-09 17:41:51.324632	7
3	2	350.00	Efectivo	SALIDA	Comida	2026-02-09 21:30:21.851799	7
4	2	17.00	Efectivo	SALIDA	Comida	2026-02-09 21:31:28.469461	7
5	4	500.00	Efectivo	SALIDA	Comida	2026-02-10 19:45:41.891537	7
6	4	744.00	Efectivo	SALIDA	PROFE	2026-02-10 22:28:57.129262	7
7	5	50.00	Efectivo	SALIDA	DESAYUNO	2026-02-11 17:03:41.434009	7
8	5	30.00	Efectivo	SALIDA	Gasto para cambio	2026-02-11 19:06:59.97743	7
9	5	100.00	Efectivo	SALIDA	Mike había prestado	2026-02-11 21:28:46.68911	7
10	6	60.00	Efectivo	SALIDA	Garrafon	2026-02-13 00:01:11.647854	7
11	7	50.00	Efectivo	SALIDA	Todo bien	2026-02-16 20:28:08.885979	7
12	7	50.00	Efectivo	SALIDA	Comida	2026-02-16 20:53:09.854374	7
13	8	10.00	Efectivo	SALIDA	Basura	2026-02-17 17:21:49.027334	7
14	8	142.00	Efectivo	SALIDA	comida	2026-02-17 20:02:44.816927	7
15	8	80.00	Efectivo	SALIDA	comida	2026-02-17 21:48:11.652179	7
16	8	858.00	Efectivo	SALIDA	PROFE LLAVES	2026-02-17 22:39:42.382173	7
17	8	200.00	Efectivo	SALIDA	Robo a mano armada por la chapis	2026-02-17 23:37:11.847146	7
18	8	52.00	Efectivo	SALIDA	chapis	2026-02-17 23:48:45.170411	7
19	9	300.00	Efectivo	SALIDA	Descuentenle 300 al cuate x su vidrio del carro	2026-02-19 00:12:48.582217	7
20	16	44.00	Efectivo	SALIDA	Baterias para frecuenciometro	2026-02-19 21:16:23.147135	7
21	17	53.00	Efectivo	SALIDA	comida	2026-02-20 18:10:54.763123	7
22	17	34.00	Efectivo	SALIDA	insumos	2026-02-20 19:57:02.981373	7
23	18	53.00	Efectivo	SALIDA	Desayuno	2026-02-21 16:32:52.039539	7
24	18	50.00	Efectivo	SALIDA	FABULOSO FABULOSO	2026-02-21 16:50:28.009888	7
25	21	150.00	Efectivo	SALIDA	Caguama y 100 de cuate	2026-02-26 00:23:08.764316	7
26	23	467.00	Efectivo	SALIDA	Camiseta de hierro para candado	2026-02-27 19:28:38.041828	7
27	23	60.00	Efectivo	SALIDA	Todo bien	2026-02-27 19:28:51.639966	7
28	23	33.00	Efectivo	SALIDA	Insumos	2026-02-27 19:29:08.383347	7
29	25	15.00	Efectivo	SALIDA	BASURA	2026-03-02 18:59:00.209733	7
30	26	500.00	Efectivo	SALIDA	comida amigos	2026-03-03 19:54:40.896452	7
31	26	40.00	Efectivo	SALIDA	silicon	2026-03-03 20:55:39.929353	7
32	28	200.00	Efectivo	SALIDA	COMIDA	2026-03-05 21:06:59.08228	7
33	28	250.00	Efectivo	SALIDA	BATERIAS	2026-03-05 21:07:07.469449	7
34	30	150.00	Efectivo	SALIDA	Garrafon y mas	2026-03-07 17:50:58.90006	7
35	32	863.00	Efectivo	SALIDA	Profe	2026-03-10 22:43:41.398365	7
36	35	500.00	Efectivo	SALIDA	ROCIO	2026-03-17 18:51:08.999672	7
37	38	35.00	Efectivo	SALIDA	Garrafón de agua	2026-09-22 19:38:30.731796	2
38	39	50.00	Efectivo	ENTRADA	Préstamo cambio - Miguel Andreu García	2026-09-23 01:00:21.359741	2
39	39	50.00	Efectivo	SALIDA	Devolución préstamo cambio - Miguel Andreu García	2026-09-23 01:02:07.557734	2
40	39	0.00	Efectivo	SALIDA	Devolución préstamo cambio - Miguel Andreu García\n[ANULADO] 2026-09-23T01:03:33.169Z por usuario 2 · Motivo: Mal hecho	2026-09-23 01:02:19.076146	2
\.


--
-- Data for Name: movimientos_inventario; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.movimientos_inventario (id_movimiento, id_item, tipo_movimiento, cantidad, fecha, id_usuario, comentario) FROM stdin;
3	140	VENTA	2	2026-02-09 18:20:23.432334	7	Venta #3
4	59	VENTA	1	2026-02-09 19:12:55.453273	7	Venta #4
5	246	VENTA	1	2026-02-09 21:57:41.27605	7	Venta #6
6	238	VENTA	1	2026-02-09 22:35:46.338105	7	Venta #7
7	357	VENTA_COMBO	1	2026-02-09 22:40:19.371955	7	Venta Combo #8
8	357	ANULACION_VENTA	1	2026-02-09 22:41:04.175691	7	Anulación venta #8
9	357	VENTA_COMBO	1	2026-02-09 22:42:16.785207	7	Venta Combo #9
10	29	VENTA	1	2026-02-09 22:56:24.090747	7	Venta #10
11	246	VENTA	1	2026-02-09 23:17:51.089443	7	Venta #11
12	29	VENTA	17	2026-02-09 23:29:08.975721	7	Venta #12
13	37	VENTA	3	2026-02-09 23:29:08.975721	7	Venta #12
14	407	VENTA	1	2026-02-09 23:38:44.060436	7	Venta #13
15	407	ANULACION_VENTA	1	2026-02-09 23:39:00.697547	7	Anulación venta #13
16	407	VENTA	1	2026-02-09 23:39:30.16986	7	Venta #14
17	649	VENTA	2	2026-02-10 00:30:51.930046	7	Venta #15
18	652	VENTA	1	2026-02-10 15:47:00.15622	7	Venta #16
19	230	VENTA	2	2026-02-10 16:08:30.085806	7	Venta #17
20	246	VENTA	1	2026-02-10 16:14:42.597618	7	Venta #18
21	654	VENTA	1	2026-02-10 17:33:06.549923	7	Venta #19
22	238	VENTA	1	2026-02-10 18:46:23.568213	7	Venta #20
23	658	VENTA	1	2026-02-10 19:45:21.160687	7	Venta #22
24	239	VENTA	1	2026-02-10 22:15:12.103799	7	Venta #23
25	640	VENTA	1	2026-02-10 23:21:44.754409	7	Venta #25
26	37	VENTA	6	2026-02-10 23:41:50.882222	7	Venta #26
27	29	VENTA	1	2026-02-11 00:14:45.496283	7	Venta #27
28	246	VENTA	1	2026-02-11 00:16:23.259234	7	Venta #29
29	37	VENTA	3	2026-02-11 16:37:06.303019	7	Venta #30
30	407	VENTA	1	2026-02-11 18:04:37.109503	7	Venta #31
31	245	VENTA	1	2026-02-11 18:54:51.903059	7	Venta #32
32	373	VENTA	1	2026-02-11 19:06:27.406184	7	Venta #33
33	645	VENTA	1	2026-02-11 19:06:27.406184	7	Venta #33
34	58	VENTA	1	2026-02-11 19:25:54.017371	7	Venta #34
35	245	VENTA	1	2026-02-11 20:53:57.580708	7	Venta #35
36	333	VENTA	1	2026-02-12 00:15:36.179946	7	Venta #36
37	392	VENTA	1	2026-02-12 00:41:12.384888	7	Venta #37
38	246	VENTA	1	2026-02-12 17:56:55.867682	7	Venta #38
39	236	VENTA	1	2026-02-12 20:41:25.714686	7	Venta #40
40	37	VENTA	2	2026-02-12 21:39:31.045521	7	Venta #41
41	29	VENTA	2	2026-02-12 21:39:31.045521	7	Venta #41
42	338	AJUSTE	1	2026-02-16 16:41:10.157166	7	Ajuste stock: 0 -> 1
43	338	AJUSTE	1	2026-02-16 16:41:12.790192	7	Ajuste stock: 1 -> 2
44	338	AJUSTE	0	2026-02-16 16:41:51.042638	7	Ajuste stock: 2 -> 2
45	375	AJUSTE	1	2026-02-16 16:57:00.712128	7	Ajuste stock: 1 -> 2
46	375	AJUSTE	1	2026-02-16 16:57:04.183417	7	Ajuste stock: 2 -> 3
47	375	AJUSTE	1	2026-02-16 16:57:05.998411	7	Ajuste stock: 3 -> 4
48	333	AJUSTE	3	2026-02-16 17:03:21.261127	7	Ajuste stock: 0 -> 3
49	333	AJUSTE	-1	2026-02-16 17:03:39.828173	7	Ajuste stock: 3 -> 2
50	334	AJUSTE	1	2026-02-16 17:08:54.613986	7	Ajuste stock: 2 -> 3
51	333	AJUSTE	1	2026-02-16 17:11:30.752587	7	Ajuste stock: 2 -> 3
52	376	AJUSTE	1	2026-02-16 17:13:35.763023	7	Ajuste stock: 1 -> 2
53	376	AJUSTE	1	2026-02-16 17:14:15.414381	7	Ajuste stock: 2 -> 3
54	447	AJUSTE	6	2026-02-16 17:16:37.793409	7	Ajuste stock: 1 -> 7
55	662	AJUSTE	2	2026-02-16 17:18:55.770502	7	Ajuste stock: 3 -> 5
56	24	VENTA	1	2026-02-16 17:40:18.303081	7	Venta #43
57	140	VENTA	1	2026-02-16 17:40:18.303081	7	Venta #43
58	29	VENTA	3	2026-02-16 18:00:33.458992	7	Venta #46
59	663	VENTA	2	2026-02-16 18:00:33.458992	7	Venta #46
60	317	VENTA	1	2026-02-16 18:04:01.774687	7	Venta #47
61	246	VENTA	1	2026-02-16 18:51:45.778665	7	Venta #48
62	664	VENTA_COMBO	1	2026-02-16 19:07:55.374007	7	Venta Combo #49
63	381	VENTA_COMBO	1	2026-02-16 19:07:55.374007	7	Venta Combo #49
64	433	VENTA_COMBO	1	2026-02-16 19:07:55.374007	7	Venta Combo #49
65	300	VENTA_COMBO	1	2026-02-16 19:09:53.02491	7	Venta Combo #50
66	381	ANULACION_VENTA	1	2026-02-16 19:10:13.495416	7	Anulación venta #49
67	433	ANULACION_VENTA	1	2026-02-16 19:10:13.495416	7	Anulación venta #49
68	664	ANULACION_VENTA	1	2026-02-16 19:10:13.495416	7	Anulación venta #49
69	664	VENTA_COMBO	1	2026-02-16 19:10:26.624759	7	Venta Combo #51
70	381	VENTA_COMBO	1	2026-02-16 19:10:26.624759	7	Venta Combo #51
71	433	VENTA_COMBO	1	2026-02-16 19:10:26.624759	7	Venta Combo #51
72	155	VENTA	1	2026-02-16 22:36:28.498815	7	Venta #54
73	230	VENTA	4	2026-02-16 22:36:28.498815	7	Venta #54
74	37	VENTA	2	2026-02-17 20:39:11.886918	7	Venta #55
75	142	VENTA	1	2026-02-17 20:39:11.886918	7	Venta #55
76	140	VENTA	1	2026-02-17 20:39:11.886918	7	Venta #55
77	29	VENTA	5	2026-02-17 20:39:11.886918	7	Venta #55
78	240	VENTA	1	2026-02-17 23:19:21.749561	7	Venta #58
79	478	VENTA	1	2026-02-17 23:35:08.493561	7	Venta #59
80	645	VENTA	1	2026-02-18 18:43:54.683743	7	Venta #60
81	374	VENTA	1	2026-02-18 18:43:54.683743	7	Venta #60
82	235	VENTA	1	2026-02-18 18:43:54.683743	7	Venta #60
83	57	VENTA	1	2026-02-18 18:44:58.355297	7	Venta #61
84	54	VENTA	1	2026-02-18 18:44:58.355297	7	Venta #61
85	111	VENTA	1	2026-02-18 18:44:58.355297	7	Venta #61
86	246	VENTA	1	2026-02-18 19:33:51.957932	7	Venta #62
87	246	VENTA	1	2026-02-18 21:45:10.296423	2	Venta #63
88	137	VENTA	1	2026-02-18 21:55:18.025352	7	Venta #64
89	246	VENTA	1	2026-02-18 23:07:00.745477	7	Venta #66
90	37	VENTA	1	2026-02-18 23:17:25.291002	7	Venta #67
91	663	VENTA	1	2026-02-18 23:17:25.291002	7	Venta #67
92	434	VENTA	1	2026-02-19 17:14:06.13002	7	Venta #68
93	331	VENTA	1	2026-02-19 18:17:54.1361	7	Venta #69
94	290	VENTA	1	2026-02-19 18:31:45.179255	7	Venta #70
95	290	ANULACION_VENTA	1	2026-02-19 18:32:55.821642	7	Anulación venta #70
96	318	VENTA	1	2026-02-19 18:33:26.994079	7	Venta #71
97	155	VENTA	2	2026-02-19 20:16:50.062498	7	Venta #72
98	649	VENTA	1	2026-02-19 20:17:00.585968	7	Venta #73
99	165	VENTA	1	2026-02-20 17:45:00.130536	7	Venta #76
100	633	VENTA	1	2026-02-20 17:45:00.130536	7	Venta #76
101	37	VENTA	2	2026-02-20 18:04:20.011188	7	Venta #77
102	663	VENTA	2	2026-02-20 18:04:20.011188	7	Venta #77
103	670	VENTA	1	2026-02-20 18:04:20.011188	7	Venta #77
104	245	VENTA	1	2026-02-20 21:34:29.357365	7	Venta #78
105	439	VENTA	1	2026-02-20 22:18:13.72237	7	Venta #79
106	435	VENTA	1	2026-02-20 23:14:35.031729	7	Venta #80
107	406	VENTA	1	2026-02-21 00:47:01.47824	7	Venta #81
108	155	VENTA	1	2026-02-23 17:36:25.483579	7	Venta #82
109	246	VENTA	1	2026-02-24 19:20:52.203296	7	Venta #83
110	140	VENTA	1	2026-02-24 19:21:44.271053	7	Venta #84
111	37	VENTA	1	2026-02-24 19:21:44.271053	7	Venta #84
112	23	VENTA	1	2026-02-24 19:21:44.271053	7	Venta #84
113	29	VENTA	1	2026-02-24 19:21:44.271053	7	Venta #84
114	649	VENTA	1	2026-02-24 19:21:44.271053	7	Venta #84
115	29	VENTA	3	2026-02-24 22:21:27.808401	7	Venta #86
116	60	VENTA	1	2026-02-24 23:27:55.867338	7	Venta #87
117	24	VENTA	1	2026-02-24 23:27:55.867338	7	Venta #87
118	142	VENTA	1	2026-02-24 23:27:55.867338	7	Venta #87
119	281	VENTA	1	2026-02-24 23:28:49.277063	7	Venta #88
120	246	VENTA	1	2026-02-25 00:14:09.948306	7	Venta #89
121	246	VENTA	1	2026-02-25 01:19:24.578684	7	Venta #90
122	646	VENTA	1	2026-02-25 01:19:24.578684	7	Venta #90
123	24	VENTA	1	2026-02-25 18:01:06.123196	7	Venta #91
124	155	VENTA	1	2026-02-25 18:01:06.123196	7	Venta #91
125	29	VENTA	4	2026-02-25 18:28:04.909179	7	Venta #92
126	57	VENTA	1	2026-02-25 18:28:16.633261	7	Venta #93
127	37	VENTA	3	2026-02-25 20:51:29.727023	7	Venta #94
128	246	VENTA	1	2026-02-25 21:32:00.919706	7	Venta #95
129	140	VENTA	2	2026-02-25 21:48:35.049386	7	Venta #96
130	24	VENTA	1	2026-02-25 21:48:35.049386	7	Venta #96
131	155	VENTA	1	2026-02-25 21:48:49.008819	7	Venta #97
132	37	VENTA	1	2026-02-25 23:38:46.970171	7	Venta #98
133	155	VENTA	10	2026-02-26 18:24:27.599502	7	Venta #100
134	246	VENTA	1	2026-02-26 19:48:47.599943	7	Venta #101
135	238	VENTA	1	2026-02-26 19:55:35.235483	7	Venta #102
136	243	VENTA	1	2026-02-27 21:32:23.706321	7	Venta #104
137	434	VENTA	1	2026-02-28 17:15:33.840957	7	Venta #105
138	437	VENTA	1	2026-02-28 17:17:33.890501	7	Venta #106
139	645	VENTA	1	2026-02-28 18:43:29.68942	7	Venta #107
140	176	VENTA	2	2026-02-28 19:04:36.981088	7	Venta #108
141	29	VENTA	5	2026-02-28 19:04:36.981088	7	Venta #108
142	24	VENTA	2	2026-03-02 17:02:50.564181	7	Venta #109
143	373	VENTA	1	2026-03-02 17:31:39.805606	7	Venta #110
144	435	VENTA	1	2026-03-02 17:33:25.963106	7	Venta #111
145	373	ANULACION_VENTA	1	2026-03-02 17:33:38.966481	7	Anulación venta #110
146	435	ANULACION_VENTA	1	2026-03-02 17:33:42.009869	7	Anulación venta #111
147	373	VENTA	1	2026-03-02 17:34:31.30955	7	Venta #112
148	435	VENTA	1	2026-03-02 17:34:31.30955	7	Venta #112
149	649	VENTA	1	2026-03-02 18:58:49.325472	7	Venta #114
150	155	VENTA	1	2026-03-02 18:59:14.516157	7	Venta #115
151	37	VENTA	1	2026-03-02 18:59:14.516157	7	Venta #115
152	99	VENTA	2	2026-03-03 17:38:33.867087	7	Venta #117
153	140	VENTA	1	2026-03-03 17:38:33.867087	7	Venta #117
154	37	VENTA	2	2026-03-03 17:38:44.190706	7	Venta #118
155	246	VENTA	1	2026-03-03 17:41:49.42087	7	Venta #119
156	37	VENTA	1	2026-03-03 18:03:14.319715	7	Venta #120
157	173	VENTA	2	2026-03-03 19:54:24.536333	7	Venta #121
158	35	VENTA	2	2026-03-03 19:54:24.536333	7	Venta #121
159	651	VENTA	1	2026-03-03 19:54:24.536333	7	Venta #121
160	238	VENTA	1	2026-03-03 20:55:27.399183	7	Venta #122
161	29	VENTA	4	2026-03-04 00:33:46.091804	7	Venta #123
162	140	VENTA	1	2026-03-04 00:33:46.091804	7	Venta #123
163	23	VENTA	1	2026-03-04 17:54:18.259857	7	Venta #124
164	155	VENTA	1	2026-03-04 17:54:18.259857	7	Venta #124
165	28	VENTA	1	2026-03-04 17:54:18.259857	7	Venta #124
166	246	VENTA	1	2026-03-04 18:27:06.505605	7	Venta #125
167	37	VENTA	1	2026-03-04 18:27:22.528715	7	Venta #126
168	649	VENTA	1	2026-03-04 18:27:22.528715	7	Venta #126
169	24	VENTA	2	2026-03-05 21:03:56.838293	7	Venta #127
170	155	VENTA	1	2026-03-05 21:04:30.164365	7	Venta #128
171	37	VENTA	1	2026-03-05 21:04:30.164365	7	Venta #128
172	101	VENTA	1	2026-03-05 21:04:30.164365	7	Venta #128
173	24	VENTA	2	2026-03-06 17:00:13.434263	7	Venta #129
174	144	VENTA	1	2026-03-06 17:00:26.300791	7	Venta #130
175	37	VENTA	1	2026-03-06 17:00:26.300791	7	Venta #130
176	246	VENTA	1	2026-03-06 17:01:01.591392	7	Venta #131
177	649	VENTA	1	2026-03-06 17:01:01.591392	7	Venta #131
178	238	VENTA	3	2026-03-06 17:36:37.588237	7	Venta #132
179	244	VENTA	1	2026-03-06 17:36:37.588237	7	Venta #132
180	246	VENTA	1	2026-03-06 17:41:40.706222	7	Venta #133
181	246	VENTA	1	2026-03-06 18:50:55.674118	7	Venta #134
182	37	VENTA	1	2026-03-06 21:05:19.326759	7	Venta #135
183	62	VENTA	2	2026-03-06 21:05:19.326759	7	Venta #135
184	29	VENTA	2	2026-03-06 21:17:22.92356	7	Venta #136
185	29	AJUSTE	60	2026-03-06 21:17:49.143936	7	Ajuste stock: -25 -> 35
186	96	VENTA	1	2026-03-06 21:27:46.253256	7	Venta #137
187	365	VENTA	1	2026-03-07 17:49:58.799969	7	Venta #138
188	420	VENTA	1	2026-03-07 17:50:37.681271	7	Venta #139
189	419	VENTA	1	2026-03-07 19:28:16.887653	7	Venta #140
190	246	VENTA	2	2026-03-07 20:25:43.011889	7	Venta #141
191	651	VENTA	2	2026-03-07 20:25:43.011889	7	Venta #141
192	373	VENTA	1	2026-03-09 19:52:52.630307	7	Venta #142
193	236	VENTA	1	2026-03-09 19:52:52.630307	7	Venta #142
194	29	VENTA	4	2026-03-09 22:29:42.99158	7	Venta #143
195	307	VENTA	1	2026-03-09 23:42:34.556583	7	Venta #144
196	239	VENTA	1	2026-03-11 17:34:43.365142	7	Venta #146
197	674	VENTA	1	2026-03-11 18:16:07.195258	7	Venta #147
198	29	VENTA	1	2026-03-11 18:48:28.070489	7	Venta #148
199	246	VENTA	2	2026-03-11 19:32:29.094854	7	Venta #149
200	238	VENTA	1	2026-03-11 19:32:29.094854	7	Venta #149
201	238	VENTA	1	2026-03-11 19:32:41.535074	7	Venta #150
202	246	VENTA	1	2026-03-16 17:01:10.344043	7	Venta #151
203	327	VENTA	1	2026-03-16 17:45:52.991455	7	Venta #153
204	332	VENTA	1	2026-03-16 17:46:36.405424	7	Venta #154
205	246	VENTA	2	2026-03-16 20:03:29.442779	7	Venta #155
206	647	VENTA	1	2026-03-16 20:03:29.442779	7	Venta #155
207	435	VENTA	1	2026-03-16 20:04:50.189142	7	Venta #156
208	37	VENTA	1	2026-03-17 16:49:11.929164	7	Venta #157
209	652	VENTA	1	2026-03-17 16:49:22.009307	7	Venta #158
210	246	VENTA	1	2026-03-17 17:21:51.619973	7	Venta #159
211	246	VENTA	1	2026-03-17 17:22:01.371689	7	Venta #160
212	20	VENTA	1	2026-09-22 13:32:39.163407	2	Venta #162
213	20	VENTA	1	2026-09-22 13:32:49.981771	2	Venta #163
214	20	ANULACION_VENTA	1	2026-09-22 19:32:49.989333	2	Anulación venta #163
215	20	VENTA	1	2026-09-22 19:38:30.716632	2	Venta #164
216	675	VENTA	1	2026-09-22 23:35:42.681509	2	Venta #165
217	29	VENTA	1	2026-09-23 00:26:41.011244	2	Venta #166
218	29	VENTA	1	2026-09-23 00:30:06.708731	2	Venta #167
219	29	VENTA	1	2026-09-23 00:31:24.680358	2	Venta #168
220	37	AJUSTE	11	2026-09-23 00:37:23.369788	2	Auditoría / Conteo Físico
221	29	VENTA	1	2026-09-23 01:34:14.016677	2	Venta #169
222	155	VENTA	1	2026-09-23 03:14:20.767454	2	Venta #170
223	337	VENTA	1	2026-09-23 03:14:59.434519	2	Venta #171
224	35	VENTA	1	2026-09-23 17:29:39.855555	2	Venta #172
225	675	VENTA	1	2026-09-23 17:30:39.563726	2	Venta #173
226	411	VENTA	1	2026-09-23 17:31:36.690874	2	Venta #174
227	411	VENTA	1	2026-09-23 17:32:06.060235	2	Venta #175
228	411	VENTA	1	2026-09-23 17:32:24.552931	2	Venta #176
229	682	VENTA	1	2026-09-23 17:33:56.391661	2	Venta #178
230	155	VENTA	1	2026-09-23 21:19:46.102778	2	Venta #179
231	675	VENTA	1	2026-09-24 17:49:51.202431	2	Venta #180
\.


--
-- Data for Name: usuarios; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.usuarios (id_usuario, nombre_completo, pin_acceso, rol, activo, username) FROM stdin;
4	Rocio Aguirre	$2b$10$LdFb6KLan4RZT5b4CzvMk.hpEx193CP5y.w95sMIeRDBBlIEsFA2m	empleado	t	Rocio14
7	Fanny Garcia	$2b$10$GxZn3cJc1GUdXRQ5WB.beO7cLLGLSXnHj/30vTFE1hkZ2jKS2q4VS	empleado	t	Fanny14
2	Miguel Andreu García	$2b$10$/.7vGwDVXUfnuPA7r/Sc3uzZGqgXMf8eGWCWtctd6VjET6Zd9bqBy	admin	t	MiguelAn
5	Juan Miguel García	$2b$10$tDOx4zAyV9TYYL4b/21N8OB8fUA2eIVWbv05oOWpb7WMfDhHUu71.	empleado	t	JuanJMG
\.


--
-- Data for Name: ventas; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.ventas (id_venta, fecha_venta, id_usuario, nombre_cliente, total, metodo_pago, notas, subtotal, monto_iva, estado) FROM stdin;
36	2026-02-12 00:15:36.179946	7	Mostrador	450.00	Efectivo	1x Carcasa Chevrolet Presencia 6 BTN	450.00	0.00	COMPLETADA
3	2026-02-09 18:20:23.432334	7	Mostrador	100.00	Tarjeta	2x Casa Tetra Alba/JMA	100.00	0.00	COMPLETADA
4	2026-02-09 19:12:55.453273	7	Mostrador	95.00	Efectivo	1x Casa puntos TOV 8D	95.00	0.00	COMPLETADA
5	2026-02-09 21:29:33.899696	7	Chava	6500.00	Efectivo	1x Programación Aveo	6500.00	0.00	COMPLETADA
6	2026-02-09 21:57:41.27605	7	Mostrador	90.00	Efectivo	1x CR2032	90.00	0.00	COMPLETADA
7	2026-02-09 22:35:46.338105	7	Mostrador	90.00	Efectivo	1x CR2025	90.00	0.00	COMPLETADA
37	2026-02-12 00:41:12.384888	7	Mostrador	1500.00	Efectivo	1x Llave Control Toyota KEYDIY Corazon 4 BTN	1500.00	0.00	COMPLETADA
9	2026-02-09 22:42:16.785207	7	Manuel Acambaro	2000.00	Efectivo	Se sacaron cortes y se dio la llaveco el chip 4D que ya traía, llave de frecuencia 315.	2000.00	0.00	COMPLETADA
10	2026-02-09 22:56:24.090747	7	Mostrador	25.00	Efectivo	1x CASA R1 CORTA	25.00	0.00	COMPLETADA
11	2026-02-09 23:17:51.089443	7	Mostrador	90.00	Efectivo	1x CR2032	90.00	0.00	COMPLETADA
12	2026-02-09 23:29:08.975721	7	Mostrador	500.00	Efectivo	17x CASA R1 CORTA, 3x CASA R52	500.00	0.00	COMPLETADA
14	2026-02-09 23:39:30.16986	7	Mostrador	500.00	Tarjeta	1x Carcasa Volkswagen Clasico Abatible 4 BTN	500.00	0.00	COMPLETADA
15	2026-02-10 00:30:51.930046	7	Mostrador	80.00	Efectivo	2x Llavero sencillo	80.00	0.00	COMPLETADA
16	2026-02-10 15:47:00.15622	7	Mostrador	80.00	Efectivo	1x Llavero carritos	80.00	0.00	COMPLETADA
17	2026-02-10 16:08:30.085806	7	Mostrador	50.00	Efectivo	2x CASA R52 COLORES	50.00	0.00	COMPLETADA
18	2026-02-10 16:14:42.597618	7	Mostrador	90.00	Efectivo	1x CR2032	90.00	0.00	COMPLETADA
19	2026-02-10 17:33:06.549923	7	Mostrador	350.00	Efectivo	1x Llavin VW	350.00	0.00	COMPLETADA
20	2026-02-10 18:46:23.568213	7	Mostrador	90.00	Efectivo	1x CR2025	90.00	0.00	COMPLETADA
21	2026-02-10 19:41:58.905252	7	Mostrador	300.00	Efectivo	1x DIAGN├ôSTICO	300.00	0.00	COMPLETADA
22	2026-02-10 19:45:21.160687	7	Mostrador	200.00	Efectivo	1x JUANMI PRESTO	200.00	0.00	COMPLETADA
23	2026-02-10 22:15:12.103799	7	Poncho	90.00	Efectivo	Vino la mamí de poncho. Dijo que poncho se la pagaba. NO HA PAGADO	90.00	0.00	COMPLETADA
38	2026-02-12 17:56:55.867682	7	Mostrador	90.00	Efectivo	1x CR2032	90.00	0.00	COMPLETADA
25	2026-02-10 23:21:44.754409	7	Mostrador	275.00	Efectivo	1x 715 - CL Clasica Izquierda	275.00	0.00	COMPLETADA
26	2026-02-10 23:41:50.882222	7	Mostrador	150.00	Efectivo	6x CASA R52	150.00	0.00	COMPLETADA
27	2026-02-11 00:14:45.496283	7	Mostrador	25.00	Efectivo	1x CASA R1 CORTA	25.00	0.00	COMPLETADA
28	2026-02-11 00:15:57.865789	7	Mostrador	200.00	Efectivo	1x DIAGNôSTICO | Miguelito reviso un carrito	200.00	0.00	COMPLETADA
29	2026-02-11 00:16:23.259234	7	Mostrador	90.00	Efectivo	1x CR2032	90.00	0.00	COMPLETADA
30	2026-02-11 16:37:06.303019	7	Mostrador	75.00	Efectivo	3x CASA R52	75.00	0.00	COMPLETADA
31	2026-02-11 18:04:37.109503	7	Mostrador	500.00	Efectivo	1x Carcasa Volkswagen Clasico Abatible 4 BTN	500.00	0.00	COMPLETADA
32	2026-02-11 18:54:51.903059	7	Mostrador	90.00	Efectivo	1x CR27A	90.00	0.00	COMPLETADA
33	2026-02-11 19:06:27.406184	7	Mostrador	600.00	Efectivo	1x Carcasa Honda Llave Control 4 BTN, 1x Fundas Silicon Suave	600.00	0.00	COMPLETADA
34	2026-02-11 19:25:54.017371	7	Mostrador	95.00	Efectivo	1x Casa puntos TOV 9D	95.00	0.00	COMPLETADA
35	2026-02-11 20:53:57.580708	7	Mostrador	90.00	Efectivo	1x CR27A	90.00	0.00	COMPLETADA
39	2026-02-12 18:21:50.428616	7	Mostrador	1000.00	Efectivo	1x Reparación de Switch VW	1000.00	0.00	COMPLETADA
40	2026-02-12 20:41:25.714686	7	Mostrador	90.00	Efectivo	1x CR1620	90.00	0.00	COMPLETADA
41	2026-02-12 21:39:31.045521	7	Mostrador	100.00	Efectivo	2x CASA R52, 2x CASA R1 CORTA	100.00	0.00	COMPLETADA
42	2026-02-13 00:00:54.815398	7	Mostrador	900.00	Efectivo	1x Reparación General | Reparación de pastilla Gol	900.00	0.00	COMPLETADA
43	2026-02-16 17:40:18.303081	7	Mostrador	75.00	Efectivo	1x CASA E109, 1x Casa Tetra Alba/JMA	75.00	0.00	COMPLETADA
45	2026-02-16 17:43:12.619318	7	Mostrador	100.00	Efectivo	1x CHAPIS PRESTO	100.00	0.00	COMPLETADA
46	2026-02-16 18:00:33.458992	7	Mostrador	81.00	Efectivo	3x CASA R1 CORTA, 2x Gomitas	81.00	0.00	COMPLETADA
47	2026-02-16 18:04:01.774687	7	G├╝ero del porvenir	300.00	Efectivo	1x Control Ford 3 BTN IND | Solo control	300.00	0.00	COMPLETADA
48	2026-02-16 18:51:45.778665	7	Mostrador	90.00	Efectivo	1x CR2032	90.00	0.00	COMPLETADA
51	2026-02-16 19:10:26.624759	7	Mostrador	1800.00	Tarjeta	1x Duplicado con control Sienna ┬¿06	1800.00	0.00	COMPLETADA
50	2026-02-16 19:09:53.02491	7	Mostrador	1000.00	Efectivo	1x Corte y Programacion FORD | Lleva un chip, sabra dios cual	1000.00	0.00	COMPLETADA
53	2026-02-16 20:19:34.31271	7	Mostrador	2500.00	Efectivo	1x Reprogramacion de Módulo | FRM	2500.00	0.00	COMPLETADA
54	2026-02-16 22:36:28.498815	7	Mostrador	130.00	Efectivo	1x CASA R52L, 4x CASA R52 COLORES	130.00	0.00	COMPLETADA
55	2026-02-17 20:39:11.886918	7	Mostrador	275.00	Efectivo	2x CASA R52, 1x Casa Tetra Chica Derecha, 1x Casa Tetra Alba/JMA, 5x CASA R1 CORTA	275.00	0.00	COMPLETADA
56	2026-02-17 21:13:25.713419	7	Mostrador	900.00	Tarjeta	1x Programacion de Chip | Programacion Pointer 2002. TP08 Malayo	900.00	0.00	COMPLETADA
57	2026-02-17 21:59:51.230029	7	Mostrador	6500.00	Efectivo	1x Programación Aveo	6500.00	0.00	COMPLETADA
58	2026-02-17 23:19:21.749561	7	Mostrador	90.00	Efectivo	1x CR2016	90.00	0.00	COMPLETADA
59	2026-02-17 23:35:08.493561	7	Mostrador	1800.00	Tarjeta	1x Llave Control Chrysler Cajuela 4 BTN	1800.00	0.00	COMPLETADA
60	2026-02-18 18:43:54.683743	7	Mostrador	690.00	Tarjeta	1x Fundas Silicon Suave, 1x Carcasa Honda Llave Control 2 BTN, 1x CR1616	690.00	0.00	COMPLETADA
61	2026-02-18 18:44:58.355297	7	Mostrador	200.00	Efectivo	1x Casa puntos TOV 5, 1x Casa rectangular TR5, 1x Casa CM5 	200.00	0.00	COMPLETADA
62	2026-02-18 19:33:51.957932	7	Mostrador	90.00	Efectivo	1x CR2032	90.00	0.00	COMPLETADA
63	2026-02-18 21:45:10.296423	2	Mostrador	90.00	Efectivo	1x CR2032	90.00	0.00	COMPLETADA
64	2026-02-18 21:55:18.025352	7	Mostrador	95.00	Efectivo	1x Casa puntos Philips Xtra larga	95.00	0.00	COMPLETADA
65	2026-02-18 21:56:28.747985	2	Mostrador	1400.00	Efectivo	1x Reparación de Switch VW, 1x Hechura Llave Automotriz	1400.00	0.00	COMPLETADA
66	2026-02-18 23:07:00.745477	7	Mostrador	90.00	Efectivo	1x CR2032	90.00	0.00	COMPLETADA
67	2026-02-18 23:17:25.291002	7	Mostrador	28.00	Efectivo	1x CASA R52, 1x Gomitas	28.00	0.00	COMPLETADA
68	2026-02-19 17:14:06.13002	7	Mostrador	900.00	Efectivo	1x Control Generico XHORSE 4 BTN	900.00	0.00	COMPLETADA
69	2026-02-19 18:17:54.1361	7	Mostrador	500.00	Efectivo	1x Carcasa Chevrolet Abatible Cavalier Regata 3 BTN	500.00	0.00	COMPLETADA
71	2026-02-19 18:33:26.994079	7	Mostrador	900.00	Efectivo	1x Control Ford 4 BTN IND	900.00	0.00	COMPLETADA
72	2026-02-19 20:16:50.062498	7	Mostrador	60.00	Efectivo	2x CASA R52L	60.00	0.00	COMPLETADA
73	2026-02-19 20:17:00.585968	7	Mostrador	40.00	Efectivo	1x Llavero sencillo	40.00	0.00	COMPLETADA
103	2026-02-27 19:27:41.239893	7	Mostrador	2000.00	Efectivo	2x SENSORES DE LLANTA	2000.00	0.00	COMPLETADA
75	2026-02-19 22:16:12.445901	7	Mostrador	650.00	Tarjeta	1x Repración de espiga de OPEL	650.00	0.00	COMPLETADA
76	2026-02-20 17:45:00.130536	7	Mostrador	178.00	Efectivo	1x MOTO Yamaha YM63, 1x Candado 112	178.00	0.00	COMPLETADA
77	2026-02-20 18:04:20.011188	7	Mostrador	61.00	Efectivo	2x CASA R52, 2x Gomitas, 1x Arito de colores	61.00	0.00	COMPLETADA
78	2026-02-20 21:34:29.357365	7	Mostrador	90.00	Efectivo	1x CR27A	90.00	0.00	COMPLETADA
79	2026-02-20 22:18:13.72237	7	Mostrador	1500.00	Tarjeta	1x Abatible Genericho Chevrolet XHORSE	1500.00	0.00	COMPLETADA
80	2026-02-20 23:14:35.031729	7	Mostrador	1700.00	Efectivo	1x Abatible Generico Honda KEYDIY 4 BTN	1700.00	0.00	COMPLETADA
81	2026-02-21 00:47:01.47824	7	Mostrador	500.00	Efectivo	1x Carcasa Volkswagen DC Abatible 4 BTN	500.00	0.00	COMPLETADA
82	2026-02-23 17:36:25.483579	7	Mostrador	30.00	Efectivo	1x CASA R52L	30.00	0.00	COMPLETADA
83	2026-02-24 19:20:52.203296	7	Mostrador	90.00	Efectivo	1x CR2032	90.00	0.00	COMPLETADA
84	2026-02-24 19:21:44.271053	7	Mostrador	150.00	Efectivo	1x Casa Tetra Alba/JMA, 1x CASA R52, 1x CASA S6 Corta, 1x CASA R1 CORTA, 1x Llavero sencillo	150.00	0.00	COMPLETADA
85	2026-02-24 21:54:48.060311	7	Mostrador	200.00	Efectivo	1x DIAGN├ôSTICO	200.00	0.00	COMPLETADA
86	2026-02-24 22:21:27.808401	7	Mostrador	75.00	Efectivo	3x CASA R1 CORTA	75.00	0.00	COMPLETADA
87	2026-02-24 23:27:55.867338	7	Mostrador	170.00	Efectivo	1x Casa puntos TOV 7, 1x CASA E109, 1x Casa Tetra Chica Derecha	170.00	0.00	COMPLETADA
88	2026-02-24 23:28:49.277063	7	Mostrador	2200.00	Transferencia	1x Llave Prescencia Nissan 815 4 BTN	2200.00	0.00	COMPLETADA
89	2026-02-25 00:14:09.948306	7	Mostrador	90.00	Efectivo	1x CR2032	90.00	0.00	COMPLETADA
90	2026-02-25 01:19:24.578684	7	Mostrador	240.00	Efectivo	1x CR2032, 1x Fundas Silicon Dura	240.00	0.00	COMPLETADA
91	2026-02-25 18:01:06.123196	7	Mostrador	55.00	Tarjeta	1x CASA E109, 1x CASA R52L	55.00	0.00	COMPLETADA
92	2026-02-25 18:28:04.909179	7	Mostrador	100.00	Efectivo	4x CASA R1 CORTA	100.00	0.00	COMPLETADA
93	2026-02-25 18:28:16.633261	7	Mostrador	95.00	Efectivo	1x Casa puntos TOV 5	95.00	0.00	COMPLETADA
94	2026-02-25 20:51:29.727023	7	Mostrador	75.00	Efectivo	3x CASA R52	75.00	0.00	COMPLETADA
95	2026-02-25 21:32:00.919706	7	Mostrador	90.00	Efectivo	1x CR2032	90.00	0.00	COMPLETADA
96	2026-02-25 21:48:35.049386	7	Mostrador	125.00	Efectivo	2x Casa Tetra Alba/JMA, 1x CASA E109	125.00	0.00	COMPLETADA
97	2026-02-25 21:48:49.008819	7	Mostrador	30.00	Transferencia	1x CASA R52L	30.00	0.00	COMPLETADA
98	2026-02-25 23:38:46.970171	7	Mostrador	25.00	Efectivo	1x CASA R52	25.00	0.00	COMPLETADA
99	2026-02-25 23:39:34.136073	7	Mostrador	250.00	Efectivo	1x Hechura Llave Automotriz | Cambio codito	250.00	0.00	COMPLETADA
100	2026-02-26 18:24:27.599502	7	Mostrador	300.00	Tarjeta	10x CASA R52L	300.00	0.00	COMPLETADA
101	2026-02-26 19:48:47.599943	7	Mostrador	90.00	Efectivo	1x CR2032	90.00	0.00	COMPLETADA
102	2026-02-26 19:55:35.235483	7	Mostrador	90.00	Efectivo	1x CR2025	90.00	0.00	COMPLETADA
104	2026-02-27 21:32:23.706321	7	Mostrador	150.00	Efectivo	1x CR2450	150.00	0.00	COMPLETADA
105	2026-02-28 17:15:33.840957	7	Mostrador	900.00	Efectivo	1x Control Generico XHORSE 4 BTN	900.00	0.00	COMPLETADA
106	2026-02-28 17:17:33.890501	7	Mostrador	1600.00	Efectivo	1x Abatible Generico Volkswagen XHORSE 4 BTN	1600.00	0.00	COMPLETADA
107	2026-02-28 18:43:29.68942	7	Mostrador	100.00	Efectivo	1x Fundas Silicon Suave	100.00	0.00	COMPLETADA
108	2026-02-28 19:04:36.981088	7	Mostrador	315.00	Efectivo	2x Casa puntos AMG 10, 5x CASA R1 CORTA	315.00	0.00	COMPLETADA
109	2026-03-02 17:02:50.564181	7	Mostrador	50.00	Efectivo	2x CASA E109	50.00	0.00	COMPLETADA
117	2026-03-03 17:38:33.867087	7	Mostrador	240.00	Efectivo	2x Casa puntos PHI 12, 1x Casa Tetra Alba/JMA	240.00	0.00	COMPLETADA
112	2026-03-02 17:34:31.30955	7	Mostrador	2000.00	Tarjeta	1x Carcasa Honda Llave Control 4 BTN, 1x Abatible Generico Honda KEYDIY 4 BTN	2000.00	0.00	COMPLETADA
113	2026-03-02 17:45:01.770467	7	ANTENA DE MAGA├æA	1700.00	Efectivo	1x VENTA DE PARTE	1700.00	0.00	COMPLETADA
114	2026-03-02 18:58:49.325472	7	Mostrador	40.00	Efectivo	1x Llavero sencillo	40.00	0.00	COMPLETADA
115	2026-03-02 18:59:14.516157	7	Mostrador	55.00	Efectivo	1x CASA R52L, 1x CASA R52	55.00	0.00	COMPLETADA
116	2026-03-03 01:15:57.973337	2	Mostrador	5600.00	Efectivo	2x Reparación de Switch Volkswagen MK6-Bora | Nuevos Housing	5600.00	0.00	COMPLETADA
118	2026-03-03 17:38:44.190706	7	Mostrador	50.00	Efectivo	2x CASA R52	50.00	0.00	COMPLETADA
119	2026-03-03 17:41:49.42087	7	Mostrador	90.00	Efectivo	1x CR2032	90.00	0.00	COMPLETADA
120	2026-03-03 18:03:14.319715	7	Mostrador	25.00	Efectivo	1x CASA R52	25.00	0.00	COMPLETADA
121	2026-03-03 19:54:24.536333	7	Mostrador	360.00	Efectivo	2x CASA DX31, 2x CASA R55, 1x Llavero Premium	360.00	0.00	COMPLETADA
122	2026-03-03 20:55:27.399183	7	Mostrador	90.00	Efectivo	1x CR2025	90.00	0.00	COMPLETADA
123	2026-03-04 00:33:46.091804	7	Mostrador	150.00	Efectivo	4x CASA R1 CORTA, 1x Casa Tetra Alba/JMA	150.00	0.00	COMPLETADA
124	2026-03-04 17:54:18.259857	7	Mostrador	80.00	Efectivo	1x CASA S6 Corta, 1x CASA R52L, 1x CASA R1 LARGA	80.00	0.00	COMPLETADA
125	2026-03-04 18:27:06.505605	7	Mostrador	90.00	Efectivo	1x CR2032	90.00	0.00	COMPLETADA
126	2026-03-04 18:27:22.528715	7	Mostrador	65.00	Efectivo	1x CASA R52, 1x Llavero sencillo	65.00	0.00	COMPLETADA
127	2026-03-05 21:03:56.838293	7	Mostrador	50.00	Efectivo	2x CASA E109	50.00	0.00	COMPLETADA
128	2026-03-05 21:04:30.164365	7	Mostrador	150.00	Tarjeta	1x CASA R52L, 1x CASA R52, 1x Casa puntos TRU 12	150.00	0.00	COMPLETADA
129	2026-03-06 17:00:13.434263	7	Mostrador	50.00	Efectivo	2x CASA E109	50.00	0.00	COMPLETADA
130	2026-03-06 17:00:26.300791	7	Mostrador	75.00	Efectivo	1x Casa Tetra Chica Chueca, 1x CASA R52	75.00	0.00	COMPLETADA
131	2026-03-06 17:01:01.591392	7	Mostrador	130.00	Efectivo	1x CR2032, 1x Llavero sencillo	130.00	0.00	COMPLETADA
132	2026-03-06 17:36:37.588237	7	Mostrador	360.00	Efectivo	3x CR2025, 1x CR23A	360.00	0.00	COMPLETADA
133	2026-03-06 17:41:40.706222	7	Mostrador	90.00	Efectivo	1x CR2032	90.00	0.00	COMPLETADA
134	2026-03-06 18:50:55.674118	7	Mostrador	90.00	Efectivo	1x CR2032	90.00	0.00	COMPLETADA
135	2026-03-06 21:05:19.326759	7	Mostrador	75.00	Efectivo	1x CASA R52, 2x Casa T4	75.00	0.00	COMPLETADA
136	2026-03-06 21:17:22.92356	7	Mostrador	50.00	Efectivo	2x CASA R1 CORTA	50.00	0.00	COMPLETADA
137	2026-03-06 21:27:46.253256	7	Mostrador	95.00	Efectivo	1x Casa puntos TOV6	95.00	0.00	COMPLETADA
138	2026-03-07 17:49:58.799969	7	Mostrador	1800.00	Efectivo	1x Abatible Chevrolet 5 BTN Regata	1800.00	0.00	COMPLETADA
139	2026-03-07 17:50:37.681271	7	Mostrador	800.00	Efectivo	1x Llave Hueca Volkswagen V0-8P Gol | Duplicado Pointer	800.00	0.00	COMPLETADA
140	2026-03-07 19:28:16.887653	7	Mostrador	900.00	Tarjeta	1x Llave Hueca Volkswagen HU66 | DUPLICADO VW JETTA	900.00	0.00	COMPLETADA
141	2026-03-07 20:25:43.011889	7	Mostrador	320.00	Efectivo	2x CR2032, 2x Llavero Premium	320.00	0.00	COMPLETADA
142	2026-03-09 19:52:52.630307	7	Mostrador	590.00	Tarjeta	1x Carcasa Honda Llave Control 4 BTN, 1x CR1620	590.00	0.00	COMPLETADA
143	2026-03-09 22:29:42.99158	7	Mostrador	100.00	Efectivo	4x CASA R1 CORTA	100.00	0.00	COMPLETADA
144	2026-03-09 23:42:34.556583	7	Mostrador	700.00	Efectivo	1x Llave Hueca GM OP11P2 Regata	700.00	0.00	COMPLETADA
145	2026-03-11 16:45:06.317792	7	Mostrador	1000.00	Efectivo	1x Programacion de Chip	1000.00	0.00	COMPLETADA
146	2026-03-11 17:34:43.365142	7	Mostrador	90.00	Efectivo	1x CR1220	90.00	0.00	COMPLETADA
147	2026-03-11 18:16:07.195258	7	Mostrador	30.00	Efectivo	1x PERNO	30.00	0.00	COMPLETADA
148	2026-03-11 18:48:28.070489	7	Mostrador	25.00	Efectivo	1x CASA R1 CORTA	25.00	0.00	COMPLETADA
149	2026-03-11 19:32:29.094854	7	Mostrador	270.00	Efectivo	2x CR2032, 1x CR2025	270.00	0.00	COMPLETADA
150	2026-03-11 19:32:41.535074	7	Mostrador	90.00	Efectivo	1x CR2025	90.00	0.00	COMPLETADA
151	2026-03-16 17:01:10.344043	7	Mostrador	90.00	Efectivo	1x CR2032	90.00	0.00	COMPLETADA
152	2026-03-16 17:01:37.331527	7	Mostrador	50.00	Efectivo	1x DIAGN├ôSTICO	50.00	0.00	COMPLETADA
153	2026-03-16 17:45:52.991455	7	Mostrador	500.00	Efectivo	1x Carcasa Chevrolet Llave Control 3 BTN	500.00	0.00	COMPLETADA
154	2026-03-16 17:46:36.405424	7	Mostrador	500.00	Efectivo	1x Carcasa Chevrolet Abatible Regata 2 BTN	500.00	0.00	COMPLETADA
155	2026-03-16 20:03:29.442779	7	Mostrador	220.00	Efectivo	2x CR2032, 1x Cinta corta	220.00	0.00	COMPLETADA
156	2026-03-16 20:04:50.189142	7	Mostrador	1500.00	Efectivo	1x Abatible Generico Honda KEYDIY 4 BTN	1500.00	0.00	COMPLETADA
157	2026-03-17 16:49:11.929164	7	Mostrador	25.00	Efectivo	1x CASA R52	25.00	0.00	COMPLETADA
158	2026-03-17 16:49:22.009307	7	Mostrador	100.00	Efectivo	1x Llavero carritos	100.00	0.00	COMPLETADA
159	2026-03-17 17:21:51.619973	7	Mostrador	90.00	Efectivo	1x CR2032	90.00	0.00	COMPLETADA
160	2026-03-17 17:22:01.371689	7	Mostrador	90.00	Efectivo	1x CR2032	90.00	0.00	COMPLETADA
8	2026-02-09 22:40:19.371955	7	Mostrador	0.00	Efectivo	1x Corte Een llave control\n[ANULADA] 2026-02-09T22:41:04.637Z por usuario 7	0.00	0.00	ANULADA
13	2026-02-09 23:38:44.060436	7	Mostrador	0.00	Efectivo	1x Carcasa Volkswagen Clasico Abatible 4 BTN\n[ANULADA] 2026-02-09T23:39:01.074Z por usuario 7 ┬À Motivo: Ayayay	0.00	0.00	ANULADA
24	2026-02-10 22:31:10.903799	7	Mostrador	0.00	Efectivo	1x CHAPIS PRESTO\n[ANULADA] 2026-02-11T00:17:32.011Z por usuario 7	0.00	0.00	ANULADA
44	2026-02-16 17:41:30.625455	7	Mostrador	0.00	Efectivo	1x CHAPIS PRESTO\n[ANULADA] 2026-02-16T17:43:02.224Z por usuario 7 ┬À Motivo: Queria dormir al velador la chapis	0.00	0.00	ANULADA
49	2026-02-16 19:07:55.374007	7	Mostrador	0.00	Efectivo	1x Duplicado con control Sienna ┬¿06\n[ANULADA] 2026-02-16T19:10:14.000Z por usuario 7 ┬À Motivo: Metodo de pago incorrecto	0.00	0.00	ANULADA
52	2026-02-16 20:18:12.89153	7	Mostrador	0.00	Efectivo	1x Reprogramacion de Módulo | Modulo FRM\n[ANULADA] 2026-02-16T20:18:55.791Z por usuario 7 ┬À Motivo: Cantidad	0.00	0.00	ANULADA
70	2026-02-19 18:31:45.179255	7	Mostrador	0.00	Efectivo	1x Carcasa Ford Control IND 3 BTN\n[ANULADA] 2026-02-19T18:32:56.304Z por usuario 7	0.00	0.00	ANULADA
74	2026-02-19 22:15:29.543498	7	Mostrador	0.00	Efectivo	1x Repración de espiga de OPEL\n[ANULADA] 2026-02-19T22:15:42.304Z por usuario 7	0.00	0.00	ANULADA
110	2026-03-02 17:31:39.805606	7	Mostrador	0.00	Efectivo	1x Carcasa Honda Llave Control 4 BTN\n[ANULADA] 2026-03-02T17:33:39.343Z por usuario 7	0.00	0.00	ANULADA
111	2026-03-02 17:33:25.963106	7	Mostrador	0.00	Efectivo	1x Abatible Generico Honda KEYDIY 4 BTN\n[ANULADA] 2026-03-02T17:33:42.381Z por usuario 7	0.00	0.00	ANULADA
162	2026-09-22 19:32:39.163407	2	Test Anulación	25.00	Efectivo	1x CASA E4B | Venta de prueba para verificar estado	25.00	0.00	COMPLETADA
175	2026-09-23 17:32:06.060235	2	Mostrador	400.00	Tarjeta	1x Carcasa Volkswagen MQB Abatible 4 BTN	400.00	0.00	COMPLETADA
163	2026-09-22 19:32:49.981771	2	Test Anulación	0.00	Efectivo	1x CASA E4B | Venta de prueba para verificar estado\n[ANULADA] 2026-09-22T19:32:49.991Z por usuario 2 · Motivo: Prueba de sistema	0.00	0.00	ANULADA
164	2026-09-22 19:38:30.716632	2	Cliente Prueba AutoCaja	25.00	Efectivo	1x CASA E4B | Venta sin caja previa abierta	25.00	0.00	COMPLETADA
165	2026-09-22 23:35:42.681509	2	Mostrador	25.00	Tarjeta	1x Duplicado Casa Estándar	25.00	0.00	COMPLETADA
166	2026-09-23 00:26:41.011244	2	Mostrador	25.00	Efectivo	1x CASA R1 CORTA	25.00	0.00	COMPLETADA
167	2026-09-23 00:30:06.708731	2	Mostrador	25.00	Efectivo	1x CASA R1 CORTA	25.00	0.00	COMPLETADA
168	2026-09-23 00:31:24.680358	2	Mostrador	25.00	Efectivo	1x CASA R1 CORTA	25.00	0.00	COMPLETADA
169	2026-09-23 01:34:14.016677	2	Mostrador	25.00	Efectivo	1x CASA R1 CORTA	25.00	0.00	COMPLETADA
170	2026-09-23 03:14:20.767454	2	Mostrador	30.00	Efectivo	1x CASA R52L	30.00	0.00	COMPLETADA
171	2026-09-23 03:14:59.434519	2	Mostrador	500.00	Efectivo	1x Carcasa Chevrolet Abatible Spark Doble Corte 3 BTN	500.00	0.00	COMPLETADA
172	2026-09-23 17:29:39.855555	2	Mostrador	25.00	Efectivo	1x CASA R55	25.00	0.00	COMPLETADA
173	2026-09-23 17:30:39.563726	2	Mostrador	25.00	Efectivo	1x Duplicado Casa Estándar	25.00	0.00	COMPLETADA
174	2026-09-23 17:31:36.690874	2	Mostrador	500.00	Efectivo	1x Carcasa Volkswagen MQB Abatible 4 BTN	500.00	0.00	COMPLETADA
176	2026-09-23 17:32:24.552931	2	Mostrador	500.00	Tarjeta	1x Carcasa Volkswagen MQB Abatible 4 BTN	500.00	0.00	COMPLETADA
177	2026-09-23 17:33:27.910243	2	Mostrador	400.00	Efectivo	1x Servicio General: Diagnostico jefe	400.00	0.00	COMPLETADA
178	2026-09-23 17:33:56.391661	2	Mostrador	1200.00	Efectivo	1x Reparación de Switch Volkswagen MK6-Bora, 1x Switch/Housing Volkswagen Original: Refacción en: Reparación de Switch Volkswagen MK6-Bora	1200.00	0.00	COMPLETADA
179	2026-09-23 21:19:46.102778	2	Mostrador	30.00	Efectivo	1x CASA R52L	30.00	0.00	COMPLETADA
180	2026-09-24 17:49:51.202431	2	Mostrador	25.00	Efectivo	1x Duplicado Casa Estándar	25.00	0.00	COMPLETADA
\.


--
-- Name: caja_id_caja_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.caja_id_caja_seq', 42, true);


--
-- Name: categorias_id_categoria_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.categorias_id_categoria_seq', 66, true);


--
-- Name: detalle_ventas_id_detalle_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.detalle_ventas_id_detalle_seq', 231, true);


--
-- Name: items_id_item_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.items_id_item_seq', 682, true);


--
-- Name: movimientos_caja_id_movimiento_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.movimientos_caja_id_movimiento_seq', 40, true);


--
-- Name: movimientos_inventario_id_movimiento_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.movimientos_inventario_id_movimiento_seq', 231, true);


--
-- Name: usuarios_id_usuario_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.usuarios_id_usuario_seq', 7, true);


--
-- Name: ventas_id_venta_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.ventas_id_venta_seq', 180, true);


--
-- Name: caja caja_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.caja
    ADD CONSTRAINT caja_pkey PRIMARY KEY (id_caja);


--
-- Name: categorias categorias_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.categorias
    ADD CONSTRAINT categorias_pkey PRIMARY KEY (id_categoria);


--
-- Name: detalle_ventas detalle_ventas_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.detalle_ventas
    ADD CONSTRAINT detalle_ventas_pkey PRIMARY KEY (id_detalle);


--
-- Name: items items_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.items
    ADD CONSTRAINT items_pkey PRIMARY KEY (id_item);


--
-- Name: movimientos_caja movimientos_caja_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.movimientos_caja
    ADD CONSTRAINT movimientos_caja_pkey PRIMARY KEY (id_movimiento);


--
-- Name: movimientos_inventario movimientos_inventario_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.movimientos_inventario
    ADD CONSTRAINT movimientos_inventario_pkey PRIMARY KEY (id_movimiento);


--
-- Name: usuarios usuarios_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.usuarios
    ADD CONSTRAINT usuarios_pkey PRIMARY KEY (id_usuario);


--
-- Name: usuarios usuarios_username_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.usuarios
    ADD CONSTRAINT usuarios_username_key UNIQUE (username);


--
-- Name: ventas ventas_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.ventas
    ADD CONSTRAINT ventas_pkey PRIMARY KEY (id_venta);


--
-- Name: unique_caja_abierta; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX unique_caja_abierta ON public.caja USING btree ((1)) WHERE ((estado)::text = 'ABIERTA'::text);


--
-- Name: caja caja_id_usuario_apertura_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.caja
    ADD CONSTRAINT caja_id_usuario_apertura_fkey FOREIGN KEY (id_usuario_apertura) REFERENCES public.usuarios(id_usuario);


--
-- Name: caja caja_id_usuario_cierre_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.caja
    ADD CONSTRAINT caja_id_usuario_cierre_fkey FOREIGN KEY (id_usuario_cierre) REFERENCES public.usuarios(id_usuario);


--
-- Name: detalle_ventas detalle_ventas_id_item_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.detalle_ventas
    ADD CONSTRAINT detalle_ventas_id_item_fkey FOREIGN KEY (id_item) REFERENCES public.items(id_item);


--
-- Name: detalle_ventas detalle_ventas_id_venta_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.detalle_ventas
    ADD CONSTRAINT detalle_ventas_id_venta_fkey FOREIGN KEY (id_venta) REFERENCES public.ventas(id_venta) ON DELETE CASCADE;


--
-- Name: items items_id_categoria_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.items
    ADD CONSTRAINT items_id_categoria_fkey FOREIGN KEY (id_categoria) REFERENCES public.categorias(id_categoria);


--
-- Name: movimientos_caja movimientos_caja_id_caja_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.movimientos_caja
    ADD CONSTRAINT movimientos_caja_id_caja_fkey FOREIGN KEY (id_caja) REFERENCES public.caja(id_caja);


--
-- Name: movimientos_caja movimientos_caja_id_usuario_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.movimientos_caja
    ADD CONSTRAINT movimientos_caja_id_usuario_fkey FOREIGN KEY (id_usuario) REFERENCES public.usuarios(id_usuario);


--
-- Name: movimientos_inventario movimientos_inventario_id_item_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.movimientos_inventario
    ADD CONSTRAINT movimientos_inventario_id_item_fkey FOREIGN KEY (id_item) REFERENCES public.items(id_item);


--
-- Name: movimientos_inventario movimientos_inventario_id_usuario_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.movimientos_inventario
    ADD CONSTRAINT movimientos_inventario_id_usuario_fkey FOREIGN KEY (id_usuario) REFERENCES public.usuarios(id_usuario);


--
-- Name: ventas ventas_id_usuario_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.ventas
    ADD CONSTRAINT ventas_id_usuario_fkey FOREIGN KEY (id_usuario) REFERENCES public.usuarios(id_usuario);


--
-- PostgreSQL database dump complete
--

\unrestrict pQe1nWOjcNLd82lNZeZcCfjUARRVUSfwYExf8I2xyfw73xHWLicYqZSOWUC2s8g

