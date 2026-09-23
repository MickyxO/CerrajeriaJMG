import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { itemsService } from "../../services/items.service";
import { ventasService } from "../../services/ventas.service";
import { cajaService } from "../../services/caja.service";
import { API_URL } from "../../services/api";
import { IMAGE_VARIANTS, resolveImageUrl } from "../../utils/image";
import { useAuth } from "../../hooks/useAuth";
import { useCart } from "../../hooks/useCart";

function round2(n) {
  return Math.round((Number(n) + Number.EPSILON) * 100) / 100;
}

function formatMoney(n) {
  const num = Number(n);
  if (!Number.isFinite(num)) return "$0.00";
  return num.toLocaleString("es-MX", { style: "currency", currency: "MXN" });
}

function resolveImagenUrl(value, variant) {
  return resolveImageUrl(value, { apiBaseUrl: API_URL, variant });
}

function isServiceFlag(value) {
  if (value === true || value === false) return value;
  if (typeof value === "number") return value === 1;
  const s = String(value ?? "").trim().toLowerCase();
  return s === "1" || s === "true" || s === "yes" || s === "y";
}

function iconTextFromName(value) {
  const words = String(value || "")
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (words.length === 0) return "--";
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return `${words[0][0] || ""}${words[1][0] || ""}`.toUpperCase();
}

// Helper para obtener código corto visual a partir del nombre del item residencial
function getShortResidentialCode(nombre) {
  if (!nombre) return "";
  let clean = String(nombre).trim();
  clean = clean.replace(/^(duplicado\s+)?casa\s+(puntos\s+|tetra\s+|rectangular\s+)?/i, "");
  clean = clean.replace(/^(llave\s+|duplicado\s+)/i, "");
  return clean.trim() || nombre;
}

// Subcategorías residenciales rápidas con SVGs vectoriales y soporte para sub-menú dinámico por AlertaStock
const RESIDENCIAL_FAST_KEYS = [
  {
    id: "LLAVE_SENCILLA",
    nombre: "Llave Sencilla",
    precio: 25.0,
    badge: "$25",
    hasSubmenu: true,
    categoriaIds: [2],
    categoriaMatch: ["sencilla"],
    genericItemId: 675,
    icon: (
      <svg className="h-6 w-6 text-amber-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="7.5" cy="15.5" r="5.5" />
        <path d="m21 2-9.6 9.6" />
        <path d="m15.5 7.5 3 3L22 7l-3-3" />
      </svg>
    ),
  },
  {
    id: "LLAVE_LARGA",
    nombre: "Llave Larga",
    precio: 30.0,
    badge: "$30",
    hasSubmenu: true,
    categoriaIds: [51],
    categoriaMatch: ["larga", "largas"],
    genericItemId: 676,
    icon: (
      <svg className="h-6 w-6 text-amber-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="6" cy="16" r="4" />
        <path d="m22 4-12 12" />
        <path d="m15 7 2 2" />
        <path d="m18 10 2 2" />
        <path d="m20 6 2 2" />
      </svg>
    ),
  },
  {
    id: "LLAVE_TETRA",
    nombre: "Llave Tetra",
    precio: 50.0,
    badge: "$50",
    hasSubmenu: true,
    categoriaIds: [49],
    categoriaMatch: ["tetra"],
    genericItemId: 677,
    icon: (
      <svg className="h-6 w-6 text-amber-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect width="18" height="18" x="3" y="3" rx="2" />
        <path d="M7 12h10" />
        <path d="M12 7v10" />
      </svg>
    ),
  },
  {
    id: "LLAVE_PUNTOS",
    nombre: "Llave de Puntos",
    precio: 95.0,
    badge: "$95",
    hasSubmenu: true,
    categoriaIds: [50],
    categoriaMatch: ["puntos"],
    genericItemId: 678,
    icon: (
      <svg className="h-6 w-6 text-amber-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="m21 2-9.6 9.6" />
        <circle cx="7.5" cy="15.5" r="5.5" />
        <circle cx="15.5" cy="6.5" r="1" fill="currentColor" />
        <circle cx="17.5" cy="4.5" r="1" fill="currentColor" />
        <circle cx="19.5" cy="2.5" r="1" fill="currentColor" />
      </svg>
    ),
  },
  {
    id: "PUNTOS_CORTA",
    nombre: "Puntos Corta",
    precio: 80.0,
    badge: "$80",
    hasSubmenu: false,
    categoriaIds: [52],
    categoriaMatch: ["puntos corta"],
    genericItemId: 679,
    icon: (
      <svg className="h-6 w-6 text-amber-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="m19 5-8 8" />
        <circle cx="7" cy="17" r="4" />
        <circle cx="13" cy="9" r="1" fill="currentColor" />
        <circle cx="16" cy="6" r="1" fill="currentColor" />
      </svg>
    ),
  },
  {
    id: "RECTANGULAR_TR5",
    nombre: "Rectangular TR5",
    precio: 80.0,
    badge: "$80",
    hasSubmenu: false,
    categoriaIds: [48],
    categoriaMatch: ["rectangular", "tr5"],
    genericItemId: 680,
    icon: (
      <svg className="h-6 w-6 text-amber-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="10" width="8" height="10" rx="1" />
        <path d="M11 15h10v-3h-4v-2h-3v2h-3" />
      </svg>
    ),
  },
];

// Helper para encontrar un modelo residencial específico en el catálogo de inventario
function findResidentialItem(articulos, searchCode) {
  if (!articulos || articulos.length === 0 || !searchCode) return null;
  const code = searchCode.trim().toLowerCase();
  const codeAlphanum = code.replace(/[^a-z0-9]/g, "");

  // Filtrar candidatos para dar prioridad a llaves residenciales (evitar chapas de $400+)
  const candidates = articulos.filter((it) => {
    const nombre = (it.Nombre || "").toLowerCase();
    if (nombre.includes("barra ") || nombre.includes("chapa ") || nombre.includes("cerrojo")) return false;
    if (Number(it.PrecioVenta) > 250) return false;
    return true;
  });

  const poolToSearch = candidates.length > 0 ? candidates : articulos;

  // 1. Exact match en Nombre (ej: "R52")
  let found = poolToSearch.find(
    (it) => it.Nombre && it.Nombre.trim().toLowerCase() === code
  );
  if (found) return found;

  // 2. Exact Alphanumeric match (ej: "CASA R52" vs "r52")
  found = poolToSearch.find((it) => {
    if (!it.Nombre) return false;
    return it.Nombre.toLowerCase().replace(/[^a-z0-9]/g, "") === codeAlphanum;
  });
  if (found) return found;

  // 3. Match de nombre estándar: empieza con "CASA " o "LLAVE " y tiene la palabra exacta (excluyendo "colores" o "hueca")
  found = poolToSearch.find((it) => {
    if (!it.Nombre) return false;
    const lower = it.Nombre.toLowerCase();
    const words = lower.split(/[\s\-_/.]+/);
    const isPlain = !lower.includes("colores") && !lower.includes("hueca");
    return isPlain && (words.includes(code) || words.includes(codeAlphanum));
  });
  if (found) return found;

  // 4. Word match general
  found = poolToSearch.find((it) => {
    if (!it.Nombre) return false;
    const words = it.Nombre.toLowerCase().split(/[\s\-_/.]+/);
    return words.includes(code) || words.includes(codeAlphanum);
  });
  if (found) return found;

  // 5. Clean Alphanumeric includes (ej: 'Casa puntos TOV 9D' contains 'tov9d')
  found = poolToSearch.find((it) => {
    if (!it.Nombre) return false;
    const clean = it.Nombre.toLowerCase().replace(/[^a-z0-9]/g, "");
    return clean.includes(codeAlphanum);
  });
  if (found) return found;

  // 6. Match en Código de Ubicación
  found = poolToSearch.find((it) => {
    const u = (it.CodigoUbicacion || "").toLowerCase().trim();
    return u === code || u === codeAlphanum;
  });

  return found || null;
}

