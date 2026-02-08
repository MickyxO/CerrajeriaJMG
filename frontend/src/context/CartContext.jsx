import { createContext, useCallback, useMemo, useReducer } from "react";

export const CartContext = createContext(null);

function round2(n) {
	return Math.round((Number(n) + Number.EPSILON) * 100) / 100;
}

function normalizePrice(value) {
	const num = Number(value);
	return Number.isFinite(num) ? round2(num) : 0;
}

const initialState = {
	lines: [],
};

function cartReducer(state, action) {
	switch (action.type) {
		case "ADD": {
				const { key, tipo, id, nombre, precio, cantidad = 1, imagenUrl = null } = action.payload;
			const nextQty = Math.max(1, Number(cantidad) || 1);
			const nextPrice = normalizePrice(precio);

			const idx = state.lines.findIndex((l) => l.key === key);
			if (idx >= 0) {
				const lines = state.lines.slice();
				const existing = lines[idx];
				lines[idx] = {
					...existing,
					cantidad: existing.cantidad + nextQty,
				};
				return { ...state, lines };
			}

			return {
				...state,
				lines: [
					...state.lines,
					{
						key,
						tipo,
						id,
						nombre: nombre || "(sin nombre)",
							imagenUrl,
						precio: nextPrice,
						cantidad: nextQty,
					},
				],
			};
		}

		case "SET_QTY": {
			const { key, cantidad } = action.payload;
			const nextQty = Math.max(1, Math.floor(Number(cantidad) || 1));
			return {
				...state,
				lines: state.lines.map((l) => (l.key === key ? { ...l, cantidad: nextQty } : l)),
			};
		}

		case "DEC": {
			const { key } = action.payload;
			return {
				...state,
				lines: state.lines
					.map((l) => (l.key === key ? { ...l, cantidad: l.cantidad - 1 } : l))
					.filter((l) => l.cantidad > 0),
			};
		}

		case "INC": {
			const { key } = action.payload;
			return {
				...state,
				lines: state.lines.map((l) => (l.key === key ? { ...l, cantidad: l.cantidad + 1 } : l)),
			};
		}

		case "REMOVE": {
			const { key } = action.payload;
			return { ...state, lines: state.lines.filter((l) => l.key !== key) };
		}

		case "CLEAR": {
			return initialState;
		}

		default:
			return state;
	}
}

export function CartProvider({ children }) {
	const [state, dispatch] = useReducer(cartReducer, initialState);

	const addItem = useCallback((item, cantidad = 1) => {
		dispatch({
			type: "ADD",
			payload: {
				key: `ITEM:${item.IdItem}`,
				tipo: "ITEM",
				id: item.IdItem,
				nombre: item.Nombre,
				imagenUrl: item.ImagenUrl || null,
				precio: item.PrecioVenta,
				cantidad,
			},
		});
	}, []);

	const addCombo = useCallback((combo, cantidad = 1) => {
		dispatch({
			type: "ADD",
			payload: {
				key: `COMBO:${combo.IdCombo}`,
				tipo: "COMBO",
				id: combo.IdCombo,
				nombre: combo.NombreCombo,
				precio: combo.PrecioSugerido,
				cantidad,
			},
		});
	}, []);

	const setQty = useCallback((key, cantidad) => {
		dispatch({ type: "SET_QTY", payload: { key, cantidad } });
	}, []);

	const inc = useCallback((key) => dispatch({ type: "INC", payload: { key } }), []);
	const dec = useCallback((key) => dispatch({ type: "DEC", payload: { key } }), []);
	const remove = useCallback((key) => dispatch({ type: "REMOVE", payload: { key } }), []);
	const clear = useCallback(() => dispatch({ type: "CLEAR" }), []);

	const totals = useMemo(() => {
		const total = round2(state.lines.reduce((sum, l) => sum + l.cantidad * l.precio, 0));
		const count = state.lines.reduce((sum, l) => sum + l.cantidad, 0);
		return { total, count };
	}, [state.lines]);

	const value = useMemo(
		() => ({
			lines: state.lines,
			totals,
			addItem,
			addCombo,
			setQty,
			inc,
			dec,
			remove,
			clear,
		}),
		[state.lines, totals, addItem, addCombo, setQty, inc, dec, remove, clear]
	);

	return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

