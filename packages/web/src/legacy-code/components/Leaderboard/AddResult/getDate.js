import exif from 'exif-js';

export const getDateFromFile = (file) => {
  return new Promise((res) => {
    exif.getData(file, function () {
      const tags = exif.getAllTags(this);
      // Original is preferred, the rest are just fallbacks
      const date = tags.DateTimeOriginal || tags.DateTimeDigitized || tags.DateTime;
      const parts = typeof date === 'string' ? date.split(/[: ]/) : null;
      const dateObj =
        parts &&
        new Date(`${parts[0]}-${parts[1]}-${parts[2]} ${parts[3]}:${parts[4]}:${parts[5]}`);

      res(dateObj);
    });
  });
};
