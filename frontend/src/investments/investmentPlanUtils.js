export const createEmptyRow = () => ({
  _id: undefined,
  item: '',
  type: '',
  quantity: '',
  unitPrice: '',
  priority: '',
  justification: '',
});

export const toInputValue = (value) =>
  value === undefined || value === null ? '' : String(value);

export const toNumber = (value) => {
  if (value === undefined || value === null || value === '') return undefined;
  const normalized = String(value).replace(',', '.');
  const parsed = Number(normalized);
  return Number.isNaN(parsed) ? undefined : parsed;
};

export const isRowEmpty = (row) =>
  ![
    row.item,
    row.type,
    row.quantity,
    row.unitPrice,
    row.priority,
    row.justification,
  ].some((value) => String(value).trim().length > 0);

export const calculateRowTotal = (row) => {
  const quantity = toNumber(row.quantity) ?? 0;
  const unitPrice = toNumber(row.unitPrice) ?? 0;
  return quantity * unitPrice;
};

export const mapPlanToRows = (plan) => {
  if (!plan?.lines?.length) {
    return [createEmptyRow()];
  }
  return plan.lines.map((line) => ({
    _id: line._id,
    item: line.item ?? '',
    type: line.type ?? '',
    quantity: toInputValue(line.quantity),
    unitPrice: toInputValue(line.unitCost ?? line.unitPrice),
    priority: toInputValue(line.priority ?? ''),
    justification: line.justification ?? '',
  }));
};

export const buildLines = (rows, targetYear, structureId) =>
  rows
    .filter((row) => !isRowEmpty(row))
    .map((row) => ({
      _id: row._id,
      item: row.item?.trim() || undefined,
      type: row.type?.trim(),
      quantity: toNumber(row.quantity),
      unitCost: toNumber(row.unitPrice),
      priority: toNumber(row.priority) ?? 1,
      justification: row.justification?.trim() || undefined,
      targetYear,
      structure: structureId,
    }));
