// Interpret PostgREST's nested and/or filters against synthetic rows.
function splitTopLevel(value) {
  const parts = [];
  let depth = 0, start = 0;
  for (let i = 0; i < value.length; i++) {
    if (value[i] === "(") depth++;
    if (value[i] === ")") depth--;
    if (value[i] === "," && depth === 0) { parts.push(value.slice(start, i)); start = i + 1; }
  }
  parts.push(value.slice(start));
  return parts;
}
export function matchesFilter(row, value) {
  if (value.startsWith("and(") || value.startsWith("or(")) {
    const children = splitTopLevel(value.slice(value.indexOf("(") + 1, -1));
    return value.startsWith("and(") ? children.every((child) => matchesFilter(row, child)) : children.some((child) => matchesFilter(row, child));
  }
  const [, key, operator, operand] = value.match(/^([^.]+)\.([^.]+)\.(.*)$/) || [];
  let actual = key?.split(/->>?/).reduce((value, part) => value?.[part], row);
  if (key?.includes("->>") && actual !== undefined && actual !== null) actual = String(actual);
  if (operator === "in") return operand.slice(1, -1).split(",").includes(String(actual));
  if (operator === "not" && operand.startsWith("in.(")) return !operand.slice(4, -1).split(",").includes(String(actual));
  const expected = typeof actual === "number" ? Number(operand) : operand;
  if (operator === "eq") return actual === expected;
  if (operator === "lt") return actual < expected;
  if (operator === "gte") return actual >= expected;
  throw new Error(`Unsupported filter: ${value}`);
}
export function createQuery(rows) {
  const filters = [];
  let changes;
  const query = {
    select() { return query; },
    update(value) { changes = value; return query; },
    eq(key, value) { filters.push((row) => row[key] === value); return query; },
    in(key, values) { filters.push((row) => values.includes(row[key])); return query; },
    gte(key, value) { filters.push((row) => row[key] >= value); return query; },
    gt(key, value) { filters.push((row) => row[key] > value); return query; },
    lt(key, value) { filters.push((row) => row[key] < value); return query; },
    or(value) { filters.push((row) => matchesFilter(row, `or(${value})`)); return query; },
    order() { return query; },
    filtered() { return rows.filter((row) => filters.every((filter) => filter(row))); },
    async range(start, end) { return { data: query.filtered().slice(start, end + 1), error: null }; },
    async maybeSingle() {
      const row = query.filtered()[0];
      if (row && changes) Object.assign(row, changes);
      return { data: row ? { ...row } : null, error: null };
    },
  };
  return query;
}
