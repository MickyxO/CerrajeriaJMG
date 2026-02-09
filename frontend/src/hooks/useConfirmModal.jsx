import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import ConfirmModal from "../components/common/ConfirmModal/ConfirmModal";

const DEFAULTS = {
	title: "Confirmar",
	message: "",
	confirmText: "Aceptar",
	cancelText: "Cancelar",
	tone: "primary",
};

export function useConfirmModal() {
	const resolverRef = useRef(null);
	const [state, setState] = useState({ open: false, ...DEFAULTS });

	const close = useCallback((result) => {
		setState((s) => ({ ...s, open: false }));
		const resolve = resolverRef.current;
		resolverRef.current = null;
		resolve?.(result);
	}, []);

	const confirm = useCallback((options = {}) => {
		return new Promise((resolve) => {
			resolverRef.current = resolve;
			setState({ open: true, ...DEFAULTS, ...options });
		});
	}, []);

	useEffect(() => {
		return () => {
			// Si el componente se desmonta con un confirm abierto, resolvemos en false
			const resolve = resolverRef.current;
			resolverRef.current = null;
			resolve?.(false);
		};
	}, []);

	const modal = useMemo(() => {
		return (
			<ConfirmModal
				open={state.open}
				title={state.title}
				message={state.message}
				confirmText={state.confirmText}
				cancelText={state.cancelText}
				tone={state.tone}
				onConfirm={() => close(true)}
				onCancel={() => close(false)}
			/>
		);
	}, [state, close]);

	return { confirm, modal };
}
