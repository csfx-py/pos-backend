const maxTotal = 4000;

module.exports = async (fullData) => {
  const result = [];
  let newinvoice = [];
  let cumulative = 0;

  for (let i = 0; i < fullData.length; i++) {
    const item = fullData[i];

    if (item.price >= maxTotal) {
      for (let j = 1; j <= item.qty; j++) {
        result.push([{ ...item, qty: 1 }]);
      }
      continue;
    }

    let brokenItem = { ...item, qty: 0 };
    while (item.qty) {
      if (cumulative + item.price > maxTotal) {
        newinvoice.push(brokenItem);
        result.push(newinvoice);
        newinvoice = [];
        cumulative = 0;
        brokenItem = { ...item, qty: 0 };
      }
      brokenItem.qty += 1;
      item.qty -= 1;
      brokenItem.total = brokenItem.price * brokenItem.qty;
      cumulative += item.price;

    }
    if (brokenItem.qty > 0) {
      newinvoice.push(brokenItem);
    }
  }
  if (newinvoice.length) {
    result.push(newinvoice);
  }

  return result;
};
