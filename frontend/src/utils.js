export const toLoanItemsPayload = (items = []) =>
  items
    .filter((item) => item?.equipment?._id)
    .map((item) => ({
      equipment: item.equipment._id,
      quantity: item.quantity,
    }));

