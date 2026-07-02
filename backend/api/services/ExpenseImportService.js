const Papa = require('papaparse');
const ExcelJS = require('exceljs');
const dayjs = require('dayjs');
const customParseFormat = require('dayjs/plugin/customParseFormat');

dayjs.extend(customParseFormat);

const DATE_FORMATS = ['DD/MM/YYYY', 'YYYY-MM-DD', 'DD-MM-YYYY'];

// Cabeçalhos aceitos (após normalização): mantenha em sincronia com o modelo
// gerado em frontend/src/pages/ControlePage/ImportExpensesModal.tsx.
const HEADER_ALIASES = {
  date: ['data'],
  category: ['categoria'],
  source: ['fonte'],
  supplier: ['fornecedor'],
  paymentMethod: ['formadepagamento', 'forma', 'pagamento'],
  amount: ['valor', 'valorrs'],
  notes: ['observacoes', 'observacao', 'obs'],
};

function normalizeHeader(header) {
  return String(header || '')
    .normalize('NFD')
    .replace(new RegExp('[\\u0300-\\u036f]', 'g'), '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');
}

function findFieldForHeader(header) {
  const normalized = normalizeHeader(header);
  return Object.keys(HEADER_ALIASES).find((field) => HEADER_ALIASES[field].includes(normalized)) || null;
}

function mapRow(rawRow) {
  const mapped = {};
  Object.keys(rawRow).forEach((header) => {
    const field = findFieldForHeader(header);
    if (field) {
      mapped[field] = rawRow[header];
    }
  });
  return mapped;
}

function isBlankRow(mapped) {
  return Object.values(mapped).every(
    (value) => value === undefined || value === null || String(value).trim() === '',
  );
}

function decodeCsvBuffer(buffer) {
  const utf8 = buffer.toString('utf8');
  if (utf8.includes('�')) {
    // Excel em locale pt-BR costuma exportar CSV em Latin-1/Windows-1252.
    return buffer.toString('latin1');
  }
  return utf8;
}

function parseCsv(buffer) {
  const text = decodeCsvBuffer(buffer);
  const result = Papa.parse(text, { header: true, delimiter: '', skipEmptyLines: true });
  return result.data;
}

async function parseExcel(buffer) {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(buffer);
  const worksheet = workbook.worksheets[0];

  if (!worksheet) {
    return [];
  }

  const headers = [];
  worksheet.getRow(1).eachCell({ includeEmpty: true }, (cell, colNumber) => {
    headers[colNumber] = cell.value !== null && cell.value !== undefined ? String(cell.value).trim() : '';
  });

  const rows = [];
  worksheet.eachRow((row, rowNumber) => {
    if (rowNumber === 1) {
      return;
    }

    const rowObject = {};
    let hasValue = false;

    row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
      const header = headers[colNumber];
      if (!header) {
        return;
      }

      let value = cell.value;
      if (value && typeof value === 'object' && !(value instanceof Date)) {
        if (Array.isArray(value.richText)) {
          value = value.richText.map((part) => part.text).join('');
        } else if (value.result !== undefined) {
          value = value.result;
        } else if (value.text !== undefined) {
          value = value.text;
        }
      }

      if (value !== null && value !== undefined && value !== '') {
        hasValue = true;
      }
      rowObject[header] = value;
    });

    if (hasValue) {
      rows.push(rowObject);
    }
  });

  return rows;
}

function parseDate(value) {
  if (value === undefined || value === null || value === '') {
    return null;
  }

  if (value instanceof Date) {
    if (Number.isNaN(value.getTime())) {
      return null;
    }
    // Ancora ao meio-dia UTC usando os componentes UTC da data para evitar
    // que o fuso horário local desloque o dia ao serializar com toISOString().
    const anchored = new Date(
      Date.UTC(value.getUTCFullYear(), value.getUTCMonth(), value.getUTCDate(), 12, 0, 0),
    );
    return anchored.toISOString();
  }

  const asString = String(value).trim();
  for (const format of DATE_FORMATS) {
    const parsed = dayjs(asString, format, true);
    if (parsed.isValid()) {
      return parsed.toISOString();
    }
  }

  return null;
}