// Función para renderizar icono vectorial según la subcategoría
function renderCategoriaIcon(nombreCategoria, colorClass = "text-blue-600") {
  const n = (nombreCategoria || "").toLowerCase();

  if (n.includes("batería") || n.includes("pila")) {
    return (
      <svg className={`h-6 w-6 ${colorClass}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="2" y="7" width="16" height="10" rx="2" ry="2" />
        <line x1="22" y1="11" x2="22" y2="13" />
      </svg>
    );
  }
  if (n.includes("chip") || n.includes("transponder")) {
    return (
      <svg className={`h-6 w-6 ${colorClass}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="4" y="4" width="16" height="16" rx="2" />
        <rect x="9" y="9" width="6" height="6" />
        <line x1="9" y1="1" x2="9" y2="4" />
        <line x1="15" y1="1" x2="15" y2="4" />
        <line x1="9" y1="20" x2="9" y2="23" />
        <line x1="15" y1="20" x2="15" y2="23" />
        <line x1="20" y1="9" x2="23" y2="9" />
        <line x1="20" y1="14" x2="23" y2="14" />
        <line x1="1" y1="9" x2="4" y2="9" />
        <line x1="1" y1="14" x2="4" y2="14" />
      </svg>
    );
  }
  if (n.includes("control") || n.includes("mando") || n.includes("remoto")) {
    return (
      <svg className={`h-6 w-6 ${colorClass}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="5" y="2" width="14" height="20" rx="3" />
        <circle cx="12" cy="13" r="3" />
        <line x1="12" y1="6" x2="12.01" y2="6" />
      </svg>
    );
  }
  if (n.includes("moto")) {
    return (
      <svg className={`h-6 w-6 ${colorClass}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="5.5" cy="17.5" r="3.5" />
        <circle cx="18.5" cy="17.5" r="3.5" />
        <path d="M15 6h-3l-3 6.5 4 4.5" />
        <path d="M19 17.5 16 10l-3 1" />
      </svg>
    );
  }
  if (n.includes("presencia") || n.includes("smart")) {
    return (
      <svg className={`h-6 w-6 ${colorClass}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="m12 3-1.9 5.8a2 2 0 0 1-1.3 1.3L3 12l5.8 1.9a2 2 0 0 1 1.3 1.3L12 21l1.9-5.8a2 2 0 0 1 1.3-1.3L21 12l-5.8-1.9a2 2 0 0 1-1.3-1.3Z" />
      </svg>
    );
  }
  if (n.includes("chapa")) {
    return (
      <svg className={`h-6 w-6 ${colorClass}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M18 20V6a2 2 0 0 0-2-2H8a2 2 0 0 0-2 2v14" />
        <path d="M2 20h20" />
        <circle cx="14" cy="12" r="1" />
      </svg>
    );
  }
  if (n.includes("candado")) {
    return (
      <svg className={`h-6 w-6 ${colorClass}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
        <path d="M7 11V7a5 5 0 0 1 10 0v4" />
      </svg>
    );
  }
  if (n.includes("llavero") || n.includes("etiqueta")) {
    return (
      <svg className={`h-6 w-6 ${colorClass}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z" />
        <line x1="7" y1="7" x2="7.01" y2="7" />
      </svg>
    );
  }
  if (n.includes("goma") || n.includes("argolla") || n.includes("anillo")) {
    return (
      <svg className={`h-6 w-6 ${colorClass}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="9" />
        <circle cx="12" cy="12" r="4" />
      </svg>
    );
  }
  if (n.includes("funda") || n.includes("protector") || n.includes("carcasa")) {
    return (
      <svg className={`h-6 w-6 ${colorClass}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
      </svg>
    );
  }
  if (n.includes("refaccion") || n.includes("engrane") || n.includes("resorte")) {
    return (
      <svg className={`h-6 w-6 ${colorClass}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="3" />
        <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
      </svg>
    );
  }
  if (n.includes("servicio") || n.includes("trabajo")) {
    return (
      <svg className={`h-6 w-6 ${colorClass}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" />
      </svg>
    );
  }

  // Por defecto: Llave
  return (
    <svg className={`h-6 w-6 ${colorClass}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="7.5" cy="15.5" r="5.5" />
      <path d="m21 2-9.6 9.6" />
      <path d="m15.5 7.5 3 3L22 7l-3-3" />
    </svg>
  );
}

// Presets de gastos rápidos de caja chica con iconos vectoriales
const QUICK_EXPENSE_PRESETS = [
  {
    concepto: "Garrafón de agua",
    monto: 35,
    icon: (
      <svg className="h-3.5 w-3.5 text-blue-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z" />
      </svg>
    ),
  },
  {
    concepto: "Comida / Desayuno",
    monto: 80,
    icon: (
      <svg className="h-3.5 w-3.5 text-amber-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M18 8h1a4 4 0 0 1 0 8h-1" />
        <path d="M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8z" />
        <line x1="6" y1="1" x2="6" y2="4" />
        <line x1="10" y1="1" x2="10" y2="4" />
        <line x1="14" y1="1" x2="14" y2="4" />
      </svg>
    ),
  },
  {
    concepto: "Insumos taller",
    monto: 150,
    icon: (
      <svg className="h-3.5 w-3.5 text-emerald-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 8 12 3 3 8l9 5 9-5Z" />
        <path d="M3 8v8l9 5 9-5V8" />
        <path d="M12 13v8" />
      </svg>
    ),
  },
  {
    concepto: "Material cerrajería",
    monto: 200,
    icon: (
      <svg className="h-3.5 w-3.5 text-indigo-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" />
      </svg>
    ),
  },
];

// Diccionarios para detección contextual inteligente por Regex
const KNOWN_BRANDS = [
  "Honda", "Nissan", "Ford", "Chevrolet", "Chevy", "Toyota", "Volkswagen", "VW", 
  "Dodge", "Chrysler", "Jeep", "Renault", "Mazda", "Kia", "Hyundai", "BMW", 
  "Mercedes", "Mercedes Benz", "Audi", "Fiat", "Mitsubishi", "Opel", "Volvo", 
  "Lincoln", "Mercury", "Pontiac", "Buick", "GMC", "Yamaha", "Seat", "Suzuki", 
  "Peugeot", "Subaru", "Ram", "General Motors", "GM"
];

const KNOWN_COMPONENTS = [
  "chapa", "switch", "llavin", "llavín", "control", "carcasa", "chip", 
  "cilindro", "perno", "resorte", "bateria", "batería", "pila", "sensor"
];

// Extrae marca y componente de un texto de servicio mediante Regex
function extractVehicleContext(serviceText) {
  if (!serviceText) return { brand: "", component: "", query: "" };
  const text = String(serviceText).toLowerCase();

  let matchedBrand = "";
  for (const brand of KNOWN_BRANDS) {
    const regex = new RegExp(`\\b${brand.toLowerCase()}\\b`, "i");
    if (regex.test(text)) {
      matchedBrand = brand;
      break;
    }
  }

  let matchedComponent = "";
  for (const comp of KNOWN_COMPONENTS) {
    const regex = new RegExp(`\\b${comp}\\b`, "i");
    if (regex.test(text)) {
      matchedComponent = comp;
      break;
    }
  }

  let query = "";
  if (matchedBrand && matchedComponent) {
    query = `${matchedComponent} ${matchedBrand}`;
  } else if (matchedBrand) {
    query = matchedBrand;
  } else if (matchedComponent) {
    query = matchedComponent;
  }

  return { brand: matchedBrand, component: matchedComponent, query };
}

// Lista y diccionario de marcas automotrices para filtrado especializado
const AUTOMOTIVE_BRANDS = [
  { id: "Chevrolet", name: "Chevrolet", match: /(?:chevrolet|chevy|suburban|tahoe|silverado|cavalier|spark|aveo|beat|cruze|onix|captiva|s10|colorado|equinox|trax|malibu|camaro|regata)/i },
  { id: "Volkswagen", name: "Volkswagen", match: /(?:volkswagen|vw|jetta|bora|golf|vento|passat|beetle|tiguan|saveiro|crossfox|pointer|polo|gol\b|amarok|taos)/i },
  { id: "Ford", name: "Ford", match: /(?:ford|ranger|focus|fiesta|figo|escape|explorer|f-?150|f-?250|lobo|mustang|fusion|transit|ecosport|edge|expedition)/i },
  { id: "Nissan", name: "Nissan", match: /(?:nissan|tsuru|versa|sentra|tiida|march|np300|frontier|altima|maxima|kicks|x-?trail|rogue|murano|urvan|platina|aprio)/i },
  { id: "Honda", name: "Honda", match: /(?:honda|civic|accord|cr-?v|hr-?v|city|fit|odyssey|pilot)/i },
  { id: "Toyota", name: "Toyota", match: /(?:toyota|corolla|camry|hilux|rav-?4|yaris|tacoma|sienna|prius|avanza|hiace|tundra|highlander)/i },
  { id: "Kia", name: "Kia", match: /(?:kia|rio|forte|sportage|soul|seltos|sorento|k3|k4)/i },
  { id: "Hyundai", name: "Hyundai", match: /(?:hyundai|grand\s*i10|i10|elantra|tucson|creta|accent|santa\s*fe)/i },
  { id: "Mazda", name: "Mazda", match: /(?:mazda|cx-?3|cx-?30|cx-?5|cx-?9|mazda\s*[2356])/i },
  { id: "Chrysler", name: "Chrysler / Dodge / Jeep", match: /(?:chrysler|dodge|jeep|ram|attitude|charger|challenger|grand\s*cherokee|wrangler|compass|journey|pacifica|town\s*&?\s*country|voyager|durango|dakota|liberty|patriot|renegade)/i },
  { id: "Renault", name: "Renault", match: /(?:renault|duster|clio|logan|sandero|stepway|kwid|kangoo|megane|scenic|trafic|captur|koleos)/i },
  { id: "Peugeot", name: "Peugeot", match: /(?:peugeot|partner|206|207|208|301|307|308|2008|3008)/i },
  { id: "Suzuki", name: "Suzuki", match: /(?:suzuki|swift|vitara|grand\s*vitara|s-?cross|ignis|ertiga|ciaz)/i },
  { id: "Mitsubishi", name: "Mitsubishi", match: /(?:mitsubishi|lancer|mirage|montero|outlander|l200)/i },
  { id: "BMW", name: "BMW", match: /(?:bmw|mini\s*cooper|mini\b)/i },
  { id: "Audi", name: "Audi", match: /(?:audi|a1|a3|a4|a5|a6|q2|q3|q5|q7)/i },
  { id: "Seat", name: "Seat", match: /(?:seat|ibiza|leon|toledo|ateca|arona|cordoba)/i },
  { id: "Fiat", name: "Fiat", match: /(?:fiat|500|mobi|uno|palio|argo|ducato)/i },
  { id: "General Motors", name: "GM / Buick / GMC", match: /(?:general\s*motors|gm\b|buick|gmc|acadia|sierra|yukon|enclave)/i },
  { id: "Mercedes-Benz", name: "Mercedes-Benz", match: /(?:mercedes|mercedes-?benz)/i },
  { id: "Volvo", name: "Volvo", match: /(?:volvo)/i },
  { id: "Italika", name: "Italika", match: /(?:italika|ws150|dm200|ft150|rt200)/i },
  { id: "Yamaha", name: "Yamaha", match: /(?:yamaha|fz|r3|r6|ybr)/i },
  { id: "Bajaj", name: "Bajaj", match: /(?:bajaj|pulsar|discover|boxer|dominar)/i },
  { id: "Vento", name: "Vento Moto", match: /(?:vento\s*moto|vento)/i },
  { id: "KTM", name: "KTM", match: /(?:ktm|duke)/i },
  { id: "Kawasaki", name: "Kawasaki", match: /(?:kawasaki|ninja)/i },
];

function extractAutomotiveMetadata(item) {
  if (!item) return { brand: "Otros", buttons: null, mechanism: null };
  const brandText = `${item.CompatibilidadMarca || ""} ${item.Nombre || ""}`.toLowerCase();

  // 1. Detectar Marca
  let detectedBrand = null;
  for (const b of AUTOMOTIVE_BRANDS) {
    if (b.match.test(brandText)) {
      detectedBrand = b.name;
      break;
    }
  }
  if (!detectedBrand && item.CompatibilidadMarca) {
    const first = item.CompatibilidadMarca.split(/[,/]/)[0].trim();
    if (first && first.length > 2 && first.length < 25) {
      detectedBrand = first;
    }
  }

  // 2. Detectar Botones
  const nameLower = (item.Nombre || "").toLowerCase();
  let detectedButtons = null;
  const btnMatch = nameLower.match(/(\d+)\s*(?:btn|btns|bot|botones|boton)/i);
  if (btnMatch) {
    const n = parseInt(btnMatch[1], 10);
    if (n >= 1 && n <= 7) {
      detectedButtons = n >= 5 ? "5+" : String(n);
    }
  }

  // 3. Detectar Mecanismo
  let detectedMechanism = null;
  if (nameLower.includes("abatible")) {
    detectedMechanism = "Abatible";
  } else if (nameLower.includes("presencia") || nameLower.includes("smart") || nameLower.includes("prescencia")) {
    detectedMechanism = "Presencia";
  } else if (nameLower.includes("inserto")) {
    detectedMechanism = "Inserto";
  } else if (nameLower.includes("hueca")) {
    detectedMechanism = "Hueca";
  } else if (nameLower.includes("control") || nameLower.includes("mando")) {
    detectedMechanism = "Control";
  }

  return {
    brand: detectedBrand || "Otros",
    buttons: detectedButtons,
    mechanism: detectedMechanism,
  };
}

export default function PosPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { lines, totals, addItem, setQty, setPrice, setLineNote, inc, dec, remove, clear } = useCart();

  // Catálogo completo
  const [catalogo, setCatalogo] = useState({ categorias: [], articulos: [] });
  const [isLoadingCatalog, setIsLoadingCatalog] = useState(true);
  const [catalogError, setCatalogError] = useState("");

  // Macro-Pestañas: RESIDENCIAL | AUTOMOTRIZ | ACCESORIOS | SERVICIOS
  const [macroTab, setMacroTab] = useState("RESIDENCIAL");
  // Subcategoría activa: null = muestra cuadros grandes de subcategorías; 'TODOS' o número = muestra productos
  const [subCategoriaId, setSubCategoriaId] = useState(null);
  // Sub-menú de modelos frecuentes residenciales (ej. LLAVE_SENCILLA -> R1, R52, etc.)
  const [activeFastKeySubmenu, setActiveFastKeySubmenu] = useState(null);
  const [addedFeedback, setAddedFeedback] = useState(null);

  // Filtros especializados para la categoría automotriz activa
  const [autoBrandFilter, setAutoBrandFilter] = useState("TODAS");
  const [autoButtonsFilter, setAutoButtonsFilter] = useState("TODOS");
  const [autoMechanismFilter, setAutoMechanismFilter] = useState("TODOS");
  const [autoOnlyInStock, setAutoOnlyInStock] = useState(false);
  const [autoModelSearch, setAutoModelSearch] = useState("");

  // Omnibox de búsqueda unificada
  const [searchQuery, setSearchQuery] = useState("");
  const searchInputRef = useRef(null);

  // Edición inline de precio en el carrito
  const [editingPriceKey, setEditingPriceKey] = useState(null);
  const [editingPriceVal, setEditingPriceVal] = useState("");

  // Formulario de cobro
  const [metodoPago, setMetodoPago] = useState("Efectivo");
  const [montoRecibido, setMontoRecibido] = useState("");
  const [nombreCliente, setNombreCliente] = useState("");
  const [notas, setNotas] = useState("");
  const [requiereFactura, setRequiereFactura] = useState(false);
  const [showExtraDetails, setShowExtraDetails] = useState(false);
  const [isCharging, setIsCharging] = useState(false);
  const [chargeError, setChargeError] = useState("");

  // Modal de Venta Exitosa
  const [successModal, setSuccessModal] = useState(null);

  // Modal de Gasto Rápido
  const [showGastoModal, setShowGastoModal] = useState(false);
  const [gastoMonto, setGastoMonto] = useState("");
  const [gastoConcepto, setGastoConcepto] = useState("");
  const [gastoMetodo, setGastoMetodo] = useState("Efectivo");
  const [isSavingGasto, setIsSavingGasto] = useState(false);
  const [gastoError, setGastoError] = useState("");

  // Modal de Préstamo / Devolución de Cambio
  const [showPrestamoModal, setShowPrestamoModal] = useState(false);
  const [prestamoTipo, setPrestamoTipo] = useState("ENTRADA"); // 'ENTRADA' | 'SALIDA'
  const [prestamoMonto, setPrestamoMonto] = useState("");
  const [prestamoTrabajador, setPrestamoTrabajador] = useState("");
  const [prestamoNota, setPrestamoNota] = useState("");
  const [isSavingPrestamo, setIsSavingPrestamo] = useState(false);
  const [prestamoError, setPrestamoError] = useState("");

  // Modal para vincular refacción / salida de inventario a un servicio
  const [vincularModal, setVincularModal] = useState({
    isOpen: false,
    serviceKey: null,
    serviceName: "",
    serviceNote: "",
    searchQuery: "",
    detectedBrand: "",
    detectedComponent: "",
  });

  // Modal de Vista Previa de Imagen en Grande (Lightbox)
  const [previewImage, setPreviewImage] = useState(null);

  // Cerrar lightbox con tecla Escape
  useEffect(() => {
    if (!previewImage) return;
    const handleKeyDown = (e) => {
      if (e.key === "Escape") setPreviewImage(null);
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [previewImage]);

  // Cargar catálogo completo
  useEffect(() => {
    let mounted = true;
    async function fetchCatalog() {
      setIsLoadingCatalog(true);
      setCatalogError("");
      try {
        const res = await itemsService.getPosCatalogo({
          incluyeItems: true,
          incluyeServicios: true,
          soloConStock: false,
          limit: 1500,
        });
        if (!mounted) return;
        setCatalogo({
          categorias: Array.isArray(res?.categorias) ? res.categorias : [],
          articulos: Array.isArray(res?.articulos) ? res.articulos : [],
        });
      } catch (err) {
        if (!mounted) return;
        setCatalogError(err?.message || "Error al cargar catálogo POS.");
      } finally {
        if (mounted) setIsLoadingCatalog(false);
      }
    }
    fetchCatalog();
    return () => {
      mounted = false;
    };
  }, []);

  // Autofocus en búsqueda
  useEffect(() => {
    searchInputRef.current?.focus();
  }, []);

  // Restablecer filtros automotrices
  const resetAutoFilters = () => {
    setAutoBrandFilter("TODAS");
    setAutoButtonsFilter("TODOS");
    setAutoMechanismFilter("TODOS");
    setAutoOnlyInStock(false);
    setAutoModelSearch("");
  };

  // Cambiar de Macro-Pestaña
  const handleMacroTabChange = (tab) => {
    setMacroTab(tab);
    setSubCategoriaId(null);
    setActiveFastKeySubmenu(null);
    setSearchQuery("");
    resetAutoFilters();
    searchInputRef.current?.focus();
  };

  // Seleccionar Subcategoría
  const handleSelectSubcategoria = (catId) => {
    setSubCategoriaId(catId);
    resetAutoFilters();
  };

  // Categorías agrupadas por Macro-Pestaña
  const categoriasPorMacro = useMemo(() => {
    const all = catalogo.categorias || [];
    return {
      RESIDENCIAL: all.filter(
        (c) => c.Clasificacion === "Residencial" && c.NombreCategoria !== "Libre"
      ),
      AUTOMOTRIZ: all.filter((c) => c.Clasificacion === "Automotriz"),
      ACCESORIOS: all.filter((c) => c.Clasificacion === "Accesorios"),
      SERVICIOS: all.filter(
        (c) => c.Clasificacion === "Servicio" || c.NombreCategoria === "Servicios"
      ),
    };
  }, [catalogo.categorias]);

  // Todos los artículos pertenecientes a la macro-pestaña activa
  const articulosEnMacroActiva = useMemo(() => {
    const allItems = catalogo.articulos || [];
    if (macroTab === "RESIDENCIAL") {
      return allItems.filter(
        (it) => it.ClasificacionCategoria === "Residencial" && it.NombreCategoria !== "Libre"
      );
    }
    if (macroTab === "AUTOMOTRIZ") {
      return allItems.filter((it) => it.ClasificacionCategoria === "Automotriz");
    }
    if (macroTab === "ACCESORIOS") {
      return allItems.filter((it) => it.ClasificacionCategoria === "Accesorios");
    }
    if (macroTab === "SERVICIOS") {
      return allItems.filter(
        (it) =>
          it.ClasificacionCategoria === "Servicio" ||
          it.NombreCategoria === "Servicios" ||
          it.EsServicio === true
      );
    }
    return allItems;
  }, [catalogo.articulos, macroTab]);

  // Artículos de la subcategoría automotriz activa
  const articulosSubcategoriaAutomotriz = useMemo(() => {
    if (macroTab !== "AUTOMOTRIZ" || subCategoriaId === null || subCategoriaId === "TODOS") {
      return [];
    }
    return articulosEnMacroActiva.filter(
      (it) => String(it.IdCategoria) === String(subCategoriaId)
    );
  }, [macroTab, subCategoriaId, articulosEnMacroActiva]);

  // Opciones dinámicas para los filtros automotrices
  const autoFilterOptions = useMemo(() => {
    if (articulosSubcategoriaAutomotriz.length === 0) {
      return { brands: [], hasButtons: false, buttonsList: [], mechanismsList: [] };
    }

    const brandCounts = {};
    const buttonSet = new Set();
    const mechSet = new Set();

    for (const item of articulosSubcategoriaAutomotriz) {
      const meta = extractAutomotiveMetadata(item);
      brandCounts[meta.brand] = (brandCounts[meta.brand] || 0) + 1;
      if (meta.buttons) buttonSet.add(meta.buttons);
      if (meta.mechanism) mechSet.add(meta.mechanism);
    }

    const sortedBrands = Object.entries(brandCounts)
      .sort((a, b) => {
        if (a[0] === "Otros") return 1;
        if (b[0] === "Otros") return -1;
        return b[1] - a[1];
      })
      .map(([name, count]) => ({ name, count }));

    const buttonsList = ["2", "3", "4", "5+"].filter((b) => buttonSet.has(b));
    const mechanismsList = ["Abatible", "Presencia", "Control", "Inserto", "Hueca"].filter((m) => mechSet.has(m));

    return {
      brands: sortedBrands,
      hasButtons: buttonsList.length > 0,
      buttonsList,
      mechanismsList,
    };
  }, [articulosSubcategoriaAutomotriz]);

  // Artículos filtrados para la vista de productos
  const articulosParaMostrar = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();

    // 1. Búsqueda activa por Omnibox
    if (q) {
      const allItems = catalogo.articulos || [];
      return allItems.filter((it) => {
        const nombre = String(it.Nombre || "").toLowerCase();
        const codigo = String(it.CodigoUbicacion || "").toLowerCase();
        const marca = String(it.CompatibilidadMarca || "").toLowerCase();
        const cat = String(it.NombreCategoria || "").toLowerCase();
        const id = String(it.IdItem || "");

        return (
          codigo === q ||
          codigo.includes(q) ||
          nombre.includes(q) ||
          marca.includes(q) ||
          cat.includes(q) ||
          id === q
        );
      });
    }

    // 2. Si hay subcategoría seleccionada
    if (subCategoriaId === "TODOS") {
      return articulosEnMacroActiva;
    }

    if (subCategoriaId !== null) {
      let items = articulosEnMacroActiva.filter(
        (it) => String(it.IdCategoria) === String(subCategoriaId)
      );

      // Si estamos en AUTOMOTRIZ, aplicar filtros especializados
      if (macroTab === "AUTOMOTRIZ") {
        if (autoBrandFilter !== "TODAS") {
          items = items.filter((it) => {
            const meta = extractAutomotiveMetadata(it);
            return meta.brand === autoBrandFilter;
          });
        }

        if (autoButtonsFilter !== "TODOS") {
          items = items.filter((it) => {
            const meta = extractAutomotiveMetadata(it);
            return meta.buttons === autoButtonsFilter;
          });
        }

        if (autoMechanismFilter !== "TODOS") {
          items = items.filter((it) => {
            const meta = extractAutomotiveMetadata(it);
            return meta.mechanism === autoMechanismFilter;
          });
        }

        if (autoOnlyInStock) {
          items = items.filter((it) => Number(it.StockActual || 0) > 0);
        }

        if (autoModelSearch.trim()) {
          const qModel = autoModelSearch.trim().toLowerCase();
          items = items.filter((it) => {
            const n = String(it.Nombre || "").toLowerCase();
            const m = String(it.CompatibilidadMarca || "").toLowerCase();
            const c = String(it.CodigoUbicacion || "").toLowerCase();
            return n.includes(qModel) || m.includes(qModel) || c.includes(qModel);
          });
        }
      }

      return items;
    }

    // 3. Si no hay subcategoría seleccionada, no mostramos productos individuales
    // (mostramos los cuadros grandes de subcategorías)
    return [];
  }, [
    catalogo.articulos,
    articulosEnMacroActiva,
    subCategoriaId,
    searchQuery,
    macroTab,
    autoBrandFilter,
    autoButtonsFilter,
    autoMechanismFilter,
    autoOnlyInStock,
    autoModelSearch,
  ]);

  // Nombre de la subcategoría activa para el encabezado
  const subCategoriaActivaNombre = useMemo(() => {
    if (subCategoriaId === "TODOS") return "Todos los Productos";
    if (!subCategoriaId) return "";
    const cat = catalogo.categorias.find((c) => String(c.IdCategoria) === String(subCategoriaId));
    return cat ? cat.NombreCategoria : "Productos";
  }, [subCategoriaId, catalogo.categorias]);

  // Configuración del botón rápido activo en el sub-menú
  const activeKeyConfig = useMemo(() => {
    if (!activeFastKeySubmenu) return null;
    return RESIDENCIAL_FAST_KEYS.find((k) => k.id === activeFastKeySubmenu) || null;
  }, [activeFastKeySubmenu]);

  // Modelos calculados para el sub-menú activo de la categoría residencial seleccionada:
  // Filtra dinámicamente únicamente los artículos activos con AlertaStock activo
  const modelsForActiveSubmenu = useMemo(() => {
    if (!activeKeyConfig) return [];
    const allArticulos = catalogo.articulos || [];

    const catIds = activeKeyConfig.categoriaIds || [];
    const catMatches = activeKeyConfig.categoriaMatch || [];

    const itemsDeCategoria = allArticulos.filter((it) => {
      // Excluir inactivos y items sin control de stock
      if (it.Activo === false) return false;
      if (!it.AlertaStock) return false;

      // 1. Match por IdCategoria
      if (catIds.includes(Number(it.IdCategoria))) return true;

      // 2. Match por nombre de categoría
      const catName = String(it.NombreCategoria || "").toLowerCase();
      if (catMatches.some((m) => catName.includes(m))) return true;

      // 3. Match especial por nombre del item (ej: "tetra" para Llave Tetra)
      if (activeKeyConfig.id === "LLAVE_TETRA" && String(it.Nombre || "").toLowerCase().includes("tetra")) {
        return true;
      }

      return false;
    });

    // Ordenar alfabéticamente por código visual corto
    itemsDeCategoria.sort((a, b) => {
      const codeA = getShortResidentialCode(a.Nombre);
      const codeB = getShortResidentialCode(b.Nombre);
      return codeA.localeCompare(codeB, "es", { numeric: true, sensitivity: "base" });
    });

    return itemsDeCategoria.map((item) => ({
      code: getShortResidentialCode(item.Nombre),
      item: item,
      stock: item.StockActual != null ? Number(item.StockActual) : null,
      ubicacion: item.CodigoUbicacion || null,
      precio: Number(item.PrecioVenta) || activeKeyConfig.precio,
    }));
  }, [activeKeyConfig, catalogo.articulos]);

  // Manejo de Venta Rápida Residencial / Apertura de Sub-menú
  const handleFastKeyClick = (keyBtn) => {
    if (keyBtn.hasSubmenu) {
      setActiveFastKeySubmenu((prev) => (prev === keyBtn.id ? null : keyBtn.id));
    } else {
      // Directo sin submenú (Puntos Corta o Rectangular TR5)
      setActiveFastKeySubmenu(null);
      const allArticulos = catalogo.articulos || [];
      let targetItem = null;

      if (keyBtn.id === "RECTANGULAR_TR5") {
        targetItem = findResidentialItem(allArticulos, "TR5");
      } else if (keyBtn.id === "PUNTOS_CORTA") {
        targetItem = findResidentialItem(allArticulos, "Puntos Corta");
      }

      if (targetItem) {
        addItem(targetItem, 1);
        setAddedFeedback({ name: targetItem.Nombre, code: keyBtn.nombre });
      } else {
        addItem(
          {
            IdItem: keyBtn.id,
            Nombre: keyBtn.nombre,
            PrecioVenta: keyBtn.precio,
            EsServicio: false,
            AlertaStock: false,
          },
          1
        );
        setAddedFeedback({ name: keyBtn.nombre, code: keyBtn.nombre });
      }
      setTimeout(() => setAddedFeedback(null), 1800);
    }
  };

  // Seleccionar modelo específico del sub-menú para descontar stock real
  const handleSelectSubmenuModel = (matchedItem, modelCode, defaultPrice, categoryName) => {
    if (matchedItem) {
      addItem(matchedItem, 1);
      setAddedFeedback({ name: matchedItem.Nombre, code: modelCode });
    } else {
      addItem(
        {
          IdItem: `QUICK_${modelCode}`,
          Nombre: `${categoryName} (${modelCode})`,
          PrecioVenta: defaultPrice,
          EsServicio: false,
          AlertaStock: false,
        },
        1
      );
      setAddedFeedback({ name: `${categoryName} (${modelCode})`, code: modelCode });
    }
    setTimeout(() => setAddedFeedback(null), 1800);
  };

  // Retrocompatibilidad
  const handleAddQuickResidential = handleFastKeyClick;

  // Manejo de Servicio General rápido
  const handleAddQuickService = () => {
    const servItem = catalogo.articulos.find((it) => it.IdItem === 681) || {
      IdItem: 681,
      Nombre: "Servicio General",
      PrecioVenta: 0.0,
      EsServicio: true,
      AlertaStock: false,
    };
    const serviceKey = `SERVICE:${Date.now()}`;
    addItem(servItem, 1, serviceKey);
    setEditingPriceKey(serviceKey);
    setEditingPriceVal("");
  };

  // Confirmar cambio de precio inline
  const handleSaveInlinePrice = (key) => {
    const n = Number(editingPriceVal);
    if (Number.isFinite(n) && n >= 0) {
      setPrice(key, n);
    }
    setEditingPriceKey(null);
    setEditingPriceVal("");
  };

  // Abrir modal de vincular refacción a una línea de servicio
  const handleOpenVincularRefaccion = (serviceLine) => {
    const combinedText = `${serviceLine.nombre || ""} ${serviceLine.nota || ""}`;
    const detected = extractVehicleContext(combinedText);

    setVincularModal({
      isOpen: true,
      serviceKey: serviceLine.key,
      serviceName: serviceLine.nombre,
      serviceNote: serviceLine.nota || "",
      searchQuery: detected.query || "",
      detectedBrand: detected.brand,
      detectedComponent: detected.component,
    });
  };

  // Seleccionar refacción del modal para vincularla al servicio con precio $0 y salida de stock
  const handleSelectRefaccionToLink = (partItem) => {
    if (!vincularModal.serviceKey) return;
    const parentKey = vincularModal.serviceKey;
    const parentName = vincularModal.serviceName;
    const parentNote = vincularModal.serviceNote;
    const customKey = `REFACCION:${parentKey}:${partItem.IdItem}`;

    addItem(
      {
        ...partItem,
        PrecioVenta: 0.0,
        nota: `Refacción en: ${parentName}${parentNote ? ` (${parentNote})` : ""}`,
        refaccionDeKey: parentKey,
      },
      1,
      customKey
    );

    setAddedFeedback({ name: partItem.Nombre, code: "Refacción Vinculada" });
    setVincularModal({
      isOpen: false,
      serviceKey: null,
      serviceName: "",
      serviceNote: "",
      searchQuery: "",
      detectedBrand: "",
      detectedComponent: "",
    });
    setTimeout(() => setAddedFeedback(null), 1800);
  };

  // Remover línea del carrito y cualquier refacción vinculada a ella
  const handleRemoveLine = (key) => {
    remove(key);
    // Eliminar también cualquier refacción vinculada a este servicio
    const linked = lines.filter((l) => l.refaccionDeKey === key);
    linked.forEach((l) => remove(l.key));
  };

  // Artículos físicos filtrados para el modal de vincular refacción
  const articulosParaVincular = useMemo(() => {
    if (!vincularModal.isOpen) return [];
    const q = vincularModal.searchQuery.trim().toLowerCase();
    const allItems = catalogo.articulos || [];

    // Solo artículos físicos (no servicios)
    const soloFisicos = allItems.filter(
      (it) => !it.EsServicio && it.ClasificacionCategoria !== "Servicio" && it.NombreCategoria !== "Servicios"
    );

    if (!q) {
      return soloFisicos.slice(0, 40);
    }

    // Dividir términos de búsqueda (ej. "chapa honda" busca items que contengan "chapa" Y "honda")
    const terms = q.split(/\s+/).filter(Boolean);

    return soloFisicos.filter((it) => {
      const nombre = (it.Nombre || "").toLowerCase();
      const codigo = (it.CodigoUbicacion || "").toLowerCase();
      const marca = (it.CompatibilidadMarca || "").toLowerCase();
      const cat = (it.NombreCategoria || "").toLowerCase();
      const combo = `${nombre} ${codigo} ${marca} ${cat}`;

      return terms.every((t) => combo.includes(t));
    });
  }, [vincularModal.isOpen, vincularModal.searchQuery, catalogo.articulos]);

  // Billetes sugeridos para pago en efectivo
  const totalPagar = totals.total;
  const suggestedBills = useMemo(() => {
    if (totalPagar <= 0) return [];
    const bills = [50, 100, 200, 500, 1000];
    const higherBills = bills.filter((b) => b >= totalPagar);
    return higherBills.slice(0, 3);
  }, [totalPagar]);

  // Cálculo del cambio
  const cambio = useMemo(() => {
    if (metodoPago !== "Efectivo") return 0;
    const recibido = Number(montoRecibido);
    if (!Number.isFinite(recibido) || recibido < totalPagar) return 0;
    return round2(recibido - totalPagar);
  }, [metodoPago, montoRecibido, totalPagar]);

  // Ejecutar Cobro
  const handleCobrar = async () => {
    setChargeError("");

    if (!user?.IdUsuario) {
      setChargeError("No hay sesión activa de usuario.");
      return;
    }
    if (lines.length === 0) {
      setChargeError("El carrito está vacío.");
      return;
    }
    if (totalPagar <= 0) {
      setChargeError("El total de la venta debe ser mayor a $0.");
      return;
    }

    setIsCharging(true);
    try {
      const carritoPayload = lines.map((l) => ({
        tipo: l.tipo,
        id: l.id,
        cantidad: l.cantidad,
        precio: l.precio,
        nota: l.nota || "",
      }));

      const resVenta = await ventasService.crearVenta({
        datosVenta: {
          idUsuario: user.IdUsuario,
          metodoPago,
          nombreCliente: nombreCliente.trim() || "Mostrador",
          notas: notas.trim() || "",
          total: totalPagar,
          requiereFactura: Boolean(requiereFactura),
        },
        carrito: carritoPayload,
      });

      const idVenta =
        typeof resVenta === "object" && resVenta !== null
          ? resVenta.idVenta ?? resVenta.IdVenta ?? resVenta.id ?? ""
          : resVenta;

      clear();
      setNombreCliente("");
      setNotas("");
      setRequiereFactura(false);
      setMontoRecibido("");

      setSuccessModal({
        idVenta,
        total: totalPagar,
        cambio: cambio > 0 ? cambio : 0,
        metodoPago,
      });
    } catch (err) {
      setChargeError(err?.message || "Error al procesar la venta.");
    } finally {
      setIsCharging(false);
    }
  };

  // Guardar Gasto Rápido
  const handleSaveGasto = async (e) => {
    e?.preventDefault?.();
    setGastoError("");

    const monto = Number(gastoMonto);
    if (!Number.isFinite(monto) || monto <= 0) {
      setGastoError("Ingresa un monto válido mayor a 0.");
      return;
    }
    if (!gastoConcepto.trim()) {
      setGastoError("Ingresa el concepto del gasto.");
      return;
    }

    setIsSavingGasto(true);
    try {
      await cajaService.registrarGasto({
        Monto: round2(monto),
        Concepto: gastoConcepto.trim(),
        IdUsuario: user.IdUsuario,
        MetodoPago: gastoMetodo,
      });

      setShowGastoModal(false);
      setGastoMonto("");
      setGastoConcepto("");
      setGastoMetodo("Efectivo");
    } catch (err) {
      setGastoError(err?.message || "Error al registrar el gasto.");
    } finally {
      setIsSavingGasto(false);
    }
  };

  const handleGuardarPrestamo = async (e) => {
    e.preventDefault();
    setPrestamoError("");

    const montoNum = parseFloat(prestamoMonto);
    if (!Number.isFinite(montoNum) || montoNum <= 0) {
      setPrestamoError("Por favor ingresa un monto válido mayor a 0.");
      return;
    }

    if (!prestamoTrabajador.trim()) {
      setPrestamoError("Por favor indica quién prestó o a quién se devuelve el cambio.");
      return;
    }

    setIsSavingPrestamo(true);
    try {
      await cajaService.registrarPrestamoCambio({
        Monto: montoNum,
        Tipo: prestamoTipo,
        Trabajador: prestamoTrabajador.trim(),
        Nota: prestamoNota.trim(),
        IdUsuario: user?.IdUsuario ?? 1,
      });

      setShowPrestamoModal(false);
      setPrestamoMonto("");
      setPrestamoNota("");
      setAddedFeedback({
        name: prestamoTipo === "ENTRADA" ? `Préstamo cambio (+$${montoNum})` : `Devolución cambio (-$${montoNum})`,
        code: prestamoTrabajador.trim(),
      });
      setTimeout(() => setAddedFeedback(null), 2500);
    } catch (err) {
      setPrestamoError(err?.message || "Error al registrar el movimiento.");
    } finally {
      setIsSavingPrestamo(false);
    }
  };

  return (
    <div className="posFastContainer flex flex-col gap-3 pb-8 w-full max-w-full overflow-x-hidden">
      {/* 1. BARRA SUPERIOR: BRANDING, VENDEDOR Y ACCIONES RÁPIDAS */}
      <header className="flex flex-wrap items-center justify-between gap-4 rounded-3xl border border-slate-200/90 bg-white px-6 py-4 shadow-xs">
        <div className="flex items-center gap-3.5">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 border border-blue-100/80 text-blue-700 shadow-2xs">
            <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z" />
              <path d="M3 6h18" />
              <path d="M16 10a4 4 0 0 1-8 0" />
            </svg>
          </div>
          <div>
            <h1 className="text-lg font-bold text-slate-900 leading-tight tracking-tight">
              Punto de Venta
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Vendedor:{" "}
              <strong className="font-semibold text-slate-700">
                {user?.NombreCompleto || user?.Username || "Turno Actual"}
              </strong>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Botón Préstamo / Cambio */}
          <button
            type="button"
            onClick={() => {
              setPrestamoTipo("ENTRADA");
              setPrestamoMonto("");
              setPrestamoTrabajador(user?.NombreCompleto || user?.Username || "");
              setPrestamoNota("");
              setPrestamoError("");
              setShowPrestamoModal(true);
            }}
            className="flex items-center gap-2 rounded-2xl border border-indigo-200 bg-indigo-50/80 px-4 py-2.5 text-sm font-bold text-indigo-700 transition-all hover:bg-indigo-100 hover:border-indigo-300 hover:shadow-xs active:scale-95 cursor-pointer"
          >
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="8" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
              <path d="M16 8h-6a2 2 0 1 0 0 4h4a2 2 0 1 1 0 4H8" />
            </svg>
            <span>Préstamo / Cambio</span>
          </button>

          {/* Botón Gasto Rápido */}
          <button
            type="button"
            onClick={() => setShowGastoModal(true)}
            className="flex items-center gap-2 rounded-2xl border border-rose-200 bg-rose-50/80 px-5 py-2.5 text-sm font-bold text-rose-700 transition-all hover:bg-rose-100 hover:border-rose-300 hover:shadow-xs active:scale-95 cursor-pointer"
          >
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <line x1="8" y1="12" x2="16" y2="12" />
            </svg>
            <span>+ Gasto Rápido</span>
          </button>

          {/* Botón Ver Caja */}
          <button
            type="button"
            onClick={() => navigate("/caja")}
            className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50/80 px-5 py-2.5 text-sm font-bold text-slate-700 transition-all hover:bg-slate-100 hover:border-slate-300 hover:shadow-xs active:scale-95 cursor-pointer"
          >
            <svg className="h-4 w-4 text-slate-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="2" y="6" width="20" height="12" rx="2" />
              <circle cx="12" cy="12" r="2" />
              <path d="M6 12h.01M18 12h.01" />
            </svg>
            <span>Caja del Día</span>
          </button>
        </div>
      </header>

      {/* 2. ÁREA PRINCIPAL: DIVIDIDA EN CATÁLOGO TÁCTIL (IZQUIERDA) Y TICKET/COBRO (DERECHA) */}
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1.55fr_1fr] w-full min-w-0 max-w-full">
        {/* ===================== COLUMNA IZQUIERDA: CATÁLOGO TÁCTIL ===================== */}
        <section className="flex flex-col min-w-0 max-w-full gap-3 rounded-3xl border border-slate-200/90 bg-white p-4 shadow-xs">
          {/* A. MACRO-PESTAÑAS PRINCIPALES (TOUCH TABS) */}
          <nav className="grid grid-cols-2 gap-2 sm:grid-cols-4" aria-label="Macro Categorías">
            <button
              type="button"
              onClick={() => handleMacroTabChange("RESIDENCIAL")}
              className={`flex items-center justify-center gap-2 rounded-2xl border px-3 py-3.5 text-xs font-bold uppercase tracking-wider transition-all active:scale-95 cursor-pointer ${
                macroTab === "RESIDENCIAL"
                  ? "border-amber-400 bg-gradient-to-r from-amber-500 to-amber-600 text-white shadow-md shadow-amber-500/20"
                  : "border-slate-200 bg-slate-50 text-slate-700 hover:border-slate-300 hover:bg-slate-100"
              }`}
            >
              <svg className="h-4 w-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                <polyline points="9 22 9 12 15 12 15 22" />
              </svg>
              <span>Residencial</span>
            </button>

            <button
              type="button"
              onClick={() => handleMacroTabChange("AUTOMOTRIZ")}
              className={`flex items-center justify-center gap-2 rounded-2xl border px-3 py-3.5 text-xs font-bold uppercase tracking-wider transition-all active:scale-95 cursor-pointer ${
                macroTab === "AUTOMOTRIZ"
                  ? "border-blue-500 bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md shadow-blue-500/20"
                  : "border-slate-200 bg-slate-50 text-slate-700 hover:border-slate-300 hover:bg-slate-100"
              }`}
            >
              <svg className="h-4 w-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H5c-.6 0-1.1.4-1.4.9l-1.5 2.8C2.1 10.7 2 11.3 2 12v4c0 .6.4 1 1 1h2" />
                <circle cx="7" cy="17" r="2" />
                <circle cx="17" cy="17" r="2" />
                <path d="M5 17H3v-4h18v4h-2" />
              </svg>
              <span>Automotriz</span>
            </button>

            <button
              type="button"
              onClick={() => handleMacroTabChange("ACCESORIOS")}
              className={`flex items-center justify-center gap-2 rounded-2xl border px-3 py-3.5 text-xs font-bold uppercase tracking-wider transition-all active:scale-95 cursor-pointer ${
                macroTab === "ACCESORIOS"
                  ? "border-teal-400 bg-gradient-to-r from-teal-500 to-emerald-600 text-white shadow-md shadow-teal-500/20"
                  : "border-slate-200 bg-slate-50 text-slate-700 hover:border-slate-300 hover:bg-slate-100"
              }`}
            >
              <svg className="h-4 w-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="7.5" cy="15.5" r="5.5" />
                <path d="m21 2-9.6 9.6" />
                <path d="m15.5 7.5 3 3L22 7l-3-3" />
              </svg>
              <span>Accesorios</span>
            </button>

            <button
              type="button"
              onClick={() => handleMacroTabChange("SERVICIOS")}
              className={`flex items-center justify-center gap-2 rounded-2xl border px-3 py-3.5 text-xs font-bold uppercase tracking-wider transition-all active:scale-95 cursor-pointer ${
                macroTab === "SERVICIOS"
                  ? "border-purple-400 bg-gradient-to-r from-purple-600 to-violet-600 text-white shadow-md shadow-purple-500/20"
                  : "border-slate-200 bg-slate-50 text-slate-700 hover:border-slate-300 hover:bg-slate-100"
              }`}
            >
              <svg className="h-4 w-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" />
              </svg>
              <span>Servicios</span>
            </button>
          </nav>

          {/* B. OMNIBOX DE BÚSQUEDA UNIFICADA (AUTOFOCUS) */}
          <div className="relative">
            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-400">
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2.5"
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>
            </div>
            <input
              ref={searchInputRef}
              type="text"
              className="w-full rounded-2xl border border-slate-300/90 bg-slate-50/70 py-3 pr-10 !pl-11 text-sm font-semibold text-slate-800 placeholder-slate-400 shadow-xs transition-all focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-100 focus:outline-none"
              placeholder="Buscar producto, coordenada física (ej. DD8), marca o ID..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                if (e.target.value) setActiveFastKeySubmenu(null);
              }}
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => {
                  setSearchQuery("");
                  searchInputRef.current?.focus();
                }}
                className="absolute inset-y-0 right-0 flex items-center pr-3 text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            )}
          </div>

          {/* C. CONTENIDO: ¿BÚSQUEDA, SUBCATEGORÍAS EN CUADROS GRANDES, O PRODUCTOS? */}
          {isLoadingCatalog ? (
            <div className="flex h-64 flex-col items-center justify-center gap-2 text-slate-400">
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
              <span className="text-xs font-semibold">Cargando catálogo táctil...</span>
            </div>
          ) : catalogError ? (
            <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-center text-sm font-semibold text-rose-700">
              {catalogError}
            </div>
          ) : searchQuery ? (
            /* CASO 1: BÚSQUEDA ACTIVA EN OMNIBOX -> MUESTRA PRODUCTOS ENCONTRADOS DIRECTAMENTE */
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between px-1 text-xs font-bold text-slate-500">
                <span>Resultados de búsqueda ({articulosParaMostrar.length}):</span>
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="text-blue-600 hover:underline cursor-pointer"
                >
                  Limpiar búsqueda
                </button>
              </div>

              {articulosParaMostrar.length === 0 ? (
                <div className="flex h-48 flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 text-center text-slate-400">
                  <svg className="h-10 w-10 text-slate-300" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="11" cy="11" r="8" />
                    <path d="m21 21-4.3-4.3" />
                  </svg>
                  <p className="mt-2 text-xs font-semibold">No se encontraron productos con "{searchQuery}".</p>
                </div>
              ) : (
                <div className="grid max-h-[580px] grid-cols-2 gap-2.5 overflow-y-auto pr-1 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-4 2xl:grid-cols-5">
                  {articulosParaMostrar.map((item) => renderItemCard(item, addItem, setPreviewImage))}
                </div>
              )}
            </div>
          ) : subCategoriaId !== null ? (
            /* CASO 2: SELECCIONÓ UNA SUBCATEGORÍA -> MUESTRA PRODUCTOS DE ESA SUBCATEGORÍA */
            <div className="flex flex-col min-w-0 max-w-full gap-2.5">
              {/* Barra de navegación superior con botón para regresar a los cuadros grandes */}
              <div className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2">
                <button
                  type="button"
                  onClick={() => {
                    setSubCategoriaId(null);
                    resetAutoFilters();
                  }}
                  className="flex items-center gap-1.5 rounded-xl border border-slate-300 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 shadow-xs hover:bg-slate-100 active:scale-95 cursor-pointer"
                >
                  <svg className="h-3.5 w-3.5 text-slate-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="m15 18-6-6 6-6" />
                  </svg>
                  <span>Ver todas las categorías</span>
                </button>
                <div className="text-xs font-bold text-slate-700">
                  {subCategoriaActivaNombre} ({articulosParaMostrar.length})
                </div>
              </div>

              {/* FILTROS ESPECIALIZADOS DE AUTOMOTRIZ (POR MARCA, BOTONES, MECANISMO, STOCK Y MODELO) */}
              {macroTab === "AUTOMOTRIZ" && (
                <div className="flex flex-col min-w-0 max-w-full gap-2.5 rounded-2xl border border-blue-200/80 bg-gradient-to-b from-blue-50/70 via-white to-slate-50/60 p-3 shadow-2xs">
                  {/* 1. Selector de Marca: Carrusel Táctil Horizontal */}
                  <div className="flex flex-col min-w-0 max-w-full gap-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-black uppercase tracking-wider text-slate-500">
                        Filtrar por Marca:
                      </span>
                      {autoBrandFilter !== "TODAS" && (
                        <span className="text-[11px] font-bold text-blue-700">
                          Filtrando: <strong className="underline">{autoBrandFilter}</strong>
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-1.5 overflow-x-auto min-w-0 max-w-full pb-1 scrollbar-thin">
                      <button
                        type="button"
                        onClick={() => setAutoBrandFilter("TODAS")}
                        className={`shrink-0 rounded-xl px-3 py-1.5 text-xs transition-all cursor-pointer ${
                          autoBrandFilter === "TODAS"
                            ? "bg-blue-600 text-white shadow-xs font-black"
                            : "bg-white border border-slate-200 text-slate-700 hover:bg-slate-100 font-bold"
                        }`}
                      >
                        Todas ({articulosSubcategoriaAutomotriz.length})
                      </button>
                      {autoFilterOptions.brands.map((b) => {
                        const isSelected = autoBrandFilter === b.name;
                        return (
                          <button
                            key={b.name}
                            type="button"
                            onClick={() => setAutoBrandFilter(isSelected ? "TODAS" : b.name)}
                            className={`shrink-0 rounded-xl px-3 py-1.5 text-xs transition-all cursor-pointer ${
                              isSelected
                                ? "bg-blue-600 text-white shadow-xs font-black"
                                : "bg-white border border-slate-200 text-slate-700 hover:bg-slate-100 font-bold"
                            }`}
                          >
                            {b.name}{" "}
                            <span
                              className={`ml-0.5 text-[10px] ${
                                isSelected ? "text-blue-100 font-normal" : "text-slate-400 font-normal"
                              }`}
                            >
                              ({b.count})
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* 2. Sub-filtros Complementarios: Botones, Mecanismo, Stock y Buscador */}
                  <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-200/80 pt-2.5 min-w-0 max-w-full">
                    <div className="flex flex-wrap items-center gap-2">
                      {/* Filtro por Botones */}
                      {autoFilterOptions.hasButtons && (
                        <div className="flex items-center gap-1">
                          <span className="text-[11px] font-bold text-slate-500">Botones:</span>
                          <div className="flex items-center rounded-xl bg-slate-200/70 p-0.5 text-xs">
                            <button
                              type="button"
                              onClick={() => setAutoButtonsFilter("TODOS")}
                              className={`rounded-lg px-2 py-1 text-[11px] font-bold cursor-pointer transition-all ${
                                autoButtonsFilter === "TODOS"
                                  ? "bg-white text-slate-900 shadow-2xs font-extrabold"
                                  : "text-slate-600 hover:text-slate-900"
                              }`}
                            >
                              Todos
                            </button>
                            {autoFilterOptions.buttonsList.map((btn) => (
                              <button
                                key={btn}
                                type="button"
                                onClick={() =>
                                  setAutoButtonsFilter(autoButtonsFilter === btn ? "TODOS" : btn)
                                }
                                className={`rounded-lg px-2 py-1 text-[11px] font-bold cursor-pointer transition-all ${
                                  autoButtonsFilter === btn
                                    ? "bg-blue-600 text-white shadow-2xs font-extrabold"
                                    : "text-slate-600 hover:text-slate-900"
                                }`}
                              >
                                {btn} BTN
                              </button>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Filtro por Mecanismo */}
                      {autoFilterOptions.mechanismsList.length > 1 && (
                        <div className="flex items-center gap-1">
                          <span className="text-[11px] font-bold text-slate-500">Tipo:</span>
                          <div className="flex items-center rounded-xl bg-slate-200/70 p-0.5 text-xs">
                            <button
                              type="button"
                              onClick={() => setAutoMechanismFilter("TODOS")}
                              className={`rounded-lg px-2 py-1 text-[11px] font-bold cursor-pointer transition-all ${
                                autoMechanismFilter === "TODOS"
                                  ? "bg-white text-slate-900 shadow-2xs font-extrabold"
                                  : "text-slate-600 hover:text-slate-900"
                              }`}
                            >
                              Todos
                            </button>
                            {autoFilterOptions.mechanismsList.map((mech) => (
                              <button
                                key={mech}
                                type="button"
                                onClick={() =>
                                  setAutoMechanismFilter(autoMechanismFilter === mech ? "TODOS" : mech)
                                }
                                className={`rounded-lg px-2 py-1 text-[11px] font-bold cursor-pointer transition-all ${
                                  autoMechanismFilter === mech
                                    ? "bg-blue-600 text-white shadow-2xs font-extrabold"
                                    : "text-slate-600 hover:text-slate-900"
                                }`}
                              >
                                {mech}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Toggle Solo en Stock */}
                      <button
                        type="button"
                        onClick={() => setAutoOnlyInStock(!autoOnlyInStock)}
                        className={`flex items-center gap-1.5 rounded-xl border px-2.5 py-1 text-[11px] font-bold transition-all cursor-pointer ${
                          autoOnlyInStock
                            ? "border-emerald-300 bg-emerald-50 text-emerald-800 font-extrabold shadow-2xs"
                            : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                        }`}
                      >
                        <span
                          className={`h-2 w-2 rounded-full ${
                            autoOnlyInStock ? "bg-emerald-500" : "bg-slate-300"
                          }`}
                        />
                        <span>Solo con Stock</span>
                      </button>
                    </div>

                    {/* Mini-Buscador contextual por modelo */}
                    <div className="flex items-center gap-2">
                      <div className="relative">
                        <input
                          type="text"
                          value={autoModelSearch}
                          onChange={(e) => setAutoModelSearch(e.target.value)}
                          placeholder="Buscar modelo..."
                          className="w-36 sm:w-44 rounded-xl border border-slate-300 bg-white px-2.5 py-1 text-xs font-semibold text-slate-800 placeholder-slate-400 focus:border-blue-500 focus:outline-none shadow-2xs"
                        />
                        {autoModelSearch && (
                          <button
                            type="button"
                            onClick={() => setAutoModelSearch("")}
                            className="absolute inset-y-0 right-0 flex items-center pr-2 text-slate-400 hover:text-slate-600 cursor-pointer"
                          >
                            ✕
                          </button>
                        )}
                      </div>

                      {/* Botón Limpiar filtros activos */}
                      {(autoBrandFilter !== "TODAS" ||
                        autoButtonsFilter !== "TODOS" ||
                        autoMechanismFilter !== "TODOS" ||
                        autoOnlyInStock ||
                        autoModelSearch) && (
                        <button
                          type="button"
                          onClick={resetAutoFilters}
                          className="rounded-xl bg-slate-200 px-2.5 py-1 text-[11px] font-bold text-slate-700 hover:bg-slate-300 active:scale-95 cursor-pointer"
                          title="Restablecer todos los filtros"
                        >
                          Limpiar
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {articulosParaMostrar.length === 0 ? (
                <div className="flex h-48 flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 text-center text-slate-400">
                  <svg className="h-10 w-10 text-slate-300" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 8 12 3 3 8l9 5 9-5Z" />
                    <path d="M3 8v8l9 5 9-5V8" />
                    <path d="M12 13v8" />
                  </svg>
                  <p className="mt-2 text-xs font-semibold">No hay productos en esta categoría.</p>
                </div>
              ) : (
                <div className="grid max-h-[560px] grid-cols-2 gap-2.5 overflow-y-auto pr-1 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-4 2xl:grid-cols-5">
                  {articulosParaMostrar.map((item) => renderItemCard(item, addItem, setPreviewImage))}
                </div>
              )}
            </div>
          ) : (
            /* CASO 3: CUADROS GRANDES DE SUBCATEGORÍAS (EL ESTÁNDAR PEDIDO POR EL USUARIO) */
            <div className="flex flex-col gap-3">
              {/* RESIDENCIAL: CUADROS GRANDES (DUPLICADOS RÁPIDOS + CHAPAS Y CANDADOS) */}
              {macroTab === "RESIDENCIAL" && (() => {
                const chapaCat = (categoriasPorMacro.RESIDENCIAL || []).find((c) => c.NombreCategoria === "Chapas");
                const candadoCat = (categoriasPorMacro.RESIDENCIAL || []).find((c) => c.NombreCategoria === "Candados");
                const chapaImg = resolveImagenUrl(chapaCat?.ImagenUrl, IMAGE_VARIANTS.THUMB);
                const candadoImg = resolveImagenUrl(candadoCat?.ImagenUrl, IMAGE_VARIANTS.THUMB);
                const chapaCount = chapaCat ? articulosEnMacroActiva.filter((it) => String(it.IdCategoria) === String(chapaCat.IdCategoria)).length : 0;
                const candadoCount = candadoCat ? articulosEnMacroActiva.filter((it) => String(it.IdCategoria) === String(candadoCat.IdCategoria)).length : 0;

                return (
                  <div className="flex flex-col gap-3">
                    <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-4">
                      {/* 6 Duplicados Residenciales Estándar */}
                      {RESIDENCIAL_FAST_KEYS.map((keyBtn) => {
                        const isSubmenuOpen = activeFastKeySubmenu === keyBtn.id;
                        return (
                          <div
                            key={keyBtn.id}
                            role="button"
                            tabIndex={0}
                            onClick={() => handleFastKeyClick(keyBtn)}
                            className={`group flex min-h-[140px] flex-col items-center justify-between rounded-2xl border p-3.5 text-center transition-all active:scale-95 cursor-pointer ${
                              isSubmenuOpen
                                ? "border-amber-500 bg-amber-50/80 shadow-md ring-2 ring-amber-400"
                                : "border-slate-200 bg-white shadow-xs hover:-translate-y-1 hover:border-amber-400 hover:shadow-md"
                            }`}
                          >
                            <div
                              className={`flex h-14 w-14 items-center justify-center rounded-2xl text-2xl transition-transform group-hover:scale-110 ${
                                isSubmenuOpen ? "bg-amber-100" : "bg-amber-50"
                              }`}
                            >
                              {keyBtn.icon}
                            </div>
                            <strong
                              className={`mt-1.5 text-xs font-bold leading-tight ${
                                isSubmenuOpen ? "text-amber-800" : "text-slate-800 group-hover:text-amber-700"
                              }`}
                            >
                              {keyBtn.nombre}
                            </strong>
                            <div className="mt-1 flex items-center gap-1">
                              <span className="rounded-lg bg-amber-100 px-2 py-0.5 text-xs font-black text-amber-900">
                                {keyBtn.badge}
                              </span>
                              {keyBtn.hasSubmenu ? (
                                <span
                                  className={`rounded-md px-1.5 py-0.5 text-[10px] font-bold ${
                                    isSubmenuOpen ? "bg-amber-600 text-white" : "bg-slate-100 text-slate-600"
                                  }`}
                                >
                                  {isSubmenuOpen ? "▲ Cerrar" : "▼ Modelos"}
                                </span>
                              ) : (
                                <span className="rounded-md bg-emerald-100 px-1.5 py-0.5 text-[10px] font-bold text-emerald-800">
                                  Directo
                                </span>
                              )}
                            </div>
                          </div>
                        );
                      })}

                      {/* Chapas */}
                      <div
                        role="button"
                        tabIndex={0}
                        onClick={() => {
                          setActiveFastKeySubmenu(null);
                          setSubCategoriaId(chapaCat?.IdCategoria || 53);
                        }}
                        className="group flex min-h-[140px] flex-col items-center justify-between rounded-2xl border border-slate-200 bg-white p-3.5 text-center shadow-xs transition-all hover:-translate-y-1 hover:border-amber-400 hover:shadow-md active:scale-95 cursor-pointer"
                      >
                        <div className="flex h-14 w-14 items-center justify-center overflow-hidden rounded-2xl bg-amber-50 text-2xl transition-transform group-hover:scale-110">
                          {chapaImg ? (
                            <img src={chapaImg} alt="Chapas" className="h-full w-full object-contain" />
                          ) : (
                            renderCategoriaIcon("Chapas", "text-amber-700")
                          )}
                        </div>
                        <strong className="mt-1.5 text-xs font-bold text-slate-800 leading-tight group-hover:text-amber-700">
                          Chapas
                        </strong>
                        <span className="mt-1 rounded-lg bg-slate-100 px-2.5 py-0.5 text-[11px] font-bold text-slate-600">
                          {chapaCount > 0 ? `${chapaCount} productos` : "Ver catálogo"}
                        </span>
                      </div>

                      {/* Candados */}
                      <div
                        role="button"
                        tabIndex={0}
                        onClick={() => {
                          setActiveFastKeySubmenu(null);
                          setSubCategoriaId(candadoCat?.IdCategoria || 54);
                        }}
                        className="group flex min-h-[140px] flex-col items-center justify-between rounded-2xl border border-slate-200 bg-white p-3.5 text-center shadow-sm transition-all hover:-translate-y-1 hover:border-amber-400 hover:shadow-md active:scale-95 cursor-pointer"
                      >
                        <div className="flex h-14 w-14 items-center justify-center overflow-hidden rounded-2xl bg-amber-50 text-2xl transition-transform group-hover:scale-110">
                          {candadoImg ? (
                            <img src={candadoImg} alt="Candados" className="h-full w-full object-contain" />
                          ) : (
                            renderCategoriaIcon("Candados", "text-amber-700")
                          )}
                        </div>
                        <strong className="mt-1.5 text-xs font-bold text-slate-800 leading-tight group-hover:text-amber-700">
                          Candados
                        </strong>
                        <span className="mt-1 rounded-lg bg-slate-100 px-2.5 py-0.5 text-[11px] font-bold text-slate-600">
                          {candadoCount > 0 ? `${candadoCount} productos` : "Ver catálogo"}
                        </span>
                      </div>
                    </div>

                    {/* SUB-MENÚ DESPLEGABLE DE MODELOS FRECUENTES */}
                    {activeFastKeySubmenu && activeKeyConfig && (
                      <div className="rounded-2xl border-2 border-amber-300 bg-gradient-to-b from-amber-50/80 via-white to-amber-50/30 p-4 shadow-sm transition-all animate-in fade-in slide-in-from-top-2 duration-200">
                        {/* Cabecera del sub-menú */}
                        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-amber-200/80 pb-3 mb-3">
                          <div className="flex items-center gap-2.5">
                            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-500 text-white shadow-xs">
                              {activeKeyConfig.icon}
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <h4 className="text-sm font-black text-slate-800">
                                  Modelos con control de stock: {activeKeyConfig.nombre}
                                </h4>
                                <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-extrabold text-amber-800">
                                  {modelsForActiveSubmenu.length} {modelsForActiveSubmenu.length === 1 ? "opción" : "opciones"}
                                </span>
                              </div>
                              <p className="text-xs text-slate-500">
                                Mostrando únicamente piezas con <strong>control de stock activo</strong> (AlertaStock). Haz clic para agregar al ticket.
                              </p>
                            </div>
                          </div>

                          <button
                            type="button"
                            onClick={() => setActiveFastKeySubmenu(null)}
                            className="flex items-center gap-1 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-600 shadow-xs hover:bg-slate-100 active:scale-95 cursor-pointer"
                          >
                            <svg className="h-3.5 w-3.5 text-slate-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <line x1="18" y1="6" x2="6" y2="18" />
                              <line x1="6" y1="6" x2="18" y2="18" />
                            </svg>
                            <span>Cerrar</span>
                          </button>
                        </div>

                        {/* Mensaje de confirmación temporal cuando se añade un modelo */}
                        {addedFeedback && (
                          <div className="mb-3 flex items-center justify-between rounded-xl border border-emerald-300 bg-emerald-50 px-3 py-2 text-xs font-bold text-emerald-800 shadow-xs">
                            <div className="flex items-center gap-2">
                              <svg className="h-4 w-4 text-emerald-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                <polyline points="20 6 9 17 4 12" />
                              </svg>
                              <span>Agregado al ticket: <span className="underline">{addedFeedback.name}</span></span>
                            </div>
                            <span className="text-[11px] font-semibold text-emerald-700">Stock descontado al cobrar</span>
                          </div>
                        )}

                        {/* Grid de Modelos Frecuentes */}
                        <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
                          {modelsForActiveSubmenu.length === 0 && (
                            <div className="col-span-full rounded-xl border border-dashed border-amber-300 bg-amber-50/60 p-4 text-center text-xs text-slate-600">
                              <p className="font-bold text-amber-900">
                                No hay modelos con control de stock activo para esta categoría.
                              </p>
                              <p className="mt-1 text-[11px] text-slate-500">
                                Para que aparezcan aquí, activa el campo <strong>¿Contar y controlar stock?</strong> en la sección <strong>Catálogo & Stock</strong>, o usa el botón "+ Otra / Genérica".
                              </p>
                            </div>
                          )}

                          {modelsForActiveSubmenu.map((m) => {
                            const hasStock = m.stock !== null && m.stock > 0;
                            const isLowStock = m.stock !== null && m.stock > 0 && m.stock <= 2;
                            const isZeroStock = m.stock !== null && m.stock <= 0;

                            return (
                              <button
                                key={m.item?.IdItem || m.code}
                                type="button"
                                onClick={() =>
                                  handleSelectSubmenuModel(
                                    m.item,
                                    m.code,
                                    activeKeyConfig.precio,
                                    activeKeyConfig.nombre
                                  )
                                }
                                className="group flex flex-col items-center justify-between rounded-xl border border-amber-200/90 bg-white p-3 text-center shadow-xs transition-all hover:-translate-y-0.5 hover:border-amber-400 hover:shadow-md active:scale-95 cursor-pointer"
                              >
                                {/* Código / Nombre clave */}
                                <div className="flex h-10 w-full items-center justify-center rounded-lg bg-amber-50 font-black text-sm text-amber-950 group-hover:bg-amber-100 transition-colors">
                                  {m.code}
                                </div>

                                {/* Nombre completo en inventario */}
                                <span className="mt-1.5 line-clamp-1 text-[11px] font-semibold text-slate-600 group-hover:text-slate-900" title={m.item?.Nombre || m.code}>
                                  {m.item?.Nombre || m.code}
                                </span>

                                {/* Estado de Stock */}
                                <div className="mt-1.5 flex items-center gap-1">
                                  {m.stock !== null ? (
                                    <span
                                      className={`rounded-md px-1.5 py-0.5 text-[10px] font-black ${
                                        isZeroStock
                                          ? "bg-rose-100 text-rose-700"
                                          : isLowStock
                                          ? "bg-amber-100 text-amber-800"
                                          : "bg-emerald-100 text-emerald-800"
                                      }`}
                                    >
                                      {isZeroStock ? `Stock: ${m.stock} (Agotado)` : `Stock: ${m.stock}`}
                                    </span>
                                  ) : (
                                    <span className="rounded-md bg-slate-100 px-1.5 py-0.5 text-[10px] font-semibold text-slate-500">
                                      Sin stock reg.
                                    </span>
                                  )}
                                </div>

                                {/* Precio y Coordenada */}
                                <div className="mt-2 flex w-full items-center justify-between border-t border-slate-100 pt-1.5 text-[11px] font-bold text-slate-700">
                                  <span className="text-amber-700 font-black">{formatMoney(m.precio)}</span>
                                  {m.ubicacion ? (
                                    <span className="rounded bg-slate-100 px-1 text-[9px] font-mono text-slate-500" title={`Ubicación: ${m.ubicacion}`}>
                                      {m.ubicacion}
                                    </span>
                                  ) : (
                                    <span className="text-[10px] text-slate-400 font-normal">--</span>
                                  )}
                                </div>
                              </button>
                            );
                          })}

                          {/* Opción "+ Otra / Genérica" (para modelos no listados en el menú rápido) */}
                          <button
                            type="button"
                            onClick={() => {
                              const genericItem = catalogo.articulos.find((it) => {
                                if (activeKeyConfig.genericItemId) {
                                  return it.IdItem === activeKeyConfig.genericItemId;
                                }
                                if (activeKeyConfig.id === "LLAVE_SENCILLA") return it.IdItem === 675;
                                if (activeKeyConfig.id === "LLAVE_LARGA") return it.IdItem === 676;
                                if (activeKeyConfig.id === "LLAVE_TETRA") return it.IdItem === 677;
                                if (activeKeyConfig.id === "LLAVE_PUNTOS") return it.IdItem === 678;
                                return false;
                              });

                              if (genericItem) {
                                addItem(genericItem, 1);
                              } else {
                                addItem(
                                  {
                                    IdItem: `GEN_${activeKeyConfig.id}`,
                                    Nombre: `${activeKeyConfig.nombre} (Genérica)`,
                                    PrecioVenta: activeKeyConfig.precio,
                                    EsServicio: false,
                                    AlertaStock: false,
                                  },
                                  1
                                );
                              }
                              setAddedFeedback({ name: `${activeKeyConfig.nombre} (Genérica)`, code: "Genérica" });
                              setTimeout(() => setAddedFeedback(null), 1800);
                            }}
                              className="group flex flex-col items-center justify-between rounded-xl border border-dashed border-slate-300 bg-slate-50/70 p-3 text-center shadow-xs transition-all hover:-translate-y-0.5 hover:border-slate-400 hover:bg-slate-100 active:scale-95 cursor-pointer"
                            >
                              <div className="flex h-10 w-full items-center justify-center rounded-lg bg-slate-200/70 font-black text-xs text-slate-700 group-hover:bg-slate-300/70">
                                + Otra / Genérica
                              </div>
                              <span className="mt-1.5 text-[10px] text-slate-500">
                                Otro modelo
                              </span>
                              <div className="mt-2 w-full border-t border-slate-200 pt-1.5 text-[11px] font-extrabold text-slate-700">
                                {formatMoney(activeKeyConfig.precio)}
                              </div>
                            </button>
                          </div>
                        </div>
                    )}
                  </div>
                );
              })()}

              {/* AUTOMOTRIZ: CUADROS GRANDES DE SUBCATEGORÍAS */}
              {macroTab === "AUTOMOTRIZ" && (
                <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-4">
                  {(categoriasPorMacro.AUTOMOTRIZ || []).map((cat) => {
                    const catImg = resolveImagenUrl(cat?.ImagenUrl, IMAGE_VARIANTS.THUMB);
                    const totalArticulos = articulosEnMacroActiva.filter(
                      (it) => String(it.IdCategoria) === String(cat.IdCategoria)
                    ).length;

                    return (
                      <div
                        key={cat.IdCategoria}
                        role="button"
                        tabIndex={0}
                        onClick={() => handleSelectSubcategoria(cat.IdCategoria)}
                        className="group flex min-h-[140px] flex-col items-center justify-between rounded-2xl border border-slate-200 bg-white p-3.5 text-center shadow-xs transition-all hover:-translate-y-1 hover:border-blue-500 hover:shadow-md active:scale-95 cursor-pointer"
                      >
                        <div className="flex h-14 w-14 items-center justify-center overflow-hidden rounded-2xl bg-blue-50 text-2xl transition-transform group-hover:scale-110">
                          {catImg ? (
                            <img src={catImg} alt="" className="h-full w-full object-contain" />
                          ) : (
                            renderCategoriaIcon(cat.NombreCategoria, "text-blue-600")
                          )}
                        </div>
                        <strong className="mt-1.5 text-xs font-bold text-slate-800 leading-tight group-hover:text-blue-600">
                          {cat.NombreCategoria}
                        </strong>
                        <span className="mt-1 rounded-lg bg-slate-100 px-2.5 py-0.5 text-[11px] font-bold text-slate-600">
                          {totalArticulos} productos
                        </span>
                      </div>
                    );
                  })}

                  {/* Cuadro para Ver Todos los productos automotrices */}
                  <div
                    role="button"
                    tabIndex={0}
                    onClick={() => handleSelectSubcategoria("TODOS")}
                    className="group flex min-h-[140px] flex-col items-center justify-between rounded-2xl border border-dashed border-blue-300 bg-blue-50/50 p-3.5 text-center shadow-xs transition-all hover:-translate-y-1 hover:border-blue-500 hover:bg-blue-50 hover:shadow-md active:scale-95 cursor-pointer"
                  >
                    <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-100 text-2xl transition-transform group-hover:scale-110">
                      <svg className="h-6 w-6 text-blue-700" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <polygon points="12 2 2 7 12 12 22 7 12 2" />
                        <polyline points="2 17 12 22 22 17" />
                        <polyline points="2 12 12 17 22 12" />
                      </svg>
                    </div>
                    <strong className="mt-1.5 text-xs font-bold text-blue-900 leading-tight">
                      Ver Todos
                    </strong>
                    <span className="mt-1 rounded-lg bg-blue-200/80 px-2.5 py-0.5 text-[11px] font-black text-blue-900">
                      {articulosEnMacroActiva.length} productos
                    </span>
                  </div>
                </div>
              )}

              {/* ACCESORIOS: CUADROS GRANDES DE SUBCATEGORÍAS */}
              {macroTab === "ACCESORIOS" && (
                <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-4">
                  {(categoriasPorMacro.ACCESORIOS || []).map((cat) => {
                    const catImg = resolveImagenUrl(cat?.ImagenUrl, IMAGE_VARIANTS.THUMB);
                    const totalArticulos = articulosEnMacroActiva.filter(
                      (it) => String(it.IdCategoria) === String(cat.IdCategoria)
                    ).length;

                    return (
                      <div
                        key={cat.IdCategoria}
                        role="button"
                        tabIndex={0}
                        onClick={() => setSubCategoriaId(cat.IdCategoria)}
                        className="group flex min-h-[140px] flex-col items-center justify-between rounded-2xl border border-slate-200 bg-white p-3.5 text-center shadow-xs transition-all hover:-translate-y-1 hover:border-teal-500 hover:shadow-md active:scale-95 cursor-pointer"
                      >
                        <div className="flex h-14 w-14 items-center justify-center overflow-hidden rounded-2xl bg-teal-50 text-2xl transition-transform group-hover:scale-110">
                          {catImg ? (
                            <img src={catImg} alt="" className="h-full w-full object-contain" />
                          ) : (
                            renderCategoriaIcon(cat.NombreCategoria, "text-teal-600")
                          )}
                        </div>
                        <strong className="mt-1.5 text-xs font-bold text-slate-800 leading-tight group-hover:text-teal-600">
                          {cat.NombreCategoria}
                        </strong>
                        <span className="mt-1 rounded-lg bg-slate-100 px-2.5 py-0.5 text-[11px] font-bold text-slate-600">
                          {totalArticulos} productos
                        </span>
                      </div>
                    );
                  })}

                  <div
                    role="button"
                    tabIndex={0}
                    onClick={() => setSubCategoriaId("TODOS")}
                    className="group flex min-h-[140px] flex-col items-center justify-between rounded-2xl border border-dashed border-teal-300 bg-teal-50/50 p-3.5 text-center shadow-xs transition-all hover:-translate-y-1 hover:border-teal-500 hover:bg-teal-50 hover:shadow-md active:scale-95 cursor-pointer"
                  >
                    <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-teal-100 text-2xl transition-transform group-hover:scale-110">
                      <svg className="h-6 w-6 text-teal-700" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <polygon points="12 2 2 7 12 12 22 7 12 2" />
                        <polyline points="2 17 12 22 22 17" />
                        <polyline points="2 12 12 17 22 12" />
                      </svg>
                    </div>
                    <strong className="mt-1.5 text-xs font-bold text-teal-900 leading-tight">
                      Ver Todos
                    </strong>
                    <span className="mt-1 rounded-lg bg-teal-200/80 px-2.5 py-0.5 text-[11px] font-black text-teal-900">
                      {articulosEnMacroActiva.length} productos
                    </span>
                  </div>
                </div>
              )}

              {/* SERVICIOS: BANNER ANCHO RECTANGULAR DE SERVICIO GENERAL + CUADRÍCULA DE SERVICIOS REGISTRADOS */}
              {macroTab === "SERVICIOS" && (
                <div className="flex flex-col gap-3.5">
                  {/* Cuadro de Servicio General Rectangular Ancho (Ocupa todo el ancho) */}
                  <div
                    role="button"
                    tabIndex={0}
                    onClick={handleAddQuickService}
                    className="group flex w-full items-center justify-between gap-4 rounded-2xl border-2 border-dashed border-purple-300 bg-gradient-to-r from-purple-50/90 via-white to-purple-50/50 p-4 shadow-xs transition-all hover:border-purple-600 hover:bg-purple-50 hover:shadow-md active:scale-[0.99] cursor-pointer"
                  >
                    <div className="flex items-center gap-3.5">
                      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-purple-100 text-purple-700 shadow-xs transition-transform group-hover:scale-105">
                        <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" />
                        </svg>
                      </div>
                      <div className="flex flex-col">
                        <div className="flex items-center gap-2">
                          <strong className="text-sm font-extrabold text-purple-950">
                            + Servicio General (Al vuelo)
                          </strong>
                          <span className="rounded-md bg-purple-200/80 px-2 py-0.5 text-[10px] font-black text-purple-900">
                            Personalizado
                          </span>
                        </div>
                        <span className="text-xs text-slate-500">
                          Toca para agregar un trabajo al ticket con descripción y precio libres al momento.
                        </span>
                      </div>
                    </div>

                    <div className="flex shrink-0 items-center gap-2">
                      <span className="hidden sm:inline-block text-xs font-bold text-purple-700 group-hover:underline">
                        Agregar al ticket
                      </span>
                      <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-purple-600 text-white font-black shadow-xs transition-transform group-hover:translate-x-0.5">
                        +
                      </span>
                    </div>
                  </div>

                  {/* Cuadrícula de Servicios Registrados en la Base de Datos */}
                  {(() => {
                    const serviciosRegistrados = articulosEnMacroActiva.filter((it) => it.IdItem !== 681);

                    return (
                      <div className="flex flex-col gap-2">
                        <div className="flex items-center justify-between px-0.5">
                          <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                            Servicios del Catálogo ({serviciosRegistrados.length})
                          </span>
                          <span className="text-[11px] text-slate-400">
                            Toca cualquier servicio para añadirlo al ticket
                          </span>
                        </div>

                        {serviciosRegistrados.length === 0 ? (
                          <div className="flex h-36 flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 text-center text-slate-400">
                            <p className="text-xs font-semibold">No hay servicios específicos registrados en el catálogo.</p>
                          </div>
                        ) : (
                          <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-4">
                            {serviciosRegistrados.map((item) => renderItemCard(item, addItem, setPreviewImage))}
                          </div>
                        )}
                      </div>
                    );
                  })()}
                </div>
              )}
            </div>
          )}
        </section>

        {/* ===================== COLUMNA DERECHA: TICKET Y COBRO ===================== */}
        <section className="flex flex-col gap-3 rounded-3xl border border-slate-200/90 bg-white p-4 shadow-xs">
          {/* A. CABECERA DEL TICKET */}
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2">
              <svg className="h-5 w-5 text-blue-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="8" cy="21" r="1" />
                <circle cx="19" cy="21" r="1" />
                <path d="M2.05 2.05h2l2.66 12.42a2 2 0 0 0 2 1.58h9.78a2 2 0 0 0 1.95-1.57l1.65-7.43H5.12" />
              </svg>
              <h2 className="text-base font-bold text-slate-800">
                Ticket de Venta ({lines.reduce((acc, l) => acc + l.cantidad, 0)})
              </h2>
            </div>
            {lines.length > 0 && (
              <button
                type="button"
                onClick={clear}
                className="text-xs font-bold text-rose-600 hover:text-rose-700 hover:underline cursor-pointer"
              >
                Vaciar Carrito
              </button>
            )}
          </div>

          {/* B. LISTA DE PRODUCTOS EN EL TICKET */}
          {lines.length === 0 ? (
            <div className="flex h-44 flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 text-center text-slate-400">
              <svg className="h-10 w-10 text-slate-300" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M4 2v20l2-1 2 1 2-1 2 1 2-1 2 1 2-1 2 1V2l-2 1-2-1-2 1-2-1-2 1-2-1-2 1Z" />
                <path d="M16 8h-8" />
                <path d="M16 12h-8" />
                <path d="M14 16h-6" />
              </svg>
              <p className="mt-2 text-xs font-semibold">El ticket está vacío.</p>
              <p className="text-[11px] text-slate-400">Toca cualquier producto o servicio para añadirlo.</p>
            </div>
          ) : (
            <div className="flex max-h-[360px] flex-col gap-2.5 overflow-y-auto pr-1">
              {lines.filter((l) => !l.refaccionDeKey).map((line) => {
                const isEditingThisPrice = editingPriceKey === line.key;
                const isServiceLine = line.esServicio || line.id === 681 || line.key?.startsWith("SERVICE:");
                const linkedParts = lines.filter((l) => l.refaccionDeKey === line.key);

                return (
                  <div
                    key={line.key}
                    className="flex flex-col gap-1.5 rounded-2xl border border-slate-200/80 bg-slate-50/60 p-2.5 transition-all"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <strong className="block truncate text-xs font-bold text-slate-800">
                          {line.nombre}
                        </strong>

                        {/* PRECIO UNITARIO EDITABLE INLINE */}
                        <div className="mt-0.5 flex items-center gap-1.5">
                          <span className="text-[11px] text-slate-500">Precio c/u:</span>
                          {isEditingThisPrice ? (
                            <div className="inline-flex items-center gap-1">
                              <span className="text-xs font-bold text-slate-700">$</span>
                              <input
                                type="number"
                                autoFocus
                                className="w-20 rounded-md border border-blue-400 bg-white px-1.5 py-0.5 text-xs font-extrabold text-blue-700 focus:outline-none"
                                value={editingPriceVal}
                                onChange={(e) => setEditingPriceVal(e.target.value)}
                                onKeyDown={(e) => {
                                  if (e.key === "Enter") handleSaveInlinePrice(line.key);
                                  if (e.key === "Escape") setEditingPriceKey(null);
                                }}
                              />
                              <button
                                type="button"
                                onClick={() => handleSaveInlinePrice(line.key)}
                                className="flex h-6 w-6 items-center justify-center rounded-md bg-blue-600 text-white hover:bg-blue-700 cursor-pointer"
                              >
                                <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                  <polyline points="20 6 9 17 4 12" />
                                </svg>
                              </button>
                            </div>
                          ) : (
                            <button
                              type="button"
                              onClick={() => {
                                setEditingPriceKey(line.key);
                                setEditingPriceVal(String(line.precio));
                              }}
                              className="group inline-flex items-center gap-1 rounded-md bg-white px-2 py-0.5 text-xs font-extrabold text-blue-700 shadow-xs transition-all hover:bg-blue-50 cursor-pointer"
                              title="Haz clic para modificar el precio de este producto"
                            >
                              <span>{formatMoney(line.precio)}</span>
                              <svg className="h-3 w-3 text-blue-400 group-hover:text-blue-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
                              </svg>
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Botón Eliminar Renglón */}
                      <button
                        type="button"
                        onClick={() => handleRemoveLine(line.key)}
                        className="flex h-6 w-6 items-center justify-center rounded-lg text-slate-400 hover:bg-rose-50 hover:text-rose-600 cursor-pointer"
                        title="Quitar del ticket"
                      >
                        <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <line x1="18" y1="6" x2="6" y2="18" />
                          <line x1="6" y1="6" x2="18" y2="18" />
                        </svg>
                      </button>
                    </div>

                    {/* Campo de descripción / nombre del trabajo si es servicio */}
                    {isServiceLine && (
                      <div className="flex flex-col gap-2 rounded-xl border border-purple-200/90 bg-purple-50/70 p-2.5">
                        <label className="flex items-center gap-1.5 text-[10px] font-bold text-purple-900">
                          <svg className="h-3 w-3 text-purple-700" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                            <polyline points="14 2 14 8 20 8" />
                            <line x1="16" y1="13" x2="8" y2="13" />
                            <line x1="16" y1="17" x2="8" y2="17" />
                          </svg>
                          <span>Descripción / Trabajo realizado:</span>
                        </label>
                        <input
                          type="text"
                          className="w-full rounded-lg border border-purple-300 bg-white px-2.5 py-1 text-xs font-semibold text-slate-800 placeholder-purple-300 shadow-2xs focus:border-purple-600 focus:ring-2 focus:ring-purple-100 focus:outline-none"
                          placeholder="Ej: Reparación chapa Honda Civic, apertura, cambio switch..."
                          value={line.nota || ""}
                          onChange={(e) => setLineNote(line.key, e.target.value)}
                        />

                        {/* Botón para vincular refacción física */}
                        <div className="flex flex-wrap items-center justify-between gap-1 pt-0.5">
                          <button
                            type="button"
                            onClick={() => handleOpenVincularRefaccion(line)}
                            className="inline-flex items-center gap-1.5 rounded-lg border border-purple-300 bg-white px-2.5 py-1 text-[11px] font-bold text-purple-800 shadow-2xs hover:bg-purple-100/80 hover:border-purple-400 active:scale-95 cursor-pointer"
                          >
                            <svg className="h-3.5 w-3.5 text-purple-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
                              <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
                              <line x1="12" y1="22.08" x2="12" y2="12" />
                            </svg>
                            <span>+ Vincular refacción (salida de stock)</span>
                          </button>

                          {linkedParts.length > 0 && (
                            <span className="rounded-md bg-indigo-100 px-2 py-0.5 text-[10px] font-black text-indigo-800">
                              {linkedParts.length} {linkedParts.length === 1 ? "pieza vinculada" : "piezas vinculadas"}
                            </span>
                          )}
                        </div>

                        {/* Lista de Refacciones vinculadas a este servicio */}
                        {linkedParts.length > 0 && (
                          <div className="mt-1 flex flex-col gap-1.5 border-t border-purple-200/60 pt-2">
                            <span className="text-[10px] font-extrabold text-indigo-950 uppercase tracking-wide">
                              ↳ Piezas físicas descontadas de almacén:
                            </span>
                            {linkedParts.map((partLine) => (
                              <div
                                key={partLine.key}
                                className="flex items-center justify-between rounded-lg border border-indigo-200 bg-white px-2.5 py-1.5 shadow-2xs"
                              >
                                <div className="min-w-0 flex-1">
                                  <strong className="block truncate text-xs font-bold text-slate-800">
                                    {partLine.nombre}
                                  </strong>
                                  <div className="flex items-center gap-1.5 text-[10px] text-slate-500 font-semibold">
                                    <span className="text-emerald-700 font-bold">$0.00 (Incluido)</span>
                                    <span>•</span>
                                    <span>Descuenta stock al cobrar</span>
                                  </div>
                                </div>

                                <div className="flex items-center gap-2">
                                  {/* Cantidad de refacción */}
                                  <div className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-slate-50 p-0.5 text-xs">
                                    <button
                                      type="button"
                                      onClick={() => dec(partLine.key)}
                                      className="h-5 w-5 rounded bg-white font-bold text-slate-700 hover:bg-slate-100 cursor-pointer"
                                    >
                                      -
                                    </button>
                                    <span className="w-5 text-center font-bold text-slate-800">
                                      {partLine.cantidad}
                                    </span>
                                    <button
                                      type="button"
                                      onClick={() => inc(partLine.key)}
                                      className="h-5 w-5 rounded bg-white font-bold text-slate-700 hover:bg-slate-100 cursor-pointer"
                                    >
                                      +
                                    </button>
                                  </div>

                                  {/* Quitar refacción vinculada */}
                                  <button
                                    type="button"
                                    onClick={() => remove(partLine.key)}
                                    className="flex h-6 w-6 items-center justify-center rounded-md text-rose-500 hover:bg-rose-50 hover:text-rose-700 cursor-pointer"
                                    title="Quitar refacción vinculada"
                                  >
                                    <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                      <line x1="18" y1="6" x2="6" y2="18" />
                                      <line x1="6" y1="6" x2="18" y2="18" />
                                    </svg>
                                  </button>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}

                    {/* Controles de Cantidad e Importe Total de Línea */}
                    <div className="flex items-center justify-between border-t border-slate-200/50 pt-1.5">
                      <div className="inline-flex items-center gap-1 rounded-xl border border-slate-300 bg-white p-0.5 shadow-xs">
                        <button
                          type="button"
                          onClick={() => dec(line.key)}
                          className="flex h-7 w-7 items-center justify-center rounded-lg bg-slate-50 text-sm font-bold text-slate-700 hover:bg-slate-100 active:scale-95 cursor-pointer"
                        >
                          -
                        </button>
                        <input
                          type="number"
                          className="w-10 text-center text-xs font-bold text-slate-800 focus:outline-none"
                          value={line.cantidad}
                          onChange={(e) => setQty(line.key, e.target.value)}
                        />
                        <button
                          type="button"
                          onClick={() => inc(line.key)}
                          className="flex h-7 w-7 items-center justify-center rounded-lg bg-slate-50 text-sm font-bold text-slate-700 hover:bg-slate-100 active:scale-95 cursor-pointer"
                        >
                          +
                        </button>
                      </div>

                      <strong className="text-sm font-black text-slate-900">
                        {formatMoney(line.cantidad * line.precio)}
                      </strong>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* C. TOTALES DEL TICKET */}
          <div className="flex flex-col gap-1.5 rounded-2xl border border-slate-200 bg-slate-50/80 p-3">
            <div className="flex items-center justify-between text-xs text-slate-600">
              <span>Subtotal:</span>
              <span className="font-bold">{formatMoney(totals.total)}</span>
            </div>
            {requiereFactura && (
              <div className="flex items-center justify-between text-xs text-slate-600">
                <span>IVA (16% incluido):</span>
                <span className="font-bold">{formatMoney(round2(totals.total - totals.total / 1.16))}</span>
              </div>
            )}
            <div className="mt-1 flex items-center justify-between border-t border-slate-200 pt-1.5">
              <span className="text-sm font-extrabold uppercase tracking-wider text-slate-800">
                Total a Pagar:
              </span>
              <span className="text-2xl font-black text-blue-700">{formatMoney(totalPagar)}</span>
            </div>
          </div>

          {/* D. SELECCIÓN DE MÉTODO DE PAGO */}
          <div className="flex flex-col gap-2">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Método de Pago:
            </span>
            <div className="grid grid-cols-4 gap-1.5">
              {[
                {
                  id: "Efectivo",
                  label: "Efectivo",
                  icon: (
                    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <rect width="20" height="12" x="2" y="6" rx="2" />
                      <circle cx="12" cy="12" r="2" />
                      <path d="M6 12h.01M18 12h.01" />
                    </svg>
                  ),
                },
                {
                  id: "Tarjeta",
                  label: "Tarjeta",
                  icon: (
                    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <rect width="20" height="14" x="2" y="5" rx="2" />
                      <line x1="2" x2="22" y1="10" y2="10" />
                    </svg>
                  ),
                },
                {
                  id: "Transferencia",
                  label: "Transf.",
                  icon: (
                    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <rect width="14" height="20" x="5" y="2" rx="2" ry="2" />
                      <path d="M12 18h.01" />
                    </svg>
                  ),
                },
                {
                  id: "Otro",
                  label: "Otro",
                  icon: (
                    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="8" cy="8" r="6" />
                      <path d="M18.09 10.37A6 6 0 1 1 10.34 18" />
                      <path d="M7 6h1v4" />
                      <path d="m16.71 13.88.7.71-2.82 2.82" />
                    </svg>
                  ),
                },
              ].map((m) => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => setMetodoPago(m.id)}
                  className={`flex flex-col items-center justify-center rounded-xl border p-2 text-xs font-bold transition-all active:scale-95 cursor-pointer ${
                    metodoPago === m.id
                      ? "border-blue-600 bg-blue-600 text-white shadow-xs"
                      : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                  }`}
                >
                  <span className="flex items-center justify-center">{m.icon}</span>
                  <span className="mt-1">{m.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* E. FAST-TENDER (SI ES EFECTIVO: SUGERENCIAS DE BILLETES Y CÁLCULO DE CAMBIO) */}
          {metodoPago === "Efectivo" && totalPagar > 0 && (
            <div className="flex flex-col gap-2 rounded-2xl border border-emerald-200 bg-emerald-50/60 p-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-extrabold uppercase tracking-wider text-emerald-900">
                  Pago en Efectivo
                </span>
                {cambio > 0 && (
                  <span className="rounded-md bg-emerald-600 px-2 py-0.5 text-xs font-black text-white">
                    Cambio: {formatMoney(cambio)}
                  </span>
                )}
              </div>

              {/* Botones rápidos de billetes */}
              <div className="flex flex-wrap items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setMontoRecibido(String(totalPagar))}
                  className="rounded-lg border border-emerald-300 bg-white px-2.5 py-1 text-xs font-bold text-emerald-800 shadow-xs hover:bg-emerald-100 cursor-pointer"
                >
                  Exacto ({formatMoney(totalPagar)})
                </button>
                {suggestedBills.map((bill) => (
                  <button
                    key={bill}
                    type="button"
                    onClick={() => setMontoRecibido(String(bill))}
                    className="rounded-lg border border-emerald-300 bg-white px-2.5 py-1 text-xs font-bold text-emerald-800 shadow-xs hover:bg-emerald-100 cursor-pointer"
                  >
                    ${bill}
                  </button>
                ))}
              </div>

              {/* Input de monto recibido */}
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-emerald-800">Recibido: $</span>
                <input
                  type="number"
                  placeholder="0.00"
                  className="w-full rounded-xl border border-emerald-300 bg-white px-3 py-1.5 text-sm font-bold text-slate-800 focus:border-emerald-500 focus:outline-none"
                  value={montoRecibido}
                  onChange={(e) => setMontoRecibido(e.target.value)}
                />
              </div>
            </div>
          )}

          {/* F. DETALLES ADICIONALES (COLAPSABLE: CLIENTE, NOTAS, FACTURA) */}
          <div className="border-t border-slate-100 pt-2">
            <button
              type="button"
              onClick={() => setShowExtraDetails(!showExtraDetails)}
              className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-800 cursor-pointer"
            >
              <svg className="h-3.5 w-3.5 text-slate-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                {showExtraDetails ? (
                  <polyline points="6 9 12 15 18 9" />
                ) : (
                  <polyline points="9 18 15 12 9 6" />
                )}
              </svg>
              <span>Detalles adicionales (Cliente, Notas, Factura)</span>
            </button>

            {showExtraDetails && (
              <div className="mt-2 flex flex-col gap-2 rounded-xl border border-slate-200 bg-slate-50 p-2.5">
                <label className="flex flex-col gap-0.5 text-xs font-semibold text-slate-600">
                  Cliente:
                  <input
                    type="text"
                    placeholder="Mostrador (opcional)"
                    className="rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs text-slate-800"
                    value={nombreCliente}
                    onChange={(e) => setNombreCliente(e.target.value)}
                  />
                </label>

                <label className="flex flex-col gap-0.5 text-xs font-semibold text-slate-600">
                  Notas de venta:
                  <input
                    type="text"
                    placeholder="Ej. Candado Phillips 50mm, llaves auto..."
                    className="rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs text-slate-800"
                    value={notas}
                    onChange={(e) => setNotas(e.target.value)}
                  />
                </label>

                <label className="flex items-center gap-2 pt-1 text-xs font-semibold text-slate-700">
                  <input
                    type="checkbox"
                    checked={requiereFactura}
                    onChange={(e) => setRequiereFactura(e.target.checked)}
                    className="h-4 w-4 rounded-sm text-blue-600"
                  />
                  <span>Requiere Factura (Total incluye IVA)</span>
                </label>
              </div>
            )}
          </div>

          {/* MENSAJE DE ERROR DE COBRO */}
          {chargeError && (
            <div className="rounded-xl border border-rose-200 bg-rose-50 p-2.5 text-xs font-semibold text-rose-700">
              {chargeError}
            </div>
          )}

          {/* G. BOTÓN GIGANTE DE COBRO */}
          <button
            type="button"
            onClick={handleCobrar}
            disabled={isCharging || lines.length === 0 || totalPagar <= 0}
            className="flex h-14 w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-blue-700 via-indigo-600 to-blue-800 text-base font-black uppercase tracking-wider text-white shadow-lg shadow-blue-600/30 transition-all hover:brightness-110 active:scale-98 disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer"
          >
            {isCharging ? (
              <div className="flex items-center gap-2">
                <div className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                <span>Procesando...</span>
              </div>
            ) : (
              <span>COBRAR {formatMoney(totalPagar)}</span>
            )}
          </button>
        </section>
      </div>

      {/* ===================== 3. MODAL DE VENTA COMPLETADA ===================== */}
      {successModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm">
          <div className="flex w-full max-w-sm flex-col items-center rounded-3xl border border-slate-200 bg-white p-6 text-center shadow-2xl">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
              <svg className="h-8 w-8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            </div>
            <h3 className="mt-3 text-lg font-black text-slate-800">¡Venta Registrada!</h3>
            <p className="text-xs text-slate-500">
              Ticket #{typeof successModal.idVenta === "object" ? (successModal.idVenta?.idVenta ?? successModal.idVenta?.IdVenta ?? "") : successModal.idVenta}
            </p>

            <div className="my-4 flex w-full flex-col gap-2 rounded-2xl border border-slate-100 bg-slate-50 p-3">
              <div className="flex items-center justify-between text-xs text-slate-600">
                <span>Método:</span>
                <strong className="text-slate-800">{successModal.metodoPago}</strong>
              </div>
              <div className="flex items-center justify-between text-xs text-slate-600">
                <span>Total Cobrado:</span>
                <strong className="text-base text-blue-700">{formatMoney(successModal.total)}</strong>
              </div>
              {successModal.cambio > 0 && (
                <div className="flex items-center justify-between border-t border-slate-200 pt-1.5 text-xs">
                  <span className="font-extrabold text-emerald-800">Cambio a entregar:</span>
                  <strong className="text-base font-black text-emerald-600">
                    {formatMoney(successModal.cambio)}
                  </strong>
                </div>
              )}
            </div>

            <button
              type="button"
              autoFocus
              onClick={() => {
                setSuccessModal(null);
                searchInputRef.current?.focus();
              }}
              className="w-full rounded-2xl bg-slate-900 py-3 text-sm font-bold text-white shadow-md hover:bg-slate-800 active:scale-98 cursor-pointer"
            >
              Nueva Venta (Enter)
            </button>
          </div>
        </div>
      )}

      {/* ===================== 4. MODAL DE GASTO RÁPIDO ===================== */}
      {showGastoModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm">
          <div className="flex w-full max-w-md flex-col rounded-3xl border border-slate-200 bg-white p-5 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-rose-50 text-rose-600">
                  <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10" />
                    <line x1="8" y1="12" x2="16" y2="12" />
                  </svg>
                </div>
                <h3 className="text-base font-bold text-slate-800">Gasto Rápido de Caja Chica</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowGastoModal(false)}
                className="rounded-full bg-slate-100 p-1.5 text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>

            {/* Presets Rápidos */}
            <div className="mt-3 flex flex-col gap-1.5">
              <span className="text-xs font-bold text-slate-500">Gastos frecuentes (1 clic):</span>
              <div className="grid grid-cols-2 gap-2">
                {QUICK_EXPENSE_PRESETS.map((preset) => (
                  <button
                    key={preset.concepto}
                    type="button"
                    onClick={() => {
                      setGastoConcepto(preset.concepto);
                      setGastoMonto(String(preset.monto));
                    }}
                    className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 p-2 text-left text-xs font-bold text-slate-700 hover:border-slate-300 hover:bg-slate-100 cursor-pointer"
                  >
                    <span className="flex items-center gap-1.5">
                      {preset.icon}
                      <span>{preset.concepto}</span>
                    </span>
                    <span className="rounded-md bg-white px-1.5 py-0.5 text-slate-800 shadow-xs">
                      ${preset.monto}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* Formulario Manual */}
            <form onSubmit={handleSaveGasto} className="mt-4 flex flex-col gap-3">
              <label className="flex flex-col gap-1 text-xs font-bold text-slate-600">
                Concepto:
                <input
                  type="text"
                  placeholder="Ej. Garrafón de agua, thiner, comida..."
                  className="rounded-xl border border-slate-300 px-3 py-2 text-sm text-slate-800 focus:border-blue-500 focus:outline-none"
                  value={gastoConcepto}
                  onChange={(e) => setGastoConcepto(e.target.value)}
                />
              </label>

              <div className="grid grid-cols-2 gap-2">
                <label className="flex flex-col gap-1 text-xs font-bold text-slate-600">
                  Monto ($ MXN):
                  <input
                    type="number"
                    step="any"
                    placeholder="0.00"
                    className="rounded-xl border border-slate-300 px-3 py-2 text-sm font-bold text-slate-800 focus:border-blue-500 focus:outline-none"
                    value={gastoMonto}
                    onChange={(e) => setGastoMonto(e.target.value)}
                  />
                </label>

                <label className="flex flex-col gap-1 text-xs font-bold text-slate-600">
                  Método de Pago:
                  <select
                    className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-bold text-slate-800 focus:border-blue-500 focus:outline-none"
                    value={gastoMetodo}
                    onChange={(e) => setGastoMetodo(e.target.value)}
                  >
                    <option value="Efectivo">Efectivo</option>
                    <option value="Tarjeta">Tarjeta</option>
                    <option value="Transferencia">Transferencia</option>
                  </select>
                </label>
              </div>

              {gastoError && (
                <div className="rounded-xl border border-rose-200 bg-rose-50 p-2 text-xs font-semibold text-rose-700">
                  {gastoError}
                </div>
              )}

              <div className="mt-2 flex items-center justify-end gap-2 border-t border-slate-100 pt-3">
                <button
                  type="button"
                  onClick={() => setShowGastoModal(false)}
                  className="rounded-xl px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSavingGasto}
                  className="rounded-xl bg-rose-600 px-5 py-2 text-xs font-bold text-white shadow-xs hover:bg-rose-700 disabled:opacity-50 cursor-pointer"
                >
                  {isSavingGasto ? "Guardando..." : "Registrar Gasto"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ===================== 5. MODAL DE PRÉSTAMO / DEVOLUCIÓN DE CAMBIO ===================== */}
      {showPrestamoModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="flex w-full max-w-md flex-col rounded-3xl border border-slate-200 bg-white p-5 shadow-2xl">
            {/* Cabecera */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
                  <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="8" />
                    <line x1="12" y1="8" x2="12" y2="12" />
                    <line x1="12" y1="16" x2="12.01" y2="16" />
                    <path d="M16 8h-6a2 2 0 1 0 0 4h4a2 2 0 1 1 0 4H8" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-800">
                    Préstamo / Devolución de Cambio
                  </h3>
                  <p className="text-[11px] text-slate-500 font-medium">
                    Ajuste temporal de efectivo sin alterar ventas ni gastos
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowPrestamoModal(false)}
                className="rounded-full bg-slate-100 p-1.5 text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>

            {/* Selector de Acción: Ingresar cambio vs Devolver cambio */}
            <div className="mt-4 grid grid-cols-2 gap-2 rounded-2xl bg-slate-100 p-1">
              <button
                type="button"
                onClick={() => setPrestamoTipo("ENTRADA")}
                className={`flex items-center justify-center gap-1.5 rounded-xl py-2 text-xs font-black transition-all cursor-pointer ${
                  prestamoTipo === "ENTRADA"
                    ? "bg-emerald-600 text-white shadow-xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                <span>+</span>
                <span>Ingresar Cambio Prestado</span>
              </button>
              <button
                type="button"
                onClick={() => setPrestamoTipo("SALIDA")}
                className={`flex items-center justify-center gap-1.5 rounded-xl py-2 text-xs font-black transition-all cursor-pointer ${
                  prestamoTipo === "SALIDA"
                    ? "bg-amber-600 text-white shadow-xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                <span>-</span>
                <span>Devolver Cambio Prestado</span>
              </button>
            </div>

            {/* Mensaje explicativo del tipo seleccionado */}
            <div className={`mt-3 rounded-2xl border p-3 text-xs ${
              prestamoTipo === "ENTRADA"
                ? "border-emerald-200 bg-emerald-50/70 text-emerald-900"
                : "border-amber-200 bg-amber-50/70 text-amber-900"
            }`}>
              <div className="flex items-start gap-2">
                <span className="text-base">{prestamoTipo === "ENTRADA" ? "💡" : "🤝"}</span>
                <div>
                  <strong className="block font-bold">
                    {prestamoTipo === "ENTRADA" ? "Entrada de dinero a gaveta" : "Salida de dinero de gaveta"}
                  </strong>
                  <span className="text-[11px] leading-relaxed">
                    {prestamoTipo === "ENTRADA"
                      ? "Se sumará al efectivo físico de la caja para que haya cambio. NO cuenta como venta ni altera ganancias."
                      : "Se retira de la caja física para devolvérselo al trabajador. NO cuenta como gasto del taller ni descuadra el corte."}
                  </span>
                </div>
              </div>
            </div>

            {/* Chips Rápidos de Monto */}
            <div className="mt-3.5 flex flex-col gap-1.5">
              <span className="text-xs font-bold text-slate-500">Montos frecuentes:</span>
              <div className="grid grid-cols-4 gap-2">
                {[50, 100, 200, 500].map((monto) => (
                  <button
                    key={monto}
                    type="button"
                    onClick={() => setPrestamoMonto(String(monto))}
                    className={`rounded-xl border py-2 text-center text-xs font-black transition-all cursor-pointer ${
                      prestamoMonto === String(monto)
                        ? "border-indigo-500 bg-indigo-50 text-indigo-700 ring-2 ring-indigo-300"
                        : "border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100"
                    }`}
                  >
                    ${monto}
                  </button>
                ))}
              </div>
            </div>

            {/* Formulario */}
            <form onSubmit={handleGuardarPrestamo} className="mt-3.5 flex flex-col gap-3">
              <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                <label className="flex flex-col gap-1 text-xs font-bold text-slate-700">
                  Monto ($ MXN) *
                  <input
                    type="number"
                    step="any"
                    min="1"
                    required
                    placeholder="0.00"
                    className="rounded-xl border border-slate-300 px-3 py-2 text-sm font-black text-slate-900 focus:border-indigo-500 focus:outline-none"
                    value={prestamoMonto}
                    onChange={(e) => setPrestamoMonto(e.target.value)}
                  />
                </label>

                <label className="flex flex-col gap-1 text-xs font-bold text-slate-700">
                  ¿Quién prestó? *
                  <input
                    type="text"
                    required
                    placeholder="Nombre del trabajador"
                    className="rounded-xl border border-slate-300 px-3 py-2 text-xs font-bold text-slate-900 focus:border-indigo-500 focus:outline-none"
                    value={prestamoTrabajador}
                    onChange={(e) => setPrestamoTrabajador(e.target.value)}
                  />
                </label>
              </div>

              <label className="flex flex-col gap-1 text-xs font-bold text-slate-700">
                Nota u observaciones (opcional)
                <input
                  type="text"
                  placeholder="Ej. Monedas de $10 y $5, billetes de $20..."
                  className="rounded-xl border border-slate-300 px-3 py-2 text-xs text-slate-800 focus:border-indigo-500 focus:outline-none"
                  value={prestamoNota}
                  onChange={(e) => setPrestamoNota(e.target.value)}
                />
              </label>

              {prestamoError && (
                <div className="rounded-xl border border-rose-200 bg-rose-50 p-2.5 text-xs font-bold text-rose-700">
                  {prestamoError}
                </div>
              )}

              <div className="mt-2 flex items-center justify-end gap-2 border-t border-slate-100 pt-3">
                <button
                  type="button"
                  onClick={() => setShowPrestamoModal(false)}
                  className="rounded-xl px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSavingPrestamo}
                  className={`inline-flex items-center gap-1.5 rounded-xl px-5 py-2 text-xs font-black text-white shadow-xs active:scale-95 disabled:opacity-50 cursor-pointer ${
                    prestamoTipo === "ENTRADA" ? "bg-emerald-600 hover:bg-emerald-700" : "bg-amber-600 hover:bg-amber-700"
                  }`}
                >
                  <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                  <span>
                    {isSavingPrestamo
                      ? "Registrando..."
                      : prestamoTipo === "ENTRADA"
                      ? "Ingresar a Caja"
                      : "Registrar Devolución"}
                  </span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL PARA VINCULAR REFACCIÓN FÍSICA A UN SERVICIO */}
      {vincularModal.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="flex max-h-[85vh] w-full max-w-2xl flex-col rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl">
            {/* Header */}
            <div className="flex items-start justify-between border-b border-slate-100 pb-4">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-indigo-100 text-indigo-700 shadow-xs">
                  <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
                    <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
                    <line x1="12" y1="22.08" x2="12" y2="12" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-slate-800">
                    Vincular Refacción / Salida de Inventario
                  </h3>
                  <p className="text-xs text-slate-500">
                    Servicio: <span className="font-bold text-purple-700">{vincularModal.serviceName}</span>
                    {vincularModal.serviceNote && (
                      <span> ({vincularModal.serviceNote})</span>
                    )}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() =>
                  setVincularModal({
                    isOpen: false,
                    serviceKey: null,
                    serviceName: "",
                    serviceNote: "",
                    searchQuery: "",
                    detectedBrand: "",
                    detectedComponent: "",
                  })
                }
                className="rounded-xl border border-slate-200 p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600 cursor-pointer"
              >
                <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>

            {/* Banner de Detección Contextual por Regex */}
            {(vincularModal.detectedBrand || vincularModal.detectedComponent) && (
              <div className="mt-3 flex items-center gap-2 rounded-xl border border-indigo-200 bg-indigo-50/80 px-3 py-2 text-xs font-semibold text-indigo-900">
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-indigo-600 text-[10px] font-black text-white">
                  ✓
                </span>
                <span>
                  Contexto detectado automáticamente:{" "}
                  {vincularModal.detectedBrand && (
                    <strong className="rounded bg-indigo-200 px-1.5 py-0.5 text-indigo-950 font-black">
                      {vincularModal.detectedBrand}
                    </strong>
                  )}
                  {vincularModal.detectedComponent && (
                    <span className="ml-1">
                      (Tipo: <strong className="font-black text-indigo-950">{vincularModal.detectedComponent}</strong>)
                    </span>
                  )}
                </span>
              </div>
            )}

            {/* Buscador dentro del Modal */}
            <div className="relative mt-3">
              <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-400">
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
              <input
                type="text"
                autoFocus
                className="w-full rounded-2xl border border-slate-300 bg-slate-50 py-2.5 pr-10 !pl-10 text-sm font-semibold text-slate-800 placeholder-slate-400 shadow-xs focus:border-indigo-500 focus:bg-white focus:ring-4 focus:ring-indigo-100 focus:outline-none"
                placeholder="Buscar refacción por nombre, marca (ej. Honda) o código..."
                value={vincularModal.searchQuery}
                onChange={(e) => setVincularModal((prev) => ({ ...prev, searchQuery: e.target.value }))}
              />
              {vincularModal.searchQuery && (
                <button
                  type="button"
                  onClick={() => setVincularModal((prev) => ({ ...prev, searchQuery: "" }))}
                  className="absolute inset-y-0 right-0 flex items-center pr-3 text-slate-400 hover:text-slate-600 cursor-pointer"
                >
                  <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <line x1="18" y1="6" x2="6" y2="18" />
                    <line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                </button>
              )}
            </div>

            {/* Lista de Refacciones encontradas */}
            <div className="mt-3 flex-1 overflow-y-auto pr-1">
              {articulosParaVincular.length === 0 ? (
                <div className="flex h-44 flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 text-center text-slate-400">
                  <svg className="h-8 w-8 text-slate-300" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <circle cx="11" cy="11" r="8" />
                    <path d="m21 21-4.3-4.3" />
                  </svg>
                  <p className="mt-1.5 text-xs font-semibold">
                    No se encontraron refacciones con "{vincularModal.searchQuery}".
                  </p>
                  <p className="text-[11px] text-slate-400">
                    Prueba borrando el texto de búsqueda para ver todas las piezas disponibles.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  {articulosParaVincular.map((item) => {
                    const isLowStock = item.StockActual > 0 && item.StockActual <= 2;
                    const isZeroStock = item.StockActual <= 0;

                    return (
                      <div
                        key={item.IdItem}
                        className="flex flex-col justify-between rounded-2xl border border-slate-200/90 bg-white p-3 shadow-xs transition-all hover:border-indigo-400 hover:shadow-md"
                      >
                        <div>
                          <div className="flex items-start justify-between gap-1.5">
                            <strong className="text-xs font-bold text-slate-800 leading-snug">
                              {item.Nombre}
                            </strong>
                            <span className="text-[11px] font-semibold text-slate-400">
                              {formatMoney(item.PrecioVenta)}
                            </span>
                          </div>

                          <div className="mt-1.5 flex flex-wrap items-center gap-1.5 text-[10px]">
                            {/* Stock Pill */}
                            <span
                              className={`rounded-md px-1.5 py-0.5 font-bold ${
                                isZeroStock
                                  ? "bg-rose-100 text-rose-700"
                                  : isLowStock
                                  ? "bg-amber-100 text-amber-800"
                                  : "bg-emerald-100 text-emerald-800"
                              }`}
                            >
                              {isZeroStock ? `Stock: ${item.StockActual} (Agotado)` : `Stock: ${item.StockActual}`}
                            </span>

                            {/* Marca */}
                            {item.CompatibilidadMarca && (
                              <span className="rounded-md bg-slate-100 px-1.5 py-0.5 text-slate-600 font-medium">
                                {item.CompatibilidadMarca}
                              </span>
                            )}

                            {/* Coordenada Física */}
                            {item.CodigoUbicacion && (
                              <span className="rounded-md bg-slate-100 px-1.5 py-0.5 font-mono text-slate-500">
                                {item.CodigoUbicacion}
                              </span>
                            )}
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => handleSelectRefaccionToLink(item)}
                          className="mt-2.5 flex w-full items-center justify-center gap-1.5 rounded-xl bg-indigo-600 py-1.5 text-xs font-bold text-white shadow-xs hover:bg-indigo-700 active:scale-95 cursor-pointer"
                        >
                          <span>Vincular (Descontar 1 pza)</span>
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-3 text-xs text-slate-500">
              <span>
                💡 La pieza se agregará al ticket con <strong>$0.00</strong> para no alterar el precio acordado, y su stock se descontará al cobrar.
              </span>
              <button
                type="button"
                onClick={() =>
                  setVincularModal({
                    isOpen: false,
                    serviceKey: null,
                    serviceName: "",
                    serviceNote: "",
                    searchQuery: "",
                    detectedBrand: "",
                    detectedComponent: "",
                  })
                }
                className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-2 font-bold text-slate-700 hover:bg-slate-100 cursor-pointer"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Vista Previa de Imagen en Grande (Lightbox) */}
      {previewImage && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-md"
          onClick={() => setPreviewImage(null)}
        >
          <div
            className="relative flex max-h-[92vh] w-full max-w-2xl flex-col overflow-hidden rounded-3xl border border-slate-700/60 bg-slate-900 text-white shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header del Lightbox */}
            <div className="flex items-center justify-between border-b border-slate-800 px-5 py-3.5">
              <div className="min-w-0 pr-4">
                <h3 className="text-base font-bold text-slate-100 truncate" title={previewImage.name}>
                  {previewImage.name}
                </h3>
                <div className="flex flex-wrap items-center gap-2 text-xs text-slate-400 mt-0.5">
                  {previewImage.brand && (
                    <span className="font-semibold text-blue-400">{previewImage.brand}</span>
                  )}
                  {previewImage.category && <span>· {previewImage.category}</span>}
                  {previewImage.code && (
                    <span className="inline-flex items-center gap-1 rounded-md bg-indigo-500/20 px-2 py-0.5 text-xs font-bold text-indigo-300 border border-indigo-500/30">
                      📍 {previewImage.code}
                    </span>
                  )}
                </div>
              </div>
              <button
                type="button"
                onClick={() => setPreviewImage(null)}
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-slate-800 text-slate-400 transition-colors hover:bg-slate-700 hover:text-white cursor-pointer"
                title="Cerrar (Esc)"
              >
                <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="6" />
                </svg>
              </button>
            </div>

            {/* Contenedor de la Imagen en Alta Resolución */}
            <div className="relative flex flex-1 items-center justify-center overflow-auto bg-slate-950/60 p-4 sm:p-6">
              <img
                src={previewImage.src}
                alt={previewImage.name}
                className="max-h-[60vh] max-w-full rounded-xl object-contain drop-shadow-lg"
              />
            </div>

            {/* Footer con Información Clave y Acción Directa */}
            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-800 bg-slate-900/90 px-5 py-3.5">
              <div className="flex items-center gap-4">
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400">Precio</span>
                  <div className="text-xl font-black text-emerald-400">
                    {formatMoney(previewImage.price)}
                  </div>
                </div>
                {previewImage.stock !== undefined && (
                  <div className="border-l border-slate-800 pl-4">
                    <span className="text-[10px] uppercase font-bold text-slate-400">Stock Actual</span>
                    <div className="text-sm font-bold text-slate-200">
                      {previewImage.stock} {previewImage.stock === 1 ? "pieza" : "piezas"}
                    </div>
                  </div>
                )}
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setPreviewImage(null)}
                  className="rounded-xl border border-slate-700 bg-slate-800 px-4 py-2 text-xs font-bold text-slate-300 transition hover:bg-slate-700 cursor-pointer"
                >
                  Cerrar
                </button>
                {previewImage.item && (
                  <button
                    type="button"
                    onClick={() => {
                      addItem(previewImage.item, 1);
                      setPreviewImage(null);
                    }}
                    className="flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-xs font-bold text-white shadow-lg shadow-blue-600/30 transition hover:bg-blue-500 active:scale-95 cursor-pointer"
                  >
                    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M12 5v14M5 12h14" />
                    </svg>
                    <span>Agregar al Ticket</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Función auxiliar para renderizar una tarjeta de producto individual con soporte táctil confiable
function renderItemCard(item, addItem, onPreviewImage) {
  const src = resolveImagenUrl(item?.ImagenUrl, IMAGE_VARIANTS.THUMB);
  const isService = isServiceFlag(item?.EsServicio);
  const lowStock =
    !isService &&
    Boolean(item?.AlertaStock) &&
    Number(item?.StockActual || 0) <= Number(item?.StockMinimo || 0);

  return (
    <div
      key={item.IdItem}
      role="button"
      tabIndex={0}
      onClick={() => addItem(item, 1)}
      className="group relative flex min-h-[220px] flex-col justify-between rounded-2xl border border-slate-200/90 bg-white p-2 text-left shadow-xs transition-all hover:-translate-y-0.5 hover:border-blue-400 hover:shadow-md active:scale-95 cursor-pointer select-none"
    >
      {/* Imagen / Miniatura - Alta y con object-contain para ver toda la llave/carcasa */}
      <div
        className={`relative flex h-32 sm:h-36 w-full items-center justify-center overflow-hidden rounded-xl border border-slate-100 bg-slate-50/80 p-1.5 ${
          src ? "cursor-zoom-in group/img" : ""
        }`}
        onClick={(e) => {
          if (src && onPreviewImage) {
            e.stopPropagation();
            onPreviewImage({
              src: resolveImagenUrl(item?.ImagenUrl, IMAGE_VARIANTS.LARGE) || src,
              name: item.Nombre,
              price: item.PrecioVenta,
              stock: item.StockActual,
              brand: item.CompatibilidadMarca,
              code: item.CodigoUbicacion,
              category: item.NombreCategoria,
              item,
            });
          }
        }}
        title={src ? "Clic para ver en grande" : undefined}
      >
        {/* Badge de Coordenada Física [DD8] si existe */}
        {item.CodigoUbicacion ? (
          <div className="absolute top-1.5 right-1.5 z-10 inline-flex items-center gap-1 rounded-md border border-indigo-200 bg-indigo-50/95 px-1.5 py-0.5 text-[10px] font-extrabold text-indigo-700 shadow-2xs backdrop-blur-xs">
            <svg className="h-2.5 w-2.5 shrink-0 text-indigo-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 2a8 8 0 0 0-8 8c0 5.25 8 12 8 12s8-6.75 8-12a8 8 0 0 0-8-8z" />
              <circle cx="12" cy="10" r="3" />
            </svg>
            <span>{item.CodigoUbicacion}</span>
          </div>
        ) : null}

        {src ? (
          <>
            <img
              src={src}
              alt={item.Nombre || ""}
              loading="lazy"
              className="h-full w-full object-contain transition-transform group-hover:scale-105"
            />
            {/* Botón flotante discreto de zoom para máxima descubribilidad */}
            <button
              type="button"
              className="absolute bottom-1.5 right-1.5 z-10 flex h-6 w-6 items-center justify-center rounded-lg bg-slate-900/60 text-white opacity-0 backdrop-blur-xs transition-opacity hover:bg-slate-900/80 group-hover:opacity-100 group-hover/img:opacity-100 cursor-zoom-in"
              onClick={(e) => {
                e.stopPropagation();
                if (onPreviewImage) {
                  onPreviewImage({
                    src: resolveImagenUrl(item?.ImagenUrl, IMAGE_VARIANTS.LARGE) || src,
                    name: item.Nombre,
                    price: item.PrecioVenta,
                    stock: item.StockActual,
                    brand: item.CompatibilidadMarca,
                    code: item.CodigoUbicacion,
                    category: item.NombreCategoria,
                    item,
                  });
                }
              }}
              title="Ver imagen en grande"
            >
              <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="8" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
                <line x1="11" y1="8" x2="11" y2="14" />
                <line x1="8" y1="11" x2="14" y2="11" />
              </svg>
            </button>
          </>
        ) : (
          <span className="text-xl font-extrabold text-slate-300">
            {iconTextFromName(item.Nombre)}
          </span>
        )}
      </div>

      {/* Detalles del Producto */}
      <div className="mt-1.5 flex flex-1 flex-col gap-0.5">
        <strong className="line-clamp-2 text-xs font-bold text-slate-800 leading-snug group-hover:text-blue-600" title={item.Nombre}>
          {item.Nombre}
        </strong>
        <span className="text-[10px] text-slate-400 truncate">
          {item.CompatibilidadMarca ? `${item.CompatibilidadMarca} · ` : ""}
          {item.NombreCategoria}
        </span>
      </div>

      {/* Precio y Stock */}
      <div className="mt-2 flex items-center justify-between border-t border-slate-100 pt-1.5">
        <strong className="text-xs sm:text-sm font-extrabold text-slate-900">
          {formatMoney(item.PrecioVenta)}
        </strong>

        {isService ? (
          <span className="rounded-md bg-purple-50 px-1.5 py-0.5 text-[9px] font-bold text-purple-700">
            Servicio
          </span>
        ) : lowStock ? (
          <span className="rounded-md bg-rose-50 px-1.5 py-0.5 text-[9px] font-bold text-rose-600">
            Agotándose ({item.StockActual})
          </span>
        ) : item.AlertaStock ? (
          <span className="rounded-md bg-slate-100 px-1.5 py-0.5 text-[9px] font-semibold text-slate-600">
            Stock: {item.StockActual}
          </span>
        ) : null}
      </div>
    </div>
  );
}
