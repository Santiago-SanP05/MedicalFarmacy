/** Convierte el texto de un input numérico en número, o null si está vacío o no es válido. */
export function parsePrecio(valor: string): number | null {
  if (valor.trim() === '') return null;
  const numero = Number(valor);
  return Number.isFinite(numero) ? numero : null;
}

/** true si el precio cae dentro de [min, max]; un límite en null no restringe de ese lado. */
export function dentroDeRangoPrecio(precio: number, min: number | null, max: number | null): boolean {
  if (min !== null && precio < min) return false;
  if (max !== null && precio > max) return false;
  return true;
}