function parseAmount(value) {
  if (value === undefined || value === null || value === '') {
    return null;
  }

  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : null;
  }

  let text = String(value)
    .trim()
    .replace(/r\$/i, '')
    .replace(new RegExp('[\\s\\u00a0]', 'g'), '');

  if (text === '') {
    return null;
  }

  if (text.includes(',')) {
    text = text.replace(/\./g, '').replace(',', '.');
  }

  const parsed = Number(text);
  return Number.isFinite(parsed) ? parsed : null;
}

function validateRow(mapped, rowNumber) {
  const errors = [];

  const date = parseDate(mapped.date);
  if (mapped.date === undefined || mapped.date === null || String(mapped.date).trim() === '') {
    errors.push('Data é obrigatória.');
  } else if (!date) {
    errors.push('Data inválida.');
  }

  const categoryName = mapped.category ? String(mapped.category).trim() : '';
  if (!categoryName) {
    errors.push('Categoria é obrigatória.');
  }

  const sourceName = mapped.source ? String(mapped.source).trim() : '';
  if (!sourceName) {
    errors.push('Fonte é obrigatória.');
  }

  const paymentMethod = mapped.paymentMethod ? String(mapped.paymentMethod).trim() : '';
  if (!paymentMethod) {
    errors.push('Forma de pagamento é obrigatória.');
  } else if (!sails.services.expenseservice.isValidPaymentMethod(paymentMethod)) {
    errors.push(
      `Forma de pagamento inválida. Use uma das opções: ${sails.services.expenseservice.PAYMENT_METHODS.join(', ')}.`,
    );
  }

  const amount = parseAmount(mapped.amount);
  if (mapped.amount === undefined || mapped.amount === null || String(mapped.amount).trim() === '') {
    errors.push('Valor é obrigatório.');
  } else if (amount === null) {
    errors.push('Valor inválido.');
  } else if (amount <= 0) {
    errors.push('Valor deve ser maior que zero.');
  }

  const supplier = mapped.supplier ? String(mapped.supplier).trim() : null;
  const notes = mapped.notes ? String(mapped.notes).trim() : null;

  return {
    rowNumber,
    date,
    categoryName,
    sourceName,
    supplier,
    paymentMethod: paymentMethod || null,
    amount,
    notes,
    valid: errors.length === 0,
    errors,
  };
}

module.exports = {
  async parseFile(buffer, filename) {
    const extension = String(filename || '')
      .toLowerCase()
      .split('.')
      .pop();

    let rawRows;
    if (extension === 'csv') {
      rawRows = parseCsv(buffer);
    } else if (extension === 'xlsx') {
      rawRows = await parseExcel(buffer);
    } else {
      const error = new Error('Formato de arquivo não suportado. Envie um arquivo .csv ou .xlsx.');
      error.isImportError = true;
      throw error;
    }

    if (rawRows.length === 0) {
      const error = new Error('O arquivo está vazio.');
      error.isImportError = true;
      throw error;
    }

    const headers = Object.keys(rawRows[0]);
    const recognizedHeaders = headers.filter((header) => findFieldForHeader(header));
    if (recognizedHeaders.length === 0) {
      const error = new Error('Não foi possível reconhecer as colunas do arquivo. Confira o modelo.');
      error.isImportError = true;
      throw error;
    }

    const rows = [];
    let rowNumber = 1; // linha 1 é o cabeçalho
    rawRows.forEach((rawRow) => {
      rowNumber += 1;
      const mapped = mapRow(rawRow);
      if (isBlankRow(mapped)) {
        return;
      }
      rows.push(validateRow(mapped, rowNumber));
    });

    const validCount = rows.filter((row) => row.valid).length;

    return {
      rows,
      summary: {
        total: rows.length,
        valid: validCount,
        invalid: rows.length - validCount,
      },
    };
  },
};
