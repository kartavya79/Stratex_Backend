const parseCsvLine = (line) => {
  const values = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i += 1) {
    const char = line[i];

    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }

      continue;
    }

    if (char === ',' && !inQuotes) {
      values.push(current.trim());
      current = "";
      continue;
    }

    current += char;
  }

  values.push(current.trim());
  return values;
};

const normalizeHeader = (header) =>
  String(header || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ")
    .replace(/\s/g, "");

const parseCsvBuffer = (buffer) => {
  const rawText = buffer?.toString("utf8") || "";
  const content = rawText.replace(/\r\n/g, "\n").replace(/\r/g, "\n").trim();

  if (!content) {
    return { headers: [], rows: [], errors: ["CSV file is empty"] };
  }

  const lines = content.split("\n").filter((line) => String(line).trim().length > 0);
  if (lines.length === 0) {
    return { headers: [], rows: [], errors: ["CSV file contains no data"] };
  }

  const headerRow = parseCsvLine(lines[0]);
  const headers = headerRow.map(normalizeHeader);

  if (headers.length === 0) {
    return { headers: [], rows: [], errors: ["CSV header row could not be parsed"] };
  }

  const rows = [];
  const errors = [];

  for (let index = 1; index < lines.length; index += 1) {
    const line = lines[index];
    const values = parseCsvLine(line);

    if (values.length !== headers.length) {
      errors.push(
        `Row ${index + 1}: expected ${headers.length} values but found ${values.length}`,
      );
      continue;
    }

    const row = headers.reduce((acc, header, columnIndex) => {
      acc[header] = values[columnIndex].trim();
      return acc;
    }, {});

    rows.push(row);
  }

  return { headers, rows, errors };
};

module.exports = {
  parseCsvBuffer,
  normalizeHeader,
};
