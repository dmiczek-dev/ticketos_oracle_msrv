exports.maskNumber = (numbers) => {
  const mask = '0BCDFGHJKL';
  let result = '';
  for (const number of numbers) {
    result += mask[number];
  }

  return result;
};
